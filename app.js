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
    mode: 'single',           // 'single', 'multi', or 'restricted'
    accountType: 'auto',      // 'auto', 'existing', 'group', or 'global'
    allowedApps: [],          // For multi-app and restricted modes
    startPins: [],            // For multi-app and restricted modes: array of {name, target, args, workingDir, iconPath}
    autoLaunchApp: null,      // Index into allowedApps array, or null (for multi-app/restricted)
    multiAppEdgeConfig: {     // Edge kiosk config for multi-app/restricted mode
        url: '',
        sourceType: 'url',    // 'url' or 'file'
        kioskType: 'fullscreen'
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

function switchDeployTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.deploy-tab').forEach(btn => {
        const isActive = btn.id === `deploy-tab-${tabId}`;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive);
    });

    // Update content panels
    document.querySelectorAll('.deploy-content').forEach(panel => {
        const isActive = panel.id === `deploy-${tabId}`;
        panel.classList.toggle('active', isActive);
    });
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
    document.querySelectorAll('.tab-btn, .side-nav-btn').forEach(btn => {
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
    const isMultiOrRestricted = state.mode === 'multi' || state.mode === 'restricted';
    const startMenuTab = document.getElementById('tab-btn-startmenu');
    const systemTab = document.getElementById('tab-btn-system');

    // Show/hide tabs based on mode - both multi and restricted need these tabs
    startMenuTab.classList.toggle('hidden', !isMultiOrRestricted);
    systemTab.classList.toggle('hidden', !isMultiOrRestricted);

    // If switching to single mode and currently on a multi-only tab, switch to Application tab
    if (!isMultiOrRestricted) {
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
    const restrictedBtn = document.getElementById('modeRestricted');
    const singleConfig = document.getElementById('singleAppConfig');
    const multiConfig = document.getElementById('multiAppConfig');

    // Update mode buttons
    singleBtn.classList.toggle('active', mode === 'single');
    multiBtn.classList.toggle('active', mode === 'multi');
    restrictedBtn.classList.toggle('active', mode === 'restricted');
    singleBtn.setAttribute('aria-pressed', mode === 'single');
    multiBtn.setAttribute('aria-pressed', mode === 'multi');
    restrictedBtn.setAttribute('aria-pressed', mode === 'restricted');

    // Show/hide config panels - restricted uses same UI as multi-app
    singleConfig.classList.toggle('hidden', mode !== 'single');
    multiConfig.classList.toggle('hidden', mode === 'single');
    singleConfig.setAttribute('aria-hidden', mode !== 'single');
    multiConfig.setAttribute('aria-hidden', mode === 'single');

    // Update account type options based on mode
    updateAccountTypeOptions();

    // Update tab visibility based on mode
    updateTabVisibility();

    // Update auto-launch selector when switching to multi/restricted mode
    if (mode === 'multi' || mode === 'restricted') {
        updateAutoLaunchSelector();
    }

    updatePreview();
}

function updateAccountTypeOptions() {
    const groupBtn = document.getElementById('accountGroup');
    const globalBtn = document.getElementById('accountGlobal');
    const autoBtn = document.getElementById('accountAuto');

    if (state.mode === 'restricted') {
        // Show group and global options for restricted mode
        groupBtn.classList.remove('hidden');
        globalBtn.classList.remove('hidden');
    } else {
        // Hide group and global options for single/multi modes
        groupBtn.classList.add('hidden');
        globalBtn.classList.add('hidden');

        // If currently on group or global, switch back to auto
        if (state.accountType === 'group' || state.accountType === 'global') {
            setAccountType('auto');
        }
    }
}

function setAccountType(type) {
    state.accountType = type;

    const autoBtn = document.getElementById('accountAuto');
    const existingBtn = document.getElementById('accountExisting');
    const groupBtn = document.getElementById('accountGroup');
    const globalBtn = document.getElementById('accountGlobal');
    const autoConfig = document.getElementById('autoLogonConfig');
    const existingConfig = document.getElementById('existingAccountConfig');
    const groupConfig = document.getElementById('groupAccountConfig');
    const globalConfig = document.getElementById('globalProfileConfig');

    // Update button states
    autoBtn.classList.toggle('active', type === 'auto');
    existingBtn.classList.toggle('active', type === 'existing');
    groupBtn.classList.toggle('active', type === 'group');
    globalBtn.classList.toggle('active', type === 'global');
    autoBtn.setAttribute('aria-pressed', type === 'auto');
    existingBtn.setAttribute('aria-pressed', type === 'existing');
    groupBtn.setAttribute('aria-pressed', type === 'group');
    globalBtn.setAttribute('aria-pressed', type === 'global');

    // Show/hide config panels
    autoConfig.classList.toggle('hidden', type !== 'auto');
    existingConfig.classList.toggle('hidden', type !== 'existing');
    groupConfig.classList.toggle('hidden', type !== 'group');
    globalConfig.classList.toggle('hidden', type !== 'global');
    autoConfig.setAttribute('aria-hidden', type !== 'auto');
    existingConfig.setAttribute('aria-hidden', type !== 'existing');
    groupConfig.setAttribute('aria-hidden', type !== 'group');
    globalConfig.setAttribute('aria-hidden', type !== 'global');

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

function updateBrowserPinSourceUI() {
    const sourceType = document.getElementById('browserPinSourceType').value;
    const urlConfig = document.getElementById('browserPinUrlConfig');
    const fileConfig = document.getElementById('browserPinFileConfig');

    urlConfig.classList.toggle('hidden', sourceType !== 'url');
    fileConfig.classList.toggle('hidden', sourceType !== 'file');

    urlConfig.setAttribute('aria-hidden', sourceType !== 'url');
    fileConfig.setAttribute('aria-hidden', sourceType !== 'file');
}

function updateBrowserPinModeUI() {
    const mode = document.getElementById('browserPinMode').value;
    const sourceConfig = document.getElementById('browserPinSourceConfig');
    const needsSource = mode === 'kioskFullscreen' || mode === 'kioskPublic';

    sourceConfig.classList.toggle('hidden', !needsSource);
    sourceConfig.setAttribute('aria-hidden', !needsSource);

    if (needsSource) {
        updateBrowserPinSourceUI();
    }
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

function buildFileUrl(filePath) {
    if (!filePath) return '';
    let normalized = filePath.trim();
    if (!normalized) return '';
    if (normalized.toLowerCase().startsWith('file:///')) {
        return normalized;
    }
    normalized = normalized.replace(/\\/g, '/');
    normalized = normalized.split('/').map((segment, index) => {
        if (index === 0 && /^[A-Za-z]:$/.test(segment)) {
            return segment;
        }
        return encodeURIComponent(segment);
    }).join('/');
    if (!normalized.toLowerCase().startsWith('file:///')) {
        normalized = 'file:///' + normalized;
    }
    return normalized;
}

function getBrowserPinLaunchUrl() {
    const sourceType = document.getElementById('browserPinSourceType').value;
    if (sourceType === 'file') {
        return buildFileUrl(document.getElementById('browserPinFilePath').value);
    }
    return document.getElementById('browserPinUrl').value.trim();
}

function formatKioskModeSummary() {
    if (state.mode === 'single') {
        const appType = document.getElementById('appType').value;
        if (appType === 'edge') {
            const kioskType = document.getElementById('edgeKioskType').value;
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
        const appType = document.getElementById('appType').value;
        if (appType === 'edge') {
            const url = getEdgeUrl();
            const kioskType = document.getElementById('edgeKioskType').value;
            const idleTimeout = parseInt(document.getElementById('edgeIdleTimeout').value) || 0;
            let args = `--kiosk ${url} --edge-kiosk-type=${kioskType} --no-first-run`;
            if (idleTimeout > 0) args += ` --kiosk-idle-timeout-minutes=${idleTimeout}`;
            return `Microsoft Edge (args: ${args})`;
        }
        if (appType === 'uwp') {
            const aumid = document.getElementById('uwpAumid').value.trim();
            return aumid ? `UWP App (${aumid})` : 'UWP App';
        }
        const path = document.getElementById('win32Path').value.trim();
        const args = document.getElementById('win32Args').value.trim();
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
        const kioskType = document.getElementById('multiEdgeKioskType').value;
        args = `--kiosk ${url} --edge-kiosk-type=${kioskType} --no-first-run`;
    } else if (app.type === 'path') {
        args = document.getElementById('win32AutoLaunchArgs').value.trim();
    }

    return `${label}${args ? ` (args: ${args})` : ''}`;
}

function updateSummary() {
    const summaryGrid = document.getElementById('summaryGrid');
    if (!summaryGrid) return;

    const configName = document.getElementById('configName').value.trim() || 'Unnamed';
    const autoLogon = state.accountType === 'auto';
    const displayName = document.getElementById('displayName').value.trim();
    const accountName = document.getElementById('accountName')?.value.trim() || '';
    const groupName = document.getElementById('groupName')?.value.trim() || '';
    const groupType = document.getElementById('groupType')?.value || '';

    let accountSummary = 'Auto Logon (Managed)';
    if (state.accountType === 'existing') {
        accountSummary = accountName ? `Existing Account (${accountName})` : 'Existing Account';
    } else if (state.accountType === 'group') {
        const typeLabel = groupType ? `, ${groupType}` : '';
        accountSummary = groupName ? `User Group (${groupName}${typeLabel})` : 'User Group';
    } else if (state.accountType === 'global') {
        accountSummary = 'Global Profile (All non-admin users)';
    }

    const rows = [
        { label: 'Name', value: escapeXml(configName) },
        { label: 'Kiosk Type', value: escapeXml(formatKioskModeSummary()) },
        { label: 'Account', value: escapeXml(accountSummary) },
        { label: 'Allowed Apps', value: formatAllowedAppsSummary() },
        { label: 'Start Menu Pins', value: formatStartPinsSummary() },
        { label: 'Auto Logon', value: autoLogon ? 'Yes' : 'No' },
        { label: 'Auto Logon Username', value: autoLogon ? escapeXml(displayName || 'Managed kiosk account') : 'N/A' },
        { label: 'Auto-Start App', value: escapeXml(formatAutoLaunchSummary()) }
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
        const browserKeys = ['edge', 'chrome', 'firefox'];
        let pinToAdd = { ...pin };

        if (browserKeys.includes(pinKey)) {
            const mode = document.getElementById('browserPinMode').value;

            if (mode === 'private') {
                const privateArgs = {
                    edge: '--inprivate',
                    chrome: '--incognito',
                    firefox: '-private-window'
                };
                pinToAdd.args = privateArgs[pinKey] || '';
                pinToAdd.pinType = 'desktopAppLink';
                delete pinToAdd.systemShortcut;
            } else if (mode === 'kioskFullscreen' || mode === 'kioskPublic') {
                const launchUrl = getBrowserPinLaunchUrl();
                if (!launchUrl) {
                    alert('Kiosk browser pins require a URL or local file path.');
                    return;
                }

                let args = `--kiosk ${launchUrl}`;
                if (pinKey === 'edge') {
                    const kioskType = mode === 'kioskPublic' ? 'public-browsing' : 'fullscreen';
                    args += ` --edge-kiosk-type=${kioskType} --no-first-run`;
                } else if (pinKey === 'chrome') {
                    args += ' --no-first-run';
                }

                pinToAdd.args = args;
                pinToAdd.pinType = 'desktopAppLink';
                delete pinToAdd.systemShortcut;
            }
        }

        state.startPins.push(pinToAdd);

        // If the shortcut uses explorer.exe (for ms-settings: URLs), add it to allowed apps
        if (pinToAdd.target && pinToAdd.target.toLowerCase().includes('explorer.exe')) {
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
        // Both 'multi' and 'restricted' use the same profile structure
        xml += generateMultiAppProfile();
    }

    xml += `        </Profile>\n`;
    xml += `    </Profiles>\n`;

    // Use the new generateConfigsSection for proper account handling
    xml += generateConfigsSection();

    xml += `</AssignedAccessConfiguration>`;

    return xml;
}

function generateSingleAppProfile() {
    const appType = document.getElementById('appType').value;
    let xml = '';

    if (appType === 'edge') {
        const url = getEdgeUrl();
        const kioskType = document.getElementById('edgeKioskType').value;
        const idleTimeout = parseInt(document.getElementById('edgeIdleTimeout').value) || 0;

        // Edge kiosk mode always runs InPrivate automatically, so --inprivate is not needed
        let args = `--kiosk ${url} --edge-kiosk-type=${kioskType} --no-first-run`;
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
            // Edge kiosk mode always runs InPrivate automatically, so --inprivate is not needed
            if (isEdge) {
                const url = getMultiAppEdgeUrl();
                const kioskType = document.getElementById('multiEdgeKioskType').value;

                let args = `--kiosk ${url} --edge-kiosk-type=${kioskType} --no-first-run`;

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
    const profileId = document.getElementById('profileId').value;

    if (state.accountType === 'auto') {
        const displayName = document.getElementById('displayName').value || 'Kiosk';
        xml += `            <AutoLogonAccount rs5:DisplayName="${escapeXml(displayName)}"/>\n`;
    } else if (state.accountType === 'existing') {
        const accountName = document.getElementById('accountName').value;
        xml += `            <Account>${escapeXml(accountName)}</Account>\n`;
    } else if (state.accountType === 'group') {
        const groupType = document.getElementById('groupType').value;
        const groupName = document.getElementById('groupName').value;
        xml += `            <UserGroup Type="${groupType}" Name="${escapeXml(groupName)}"/>\n`;
    }
    // Note: 'global' account type doesn't add anything here - it uses GlobalProfile instead

    return xml;
}

function generateConfigsSection() {
    const profileId = document.getElementById('profileId').value;
    let xml = '';

    xml += `    <Configs>\n`;

    if (state.accountType === 'global') {
        // Global profile applies to all non-admin users
        xml += `        <v3:GlobalProfile Id="${profileId}"/>\n`;
    } else {
        xml += `        <Config>\n`;
        xml += generateAccountConfig();
        xml += `            <DefaultProfile Id="${profileId}"/>\n`;
        xml += `        </Config>\n`;
    }

    xml += `    </Configs>\n`;

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

    // Account validation based on type
    if (state.accountType === 'auto') {
        const displayName = document.getElementById('displayName').value;
        if (!displayName) {
            errors.push('Display Name is required for auto-logon account');
        }
    } else if (state.accountType === 'existing') {
        const accountName = document.getElementById('accountName').value;
        if (!accountName) {
            errors.push('Account Name is required');
        }
    } else if (state.accountType === 'group') {
        const groupName = document.getElementById('groupName').value;
        if (!groupName) {
            errors.push('Group Name is required');
        }
    }
    // 'global' account type doesn't require any additional input

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

    // Multi-app and Restricted modes
    if (state.mode === 'multi' || state.mode === 'restricted') {
        if (state.allowedApps.length === 0) {
            errors.push('At least one allowed app is required');
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
    document.getElementById('xmlPreview').textContent = xml;
    showValidation();
    updateSummary();
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

function getConfigFileName(extension) {
    const configName = document.getElementById('configName').value.trim();
    if (configName) {
        // Sanitize: replace spaces with hyphens, remove invalid filename chars
        const sanitized = configName.replace(/\s+/g, '-').replace(/[<>:"/\\|?*]/g, '');
        return `AssignedAccess-${sanitized}.${extension}`;
    }
    return `AssignedAccessConfig.${extension}`;
}

function downloadXml() {
    if (!showValidation()) {
        if (!confirm('Configuration has errors. Download anyway?')) return;
    }

    const xml = generateXml();
    downloadFile(xml, getConfigFileName('xml'), 'application/xml');
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

    downloadFile(ps1, getConfigFileName('ps1'), 'text/plain');

    // Also download the README summary
    const readme = generateReadme();
    setTimeout(() => {
        downloadFile(readme, getConfigFileName('md'), 'text/markdown');
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
    const configName = document.getElementById('configName').value.trim();
    const profileId = document.getElementById('profileId').value || '(not set)';
    const now = new Date().toLocaleString();

    let readme = `# Kiosk Configuration Summary\n\n`;
    if (configName) {
        readme += `**Configuration:** ${configName}\n\n`;
    }
    readme += `Generated: ${now}\n\n`;

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

            readme += `**App:** Microsoft Edge (Kiosk Mode)\n`;
            readme += `**URL:** ${url || '(not set)'}\n`;
            readme += `**Kiosk Type:** ${kioskType === 'fullscreen' ? 'Fullscreen (Digital Signage)' : 'Public Browsing'}\n`;
            readme += `**InPrivate Mode:** Always enabled (automatic in kiosk mode)\n\n`;
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

                readme += `**URL:** ${url || '(not set)'}\n`;
                readme += `**Kiosk Type:** ${kioskType === 'fullscreen' ? 'Fullscreen' : 'Public Browsing'}\n`;
                readme += `**InPrivate Mode:** Always enabled (automatic in kiosk mode)\n\n`;
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
                // InPrivate is always enabled in kiosk mode, no need to import this setting
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
                        // InPrivate is always enabled in kiosk mode, no need to import this setting
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

    // Reset config name
    document.getElementById('configName').value = '';

    // Reset multi-app Edge config
    document.getElementById('multiEdgeSourceType').value = 'url';
    document.getElementById('multiEdgeUrl').value = '';
    document.getElementById('multiEdgeFilePath').value = '';
    document.getElementById('multiEdgeKioskType').value = 'fullscreen';
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

    const lastUpdatedEl = document.getElementById('lastUpdated');
    if (lastUpdatedEl) {
        const modified = new Date(document.lastModified);
        lastUpdatedEl.textContent = formatLastUpdated(modified);
    }

    const browserPinMode = document.getElementById('browserPinMode');
    const browserPinSourceType = document.getElementById('browserPinSourceType');
    if (browserPinMode && browserPinSourceType) {
        browserPinMode.addEventListener('change', updateBrowserPinModeUI);
        browserPinSourceType.addEventListener('change', updateBrowserPinSourceUI);
        updateBrowserPinModeUI();
    }

    // Add tooltip positioning on hover/focus
    document.querySelectorAll('.tooltip-icon').forEach(icon => {
        icon.addEventListener('mouseenter', () => positionTooltip(icon));
        icon.addEventListener('focus', () => positionTooltip(icon));
    });
});
