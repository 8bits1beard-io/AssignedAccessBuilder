/* ============================================================================
   AssignedAccess XML Builder - Application Logic
   ============================================================================ */

/* ============================================================================
   Preset Data (loaded from JSON files)
   ============================================================================ */
let appPresets = null;
let pinPresets = null;

async function loadPresets() {
    try {
        const [appResponse, pinResponse] = await Promise.all([
            fetch('data/app-presets.json'),
            fetch('data/pin-presets.json')
        ]);
        appPresets = await appResponse.json();
        pinPresets = await pinResponse.json();
    } catch (e) {
        console.error('Failed to load presets:', e);
    }
}

/* ============================================================================
   State Management
   ============================================================================ */
const state = {
    mode: 'single',           // 'single' or 'multi'
    accountType: 'auto',      // 'auto' or 'existing'
    allowedApps: [],          // For multi-app mode
    startPins: [],            // For multi-app mode: array of {name, target, args, workingDir, iconPath}
    autoLaunchApp: null,      // Index into allowedApps array, or null (for multi-app)
    multiAppEdgeConfig: {     // Edge kiosk config for multi-app mode
        url: '',
        sourceType: 'url',    // 'url' or 'file'
        kioskType: 'fullscreen',
        inPrivate: true
    }
};

/* ============================================================================
   GUID Generator
   ============================================================================ */
function generateGuid() {
    const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    document.getElementById('profileId').value = '{' + guid + '}';
    updatePreview();
}

/* ============================================================================
   Theme Toggle
   ============================================================================ */
function toggleTheme() {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.querySelector('.theme-toggle').textContent = isDark ? '🌙' : '☀️';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Load saved theme (dark mode is default)
(function() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
        document.body.setAttribute('data-theme', 'light');
        document.querySelector('.theme-toggle').textContent = '🌙';
    } else {
        document.body.setAttribute('data-theme', 'dark');
        document.querySelector('.theme-toggle').textContent = '☀️';
    }
})();

/* ============================================================================
   Deploy Guide Modal
   ============================================================================ */
function showDeployHelp() {
    const modal = document.getElementById('deployModal');
    modal.classList.remove('hidden');
    modal.querySelector('.modal-close').focus();
    document.body.style.overflow = 'hidden';
}

function hideDeployHelp() {
    const modal = document.getElementById('deployModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('deployModal');
        if (!modal.classList.contains('hidden')) {
            hideDeployHelp();
        }
    }
});

/* ============================================================================
   Tab Navigation
   ============================================================================ */
function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.id === `tab-btn-${tabId}`;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive);
    });

    // Update tab panels
    document.querySelectorAll('.tab-content').forEach(panel => {
        const isActive = panel.id === `tab-${tabId}`;
        panel.classList.toggle('active', isActive);
    });
}

function updateTabVisibility() {
    const isMultiApp = state.mode === 'multi';
    const startMenuTab = document.getElementById('tab-btn-startmenu');
    const systemTab = document.getElementById('tab-btn-system');

    // Show/hide tabs based on mode
    startMenuTab.classList.toggle('hidden', !isMultiApp);
    systemTab.classList.toggle('hidden', !isMultiApp);

    // If switching to single mode and currently on a multi-only tab, switch to Application tab
    if (!isMultiApp) {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && (activeTab.id === 'tab-btn-startmenu' || activeTab.id === 'tab-btn-system')) {
            switchTab('application');
        }
    }
}

/* ============================================================================
   Mode Switching
   ============================================================================ */
function setMode(mode) {
    state.mode = mode;

    const singleBtn = document.getElementById('modeSingle');
    const multiBtn = document.getElementById('modeMulti');
    const singleConfig = document.getElementById('singleAppConfig');
    const multiConfig = document.getElementById('multiAppConfig');

    singleBtn.classList.toggle('active', mode === 'single');
    multiBtn.classList.toggle('active', mode === 'multi');
    singleBtn.setAttribute('aria-pressed', mode === 'single');
    multiBtn.setAttribute('aria-pressed', mode === 'multi');

    singleConfig.classList.toggle('hidden', mode !== 'single');
    multiConfig.classList.toggle('hidden', mode !== 'multi');
    singleConfig.setAttribute('aria-hidden', mode !== 'single');
    multiConfig.setAttribute('aria-hidden', mode !== 'multi');

    // Update tab visibility based on mode
    updateTabVisibility();

    // Update auto-launch selector when switching to multi mode
    if (mode === 'multi') {
        updateAutoLaunchSelector();
    }

    updatePreview();
}

function setAccountType(type) {
    state.accountType = type;

    const autoBtn = document.getElementById('accountAuto');
    const existingBtn = document.getElementById('accountExisting');
    const autoConfig = document.getElementById('autoLogonConfig');
    const existingConfig = document.getElementById('existingAccountConfig');

    autoBtn.classList.toggle('active', type === 'auto');
    existingBtn.classList.toggle('active', type === 'existing');
    autoBtn.setAttribute('aria-pressed', type === 'auto');
    existingBtn.setAttribute('aria-pressed', type === 'existing');

    autoConfig.classList.toggle('hidden', type !== 'auto');
    existingConfig.classList.toggle('hidden', type !== 'existing');
    autoConfig.setAttribute('aria-hidden', type !== 'auto');
    existingConfig.setAttribute('aria-hidden', type !== 'existing');

    updatePreview();
}

function updateAppTypeUI() {
    const appType = document.getElementById('appType').value;
    const edgeConfig = document.getElementById('edgeConfig');
    const uwpConfig = document.getElementById('uwpConfig');
    const win32Config = document.getElementById('win32Config');

    edgeConfig.classList.toggle('hidden', appType !== 'edge');
    uwpConfig.classList.toggle('hidden', appType !== 'uwp');
    win32Config.classList.toggle('hidden', appType !== 'win32');

    edgeConfig.setAttribute('aria-hidden', appType !== 'edge');
    uwpConfig.setAttribute('aria-hidden', appType !== 'uwp');
    win32Config.setAttribute('aria-hidden', appType !== 'win32');
}

function updateEdgeSourceUI() {
    const sourceType = document.getElementById('edgeSourceType').value;
    const urlConfig = document.getElementById('edgeUrlConfig');
    const fileConfig = document.getElementById('edgeFileConfig');

    urlConfig.classList.toggle('hidden', sourceType !== 'url');
    fileConfig.classList.toggle('hidden', sourceType !== 'file');

    urlConfig.setAttribute('aria-hidden', sourceType !== 'url');
    fileConfig.setAttribute('aria-hidden', sourceType !== 'file');
}

function getEdgeUrl() {
    const sourceType = document.getElementById('edgeSourceType').value;
    if (sourceType === 'file') {
        let filePath = document.getElementById('edgeFilePath').value.trim();
        if (!filePath) return 'file:///C:/Kiosk/index.html';
        // Convert backslashes to forward slashes
        filePath = filePath.replace(/\\/g, '/');
        // Encode spaces and special characters in path, but preserve drive letter colon
        filePath = filePath.split('/').map((segment, index) => {
            // Don't encode drive letter (e.g., "C:")
            if (index === 0 && /^[A-Za-z]:$/.test(segment)) {
                return segment;
            }
            return encodeURIComponent(segment);
        }).join('/');
        // Ensure it starts with file:///
        if (!filePath.toLowerCase().startsWith('file:///')) {
            filePath = 'file:///' + filePath;
        }
        return filePath;
    } else {
        return document.getElementById('edgeUrl').value || 'https://www.microsoft.com';
    }
}

function updateBreakoutUI() {
    const enabled = document.getElementById('enableBreakout').checked;
    const breakoutConfig = document.getElementById('breakoutConfig');
    breakoutConfig.classList.toggle('hidden', !enabled);
    breakoutConfig.setAttribute('aria-hidden', !enabled);
    updateBreakoutPreview();
}

function updateBreakoutPreview() {
    const ctrl = document.getElementById('breakoutCtrl').checked;
    const alt = document.getElementById('breakoutAlt').checked;
    const shift = document.getElementById('breakoutShift').checked;
    const key = document.getElementById('breakoutFinalKey').value;

    let combo = [];
    if (ctrl) combo.push('Ctrl');
    if (alt) combo.push('Alt');
    if (shift) combo.push('Shift');
    combo.push(key);

    document.getElementById('breakoutPreview').textContent = combo.join('+');
}

