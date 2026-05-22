const keiyomiApi = window.keiyomi;

if (!keiyomiApi) {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.add('hidden');
    throw new Error('Preload API window.keiyomi tidak tersedia.');
}

const ipcRenderer = {
    invoke: (...args) => keiyomiApi.invoke(...args),
    send: (...args) => keiyomiApi.send(...args)
};
const path = keiyomiApi.path;
const fs = keiyomiApi.files;
const shell = keiyomiApi.shell;
const MIN_SPLASH_MS = 3600;

const btnPilihFile = document.getElementById('btn-pilih-file');
const btnCreateFolder = document.getElementById('btn-create-folder');
const btnExitApp = document.getElementById('btn-exit-app');
const btnBack = document.getElementById('btn-back');
const btnRefresh = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search-input');
const readerSettingsContainer = document.getElementById('reader-settings-container');
const btnSettingsFab = document.getElementById('btn-settings-fab');
const settingsPopup = document.getElementById('settings-popup');
const radioWebtoon = document.getElementById('mode-webtoon');
const radioPages = document.getElementById('mode-pages');
const sortSelect = document.getElementById('sort-select');
const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
const pageTitle = document.getElementById('page-title');
const reader = document.getElementById('reader');
const nightLightOverlay = document.getElementById('night-light-overlay');
const settingNightIntensity = document.getElementById('setting-night-intensity');
const settingPdfQuality = document.getElementById('setting-pdf-quality');
const settingAutoCover = document.getElementById('setting-auto-cover');
const btnToggleNightmode = document.getElementById('btn-toggle-nightmode');
const btnReaderSearchToggle = document.getElementById('btn-reader-search-toggle');
const readerSearchPanel = document.getElementById('reader-search-panel');
const readerSearchInput = document.getElementById('reader-search-input');
const btnReaderSearch = document.getElementById('btn-reader-search');
const btnReaderSearchPrev = document.getElementById('btn-reader-search-prev');
const btnReaderSearchNext = document.getElementById('btn-reader-search-next');
const btnReaderSearchClose = document.getElementById('btn-reader-search-close');
const readerSearchStatus = document.getElementById('reader-search-status');
const btnResetNightIntensity = document.getElementById('btn-reset-night-intensity');
const btnPreviewNightIntensity = document.getElementById('btn-preview-night-intensity');
const scrollProgressIndicator = document.getElementById('scroll-progress-indicator');
const pageJumpControl = document.getElementById('page-jump-control');
const pageJumpSlider = document.getElementById('page-jump-slider');
const pageJumpInput = document.getElementById('page-jump-input');
const pageJumpCurrent = document.getElementById('page-jump-current');
const pageJumpTotal = document.getElementById('page-jump-total');
const pageJumpPrev = document.getElementById('page-jump-prev');
const pageJumpNext = document.getElementById('page-jump-next');
const togglePageSlider = document.getElementById('toggle-page-slider');
const toggleReadingProgress = document.getElementById('toggle-reading-progress');

// Modal Elements
const modalAddBook = document.getElementById('add-book-modal');
const inputTitle = document.getElementById('input-title');
const inputAuthor = document.getElementById('input-author');
const inputCover = document.getElementById('input-cover');
const btnBrowseCover = document.getElementById('btn-browse-cover');
const inputType = document.getElementById('input-type');
const inputDate = document.getElementById('input-date');
const groupDate = document.getElementById('group-date');
const genreContainer = document.getElementById('genre-container');
const inputSynopsis = document.getElementById('input-synopsis');
const btnCancelAdd = document.getElementById('btn-cancel-add');
const btnSaveAdd = document.getElementById('btn-save-add');

// Add Chapter Modal Elements
const modalAddChapter = document.getElementById('add-chapter-modal');
const inputChapterName = document.getElementById('input-chapter-name');
const inputChapterPath = document.getElementById('input-chapter-path');
const btnBrowseChapter = document.getElementById('btn-browse-chapter');
const btnCancelChapter = document.getElementById('btn-cancel-chapter');
const btnSaveChapter = document.getElementById('btn-save-chapter');
let currentAddingBookId = null;

