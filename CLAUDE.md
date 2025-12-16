# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AssignedAccess XML Builder is a client-side web tool for generating Windows 11 kiosk (AssignedAccess) configuration XML. It runs entirely in the browser with no backend—just open `index.html`. No external dependencies or build process.

## Architecture

```
index.html              HTML structure (~730 lines)
styles.css              CSS variables for theming, responsive layout, accessibility
app.js                  All application logic (~1700 lines)
data/
  app-presets.json      50+ app definitions (AUMIDs, paths) with groupings
  pin-presets.json      15+ shortcut presets for Start menu pins
```

### JavaScript Organization (app.js)

| Section | Key Functions |
|---------|---------------|
| Presets | `loadPresets()` - fetches JSON data on init |
| State | `state` object with `allowedApps[]`, `startPins[]`, `autoLaunchApp` |
| Theme | `toggleTheme()` - persists to localStorage |
| Tabs | `switchTab()`, `updateTabVisibility()` |
| Mode | `setMode()`, `setAccountType()` |
| UI | `updateAppTypeUI()`, `updateEdgeSourceUI()`, `updateBreakoutUI()` |
| Apps | `addApp()`, `addCommonApp()`, `removeApp()`, `renderAppList()` |
| Pins | `addPin()`, `addCommonPin()`, `removePin()`, `renderPinList()` |
| XML | `generateXml()`, `generateSingleAppProfile()`, `generateMultiAppProfile()` |
| Validate | `validate()`, `showValidation()` |
| Export | `copyXml()`, `downloadXml()`, `downloadPowerShell()`, `generateReadme()` |
| Import | `parseAndLoadXml()` - handles namespace variants |
| Presets | `loadPreset()` - 4 built-in templates |

### Kiosk Modes

**Single-App**: Edge kiosk (URL or local file), UWP app (AUMID), or Win32 app (executable path)
**Multi-App**: App whitelist + Start menu pins + optional auto-launch + File Explorer restrictions

## Development

No build process. Open `index.html` in a browser to test changes. Presets are loaded via `fetch()` so you need to serve via HTTP (e.g., `npx serve` or VS Code Live Server) rather than file://.

## Key Technical Details

### XML Namespaces
```
Base:     http://schemas.microsoft.com/AssignedAccess/2017/config
rs5:      http://schemas.microsoft.com/AssignedAccess/201901/config  (1903+, DisplayName)
v3:       http://schemas.microsoft.com/AssignedAccess/2020/config    (RemovableDrives)
v4:       http://schemas.microsoft.com/AssignedAccess/2021/config    (ClassicAppPath, BreakoutSequence)
v5:       http://schemas.microsoft.com/AssignedAccess/2022/config    (StartPins - Windows 11 22H2+)
```

### Edge Kiosk Arguments
- `--kiosk <URL>` - Sets the kiosk URL
- `--edge-kiosk-type=fullscreen|public-browsing` - Display mode
- `--inprivate` - No history/cookies saved

### File Path Handling
- Backslashes converted to forward slashes
- Spaces encoded as `%20` in file:// URLs
- Drive letters preserved (not URL-encoded)

### PowerShell Script Generation
The generated `Apply-AssignedAccess.ps1` includes:
- Pre-flight checks (Windows edition, SYSTEM context, WMI availability)
- Shortcut creation in `C:\ProgramData\KioskShortcuts\`
- JSON logging with timestamps
- WMI-based configuration via `MDM_AssignedAccess`

A `README.md` summary is also generated with the configuration details.

### Preset Data Files

**data/app-presets.json**:
- `apps`: Object mapping keys to `{type, value}` (type is "path" or "aumid")
- `groups`: Object mapping keys to arrays of app keys (for adding multiple related apps)

**data/pin-presets.json**:
- `pins`: Object mapping keys to `{name, target, args, workingDir, iconPath, systemShortcut?}`

### Import Parsing
`parseAndLoadXml()` handles multiple namespace variants and reconstructs full UI state from imported XML. Cannot extract shortcut target paths from CDATA—users must re-enter those.

## Accessibility

- Skip link for keyboard navigation
- ARIA labels/roles on all interactive elements
- Live regions for dynamic updates
- Focus-visible styles
- Modal escape key support