function getBreakoutSequence() {
    if (!document.getElementById('enableBreakout').checked) return null;

    const ctrl = document.getElementById('breakoutCtrl').checked;
    const alt = document.getElementById('breakoutAlt').checked;
    const shift = document.getElementById('breakoutShift').checked;
    const key = document.getElementById('breakoutFinalKey').value;

    // Build the key string in the format expected by AssignedAccess
    let combo = [];
    if (ctrl) combo.push('Ctrl');
    if (alt) combo.push('Alt');
    if (shift) combo.push('Shift');
    combo.push(key);

    return combo.join('+');
}

/* ============================================================================
   Multi-App Auto-Launch Functions
   ============================================================================ */
function isEdgeApp(value) {
    if (!value) return false;
    const lowerValue = value.toLowerCase();
    return lowerValue.includes('msedge') ||
           lowerValue.includes('microsoftedge') ||
           lowerValue.includes('edge\\application');
}

function getMultiAppEdgeUrl() {
    const sourceType = document.getElementById('multiEdgeSourceType').value;
    if (sourceType === 'file') {
        let filePath = document.getElementById('multiEdgeFilePath').value.trim();
        if (!filePath) return 'file:///C:/Kiosk/index.html';
        // Convert backslashes to forward slashes
        filePath = filePath.replace(/\\/g, '/');
        // Encode spaces and special characters in path, but preserve drive letter colon
        filePath = filePath.split('/').map((segment, index) => {
            // Don't encode drive letter (e.g., "C:")
            if (index === 0 && /^[A-Za-z]:$/.test(segment)) {
                return segment;
            }
            return encodeURIComponent(segment);
        }).join('/');
        // Ensure it starts with file:///
        if (!filePath.toLowerCase().startsWith('file:///')) {
            filePath = 'file:///' + filePath;
        }
        return filePath;
    } else {
        return document.getElementById('multiEdgeUrl').value || 'https://www.microsoft.com';
    }
}

function isHelperExecutable(value) {
    if (!value) return false;
    const lowerValue = value.toLowerCase();
    // Filter out helper executables that shouldn't be auto-launched
    return lowerValue.includes('_proxy.exe') ||
           lowerValue.includes('edgeupdate') ||
           lowerValue.includes('update.exe') ||
           lowerValue.includes('crashhandler');
}

function updateAutoLaunchSelector() {
    const select = document.getElementById('autoLaunchApp');
    const currentValue = select.value;

    // Clear all options except "None"
    select.innerHTML = '<option value="">None (show Start menu)</option>';

    // Add allowed apps as options (skip helper executables)
    state.allowedApps.forEach((app, index) => {
        // Skip helper executables - they shouldn't be auto-launched
        if (isHelperExecutable(app.value)) {
            return;
        }

        const option = document.createElement('option');
        option.value = index;
        // Create a friendly display name
        let displayName = app.value;
        if (displayName.length > 50) {
            displayName = '...' + displayName.slice(-47);
        }
        if (isEdgeApp(app.value)) {
            displayName = 'Microsoft Edge';
        }
        option.textContent = displayName;
        select.appendChild(option);
    });

    // Restore selection if still valid
    if (currentValue !== '' && state.allowedApps[parseInt(currentValue)]) {
        select.value = currentValue;
    } else {
        select.value = '';
        state.autoLaunchApp = null;
    }

    updateMultiAppEdgeUI();
}

function updateAutoLaunchSelection() {
    const select = document.getElementById('autoLaunchApp');
    const value = select.value;

    if (value === '') {
        state.autoLaunchApp = null;
    } else {
        state.autoLaunchApp = parseInt(value);
    }

    updateMultiAppEdgeUI();
}

function updateMultiAppEdgeUI() {
    const edgeConfig = document.getElementById('multiAppEdgeConfig');
    const win32ArgsConfig = document.getElementById('win32ArgsConfig');

    // Show Edge config only if an Edge app is selected for auto-launch
    // Show Win32 args config if a non-Edge Win32 app is selected for auto-launch
    let showEdgeConfig = false;
    let showWin32Args = false;

    if (state.autoLaunchApp !== null && state.allowedApps[state.autoLaunchApp]) {
        const app = state.allowedApps[state.autoLaunchApp];
        if (isEdgeApp(app.value)) {
            showEdgeConfig = true;
        } else if (app.type === 'path') {
            // Win32 app (not Edge)
            showWin32Args = true;
        }
    }

    edgeConfig.classList.toggle('hidden', !showEdgeConfig);
    edgeConfig.setAttribute('aria-hidden', !showEdgeConfig);

    win32ArgsConfig.classList.toggle('hidden', !showWin32Args);
    win32ArgsConfig.setAttribute('aria-hidden', !showWin32Args);
}

function updateMultiEdgeSourceUI() {
    const sourceType = document.getElementById('multiEdgeSourceType').value;
    const urlGroup = document.getElementById('multiEdgeUrlGroup');
    const fileGroup = document.getElementById('multiEdgeFileGroup');

    urlGroup.classList.toggle('hidden', sourceType !== 'url');
    fileGroup.classList.toggle('hidden', sourceType !== 'file');

    urlGroup.setAttribute('aria-hidden', sourceType !== 'url');
    fileGroup.setAttribute('aria-hidden', sourceType !== 'file');
}

/* ============================================================================
   App List Management (Multi-App Mode)
   ============================================================================ */
function addApp() {
    const type = document.getElementById('addAppType').value;
    const value = document.getElementById('addAppValue').value.trim();

    if (!value) return;

    state.allowedApps.push({ type, value });
    document.getElementById('addAppValue').value = '';
    renderAppList();
    updateAutoLaunchSelector();
    updatePreview();
}

function addCommonApp(appKey) {
    if (!appPresets) {
        console.error('App presets not loaded');
        return;
    }

    const apps = appPresets.apps;
    const groups = appPresets.groups;

    // Check if this key has a group (multiple apps to add)
    if (groups[appKey]) {
        groups[appKey].forEach(key => {
            const app = apps[key];
            if (app && !state.allowedApps.find(a => a.value === app.value)) {
                state.allowedApps.push({ ...app });
            }
        });
    } else {
        // Single app
        const app = apps[appKey];
        if (app && !state.allowedApps.find(a => a.value === app.value)) {
            state.allowedApps.push({ ...app });
        }
    }

    renderAppList();
    updateAutoLaunchSelector();
    updatePreview();
}

function removeApp(index) {
    // If we're removing the auto-launch app, reset the selection
    if (state.autoLaunchApp === index) {
        state.autoLaunchApp = null;
    } else if (state.autoLaunchApp !== null && state.autoLaunchApp > index) {
        // Adjust index if we removed an app before the auto-launch app
        state.autoLaunchApp--;
    }

    state.allowedApps.splice(index, 1);
    renderAppList();
    updateAutoLaunchSelector();
    updatePreview();
}

function renderAppList() {
    const list = document.getElementById('appList');
    const count = document.getElementById('appCount');

    count.textContent = state.allowedApps.length;

    if (state.allowedApps.length === 0) {
        list.innerHTML = '<div class="empty-list" role="status">No apps added yet</div>';
        return;
    }

    list.innerHTML = state.allowedApps.map((app, i) => `
        <div class="app-item" role="listitem">
            <span title="${escapeXml(app.value)}"><span aria-hidden="true">${app.type === 'aumid' ? '📦 ' : '📄 '}</span>${escapeXml(truncate(app.value, 60))}</span>
            <button type="button" class="remove-btn" onclick="removeApp(${i})" aria-label="Remove ${escapeXml(truncate(app.value, 30))}">
                <span aria-hidden="true">✕</span>
            </button>
        </div>
    `).join('');
}

/* ============================================================================
   Start Pins Management (Multi-App Mode)
   ============================================================================ */