// Edit Book Modal Elements
const modalEditBook = document.getElementById('edit-book-modal');
const inputEditTitle = document.getElementById('input-edit-title');
const inputEditAuthor = document.getElementById('input-edit-author');
const inputEditCover = document.getElementById('input-edit-cover');
const btnBrowseEditCover = document.getElementById('btn-browse-edit-cover');
const btnRemoveEditCover = document.getElementById('btn-remove-edit-cover');
const inputEditType = document.getElementById('input-edit-type');
const inputEditDate = document.getElementById('input-edit-date');
const groupEditDate = document.getElementById('group-edit-date');
const genreEditContainer = document.getElementById('genre-edit-container');
const inputEditSynopsis = document.getElementById('input-edit-synopsis');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const btnSaveEdit = document.getElementById('btn-save-edit');
let currentEditingBookId = null;

// Create Folder Modal Elements
const modalCreateFolder = document.getElementById('create-folder-modal');
const inputCfFolder = document.getElementById('input-cf-folder');
const inputCfLocation = document.getElementById('input-cf-location');
const inputCfAuthor = document.getElementById('input-cf-author');
const inputCfCover = document.getElementById('input-cf-cover');
const btnBrowseCfCover = document.getElementById('btn-browse-cf-cover');
const inputCfType = document.getElementById('input-cf-type');
const inputCfDate = document.getElementById('input-cf-date');
const groupCfDate = document.getElementById('group-cf-date');
const genreCfContainer = document.getElementById('genre-cf-container');
const inputCfSynopsis = document.getElementById('input-cf-synopsis');
const btnCancelCf = document.getElementById('btn-cancel-cf');
const btnSaveCf = document.getElementById('btn-save-cf');

// Context Menu Elements
const contextMenu = document.getElementById('context-menu');
const ctxDelete = document.getElementById('ctx-delete');
let contextMenuBook = null;

let currentBookPath = null;
let readerSearchIndex = [];
let readerSearchMatches = [];
let readerSearchMatchIndex = -1;
let saveTimeout;
let nightModeSaveTimeout;
let nightModeSettingsPreview = false;
let currentRenderId = 0;
let isReaderLoading = false;
let activeObjectUrls = [];
let hasSeenFullscreenTip = false;

// --- CUSTOM MODAL DIALOGS ---
function customAlert(message, title = "Pemberitahuan") {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        document.getElementById('custom-alert-title').innerText = title;
        document.getElementById('custom-alert-message').innerText = message;
        modal.classList.add('show');

        const btnOk = document.getElementById('btn-custom-alert-ok');
        const clickHandler = () => {
            btnOk.removeEventListener('click', clickHandler);
            modal.classList.remove('show');
            resolve();
        };
        btnOk.addEventListener('click', clickHandler);
    });
}

function customConfirm(message, title = "Konfirmasi", okText = "Ya", cancelText = "Batal") {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        document.getElementById('custom-confirm-title').innerText = title;
        document.getElementById('custom-confirm-message').innerText = message;

        const btnOk = document.getElementById('btn-custom-confirm-ok');
        const btnCancel = document.getElementById('btn-custom-confirm-cancel');

        btnOk.innerText = okText;
        btnCancel.innerText = cancelText;

        modal.classList.add('show');

        const cleanUp = () => {
            btnOk.removeEventListener('click', okHandler);
            btnCancel.removeEventListener('click', cancelHandler);
            modal.classList.remove('show');
        };

        const okHandler = () => { cleanUp(); resolve(true); };
        const cancelHandler = () => { cleanUp(); resolve(false); };

        btnOk.addEventListener('click', okHandler);
        btnCancel.addEventListener('click', cancelHandler);
    });
}

function customPrompt(message, defaultValue = "", title = "Edit", okText = "Simpan", cancelText = "Batal") {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-prompt-modal');
        const input = document.getElementById('custom-prompt-input');
        const btnOk = document.getElementById('btn-custom-prompt-ok');
        const btnCancel = document.getElementById('btn-custom-prompt-cancel');

        document.getElementById('custom-prompt-title').innerText = title;
        document.getElementById('custom-prompt-message').innerText = message;
        input.value = defaultValue;
        btnOk.innerText = okText;
        btnCancel.innerText = cancelText;

        modal.classList.add('show');
        input.focus();
        input.select();

        const cleanUp = () => {
            btnOk.removeEventListener('click', okHandler);
            btnCancel.removeEventListener('click', cancelHandler);
            input.removeEventListener('keydown', keyHandler);
            modal.classList.remove('show');
        };

        const okHandler = () => { const value = input.value; cleanUp(); resolve(value); };
        const cancelHandler = () => { cleanUp(); resolve(null); };
        const keyHandler = (event) => {
            if (event.key === 'Enter') okHandler();
            if (event.key === 'Escape') cancelHandler();
        };

        btnOk.addEventListener('click', okHandler);
        btnCancel.addEventListener('click', cancelHandler);
        input.addEventListener('keydown', keyHandler);
    });
}

