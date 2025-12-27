/* ============================================================================
   Summary
   ============================================================================ */
function formatKioskModeSummary() {
    if (state.mode === 'single') {
        const appType = dom.get('appType').value;
        if (appType === 'edge') {
            const kioskType = dom.get('edgeKioskType').value;
            const kioskLabel = kioskType === 'public-browsing' ? 'Public Browsing' : 'Fullscreen';
            return `Single-App (Edge - ${kioskLabel})`;
        }
        if (appType === 'uwp') return 'Single-App (UWP)';
        return 'Single-App (Win32)';
    }
    return state.mode === 'restricted' ? 'Restricted User' : 'Multi-App';
}

function formatAllowedAppsSummary() {
    if (state.mode === 'single') {
        return 'N/A (single-app mode)';
    }
    if (state.allowedApps.length === 0) {
        return 'None';
    }
    const items = state.allowedApps.map((app, index) => {
        const label = isEdgeApp(app.value) ? 'Microsoft Edge' : app.value;
        const autoTag = state.autoLaunchApp === index ? ' (auto-launch)' : '';
        return `<li>${escapeXml(label)}${autoTag}</li>`;
    }).join('');
    return `<ul>${items}</ul>`;
}

function formatStartPinsSummary() {
    if (state.mode === 'single') {
        return 'N/A (single-app mode)';
    }
    if (state.startPins.length === 0) {
        return 'None';
    }
    const items = state.startPins.map(pin => {
        const name = pin.name || 'Unnamed pin';
        const args = pin.args ? ` (args: ${pin.args})` : '';
        return `<li>${escapeXml(name)}${escapeXml(args)}</li>`;
    }).join('');
    return `<ul>${items}</ul>`;
}

function formatAutoLaunchSummary() {
    if (state.mode === 'single') {
        const appType = dom.get('appType').value;
        if (appType === 'edge') {
            const url = getEdgeUrl();
            const kioskType = dom.get('edgeKioskType').value;
            const idleTimeout = parseInt(dom.get('edgeIdleTimeout').value) || 0;
            const args = buildEdgeKioskArgs(url, kioskType, idleTimeout);
            return `Microsoft Edge (args: ${args})`;
        }
        if (appType === 'uwp') {
            const aumid = dom.get('uwpAumid').value.trim();
            return aumid ? `UWP App (${aumid})` : 'UWP App';
        }
        const path = dom.get('win32Path').value.trim();
        const args = dom.get('win32Args').value.trim();
        return path ? `${path}${args ? ` (args: ${args})` : ''}` : 'Win32 App';
    }

    if (state.autoLaunchApp === null || !state.allowedApps[state.autoLaunchApp]) {
        return 'None';
    }

    const app = state.allowedApps[state.autoLaunchApp];
    const label = isEdgeApp(app.value) ? 'Microsoft Edge' : app.value;
    let args = '';

    if (isEdgeApp(app.value)) {
        const url = getMultiAppEdgeUrl();
        const kioskType = dom.get('multiEdgeKioskType').value;
        args = buildEdgeKioskArgs(url, kioskType, 0);
    } else if (app.type === 'path') {
        args = dom.get('win32AutoLaunchArgs').value.trim();
    }

    return `${label}${args ? ` (args: ${args})` : ''}`;
}

function updateSummary() {
    const summaryGrid = dom.get('summaryGrid');
    if (!summaryGrid) return;

    const configName = dom.get('configName').value.trim() || 'Unnamed';
    const autoLogon = state.accountType === 'auto';
    const displayName = dom.get('displayName').value.trim();
    const accountName = dom.get('accountName')?.value.trim() || '';
    const groupName = dom.get('groupName')?.value.trim() || '';
    const groupType = dom.get('groupType')?.value || '';

    let accountSummary = 'Auto Logon (Managed)';
    if (state.accountType === 'existing') {
        accountSummary = accountName ? `Existing Account (${accountName})` : 'Existing Account';
    } else if (state.accountType === 'group') {
        const typeLabel = groupType ? `, ${groupType}` : '';
        accountSummary = groupName ? `User Group (${groupName}${typeLabel})` : 'User Group';
    } else if (state.accountType === 'global') {
        accountSummary = 'Global Profile (All non-admin users)';
    } else if (state.accountType === 'auto') {
        accountSummary = displayName ? `Auto Logon (${displayName})` : 'Auto Logon (Managed)';
    }

    const rows = [
        { label: 'Name', value: escapeXml(configName) },
        { label: 'Kiosk Type', value: escapeXml(formatKioskModeSummary()) },
        { label: 'Account', value: escapeXml(accountSummary) },
        { label: 'Allowed Apps', value: formatAllowedAppsSummary() },
        { label: 'Start Menu Pins', value: formatStartPinsSummary() },
        { label: 'Auto Logon', value: autoLogon ? 'Yes' : 'No' },
        { label: 'Auto Logon Username', value: autoLogon ? escapeXml(displayName || 'Managed kiosk account') : 'N/A' },
        { label: 'Auto-Launch App', value: escapeXml(formatAutoLaunchSummary()) }
    ];

    summaryGrid.innerHTML = rows.map(row => `
        <div class="summary-item">
            <div class="summary-label">${row.label}</div>
            <div class="summary-value">${row.value}</div>
        </div>
    `).join('');
}

function formatLastUpdated(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return 'Unavailable';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    return `${year}-${month}-${day} ${hours}:${minutes} ${ampm}`;
}