function addPin() {
    const name = document.getElementById('pinName').value.trim();
    const target = document.getElementById('pinTarget').value.trim();
    const args = document.getElementById('pinArgs').value.trim();
    const workingDir = document.getElementById('pinWorkingDir').value.trim();
    const iconPath = document.getElementById('pinIconPath').value.trim();

    if (!name || !target) {
        alert('Shortcut Name and Target Path are required.');
        return;
    }

    // Check if a pin with the same name already exists
    if (state.startPins.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert('A shortcut with this name already exists.');
        return;
    }

    state.startPins.push({
        name: name,
        pinType: 'desktopAppLink',  // Manual entries default to desktopAppLink
        target: target,
        args: args,
        workingDir: workingDir,
        iconPath: iconPath
    });

    // Clear the form
    document.getElementById('pinName').value = '';
    document.getElementById('pinTarget').value = '';
    document.getElementById('pinArgs').value = '';
    document.getElementById('pinWorkingDir').value = '';
    document.getElementById('pinIconPath').value = '';

    renderPinList();
    updatePreview();
}

function addCommonPin(pinKey) {
    if (!pinPresets) {
        console.error('Pin presets not loaded');
        return;
    }

    const pin = pinPresets.pins[pinKey];
    if (pin && !state.startPins.find(p => p.name.toLowerCase() === pin.name.toLowerCase())) {
        state.startPins.push({ ...pin });

        // If the shortcut uses explorer.exe (for ms-settings: URLs), add it to allowed apps
        if (pin.target && pin.target.toLowerCase().includes('explorer.exe')) {
            const explorerPath = 'C:\\Windows\\explorer.exe';
            if (!state.allowedApps.find(a => a.value.toLowerCase() === explorerPath.toLowerCase())) {
                state.allowedApps.push({ type: 'path', value: explorerPath });
                renderAppList();
                updateAutoLaunchSelector();
            }
        }

        renderPinList();
        updatePreview();
    }
}

function removePin(index) {
    state.startPins.splice(index, 1);
    renderPinList();
    updatePreview();
}

function renderPinList() {
    const list = document.getElementById('pinList');
    const count = document.getElementById('pinCount');

    count.textContent = state.startPins.length;

    if (state.startPins.length === 0) {
        list.innerHTML = '<div class="empty-list" role="status">No pins added yet</div>';
        return;
    }

    list.innerHTML = state.startPins.map((pin, i) => {
        const isUwp = pin.pinType === 'packagedAppId';
        const displayTarget = isUwp
            ? pin.packagedAppId
            : (pin.target ? truncate(pin.target, 40) : '(no target - click to edit)');
        const hasArgs = pin.args ? ` (${truncate(pin.args, 20)})` : '';
        const missingTarget = !isUwp && !pin.target;
        const warningStyle = missingTarget ? 'color: var(--error-color, #e74c3c);' : 'color: var(--text-secondary);';
        const typeLabel = isUwp ? '<span style="background: var(--accent); color: white; padding: 1px 4px; border-radius: 3px; font-size: 0.65rem; margin-left: 6px;">UWP</span>' : '';
        return `
        <div class="app-item" role="listitem" style="${missingTarget ? 'border-left: 3px solid var(--error-color, #e74c3c);' : ''}">
            <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                <span style="font-weight: 500;">${escapeXml(pin.name)}${typeLabel}${missingTarget ? ' <span style="color: var(--error-color, #e74c3c);" title="Target path required">⚠</span>' : ''}</span>
                <span style="font-size: 0.75rem; ${warningStyle} overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeXml(displayTarget)}${escapeXml(hasArgs)}">${escapeXml(displayTarget)}${escapeXml(hasArgs)}</span>
            </div>
            <button type="button" class="remove-btn" onclick="removePin(${i})" aria-label="Remove ${escapeXml(pin.name)}">
                <span aria-hidden="true">✕</span>
            </button>
        </div>
    `}).join('');
}

/* ============================================================================
   XML Generation
   ============================================================================ */
function generateXml() {
    const profileId = document.getElementById('profileId').value || '{00000000-0000-0000-0000-000000000000}';

    let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
    xml += `<AssignedAccessConfiguration\n`;
    xml += `    xmlns="http://schemas.microsoft.com/AssignedAccess/2017/config"\n`;
    xml += `    xmlns:rs5="http://schemas.microsoft.com/AssignedAccess/201901/config"\n`;
    xml += `    xmlns:v3="http://schemas.microsoft.com/AssignedAccess/2020/config"\n`;
    xml += `    xmlns:v4="http://schemas.microsoft.com/AssignedAccess/2021/config"\n`;
    xml += `    xmlns:v5="http://schemas.microsoft.com/AssignedAccess/2022/config">\n`;

    xml += `    <Profiles>\n`;
    xml += `        <Profile Id="${profileId}">\n`;

    if (state.mode === 'single') {
        xml += generateSingleAppProfile();
    } else {
        xml += generateMultiAppProfile();
    }

    xml += `        </Profile>\n`;
    xml += `    </Profiles>\n`;

    xml += `    <Configs>\n`;
    xml += `        <Config>\n`;
    xml += generateAccountConfig();
    xml += `            <DefaultProfile Id="${profileId}"/>\n`;
    xml += `        </Config>\n`;
    xml += `    </Configs>\n`;

    xml += `</AssignedAccessConfiguration>`;

    return xml;
}

function generateSingleAppProfile() {
    const appType = document.getElementById('appType').value;
    let xml = '';

    if (appType === 'edge') {
        const url = getEdgeUrl();
        const kioskType = document.getElementById('edgeKioskType').value;
        const inPrivate = document.getElementById('edgeInPrivate').checked;
        const idleTimeout = parseInt(document.getElementById('edgeIdleTimeout').value) || 0;

        let args = `--kiosk ${url} --edge-kiosk-type=${kioskType}`;
        if (inPrivate) args += ' --inprivate';
        if (idleTimeout > 0) args += ` --kiosk-idle-timeout-minutes=${idleTimeout}`;

        // Edge Chromium is a Win32 app - use ClassicAppPath, not AppUserModelId
        xml += `            <KioskModeApp v4:ClassicAppPath="%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" v4:ClassicAppArguments="${escapeXml(args)}"/>\n`;
    } else if (appType === 'uwp') {
        const aumid = document.getElementById('uwpAumid').value;
        xml += `            <KioskModeApp AppUserModelId="${escapeXml(aumid)}"/>\n`;
    } else if (appType === 'win32') {
        const path = document.getElementById('win32Path').value;
        const args = document.getElementById('win32Args').value;

        if (args) {
            xml += `            <KioskModeApp v4:ClassicAppPath="${escapeXml(path)}" v4:ClassicAppArguments="${escapeXml(args)}"/>\n`;
        } else {
            xml += `            <KioskModeApp v4:ClassicAppPath="${escapeXml(path)}"/>\n`;
        }
    }

    // Add breakout sequence if enabled
    const breakoutSequence = getBreakoutSequence();
    if (breakoutSequence) {
        xml += `            <v4:BreakoutSequence Key="${escapeXml(breakoutSequence)}"/>\n`;
    }

    return xml;
}

