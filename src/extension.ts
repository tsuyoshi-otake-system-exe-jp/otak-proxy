import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let statusBarItem: vscode.StatusBarItem;

function initializeStatusBar(context: vscode.ExtensionContext) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'otak-proxy.toggleProxy';
    context.subscriptions.push(statusBarItem);
    return statusBarItem;
}

async function askForInitialSetup(context: vscode.ExtensionContext) {
    const hasSetup = context.globalState.get('hasInitialSetup', false);
    if (!hasSetup) {
        const answer = await vscode.window.showInformationMessage(
            'Would you like to configure proxy settings?',
            'Yes',
            'No'
        );

        if (answer === 'Yes') {
            const proxyUrl = await vscode.window.showInputBox({
                prompt: 'Enter proxy URL (e.g., http://proxy.example.com:8080)',
                placeHolder: 'http://proxy.example.com:8080'
            });

            if (proxyUrl) {
                await vscode.workspace.getConfiguration('otakProxy').update('proxyUrl', proxyUrl, vscode.ConfigurationTarget.Global);
                const enableNow = await vscode.window.showInformationMessage(
                    'Would you like to enable proxy now?',
                    'Yes',
                    'No'
                );
                if (enableNow === 'Yes') {
                    await updateProxyState(true, context);
                }
            }
        }
        await context.globalState.update('hasInitialSetup', true);
    }
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('Extension "otak-proxy" is now active.');

    statusBarItem = initializeStatusBar(context);

    await askForInitialSetup(context);

    const isProxyEnabled = context.globalState.get<boolean>('proxyEnabled', false);
    await updateProxyState(isProxyEnabled, context);

    let disposable = vscode.commands.registerCommand('otak-proxy.toggleProxy', async () => {
        const currentState = context.globalState.get<boolean>('proxyEnabled', false);
        await updateProxyState(!currentState, context);
    });

    context.subscriptions.push(disposable);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async e => {
            if (e.affectsConfiguration('otakProxy.proxyUrl')) {
                const isEnabled = context.globalState.get<boolean>('proxyEnabled', false);
                await updateProxyState(isEnabled, context);
            }
        })
    );
}

async function executeCommand(command: string, errorContext: string): Promise<string> {
    try {
        const { stdout } = await execAsync(command);
        return stdout;
    } catch (error: any) {
        console.error(`${errorContext} execution error:`, error);
        throw new Error(`Error executing ${errorContext}: ${error.message}`);
    }
}

async function checkGitHubCLI(): Promise<boolean> {
    try {
        await execAsync('gh --version');
        return true;
    } catch (error) {
        return false;
    }
}

async function updateVSCodeProxy(enabled: boolean, proxyUrl: string) {
    try {
        await vscode.workspace.getConfiguration('http').update('proxy', enabled ? proxyUrl : "", vscode.ConfigurationTarget.Global);
        return true;
    } catch (error) {
        console.error('VSCode proxy setting error:', error);
        throw new Error('Failed to update VSCode proxy settings');
    }
}

async function updateGitProxy(enabled: boolean, proxyUrl: string) {
    try {
        if (enabled) {
            await executeCommand(`git config --global http.proxy "${proxyUrl}"`, 'Git proxy configuration');
            await executeCommand(`git config --global https.proxy "${proxyUrl}"`, 'Git proxy configuration');
        } else {
            await executeCommand('git config --global --unset http.proxy', 'Git proxy removal');
            await executeCommand('git config --global --unset https.proxy', 'Git proxy removal');
        }
        return true;
    } catch (error) {
        console.error('Git proxy setting error:', error);
        throw new Error('Failed to update Git proxy settings');
    }
}

async function updateGitHubCLIProxy(enabled: boolean, proxyUrl: string) {
    const isGhAvailable = await checkGitHubCLI();
    if (!isGhAvailable) {
        console.log('GitHub CLI not found. Skipping GitHub CLI proxy configuration.');
        return true;
    }

    try {
        if (enabled) {
            await executeCommand(`gh config set -h github.com http_proxy "${proxyUrl}"`, 'GitHub CLI proxy configuration');
            await executeCommand(`gh config set -h github.com https_proxy "${proxyUrl}"`, 'GitHub CLI proxy configuration');
        } else {
            const { stdout: httpProxy } = await execAsync('gh config get -h github.com http_proxy');
            const { stdout: httpsProxy } = await execAsync('gh config get -h github.com https_proxy');

            if (httpProxy.trim()) {
                await executeCommand('gh config delete -h github.com http_proxy', 'GitHub CLI proxy removal');
            }
            if (httpsProxy.trim()) {
                await executeCommand('gh config delete -h github.com https_proxy', 'GitHub CLI proxy removal');
            }
        }
        return true;
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('no such key')) {
                return true;
            }
        }
        console.error('GitHub CLI proxy setting error:', error);
        throw new Error('Failed to update GitHub CLI proxy settings');
    }
}

async function updateProxyState(enabled: boolean, context: vscode.ExtensionContext) {
    if (!statusBarItem) {
        statusBarItem = initializeStatusBar(context);
    }

    const config = vscode.workspace.getConfiguration('otakProxy');
    const proxyUrl = config.get<string>('proxyUrl', '');

    if (!proxyUrl && enabled) {
        const answer = await vscode.window.showErrorMessage(
            'Proxy URL is not set. Would you like to configure it now?',
            'Yes',
            'No'
        );

        if (answer === 'Yes') {
            const newProxyUrl = await vscode.window.showInputBox({
                prompt: 'Enter proxy URL (e.g., http://proxy.example.com:8080)',
                placeHolder: 'http://proxy.example.com:8080'
            });

            if (newProxyUrl) {
                await config.update('proxyUrl', newProxyUrl, vscode.ConfigurationTarget.Global);
                return updateProxyState(enabled, context);
            }
        }
        return;
    }

    try {
        await updateVSCodeProxy(enabled, proxyUrl);
        await updateGitProxy(enabled, proxyUrl);
        
        try {
            await updateGitHubCLIProxy(enabled, proxyUrl);
        } catch (error) {
            console.warn('GitHub CLI configuration skipped:', error);
        }

        await context.globalState.update('proxyEnabled', enabled);
        updateStatusBar(enabled, proxyUrl);
        vscode.window.showInformationMessage(`Proxy settings ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('Error updating proxy settings:', error);
        vscode.window.showErrorMessage(`Failed to update proxy settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        const currentState = context.globalState.get<boolean>('proxyEnabled', false);
        updateStatusBar(currentState, proxyUrl);
    }
}

function updateStatusBar(enabled: boolean, proxyUrl: string) {
    if (!statusBarItem) {
        console.error('Status bar item not initialized');
        return;
    }

    if (enabled) {
        statusBarItem.text = '$(plug) Proxy: On';
        statusBarItem.tooltip = `Proxy URL: ${proxyUrl}`;
    } else {
        statusBarItem.text = '$(circle-slash) Proxy: Off';
        statusBarItem.tooltip = 'Click to enable proxy';
    }
    statusBarItem.show();
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
