const { ipcRenderer } = require('electron');
const path = require('path');
const { promises: fs } = require('fs');

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
const pageTitle = document.getElementById('page-title');
const reader = document.getElementById('reader');

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
let saveTimeout;
let currentRenderId = 0; 
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
let userSettings = { username: '', theme: 'light', language: 'id', customFolders: [], ignoredPaths: [] };

async function loadData() {
    const data = await ipcRenderer.invoke('data:load');
    if (data) {
        libraryData = data.library || [];
        riwayatBacaan = data.history || [];
        isWebtoonMode = data.mode !== 'normal';
        userSettings.username = data.username || '';
        userSettings.theme = data.theme || 'light';
        userSettings.language = data.language || 'id';
        userSettings.customFolders = data.customFolders || [];
        userSettings.ignoredPaths = data.ignoredPaths || [];
    } else {
        libraryData = [];
        riwayatBacaan = [];
    }
    applyTheme(userSettings.theme);
    applyLanguage(userSettings.language);
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
        ignoredPaths: userSettings.ignoredPaths
    };
    await ipcRenderer.invoke('data:save', data);
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
        const idPath = path.join(__dirname, '../Lang/id.json');
        const enPath = path.join(__dirname, '../Lang/en.json');

        const idData = await fs.readFile(idPath, 'utf8');
        const enData = await fs.readFile(enPath, 'utf8');

        translations.id = JSON.parse(idData);
        translations.en = JSON.parse(enData);
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

// --- NAVIGATION LOGIC ---
let currentView = 'library'; 

function switchTab(tabName) {
    currentView = tabName;
    document.querySelectorAll('.view-section, .reader-container').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    btnBack.style.display = 'none';
    searchInput.style.display = 'block';
    readerSettingsContainer.style.display = 'none';
    btnRefresh.style.display = 'none';
    searchInput.value = ''; 

    if (tabName === 'library') {
        document.getElementById('view-library').style.display = 'block';
        document.querySelector('.nav-item:nth-child(1)').classList.add('active');
        pageTitle.innerText = t('page_library');
        btnRefresh.style.display = 'block';
        renderLibrarySorted();
    } else if (tabName === 'history') {
        document.getElementById('view-history').style.display = 'block';
        document.querySelector('.nav-item:nth-child(2)').classList.add('active');
        pageTitle.innerText = t('page_history');
        renderGrid(riwayatBacaan, 'history-grid');
    } else if (tabName === 'favorites') {
        document.getElementById('view-favorites').style.display = 'block';
        document.querySelector('.nav-item:nth-child(3)').classList.add('active');
        pageTitle.innerText = t('page_favorites');
        const favorites = libraryData.filter(b => b.isFavorite);
        renderGrid(favorites, 'favorites-grid');
    } else if (tabName === 'explore') {
        document.getElementById('view-explore').style.display = 'block';
        document.querySelector('.nav-item:nth-child(4)').classList.add('active');
        pageTitle.innerText = t('page_explore');
        searchInput.style.display = 'block';
        renderExplore();
    } else if (tabName === 'settings') {
        document.getElementById('view-settings').style.display = 'block';
        document.querySelector('.nav-item:nth-child(5)').classList.add('active');
        pageTitle.innerText = t('page_settings');
        searchInput.style.display = 'none';
        
        document.getElementById('setting-username').value = userSettings.username;
        document.getElementById('setting-theme').value = userSettings.theme;
        document.getElementById('setting-mode').value = isWebtoonMode ? 'webtoon' : 'normal';
        document.getElementById('setting-language').value = userSettings.language;
        renderCustomFolders();
        renderIgnoredPaths();
    }
}

// --- SORTING LOGIC ---
sortSelect.addEventListener('change', () => { renderLibrarySorted(); });

