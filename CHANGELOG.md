# Change Log

## [1.2.0] - 2024-02-18

### Added
- Added multi-language support:
  - Japanese (日本語)
  - Chinese Simplified (简体中文)
  - Chinese Traditional (繁體中文)
  - Korean (한국어)
  - German (Deutsch)
  - French (Français)
  - Spanish (Español)
  - Italian (Italiano)
  - Russian (Русский)

## [1.1.3] - 2024-02-18

### Changed
- Removed OS system proxy configuration feature
- Simplified proxy management to focus on VSCode and Git settings only
- Removed admin privilege requirement

## [1.1.2] - 2024-02-17

### Changed
- Updated extension icon for better visibility

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