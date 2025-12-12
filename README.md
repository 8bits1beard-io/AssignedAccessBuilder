# AssignedAccess XML Builder

A web-based tool for creating Windows 11 AssignedAccess (Kiosk) XML configurations. Build consistent, valid kiosk configurations for deployment via Microsoft Intune CSP or PowerShell scripts.

## Overview

Configuring Windows kiosk mode typically requires manually crafting complex XML with specific namespaces, GUIDs, and nested structures. This tool provides a visual interface to generate valid AssignedAccess XML configurations, reducing errors and ensuring consistency across deployments.

## Features

- **Single-App Kiosk Mode**
  - Microsoft Edge kiosk (fullscreen or public browsing)
  - UWP/Store apps via AUMID
  - Win32 desktop applications
  - Configurable breakout sequence for technician access

- **Multi-App Kiosk Mode**
  - Multiple allowed applications (UWP and Win32)
  - Custom Start menu pins
  - Taskbar visibility control
  - File Explorer access restrictions

- **Account Configuration**
  - Auto-logon (managed local account)
  - Existing account (local, domain, or Azure AD)

- **Export Options**
  - Copy XML to clipboard
  - Download XML file
  - Generate PowerShell deployment script

- **Quality of Life**
  - Common app presets (Edge, Chrome, Office, system utilities)
  - Common Start menu pin presets
  - Import existing XML configurations
  - Real-time XML preview with syntax highlighting
  - Configuration validation
  - Dark/Light theme
  - WCAG accessibility compliant

## Getting Started

### Option 1: Use Directly
1. Download or clone this repository
2. Open `index.html` in a web browser
3. Configure your kiosk settings
4. Export the XML or PowerShell script

### Option 2: Host on Internal Server
Deploy the files to any web server for team-wide access. No server-side processing required - it's entirely client-side.

## Usage

### Creating a Single-App Kiosk (Edge)

1. Select **Single-App** mode
2. Choose **Microsoft Edge (Kiosk Mode)** as the application type
3. Enter the URL to display
4. Select kiosk type:
   - **Fullscreen**: No browser UI (digital signage)
   - **Public Browsing**: Address bar and navigation available
5. Enable **InPrivate Mode** for public kiosks (recommended)
6. Optionally enable **Breakout Sequence** for technician access
7. Configure the account (Auto Logon recommended)
8. Export the configuration

### Creating a Multi-App Kiosk

1. Select **Multi-App** mode
2. Add allowed applications using:
   - Quick-add buttons for common apps
   - Manual entry (Path for Win32, AUMID for UWP)
3. Add Start menu pins for user-accessible apps
4. Configure taskbar visibility and File Explorer access
5. Export the configuration

## Deployment

### Microsoft Intune (Recommended)

1. Generate the XML configuration
2. In Intune, create a **Custom** configuration profile
3. Add an OMA-URI setting:
   - **Name**: AssignedAccess Configuration
   - **OMA-URI**: `./Device/Vendor/MSFT/AssignedAccess/Configuration`
   - **Data type**: String (XML)
   - **Value**: Paste the generated XML
4. Assign the profile to your kiosk device group

### PowerShell Script

1. Click **Download PS1** to generate a deployment script
2. Run the script as SYSTEM on the target device:
   ```powershell
   psexec.exe -i -s powershell.exe -ExecutionPolicy Bypass -File "Apply-AssignedAccess.ps1"
   ```
3. Reboot the device

### Provisioning Package (PPKG)

1. Generate the XML configuration
2. In Windows Configuration Designer:
   - Create a new provisioning package
   - Navigate to Runtime Settings > AssignedAccess > AssignedAccessSettings
   - Paste the XML content
3. Build and apply the package

## XML Schema Reference

The tool generates XML compatible with Windows 11 22H2+ using these namespaces:

| Namespace | Version | Features |
|-----------|---------|----------|
| `http://schemas.microsoft.com/AssignedAccess/2017/config` | Base | Core kiosk functionality |
| `http://schemas.microsoft.com/AssignedAccess/201901/config` (rs5) | 1903+ | DisplayName for auto-logon |
| `http://schemas.microsoft.com/AssignedAccess/2021/config` (v4) | 21H2+ | ClassicAppPath, BreakoutSequence |
| `http://schemas.microsoft.com/AssignedAccess/2022/config` (v5) | 22H2+ | StartPins (Windows 11) |

## Common AUMIDs

| Application | AUMID |
|-------------|-------|
| Calculator | `Microsoft.WindowsCalculator_8wekyb3d8bbwe!App` |
| Photos | `Microsoft.Windows.Photos_8wekyb3d8bbwe!App` |
| Settings | `windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel` |
| Edge (UWP) | `Microsoft.MicrosoftEdge.Stable_8wekyb3d8bbwe!App` |
| Windows Terminal | `Microsoft.WindowsTerminal_8wekyb3d8bbwe!App` |

To find an app's AUMID:
```powershell
Get-StartApps | Format-Table Name, AppID
```

## Troubleshooting

### "Operation cancelled due to restrictions"
This typically occurs with Win32 apps due to RestrictRun registry entries. Solutions:
- Use Edge Kiosk mode instead of Win32 apps when possible
- Ensure all required executables are in the allowed apps list
- Check for leftover registry entries from previous kiosk configurations

### Kiosk not applying after reboot
- Verify the XML is valid (use the built-in validation)
- Check Event Viewer: `Applications and Services Logs > Microsoft > Windows > AssignedAccess`
- Ensure the script ran as SYSTEM, not as a regular administrator

### Removing kiosk configuration
Use the `Clear-AssignedAccess` PowerShell cmdlet or remove via Intune by unassigning the profile.

## Requirements

- **Target OS**: Windows 11 22H2 or later (Windows 10 supported with limited features)
- **Browser**: Any modern browser to run the tool (Chrome, Edge, Firefox)
- **Deployment**: Intune, PPKG, or PowerShell with SYSTEM privileges

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Credits

Created by [Joshua Walderbach](https://www.linkedin.com/in/joshua-walderbach/)

Inspired by the work of [Brandon Villines](https://www.linkedin.com/in/brandon-villines/)

## License

MIT License - Feel free to use, modify, and distribute.

## Resources

- [Microsoft Docs: AssignedAccess CSP](https://docs.microsoft.com/en-us/windows/client-management/mdm/assignedaccess-csp)
- [Microsoft Docs: Set up a kiosk on Windows 11](https://docs.microsoft.com/en-us/windows/configuration/kiosk-methods)
- [Microsoft Docs: Configure Microsoft Edge kiosk mode](https://docs.microsoft.com/en-us/deployedge/microsoft-edge-configure-kiosk-mode)
