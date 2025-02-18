import * as vscode from 'vscode';
import * as l10n from '@vscode/l10n';

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
            l10n.t('prompt.initialSetup'),
            l10n.t('button.yes'),
            l10n.t('button.no')
        );

        if (answer === l10n.t('button.yes')) {
            const proxyUrl = await vscode.window.showInputBox({
                prompt: l10n.t('prompt.enterProxyUrl'),
                placeHolder: 'http://proxy.example.com:8080'
            });

            if (proxyUrl) {
                await vscode.workspace.getConfiguration('otakProxy').update('proxyUrl', proxyUrl, vscode.ConfigurationTarget.Global);
                const enableNow = await vscode.window.showInformationMessage(
                    l10n.t('prompt.enableProxyNow'),
                    l10n.t('button.yes'),
                    l10n.t('button.no')
                );
                if (enableNow === l10n.t('button.yes')) {
                    await updateProxyState(true, context);
                }
            }
        }
        await context.globalState.update('hasInitialSetup', true);
    }
}

export async function activate(context: vscode.ExtensionContext) {
    // l10n設定
    await l10n.config({ uri: vscode.Uri.joinPath(context.extensionUri, 'l10n', 'bundle.l10n.json').toString() });
    console.log('l10n initialized');

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
            l10n.t('error.proxyUrlNotSet'),
            l10n.t('button.yes'),
            l10n.t('button.no')
        );

        if (answer === l10n.t('button.yes')) {
            const newProxyUrl = await vscode.window.showInputBox({
                prompt: l10n.t('prompt.enterProxyUrl'),
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
        vscode.window.showErrorMessage(l10n.t('error.settingsFailed') + '\n' + errors.join('\n'));
    } else {
        vscode.window.showInformationMessage(enabled ? l10n.t('info.proxyEnabled') : l10n.t('info.proxyDisabled'));
    }
}

function updateStatusBar(enabled: boolean, proxyUrl: string) {
    if (!statusBarItem) {
        console.error('Status bar item not initialized');
        return;
    }

    if (enabled) {
        statusBarItem.text = '$(plug) ' + l10n.t('statusBar.proxyUrl', proxyUrl);
        statusBarItem.tooltip = l10n.t('statusBar.proxyUrl', proxyUrl);
    } else {
        statusBarItem.text = '$(circle-slash) ' + l10n.t('statusBar.proxyOff');
        statusBarItem.tooltip = l10n.t('statusBar.clickToEnable');
    }
    statusBarItem.show();
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
