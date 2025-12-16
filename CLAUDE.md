# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AssignedAccess XML Builder is a client-side web tool for generating Windows 11 kiosk (AssignedAccess) configuration XML. It runs entirely in the browser with no backend—just open `index.html`. No external dependencies or build process.

## Architecture

```
index.html              HTML structure (~870 lines)
styles.css              CSS variables for theming, responsive layout, accessibility (~1270 lines)
app.js                  All application logic (~1900 lines)
data/
  app-presets.json      50+ app definitions (AUMIDs, paths) with groupings
  pin-presets.json      27+ shortcut presets for Start menu pins
```

### JavaScript Organization (app.js)

| Section | Key Functions |
|---------|---------------|
| Presets | `loadPresets()` - fetches JSON data on init |
| State | `state` object with `mode`, `accountType`, `allowedApps[]`, `startPins[]`, `autoLaunchApp` |
| Theme | `toggleTheme()` - persists to localStorage |
| Deploy Modal | `showDeployHelp()`, `hideDeployHelp()`, `switchDeployTab()` |
| Tabs | `switchTab()`, `updateTabVisibility()` |
| Mode | `setMode()`, `updateAccountTypeOptions()`, `setAccountType()` |
| UI | `updateAppTypeUI()`, `updateEdgeSourceUI()`, `updateBreakoutUI()` |
| Apps | `addApp()`, `addCommonApp()`, `removeApp()`, `renderAppList()` |
| Pins | `addPin()`, `addCommonPin()`, `removePin()`, `renderPinList()` |
| XML | `generateXml()`, `generateSingleAppProfile()`, `generateMultiAppProfile()`, `generateConfigsSection()`, `generateAccountConfig()` |
| Validate | `validate()`, `showValidation()` |
| Export | `copyXml()`, `downloadXml()`, `downloadPowerShell()`, `generateReadme()` |
| Import | `parseAndLoadXml()` - handles namespace variants |
| Presets | `loadPreset()` - 4 built-in templates |

### Kiosk Modes

| Mode | Description | Account Types |
|------|-------------|---------------|
| **Single-App** | Edge kiosk (URL or local file), UWP app (AUMID), or Win32 app (executable path) | Auto Logon, Existing Account |
| **Multi-App** | App whitelist + Start menu pins + optional auto-launch + File Explorer restrictions | Auto Logon, Existing Account |
| **Restricted User** | Same as Multi-App but supports group-based assignment | Auto Logon, Existing Account, User Group, Global Profile |

### Account Types

| Type | XML Element | Use Case |
|------|-------------|----------|
| `auto` | `<AutoLogonAccount rs5:DisplayName="..."/>` | Managed local account, auto-logs in |
| `existing` | `<Account>username</Account>` | Pre-created local/domain/Azure AD account |
| `group` | `<UserGroup Type="..." Name="..."/>` | Restricted mode only - assign to group |
| `global` | `<v3:GlobalProfile Id="..."/>` | Restricted mode only - all non-admin users |

## Development

No build process. Open `index.html` in a browser to test changes. Presets are loaded via `fetch()` so you need to serve via HTTP (e.g., `npx serve` or VS Code Live Server) rather than file://.

## Key Technical Details

### XML Namespaces
```
Base:     http://schemas.microsoft.com/AssignedAccess/2017/config
rs5:      http://schemas.microsoft.com/AssignedAccess/201901/config  (1903+, DisplayName, AutoLaunch)
v3:       http://schemas.microsoft.com/AssignedAccess/2020/config    (RemovableDrives, GlobalProfile)
v4:       http://schemas.microsoft.com/AssignedAccess/2021/config    (ClassicAppPath, BreakoutSequence)
v5:       http://schemas.microsoft.com/AssignedAccess/2022/config    (StartPins - Windows 11 22H2+)
```

### Edge Kiosk Arguments
- `--kiosk <URL>` - Sets the kiosk URL
- `--edge-kiosk-type=fullscreen|public-browsing` - Display mode
- `--inprivate` - No history/cookies saved
- `--kiosk-idle-timeout-minutes=N` - Reset after N minutes of inactivity

### Edge Configuration
**Important:** Edge Chromium is a Win32 desktop app, NOT a UWP app.
- Single-app mode uses `v4:ClassicAppPath` with msedge.exe path
- Multi-app mode adds Edge to AllowedApps via `DesktopAppPath`
- Do NOT use `AppUserModelId="MSEdge"` - that's for legacy Edge

### StartPins JSON Formats (Windows 11)
```json
// UWP apps
{"packagedAppId": "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App"}

// Desktop apps (Win32)
{"desktopAppLink": "C:\\ProgramData\\KioskShortcuts\\AppName.lnk"}

// Edge pinned sites
{"secondaryTile": {"tileId": "...", "displayName": "...", "arguments": "url", "packagedAppId": "..."}}
```

### File Path Handling
- Backslashes converted to forward slashes for file:// URLs
- Spaces encoded as `%20` in file:// URLs
- Drive letters preserved (not URL-encoded)

### PowerShell Script Generation
The generated `Apply-AssignedAccess.ps1` includes:
- Pre-flight checks (Windows edition via SID, SYSTEM context via S-1-5-18, WMI availability)
- Shortcut creation in `C:\ProgramData\KioskShortcuts\`
- JSON logging with timestamps
- WMI-based configuration via `MDM_AssignedAccess`

A `README.md` summary is also generated with the configuration details.

### Preset Data Files

**data/app-presets.json**:
- `apps`: Object mapping keys to `{type, value}` (type is "path" or "aumid")
- `groups`: Object mapping keys to arrays of app keys (for adding multiple related apps)

**data/pin-presets.json**:
- `pins`: Object mapping keys to pin config objects
- Desktop apps: `{name, pinType: "desktopAppLink", target, args, workingDir, iconPath, systemShortcut?}`
- UWP apps: `{name, pinType: "packagedAppId", packagedAppId}`

### Import Parsing
`parseAndLoadXml()` handles multiple namespace variants and reconstructs full UI state from imported XML. Cannot extract shortcut target paths from CDATA—users must re-enter those.

## Accessibility

- Skip link for keyboard navigation
- ARIA labels/roles on all interactive elements
- Live regions for dynamic updates
- Focus-visible styles
- Modal escape key support
- Tabbed deploy guide with keyboard navigation