// --- TOAST NOTIFICATION ---
function showToast(message, duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    toast.style.animation = 'toastFadeIn 0.3s ease-out forwards';
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s ease-out forwards';
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300);
    }, duration);
}

// --- DATA MANAGEMENT ---
let libraryData = [];
let riwayatBacaan = [];
let isWebtoonMode = true;
let userSettings = { username: '', theme: 'light', language: 'id', customFolders: [], ignoredPaths: [], nightModeEnabled: false, nightModeIntensity: 50, pdfQualityMode: 'light', autoCoverEnabled: false, showPageSlider: false, showReadingProgress: false };

function isManualImportedBook(book) {
    return book && (book.importSource === 'manual' || book.isManualImport === true || !book.structureType);
}

function normalizeLoadedBook(book) {
    if (!book || typeof book !== 'object') return null;

    const normalizedBook = { ...book };
    if (!normalizedBook.structureType && !normalizedBook.importSource) {
        normalizedBook.importSource = 'manual';
    }

    return normalizedBook;
}

async function loadData() {
    const data = await ipcRenderer.invoke('data:load');
    if (data) {
        libraryData = (data.library || []).map(normalizeLoadedBook).filter(Boolean);
        riwayatBacaan = data.history || [];
        isWebtoonMode = data.mode !== 'normal';
        userSettings.username = data.username || '';
        userSettings.theme = data.theme || 'light';
        userSettings.language = data.language || 'id';
        userSettings.customFolders = data.customFolders || [];
        userSettings.ignoredPaths = data.ignoredPaths || [];
        userSettings.nightModeEnabled = data.nightModeEnabled || false;
        userSettings.nightModeIntensity = data.nightModeIntensity !== undefined ? data.nightModeIntensity : 50;
        userSettings.pdfQualityMode = data.pdfQualityMode === 'original' ? 'original' : 'light';
        userSettings.autoCoverEnabled = data.autoCoverEnabled === true;
        userSettings.showPageSlider = data.showPageSlider === true;
        userSettings.showReadingProgress = data.showReadingProgress === true;
    } else {
        libraryData = [];
        riwayatBacaan = [];
    }
    applyTheme(userSettings.theme);
    applyLanguage(userSettings.language);
    settingNightIntensity.value = userSettings.nightModeIntensity;
    if (settingPdfQuality) settingPdfQuality.value = userSettings.pdfQualityMode;
    if (settingAutoCover) settingAutoCover.checked = userSettings.autoCoverEnabled === true;
    applyNightMode();
    updateNightModeButton();
    updateReaderControlButtons();
}

async function saveData() {
    const data = {
        library: libraryData,
        history: riwayatBacaan,
        mode: isWebtoonMode ? 'webtoon' : 'normal',
        username: userSettings.username,
        theme: userSettings.theme,
        language: userSettings.language,
        customFolders: userSettings.customFolders,
        ignoredPaths: userSettings.ignoredPaths,
        nightModeEnabled: userSettings.nightModeEnabled,
        nightModeIntensity: userSettings.nightModeIntensity,
        pdfQualityMode: userSettings.pdfQualityMode,
        autoCoverEnabled: userSettings.autoCoverEnabled === true,
        showPageSlider: userSettings.showPageSlider,
        showReadingProgress: userSettings.showReadingProgress
    };
    return await ipcRenderer.invoke('data:save', data);
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
    } else {
        document.body.removeAttribute('data-theme');
    }
}

// --- TRANSLATION LOGIC ---
let translations = {};

async function loadTranslations() {
    try {
        translations = await keiyomiApi.loadTranslations();
    } catch (error) {
        console.error("Gagal memuat file bahasa:", error);
        translations.en = { "nav_library": "Library" };
        translations.id = { "nav_library": "Pustaka" };
    }
}

function t(key) {
    return (translations[userSettings.language] && translations[userSettings.language][key]) || key;
}

function applyLanguage(lang) {
    const texts = translations[lang];
    if (!texts) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[key]) el.innerText = texts[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (texts[key]) el.placeholder = texts[key];
    });
    switchTab(currentView);
}
