import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

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

async function updateSystemProxy(enabled: boolean, proxyUrl: string) {
    const platform = os.platform();
    const proxyWithoutProtocol = proxyUrl.replace(/^https?:\/\//, '');

    try {
        switch (platform) {
            case 'win32':
                if (enabled) {
                    // WinHTTPの設定を更新してシステム全体に即時反映
                    await executeCommand(
                        `netsh winhttp set proxy "${proxyWithoutProtocol}"`,
                        'Windows system-wide proxy enable'
                    );
                } else {
                    // WinHTTPのプロキシ設定をリセット
                    await executeCommand(`netsh winhttp reset proxy`, 'Windows system-wide proxy disable');
                }
                break;

            case 'darwin':
                // macOSのネットワークサービス名を取得
                const { stdout: networkServices } = await execAsync('networksetup -listallnetworkservices');
                const services = networkServices.split('\n').slice(1).filter(Boolean); // 最初の行を除外し、空行を削除

                for (const service of services) {
                    if (enabled) {
                        // macOSの各ネットワークサービスでプロキシを設定
                        await executeCommand(
                            `networksetup -setwebproxy "${service}" ${proxyWithoutProtocol.split(':')[0]} ${proxyWithoutProtocol.split(':')[1]}`,
                            `macOS HTTP proxy for ${service}`
                        );
                        await executeCommand(
                            `networksetup -setsecurewebproxy "${service}" ${proxyWithoutProtocol.split(':')[0]} ${proxyWithoutProtocol.split(':')[1]}`,
                            `macOS HTTPS proxy for ${service}`
                        );
                    } else {
                        // macOSの各ネットワークサービスでプロキシを無効化
                        await executeCommand(`networksetup -setwebproxystate "${service}" off`, `macOS HTTP proxy disable for ${service}`);
                        await executeCommand(`networksetup -setsecurewebproxystate "${service}" off`, `macOS HTTPS proxy disable for ${service}`);
                    }
                }
                break;

            case 'linux':
                // システム環境変数を設定/解除
                if (enabled) {
                    await executeCommand(`gsettings set org.gnome.system.proxy mode 'manual'`, 'Linux proxy mode');
                    await executeCommand(`gsettings set org.gnome.system.proxy.http host '${proxyWithoutProtocol.split(':')[0]}'`, 'Linux HTTP proxy host');
                    await executeCommand(`gsettings set org.gnome.system.proxy.http port ${proxyWithoutProtocol.split(':')[1]}`, 'Linux HTTP proxy port');
                    await executeCommand(`gsettings set org.gnome.system.proxy.https host '${proxyWithoutProtocol.split(':')[0]}'`, 'Linux HTTPS proxy host');
                    await executeCommand(`gsettings set org.gnome.system.proxy.https port ${proxyWithoutProtocol.split(':')[1]}`, 'Linux HTTPS proxy port');
                } else {
                    await executeCommand(`gsettings set org.gnome.system.proxy mode 'none'`, 'Linux proxy disable');
                }
                break;
        }
        return true;
    } catch (error) {
        console.error('System proxy setting error:', error);
        throw new Error('Failed to update system proxy settings');
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
        async function checkGitConfig(key: string): Promise<boolean> {
            try {
                await execAsync(`git config --global --get ${key}`);
                return true;
            } catch {
                return false;
            }
        }

        if (enabled) {
            await executeCommand(`git config --global http.proxy "${proxyUrl}"`, 'Git proxy configuration');
            await executeCommand(`git config --global https.proxy "${proxyUrl}"`, 'Git proxy configuration');
        } else {
            const [hasHttpProxy, hasHttpsProxy] = await Promise.all([
                checkGitConfig('http.proxy'),
                checkGitConfig('https.proxy')
            ]);

            if (hasHttpProxy) {
                await executeCommand('git config --global --unset http.proxy', 'Git proxy removal');
            }
            if (hasHttpsProxy) {
                await executeCommand('git config --global --unset https.proxy', 'Git proxy removal');
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
        await updateSystemProxy(enabled, proxyUrl);
    } catch (error) {
        success = false;
        errors.push(`System proxy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

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
    } else {
        vscode.window.showInformationMessage(`System proxy settings ${enabled ? 'enabled' : 'disabled'}`);
    }
}

function updateStatusBar(enabled: boolean, proxyUrl: string) {
    if (!statusBarItem) {
        console.error('Status bar item not initialized');
        return;
    }

    if (enabled) {
        statusBarItem.text = `$(plug) Proxy: ${proxyUrl}`;
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