function renderLibrarySorted() {
    const criteria = sortSelect.value;
    let sortedData = [...libraryData];

    sortedData.sort((a, b) => {
        switch (criteria) {
            case 'name_asc': return a.title.localeCompare(b.title);
            case 'name_desc': return b.title.localeCompare(a.title);
            case 'date_new': return new Date(b.date || 0) - new Date(a.date || 0);
            case 'date_old': return new Date(a.date || 0) - new Date(b.date || 0);
            case 'recent':
                const indexA = riwayatBacaan.findIndex(r => r.path === a.path);
                const indexB = riwayatBacaan.findIndex(r => r.path === b.path);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return a.title.localeCompare(b.title);
            default: return 0;
        }
    });

    const keyword = searchInput.value.toLowerCase();
    if (keyword) {
        sortedData = sortedData.filter(b => b.title.toLowerCase().includes(keyword));
    }
    renderGrid(sortedData, 'library-grid');
}

        // --- SEARCH LOGIC ---
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            if (currentView === 'library') {
                renderLibrarySorted();
            } else if (currentView === 'history') {
                const filtered = riwayatBacaan.filter(b => b.title.toLowerCase().includes(keyword));
                renderGrid(filtered, 'history-grid');
            } else if (currentView === 'favorites') {
                const filtered = libraryData.filter(b => b.isFavorite && b.title.toLowerCase().includes(keyword));
                renderGrid(filtered, 'favorites-grid');
            } else if (currentView === 'explore') {
                const filtered = libraryData.filter(b => 
                    b.title.toLowerCase().includes(keyword) || 
                    (b.genre && b.genre.toLowerCase().includes(keyword))
                );
                renderGrid(filtered, 'explore-grid');
            }
        });

        // --- BACK BUTTON LOGIC ---
        btnBack.addEventListener('click', () => {
            if (reader.style.display === 'flex') {
                let book = libraryData.find(b => {
                    if (b.path === currentBookPath) return true;
                    if (b.chapters && b.chapters.some(c => c.path === currentBookPath)) return true;
                    return false;
                });

                if (!book) {
                    book = riwayatBacaan.find(b => b.path === currentBookPath);
                }

                if (book) {
                    showBookDetail(book);
                } else {
                    switchTab(currentView);
                }
            } else {
                switchTab(currentView);
            }
        });

        // --- REFRESH / SCAN LOGIC ---
        btnRefresh.addEventListener('click', async () => {
            await scanLocalFolder();
            renderLibrarySorted();
        });

        // --- RENDER FUNCTIONS ---
        function renderGrid(data, elementId) {
            const grid = document.getElementById(elementId);
            grid.innerHTML = '';
            
            if(data.length === 0) {
                grid.innerHTML = `<p style="color:#94a3b8; grid-column: 1/-1; text-align:center; padding-top: 20px;">${t('msg_empty_library')}</p>`;
                return;
            }

            const fragment = document.createDocumentFragment();
            data.forEach(book => {
                const card = createBookCard(book);
                fragment.appendChild(card);
            });
            grid.appendChild(fragment);
        }

        function createBookCard(book) {
            const div = document.createElement('div');
            div.className = 'book-card';
            
            let coverSrc = '';
            if (book.cover) {
                if (path.isAbsolute(book.cover)) {
                    coverSrc = book.cover;
                } else {
                    coverSrc = path.join(book.path, book.cover);
                }
                coverSrc = coverSrc.replace(/\\/g, '/');
                if (!coverSrc.startsWith('file://')) coverSrc = `file://${coverSrc}`;
            }
            
            const coverHtml = coverSrc ? `<img src="${coverSrc}" class="book-cover" style="object-fit:cover;" loading="lazy" decoding="async">` : `<div class="book-cover">📖</div>`;

            div.innerHTML = `
                ${coverHtml}
                <div class="book-info">
                    <div class="book-title">${book.title}</div>
                    <div class="book-meta">${book.genre || t('msg_unknown_genre')}</div>
                </div>
            `;
            div.addEventListener('click', () => showBookDetail(book));
            div.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e.pageX, e.pageY, book);
            });
            return div;
        }

        function showBookDetail(book) {
            document.querySelectorAll('.view-section, .reader-container').forEach(el => el.style.display = 'none');
            const detailView = document.getElementById('view-detail');
            detailView.style.display = 'block';
            pageTitle.innerText = t('page_detail');
            
            btnBack.style.display = 'block';
            searchInput.style.display = 'none';
            readerSettingsContainer.style.display = 'none';
            btnRefresh.style.display = 'none';

            let coverSrc = '';
            if (book.cover) {
                if (path.isAbsolute(book.cover)) {
                    coverSrc = book.cover;
                } else {
                    coverSrc = path.join(book.path, book.cover);
                }
                coverSrc = coverSrc.replace(/\\/g, '/');
                if (!coverSrc.startsWith('file://')) coverSrc = `file://${coverSrc}`;
            }
            const coverStyle = coverSrc 
                ? `background-image: url('${coverSrc}'); background-size: cover; color: transparent;` 
                : `display:flex;align-items:center;justify-content:center;font-size:4rem;color:#fff;background:#64748b;`;

            let chapterListHtml = '';
            let chapterCount = 0;

            const readPaths = new Set(riwayatBacaan.map(r => r.path));
            
            if (book.structureType === 'series' || (book.chapters && book.chapters.length > 0)) {
                if (book.chapters && book.chapters.length > 0) {
                    chapterCount = book.chapters.length;
                    book.chapters.forEach((chap, index) => {
                        const safePath = chap.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                        const safeTitle = `${book.title} - ${chap.name}`.replace(/'/g, "\\'");
                        const isChapFav = chap.isFavorite;
                        const starColor = isChapFav ? '#eab308' : 'currentColor';
                        const starFill = isChapFav ? '#eab308' : 'none';

                        const isRead = readPaths.has(chap.path);
                        const readClass = isRead ? 'chapter-read' : '';
                        const checkColor = isRead ? '#3b82f6' : '#94a3b8';
                        chapterListHtml += `
                        <div class="chapter-row ${readClass}" onclick="bacaFile('${safePath}', '${safeTitle}')" style="cursor: pointer;">
                            <div style="flex-grow: 1;"><span class="chapter-name">${chap.name}</span></div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div title="${isRead ? 'Sudah Dibaca' : 'Belum Dibaca'}" style="color: ${checkColor}; display: flex; cursor: pointer;" onclick="event.stopPropagation(); toggleReadStatus(${book.id}, ${index})">
                                    <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>
                                </div>
                                <button class="btn-icon" onclick="event.stopPropagation(); toggleChapterFavorite(${book.id}, ${index})" title="${isChapFav ? t('msg_unmark_fav') : t('msg_mark_fav')}">
                                    <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:${starColor};fill:${starFill};stroke-width:2"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                                </button>
                            </div>
                        </div>`;
                    });
                } else {
                    chapterCount = 0;
                    chapterListHtml = `<div class="chapter-row" style="cursor: default; justify-content: center;"><span class="chapter-meta">${t('msg_no_chapters')}</span></div>`;
                }
            } else { 
                chapterCount = 1;
                const safePath = book.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const safeTitle = book.title.replace(/'/g, "\\'");
                
                const isRead = readPaths.has(book.path);
                const readClass = isRead ? 'chapter-read' : '';
                const checkColor = isRead ? '#3b82f6' : '#94a3b8';
                const isFav = book.isFavorite;
                const starColor = isFav ? '#eab308' : 'currentColor';
                const starFill = isFav ? '#eab308' : 'none';

                chapterListHtml = `
                <div class="chapter-row ${readClass}" onclick="bacaFile('${safePath}', '${safeTitle}')" style="cursor: pointer;">
                    <div style="flex-grow: 1;">
                        <span class="chapter-name">${t('msg_read_main')}</span>
                        <span class="chapter-meta" style="margin-left:8px; font-size:0.85rem; color:#94a3b8;">${t('msg_full')}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div title="${isRead ? 'Sudah Dibaca' : 'Belum Dibaca'}" style="color: ${checkColor}; display: flex; cursor: pointer;" onclick="event.stopPropagation(); toggleReadStatus(${book.id}, -1)">
                            <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>
                        </div>
                        <button class="btn-icon" onclick="event.stopPropagation(); toggleFavorite(${book.id})" title="${isFav ? t('msg_unmark_fav') : t('msg_mark_fav')}">
                            <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:${starColor};fill:${starFill};stroke-width:2"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                        </button>
                    </div>
                </div>`;
            }

            const isFav = book.isFavorite;
            
            const iconPlay = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
            const iconHeart = isFav ? `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>` : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
            const iconPlus = `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
            const iconEdit = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
            const iconTrash = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
            
            const favBtnClass = isFav ? 'btn-action btn-favorite-action active' : 'btn-action btn-favorite-action';
            
            let tagsHtml = '';
            if (book.genre) {
                tagsHtml = book.genre.split(',').map(g => `<span class="tag-pill">${g.trim()}</span>`).join('');
            }

            let targetPath = '';
            let targetTitle = '';
            let startButtonText = t('btn_start_read');

            if (book.chapters && book.chapters.length > 0) {
                const lastReadHistory = riwayatBacaan.find(h => book.chapters.some(c => c.path === h.path));
                if (lastReadHistory) {
                    const chapterInfo = book.chapters.find(c => c.path === lastReadHistory.path);
                    if (chapterInfo) {
                        targetPath = chapterInfo.path;
                        targetTitle = `${book.title} - ${chapterInfo.name}`;
                        startButtonText = `${t('btn_continue_read')}: ${chapterInfo.name}`;
                    }
                }
                if (!targetPath) {
                    const firstChapter = book.chapters[0];
                    targetPath = firstChapter.path;
                    targetTitle = `${book.title} - ${firstChapter.name}`;
                    startButtonText = t('btn_start_read');
                }
            } else {
                targetPath = book.path;
                targetTitle = book.title;
                const isInHistory = riwayatBacaan.some(h => h.path === book.path);
                startButtonText = isInHistory ? t('btn_continue_read') : t('btn_start_read');
            }

            const safeTargetPath = targetPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const safeTargetTitle = targetTitle.replace(/'/g, "\\'");

            const container = document.getElementById('detail-content');
            container.innerHTML = `
                <div class="comic-header">
                    <div class="detail-cover" style="${coverStyle}">📖</div>
                    <div class="detail-content">
                        <div class="detail-meta-top">
                            <span class="detail-type">${book.type || 'Book'}</span>
                        </div>
                        <h1 class="detail-title">${book.title}</h1>
                        <div class="detail-author">
                            <span>${t('detail_author')}:</span> ${book.author || t('msg_unknown_author')}
                        </div>
                        ${book.publishDate ? `<div class="detail-date">📅 ${t('detail_date')}: ${book.publishDate}</div>` : ''}
                        
                        <div class="detail-tags-container">
                            ${tagsHtml}
                        </div>

                        <div class="action-buttons">
                            <button class="btn-action btn-primary-action" onclick="bacaFile('${safeTargetPath}', '${safeTargetTitle}')">${iconPlay} ${startButtonText}</button>
                            <button class="${favBtnClass}" onclick="toggleFavorite(${book.id})">${iconHeart} ${t('btn_favorite')}</button>
                            <button class="btn-action btn-secondary-action" onclick="openAddChapterModal(${book.id})">${iconPlus} ${t('btn_chapter')}</button>
                            <button class="btn-action btn-secondary-action" onclick="openEditBookModal(${book.id})">${iconEdit} ${t('btn_edit')}</button>
                            <button class="btn-action btn-danger-action" onclick="deleteBook(${book.id})">${iconTrash} ${t('btn_delete')}</button>
                        </div>
                    </div>
                </div>
                
                <div class="detail-synopsis">
                    <div class="section-title">${t('detail_synopsis')}:</div>
                    <p class="synopsis-text">${book.synopsis || t('msg_no_synopsis')}</p>
                </div>

                <div class="chapter-list-container">
                    <div class="chapter-list-header">
                        <div class="section-title" style="margin-bottom:0">${t('detail_chapters')}:</div>
                        <div class="chapter-count">${chapterCount} ${t('detail_chapter_count')}</div>
                    </div>
                    <div class="chapter-grid">
                        ${chapterListHtml}
                    </div>
                </div>
            `;
        }

        window.openAddChapterModal = function(bookId) {
            currentAddingBookId = bookId;
            const book = libraryData.find(b => b.id === bookId);
            let nextNum = 1;
            if (book) {
                if (book.chapters) {
                    nextNum = book.chapters.length + 1;
                } else {
                    nextNum = 2;
                }
            }
            inputChapterName.value = `Chapter ${nextNum}`;
            inputChapterPath.value = '';
            modalAddChapter.classList.add('show');
        };

        btnCancelChapter.addEventListener('click', () => {
            modalAddChapter.classList.remove('show');
            currentAddingBookId = null;
        });

        btnBrowseChapter.addEventListener('click', async () => {
            const filePath = await ipcRenderer.invoke('dialog:openFile');
            if (filePath) {
                inputChapterPath.value = filePath;
                if (!inputChapterName.value) {
                    inputChapterName.value = path.basename(filePath, path.extname(filePath));
                }
            }
        });

    btnSaveChapter.addEventListener('click', async () => {
            if (!inputChapterName.value || !inputChapterPath.value) {
            await customAlert(t('msg_fill_chapter'));
                return;
            }

            const book = libraryData.find(b => b.id === currentAddingBookId);
            if (book) {
                if (!book.chapters) {
                    book.chapters = [];
                    if (book.path && !book.path.endsWith('info.json')) {
                        book.chapters.push({ name: 'Chapter 1', path: book.path });
                    }
                }
                book.chapters.push({ name: inputChapterName.value, path: inputChapterPath.value });
                saveData();
                showBookDetail(book);
                modalAddChapter.classList.remove('show');
            }
        });

        function updateEditGenreOptions() {
            const type = inputEditType.value;
            const genreGroup = genreEditContainer.parentElement;
            let genres = [];

            if (!type) {
                groupEditDate.style.display = 'none';
                genreGroup.style.display = 'none';
            } else if (type === 'Artikel') {
                genres = genreLists.artikel;
                groupEditDate.style.display = 'block';
                genreGroup.style.display = 'none';
            } else if (type === 'Journal') {
                genres = genreLists.journal;
                groupEditDate.style.display = 'block';
                genreGroup.style.display = 'none';
            } else {
                groupEditDate.style.display = 'none';
                genreGroup.style.display = 'block';
                genres = [...genreLists.commonComic];
                if (type === 'Manga') genres.push(...genreLists.manga);
                if (type === 'Manhwa') genres.push(...genreLists.manhwa);
                if (type === 'Manhua') genres.push(...genreLists.manhua);
                if (type === 'Novel') genres.push(...genreLists.novel);
            }
            
            genres = [...new Set(genres)].sort();

            genreEditContainer.innerHTML = '';
            genres.forEach(g => {
                const label = document.createElement('label');
                label.className = 'genre-option';
                label.innerHTML = `<input type="checkbox" value="${g}"> ${g}`;
                genreEditContainer.appendChild(label);
            });
        }

        inputEditType.addEventListener('change', updateEditGenreOptions);

        window.openEditBookModal = function(bookId) {
            const book = libraryData.find(b => b.id === bookId);
            if (!book) return;

            currentEditingBookId = bookId;
            inputEditTitle.value = book.title;
            inputEditAuthor.value = book.author || '';
            inputEditCover.value = book.cover || '';
            inputEditType.value = book.type || ''; 
            inputEditDate.value = book.publishDate || '';
            inputEditSynopsis.value = book.synopsis || '';

            updateEditGenreOptions();

            if (book.genre) {
                const bookGenres = book.genre.split(',').map(g => g.trim());
                const checkboxes = genreEditContainer.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    if (bookGenres.includes(cb.value)) {
                        cb.checked = true;
                    }
                });
            }

            modalEditBook.classList.add('show');
        };

        btnCancelEdit.addEventListener('click', () => {
            modalEditBook.classList.remove('show');
            currentEditingBookId = null;
        });

        btnBrowseEditCover.addEventListener('click', async () => {
            const coverPath = await ipcRenderer.invoke('dialog:openCover');
            if (coverPath) {
                // Kompresi otomatis gambar yang dipilih
                const compressedPath = await ipcRenderer.invoke('image:compressCover', coverPath);
                inputEditCover.value = compressedPath;
            }
        });

    btnSaveEdit.addEventListener('click', async () => {
            if (!inputEditTitle.value) {
            await customAlert(t('msg_fill_title'));
                return;
            }
            if (!inputEditType.value) {
            await customAlert(t('msg_fill_type') || 'Mohon pilih jenis buku!');
                return;
            }

            const book = libraryData.find(b => b.id === currentEditingBookId);
            if (book) {
                book.title = inputEditTitle.value;
                book.author = inputEditAuthor.value;
                book.cover = inputEditCover.value || null;
                book.type = inputEditType.value;
                book.synopsis = inputEditSynopsis.value;
                
                if (book.type === 'Artikel' || book.type === 'Journal') {
                    book.publishDate = inputEditDate.value;
                    book.genre = '';
                } else {
                    book.publishDate = null;
                    const selectedGenres = Array.from(genreEditContainer.querySelectorAll('input:checked')).map(cb => cb.value).join(', ');
                    book.genre = selectedGenres;
                }

                saveData();
                showBookDetail(book);
                modalEditBook.classList.remove('show');
            }
        });

        window.toggleFavorite = function(bookId) {
            const book = libraryData.find(b => b.id == bookId);
            if (book) {
                book.isFavorite = !book.isFavorite;
                saveData();
                showBookDetail(book);
            }
        };

        window.toggleChapterFavorite = function(bookId, chapterIndex) {
            const book = libraryData.find(b => b.id == bookId);
            if (book && book.chapters && book.chapters[chapterIndex]) {
                book.chapters[chapterIndex].isFavorite = !book.chapters[chapterIndex].isFavorite;
                saveData();
                showBookDetail(book);
            }
        };

        window.toggleReadStatus = function(bookId, chapterIndex) {
            const book = libraryData.find(b => b.id == bookId);
            if (!book) return;

            let targetPath, targetName;
            if (chapterIndex === -1) {
                targetPath = book.path;
                targetName = book.title;
            } else {
                if (!book.chapters || !book.chapters[chapterIndex]) return;
                targetPath = book.chapters[chapterIndex].path;
                targetName = `${book.title} - ${book.chapters[chapterIndex].name}`;
            }

            const isRead = riwayatBacaan.some(r => r.path === targetPath);
            if (isRead) {
                riwayatBacaan = riwayatBacaan.filter(r => r.path !== targetPath);
            } else {
                const historyItem = {
                    title: targetName,
                    path: targetPath,
                    cover: book.cover,
                    lastPage: 1
                };
                riwayatBacaan.unshift(historyItem);
            }
            
            saveData();
            showBookDetail(book);
        };

        window.deleteBook = async function(bookId) {
            const book = libraryData.find(b => b.id == bookId);
            if (!book) return;

            const options = {
                title: t('modal_delete_title') || "Hapus Buku",
                message: t('msg_delete_options') || "Hapus buku ini dari Pustaka?",
                detail: t('msg_delete_detail') || "Buku ini akan dihapus dari daftar aplikasi. File aslinya di komputer Anda akan tetap aman.",
                btnCancel: t('btn_cancel') || "Batal",
                btnRemoveLib: t('btn_remove_lib') || "Hapus dari Pustaka"
            };

        const response = await customConfirm(options.message + "\n\n" + options.detail, options.title, options.btnRemoveLib, options.btnCancel);

        if (response) {
                // Masukkan ke daftar abaikan (Ignore List) HANYA jika buku berasal dari auto-scan
                if (book.path && book.structureType) {
                    const normPath = book.path.replace(/[\\/]+/g, '/').toLowerCase();
                    if (!userSettings.ignoredPaths) userSettings.ignoredPaths = [];
                    if (!userSettings.ignoredPaths.includes(normPath)) {
                        userSettings.ignoredPaths.push(normPath);
                    }
                }
                
                libraryData = libraryData.filter(b => b.id != bookId);
                riwayatBacaan = riwayatBacaan.filter(r => r.path !== book.path);
                saveData();
                switchTab('library');
            }
        };

        function showContextMenu(x, y, book) {
            contextMenuBook = book;
            contextMenu.style.left = `${x}px`;
            contextMenu.style.top = `${y}px`;
            
            if (currentView === 'history') {
                ctxDelete.innerText = t('ctx_delete_history');
            } else if (currentView === 'favorites') {
                ctxDelete.innerText = t('ctx_remove_favorite');
            } else {
                ctxDelete.innerText = t('ctx_delete');
            }
            contextMenu.style.display = 'block';
        }

        document.addEventListener('click', () => {
            contextMenu.style.display = 'none';
        });

        ctxDelete.addEventListener('click', () => {
            if (!contextMenuBook) return;

            if (currentView === 'history') {
                riwayatBacaan = riwayatBacaan.filter(r => r.path !== contextMenuBook.path);
                saveData();
                renderGrid(riwayatBacaan, 'history-grid');
            } else if (currentView === 'favorites') {
                const book = libraryData.find(b => b.id === contextMenuBook.id);
                if (book) book.isFavorite = false;
                saveData();
                renderGrid(libraryData.filter(b => b.isFavorite), 'favorites-grid');
            } else {
                deleteBook(contextMenuBook.id);
            }
        });

        let pendingBookPath = null;
        const genreLists = {
            commonComic: ['Action', 'Romance', 'Fantasy', 'Sci-Fi', 'Slice of Life', 'Horror', 'Mystery', 'Comedy', 'Drama', 'Psychological', 'Supernatural', 'Sports', 'Historical'],
            manga: ['Shounen', 'Shoujo', 'Seinen', 'Josei', 'Isekai', 'Mecha', 'Iyashikei', 'Mahou Shoujo'],
            manhwa: ['Hunter/System', 'Regression', 'Murim', 'Villainess', 'School Bullying'],
            manhua: ['Wuxia', 'Xianxia', 'Xuanhuan', 'Cultivation'],
            artikel: ['News', 'Feature', 'Opinion', 'Editorial', 'Guide', 'Review', 'Essay'],
            journal: ['Original Research', 'Literature Review', 'Case Study', 'Methodology', 'Short Communication'],
            novel: ['Romance', 'Mystery', 'Horror', 'Fantasy', 'Sci-Fi', 'Thriller', 'Historical', 'Teenlit', 'Chicklit', 'Metropop', 'Comedy', 'Inspirational']
        };

        function updateGenreOptions() {
            const type = inputType.value;
            const genreGroup = genreContainer.parentElement;
            let genres = [];

            if (!type) {
                groupDate.style.display = 'none';
                genreGroup.style.display = 'none';
            } else if (type === 'Artikel') {
                genres = genreLists.artikel;
                groupDate.style.display = 'block';
                genreGroup.style.display = 'none';
            } else if (type === 'Journal') {
                genres = genreLists.journal;
                groupDate.style.display = 'block';
                genreGroup.style.display = 'none';
            } else {
                groupDate.style.display = 'none';
                genreGroup.style.display = 'block';
                genres = [...genreLists.commonComic];
                if (type === 'Manga') genres.push(...genreLists.manga);
                if (type === 'Manhwa') genres.push(...genreLists.manhwa);
                if (type === 'Manhua') genres.push(...genreLists.manhua);
                if (type === 'Novel') genres.push(...genreLists.novel);
            }
            
            genres = [...new Set(genres)].sort();
            genreContainer.innerHTML = '';
            genres.forEach(g => {
                const label = document.createElement('label');
                label.className = 'genre-option';
                label.innerHTML = `<input type="checkbox" value="${g}"> ${g}`;
                genreContainer.appendChild(label);
            });
        }

        inputType.addEventListener('change', updateGenreOptions);
        btnCancelAdd.addEventListener('click', () => modalAddBook.classList.remove('show'));

        btnBrowseCover.addEventListener('click', async () => {
            const coverPath = await ipcRenderer.invoke('dialog:openCover');
            if (coverPath) {
                // Kompresi otomatis gambar yang dipilih
                const compressedPath = await ipcRenderer.invoke('image:compressCover', coverPath);
                inputCover.value = compressedPath;
            }
        });

        btnSaveAdd.addEventListener('click', async () => {
            if (!inputTitle.value) {
            await customAlert(t('msg_fill_title'));
                return;
            }
            if (!inputType.value) {
            await customAlert(t('msg_fill_type') || 'Mohon pilih jenis buku!');
                return;
            }
            const selectedGenres = Array.from(genreContainer.querySelectorAll('input:checked')).map(cb => cb.value).join(', ');
            const newBook = { 
                id: Date.now(), 
                title: inputTitle.value, 
                author: inputAuthor.value || 'Unknown',
                path: pendingBookPath, 
                type: inputType.value,
                genre: selectedGenres, 
                synopsis: inputSynopsis.value,
                publishDate: (inputType.value === 'Artikel' || inputType.value === 'Journal') ? inputDate.value : null,
                cover: inputCover.value || null
            };
            libraryData.unshift(newBook);
            await saveData();
            modalAddBook.classList.remove('show');
            showBookDetail(newBook);
        });

        btnPilihFile.addEventListener('click', async () => {
            const filePath = await ipcRenderer.invoke('dialog:openFile');
            if (filePath) {
                let book = libraryData.find(b => b.path === filePath);
                if (book) {
                    showBookDetail(book);
                } else {
                    pendingBookPath = filePath;
                    inputTitle.value = path.basename(filePath, path.extname(filePath));
                    inputAuthor.value = '';
                    inputCover.value = '';
                    inputSynopsis.value = '';
                    inputType.value = '';
                    inputDate.value = '';
                    updateGenreOptions();
                    modalAddBook.classList.add('show');
                }
            }
        });

    if (btnCreateFolder) {
        btnCreateFolder.addEventListener('click', () => {
            inputCfFolder.value = '';
            inputCfAuthor.value = '';
            inputCfCover.value = '';
            inputCfType.value = '';
            inputCfDate.value = '';
            inputCfSynopsis.value = '';
            updateCfGenreOptions();
            modalCreateFolder.classList.add('show');
        });
    }
    
    function updateCfGenreOptions() {
        const type = inputCfType.value;
        const genreGroup = genreCfContainer.parentElement;
        let genres = [];

        if (!type) {
            groupCfDate.style.display = 'none';
            genreGroup.style.display = 'none';
        } else if (type === 'Artikel') {
            genres = genreLists.artikel;
            groupCfDate.style.display = 'block';
            genreGroup.style.display = 'none';
        } else if (type === 'Journal') {
            genres = genreLists.journal;
            groupCfDate.style.display = 'block';
            genreGroup.style.display = 'none';
        } else {
            groupCfDate.style.display = 'none';
            genreGroup.style.display = 'block';
            genres = [...genreLists.commonComic];
            if (type === 'Manga') genres.push(...genreLists.manga);
            if (type === 'Manhwa') genres.push(...genreLists.manhwa);
            if (type === 'Manhua') genres.push(...genreLists.manhua);
            if (type === 'Novel') genres.push(...genreLists.novel);
        }
        
        genres = [...new Set(genres)].sort();
        genreCfContainer.innerHTML = '';
        genres.forEach(g => {
            const label = document.createElement('label');
            label.className = 'genre-option';
            label.innerHTML = `<input type="checkbox" value="${g}"> ${g}`;
            genreCfContainer.appendChild(label);
        });
    }
    inputCfType.addEventListener('change', updateCfGenreOptions);

    btnCancelCf.addEventListener('click', () => modalCreateFolder.classList.remove('show'));

    btnBrowseCfCover.addEventListener('click', async () => {
        const coverPath = await ipcRenderer.invoke('dialog:openCover');
        if (coverPath) {
            const compressedPath = await ipcRenderer.invoke('image:compressCover', coverPath);
            inputCfCover.value = compressedPath;
        }
    });

    btnSaveCf.addEventListener('click', async () => {
        const folderName = inputCfFolder.value.trim();
        if (!folderName) {
            await customAlert("Nama folder wajib diisi!");
            return;
        }
        if (!inputCfType.value) {
            await customAlert(t('msg_fill_type') || "Mohon pilih jenis buku!");
            return;
        }
        
        const selectedGenres = Array.from(genreCfContainer.querySelectorAll('input:checked')).map(cb => cb.value).join(', ');
        
        const folderData = {
            folderName: folderName,
            title: folderName,
            author: inputCfAuthor.value.trim(),
            cover: inputCfCover.value,
            type: inputCfType.value,
            date: (inputCfType.value === 'Artikel' || inputCfType.value === 'Journal') ? inputCfDate.value : null,
            genre: selectedGenres,
            synopsis: inputCfSynopsis.value.trim()
        };

        const result = await ipcRenderer.invoke('library:createFolder', folderData);
        if (result.success) {
            await customAlert((t('msg_create_folder_success') || "Folder berhasil dibuat di:\n{0}").replace('{0}', result.path));
            require('electron').shell.openPath(result.path);
            await scanLocalFolder(true); 
            renderLibrarySorted();       
            modalCreateFolder.classList.remove('show');
        } else {
            await customAlert((t('msg_create_folder_fail') || "Gagal membuat folder:\n{0}").replace('{0}', result.message));
        }
    });

        btnExitApp.addEventListener('click', async () => {
            if (await customConfirm(t('msg_exit_confirm'), "Keluar Aplikasi", "Ya, Keluar")) {
                ipcRenderer.send('app:quit');
            }
        });

        async function scanLocalFolder(silent = false) {
        const scannedBooks = await ipcRenderer.invoke('library:scanLocal', userSettings.customFolders || []);
            if (scannedBooks) {
                const ignoredPathsSet = new Set(userSettings.ignoredPaths || []);

                scannedBooks.forEach(newBook => {
                    const normNewBookPath = newBook.path.replace(/[\\/]+/g, '/').toLowerCase();
                    if (ignoredPathsSet.has(normNewBookPath)) return; // Abaikan jika ada di ignore list

                    const exists = libraryData.find(b => {
                        const normExistPath = b.path.replace(/[\\/]+/g, '/').toLowerCase();
                        return normExistPath === normNewBookPath;
                    });

                    if (!exists) {
                        newBook.id = Date.now() + Math.random();
                        libraryData.push(newBook);
                    } else {
                        if (newBook.chapters) {
                            const existingChapters = exists.chapters || [];
                            const mergedChapters = newBook.chapters.map(newChap => {
                                const newBasename = path.basename(newChap.path).toLowerCase();
                                const oldChap = existingChapters.find(c => {
                                    if (!c.path) return false;
                                    return path.basename(c.path).toLowerCase() === newBasename;
                                });
                                if (oldChap) {
                                    return { ...oldChap, path: newChap.path };
                                }
                                return newChap;
                            });
                            newBook.chapters = mergedChapters;
                        }
                        // BUG FIX: Simpan semua data yang bisa diedit user agar tidak tertimpa oleh hasil scan.
                        // ID sangat penting untuk tidak hilang.
                        const userPreservedData = {
                            id: exists.id,
                            title: exists.title,
                            author: exists.author,
                            cover: exists.cover,
                            genre: exists.genre,
                            synopsis: exists.synopsis,
                            isFavorite: exists.isFavorite,
                            type: exists.type,
                            publishDate: exists.publishDate
                        };
                        
                        // Timpa data yang ada dengan hasil scan terbaru (untuk update chapter list, dll)
                        Object.assign(exists, newBook);

                        // Kembalikan data yang sudah diedit user.
                        // Ini akan menimpa kembali title, author, dll dari hasil scan
                        // dengan data yang sudah disimpan oleh user sebelumnya.
                        Object.assign(exists, userPreservedData);
                    }
                });

                const scannedPaths = new Set(scannedBooks.map(b => b.path.replace(/[\\/]+/g, '/').toLowerCase()));
                libraryData = libraryData.filter(book => {
                if (!book.structureType) return true; // Pertahankan buku yang diimpor manual
                const normPath = book.path.replace(/[\\/]+/g, '/').toLowerCase();
                return scannedPaths.has(normPath); // Hapus buku otomatis yang file/foldernya telah dihapus/hilang
                });

                saveData();
                if (!silent) await customAlert(t('msg_scan_success').replace('{0}', libraryData.length));
            } else if (!silent) {
                await customAlert(t('msg_scan_fail'));
            }
        }

        async function bacaFile(filePath, title) {
            const fileName = title || path.basename(filePath);
            const ext = path.extname(filePath).toLowerCase();
            
            currentRenderId++;
            const myRenderId = currentRenderId;
            
            document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
            reader.style.display = 'flex';
            pageTitle.innerText = fileName;
            
            btnBack.style.display = 'block';
            searchInput.style.display = 'none';
            readerSettingsContainer.style.display = 'block';
            btnRefresh.style.display = 'none';

            currentBookPath = filePath;
            let historyItem = riwayatBacaan.find(r => r.path === filePath);

            if (historyItem) {
                riwayatBacaan = riwayatBacaan.filter(r => r.path !== filePath);
            } else {
                const libBook = libraryData.find(b => b.path === filePath);
                historyItem = libBook ? { ...libBook } : { title: fileName, path: filePath };
                historyItem.lastPage = 1;
            }
            
            riwayatBacaan.unshift(historyItem);
            saveData();

            reader.innerHTML = '';
            updateReaderModeUI();

            if (ext === '.pdf') {
                await renderPDF(filePath, myRenderId);
            } else if (ext === '.cbz' || ext === '.zip') {
                await renderCBZ(filePath, myRenderId);
            } else if (ext === '.txt') {
                await renderTXT(filePath, myRenderId);
            } else {
                renderSimulasiWebtoon(ext, myRenderId);
            }
            
            reader.style.overflowY = '';

            if (myRenderId !== currentRenderId) return;

            renderChapterNavigation(filePath);

            if (historyItem.lastPage && historyItem.lastPage > 1) {
                setTimeout(() => {
                    const pageElement = document.querySelector(`.page-placeholder[data-page="${historyItem.lastPage}"]`);
                    if (pageElement) pageElement.scrollIntoView();
                }, 100);
            }

            if (!hasSeenFullscreenTip) {
                hasSeenFullscreenTip = true;
                setTimeout(() => {
                    showToast(t('msg_fullscreen_tip') || "Tip: Tekan tombol F1 di keyboard Anda untuk mengaktifkan mode layar penuh (Fullscreen).", 5000);
                }, 800); // Munculkan pop up setelah buku termuat
            }
        }

        function renderChapterNavigation(currentPath) {
            let foundBook = null;
            let foundIndex = -1;
            for (let b of libraryData) {
                if (b.chapters && Array.isArray(b.chapters)) {
                    const idx = b.chapters.findIndex(c => c.path === currentPath);
                    if (idx !== -1) {
                        foundBook = b;
                        foundIndex = idx;
                        break;
                    }
                }
            }

            if (foundBook && foundIndex !== -1) {
                const container = document.createElement('div');
                container.style.width = '100%';
                container.style.padding = '60px 20px';
                container.style.display = 'flex';
                container.style.justifyContent = 'center';
                container.style.gap = '20px';
                container.style.flexWrap = 'wrap';

                if (foundIndex > 0) {
                    const prevChapter = foundBook.chapters[foundIndex - 1];
                    const btnPrev = document.createElement('button');
                    btnPrev.className = 'btn-action btn-secondary-action';
                    btnPrev.style.padding = '14px 28px';
                    btnPrev.style.fontSize = '1rem';
                    btnPrev.style.flex = '1 1 auto';
                    btnPrev.style.maxWidth = '300px';
                    btnPrev.style.justifyContent = 'center';
                    btnPrev.title = prevChapter.name;
                    btnPrev.innerHTML = `<svg style="width:20px;height:20px;margin-right:8px;fill:currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> ${t('msg_chapter_prev')}`;
                    btnPrev.onclick = () => {
                        reader.scrollTop = 0;
                        const prevTitle = `${foundBook.title} - ${prevChapter.name}`;
                        bacaFile(prevChapter.path, prevTitle);
                    };
                    container.appendChild(btnPrev);
                }

                if (foundIndex < foundBook.chapters.length - 1) {
                    const nextChapter = foundBook.chapters[foundIndex + 1];
                    const btnNext = document.createElement('button');
                    btnNext.className = 'btn-action btn-primary-action';
                    btnNext.style.padding = '14px 28px';
                    btnNext.style.fontSize = '1rem';
                    btnNext.style.flex = '1 1 auto';
                    btnNext.style.maxWidth = '300px';
                    btnNext.style.justifyContent = 'center';
                    btnNext.title = nextChapter.name;
                    btnNext.innerHTML = `${t('msg_chapter_next')} <svg style="width:20px;height:20px;margin-left:8px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>`;
                    btnNext.onclick = () => {
                        reader.scrollTop = 0;
                        const nextTitle = `${foundBook.title} - ${nextChapter.name}`;
                        bacaFile(nextChapter.path, nextTitle);
                    };
                    container.appendChild(btnNext);
                }
                if (container.children.length > 0) reader.appendChild(container);
            }
        }

        function updateReaderModeUI() {
            if (isWebtoonMode) {
                reader.classList.add('webtoon-mode');
                radioWebtoon.checked = true;
            } else {
                reader.classList.remove('webtoon-mode');
                radioPages.checked = true;
            }
        }

        btnSettingsFab.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsPopup.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!settingsPopup.contains(e.target) && !btnSettingsFab.contains(e.target)) {
                settingsPopup.classList.remove('show');
            }
        });

        function changeMode(mode) {
            isWebtoonMode = (mode === 'webtoon');
            saveData();
            updateReaderModeUI();
        }

        radioWebtoon.addEventListener('change', () => changeMode('webtoon'));
        radioPages.addEventListener('change', () => changeMode('normal'));

        async function renderPDF(filePath) {
            try {
                const data = await fs.readFile(filePath);
                const loadingTask = pdfjsLib.getDocument(new Uint8Array(data));
                const pdf = await loadingTask.promise;
                
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const scale = 1.5;
                    const viewport = page.getViewport({ scale });

                    const div = document.createElement('div');
                    div.className = 'page-placeholder';
                    div.setAttribute('data-page', pageNum);
                    div.style.height = 'auto';
                    div.style.background = 'transparent';
                    div.style.boxShadow = 'none';
                    div.innerText = '';

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    canvas.style.maxWidth = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.display = 'block'; 
                    
                    div.appendChild(canvas);
                    reader.appendChild(div);

                    const renderContext = { canvasContext: context, viewport: viewport };
                    page.render(renderContext);
                }
            } catch (error) {
                reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat PDF: ${error.message}</div>`;
            }
        }

        async function renderCBZ(filePath, renderId) {
            try {
                const fileContent = await fs.readFile(filePath);
                if (renderId !== currentRenderId) return;

                const zip = await JSZip.loadAsync(fileContent);
                const imageFiles = Object.keys(zip.files).filter(filename => {
                    return !zip.files[filename].dir && /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
                });

                imageFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
                if (imageFiles.length === 0) {
                    reader.innerHTML = '<div style="padding:20px; color:red;">Tidak ada gambar ditemukan.</div>';
                    return;
                }

                for (let i = 0; i < imageFiles.length; i++) {
                    if (renderId !== currentRenderId) return;
                    const filename = imageFiles[i];
                    const fileData = await zip.files[filename].async('blob');
                    if (renderId !== currentRenderId) return;

                    const imageUrl = URL.createObjectURL(fileData);
                    const div = document.createElement('div');
                    div.className = 'page-placeholder';
                    div.setAttribute('data-page', i + 1);
                    div.style.height = 'auto';
                    div.style.background = 'transparent';
                    div.style.boxShadow = 'none';
                    div.innerText = '';

                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    img.style.display = 'block';
                    
                    div.appendChild(img);
                    reader.appendChild(div);
                }
            } catch (error) {
                reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat CBZ/ZIP: ${error.message}</div>`;
            }
        }

        async function renderTXT(filePath, renderId) {
            try {
                const data = await fs.readFile(filePath, 'utf8');
                if (renderId !== currentRenderId) return;

                const div = document.createElement('div');
                div.className = 'page-placeholder';
                div.style.height = 'auto';
                div.style.background = 'white';
                div.style.padding = '40px';
                div.style.whiteSpace = 'pre-wrap'; 
                div.style.fontFamily = "'Segoe UI', sans-serif";
                div.style.fontSize = '1.1rem';
                div.style.lineHeight = '1.8';
                div.style.color = '#333';
                div.innerText = data;
                reader.appendChild(div);
            } catch (error) {
                reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat TXT: ${error.message}</div>`;
            }
        }

        function renderSimulasiWebtoon(ext, renderId) {
            for (let i = 1; i <= 5; i++) {
                if (renderId !== currentRenderId) return;
                const page = document.createElement('div');
                page.className = 'page-placeholder';
                page.setAttribute('data-page', i);
                page.innerText = `Simulasi Halaman ${i} - Area render untuk ${ext}`;
                reader.appendChild(page);
            }
        }

        reader.addEventListener('scroll', () => {
            if (!currentBookPath) return;
            const pages = document.querySelectorAll('.page-placeholder');
            for (let page of pages) {
                const rect = page.getBoundingClientRect();
                if (rect.top < window.innerHeight / 2 && rect.bottom > 0) {
                    const pageNum = parseInt(page.getAttribute('data-page'));
                    const historyItem = riwayatBacaan.find(r => r.path === currentBookPath);
                    if (historyItem && historyItem.lastPage !== pageNum) {
                        historyItem.lastPage = pageNum;
                        clearTimeout(saveTimeout);
                        saveTimeout = setTimeout(saveData, 1000); 
                    }
                    break; 
                }
            }
        });

        function renderExplore() {
            const genres = new Set();
            libraryData.forEach(book => {
                if(book.genre) book.genre.split(',').forEach(g => genres.add(g.trim()));
            });
            
            const filterContainer = document.getElementById('explore-filters');
            filterContainer.innerHTML = `<div class="filter-tag active" onclick="filterGenre('all', this)">${t('filter_all')}</div>`;
            genres.forEach(g => {
                filterContainer.innerHTML += `<div class="filter-tag" onclick="filterGenre('${g}', this)">${g}</div>`;
            });

            renderGrid(libraryData, 'explore-grid');
        }

        window.filterGenre = function(genre, element) {
            document.querySelectorAll('.filter-tag').forEach(el => el.classList.remove('active'));
            element.classList.add('active');
            const filtered = genre === 'all' ? libraryData : libraryData.filter(b => b.genre && b.genre.includes(genre));
            renderGrid(filtered, 'explore-grid');
        };

    // --- CUSTOM FOLDERS LOGIC ---
    const customFoldersList = document.getElementById('custom-folders-list');
    const btnAddFolder = document.getElementById('btn-add-folder');

    function renderCustomFolders() {
        if(!customFoldersList) return;
        customFoldersList.innerHTML = '';
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        
        (userSettings.customFolders || []).forEach((folder, index) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.background = isDark ? '#334155' : '#f8f9fa';
            div.style.padding = '8px 12px';
            div.style.borderRadius = '6px';
            div.style.border = '1px solid ' + (isDark ? '#475569' : '#cbd5e1');
            
            const span = document.createElement('span');
            span.innerText = folder;
            span.style.wordBreak = 'break-all';
            span.style.marginRight = '12px';
            span.style.color = isDark ? '#f1f5f9' : 'inherit';
            
            const btn = document.createElement('button');
            btn.innerText = t('btn_remove') || 'Hapus';
            btn.className = 'btn-cancel';
            btn.style.padding = '4px 8px';
            btn.style.fontSize = '0.8rem';
            btn.onclick = () => {
                userSettings.customFolders.splice(index, 1);
                saveData(); // Simpan perubahan folder secara otomatis
                renderCustomFolders();
            };
            
            div.appendChild(span);
            div.appendChild(btn);
            customFoldersList.appendChild(div);
        });
    }

    if (btnAddFolder) {
        btnAddFolder.addEventListener('click', async () => {
            const folderPath = await ipcRenderer.invoke('dialog:openDirectory');
            if (folderPath) {
                if (!userSettings.customFolders) userSettings.customFolders = [];
                if (!userSettings.customFolders.includes(folderPath)) {
                    userSettings.customFolders.push(folderPath);
                    saveData(); // Simpan perubahan folder secara otomatis
                    renderCustomFolders();
                }
            }
        });
    }

    // --- IGNORED PATHS (RESTORE) LOGIC ---
    const ignoredPathsList = document.getElementById('ignored-paths-list');
    const btnRestoreAllIgnored = document.getElementById('btn-restore-all-ignored');

    function renderIgnoredPaths() {
        if (!ignoredPathsList) return;
        ignoredPathsList.innerHTML = '';
        const isDark = document.body.getAttribute('data-theme') === 'dark';

        if (!userSettings.ignoredPaths || userSettings.ignoredPaths.length === 0) {
            ignoredPathsList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">${t('msg_empty_ignored') || 'Tidak ada buku yang disembunyikan.'}</p>`;
            if (btnRestoreAllIgnored) btnRestoreAllIgnored.style.display = 'none';
            return;
        }
        
        if (btnRestoreAllIgnored) btnRestoreAllIgnored.style.display = 'block';
        
        userSettings.ignoredPaths.forEach((folderPath, index) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.background = isDark ? '#334155' : '#f8f9fa';
            div.style.padding = '8px 12px';
            div.style.borderRadius = '6px';
            div.style.border = '1px solid ' + (isDark ? '#475569' : '#cbd5e1');
            
            const span = document.createElement('span');
            const folderName = folderPath.split(/[\\/]/).pop(); // Ambil nama file/folder terakhirnya saja
            span.innerText = folderName;
            span.title = folderPath; 
            span.style.wordBreak = 'break-all';
            span.style.marginRight = '12px';
            span.style.color = isDark ? '#f1f5f9' : 'inherit';
            
            const btn = document.createElement('button');
            btn.innerText = t('btn_restore_ignored') || 'Pulihkan';
            btn.className = 'btn-action btn-primary-action';
            btn.style.padding = '4px 12px';
            btn.style.fontSize = '0.8rem';
            btn.onclick = async () => {
                userSettings.ignoredPaths.splice(index, 1);
                await saveData(); 
                renderIgnoredPaths(); // Update UI list
                await scanLocalFolder(true); // Scan ulang di background agar buku kembali muncul
            };
            
            div.appendChild(span);
            div.appendChild(btn);
            ignoredPathsList.appendChild(div);
        });
    }

    if (btnRestoreAllIgnored) {
        btnRestoreAllIgnored.addEventListener('click', async () => {
            if (await customConfirm(t('msg_restore_all_ignored_confirm') || "Apakah Anda yakin ingin memulihkan semua buku yang disembunyikan?", t('btn_restore_all_ignored') || "Pulihkan Semua", "Ya, Pulihkan")) {
                userSettings.ignoredPaths = []; // Kosongkan daftar blokir
                await saveData(); 
                renderIgnoredPaths(); // Update UI list
                await scanLocalFolder(true); // Scan ulang otomatis di background
            }
        });
    }

    document.getElementById('btn-clear-cache').addEventListener('click', async () => {
        if (await customConfirm(t('msg_clear_cache_confirm'), "Hapus Cache Data", "Hapus Cache")) {
            // 1. Batalkan semua proses auto-save yang mungkin sedang berjalan
            clearTimeout(saveTimeout);
            
            // 2. Kosongkan memori sementara agar data lama tidak ter-save ulang
            libraryData = [];
            riwayatBacaan = [];
            userSettings = { username: '', theme: 'light', language: 'id', customFolders: [], ignoredPaths: [] };

            const success = await ipcRenderer.invoke('data:clear');
            if (success) {
                await customAlert(t('msg_clear_cache_success'));
                ipcRenderer.send('app:relaunch'); // Restart aplikasi secara native
            }
        }
    });

    // --- FITUR BARU: BACKUP & RESTORE DATA ---
    const btnBackup = document.getElementById('btn-backup');
    if (btnBackup) {
        btnBackup.addEventListener('click', async () => {
            try {
                const result = await ipcRenderer.invoke('data:backup');
                if (result.success) {
                await customAlert(t('msg_backup_success').replace('{0}', result.filePath));
                } else if (!result.canceled) {
                await customAlert(t('msg_backup_fail') + (result.message || 'Error tidak diketahui'));
                }
            } catch (error) {
            await customAlert(t('msg_backup_fail') + error.message);
            }
        });
    }

    const btnRestore = document.getElementById('btn-restore');
    if (btnRestore) {
        btnRestore.addEventListener('click', async () => {
            try {
                const result = await ipcRenderer.invoke('data:restore');
                if (result.success) {
                await customAlert(t('msg_restore_success'));
                    ipcRenderer.send('app:relaunch'); // Restart aplikasi secara otomatis
                } else if (!result.canceled) {
                await customAlert(t('msg_restore_fail') + (result.message || 'File tidak valid'));
                }
            } catch (error) {
            await customAlert(t('msg_restore_fail') + error.message);
            }
        });
    }

    // --- CUSTOM TITLE BAR LOGIC ---
    document.getElementById('btn-minimize').addEventListener('click', () => ipcRenderer.send('window:minimize'));
    document.getElementById('btn-maximize').addEventListener('click', () => ipcRenderer.send('window:maximize'));
    document.getElementById('btn-close').addEventListener('click', () => ipcRenderer.send('window:close'));

        document.getElementById('btn-save-settings-page').addEventListener('click', async () => {
            userSettings.username = document.getElementById('setting-username').value;
            userSettings.theme = document.getElementById('setting-theme').value;
            userSettings.language = document.getElementById('setting-language').value;
            const selectedMode = document.getElementById('setting-mode').value;
            
            isWebtoonMode = (selectedMode === 'webtoon');
            updateReaderModeUI();
            
            applyTheme(userSettings.theme);
            applyLanguage(userSettings.language);
            await saveData();
            await customAlert(t('msg_saved'), "Berhasil");
        });

        function openLink(url) { require('electron').shell.openExternal(url); }

        async function checkUpdate() {
            try {
                const result = await ipcRenderer.invoke('updater:check');
                if (result.error) { await customAlert(t('msg_update_fail') + result.error, "Gagal"); return; }
                if (result.updateAvailable) {
                    const msg = t('msg_update_available').replace('{0}', result.remoteInfo.version);
                    if (await customConfirm(msg, "Pembaruan Tersedia", "Unduh", "Batal")) openLink(result.remoteInfo.zipUrl);
                } else {
                    await customAlert(t('msg_update_latest').replace('{0}', result.localInfo.version), "Pembaruan");
                }
            } catch (e) { await customAlert(t('msg_update_error'), "Error"); }
        }

        window.showQrisModal = function() {
            document.getElementById('qris-modal').classList.add('show');
        };

        window.showPaypalModal = function() {
            document.getElementById('paypal-modal').classList.add('show');
        };

        document.addEventListener('keydown', async (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            // Shortcut Fullscreen F1 (Toggle Hidup / Mati)
            if (e.key === 'F1' && reader.style.display === 'flex') {
                e.preventDefault();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => console.error(err));
                } else {
                    document.exitFullscreen().catch(err => console.error(err));
                }
                return;
            }

            if (e.key === 'Escape') {
                // Jika sedang Fullscreen, cukup keluar dari Fullscreen saja (jangan tutup buku)
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(err => console.error(err));
                    return; 
                }

                const openModals = document.querySelectorAll('.modal.show');
                if (openModals.length > 0) { 
                    const openModal = openModals[openModals.length - 1];
                    const btnCancel = openModal.querySelector('.btn-cancel');
                    const btnOk = openModal.querySelector('#btn-custom-alert-ok');
                    if (btnCancel) btnCancel.click();
                    else if (btnOk) btnOk.click();
                    else openModal.classList.remove('show');
                    return; 
                }
                if (settingsPopup.classList.contains('show')) { settingsPopup.classList.remove('show'); return; }
                if (btnBack.style.display !== 'none') { btnBack.click(); return; }
                if (await customConfirm(t('msg_exit_confirm'), "Keluar Aplikasi", "Ya, Keluar")) ipcRenderer.send('app:quit');
            }

            if (reader.style.display === 'flex') {
                const scrollAmount = 400;
                if (e.key === 'ArrowDown') reader.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                else if (e.key === 'ArrowUp') reader.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
                else if (e.key === 'ArrowRight') goToNextPage();
                else if (e.key === 'ArrowLeft') goToPrevPage();
            } else {
                const activeView = Array.from(document.querySelectorAll('.view-section')).find(el => el.style.display === 'block');
                if (activeView) {
                    const menuScrollAmount = 200;
                    if (e.key === 'ArrowDown') activeView.scrollBy({ top: menuScrollAmount, behavior: 'smooth' });
                    else if (e.key === 'ArrowUp') activeView.scrollBy({ top: -menuScrollAmount, behavior: 'smooth' });
                }
            }
        });

        function goToNextPage() {
            const pages = Array.from(document.querySelectorAll('.page-placeholder'));
            const readerRect = reader.getBoundingClientRect();
            const next = pages.find(p => p.getBoundingClientRect().top > readerRect.top + 50);
            if (next) next.scrollIntoView({ behavior: 'smooth' });
        }

        function goToPrevPage() {
            const pages = Array.from(document.querySelectorAll('.page-placeholder'));
            const readerRect = reader.getBoundingClientRect();
            const prevs = pages.filter(p => p.getBoundingClientRect().top < readerRect.top - 50);
            if (prevs.length > 0) prevs[prevs.length - 1].scrollIntoView({ behavior: 'smooth' });
        }

        function navigateChapter(direction) {
            if (!currentBookPath) return;
            let foundBook = null, foundIndex = -1;
            for (let b of libraryData) {
                if (b.chapters && Array.isArray(b.chapters)) {
                    const idx = b.chapters.findIndex(c => c.path === currentBookPath);
                    if (idx !== -1) { foundBook = b; foundIndex = idx; break; }
                }
            }
            if (foundBook && foundIndex !== -1) {
                if (direction === 'next' && foundIndex < foundBook.chapters.length - 1) {
                    reader.scrollTop = 0;
                    const nextChapter = foundBook.chapters[foundIndex + 1];
                    bacaFile(nextChapter.path, `${foundBook.title} - ${nextChapter.name}`);
                } else if (direction === 'prev' && foundIndex > 0) {
                    reader.scrollTop = 0;
                    const prevChapter = foundBook.chapters[foundIndex - 1];
                    bacaFile(prevChapter.path, `${foundBook.title} - ${prevChapter.name}`);
                }
            }
        }

// Init Application
(async () => {
    await loadTranslations();
    await loadData(); 
    await scanLocalFolder(true); 
    switchTab('library');
    updateReaderModeUI();
    setTimeout(() => {
        document.getElementById('splash-screen').classList.add('hidden');
    }, 4000);
})();