function generateMultiAppProfile() {
    let xml = '';

    // AllAppsList
    xml += `            <AllAppsList>\n`;
    xml += `                <AllowedApps>\n`;

    state.allowedApps.forEach((app, index) => {
        const isAutoLaunch = state.autoLaunchApp === index;
        const isEdge = isEdgeApp(app.value);

        // Build base attribute
        let attrs = app.type === 'aumid'
            ? `AppUserModelId="${escapeXml(app.value)}"`
            : `DesktopAppPath="${escapeXml(app.value)}"`;

        // Add AutoLaunch attributes if this is the auto-launch app
        if (isAutoLaunch) {
            attrs += ` rs5:AutoLaunch="true"`;

            // If Edge is auto-launched, add kiosk arguments
            if (isEdge) {
                const url = getMultiAppEdgeUrl();
                const kioskType = document.getElementById('multiEdgeKioskType').value;
                const inPrivate = document.getElementById('multiEdgeInPrivate').checked;

                let args = `--kiosk ${url} --edge-kiosk-type=${kioskType}`;
                if (inPrivate) args += ' --inprivate';

                attrs += ` rs5:AutoLaunchArguments="${escapeXml(args)}"`;
            } else if (app.type === 'path') {
                // Non-Edge Win32 app - add arguments if specified
                const win32Args = document.getElementById('win32AutoLaunchArgs').value.trim();
                if (win32Args) {
                    attrs += ` rs5:AutoLaunchArguments="${escapeXml(win32Args)}"`;
                }
            }
        }

        xml += `                    <App ${attrs}/>\n`;
    });

    xml += `                </AllowedApps>\n`;
    xml += `            </AllAppsList>\n`;

    // File Explorer Restrictions
    const fileAccess = document.getElementById('fileExplorerAccess').value;
    if (fileAccess === 'downloads') {
        xml += `            <rs5:FileExplorerNamespaceRestrictions>\n`;
        xml += `                <rs5:AllowedNamespace Name="Downloads"/>\n`;
        xml += `            </rs5:FileExplorerNamespaceRestrictions>\n`;
    } else if (fileAccess === 'removable') {
        xml += `            <rs5:FileExplorerNamespaceRestrictions>\n`;
        xml += `                <v3:AllowRemovableDrives/>\n`;
        xml += `            </rs5:FileExplorerNamespaceRestrictions>\n`;
    } else if (fileAccess === 'downloads-removable') {
        xml += `            <rs5:FileExplorerNamespaceRestrictions>\n`;
        xml += `                <rs5:AllowedNamespace Name="Downloads"/>\n`;
        xml += `                <v3:AllowRemovableDrives/>\n`;
        xml += `            </rs5:FileExplorerNamespaceRestrictions>\n`;
    } else if (fileAccess === 'all') {
        xml += `            <rs5:FileExplorerNamespaceRestrictions>\n`;
        xml += `                <v3:NoRestriction/>\n`;
        xml += `            </rs5:FileExplorerNamespaceRestrictions>\n`;
    }

    // Start Pins (Windows 11)
    // Supports three pin types: packagedAppId (UWP), desktopAppLink (.lnk), secondaryTile (Edge URLs)
    if (state.startPins.length > 0) {
        const pinsJson = {
            pinnedList: state.startPins.map(p => {
                // UWP/Store apps use packagedAppId
                if (p.pinType === 'packagedAppId' && p.packagedAppId) {
                    return { packagedAppId: p.packagedAppId };
                }
                // Edge with specific URL uses secondaryTile
                if (p.pinType === 'secondaryTile' && p.packagedAppId) {
                    return {
                        secondaryTile: {
                            tileId: p.tileId || `MSEdge._pin_${p.name.replace(/[^a-zA-Z0-9]/g, '')}`,
                            arguments: p.args || '',
                            displayName: p.name,
                            packagedAppId: p.packagedAppId
                        }
                    };
                }
                // Win32 apps use desktopAppLink (.lnk shortcut)
                // Use system shortcut if available, otherwise custom shortcut path
                return {
                    desktopAppLink: p.systemShortcut || `C:\\ProgramData\\KioskShortcuts\\${p.name}.lnk`
                };
            })
        };
        xml += `            <v5:StartPins><![CDATA[${JSON.stringify(pinsJson)}]]></v5:StartPins>\n`;
    }

    // Taskbar
    const showTaskbar = document.getElementById('showTaskbar').checked;
    xml += `            <Taskbar ShowTaskbar="${showTaskbar}"/>\n`;

    return xml;
}

function generateAccountConfig() {
    let xml = '';

    if (state.accountType === 'auto') {
        const displayName = document.getElementById('displayName').value || 'Kiosk';
        xml += `            <AutoLogonAccount rs5:DisplayName="${escapeXml(displayName)}"/>\n`;
    } else {
        const accountName = document.getElementById('accountName').value;
        xml += `            <Account>${escapeXml(accountName)}</Account>\n`;
    }

    return xml;
}

/* ============================================================================
   Validation
   ============================================================================ */
function validate() {
    const errors = [];

    // Profile ID
    const profileId = document.getElementById('profileId').value;
    if (!profileId) {
        errors.push('Profile GUID is required');
    } else if (!/^\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$/i.test(profileId)) {
        errors.push('Profile GUID format is invalid');
    }

    // Account
    if (state.accountType === 'auto') {
        const displayName = document.getElementById('displayName').value;
        if (!displayName) {
            errors.push('Display Name is required for auto-logon account');
        }
    } else {
        const accountName = document.getElementById('accountName').value;
        if (!accountName) {
            errors.push('Account Name is required');
        }
    }

    // Single-app mode
    if (state.mode === 'single') {
        const appType = document.getElementById('appType').value;
        if (appType === 'edge') {
            const sourceType = document.getElementById('edgeSourceType').value;
            if (sourceType === 'url') {
                const url = document.getElementById('edgeUrl').value;
                if (!url) {
                    errors.push('Edge URL is required');
                }
            } else {
                const filePath = document.getElementById('edgeFilePath').value;
                if (!filePath) {
                    errors.push('Edge file path is required');
                }
            }
        } else if (appType === 'uwp') {
            const aumid = document.getElementById('uwpAumid').value;
            if (!aumid) {
                errors.push('UWP App AUMID is required');
            }
        } else if (appType === 'win32') {
            const path = document.getElementById('win32Path').value;
            if (!path) {
                errors.push('Win32 Application Path is required');
            }
        }
    }

    // Multi-app mode
    if (state.mode === 'multi') {
        if (state.allowedApps.length === 0) {
            errors.push('At least one allowed app is required for multi-app mode');
        }

        // Check for shortcuts missing target paths (UWP pins don't need targets)
        const missingTargets = state.startPins.filter(p => p.pinType !== 'packagedAppId' && !p.target && !p.systemShortcut);
        if (missingTargets.length > 0) {
            errors.push(`${missingTargets.length} shortcut(s) missing target path: ${missingTargets.map(p => p.name).join(', ')}`);
        }
    }

    return errors;
}

function showValidation() {
    const errors = validate();
    const statusDiv = document.getElementById('validationStatus');

    if (errors.length === 0) {
        statusDiv.innerHTML = '<div class="status success">✓ Configuration is valid</div>';
    } else {
        statusDiv.innerHTML = `<div class="status error">
            <strong>Validation Errors:</strong>
            <ul style="margin: 5px 0 0 20px;">${errors.map(e => `<li>${e}</li>`).join('')}</ul>
        </div>`;
    }

    return errors.length === 0;
}

/* ============================================================================
   Preview & Syntax Highlighting
   ============================================================================ */
function updatePreview() {
    const xml = generateXml();
    const highlighted = highlightXml(xml);
    document.getElementById('xmlPreview').innerHTML = highlighted;
    showValidation();
}

function highlightXml(xml) {
    return xml
        // Escape HTML entities
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // XML declaration <?xml ... ?>
        .replace(/(&lt;\?xml[\s\S]*?\?&gt;)/g, '<span class="declaration">$1</span>')
        // Comments <!-- ... -->
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="comment">$1</span>')
        // CDATA sections <![CDATA[ ... ]]>
        .replace(/(&lt;!\[CDATA\[)([\s\S]*?)(\]\]&gt;)/g, '<span class="cdata">$1</span><span class="cdata-content">$2</span><span class="cdata">$3</span>')
        // Opening and closing tags with namespace support
        .replace(/(&lt;\/?)([\w][\w:-]*)/g, '$1<span class="tag">$2</span>')
        // Attribute names (word characters and colons for namespaced attrs)
        .replace(/([\w:-]+)=/g, '<span class="attr">$1</span>=')
        // Attribute values in double quotes
        .replace(/"([^"]*)"/g, '"<span class="value">$1</span>"');
}

/* ============================================================================
   Export Functions
   ============================================================================ */
function copyXml() {
    if (!showValidation()) {
        if (!confirm('Configuration has errors. Copy anyway?')) return;
    }

    const xml = generateXml();
    copyToClipboard(xml);
    alert('XML copied to clipboard!');
}

function downloadXml() {
    if (!showValidation()) {
        if (!confirm('Configuration has errors. Download anyway?')) return;
    }

    const xml = generateXml();
    downloadFile(xml, 'AssignedAccessConfig.xml', 'application/xml');
}

