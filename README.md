<p align="center">
  <h1 align="center">otak-proxy</h1>
  <p align="center">One-click proxy configuration for VSCode and Git.</p>
</p>

---

Simply click to enable/disable proxy settings for your development tools.

![](images/otak-proxy.png)

## Features

- One-click proxy configuration for:
  - VSCode proxy
  - Git proxy settings
- Visual status indicator in status bar
- Easy initial setup

## Usage

1. Click the proxy icon in the status bar to toggle
2. Or use the command palette (F1): "Toggle Proxy Settings"

Status bar shows:
- ![Proxy On](images/plug.png) Proxy: On - Shows current proxy URL
- ![Proxy Off](images/circle-slash.png) Proxy: Off - Click to enable

## Requirements

- Visual Studio Code 1.9.0 or higher
- Git

## Extension Settings

* `otakProxy.proxyUrl`: Proxy server URL (e.g., `http://proxy.example.com:8080`)

## Troubleshooting

If proxy settings fail to update:
1. Check proxy URL format
2. Ensure Git is installed
3. Check Git global configuration permissions

## License

MIT License - see the LICENSE file for details.

---

For more information, visit the [GitHub repository](https://github.com/tsuyoshi-otake-system-exe-jp/otak-proxy).