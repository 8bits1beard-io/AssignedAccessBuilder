# Technical Reference

Detailed documentation for AssignedAccess XML Builder.

---

## Usage Examples

### Single-App Kiosk (Edge)

1. Select **Single-App** mode
2. Choose **Microsoft Edge (Kiosk Mode)**
3. Select source type:
   - **Web URL** — Enter a website address (e.g., `https://example.com`)
   - **Local File** — Enter a file path (e.g., `C:/Kiosk/index.html`). Spaces are encoded automatically.
4. Select kiosk type:
   - **Fullscreen** — No browser UI (digital signage)
   - **Public Browsing** — Address bar and navigation visible
5. Enable **InPrivate Mode** for public kiosks
6. Optionally enable **Breakout Sequence** for technician access (Ctrl+Alt+K)
7. Configure account (Auto Logon recommended)
8. Export

### Multi-App Kiosk

1. Select **Multi-App** mode
2. Add allowed applications (use presets or manual entry)
3. Add Start menu pins
4. Configure taskbar visibility and File Explorer access
5. Export

---

## Deployment

### Microsoft Intune (Recommended)

```mermaid
flowchart LR
    A[Generate XML] --> B[Intune Admin Center]
    B --> C[Create Custom Profile]
    C --> D[Add OMA-URI Setting]
    D --> E[Assign to Device Group]
    E --> F[Device Syncs & Applies]
```

**OMA-URI Setting:**
| Field | Value |
|-------|-------|
| Name | AssignedAccess Configuration |
| OMA-URI | `./Device/Vendor/MSFT/AssignedAccess/Configuration` |
| Data type | String (XML) |
| Value | *Paste generated XML* |

### PowerShell Script

1. Click **Download Deploy Script**
2. Run as SYSTEM on target device:
   ```powershell
   psexec.exe -i -s powershell.exe -ExecutionPolicy Bypass -File "Apply-AssignedAccess.ps1"
   ```
3. Review the JSON log file created in the script directory
4. Reboot

### Provisioning Package (PPKG)

1. Generate XML
2. In Windows Configuration Designer:
   - Create provisioning package
   - Navigate to **Runtime Settings > AssignedAccess > AssignedAccessSettings**
   - Paste XML
3. Build and apply package

---

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Operation cancelled due to restrictions" | Win32 app blocked by RestrictRun registry | Use Edge kiosk mode or ensure all required executables are allowed |
| Kiosk not applying after reboot | Invalid XML or insufficient privileges | Validate XML in tool; ensure script ran as SYSTEM |
| Configuration partially applied | XML namespace mismatch | Regenerate XML; check Windows version compatibility |

**Diagnostic logs:** `Event Viewer > Applications and Services Logs > Microsoft > Windows > AssignedAccess`

**Remove configuration:** `Clear-AssignedAccess` cmdlet or unassign Intune profile

---

## XML Namespaces

| Namespace | Windows Version | Features Added |
|-----------|-----------------|----------------|
| `2017/config` | Base | Core kiosk functionality |
| `201901/config` (rs5) | 1903+ | DisplayName for auto-logon |
| `2021/config` (v4) | 21H2+ | ClassicAppPath, BreakoutSequence |
| `2022/config` (v5) | 22H2+ | StartPins (Windows 11) |

---

## Common AUMIDs

| Application | AUMID |
|-------------|-------|
| Calculator | `Microsoft.WindowsCalculator_8wekyb3d8bbwe!App` |
| Photos | `Microsoft.Windows.Photos_8wekyb3d8bbwe!App` |
| Settings | `windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel` |
| Edge | `Microsoft.MicrosoftEdge.Stable_8wekyb3d8bbwe!App` |
| Windows Terminal | `Microsoft.WindowsTerminal_8wekyb3d8bbwe!App` |

**Find any app's AUMID:**
```powershell
Get-StartApps | Format-Table Name, AppID
```

---

## Resources

- [AssignedAccess CSP Reference](https://docs.microsoft.com/en-us/windows/client-management/mdm/assignedaccess-csp)
- [Set Up a Kiosk on Windows 11](https://docs.microsoft.com/en-us/windows/configuration/kiosk-methods)
- [Configure Microsoft Edge Kiosk Mode](https://docs.microsoft.com/en-us/deployedge/microsoft-edge-configure-kiosk-mode)
