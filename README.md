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

## Related Extensions
Check out our other VS Code extensions.

### [otak-monitor](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-monitor)
Real-time system monitoring in VS Code. Track CPU, memory, and disk usage through the status bar with comprehensive tooltips and 1-minute averages.

### [otak-proxy](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-proxy)
One-click proxy configuration for VS Code and Git. Perfect for environments where network settings change frequently.

### [otak-committer](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-committer)
Intelligent SCM operations with AI support. Features multilingual commit message generation (25 languages supported) and upcoming PR management capabilities.

### [otak-restart](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-restart)
Quick restart operations for Extension Host and VS Code window via status bar tooltip. Streamlines your development workflow.

### [otak-clock](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock)
Display date and time for two time zones from around the world in VS Code. Essential for working across different time zones.

### [otak-pomodoro](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-pomodoro)
Enhance your productivity with this Pomodoro Timer extension. Helps balance focused work sessions with refreshing breaks using the Pomodoro Technique.

### [otak-zen](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-zen)
Experience a distraction-free workflow with otak-zen. This extension transforms your VS Code interface into a minimalist environment by hiding non-essential UI elements, allowing you to focus solely on coding. Customize which components to show or hide, and toggle zen mode quickly via commands or the status bar.

## License

MIT License - see the LICENSE file for details.

---

For more information, visit the [GitHub repository](https://github.com/tsuyoshi-otake/otak-proxy).