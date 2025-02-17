# Change Log

## [1.1.1] - 2024-02-17

### Fixed
- Git proxy disabling error handling
  - Added existence check for Git proxy settings
  - Improved error handling when removing non-existent proxy settings

## [1.1.0] - 2024-02-17

### Added
- One-click proxy configuration for:
  - OS system proxy settings (Windows WinHTTP, macOS Network Services, Linux GNOME)
  - VSCode proxy settings
  - Git proxy configuration
- Status bar toggle button
- Multi-OS support
- Error handling with detailed messages
- Independent error handling for each component

### Changed
- Removed GitHub CLI specific configuration
- Simplified proxy management focusing on system proxy

### Notes
- Requires admin privileges for system proxy
- Settings are applied immediately

## [1.0.0] - 2024-02-16

### Added
- Initial release
- VSCode proxy configuration
- Git proxy configuration
- GitHub CLI proxy configuration
- Basic error handling

## [0.0.1] - 2024-02-16

### Added
- Initial release of Otak Proxy Extension for VSCode
- Toggle proxy settings for VSCode, Git and GitHub CLI with one click
- Clear status bar indicators
- Simple and efficient proxy configuration management
- Automatic synchronization across all tools