function downloadPowerShell() {
    if (!showValidation()) {
        if (!confirm('Configuration has errors. Download anyway?')) return;
    }

    const xml = generateXml();

    // Generate shortcuts JSON for PowerShell
    // Exclude: UWP apps (packagedAppId - no .lnk needed), system shortcuts (already exist)
    const shortcutsJson = JSON.stringify(state.startPins
        .filter(p => p.pinType !== 'packagedAppId' && !p.systemShortcut)
        .map(p => ({
            Name: p.name || '',
            TargetPath: p.target || '',
            Arguments: p.args || '',
            WorkingDirectory: p.workingDir || '',
            IconLocation: p.iconPath || ''
        })), null, 4);

    const ps1 = `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Applies AssignedAccess (Kiosk) configuration to the local device.
.DESCRIPTION
    This script must be run as SYSTEM. Use PsExec:
    psexec.exe -i -s powershell.exe -ExecutionPolicy Bypass -File "Apply-AssignedAccess.ps1"
.NOTES
    Generated by AssignedAccess XML Builder
    Reboot required after applying.
    Creates a JSON log file in the current directory.
#>

$ErrorActionPreference = "Stop"

# Initialize logging
$logFile = Join-Path $PSScriptRoot "AssignedAccess-Deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$log = @{
    startTime = (Get-Date).ToString("o")
    computerName = $env:COMPUTERNAME
    userName = $env:USERNAME
    windowsVersion = [System.Environment]::OSVersion.Version.ToString()
    windowsBuild = (Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion").DisplayVersion
    windowsEdition = $null
    executionContext = $null
    preFlightPassed = $false
    steps = @()
    success = $false
    xmlLength = $null
    endTime = $null
}

function Write-Log {
    param([string]$Action, [string]$Status, [string]$Message = "")
    $entry = @{
        timestamp = (Get-Date).ToString("o")
        action = $Action
        status = $Status
        message = $Message
    }
    $log.steps += $entry

    $color = switch ($Status) {
        "Success" { "Green" }
        "Warning" { "Yellow" }
        "Error" { "Red" }
        default { "Cyan" }
    }
    Write-Host "[$Status] $Action" -ForegroundColor $color
    if ($Message) { Write-Host "    $Message" -ForegroundColor Gray }
}

function Save-Log {
    $log.endTime = (Get-Date).ToString("o")
    $log | ConvertTo-Json -Depth 10 | Out-File -FilePath $logFile -Encoding UTF8
    Write-Host ""
    Write-Host "Log saved to: $logFile" -ForegroundColor Gray
}

# Start Menu Shortcuts to create (JSON parsed at runtime)
$shortcutsJson = @'
${shortcutsJson}
'@
$shortcuts = @()
if ($shortcutsJson.Trim() -ne '[]' -and $shortcutsJson.Trim() -ne '') {
    try {
        $parsed = $shortcutsJson | ConvertFrom-Json
        # Ensure it's always an array (single object needs wrapping)
        if ($null -ne $parsed) {
            if ($parsed -is [System.Array]) {
                $shortcuts = $parsed
            } else {
                $shortcuts = @($parsed)
            }
        }
    } catch {
        Write-Host "[WARN] Failed to parse shortcuts JSON: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Function to create shortcuts
function New-Shortcut {
    param(
        [string]$Name,
        [string]$TargetPath,
        [string]$Arguments,
        [string]$WorkingDirectory,
        [string]$IconLocation
    )

    $shortcutDir = "C:\\ProgramData\\KioskShortcuts"
    if (-not (Test-Path $shortcutDir)) {
        New-Item -ItemType Directory -Path $shortcutDir -Force | Out-Null
    }

    $shortcutPath = Join-Path $shortcutDir "$Name.lnk"

    # Expand environment variables in paths
    $expandedTarget = [Environment]::ExpandEnvironmentVariables($TargetPath)

    $WshShell = New-Object -ComObject WScript.Shell
    $shortcut = $WshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $expandedTarget

    if ($Arguments) {
        $shortcut.Arguments = $Arguments
    }
    if ($WorkingDirectory) {
        $shortcut.WorkingDirectory = $WorkingDirectory
    }
    if ($IconLocation) {
        $shortcut.IconLocation = $IconLocation
    }

    $shortcut.Save()

    return $shortcutPath
}

# AssignedAccess Configuration XML
$xml = @'
${xml}
'@

Write-Host ""
Write-Host "AssignedAccess Deploy Script" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Pre-flight checks
Write-Host "Running pre-flight checks..." -ForegroundColor Cyan
Write-Host ""

# Check 1: Windows Edition
$edition = (Get-WindowsEdition -Online).Edition
$log.windowsEdition = $edition
$supportedEditions = @("Pro", "Enterprise", "Education", "IoTEnterprise", "IoTEnterpriseS", "ServerRdsh")
$isSupported = $supportedEditions | Where-Object { $edition -like "*$_*" }
if (-not $isSupported) {
    Write-Log -Action "Windows Edition Check" -Status "Error" -Message "Unsupported edition: $edition"
    Save-Log
    Write-Host "[FAILED] Windows Edition Check" -ForegroundColor Red
    Write-Host "    Current edition: $edition" -ForegroundColor Gray
    Write-Host "    AssignedAccess requires Enterprise, Education, or IoT Enterprise edition." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Log -Action "Windows Edition Check" -Status "Success" -Message $edition
Write-Host "[OK] Windows Edition: $edition" -ForegroundColor Green

# Check 2: Running as SYSTEM (use SID check for localization support)
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$log.executionContext = $currentUser.Name
$isSystem = $currentUser.User.Value -eq "S-1-5-18"
if (-not $isSystem) {
    Write-Log -Action "SYSTEM Context Check" -Status "Error" -Message "Running as: $($currentUser.Name)"
    Save-Log
    Write-Host "[FAILED] SYSTEM Context Check" -ForegroundColor Red
    Write-Host "    Current user: $($currentUser.Name)" -ForegroundColor Gray
    Write-Host "    This script must run as SYSTEM. Use:" -ForegroundColor Yellow
    Write-Host "    psexec.exe -i -s powershell.exe -ExecutionPolicy Bypass -File \`"$PSCommandPath\`"" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Log -Action "SYSTEM Context Check" -Status "Success"
Write-Host "[OK] Running as SYSTEM" -ForegroundColor Green

# Check 3: MDM_AssignedAccess WMI instance exists
$obj = Get-CimInstance -Namespace "root\\cimv2\\mdm\\dmmap" -ClassName "MDM_AssignedAccess" -ErrorAction SilentlyContinue
if ($null -eq $obj) {
    Write-Log -Action "MDM_AssignedAccess WMI Check" -Status "Error" -Message "WMI instance not found"
    Save-Log
    Write-Host "[FAILED] MDM_AssignedAccess WMI Check" -ForegroundColor Red
    Write-Host "    The MDM_AssignedAccess WMI class is not available on this system." -ForegroundColor Gray
    Write-Host "    This may indicate an unsupported Windows configuration or WMI corruption." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Log -Action "MDM_AssignedAccess WMI Check" -Status "Success"
Write-Host "[OK] MDM_AssignedAccess WMI instance found" -ForegroundColor Green

$log.preFlightPassed = $true
Write-Host ""
Write-Host "All pre-flight checks passed. Proceeding with deployment..." -ForegroundColor Green
Write-Host ""

try {
    Write-Log -Action "Starting deployment" -Status "Info" -Message "Target: $env:COMPUTERNAME"

    # Create Start Menu shortcuts
    if ($shortcuts.Count -gt 0) {
        Write-Log -Action "Creating Start Menu shortcuts" -Status "Info" -Message "$($shortcuts.Count) shortcut(s) to create"
        Write-Host ""
        foreach ($sc in $shortcuts) {
            # Skip shortcuts with empty name or target
            if ([string]::IsNullOrWhiteSpace($sc.Name) -or [string]::IsNullOrWhiteSpace($sc.TargetPath)) {
                Write-Log -Action "Skipped shortcut" -Status "Warning" -Message "Missing name or target path"
                Write-Host "[WARN] Skipped shortcut with missing name or target" -ForegroundColor Yellow
                continue
            }
            try {
                $path = New-Shortcut -Name $sc.Name -TargetPath $sc.TargetPath -Arguments $sc.Arguments -WorkingDirectory $sc.WorkingDirectory -IconLocation $sc.IconLocation
                Write-Log -Action "Created shortcut" -Status "Success" -Message $path
                Write-Host "[OK] Created: $($sc.Name)" -ForegroundColor Green
            }
            catch {
                Write-Log -Action "Failed to create shortcut" -Status "Warning" -Message "$($sc.Name): $($_.Exception.Message)"
                Write-Host "[WARN] Failed to create: $($sc.Name) - $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
        Write-Host ""
    }

    # HTML encode the XML and apply
    Write-Log -Action "Encoding XML configuration" -Status "Info"
    $log.xmlLength = $xml.Length
    $encodedXml = [System.Net.WebUtility]::HtmlEncode($xml)
    Write-Log -Action "XML encoded" -Status "Success" -Message "Original: $($xml.Length) chars, Encoded: $($encodedXml.Length) chars"

    Write-Log -Action "Applying configuration" -Status "Info"
    $obj.Configuration = $encodedXml
    Set-CimInstance -CimInstance $obj -ErrorAction Stop
    Write-Log -Action "Configuration applied" -Status "Success"

    $log.success = $true
    Save-Log

    Write-Host ""
    Write-Host "SUCCESS: AssignedAccess configuration applied!" -ForegroundColor Green
    Write-Host ""
    Write-Host "A REBOOT IS REQUIRED for changes to take effect." -ForegroundColor Yellow
    Write-Host ""

    $reboot = Read-Host "Reboot now? (Y/N)"
    if ($reboot -eq 'Y' -or $reboot -eq 'y') {
        Write-Log -Action "User initiated reboot" -Status "Info"
        Save-Log
        Restart-Computer -Force
    }
}
catch {
    Write-Log -Action "Deployment failed" -Status "Error" -Message $_.Exception.Message
    Save-Log

    Write-Host ""
    Write-Host "ERROR: Failed to apply configuration" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the log file for details. Common causes:" -ForegroundColor Yellow
    Write-Host "  - Invalid XML configuration" -ForegroundColor Yellow
    Write-Host "  - Referenced user account does not exist" -ForegroundColor Yellow
    Write-Host "  - Referenced app is not installed" -ForegroundColor Yellow
    exit 1
}
`;

    downloadFile(ps1, 'Apply-AssignedAccess.ps1', 'text/plain');

    // Also download the README summary
    const readme = generateReadme();
    setTimeout(() => {
        downloadFile(readme, 'README.md', 'text/markdown');
    }, 100);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    });
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function generateReadme() {
    const profileId = document.getElementById('profileId').value || '(not set)';
    const now = new Date().toLocaleString();

    let readme = `# Kiosk Configuration Summary\n\nGenerated: ${now}\n\n`;

    // Kiosk Mode
    readme += `## Kiosk Mode\n\n`;
    readme += `**Type:** ${state.mode === 'single' ? 'Single-App' : 'Multi-App'}\n\n`;

    // Account
    readme += `## Account\n\n`;
    if (state.accountType === 'auto') {
        const displayName = document.getElementById('displayName').value || 'Kiosk User';
        readme += `**Type:** Auto Logon (Managed)\n`;
        readme += `**Display Name:** ${displayName}\n\n`;
    } else {
        const accountName = document.getElementById('accountName').value || '(not set)';
        readme += `**Type:** Existing Account\n`;
        readme += `**Account:** ${accountName}\n\n`;
    }

    if (state.mode === 'single') {
        // Single-App details
        readme += `## Application\n\n`;
        const appType = document.getElementById('appType').value;

        if (appType === 'edge') {
            const sourceType = document.getElementById('edgeSourceType').value;
            const url = sourceType === 'url'
                ? document.getElementById('edgeUrl').value
                : document.getElementById('edgeFilePath').value;
            const kioskType = document.getElementById('edgeKioskType').value;
            const inPrivate = document.getElementById('edgeInPrivate').checked;

            readme += `**App:** Microsoft Edge (Kiosk Mode)\n`;
            readme += `**URL:** ${url || '(not set)'}\n`;
            readme += `**Kiosk Type:** ${kioskType === 'fullscreen' ? 'Fullscreen (Digital Signage)' : 'Public Browsing'}\n`;
            readme += `**InPrivate Mode:** ${inPrivate ? 'Yes' : 'No'}\n\n`;
        } else if (appType === 'uwp') {
            const aumid = document.getElementById('uwpAumid').value;
            readme += `**App:** UWP/Store App\n`;
            readme += `**AUMID:** ${aumid || '(not set)'}\n\n`;
        } else {
            const path = document.getElementById('win32Path').value;
            const args = document.getElementById('win32Args').value;
            readme += `**App:** Win32 Desktop App\n`;
            readme += `**Path:** ${path || '(not set)'}\n`;
            if (args) readme += `**Arguments:** ${args}\n`;
            readme += `\n`;
        }

        // Breakout sequence
        const breakoutEnabled = document.getElementById('enableBreakout').checked;
        if (breakoutEnabled) {
            const breakoutPreview = document.getElementById('breakoutPreview').textContent;
            readme += `## Breakout Sequence\n\n`;
            readme += `**Enabled:** Yes\n`;
            readme += `**Key Combination:** ${breakoutPreview}\n\n`;
        }
    } else {
        // Multi-App details
        readme += `## Whitelisted Applications\n\n`;
        if (state.allowedApps.length === 0) {
            readme += `(No applications added)\n\n`;
        } else {
            state.allowedApps.forEach((app, i) => {
                const isAutoLaunch = state.autoLaunchApp === i;
                readme += `${i + 1}. ${app.value}${isAutoLaunch ? ' **(Auto-Launch)**' : ''}\n`;
            });
            readme += `\n`;
        }

        // Auto-launch Edge config
        if (state.autoLaunchApp !== null) {
            const autoApp = state.allowedApps[state.autoLaunchApp];
            if (autoApp && autoApp.value.toLowerCase().includes('msedge')) {
                readme += `## Edge Auto-Launch Settings\n\n`;
                const sourceType = document.getElementById('multiEdgeSourceType').value;
                const url = sourceType === 'url'
                    ? document.getElementById('multiEdgeUrl').value
                    : document.getElementById('multiEdgeFilePath').value;
                const kioskType = document.getElementById('multiEdgeKioskType').value;
                const inPrivate = document.getElementById('multiEdgeInPrivate').checked;

                readme += `**URL:** ${url || '(not set)'}\n`;
                readme += `**Kiosk Type:** ${kioskType === 'fullscreen' ? 'Fullscreen' : 'Public Browsing'}\n`;
                readme += `**InPrivate Mode:** ${inPrivate ? 'Yes' : 'No'}\n\n`;
            }
        }

        // Start menu pins
        readme += `## Start Menu Pins\n\n`;
        if (state.startPins.length === 0) {
            readme += `(No pins configured)\n\n`;
        } else {
            state.startPins.forEach((pin, i) => {
                readme += `${i + 1}. **${pin.name || '(unnamed)'}**\n`;
                readme += `   - Target: ${pin.target || '(not set)'}\n`;
                if (pin.args) readme += `   - Arguments: ${pin.args}\n`;
                if (pin.systemShortcut) readme += `   - Uses system shortcut\n`;
            });
            readme += `\n`;
        }

        // System restrictions
        readme += `## System Restrictions\n\n`;
        const showTaskbar = document.getElementById('showTaskbar').checked;
        const fileExplorer = document.getElementById('fileExplorerAccess').value;

        readme += `**Taskbar:** ${showTaskbar ? 'Visible' : 'Hidden'}\n`;
        readme += `**File Explorer Access:** `;
        switch (fileExplorer) {
            case 'none': readme += `Disabled\n`; break;
            case 'downloads': readme += `Downloads folder only\n`; break;
            case 'removable': readme += `Downloads + Removable drives\n`; break;
            case 'full': readme += `Full access\n`; break;
            default: readme += `${fileExplorer}\n`;
        }
        readme += `\n`;
    }

    // Profile ID
    readme += `## Profile\n\n`;
    readme += `**Profile GUID:** ${profileId}\n\n`;

    // Deployment note
    readme += `---\n\n`;
    readme += `## Deployment\n\n`;
    readme += `Run the PowerShell script as SYSTEM:\n`;
    readme += `\`\`\`\npsexec.exe -i -s powershell.exe -ExecutionPolicy Bypass -File "Apply-AssignedAccess.ps1"\n\`\`\`\n\n`;
    readme += `A reboot is required after applying the configuration.\n`;

    return readme;
}

