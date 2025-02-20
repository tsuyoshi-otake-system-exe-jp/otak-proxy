import * as vscode from 'vscode';

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

    // Initialize status bar immediately
    statusBarItem = initializeStatusBar(context);

    const config = vscode.workspace.getConfiguration('otakProxy');
    const proxyUrl = config.get<string>('proxyUrl', '');

    const isProxyEnabled = context.globalState.get<boolean>('proxyEnabled', false);
    // Show initial status before any setup
    updateStatusBar(isProxyEnabled, proxyUrl);

    await askForInitialSetup(context);

    await updateProxyState(isProxyEnabled, context);

    // トグルコマンド
    let disposable = vscode.commands.registerCommand('otak-proxy.toggleProxy', async () => {
        const currentState = context.globalState.get<boolean>('proxyEnabled', false);
        await updateProxyState(!currentState, context);
    });

    context.subscriptions.push(disposable);

    // プロキシURL設定コマンド
    context.subscriptions.push(
        vscode.commands.registerCommand('otak-proxy.configureUrl', async () => {
            const proxyUrl = await vscode.window.showInputBox({
                prompt: 'Enter proxy URL (e.g., http://proxy.example.com:8080)',
                placeHolder: 'http://proxy.example.com:8080',
                value: vscode.workspace.getConfiguration('otakProxy').get('proxyUrl', '')
            });

            if (proxyUrl !== undefined) {
                await vscode.workspace.getConfiguration('otakProxy').update('proxyUrl', proxyUrl, vscode.ConfigurationTarget.Global);
                const isEnabled = context.globalState.get<boolean>('proxyEnabled', false);
                await updateProxyState(isEnabled, context);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async e => {
            if (e.affectsConfiguration('otakProxy.proxyUrl')) {
                const isEnabled = context.globalState.get<boolean>('proxyEnabled', false);
                await updateProxyState(isEnabled, context);
            }
        })
    );
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
        async function checkGitConfig(key: string): Promise<boolean> {
            try {
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);
                await execAsync(`git config --global --get ${key}`);
                return true;
            } catch {
                return false;
            }
        }

        if (enabled) {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            await execAsync(`git config --global http.proxy "${proxyUrl}"`, { encoding: 'utf8' });
            await execAsync(`git config --global https.proxy "${proxyUrl}"`, { encoding: 'utf8' });
        } else {
            const [hasHttpProxy, hasHttpsProxy] = await Promise.all([
                checkGitConfig('http.proxy'),
                checkGitConfig('https.proxy')
            ]);

            if (hasHttpProxy || hasHttpsProxy) {
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);
                if (hasHttpProxy) {
                    await execAsync('git config --global --unset http.proxy', { encoding: 'utf8' });
                }
                if (hasHttpsProxy) {
                    await execAsync('git config --global --unset https.proxy', { encoding: 'utf8' });
                }
            }
        }
        return true;
    } catch (error) {
        console.error('Git proxy setting error:', error);
        if (!enabled) {
            return true; // プロキシ無効化時のエラーは無視する
        }
        throw new Error('Failed to update Git proxy settings');
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

    let success = true;
    let errors: string[] = [];

    try {
        await updateVSCodeProxy(enabled, proxyUrl);
    } catch (error) {
        success = false;
        errors.push(`VSCode proxy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
        await updateGitProxy(enabled, proxyUrl);
    } catch (error) {
        success = false;
        errors.push(`Git proxy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    await context.globalState.update('proxyEnabled', enabled);
    updateStatusBar(enabled, proxyUrl);

    if (!success) {
        vscode.window.showErrorMessage(`Some proxy settings failed to update:\n${errors.join('\n')}`);
    }
}

function updateStatusBar(enabled: boolean, proxyUrl: string) {
    if (!statusBarItem) {
        console.error('Status bar item not initialized');
        return;
    }

    if (enabled) {
        statusBarItem.text = `$(plug) Proxy: ${proxyUrl}`;

        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        tooltip.supportThemeIcons = true;

        tooltip.appendMarkdown(`### Proxy Configuration\n\n`);
        tooltip.appendMarkdown(`**Status:** Enabled (URL: ${proxyUrl})\n\n`);
        tooltip.appendMarkdown(`---\n\n`);
        tooltip.appendMarkdown(`$(sync) [Toggle Proxy](command:otak-proxy.toggleProxy) &nbsp;&nbsp; $(gear) [Proxy Settings](command:otak-proxy.configureUrl)`);

        statusBarItem.tooltip = tooltip;
    } else {
        statusBarItem.text = '$(circle-slash) Proxy: Off';

        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        tooltip.supportThemeIcons = true;

        tooltip.appendMarkdown(`### Proxy Configuration\n\n`);
        tooltip.appendMarkdown(`**Status:** Disabled\n\n`);
        tooltip.appendMarkdown(`---\n\n`);
        tooltip.appendMarkdown(`$(sync) [Toggle Proxy](command:otak-proxy.toggleProxy) &nbsp;&nbsp; $(gear) [Proxy Settings](command:otak-proxy.configureUrl)`);

        statusBarItem.tooltip = tooltip;
    }
    
    statusBarItem.show();
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
