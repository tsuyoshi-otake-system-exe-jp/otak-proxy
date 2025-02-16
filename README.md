<p align="center">
  <h1 align="center">otak-proxy</h1>
  <p align="center">Switch proxy settings for VSCode, Git, and GitHub CLI with one click. Enhance your workflow with a simple, efficient tool.</p>
</p>

---

On the first launch, a proxy settings screen is displayed, making it easy to configure.

![](images\otak-proxy.png)

1. Toggle proxy settings
   - Click the proxy icon in the status bar
   - Or use the command palette (F1) and search for "Toggle Proxy Settings"

## Features

- One-click proxy settings toggle
- Synchronized updates for VSCode, Git, and GitHub CLI proxy settings
- Visual status indicator in the status bar
- Persistent configuration
- Initial setup wizard

Status bar shows:
- ![Proxy On](images/plug.png) Proxy: On - Proxy is enabled
- ![Proxy Off](images/circle-slash.png) Proxy: Off - Proxy is disabled

## Requirements

- Visual Studio Code 1.9.0 or higher
- Git (for global proxy configuration)
- GitHub CLI (gh) - Optional

## Extension Settings

This extension contributes the following settings:

* `otakProxy.proxyUrl`: Proxy server URL
  - Example: `http://proxy.example.com:8080`

## Affected Settings

This extension updates the following proxy configurations:

1. VSCode
   - Global `http.proxy` setting

2. Git
   - `http.proxy`
   - `https.proxy`

3. GitHub CLI
   - `http_proxy`
   - `https_proxy`

## Troubleshooting

If proxy settings fail to update:

1. Verify proxy URL format
2. Ensure Git is installed
3. Check GitHub CLI installation (if using)
4. Verify required permissions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

For more information, visit the [GitHub repository](https://github.com/tsuyoshi-otake-system-exe-jp/otak-proxy).