/* ============================================================================
   Import XML
   ============================================================================ */
function importXml() {
    document.getElementById('importInput').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            parseAndLoadXml(e.target.result);
            alert('XML imported successfully!');
        } catch (err) {
            alert('Failed to parse XML: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function parseAndLoadXml(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    // Profile ID
    const profile = doc.querySelector('Profile');
    if (profile) {
        document.getElementById('profileId').value = profile.getAttribute('Id') || '';
    }

    // Check for KioskModeApp (single-app) or AllAppsList (multi-app)
    const kioskModeApp = doc.querySelector('KioskModeApp');
    const allAppsList = doc.querySelector('AllAppsList');

    if (kioskModeApp && !allAppsList) {
        // Single-app mode
        setMode('single');

        const aumid = kioskModeApp.getAttribute('AppUserModelId');
        const classicArgs = kioskModeApp.getAttributeNS('http://schemas.microsoft.com/AssignedAccess/2021/config', 'ClassicAppArguments') ||
                           kioskModeApp.getAttribute('v4:ClassicAppArguments');

        if (aumid === 'MSEdge' || (aumid && aumid.includes('Edge'))) {
            document.getElementById('appType').value = 'edge';
            updateAppTypeUI();

            if (classicArgs) {
                // Parse Edge arguments
                const urlMatch = classicArgs.match(/--kiosk\s+(\S+)/);
                if (urlMatch) {
                    const extractedUrl = urlMatch[1];
                    // Check if it's a file:// URL
                    if (extractedUrl.toLowerCase().startsWith('file:///')) {
                        document.getElementById('edgeSourceType').value = 'file';
                        // Decode the file path and remove file:/// prefix
                        let filePath = extractedUrl.substring(8); // Remove 'file:///'
                        filePath = decodeURIComponent(filePath);
                        document.getElementById('edgeFilePath').value = filePath;
                        document.getElementById('edgeUrl').value = '';
                    } else {
                        document.getElementById('edgeSourceType').value = 'url';
                        document.getElementById('edgeUrl').value = extractedUrl;
                        document.getElementById('edgeFilePath').value = '';
                    }
                    updateEdgeSourceUI();
                }

                document.getElementById('edgeKioskType').value =
                    classicArgs.includes('public-browsing') ? 'public-browsing' : 'fullscreen';

                document.getElementById('edgeInPrivate').checked = classicArgs.includes('--inprivate');
            }
        } else if (aumid) {
            document.getElementById('appType').value = 'uwp';
            updateAppTypeUI();
            document.getElementById('uwpAumid').value = aumid;
        } else {
            // Win32 app - check for ClassicAppPath
            const classicAppPath = kioskModeApp.getAttributeNS('http://schemas.microsoft.com/AssignedAccess/2021/config', 'ClassicAppPath') ||
                                  kioskModeApp.getAttribute('v4:ClassicAppPath');
            if (classicAppPath) {
                document.getElementById('appType').value = 'win32';
                updateAppTypeUI();
                document.getElementById('win32Path').value = classicAppPath;
                document.getElementById('win32Args').value = classicArgs || '';
            }
        }

        // Import BreakoutSequence if present (handle namespace prefix)
        const breakoutSequence = doc.querySelector('BreakoutSequence, [*|BreakoutSequence]') ||
                                Array.from(doc.querySelectorAll('*')).find(el => el.localName === 'BreakoutSequence');
        const breakoutKey = breakoutSequence ? breakoutSequence.getAttribute('Key') : null;
        if (breakoutKey) {
            document.getElementById('enableBreakout').checked = true;
            updateBreakoutUI();

            // Parse the key combination (e.g., "Ctrl+Alt+K")
            const parts = breakoutKey.split('+');
            const finalKey = parts[parts.length - 1].toUpperCase();

            document.getElementById('breakoutCtrl').checked = breakoutKey.toLowerCase().includes('ctrl');
            document.getElementById('breakoutAlt').checked = breakoutKey.toLowerCase().includes('alt');
            document.getElementById('breakoutShift').checked = breakoutKey.toLowerCase().includes('shift');

            // Set the final key if it's a valid option
            const finalKeySelect = document.getElementById('breakoutFinalKey');
            for (let option of finalKeySelect.options) {
                if (option.value === finalKey) {
                    finalKeySelect.value = finalKey;
                    break;
                }
            }
            updateBreakoutPreview();
        } else {
            document.getElementById('enableBreakout').checked = false;
            updateBreakoutUI();
        }
    } else if (allAppsList) {
        // Multi-app mode
        setMode('multi');

        state.allowedApps = [];
        state.autoLaunchApp = null;
        const apps = allAppsList.querySelectorAll('App');
        let appIndex = 0;
        apps.forEach(app => {
            const aumid = app.getAttribute('AppUserModelId');
            const path = app.getAttribute('DesktopAppPath');
            if (aumid) {
                state.allowedApps.push({ type: 'aumid', value: aumid });
            } else if (path) {
                state.allowedApps.push({ type: 'path', value: path });
            }

            // Check for AutoLaunch attribute (rs5 namespace)
            const autoLaunch = app.getAttributeNS('http://schemas.microsoft.com/AssignedAccess/201901/config', 'AutoLaunch') ||
                              app.getAttribute('rs5:AutoLaunch');
            if (autoLaunch === 'true') {
                state.autoLaunchApp = appIndex;

                // Parse AutoLaunchArguments
                const autoLaunchArgs = app.getAttributeNS('http://schemas.microsoft.com/AssignedAccess/201901/config', 'AutoLaunchArguments') ||
                                      app.getAttribute('rs5:AutoLaunchArguments');
                if (autoLaunchArgs) {
                    const currentAppPath = path || aumid;
                    const isEdge = isEdgeApp(currentAppPath);

                    if (isEdge) {
                        // Parse Edge arguments
                        const urlMatch = autoLaunchArgs.match(/--kiosk\s+(\S+)/);
                        if (urlMatch) {
                            const extractedUrl = urlMatch[1];
                            if (extractedUrl.toLowerCase().startsWith('file:///')) {
                                document.getElementById('multiEdgeSourceType').value = 'file';
                                let filePath = extractedUrl.substring(8);
                                filePath = decodeURIComponent(filePath);
                                document.getElementById('multiEdgeFilePath').value = filePath;
                                document.getElementById('multiEdgeUrl').value = '';
                            } else {
                                document.getElementById('multiEdgeSourceType').value = 'url';
                                document.getElementById('multiEdgeUrl').value = extractedUrl;
                                document.getElementById('multiEdgeFilePath').value = '';
                            }
                            updateMultiEdgeSourceUI();
                        }

                        document.getElementById('multiEdgeKioskType').value =
                            autoLaunchArgs.includes('public-browsing') ? 'public-browsing' : 'fullscreen';

                        document.getElementById('multiEdgeInPrivate').checked = autoLaunchArgs.includes('--inprivate');
                    } else if (path) {
                        // Non-Edge Win32 app - populate win32 args field
                        document.getElementById('win32AutoLaunchArgs').value = autoLaunchArgs;
                    }
                }
            }
            appIndex++;
        });
        renderAppList();
        updateAutoLaunchSelector();
        // Restore auto-launch selection after selector is populated
        if (state.autoLaunchApp !== null) {
            document.getElementById('autoLaunchApp').value = state.autoLaunchApp;
            updateMultiAppEdgeUI();
        }

        // Start Pins (handle namespace prefix v5:StartPins)
        // Note: Imported shortcuts will only have names extracted from paths
        // User will need to verify/update target paths if importing older configs
        state.startPins = [];
        const startPins = doc.querySelector('StartPins') ||
                         Array.from(doc.querySelectorAll('*')).find(el => el.localName === 'StartPins');
        if (startPins) {
            try {
                const pinsJson = JSON.parse(startPins.textContent);
                if (pinsJson.pinnedList) {
                    pinsJson.pinnedList.forEach(pin => {
                        if (pin.desktopAppLink) {
                            // Try to extract name from path (e.g., C:\ProgramData\KioskShortcuts\Name.lnk)
                            const path = pin.desktopAppLink;
                            let name = path;

                            // Extract filename without extension
                            const match = path.match(/([^\\\/]+)\.lnk$/i);
                            if (match) {
                                name = match[1];
                            }

                            // Create a basic shortcut object - user may need to update target
                            state.startPins.push({
                                name: name,
                                target: '', // Unknown from XML, user needs to set
                                args: '',
                                workingDir: '',
                                iconPath: ''
                            });
                        }
                    });
                }
                if (state.startPins.length > 0 && state.startPins.some(p => !p.target)) {
                    console.warn('Imported shortcuts need target paths configured');
                }
            } catch (e) {
                console.warn('Failed to parse StartPins JSON:', e.message);
            }
        }
        renderPinList();

        // Taskbar (handle namespace prefix v4:Taskbar)
        const taskbar = doc.querySelector('Taskbar') ||
                       Array.from(doc.querySelectorAll('*')).find(el => el.localName === 'Taskbar');
        if (taskbar) {
            document.getElementById('showTaskbar').checked =
                taskbar.getAttribute('ShowTaskbar') === 'true';
        }

        // File Explorer restrictions (handle namespace prefix rs5:FileExplorerNamespaceRestrictions)
        const fileExplorerRestrictions = doc.querySelector('FileExplorerNamespaceRestrictions') ||
                                        Array.from(doc.querySelectorAll('*')).find(el => el.localName === 'FileExplorerNamespaceRestrictions');
        if (fileExplorerRestrictions) {
            const downloads = fileExplorerRestrictions.querySelector('AllowedNamespace[Name="Downloads"]') ||
                             Array.from(fileExplorerRestrictions.querySelectorAll('*')).find(el => el.localName === 'AllowedNamespace' && el.getAttribute('Name') === 'Downloads');
            const removable = fileExplorerRestrictions.querySelector('AllowRemovableDrives') ||
                             Array.from(fileExplorerRestrictions.querySelectorAll('*')).find(el => el.localName === 'AllowRemovableDrives');
            const noRestriction = fileExplorerRestrictions.querySelector('NoRestriction') ||
                                 Array.from(fileExplorerRestrictions.querySelectorAll('*')).find(el => el.localName === 'NoRestriction');

            if (noRestriction) {
                document.getElementById('fileExplorerAccess').value = 'all';
            } else if (downloads && removable) {
                document.getElementById('fileExplorerAccess').value = 'downloads-removable';
            } else if (downloads) {
                document.getElementById('fileExplorerAccess').value = 'downloads';
            } else if (removable) {
                document.getElementById('fileExplorerAccess').value = 'removable';
            } else {
                document.getElementById('fileExplorerAccess').value = 'none';
            }
        } else {
            document.getElementById('fileExplorerAccess').value = 'none';
        }
    }

    // Account
    const autoLogon = doc.querySelector('AutoLogonAccount');
    const account = doc.querySelector('Config Account');

    if (autoLogon) {
        setAccountType('auto');
        const displayName = autoLogon.getAttributeNS('http://schemas.microsoft.com/AssignedAccess/201901/config', 'DisplayName') ||
                           autoLogon.getAttribute('rs5:DisplayName') ||
                           autoLogon.getAttribute('DisplayName');
        document.getElementById('displayName').value = displayName || '';
    } else if (account) {
        setAccountType('existing');
        document.getElementById('accountName').value = account.textContent || '';
    }

    updatePreview();
}

/* ============================================================================
   Presets
   ============================================================================ */
function loadPreset(preset) {
    // Reset state
    state.allowedApps = [];
    state.startPins = [];
    state.autoLaunchApp = null;

    // Reset multi-app Edge config
    document.getElementById('multiEdgeSourceType').value = 'url';
    document.getElementById('multiEdgeUrl').value = '';
    document.getElementById('multiEdgeFilePath').value = '';
    document.getElementById('multiEdgeKioskType').value = 'fullscreen';
    document.getElementById('multiEdgeInPrivate').checked = true;
    document.getElementById('win32AutoLaunchArgs').value = '';
    updateMultiEdgeSourceUI();

    switch (preset) {
        case 'blank':
            setMode('single');
            setAccountType('auto');
            generateGuid();
            document.getElementById('displayName').value = '';
            document.getElementById('appType').value = 'edge';
            document.getElementById('edgeSourceType').value = 'url';
            document.getElementById('edgeUrl').value = '';
            document.getElementById('edgeFilePath').value = '';
            document.getElementById('edgeKioskType').value = 'fullscreen';
            document.getElementById('edgeInPrivate').checked = true;
            updateAppTypeUI();
            updateEdgeSourceUI();
            break;

        case 'edgeFullscreen':
            setMode('single');
            setAccountType('auto');
            generateGuid();
            document.getElementById('displayName').value = 'Kiosk';
            document.getElementById('appType').value = 'edge';
            document.getElementById('edgeSourceType').value = 'url';
            document.getElementById('edgeUrl').value = 'https://www.microsoft.com';
            document.getElementById('edgeFilePath').value = '';
            document.getElementById('edgeKioskType').value = 'fullscreen';
            document.getElementById('edgeInPrivate').checked = true;
            updateAppTypeUI();
            updateEdgeSourceUI();
            break;

        case 'edgePublic':
            setMode('single');
            setAccountType('auto');
            generateGuid();
            document.getElementById('displayName').value = 'Public Browsing';
            document.getElementById('appType').value = 'edge';
            document.getElementById('edgeSourceType').value = 'url';
            document.getElementById('edgeUrl').value = 'https://www.bing.com';
            document.getElementById('edgeFilePath').value = '';
            document.getElementById('edgeKioskType').value = 'public-browsing';
            document.getElementById('edgeInPrivate').checked = true;
            updateAppTypeUI();
            updateEdgeSourceUI();
            break;

        case 'multiApp':
            setMode('multi');
            setAccountType('auto');
            generateGuid();
            document.getElementById('displayName').value = 'Multi-App Kiosk';
            addCommonApp('edge');
            addCommonApp('osk');
            addCommonApp('calculator');
            document.getElementById('showTaskbar').checked = true;
            document.getElementById('fileExplorerAccess').value = 'downloads';
            break;

    }

    updateAppTypeUI();
    renderAppList();
    renderPinList();
    updateAutoLaunchSelector();
    updatePreview();
}

/* ============================================================================
   Utility Functions
   ============================================================================ */
function escapeXml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function truncate(str, len) {
    if (str.length <= len) return str;
    return str.substring(0, len - 3) + '...';
}

/* ============================================================================
   Tooltip Positioning
   ============================================================================ */
function positionTooltip(tooltipIcon) {
    const tooltip = tooltipIcon.nextElementSibling;
    if (!tooltip || !tooltip.classList.contains('tooltip-content')) return;

    const iconRect = tooltipIcon.getBoundingClientRect();
    const tooltipWidth = 320; // matches CSS width
    const padding = 10;

    // Position below the icon
    let top = iconRect.bottom + 8;
    let left = iconRect.left + (iconRect.width / 2) - (tooltipWidth / 2);

    // Keep within viewport bounds
    if (left < padding) {
        left = padding;
    } else if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding;
    }

    // If tooltip would go below viewport, position above instead
    const tooltipHeight = tooltip.offsetHeight || 150;
    if (top + tooltipHeight > window.innerHeight - padding) {
        top = iconRect.top - tooltipHeight - 8;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
}

/* ============================================================================
   Initialize
   ============================================================================ */
document.addEventListener('DOMContentLoaded', async () => {
    // Load presets first
    await loadPresets();

    generateGuid();
    updateTabVisibility();
    updatePreview();

    // Add tooltip positioning on hover/focus
    document.querySelectorAll('.tooltip-icon').forEach(icon => {
        icon.addEventListener('mouseenter', () => positionTooltip(icon));
        icon.addEventListener('focus', () => positionTooltip(icon));
    });
});
