/* ============================================================================
   AssignedAccess XML Builder - Application Logic
   ============================================================================ */

/* ============================================================================
   GUID Generator
   ============================================================================ */
function generateGuid() {
    const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    dom.get('profileId').value = '{' + guid + '}';
    updatePreview();
}

function copyProfileId() {
    copyToClipboard(dom.get('profileId').value);
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
    const modal = dom.get('deployModal');
    modal.classList.remove('hidden');
    modal.querySelector('.modal-close').focus();
    document.body.style.overflow = 'hidden';
}

function hideDeployHelp() {
    const modal = dom.get('deployModal');
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
        const modal = dom.get('deployModal');
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
    const startMenuTab = dom.get('tab-btn-startmenu');
    const systemTab = dom.get('tab-btn-system');

    // Show/hide tabs based on mode - both multi and restricted need these tabs
    startMenuTab.classList.toggle('hidden', !isMultiOrRestricted);
    systemTab.classList.toggle('hidden', !isMultiOrRestricted);

    // If switching to single mode and currently on a multi-only tab, switch to Application tab
    if (!isMultiOrRestricted) {
        const activeTab = document.querySelector('.side-nav-btn.active');
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

    const singleBtn = dom.get('modeSingle');
    const multiBtn = dom.get('modeMulti');
    const restrictedBtn = dom.get('modeRestricted');
    const singleConfig = dom.get('singleAppConfig');
    const multiConfig = dom.get('multiAppConfig');

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
    const groupBtn = dom.get('accountGroup');
    const globalBtn = dom.get('accountGlobal');
    const autoBtn = dom.get('accountAuto');

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

    const autoBtn = dom.get('accountAuto');
    const existingBtn = dom.get('accountExisting');
    const groupBtn = dom.get('accountGroup');
    const globalBtn = dom.get('accountGlobal');
    const autoConfig = dom.get('autoLogonConfig');
    const existingConfig = dom.get('existingAccountConfig');
    const groupConfig = dom.get('groupAccountConfig');
    const globalConfig = dom.get('globalProfileConfig');

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
    const appType = dom.get('appType').value;
    const edgeConfig = dom.get('edgeConfig');
    const uwpConfig = dom.get('uwpConfig');
    const win32Config = dom.get('win32Config');

    edgeConfig.classList.toggle('hidden', appType !== 'edge');
    uwpConfig.classList.toggle('hidden', appType !== 'uwp');
    win32Config.classList.toggle('hidden', appType !== 'win32');

    edgeConfig.setAttribute('aria-hidden', appType !== 'edge');
    uwpConfig.setAttribute('aria-hidden', appType !== 'uwp');
    win32Config.setAttribute('aria-hidden', appType !== 'win32');
}

/* ============================================================================
   Event Delegation
   ============================================================================ */
const actionHandlers = {
    loadPreset,
    importXml,
    showDeployHelp,
    hideDeployHelp,
    toggleTheme,
    switchTab,
    switchDeployTab,
    setMode,
    setAccountType,
    generateGuid,
    applySingleAppPreset,
    addApp,
    addCommonApp,
    addPin,
    addCommonPin,
    removeApp,
    removePin,
    updatePreview,
    updateAppTypeUI,
    updateEdgeSourceUI,
    updateBreakoutUI,
    updateBreakoutPreview,
    updateAutoLaunchSelection,
    updateMultiEdgeSourceUI,
    syncAutoPins,
    updateBrowserPinModeUI,
    updateBrowserPinSourceUI,
    updateEdgeTileSourceUI,
    updateTaskbarSyncUI,
    selectBrowserPin,
    addSelectedBrowserPin,
    editPin,
    saveEditPin,
    cancelEditPin,
    movePinUp,
    movePinDown,
    addTaskbarPin,
    editTaskbarPin,
    saveTaskbarPin,
    cancelTaskbarPinEdit,
    removeTaskbarPin,
    moveTaskbarPinUp,
    moveTaskbarPinDown,
    copyXml,
    downloadXml,
    downloadPowerShell,
    downloadShortcutsScript,
    downloadStartLayoutXml,
    addEdgeSecondaryTile,
    handleImport,
    copyProfileId
};

function runAction(action, target, event) {
    const handler = actionHandlers[action];
    if (!handler) return;

    const arg = target?.dataset?.arg;
    if (action === 'handleImport') {
        handler(event);
        return;
    }

    if (arg !== undefined) {
        if (action === 'removeApp' || action === 'removePin') {
            handler(parseInt(arg, 10));
        } else {
            handler(arg);
        }
        return;
    }

    handler();
}

function runActions(actionString, target, event) {
    actionString.split('|').forEach(action => {
        runAction(action.trim(), target, event);
    });
}

function applySingleAppPreset(preset) {
    if (!singleAppPresets || !singleAppPresets.presets) {
        alert('Single-app presets are not available yet. Please try again.');
        return;
    }

    const config = singleAppPresets.presets[preset];
    if (!config) return;

    const appTypeSelect = dom.get('appType');
    const edgeSourceType = dom.get('edgeSourceType');
    const edgeUrl = dom.get('edgeUrl');
    const edgeKioskType = dom.get('edgeKioskType');
    const win32Path = dom.get('win32Path');
    const win32Args = dom.get('win32Args');

    appTypeSelect.value = config.appType;

    if (config.appType === 'edge') {
        edgeSourceType.value = config.sourceType || 'url';
        edgeUrl.value = config.url || edgeUrl.value || 'https://www.microsoft.com';
        edgeKioskType.value = config.kioskType || 'fullscreen';
        updateAppTypeUI();
        updateEdgeSourceUI();
        updatePreview();
        return;
    }

    win32Path.value = config.path || '';
    win32Args.value = config.args || '';

    updateAppTypeUI();
    updatePreview();
}

function updateEdgeSourceUI() {
    const sourceType = dom.get('edgeSourceType').value;
    const urlConfig = dom.get('edgeUrlConfig');
    const fileConfig = dom.get('edgeFileConfig');

    urlConfig.classList.toggle('hidden', sourceType !== 'url');
    fileConfig.classList.toggle('hidden', sourceType !== 'file');

    urlConfig.setAttribute('aria-hidden', sourceType !== 'url');
    fileConfig.setAttribute('aria-hidden', sourceType !== 'file');
}

function updateBrowserPinSourceUI() {
    const sourceType = dom.get('browserPinSourceType').value;
    const urlConfig = dom.get('browserPinUrlConfig');
    const fileConfig = dom.get('browserPinFileConfig');

    urlConfig.classList.toggle('hidden', sourceType !== 'url');
    fileConfig.classList.toggle('hidden', sourceType !== 'file');

    urlConfig.setAttribute('aria-hidden', sourceType !== 'url');
    fileConfig.setAttribute('aria-hidden', sourceType !== 'file');
}

function updateEdgeTileSourceUI() {
    const sourceType = dom.get('edgeTileSourceType').value;
    const urlConfig = dom.get('edgeTileUrlConfig');
    const fileConfig = dom.get('edgeTileFileConfig');

    urlConfig.classList.toggle('hidden', sourceType !== 'url');
    fileConfig.classList.toggle('hidden', sourceType !== 'file');

    urlConfig.setAttribute('aria-hidden', sourceType !== 'url');
    fileConfig.setAttribute('aria-hidden', sourceType !== 'file');
}

function updateBrowserPinModeUI() {
    const mode = dom.get('browserPinMode').value;
    const sourceConfig = dom.get('browserPinSourceConfig');
    const needsSource = mode === 'kioskFullscreen' || mode === 'kioskPublic';

    sourceConfig.classList.toggle('hidden', !needsSource);
    sourceConfig.setAttribute('aria-hidden', !needsSource);

    if (needsSource) {
        updateBrowserPinSourceUI();
    }
}

function updateTaskbarSyncUI() {
    const isSynced = dom.get('taskbarSyncPins')?.checked;
    state.taskbarSyncStartPins = Boolean(isSynced);
    const config = dom.get('taskbarLayoutConfig');
    const list = dom.get('taskbarPinList');
    const addPanel = dom.get('taskbarAddPanel');
    const editPanel = dom.get('taskbarEditPanel');

    if (config) {
        config.classList.toggle('hidden', isSynced);
        config.setAttribute('aria-hidden', isSynced ? 'true' : 'false');
    }
    if (list) {
        list.setAttribute('aria-hidden', isSynced ? 'true' : 'false');
    }
    if (addPanel) {
        addPanel.classList.toggle('hidden', isSynced);
        addPanel.setAttribute('aria-hidden', isSynced ? 'true' : 'false');
    }
    if (editPanel) {
        editPanel.classList.toggle('hidden', isSynced);
        editPanel.setAttribute('aria-hidden', isSynced ? 'true' : 'false');
    }

    if (isSynced) {
        state.taskbarPins = state.startPins
            .filter(pin => pin.pinType === 'desktopAppLink' || pin.pinType === 'packagedAppId')
            .map(pin => ({
                name: pin.name || '',
                pinType: pin.pinType,
                packagedAppId: pin.packagedAppId,
                systemShortcut: pin.systemShortcut,
                target: pin.target
            }));
    }

    renderTaskbarPinList();
    updatePreview();
}

function renderTaskbarPinList() {
    const list = dom.get('taskbarPinList');
    const count = dom.get('taskbarPinCount');
    if (!list || !count) return;

    const pins = state.taskbarSyncStartPins ? state.startPins : state.taskbarPins;
    const filteredPins = pins.filter(pin => pin.pinType === 'desktopAppLink' || pin.pinType === 'packagedAppId');

    count.textContent = filteredPins.length;

    if (filteredPins.length === 0) {
        list.innerHTML = '<div class="empty-list" role="listitem">No taskbar pins configured</div>';
        return;
    }

    list.innerHTML = filteredPins.map((pin, i) => {
        const isUwp = pin.pinType === 'packagedAppId';
        const displayTarget = isUwp
            ? pin.packagedAppId
            : (pin.systemShortcut || pin.target || '(no shortcut path)');
        const warningStyle = !isUwp && !pin.systemShortcut && !pin.target
            ? 'color: var(--error-color, #e74c3c);'
            : 'color: var(--text-secondary);';
        const actionsDisabled = state.taskbarSyncStartPins ? 'disabled' : '';
        return `
        <div class="app-item" role="listitem">
            <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                <span style="font-weight: 500;">${escapeXml(pin.name || 'Unnamed')}</span>
                <span style="font-size: 0.75rem; ${warningStyle} overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeXml(displayTarget)}">${escapeXml(displayTarget)}</span>
            </div>
            <div class="pin-actions">
                <button type="button" class="btn-icon btn-small" data-action="moveTaskbarPinUp" data-arg="${i}" aria-label="Move ${escapeXml(pin.name || 'pin')} up" ${actionsDisabled} ${i === 0 ? 'disabled' : ''}>
                    <span aria-hidden="true">↑</span>
                </button>
                <button type="button" class="btn-icon btn-small" data-action="moveTaskbarPinDown" data-arg="${i}" aria-label="Move ${escapeXml(pin.name || 'pin')} down" ${actionsDisabled} ${i === filteredPins.length - 1 ? 'disabled' : ''}>
                    <span aria-hidden="true">↓</span>
                </button>
                <button type="button" class="btn-icon btn-small" data-action="editTaskbarPin" data-arg="${i}" aria-label="Edit ${escapeXml(pin.name || 'pin')}" ${actionsDisabled}>
                    <span aria-hidden="true">✎</span>
                </button>
                <button type="button" class="remove-btn" data-action="removeTaskbarPin" data-arg="${i}" aria-label="Remove ${escapeXml(pin.name || 'pin')}" ${actionsDisabled}>
                    <span aria-hidden="true">✕</span>
                </button>
            </div>
        </div>
    `;
    }).join('');
}

function addTaskbarPin() {
    if (state.taskbarSyncStartPins) {
        alert('Disable auto-sync to add custom taskbar pins.');
        return;
    }

    const name = dom.get('taskbarPinName').value.trim();
    const type = dom.get('taskbarPinType').value;
    const value = dom.get('taskbarPinValue').value.trim();

    if (!name || !value) {
        alert('Taskbar pin name and value are required.');
        return;
    }

    const pin = {
        name: name,
        pinType: type === 'packagedAppId' ? 'packagedAppId' : 'desktopAppLink',
        packagedAppId: type === 'packagedAppId' ? value : '',
        systemShortcut: type === 'desktopAppLink' ? value : '',
        target: ''
    };

    state.taskbarPins.push(pin);

    dom.get('taskbarPinName').value = '';
    dom.get('taskbarPinValue').value = '';

    renderTaskbarPinList();
    updatePreview();
}

function editTaskbarPin(index) {
    if (state.taskbarSyncStartPins) return;
    const pin = state.taskbarPins[index];
    if (!pin) return;
    editingTaskbarPinIndex = index;

    dom.get('editTaskbarPinName').value = pin.name || '';
    dom.get('editTaskbarPinType').value = pin.pinType || 'desktopAppLink';
    dom.get('editTaskbarPinValue').value = pin.pinType === 'packagedAppId'
        ? (pin.packagedAppId || '')
        : (pin.systemShortcut || pin.target || '');

    dom.get('taskbarEditPanel').classList.remove('hidden');
}

function saveTaskbarPin() {
    if (editingTaskbarPinIndex === null) return;
    const pin = state.taskbarPins[editingTaskbarPinIndex];
    if (!pin) return;

    const name = dom.get('editTaskbarPinName').value.trim();
    const type = dom.get('editTaskbarPinType').value;
    const value = dom.get('editTaskbarPinValue').value.trim();

    if (!name || !value) {
        alert('Taskbar pin name and value are required.');
        return;
    }

    pin.name = name;
    pin.pinType = type === 'packagedAppId' ? 'packagedAppId' : 'desktopAppLink';
    pin.packagedAppId = type === 'packagedAppId' ? value : '';
    pin.systemShortcut = type === 'desktopAppLink' ? value : '';
    pin.target = '';

    renderTaskbarPinList();
    updatePreview();
    cancelTaskbarPinEdit();
}

function cancelTaskbarPinEdit() {
    editingTaskbarPinIndex = null;
    dom.get('taskbarEditPanel').classList.add('hidden');
}

function removeTaskbarPin(index) {
    if (state.taskbarSyncStartPins) return;
    state.taskbarPins.splice(index, 1);
    renderTaskbarPinList();
    updatePreview();
}

function moveTaskbarPinUp(index) {
    if (state.taskbarSyncStartPins || index <= 0) return;
    const [pin] = state.taskbarPins.splice(index, 1);
    state.taskbarPins.splice(index - 1, 0, pin);
    renderTaskbarPinList();
    updatePreview();
}

function moveTaskbarPinDown(index) {
    if (state.taskbarSyncStartPins || index >= state.taskbarPins.length - 1) return;
    const [pin] = state.taskbarPins.splice(index, 1);
    state.taskbarPins.splice(index + 1, 0, pin);
    renderTaskbarPinList();
    updatePreview();
}
let selectedBrowserPinKey = null;
let editingPinIndex = null;
let editingTaskbarPinIndex = null;

function selectBrowserPin(pinKey) {
    selectedBrowserPinKey = pinKey;
    updateBrowserPinSelectionUI();
    updateBrowserPinModeUI();
    updateBrowserPinSelectionUI();
    updateEdgeTileSourceUI();
    updateTaskbarSyncUI();
}

function updateBrowserPinSelectionUI() {
    const config = dom.get('browserPinConfig');
    const selectedName = dom.get('browserPinSelectedName');
    const addButton = dom.get('addBrowserPinBtn');

    if (!config || !selectedName || !addButton) return;

    const hasSelection = Boolean(selectedBrowserPinKey);
    config.classList.toggle('hidden', !hasSelection);
    config.setAttribute('aria-hidden', !hasSelection);

    if (hasSelection) {
        const presetName = pinPresets?.pins?.[selectedBrowserPinKey]?.name;
        selectedName.textContent = `Selected: ${presetName || selectedBrowserPinKey}`;
    } else {
        selectedName.textContent = 'Select a browser to configure';
    }

    addButton.disabled = !hasSelection;

    document.querySelectorAll('[data-browser-pin]').forEach(button => {
        button.setAttribute('aria-pressed', button.dataset.browserPin === selectedBrowserPinKey ? 'true' : 'false');
    });
}

function addSelectedBrowserPin() {
    if (!selectedBrowserPinKey) {
        alert('Select a browser first.');
        return;
    }
    addCommonPin(selectedBrowserPinKey);
}

function getEdgeUrl() {
    const sourceType = dom.get('edgeSourceType').value;
    return buildLaunchUrl(
        sourceType,
        dom.get('edgeUrl').value,
        dom.get('edgeFilePath').value,
        'https://www.microsoft.com'
    );
}

function getBrowserPinLaunchUrl() {
    const sourceType = dom.get('browserPinSourceType').value;
    return buildLaunchUrl(
        sourceType,
        dom.get('browserPinUrl').value.trim(),
        dom.get('browserPinFilePath').value,
        ''
    );
}

function getEdgeTileLaunchUrl() {
    const sourceType = dom.get('edgeTileSourceType').value;
    return buildLaunchUrl(
        sourceType,
        dom.get('edgeTileUrl').value.trim(),
        dom.get('edgeTileFilePath').value,
        ''
    );
}

function updateBreakoutUI() {
    const enabled = dom.get('enableBreakout').checked;
    const breakoutConfig = dom.get('breakoutConfig');
    breakoutConfig.classList.toggle('hidden', !enabled);
    breakoutConfig.setAttribute('aria-hidden', !enabled);
    updateBreakoutPreview();
}

function updateBreakoutPreview() {
    const ctrl = dom.get('breakoutCtrl').checked;
    const alt = dom.get('breakoutAlt').checked;
    const shift = dom.get('breakoutShift').checked;
    const key = dom.get('breakoutFinalKey').value;

    let combo = [];
    if (ctrl) combo.push('Ctrl');
    if (alt) combo.push('Alt');
    if (shift) combo.push('Shift');
    combo.push(key);

    dom.get('breakoutPreview').textContent = combo.join('+');
}

function getBreakoutSequence() {
    if (!dom.get('enableBreakout').checked) return null;

    const ctrl = dom.get('breakoutCtrl').checked;
    const alt = dom.get('breakoutAlt').checked;
    const shift = dom.get('breakoutShift').checked;
    const key = dom.get('breakoutFinalKey').value;

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
function getMultiAppEdgeUrl() {
    const sourceType = dom.get('multiEdgeSourceType').value;
    return buildLaunchUrl(
        sourceType,
        dom.get('multiEdgeUrl').value,
        dom.get('multiEdgeFilePath').value,
        'https://www.microsoft.com'
    );
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

function shouldSkipAutoLaunch(app) {
    if (!app) return true;
    if (app.skipAutoLaunch) return true;
    return isHelperExecutable(app.value);
}

function updateAutoLaunchSelector() {
    const select = dom.get('autoLaunchApp');
    const currentValue = select.value;

    // Clear all options except "None"
    select.innerHTML = '<option value="">None (show Start menu)</option>';

    // Add allowed apps as options (skip helper executables)
    state.allowedApps.forEach((app, index) => {
        // Skip helper executables - they shouldn't be auto-launched
        if (shouldSkipAutoLaunch(app)) {
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
    if (currentValue !== '' &&
        state.allowedApps[parseInt(currentValue)] &&
        !shouldSkipAutoLaunch(state.allowedApps[parseInt(currentValue)])) {
        select.value = currentValue;
    } else {
        select.value = '';
        state.autoLaunchApp = null;
    }

    updateMultiAppEdgeUI();
}

function updateAutoLaunchSelection() {
    const select = dom.get('autoLaunchApp');
    const value = select.value;

    if (value === '') {
        state.autoLaunchApp = null;
    } else {
        state.autoLaunchApp = parseInt(value);
    }

    updateMultiAppEdgeUI();
}

function updateMultiAppEdgeUI() {
    const edgeConfig = dom.get('multiAppEdgeConfig');
    const win32ArgsConfig = dom.get('win32ArgsConfig');

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
    const sourceType = dom.get('multiEdgeSourceType').value;
    const urlGroup = dom.get('multiEdgeUrlGroup');
    const fileGroup = dom.get('multiEdgeFileGroup');

    urlGroup.classList.toggle('hidden', sourceType !== 'url');
    fileGroup.classList.toggle('hidden', sourceType !== 'file');

    urlGroup.setAttribute('aria-hidden', sourceType !== 'url');
    fileGroup.setAttribute('aria-hidden', sourceType !== 'file');
}

/* ============================================================================
   App List Management (Multi-App Mode)
   ============================================================================ */
function addAllowedApp(app, options = {}) {
    if (!app || !app.value) return false;

    if (state.allowedApps.find(a => a.value === app.value)) {
        return false;
    }

    const entry = { ...app };
    if (options.skipAutoPin || entry.skipAutoPin) {
        entry.skipAutoPin = true;
    }
    if (options.skipAutoLaunch || entry.skipAutoLaunch) {
        entry.skipAutoLaunch = true;
    }

    state.allowedApps.push(entry);

    if (dom.get('autoPinAllowed')?.checked && !entry.skipAutoPin) {
        ensurePinForAllowedApp(entry);
    }

    return true;
}

function ensureEdgeDependencies(app) {
    if (!appPresets?.apps) return;

    const value = (app.value || '').toLowerCase();
    const isEdgeValue = isEdgeApp(app.value) ||
        value === 'microsoft.microsoftedge.stable_8wekyb3d8bbwe!app';

    if (!isEdgeValue) return;

    ['edge', 'edgeProxy', 'edgeAppId'].forEach(key => {
        const edgeApp = appPresets.apps[key];
        if (!edgeApp) return;
        const isDependency = key !== 'edge';
        addAllowedApp(edgeApp, { skipAutoPin: isDependency, skipAutoLaunch: isDependency });
    });
}

function addApp() {
    const type = dom.get('addAppType').value;
    const value = dom.get('addAppValue').value.trim();

    if (!value) return;

    const added = addAllowedApp({ type, value });
    dom.get('addAppValue').value = '';
    if (added) {
        ensureEdgeDependencies({ type, value });
    }
    renderAppList();
    updateAutoLaunchSelector();
    updatePreview();
}

function normalizeAutoPinKey(value) {
    if (!value) return '';
    return value.trim().toLowerCase();
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
            addAllowedApp(app, { skipAutoPin: app?.skipAutoPin, skipAutoLaunch: app?.skipAutoLaunch });
        });
    } else {
        // Single app
        const app = apps[appKey];
        addAllowedApp(app, { skipAutoPin: app?.skipAutoPin, skipAutoLaunch: app?.skipAutoLaunch });
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
    const list = dom.get('appList');
    const count = dom.get('appCount');

    count.textContent = state.allowedApps.length;

    if (state.allowedApps.length === 0) {
        list.innerHTML = '<div class="empty-list" role="status">No apps added yet</div>';
        return;
    }

    list.innerHTML = state.allowedApps.map((app, i) => `
        <div class="app-item" role="listitem">
            <span title="${escapeXml(app.value)}"><span aria-hidden="true">${app.type === 'aumid' ? '📦 ' : '📄 '}</span>${escapeXml(truncate(app.value, 60))}</span>
            <button type="button" class="remove-btn" data-action="removeApp" data-arg="${i}" aria-label="Remove ${escapeXml(truncate(app.value, 30))}">
                <span aria-hidden="true">✕</span>
            </button>
        </div>
    `).join('');
}

/* ============================================================================
   Start Pins Management (Multi-App Mode)
   ============================================================================ */
function addPin() {
    const name = dom.get('pinName').value.trim();
    const target = dom.get('pinTarget').value.trim();
    const args = dom.get('pinArgs').value.trim();
    const workingDir = dom.get('pinWorkingDir').value.trim();
    const iconPath = dom.get('pinIconPath').value.trim();

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
    dom.get('pinName').value = '';
    dom.get('pinTarget').value = '';
    dom.get('pinArgs').value = '';
    dom.get('pinWorkingDir').value = '';
    dom.get('pinIconPath').value = '';

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
            const mode = dom.get('browserPinMode').value;

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

                let args = '';
                if (pinKey === 'edge') {
                    const kioskType = mode === 'kioskPublic' ? 'public-browsing' : 'fullscreen';
                    args = buildEdgeKioskArgs(launchUrl, kioskType, 0);
                } else {
                    args = buildBrowserKioskArgs(pinKey, launchUrl, 'fullscreen');
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

function addEdgeSecondaryTile() {
    const name = dom.get('edgeTileName').value.trim();
    const url = getEdgeTileLaunchUrl();
    const tileId = dom.get('edgeTileId').value.trim();

    if (!name || !url) {
        alert('Edge tile name and URL/file path are required.');
        return;
    }

    if (state.startPins.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert('A pin with this name already exists.');
        return;
    }

    state.startPins.push({
        name: name,
        pinType: 'secondaryTile',
        packagedAppId: 'Microsoft.MicrosoftEdge.Stable_8wekyb3d8bbwe!App',
        args: url,
        tileId: tileId || ''
    });

    dom.get('edgeTileName').value = '';
    dom.get('edgeTileUrl').value = '';
    dom.get('edgeTileFilePath').value = '';
    dom.get('edgeTileId').value = '';

    renderPinList();
    updatePreview();
}

function editPin(index) {
    const pin = state.startPins[index];
    if (!pin) return;
    editingPinIndex = index;

    dom.get('editPinName').value = pin.name || '';
    dom.get('editPinType').textContent = pin.pinType || 'desktopAppLink';

    dom.get('editDesktopFields').classList.toggle('hidden', pin.pinType !== 'desktopAppLink');
    dom.get('editPackagedFields').classList.toggle('hidden', pin.pinType !== 'packagedAppId');
    dom.get('editSecondaryFields').classList.toggle('hidden', pin.pinType !== 'secondaryTile');

    if (pin.pinType === 'desktopAppLink') {
        dom.get('editPinTarget').value = pin.target || '';
        dom.get('editPinArgs').value = pin.args || '';
        dom.get('editPinWorkingDir').value = pin.workingDir || '';
        dom.get('editPinIconPath').value = pin.iconPath || '';
        dom.get('editPinShortcutPath').value = pin.systemShortcut || '';
    } else if (pin.pinType === 'packagedAppId') {
        dom.get('editPinPackagedAppId').value = pin.packagedAppId || '';
    } else if (pin.pinType === 'secondaryTile') {
        dom.get('editTileId').value = pin.tileId || '';
        dom.get('editTileUrl').value = pin.args || '';
        dom.get('editTilePackagedAppId').value = pin.packagedAppId || 'Microsoft.MicrosoftEdge.Stable_8wekyb3d8bbwe!App';
    }

    dom.get('pinEditPanel').classList.remove('hidden');
}

function cancelEditPin() {
    editingPinIndex = null;
    dom.get('pinEditPanel').classList.add('hidden');
}

function saveEditPin() {
    if (editingPinIndex === null) return;
    const pin = state.startPins[editingPinIndex];
    if (!pin) return;

    const name = dom.get('editPinName').value.trim();
    if (!name) {
        alert('Pin name is required.');
        return;
    }

    pin.name = name;

    if (pin.pinType === 'desktopAppLink') {
        pin.target = dom.get('editPinTarget').value.trim();
        pin.args = dom.get('editPinArgs').value.trim();
        pin.workingDir = dom.get('editPinWorkingDir').value.trim();
        pin.iconPath = dom.get('editPinIconPath').value.trim();
        pin.systemShortcut = dom.get('editPinShortcutPath').value.trim();
    } else if (pin.pinType === 'packagedAppId') {
        pin.packagedAppId = dom.get('editPinPackagedAppId').value.trim();
    } else if (pin.pinType === 'secondaryTile') {
        pin.tileId = dom.get('editTileId').value.trim();
        const url = dom.get('editTileUrl').value.trim();
        if (!url) {
            alert('Tile URL or file path is required.');
            return;
        }
        pin.args = url;
        pin.packagedAppId = dom.get('editTilePackagedAppId').value.trim() || 'Microsoft.MicrosoftEdge.Stable_8wekyb3d8bbwe!App';
    }

    renderPinList();
    updatePreview();
    cancelEditPin();
}

function movePinUp(index) {
    if (index <= 0) return;
    const [pin] = state.startPins.splice(index, 1);
    state.startPins.splice(index - 1, 0, pin);
    renderPinList();
    updatePreview();
}

function movePinDown(index) {
    if (index >= state.startPins.length - 1) return;
    const [pin] = state.startPins.splice(index, 1);
    state.startPins.splice(index + 1, 0, pin);
    renderPinList();
    updatePreview();
}

function ensurePinForAllowedApp(app) {
    if (!app || !app.value) return;
    const autoKey = normalizeAutoPinKey(app.value);
    if (state.autoPinExclusions.includes(autoKey)) return;

    const existing = state.startPins.some(pin => {
        if (pin.pinType === 'packagedAppId') {
            return pin.packagedAppId && pin.packagedAppId.toLowerCase() === app.value.toLowerCase();
        }
        return pin.target && pin.target.toLowerCase() === app.value.toLowerCase();
    });

    if (existing) return;

    if (app.type === 'aumid') {
        state.startPins.push({
            name: app.value,
            pinType: 'packagedAppId',
            packagedAppId: app.value,
            autoPinned: true,
            autoPinSource: app.value
        });
        return;
    }

    state.startPins.push({
        name: app.value.split('\\').pop() || app.value,
        pinType: 'desktopAppLink',
        target: app.value,
        args: '',
        workingDir: '',
        iconPath: '',
        autoPinned: true,
        autoPinSource: app.value
    });
}

function syncAutoPins() {
    if (!dom.get('autoPinAllowed')?.checked) {
        const beforeCount = state.startPins.length;
        state.startPins = state.startPins.filter(pin => !pin.autoPinned);
        state.autoPinExclusions = [];
        if (state.startPins.length !== beforeCount) {
            renderPinList();
            updatePreview();
        }
        return;
    }

    state.allowedApps.forEach(app => ensurePinForAllowedApp(app));
    renderPinList();
    updatePreview();
}

function removePin(index) {
    const removedPin = state.startPins[index];
    if (removedPin?.autoPinned && removedPin.autoPinSource) {
        const autoKey = normalizeAutoPinKey(removedPin.autoPinSource);
        if (autoKey && !state.autoPinExclusions.includes(autoKey)) {
            state.autoPinExclusions.push(autoKey);
        }
    }
    state.startPins.splice(index, 1);
    renderPinList();
    updatePreview();
}

function renderPinList() {
    const list = dom.get('pinList');
    const count = dom.get('pinCount');

    count.textContent = state.startPins.length;

    if (state.startPins.length === 0) {
        list.innerHTML = '<div class="empty-list" role="status">No pins added yet</div>';
        return;
    }

    list.innerHTML = state.startPins.map((pin, i) => {
        const isUwp = pin.pinType === 'packagedAppId';
        const displayTarget = isUwp
            ? pin.packagedAppId
            : (pin.pinType === 'secondaryTile'
                ? (pin.args || pin.packagedAppId || 'Edge site tile')
                : (pin.target ? truncate(pin.target, 40)
                    : (pin.systemShortcut ? truncate(pin.systemShortcut, 40) : '(no target - click to edit)')));
        const hasArgs = pin.args ? ` (${truncate(pin.args, 20)})` : '';
        const missingTarget = !isUwp && pin.pinType === 'desktopAppLink' && !pin.target && !pin.systemShortcut;
        const warningStyle = missingTarget ? 'color: var(--error-color, #e74c3c);' : 'color: var(--text-secondary);';
        const typeLabel = isUwp ? '<span style="background: var(--accent); color: white; padding: 1px 4px; border-radius: 3px; font-size: 0.65rem; margin-left: 6px;">UWP</span>' : '';
        return `
        <div class="app-item" role="listitem" style="${missingTarget ? 'border-left: 3px solid var(--error-color, #e74c3c);' : ''}">
            <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                <span style="font-weight: 500;">${escapeXml(pin.name)}${typeLabel}${missingTarget ? ' <span style="color: var(--error-color, #e74c3c);" title="Target path required">⚠</span>' : ''}</span>
                <span style="font-size: 0.75rem; ${warningStyle} overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeXml(displayTarget)}${escapeXml(hasArgs)}">${escapeXml(displayTarget)}${escapeXml(hasArgs)}</span>
            </div>
            <div class="pin-actions">
                <button type="button" class="btn-icon btn-small" data-action="movePinUp" data-arg="${i}" aria-label="Move ${escapeXml(pin.name)} up" ${i === 0 ? 'disabled' : ''}>
                    <span aria-hidden="true">↑</span>
                </button>
                <button type="button" class="btn-icon btn-small" data-action="movePinDown" data-arg="${i}" aria-label="Move ${escapeXml(pin.name)} down" ${i === state.startPins.length - 1 ? 'disabled' : ''}>
                    <span aria-hidden="true">↓</span>
                </button>
                <button type="button" class="btn-icon btn-small" data-action="editPin" data-arg="${i}" aria-label="Edit ${escapeXml(pin.name)}">
                    <span aria-hidden="true">✎</span>
                </button>
                <button type="button" class="remove-btn" data-action="removePin" data-arg="${i}" aria-label="Remove ${escapeXml(pin.name)}">
                    <span aria-hidden="true">✕</span>
                </button>
            </div>
        </div>
    `}).join('');
}

/* ============================================================================
   Preview & Syntax Highlighting
   ============================================================================ */
function updatePreview() {
    const xml = generateXml();
    dom.get('xmlPreview').textContent = xml;
    showValidation();
    updateSummary();
    if (state.taskbarSyncStartPins) {
        renderTaskbarPinList();
    }
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
    const configName = dom.get('configName').value.trim();
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
    If Windows blocks the script, right-click the .ps1 file, choose Properties, then Unblock.
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

    $shortcutDir = Join-Path $env:ALLUSERSPROFILE "Microsoft\\Windows\\Start Menu\\Programs"
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

function downloadShortcutsScript() {
    if (!showValidation()) {
        if (!confirm('Configuration has errors. Download anyway?')) return;
    }

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
    Creates Start Menu shortcuts required by AssignedAccess StartPins.
.DESCRIPTION
    This script creates .lnk files under the Start Menu Programs folder.
    Use when deploying XML via Intune/OMA-URI and you only need shortcuts.
.NOTES
    Generated by AssignedAccess XML Builder
    If Windows blocks the script, right-click the .ps1 file, choose Properties, then Unblock.
#>

$ErrorActionPreference = "Stop"

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

function New-Shortcut {
    param(
        [string]$Name,
        [string]$TargetPath,
        [string]$Arguments,
        [string]$WorkingDirectory,
        [string]$IconLocation
    )

    $shortcutDir = Join-Path $env:ALLUSERSPROFILE "Microsoft\\Windows\\Start Menu\\Programs"
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

if ($shortcuts.Count -eq 0) {
    Write-Host "No shortcuts to create." -ForegroundColor Yellow
    exit 0
}

Write-Host "Creating Start Menu shortcuts..." -ForegroundColor Cyan
foreach ($sc in $shortcuts) {
    if ([string]::IsNullOrWhiteSpace($sc.Name) -or [string]::IsNullOrWhiteSpace($sc.TargetPath)) {
        Write-Host "[WARN] Skipped shortcut with missing name or target." -ForegroundColor Yellow
        continue
    }
    try {
        $path = New-Shortcut -Name $sc.Name -TargetPath $sc.TargetPath -Arguments $sc.Arguments -WorkingDirectory $sc.WorkingDirectory -IconLocation $sc.IconLocation
        Write-Host "[OK] Created: $($sc.Name) -> $path" -ForegroundColor Green
    }
    catch {
        Write-Host "[WARN] Failed to create: $($sc.Name) - $($_.Exception.Message)" -ForegroundColor Yellow
    }
}
`;

    const configName = dom.get('configName').value.trim();
    const suffix = configName ? configName.replace(/\s+/g, '-').replace(/[<>:"/\\|?*]/g, '') : 'Config';
    downloadFile(ps1, `CreateShortcuts_${suffix}.ps1`, 'text/plain');
}

function downloadStartLayoutXml() {
    if (!showValidation()) {
        if (!confirm('Configuration has errors. Download anyway?')) return;
    }

    const layoutXml = buildStartLayoutXml();
    if (!layoutXml) {
        if (!confirm('No Start menu pins configured. Download empty Start layout anyway?')) return;
    }

    const content = layoutXml || `<?xml version="1.0" encoding="utf-8"?>\n` +
        `<LayoutModificationTemplate Version="1"\n` +
        `    xmlns="http://schemas.microsoft.com/Start/2014/LayoutModification"\n` +
        `    xmlns:defaultlayout="http://schemas.microsoft.com/Start/2014/FullDefaultLayout"\n` +
        `    xmlns:start="http://schemas.microsoft.com/Start/2014/StartLayout">\n` +
        `    <LayoutOptions StartTileGroupCellWidth="6"/>\n` +
        `    <DefaultLayoutOverride>\n` +
        `        <StartLayoutCollection>\n` +
        `            <defaultlayout:StartLayout GroupCellWidth="6">\n` +
        `                <start:Group Name="Kiosk"/>\n` +
        `            </defaultlayout:StartLayout>\n` +
        `        </StartLayoutCollection>\n` +
        `    </DefaultLayoutOverride>\n` +
        `</LayoutModificationTemplate>`;

    const configName = dom.get('configName').value.trim();
    const suffix = configName ? configName.replace(/\s+/g, '-').replace(/[<>:"/\\|?*]/g, '') : 'Config';
    downloadFile(content, `StartLayout_${suffix}.xml`, 'application/xml');
}


function generateReadme() {
    const configName = dom.get('configName').value.trim();
    const profileId = dom.get('profileId').value || '(not set)';
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
        const displayName = dom.get('displayName').value || 'Kiosk User';
        readme += `**Type:** Auto Logon (Managed)\n`;
        readme += `**Display Name:** ${displayName}\n\n`;
    } else {
        const accountName = dom.get('accountName').value || '(not set)';
        readme += `**Type:** Existing Account\n`;
        readme += `**Account:** ${accountName}\n\n`;
    }

    if (state.mode === 'single') {
        // Single-App details
        readme += `## Application\n\n`;
        const appType = dom.get('appType').value;

        if (appType === 'edge') {
            const sourceType = dom.get('edgeSourceType').value;
            const url = sourceType === 'url'
                ? dom.get('edgeUrl').value
                : dom.get('edgeFilePath').value;
            const kioskType = dom.get('edgeKioskType').value;

            readme += `**App:** Microsoft Edge (Kiosk Mode)\n`;
            readme += `**URL:** ${url || '(not set)'}\n`;
            readme += `**Kiosk Type:** ${kioskType === 'fullscreen' ? 'Fullscreen (Digital Signage)' : 'Public Browsing'}\n`;
            readme += `**InPrivate Mode:** Always enabled (automatic in kiosk mode)\n\n`;
        } else if (appType === 'uwp') {
            const aumid = dom.get('uwpAumid').value;
            readme += `**App:** UWP/Store App\n`;
            readme += `**AUMID:** ${aumid || '(not set)'}\n\n`;
        } else {
            const path = dom.get('win32Path').value;
            const args = dom.get('win32Args').value;
            readme += `**App:** Win32 Desktop App\n`;
            readme += `**Path:** ${path || '(not set)'}\n`;
            if (args) readme += `**Arguments:** ${args}\n`;
            readme += `\n`;
        }

        // Breakout sequence
        const breakoutEnabled = dom.get('enableBreakout').checked;
        if (breakoutEnabled) {
            const breakoutPreview = dom.get('breakoutPreview').textContent;
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
                const sourceType = dom.get('multiEdgeSourceType').value;
                const url = sourceType === 'url'
                    ? dom.get('multiEdgeUrl').value
                    : dom.get('multiEdgeFilePath').value;
                const kioskType = dom.get('multiEdgeKioskType').value;

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
        const showTaskbar = dom.get('showTaskbar').checked;
        const fileExplorer = dom.get('fileExplorerAccess').value;

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
    dom.get('importInput').click();
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
    const root = doc.documentElement;
    if (!root || root.localName !== 'AssignedAccessConfiguration') {
        throw new Error('Only AssignedAccess configuration XML files are supported.');
    }

    // Profile ID
    const profile = doc.querySelector('Profile');
    if (profile) {
        dom.get('profileId').value = profile.getAttribute('Id') || '';
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
            dom.get('appType').value = 'edge';
            updateAppTypeUI();

            if (classicArgs) {
                // Parse Edge arguments
                const urlMatch = classicArgs.match(/--kiosk\s+(\S+)/);
                if (urlMatch) {
                    const extractedUrl = urlMatch[1];
                    // Check if it's a file:// URL
                    if (extractedUrl.toLowerCase().startsWith('file:///')) {
                        dom.get('edgeSourceType').value = 'file';
                        // Decode the file path and remove file:/// prefix
                        let filePath = extractedUrl.substring(8); // Remove 'file:///'
                        filePath = decodeURIComponent(filePath);
                        dom.get('edgeFilePath').value = filePath;
                        dom.get('edgeUrl').value = '';
                    } else {
                        dom.get('edgeSourceType').value = 'url';
                        dom.get('edgeUrl').value = extractedUrl;
                        dom.get('edgeFilePath').value = '';
                    }
                    updateEdgeSourceUI();
                }

                dom.get('edgeKioskType').value =
                    classicArgs.includes('public-browsing') ? 'public-browsing' : 'fullscreen';
                // InPrivate is always enabled in kiosk mode, no need to import this setting
            }
        } else if (aumid) {
            dom.get('appType').value = 'uwp';
            updateAppTypeUI();
            dom.get('uwpAumid').value = aumid;
        } else {
            // Win32 app - check for ClassicAppPath
            const classicAppPath = kioskModeApp.getAttributeNS('http://schemas.microsoft.com/AssignedAccess/2021/config', 'ClassicAppPath') ||
                                  kioskModeApp.getAttribute('v4:ClassicAppPath');
            if (classicAppPath) {
                dom.get('appType').value = 'win32';
                updateAppTypeUI();
                dom.get('win32Path').value = classicAppPath;
                dom.get('win32Args').value = classicArgs || '';
            }
        }

        // Import BreakoutSequence if present (handle namespace prefix)
        const breakoutSequence = doc.querySelector('BreakoutSequence, [*|BreakoutSequence]') ||
                                Array.from(doc.querySelectorAll('*')).find(el => el.localName === 'BreakoutSequence');
        const breakoutKey = breakoutSequence ? breakoutSequence.getAttribute('Key') : null;
        if (breakoutKey) {
            dom.get('enableBreakout').checked = true;
            updateBreakoutUI();

            // Parse the key combination (e.g., "Ctrl+Alt+K")
            const parts = breakoutKey.split('+');
            const finalKey = parts[parts.length - 1].toUpperCase();

            dom.get('breakoutCtrl').checked = breakoutKey.toLowerCase().includes('ctrl');
            dom.get('breakoutAlt').checked = breakoutKey.toLowerCase().includes('alt');
            dom.get('breakoutShift').checked = breakoutKey.toLowerCase().includes('shift');

            // Set the final key if it's a valid option
            const finalKeySelect = dom.get('breakoutFinalKey');
            for (let option of finalKeySelect.options) {
                if (option.value === finalKey) {
                    finalKeySelect.value = finalKey;
                    break;
                }
            }
            updateBreakoutPreview();
        } else {
            dom.get('enableBreakout').checked = false;
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
                                dom.get('multiEdgeSourceType').value = 'file';
                                let filePath = extractedUrl.substring(8);
                                filePath = decodeURIComponent(filePath);
                                dom.get('multiEdgeFilePath').value = filePath;
                                dom.get('multiEdgeUrl').value = '';
                            } else {
                                dom.get('multiEdgeSourceType').value = 'url';
                                dom.get('multiEdgeUrl').value = extractedUrl;
                                dom.get('multiEdgeFilePath').value = '';
                            }
                            updateMultiEdgeSourceUI();
                        }

                        dom.get('multiEdgeKioskType').value =
                            autoLaunchArgs.includes('public-browsing') ? 'public-browsing' : 'fullscreen';
                        // InPrivate is always enabled in kiosk mode, no need to import this setting
                    } else if (path) {
                        // Non-Edge Win32 app - populate win32 args field
                        dom.get('win32AutoLaunchArgs').value = autoLaunchArgs;
                    }
                }
            }
            appIndex++;
        });
        renderAppList();
        updateAutoLaunchSelector();
        // Restore auto-launch selection after selector is populated
        if (state.autoLaunchApp !== null) {
            dom.get('autoLaunchApp').value = state.autoLaunchApp;
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
                            // Try to extract name from path (e.g., %ALLUSERSPROFILE%\Microsoft\Windows\Start Menu\Programs\Name.lnk)
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
                                target: '', // Unknown from XML, user needs to set if no .lnk is available
                                systemShortcut: path,
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
            dom.get('showTaskbar').checked =
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
                dom.get('fileExplorerAccess').value = 'all';
            } else if (downloads && removable) {
                dom.get('fileExplorerAccess').value = 'downloads-removable';
            } else if (downloads) {
                dom.get('fileExplorerAccess').value = 'downloads';
            } else if (removable) {
                dom.get('fileExplorerAccess').value = 'removable';
            } else {
                dom.get('fileExplorerAccess').value = 'none';
            }
        } else {
            dom.get('fileExplorerAccess').value = 'none';
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
        dom.get('displayName').value = displayName || '';
    } else if (account) {
        setAccountType('existing');
        dom.get('accountName').value = account.textContent || '';
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
    dom.get('configName').value = '';

    // Reset multi-app Edge config
    dom.get('multiEdgeSourceType').value = 'url';
    dom.get('multiEdgeUrl').value = '';
    dom.get('multiEdgeFilePath').value = '';
    dom.get('multiEdgeKioskType').value = 'fullscreen';
    dom.get('win32AutoLaunchArgs').value = '';
    updateMultiEdgeSourceUI();

    switch (preset) {
        case 'blank':
            setMode('single');
            setAccountType('auto');
            generateGuid();
            dom.get('displayName').value = '';
            dom.get('appType').value = 'edge';
            dom.get('edgeSourceType').value = 'url';
            dom.get('edgeUrl').value = '';
            dom.get('edgeFilePath').value = '';
            dom.get('edgeKioskType').value = 'fullscreen';
            updateAppTypeUI();
            updateEdgeSourceUI();
            break;

        case 'edgeFullscreen':
            setMode('single');
            setAccountType('auto');
            generateGuid();
            dom.get('displayName').value = 'Kiosk';
            dom.get('appType').value = 'edge';
            dom.get('edgeSourceType').value = 'url';
            dom.get('edgeUrl').value = 'https://www.microsoft.com';
            dom.get('edgeFilePath').value = '';
            dom.get('edgeKioskType').value = 'fullscreen';
            updateAppTypeUI();
            updateEdgeSourceUI();
            break;

        case 'edgePublic':
            setMode('single');
            setAccountType('auto');
            generateGuid();
            dom.get('displayName').value = 'Public Browsing';
            dom.get('appType').value = 'edge';
            dom.get('edgeSourceType').value = 'url';
            dom.get('edgeUrl').value = 'https://www.bing.com';
            dom.get('edgeFilePath').value = '';
            dom.get('edgeKioskType').value = 'public-browsing';
            updateAppTypeUI();
            updateEdgeSourceUI();
            break;

        case 'multiApp':
            setMode('multi');
            setAccountType('auto');
            generateGuid();
            dom.get('displayName').value = 'Multi-App Kiosk';
            addCommonApp('edge');
            addCommonApp('osk');
            addCommonApp('calculator');
            dom.get('showTaskbar').checked = true;
            dom.get('fileExplorerAccess').value = 'downloads';
            break;

    }

    updateAppTypeUI();
    renderAppList();
    if (dom.get('autoPinAllowed')?.checked && (state.mode === 'multi' || state.mode === 'restricted')) {
        syncAutoPins();
    }
    updateAutoLaunchSelector();
    updatePreview();
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

    document.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        runAction(target.dataset.action, target, event);
    });

    document.addEventListener('change', (event) => {
        const target = event.target.closest('[data-change]');
        if (!target) return;
        runActions(target.dataset.change, target, event);
    });

    const lastUpdatedEl = dom.get('lastUpdated');
    if (lastUpdatedEl) {
        const modified = new Date(document.lastModified);
        lastUpdatedEl.textContent = formatLastUpdated(modified);
    }

    updateBrowserPinModeUI();

    // Add tooltip positioning on hover/focus
    document.querySelectorAll('.tooltip-icon').forEach(icon => {
        icon.addEventListener('mouseenter', () => positionTooltip(icon));
        icon.addEventListener('focus', () => positionTooltip(icon));
    });
});
