// --- NAVIGATION LOGIC ---
let currentView = 'library'; 
let previousViewBeforeSettings = 'library';
let returnToReaderFromSettings = false;
let currentReaderTitle = '';

function switchTab(tabName) {
    if (tabName === 'settings') {
        previousViewBeforeSettings = currentView === 'settings' ? previousViewBeforeSettings : currentView;
        returnToReaderFromSettings = reader.style.display === 'flex';
    } else {
        returnToReaderFromSettings = false;
    }

    currentView = tabName;
    document.querySelectorAll('.view-section, .reader-container').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    btnBack.style.display = 'none';
    searchInput.style.display = 'block';
    readerSettingsContainer.style.display = 'none';
    if (readerSearchPanel) readerSearchPanel.classList.remove('show');
    scrollProgressIndicator.classList.remove('visible');
    if (pageJumpControl) pageJumpControl.classList.remove('visible');
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
        renderHistoryList(riwayatBacaan);
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
        btnBack.style.display = 'block';
        
        document.getElementById('setting-username').value = userSettings.username;
        document.getElementById('setting-theme').value = userSettings.theme;
        document.getElementById('setting-mode').value = isWebtoonMode ? 'webtoon' : 'normal';
        if (settingPdfQuality) settingPdfQuality.value = userSettings.pdfQualityMode || 'light';
        document.getElementById('setting-language').value = userSettings.language;
        settingNightIntensity.value = userSettings.nightModeIntensity;
        renderCustomFolders();
        renderIgnoredPaths();
    }
}

function restoreReaderFromSettings() {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    reader.style.display = 'flex';
    pageTitle.innerText = currentReaderTitle || path.basename(currentBookPath || '');
    btnBack.style.display = 'block';
    searchInput.style.display = 'none';
    readerSettingsContainer.style.display = 'block';
    updateReadingProgressVisibility();
    updatePageJumpControl();
    btnRefresh.style.display = 'none';
    currentView = previousViewBeforeSettings || 'library';
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
                const filtered = riwayatBacaan.filter(b => 
                    String(b.title || '').toLowerCase().includes(keyword) ||
                    String(b.path || '').toLowerCase().includes(keyword)
                );
                renderHistoryList(filtered);
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
            if (currentView === 'settings') {
                if (returnToReaderFromSettings && currentBookPath) {
                    restoreReaderFromSettings();
                } else {
                    switchTab(previousViewBeforeSettings || 'library');
                }
                return;
            }

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
        function escapeHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char]));
        }

        function escapeJsArg(value) {
            return escapeHtml(JSON.stringify(String(value ?? '')));
        }

        function safeNumericId(value) {
            const numberValue = Number(value);
            return Number.isFinite(numberValue) ? numberValue : 0;
        }

        function rememberObjectUrl(url) {
            activeObjectUrls.push(url);
            return url;
        }

        function cleanupObjectUrls() {
            activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
            activeObjectUrls = [];
        }

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
                coverSrc = escapeHtml(coverSrc);
            }
            
            const coverHtml = coverSrc ? `<img src="${coverSrc}" class="book-cover" style="object-fit:cover;" loading="lazy" decoding="async">` : `<div class="book-cover">📖</div>`;

            div.innerHTML = `
                ${coverHtml}
                <div class="book-info">
                    <div class="book-title">${escapeHtml(book.title)}</div>
                    <div class="book-meta">${escapeHtml(book.genre || t('msg_unknown_genre'))}</div>
                </div>
            `;
            div.addEventListener('click', () => showBookDetail(book));
            div.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e.pageX, e.pageY, book);
            });
            return div;
        }

        function renderHistoryList(data) {
            const list = document.getElementById('history-list');
            if (!list) return;

            list.innerHTML = '';
            if (data.length === 0) {
                list.innerHTML = `<p style="color:#94a3b8; text-align:center; padding-top: 20px;">${escapeHtml(t('msg_empty_library'))}</p>`;
                return;
            }

            const fragment = document.createDocumentFragment();
            data.forEach(item => {
                const row = createHistoryRow(item);
                fragment.appendChild(row);
            });
            list.appendChild(fragment);
        }

        function createHistoryRow(item) {
            const row = document.createElement('div');
            row.className = 'history-row';

            const ext = path.extname(item.path || '').replace('.', '').toUpperCase() || 'FILE';
            const fileName = item.path ? path.basename(item.path) : '-';
            const lastPageText = item.lastPage ? `${escapeHtml(t('history_last_page') || 'Halaman terakhir')}: ${escapeHtml(item.lastPage)}` : escapeHtml(t('history_last_page_unknown') || 'Halaman terakhir belum tersimpan');

            row.innerHTML = `
                <div class="history-filetype">${escapeHtml(ext)}</div>
                <div class="history-main">
                    <div class="history-title">${escapeHtml(item.title || fileName)}</div>
                    <div class="history-path">${escapeHtml(fileName)}</div>
                </div>
                <div class="history-meta">${lastPageText}</div>
            `;

            row.addEventListener('click', () => {
                if (item.path) bacaFile(item.path, item.title || fileName);
            });
            row.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e.pageX, e.pageY, item);
            });
            return row;
        }

        function showBookDetail(book) {
            document.querySelectorAll('.view-section, .reader-container').forEach(el => el.style.display = 'none');
            const detailView = document.getElementById('view-detail');
            detailView.style.display = 'block';
            pageTitle.innerText = t('page_detail');
            const safeBookId = safeNumericId(book.id);
            
            btnBack.style.display = 'block';
            searchInput.style.display = 'none';
            readerSettingsContainer.style.display = 'none';
    scrollProgressIndicator.classList.remove('visible');
            if (pageJumpControl) pageJumpControl.classList.remove('visible');
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
                coverSrc = escapeHtml(coverSrc);
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
                        const safePath = escapeJsArg(chap.path);
                        const safeTitle = escapeJsArg(`${book.title} - ${chap.name}`);
                        const safeChapterName = escapeHtml(chap.name);
                        const isChapFav = chap.isFavorite;
                        const starColor = isChapFav ? '#eab308' : 'currentColor';
                        const starFill = isChapFav ? '#eab308' : 'none';

                        const isRead = readPaths.has(chap.path);
                        const readClass = isRead ? 'chapter-read' : '';
                        const checkColor = isRead ? '#3b82f6' : '#94a3b8';
                        const editChapterTitle = escapeHtml(t('msg_edit_chapter') || 'Edit Chapter');
                        const deleteChapterTitle = escapeHtml(t('msg_delete_chapter') || 'Hapus Chapter');
                        chapterListHtml += `
                        <div class="chapter-row ${readClass}" onclick="bacaFile(${safePath}, ${safeTitle})" style="cursor: pointer;">
                            <div style="flex-grow: 1;"><span class="chapter-name">${safeChapterName}</span></div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div title="${isRead ? 'Sudah Dibaca' : 'Belum Dibaca'}" style="color: ${checkColor}; display: flex; cursor: pointer;" onclick="event.stopPropagation(); toggleReadStatus(${safeBookId}, ${index})">
                                    <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>
                                </div>
                                <button class="btn-icon" onclick="event.stopPropagation(); toggleChapterFavorite(${safeBookId}, ${index})" title="${escapeHtml(isChapFav ? t('msg_unmark_fav') : t('msg_mark_fav'))}">
                                    <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:${starColor};fill:${starFill};stroke-width:2"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                                </button>
                                <button class="btn-icon" onclick="event.stopPropagation(); editChapterName(${safeBookId}, ${index})" title="${editChapterTitle}">
                                    <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM5 19l.75-2.75 1.5 1.5L5 19zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.13 1.13 3.75 3.75 1.13-1.13z"/></svg>
                                </button>
                                <button class="btn-icon btn-icon-danger" onclick="event.stopPropagation(); deleteChapter(${safeBookId}, ${index})" title="${deleteChapterTitle}">
                                    <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>
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
                const safePath = escapeJsArg(book.path);
                const safeTitle = escapeJsArg(book.title);
                
                const isRead = readPaths.has(book.path);
                const readClass = isRead ? 'chapter-read' : '';
                const checkColor = isRead ? '#3b82f6' : '#94a3b8';
                const isFav = book.isFavorite;
                const starColor = isFav ? '#eab308' : 'currentColor';
                const starFill = isFav ? '#eab308' : 'none';

                chapterListHtml = `
                <div class="chapter-row ${readClass}" onclick="bacaFile(${safePath}, ${safeTitle})" style="cursor: pointer;">
                    <div style="flex-grow: 1;">
                        <span class="chapter-name">${escapeHtml(t('msg_read_main'))}</span>
                        <span class="chapter-meta" style="margin-left:8px; font-size:0.85rem; color:#94a3b8;">${escapeHtml(t('msg_full'))}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div title="${isRead ? 'Sudah Dibaca' : 'Belum Dibaca'}" style="color: ${checkColor}; display: flex; cursor: pointer;" onclick="event.stopPropagation(); toggleReadStatus(${safeBookId}, -1)">
                            <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>
                        </div>
                        <button class="btn-icon" onclick="event.stopPropagation(); toggleFavorite(${safeBookId})" title="${escapeHtml(isFav ? t('msg_unmark_fav') : t('msg_mark_fav'))}">
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
                tagsHtml = book.genre.split(',').map(g => `<span class="tag-pill">${escapeHtml(g.trim())}</span>`).join('');
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

            const safeTargetPath = escapeJsArg(targetPath);
            const safeTargetTitle = escapeJsArg(targetTitle);
            const safeBookTitle = escapeHtml(book.title);
            const safeBookType = escapeHtml(book.type || 'Book');
            const safeBookAuthor = escapeHtml(book.author || t('msg_unknown_author'));
            const safeSynopsis = escapeHtml(book.synopsis || t('msg_no_synopsis'));
            const safeStartButtonText = escapeHtml(startButtonText);

            const container = document.getElementById('detail-content');
            container.innerHTML = `
                <div class="comic-header">
                    <div class="detail-cover" style="${coverStyle}">📖</div>
                    <div class="detail-content">
                        <div class="detail-meta-top">
                            <span class="detail-type">${safeBookType}</span>
                        </div>
                        <h1 class="detail-title">${safeBookTitle}</h1>
                        <div class="detail-author">
                            <span>${escapeHtml(t('detail_author'))}:</span> ${safeBookAuthor}
                        </div>
                        ${book.publishDate ? `<div class="detail-date">📅 ${escapeHtml(t('detail_date'))}: ${escapeHtml(book.publishDate)}</div>` : ''}
                        
                        <div class="detail-tags-container">
                            ${tagsHtml}
                        </div>

                        <div class="action-buttons">
                            <button class="btn-action btn-primary-action" onclick="bacaFile(${safeTargetPath}, ${safeTargetTitle})">${iconPlay} ${safeStartButtonText}</button>
                            <button class="${favBtnClass}" onclick="toggleFavorite(${safeBookId})">${iconHeart} ${escapeHtml(t('btn_favorite'))}</button>
                            <button class="btn-action btn-secondary-action" onclick="openAddChapterModal(${safeBookId})">${iconPlus} ${escapeHtml(t('btn_chapter'))}</button>
                            <button class="btn-action btn-secondary-action" onclick="openEditBookModal(${safeBookId})">${iconEdit} ${escapeHtml(t('btn_edit'))}</button>
                            <button class="btn-action btn-danger-action" onclick="deleteBook(${safeBookId})">${iconTrash} ${escapeHtml(t('btn_delete'))}</button>
                        </div>
                    </div>
                </div>
                
                <div class="detail-synopsis">
                    <div class="section-title">${escapeHtml(t('detail_synopsis'))}:</div>
                    <p class="synopsis-text">${safeSynopsis}</p>
                </div>

                <div class="chapter-list-container">
                    <div class="chapter-list-header">
                        <div class="section-title" style="margin-bottom:0">${escapeHtml(t('detail_chapters'))}:</div>
                        <div class="chapter-count">${chapterCount} ${escapeHtml(t('detail_chapter_count'))}</div>
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
                    if (book.path && path.extname(book.path)) {
                        book.chapters.push({ name: 'Chapter 1', path: book.path, importSource: book.importSource || 'manual' });
                    }
                }
                book.chapters.push({ name: inputChapterName.value, path: inputChapterPath.value, importSource: 'manual' });
                const saved = await saveData();
                if (!saved) {
                    book.chapters.pop();
                    await customAlert('Gagal menyimpan chapter. Coba jalankan ulang aplikasi lalu tambah chapter lagi.', 'Error');
                    return;
                }
                showBookDetail(book);
                modalAddChapter.classList.remove('show');
                currentAddingBookId = null;
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

        window.editChapterName = async function(bookId, chapterIndex) {
            const book = libraryData.find(b => b.id == bookId);
            if (!book || !book.chapters || !book.chapters[chapterIndex]) return;

            const chapter = book.chapters[chapterIndex];
            const oldName = chapter.name;
            const newName = await customPrompt(
                t('msg_edit_chapter_name') || 'Masukkan nama chapter baru:',
                oldName,
                t('modal_edit_chapter_title') || 'Edit Chapter',
                t('btn_save') || 'Simpan',
                t('btn_cancel') || 'Batal'
            );

            if (newName === null) return;
            const trimmedName = newName.trim();
            if (!trimmedName) {
                await customAlert(t('msg_fill_chapter_name') || 'Nama chapter harus diisi.');
                return;
            }
            if (trimmedName === oldName) return;

            chapter.name = trimmedName;
            riwayatBacaan = riwayatBacaan.map(item => {
                if (item.path !== chapter.path) return item;
                return { ...item, title: `${book.title} - ${trimmedName}` };
            });

            const saved = await saveData();
            if (!saved) {
                chapter.name = oldName;
                riwayatBacaan = riwayatBacaan.map(item => {
                    if (item.path !== chapter.path) return item;
                    return { ...item, title: `${book.title} - ${oldName}` };
                });
                await customAlert(t('msg_edit_chapter_fail') || 'Gagal menyimpan nama chapter. Coba lagi setelah menjalankan ulang aplikasi.', 'Error');
                return;
            }

            showBookDetail(book);
        };

        window.deleteChapter = async function(bookId, chapterIndex) {
            const book = libraryData.find(b => b.id == bookId);
            if (!book || !book.chapters || !book.chapters[chapterIndex]) return;

            const chapter = book.chapters[chapterIndex];
            const confirmed = await customConfirm(
                (t('msg_delete_chapter_confirm') || 'Hapus chapter ini dari daftar aplikasi? File asli di komputer Anda tetap aman.') + `\n\n${chapter.name}`,
                t('modal_delete_chapter_title') || 'Hapus Chapter',
                t('btn_delete') || 'Hapus',
                t('btn_cancel') || 'Batal'
            );
            if (!confirmed) return;

            const removedChapter = book.chapters.splice(chapterIndex, 1)[0];
            riwayatBacaan = riwayatBacaan.filter(r => r.path !== removedChapter.path);

            const saved = await saveData();
            if (!saved) {
                book.chapters.splice(chapterIndex, 0, removedChapter);
                await customAlert(t('msg_delete_chapter_fail') || 'Gagal menghapus chapter. Coba lagi setelah menjalankan ulang aplikasi.', 'Error');
                return;
            }

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
                renderHistoryList(riwayatBacaan);
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
        let pendingBookId = null;
        const genreLists = {
            commonComic: ['Action', 'Romance', 'Fantasy', 'Sci-Fi', 'Slice of Life', 'Horror', 'Mystery', 'Comedy', 'Drama', 'Psychological', 'Supernatural', 'Sports', 'Historical'],
            manga: ['Shounen', 'Shoujo', 'Seinen', 'Josei', 'Isekai', 'Mecha', 'Iyashikei', 'Mahou Shoujo'],
            manhwa: ['Hunter/System', 'Regression', 'Murim', 'Villainess', 'School Bullying'],
            manhua: ['Wuxia', 'Xianxia', 'Xuanhuan', 'Cultivation'],
            artikel: ['News', 'Feature', 'Opinion', 'Editorial', 'Guide', 'Review', 'Essay'],
            journal: ['Original Research', 'Literature Review', 'Case Study', 'Methodology', 'Short Communication'],
            novel: ['Romance', 'Mystery', 'Horror', 'Fantasy', 'Sci-Fi', 'Thriller', 'Historical', 'Teenlit', 'Chicklit', 'Metropop', 'Comedy', 'Inspirational']
        };

        function inferManualBookType(filePath) {
            const ext = path.extname(filePath).toLowerCase();
            if (ext === '.txt' || ext === '.md' || ext === '.epub') return 'Novel';
            if (ext === '.cbz' || ext === '.zip') return 'Manga';
            return 'Artikel';
        }

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
        btnCancelAdd.addEventListener('click', () => {
            modalAddBook.classList.remove('show');
            pendingBookPath = null;
            pendingBookId = null;
        });

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
            const existingDraft = pendingBookId ? libraryData.find(b => b.id === pendingBookId) : null;
            const bookData = {
                id: existingDraft ? existingDraft.id : Date.now(),
                title: inputTitle.value, 
                author: inputAuthor.value || 'Unknown',
                path: pendingBookPath, 
                importSource: 'manual',
                type: inputType.value,
                genre: selectedGenres, 
                synopsis: inputSynopsis.value,
                publishDate: (inputType.value === 'Artikel' || inputType.value === 'Journal') ? inputDate.value : null,
                cover: inputCover.value || null
            };

            const newBook = existingDraft ? Object.assign(existingDraft, bookData) : bookData;
            if (!existingDraft) libraryData.unshift(newBook);
            await saveData();
            modalAddBook.classList.remove('show');
            pendingBookPath = null;
            pendingBookId = null;
            showBookDetail(newBook);
        });

        btnPilihFile.addEventListener('click', async () => {
            const filePath = await ipcRenderer.invoke('dialog:openFile');
            if (filePath) {
                const selectedPath = filePath.replace(/[\\/]+/g, '/').toLowerCase();
                let book = libraryData.find(b => {
                    const bookPath = String(b.path || '').replace(/[\\/]+/g, '/').toLowerCase();
                    return bookPath === selectedPath;
                });
                if (book) {
                    if (book.importSource !== 'manual') {
                        book.importSource = 'manual';
                        await saveData();
                    }
                    showBookDetail(book);
                } else {
                    const defaultType = inferManualBookType(filePath);
                    const newBook = {
                        id: Date.now(),
                        title: path.basename(filePath, path.extname(filePath)),
                        author: 'Unknown',
                        path: filePath,
                        importSource: 'manual',
                        type: defaultType,
                        genre: '',
                        synopsis: '',
                        publishDate: (defaultType === 'Artikel' || defaultType === 'Journal') ? '' : null,
                        cover: null
                    };

                    libraryData.unshift(newBook);
                    const saved = await saveData();
                    if (!saved) {
                        libraryData = libraryData.filter(b => b.id !== newBook.id);
                        await customAlert('Gagal menyimpan file import. Coba jalankan ulang aplikasi lalu import lagi.', 'Error');
                        return;
                    }

                    pendingBookPath = filePath;
                    pendingBookId = newBook.id;
                    inputTitle.value = path.basename(filePath, path.extname(filePath));
                    inputAuthor.value = '';
                    inputCover.value = '';
                    inputSynopsis.value = '';
                    inputType.value = defaultType;
                    inputDate.value = '';
                    updateGenreOptions();
                    showBookDetail(newBook);
                    modalAddBook.classList.add('show');
                }
            }
        });

    if (btnCreateFolder) {
        btnCreateFolder.addEventListener('click', () => {
            inputCfFolder.value = '';
            populateCreateFolderLocations();
            inputCfAuthor.value = '';
            inputCfCover.value = '';
            inputCfType.value = '';
            inputCfDate.value = '';
            inputCfSynopsis.value = '';
            updateCfGenreOptions();
            modalCreateFolder.classList.add('show');
        });
    }

    function populateCreateFolderLocations() {
        if (!inputCfLocation) return;

        inputCfLocation.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.innerText = t('folder_location_default') || 'KeiYomi Library (Default)';
        inputCfLocation.appendChild(defaultOption);

        const uniqueFolders = [...new Set((userSettings.customFolders || []).filter(Boolean))];
        uniqueFolders.forEach(folderPath => {
            const option = document.createElement('option');
            option.value = folderPath;
            option.innerText = folderPath;
            inputCfLocation.appendChild(option);
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
            basePath: inputCfLocation ? inputCfLocation.value : '',
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
            shell.openPath(result.path);
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
                const normalizeLibraryPath = (targetPath) => String(targetPath || '').replace(/[\\/]+/g, '/').toLowerCase();

                scannedBooks.forEach(newBook => {
                    const normNewBookPath = normalizeLibraryPath(newBook.path);
                    if (ignoredPathsSet.has(normNewBookPath)) return; // Abaikan jika ada di ignore list

                    const exists = libraryData.find(b => {
                        const normExistPath = normalizeLibraryPath(b.path);
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
                            const mergedChapterPaths = new Set(mergedChapters.map(chapter => normalizeLibraryPath(chapter.path)));
                            const manualChapters = existingChapters.filter(chapter => {
                                if (!chapter || !chapter.path) return false;
                                const chapterPath = normalizeLibraryPath(chapter.path);
                                return chapter.importSource === 'manual' && !mergedChapterPaths.has(chapterPath);
                            });
                            newBook.chapters = [...mergedChapters, ...manualChapters];
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
                            importSource: exists.importSource,
                            isManualImport: exists.isManualImport,
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

                const scannedPaths = new Set(scannedBooks.map(b => normalizeLibraryPath(b.path)));
                libraryData = libraryData.filter(book => {
                if (isManualImportedBook(book)) return true; // Pertahankan buku yang diimpor manual
                const normPath = normalizeLibraryPath(book.path);
                return scannedPaths.has(normPath); // Hapus buku otomatis yang file/foldernya telah dihapus/hilang
                });

                await saveData();
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
            currentReaderTitle = fileName;
            
            btnBack.style.display = 'block';
            searchInput.style.display = 'none';
            readerSettingsContainer.style.display = 'block';
            updateReadingProgressVisibility();
            updatePageJumpControl();
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

            cleanupObjectUrls();
            reader.innerHTML = '';
            updatePageJumpControl();
            showReaderLoadingMessage(fileName);
            reader.scrollTop = 0;
            isReaderLoading = true;
            reader.classList.add('reader-loading');
            reader.style.overflowY = 'hidden';
            resetReaderSearch();
            updateReaderModeUI();

            updateFullscreenButton(); // Set initial state for fullscreen button
            const chapterNavigationContext = getChapterNavigationContext(filePath);
            try {
                renderChapterNavigation(chapterNavigationContext, 'top');

                if (ext === '.pdf') {
                    await renderPDF(filePath, myRenderId);
                } else if (ext === '.cbz' || ext === '.zip') {
                    await renderCBZ(filePath, myRenderId);
                } else if (ext === '.epub') {
                    await renderEPUB(filePath, myRenderId);
                } else if (ext === '.md') {
                    await renderMD(filePath, myRenderId);
                } else if (ext === '.txt') {
                    await renderTXT(filePath, myRenderId);
                } else {
                    renderSimulasiWebtoon(ext, myRenderId);
                }

                if (myRenderId !== currentRenderId) return;

                renderChapterNavigation(chapterNavigationContext, 'bottom');
                updatePageJumpControl();

                if (historyItem.lastPage && historyItem.lastPage > 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    if (myRenderId !== currentRenderId) return;
                    const pageElement = document.querySelector(`.page-placeholder[data-page="${historyItem.lastPage}"]`);
                    if (pageElement) {
                        // Menggunakan scrollTop manual agar tidak menggeser seluruh UI
                        const readerPaddingTop = parseInt(window.getComputedStyle(reader).paddingTop, 10) || 0;
                        reader.scrollTop = pageElement.offsetTop - readerPaddingTop;
                        updatePageJumpControl(historyItem.lastPage);
                    }
                }
            } finally {
                if (myRenderId === currentRenderId) {
                    hideReaderLoadingMessage();
                    setTimeout(() => {
                        if (myRenderId !== currentRenderId) return;
                        isReaderLoading = false;
                        reader.classList.remove('reader-loading');
                        reader.style.overflowY = '';
                        updateScrollProgress();
                        updatePageJumpControl();
                    }, 250);
                }
            }

            if (!hasSeenFullscreenTip) {
                hasSeenFullscreenTip = true;
                setTimeout(() => {
                    showToast(t('msg_reader_tips') || "Tip: Tekan F1 untuk Layar Penuh, dan F2 untuk Mode Cahaya Malam (Eye Comfort).", 5000);
                }, 800); // Munculkan pop up setelah buku termuat
            }
        }

        function showReaderLoadingMessage(fileName) {
            hideReaderLoadingMessage();
            const loading = document.createElement('div');
            loading.className = 'reader-loading-message';
            loading.id = 'reader-loading-message';
            loading.innerHTML = `
                <div class="reader-loading-spinner"></div>
                <div>
                    <div class="reader-loading-title">${escapeHtml(t('reader_loading_title') || 'Sedang memuat bacaan...')}</div>
                    <div class="reader-loading-subtitle">${escapeHtml(fileName)}</div>
                </div>
            `;
            const mainContent = document.querySelector('.main-content');
            (mainContent || document.body).appendChild(loading);
        }

        function hideReaderLoadingMessage() {
            const loading = document.getElementById('reader-loading-message');
            if (loading) loading.remove();
        }

        function resetReaderSearch() {
            readerSearchIndex = [];
            readerSearchMatches = [];
            readerSearchMatchIndex = -1;
            if (readerSearchInput) readerSearchInput.value = '';
            if (readerSearchStatus) readerSearchStatus.innerText = '0/0';
            if (readerSearchPanel) readerSearchPanel.classList.remove('show');
            document.querySelectorAll('.page-placeholder.search-hit').forEach(page => page.classList.remove('search-hit'));
            clearPdfSearchHighlights();
        }

        function openReaderSearch() {
            if (!readerSearchPanel || !readerSearchInput) return;
            if (reader.style.display !== 'flex') return;

            if (readerSearchIndex.length === 0) {
                showToast(t('reader_search_unavailable') || 'Pencarian teks hanya tersedia untuk PDF yang punya lapisan teks.', 3500);
                return;
            }

            readerSearchPanel.classList.add('show');
            settingsPopup.classList.remove('show');
            readerSearchInput.focus();
            readerSearchInput.select();
        }

        function updateReaderSearchStatus() {
            if (!readerSearchStatus) return;
            if (readerSearchMatches.length === 0) {
                readerSearchStatus.innerText = '0/0';
                return;
            }
            readerSearchStatus.innerText = `${readerSearchMatchIndex + 1}/${readerSearchMatches.length}`;
        }

        function goToReaderSearchMatch(direction = 0) {
            if (readerSearchMatches.length === 0) {
                updateReaderSearchStatus();
                showToast(t('reader_search_no_result') || 'Kalimat tidak ditemukan.', 2500);
                return;
            }

            if (direction !== 0) {
                readerSearchMatchIndex = (readerSearchMatchIndex + direction + readerSearchMatches.length) % readerSearchMatches.length;
            }

            const match = readerSearchMatches[readerSearchMatchIndex];
            const pageElement = document.querySelector(`.page-placeholder[data-page="${match.page}"]`);
            if (!pageElement) return;

            document.querySelectorAll('.page-placeholder.search-hit').forEach(page => page.classList.remove('search-hit'));
            renderPdfSearchHighlight(match);

            reader.scrollTo({
                top: getReaderSearchScrollTop(match, pageElement),
                behavior: 'smooth'
            });
            updateReaderSearchStatus();
        }

        function getReaderSearchScrollTop(match, pageElement) {
            const readerPaddingTop = parseInt(window.getComputedStyle(reader).paddingTop, 10) || 0;
            const surface = pageElement.querySelector('.pdf-page-surface');
            const firstHighlightTop = match.highlights.length > 0
                ? Math.min(...match.highlights.map(item => item.top))
                : 0;

            if (!surface) {
                return pageElement.offsetTop - readerPaddingTop - 12;
            }

            const highlightOffset = (firstHighlightTop / 100) * surface.offsetHeight;
            const preferredViewportPosition = Math.max(90, reader.clientHeight * 0.38);
            return pageElement.offsetTop + surface.offsetTop + highlightOffset - preferredViewportPosition;
        }

        function runReaderSearch() {
            if (!readerSearchInput) return;
            const query = readerSearchInput.value.trim().toLowerCase();
            document.querySelectorAll('.page-placeholder.search-hit').forEach(page => page.classList.remove('search-hit'));
            clearPdfSearchHighlights();

            if (!query) {
                readerSearchMatches = [];
                readerSearchMatchIndex = -1;
                updateReaderSearchStatus();
                return;
            }

            readerSearchMatches = readerSearchIndex
                .flatMap(item => findPdfTextMatches(item, query));
            readerSearchMatchIndex = readerSearchMatches.length > 0 ? 0 : -1;
            goToReaderSearchMatch(0);
        }

        function clearPdfSearchHighlights() {
            document.querySelectorAll('.pdf-search-highlight').forEach(highlight => highlight.remove());
        }

        function findPdfTextMatches(pageIndex, query) {
            const matches = [];
            let startIndex = pageIndex.text.indexOf(query);

            while (startIndex !== -1) {
                const endIndex = startIndex + query.length;
                const highlights = pageIndex.items
                    .filter(item => item.end > startIndex && item.start < endIndex)
                    .map(item => clipPdfHighlightToMatch(item, startIndex, endIndex))
                    .filter(Boolean);
                if (highlights.length > 0) {
                    matches.push({ page: pageIndex.page, highlights });
                }
                startIndex = pageIndex.text.indexOf(query, startIndex + Math.max(1, query.length));
            }

            return matches;
        }

        function clipPdfHighlightToMatch(item, matchStart, matchEnd) {
            const itemLength = Math.max(1, item.end - item.start);
            const overlapStart = Math.max(item.start, matchStart);
            const overlapEnd = Math.min(item.end, matchEnd);
            if (overlapEnd <= overlapStart) return null;

            const localStartRatio = (overlapStart - item.start) / itemLength;
            const localEndRatio = (overlapEnd - item.start) / itemLength;

            return {
                left: item.left + (item.width * localStartRatio),
                top: item.top,
                width: Math.max(0.35, item.width * (localEndRatio - localStartRatio)),
                height: item.height
            };
        }

        function renderPdfSearchHighlight(match) {
            clearPdfSearchHighlights();

            const pageElement = document.querySelector(`.page-placeholder[data-page="${match.page}"]`);
            const layer = pageElement && pageElement.querySelector('.pdf-highlight-layer');
            if (!layer) return;

            match.highlights.forEach(item => {
                const highlight = document.createElement('span');
                highlight.className = 'pdf-search-highlight';
                highlight.style.left = `${item.left}%`;
                highlight.style.top = `${item.top}%`;
                highlight.style.width = `${item.width}%`;
                highlight.style.height = `${item.height}%`;
                layer.appendChild(highlight);
            });
        }

        if (btnReaderSearchToggle) btnReaderSearchToggle.addEventListener('click', openReaderSearch);
        if (btnReaderSearch) btnReaderSearch.addEventListener('click', runReaderSearch);
        if (btnReaderSearchPrev) btnReaderSearchPrev.addEventListener('click', () => goToReaderSearchMatch(-1));
        if (btnReaderSearchNext) btnReaderSearchNext.addEventListener('click', () => goToReaderSearchMatch(1));
        if (btnReaderSearchClose) {
            btnReaderSearchClose.addEventListener('click', () => {
                readerSearchPanel.classList.remove('show');
                document.querySelectorAll('.page-placeholder.search-hit').forEach(page => page.classList.remove('search-hit'));
                clearPdfSearchHighlights();
            });
        }
        if (readerSearchInput) {
            readerSearchInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    if (event.shiftKey) goToReaderSearchMatch(-1);
                    else if (readerSearchMatches.length > 0) goToReaderSearchMatch(1);
                    else runReaderSearch();
                }
                if (event.key === 'Escape') {
                    readerSearchPanel.classList.remove('show');
                    clearPdfSearchHighlights();
                }
            });
        }

        // --- NIGHT LIGHT / EYE COMFORT LOGIC ---
        function clampNightIntensity(value) {
            const parsed = Number.parseInt(value, 10);
            if (Number.isNaN(parsed)) return 50;
            return Math.min(100, Math.max(0, parsed));
        }

        function applyNightMode() {
            if (userSettings.nightModeEnabled) {
                const intensity = clampNightIntensity(userSettings.nightModeIntensity);
                const distance = Math.abs(intensity - 50) / 50;
                let bgColor = 'rgba(0, 0, 0, 0)';
                let filter = 'none';

                if (intensity > 50) {
                    const alpha = 0.10 + (distance * 0.42);
                    const sepia = Math.round(18 + (distance * 42));
                    const saturate = Math.round(108 + (distance * 34));
                    const brightness = (1 - (distance * 0.08)).toFixed(2);
                    bgColor = `linear-gradient(180deg, rgba(255, 214, 92, ${alpha}) 0%, rgba(255, 132, 36, ${alpha * 0.92}) 100%)`;
                    filter = `sepia(${sepia}%) saturate(${saturate}%) brightness(${brightness})`;
                } else if (intensity < 50) {
                    const alpha = 0.08 + (distance * 0.30);
                    const saturate = Math.round(112 + (distance * 48));
                    const brightness = (1 + (distance * 0.05)).toFixed(2);
                    bgColor = `linear-gradient(180deg, rgba(74, 201, 255, ${alpha}) 0%, rgba(37, 99, 235, ${alpha * 0.88}) 100%)`;
                    filter = `saturate(${saturate}%) brightness(${brightness})`;
                }
                
                nightLightOverlay.style.background = bgColor;
                nightLightOverlay.style.backdropFilter = filter;
                nightLightOverlay.style.webkitBackdropFilter = filter;
                nightLightOverlay.classList.add('active');
            } else {
                nightLightOverlay.classList.remove('active');
                nightLightOverlay.style.background = 'rgba(0, 0, 0, 0)';
                nightLightOverlay.style.backdropFilter = 'none';
                nightLightOverlay.style.webkitBackdropFilter = 'none';
            }
        }

        function updateNightModeButton() {
            if (!btnToggleNightmode) return;
            const span = btnToggleNightmode.querySelector('span');
            const svg = btnToggleNightmode.querySelector('svg');
            if (userSettings.nightModeEnabled) {
                btnToggleNightmode.classList.add('active');
                span.innerText = t('reader_night_mode_exit') || "Matikan Mode Malam";
                svg.innerHTML = '<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>';
            } else {
                btnToggleNightmode.classList.remove('active');
                span.innerText = t('reader_night_mode_enter') || "Aktifkan Mode Malam";
                svg.innerHTML = '<path d="M9.37 5.51A7.35 7.35 0 0 0 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0 1 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>';
            }
        }

        function updateNightPreviewButton() {
            if (!btnPreviewNightIntensity) return;
            btnPreviewNightIntensity.classList.toggle('active', nightModeSettingsPreview);
            btnPreviewNightIntensity.innerText = nightModeSettingsPreview ? 'Matikan Tes' : 'Tes Intensitas';
        }

        function toggleNightMode() {
            userSettings.nightModeEnabled = !userSettings.nightModeEnabled;
            nightModeSettingsPreview = false;
            applyNightMode();
            updateNightModeButton();
            updateNightPreviewButton();
            saveData();
        }

        btnToggleNightmode.addEventListener('click', toggleNightMode);

        settingNightIntensity.addEventListener('input', (e) => {
            userSettings.nightModeIntensity = clampNightIntensity(e.target.value);
            e.target.value = userSettings.nightModeIntensity;
            if (nightModeSettingsPreview) applyNightMode();
            clearTimeout(nightModeSaveTimeout);
            nightModeSaveTimeout = setTimeout(saveData, 500);
        });

        if (btnResetNightIntensity) {
            btnResetNightIntensity.addEventListener('click', () => {
                userSettings.nightModeIntensity = 50;
                settingNightIntensity.value = 50;
                if (nightModeSettingsPreview) applyNightMode();
                saveData();
                showToast('Intensitas cahaya malam dikembalikan ke netral.', 2500);
            });
        }

        if (btnPreviewNightIntensity) {
            btnPreviewNightIntensity.addEventListener('click', () => {
                nightModeSettingsPreview = !nightModeSettingsPreview;
                userSettings.nightModeEnabled = true;
                userSettings.nightModeIntensity = clampNightIntensity(settingNightIntensity.value);
                if (!nightModeSettingsPreview) {
                    userSettings.nightModeEnabled = false;
                }
                applyNightMode();
                updateNightModeButton();
                updateNightPreviewButton();
                saveData();
                showToast(nightModeSettingsPreview ? 'Mode cahaya malam aktif. Geser slider untuk mencoba intensitas.' : 'Tes intensitas cahaya malam dimatikan.', 3500);
            });
        }

        function createChapterNavigation(foundBook, foundIndex, position = 'bottom') {
            const container = document.createElement('div');
            container.className = `chapter-navigation chapter-navigation-${position}`;

            if (foundIndex > 0) {
                const prevChapter = foundBook.chapters[foundIndex - 1];
                const btnPrev = document.createElement('button');
                btnPrev.className = 'btn-action btn-primary-action';
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
                btnNext.title = nextChapter.name;
                btnNext.innerHTML = `${t('msg_chapter_next')} <svg style="width:20px;height:20px;margin-left:8px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>`;
                btnNext.onclick = () => {
                    reader.scrollTop = 0;
                    const nextTitle = `${foundBook.title} - ${nextChapter.name}`;
                    bacaFile(nextChapter.path, nextTitle);
                };
                container.appendChild(btnNext);
            }

            return container;
        }

        function getChapterNavigationContext(currentPath) {
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

            return foundBook && foundIndex !== -1 ? { foundBook, foundIndex } : null;
        }

        function renderChapterNavigation(context, position = 'both') {
            if (!context) return;

            const { foundBook, foundIndex } = context;
            if (position === 'top' || position === 'both') {
                const topNavigation = createChapterNavigation(foundBook, foundIndex, 'top');
                if (topNavigation.children.length > 0) reader.insertBefore(topNavigation, reader.firstChild);
            }

            if (position === 'bottom' || position === 'both') {
                const bottomNavigation = createChapterNavigation(foundBook, foundIndex, 'bottom');
                if (bottomNavigation.children.length > 0) reader.appendChild(bottomNavigation);
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

        // --- FULLSCREEN LOGIC ---
        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.error(err));
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(err => console.error(err));
                }
            }
        }

        function updateFullscreenButton() {
            const span = btnToggleFullscreen.querySelector('span');
            const svg = btnToggleFullscreen.querySelector('svg');
            if (document.fullscreenElement) {
                span.innerText = t('reader_fullscreen_exit') || "Keluar Layar Penuh";
                svg.innerHTML = '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>';
            } else {
                span.innerText = t('reader_fullscreen_enter') || "Mode Layar Penuh";
                svg.innerHTML = '<path d="M5 5h5V3H3v7h2V5zm5 14H5v-5H3v7h7v-2zm11-5h-2v5h-5v2h7v-7zm-2-9h-5V3h7v7h-2V5z"/>';
            }
        }

        btnToggleFullscreen.addEventListener('click', toggleFullscreen);
        document.addEventListener('fullscreenchange', updateFullscreenButton);

        async function renderPDF(filePath, renderId) {
            try {
                const data = await fs.readFile(filePath);
                if (renderId !== currentRenderId) return;

                const loadingTask = pdfjsLib.getDocument(new Uint8Array(data));
                const pdf = await loadingTask.promise;
                const isOriginalQuality = userSettings.pdfQualityMode === 'original';
                const baseScale = isOriginalQuality ? 1.75 : 1.5;
                const outputScale = isOriginalQuality ? Math.min(window.devicePixelRatio || 1, 2) : 1;
                const textIndex = [];
                
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    if (renderId !== currentRenderId) return;

                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: baseScale });
                    const textContentPromise = page.getTextContent()
                        .then(textContent => buildPdfPageSearchIndex(textContent, viewport, pageNum))
                        .catch(() => null);

                    const div = document.createElement('div');
                    div.className = 'page-placeholder';
                    div.setAttribute('data-page', pageNum);
                    div.style.height = 'auto';
                    div.style.background = 'transparent';
                    div.style.boxShadow = 'none';
                    div.innerText = '';

                    const surface = document.createElement('div');
                    surface.className = 'pdf-page-surface';
                    surface.style.width = `${Math.floor(viewport.width)}px`;

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = Math.floor(viewport.width * outputScale);
                    canvas.height = Math.floor(viewport.height * outputScale);
                    canvas.style.width = `${Math.floor(viewport.width)}px`;
                    canvas.style.height = 'auto';
                    canvas.style.maxWidth = '100%';
                    canvas.style.display = 'block'; 

                    const highlightLayer = document.createElement('div');
                    highlightLayer.className = 'pdf-highlight-layer';
                    
                    surface.appendChild(canvas);
                    surface.appendChild(highlightLayer);
                    div.appendChild(surface);
                    reader.appendChild(div);

                    const renderContext = {
                        canvasContext: context,
                        viewport,
                        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
                    };
                    await page.render(renderContext).promise;

                    const pageIndex = await textContentPromise;
                    if (pageIndex && pageIndex.text) {
                        textIndex.push(pageIndex);
                    }
                }

                if (renderId === currentRenderId) {
                    readerSearchIndex = textIndex;
                }
            } catch (error) {
                reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat PDF: ${escapeHtml(error.message)}</div>`;
            }
        }

        function buildPdfPageSearchIndex(textContent, viewport, pageNum) {
            const items = [];
            let pageText = '';

            textContent.items.forEach(textItem => {
                const rawText = String(textItem.str || '').replace(/\s+/g, ' ').trim();
                if (!rawText) return;

                if (pageText) pageText += ' ';
                const start = pageText.length;
                pageText += rawText.toLowerCase();
                const end = pageText.length;

                const transform = pdfjsLib.Util.transform(viewport.transform, textItem.transform);
                const fontHeight = Math.hypot(transform[2], transform[3]) || Math.abs(transform[3]) || 10;
                const x = transform[4];
                const y = transform[5];
                const itemWidth = Math.max(2, (textItem.width || rawText.length * fontHeight * 0.45) * viewport.scale);
                const itemHeight = Math.max(8, fontHeight * 1.15);

                items.push({
                    start,
                    end,
                    text: rawText.toLowerCase(),
                    left: Math.max(0, (x / viewport.width) * 100),
                    top: Math.max(0, ((y - itemHeight) / viewport.height) * 100),
                    width: Math.min(100, (itemWidth / viewport.width) * 100),
                    height: Math.min(100, (itemHeight / viewport.height) * 100)
                });
            });

            return { page: pageNum, text: pageText, items };
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

                    const imageUrl = rememberObjectUrl(URL.createObjectURL(fileData));
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
                reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat CBZ/ZIP: ${escapeHtml(error.message)}</div>`;
            }
        }

        function getElementsByLocalName(root, localName) {
            return Array.from(root.getElementsByTagName('*')).filter(el => el.localName === localName);
        }

        function resolveZipPath(baseDir, relativePath) {
            const baseParts = baseDir ? baseDir.split('/').filter(Boolean) : [];
            const relParts = String(relativePath || '').split('#')[0].split('/').filter(Boolean);
            const parts = [...baseParts];

            relParts.forEach(part => {
                if (part === '.') return;
                if (part === '..') parts.pop();
                else parts.push(part);
            });

            return parts.join('/');
        }

        function getZipFile(zip, filePath) {
            const normalized = String(filePath || '').replace(/\\/g, '/');
            const exact = zip.file(normalized);
            if (exact) return exact;

            try {
                return zip.file(decodeURIComponent(normalized));
            } catch {
                return null;
            }
        }

        function sanitizeEpubContent(root) {
            const blockedTags = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'title']);
            const allowedAttrs = new Set(['src', 'alt', 'title', 'colspan', 'rowspan']);

            Array.from(root.querySelectorAll('*')).forEach(el => {
                const tagName = el.tagName.toLowerCase();
                if (blockedTags.has(tagName)) {
                    el.remove();
                    return;
                }

                Array.from(el.attributes).forEach(attr => {
                    const name = attr.name.toLowerCase();
                    if (name.startsWith('on') || !allowedAttrs.has(name)) {
                        el.removeAttribute(attr.name);
                    }
                });
            });
        }

        async function renderEPUB(filePath, renderId) {
            try {
                const fileContent = await fs.readFile(filePath);
                if (renderId !== currentRenderId) return;

                const zip = await JSZip.loadAsync(fileContent);
                const containerFile = zip.file('META-INF/container.xml');
                if (!containerFile) throw new Error('container.xml tidak ditemukan.');

                const parser = new DOMParser();
                const containerXml = parser.parseFromString(await containerFile.async('text'), 'application/xml');
                const rootfile = getElementsByLocalName(containerXml, 'rootfile')[0];
                const opfPath = rootfile && rootfile.getAttribute('full-path');
                const opfFile = getZipFile(zip, opfPath);
                if (!opfPath || !opfFile) throw new Error('File OPF EPUB tidak ditemukan.');

                const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';
                const opfXml = parser.parseFromString(await opfFile.async('text'), 'application/xml');
                const manifestItems = new Map();
                getElementsByLocalName(opfXml, 'item').forEach(item => {
                    const id = item.getAttribute('id');
                    const href = item.getAttribute('href');
                    if (id && href) {
                        manifestItems.set(id, {
                            href,
                            mediaType: item.getAttribute('media-type') || ''
                        });
                    }
                });

                const spineRefs = getElementsByLocalName(opfXml, 'itemref')
                    .map(itemref => manifestItems.get(itemref.getAttribute('idref')))
                    .filter(Boolean);

                if (spineRefs.length === 0) throw new Error('Daftar chapter EPUB kosong.');

                for (let i = 0; i < spineRefs.length; i++) {
                    if (renderId !== currentRenderId) return;

                    const spineItem = spineRefs[i];
                    const chapterPath = resolveZipPath(opfDir, spineItem.href);
                    const chapterFile = getZipFile(zip, chapterPath);
                    if (!chapterFile) continue;

                    const chapterDir = chapterPath.includes('/') ? chapterPath.slice(0, chapterPath.lastIndexOf('/')) : '';
                    const chapterHtml = await chapterFile.async('text');
                    const doc = parser.parseFromString(chapterHtml, 'text/html');
                    const body = doc.body;
                    if (!body) continue;

                    const imageTasks = Array.from(body.querySelectorAll('img')).map(async img => {
                        const rawSrc = img.getAttribute('src') || img.getAttribute('xlink:href') || img.getAttribute('href');
                        if (!rawSrc || /^https?:|^data:/i.test(rawSrc)) {
                            img.removeAttribute('src');
                            return;
                        }

                        const imagePath = resolveZipPath(chapterDir, rawSrc);
                        const imageFile = getZipFile(zip, imagePath);
                        if (!imageFile) {
                            img.removeAttribute('src');
                            return;
                        }

                        const blob = await imageFile.async('blob');
                        const objectUrl = rememberObjectUrl(URL.createObjectURL(blob));
                        img.setAttribute('src', objectUrl);
                    });

                    await Promise.all(imageTasks);
                    sanitizeEpubContent(body);
                    if (renderId !== currentRenderId) return;

                    const div = document.createElement('div');
                    div.className = 'page-placeholder epub-page';
                    div.setAttribute('data-page', i + 1);
                    div.style.height = 'auto';
                    div.innerText = '';

                    while (body.firstChild) {
                        div.appendChild(document.importNode(body.firstChild, true));
                        body.removeChild(body.firstChild);
                    }

                    reader.appendChild(div);
                }

                if (reader.children.length === 0) {
                    throw new Error('Tidak ada konten EPUB yang bisa ditampilkan.');
                }
            } catch (error) {
                cleanupObjectUrls();
                reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat EPUB: ${escapeHtml(error.message)}</div>`;
            }
        }

        async function renderTXT(filePath, renderId) {
            try {
                const data = await fs.readFile(filePath, 'utf8');
                if (renderId !== currentRenderId) return;

                const div = document.createElement('div');
                div.className = 'page-placeholder';
                div.setAttribute('data-page', 1);
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
                reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat TXT: ${escapeHtml(error.message)}</div>`;
            }
        }

        function getDirectoryName(filePath) {
            const text = String(filePath || '');
            const separatorIndex = Math.max(text.lastIndexOf('\\'), text.lastIndexOf('/'));
            return separatorIndex >= 0 ? text.slice(0, separatorIndex) : '';
        }

        function toFileUrl(filePath) {
            const normalized = String(filePath || '').replace(/\\/g, '/');
            const prefix = normalized.startsWith('/') ? 'file://' : 'file:///';
            return prefix + normalized.split('/').map(part => encodeURIComponent(part)).join('/');
        }

        function resolveMarkdownResource(baseDir, resourcePath) {
            const value = String(resourcePath || '').trim();
            if (!value || /^(https?:|data:|file:|mailto:|#)/i.test(value)) return value;
            const normalized = value.split('#')[0].replace(/\\/g, '/');
            const hash = value.includes('#') ? value.slice(value.indexOf('#')) : '';
            const resolved = path.isAbsolute(normalized) ? normalized : path.join(baseDir, normalized);
            return toFileUrl(resolved) + hash;
        }

        function sanitizeMarkdownContent(root, baseDir) {
            const blockedTags = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta']);
            const allowedAttrs = new Set(['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'class']);

            Array.from(root.querySelectorAll('*')).forEach(el => {
                const tagName = el.tagName.toLowerCase();
                if (blockedTags.has(tagName)) {
                    el.remove();
                    return;
                }

                Array.from(el.attributes).forEach(attr => {
                    const name = attr.name.toLowerCase();
                    if (name.startsWith('on') || !allowedAttrs.has(name)) {
                        el.removeAttribute(attr.name);
                    }
                });

                if (tagName === 'img') {
                    const src = el.getAttribute('src') || '';
                    if (/^javascript:/i.test(src)) {
                        el.removeAttribute('src');
                    } else {
                        el.setAttribute('src', resolveMarkdownResource(baseDir, src));
                    }
                }

                if (tagName === 'a') {
                    const href = el.getAttribute('href') || '';
                    if (/^javascript:/i.test(href)) {
                        el.removeAttribute('href');
                    } else if (href) {
                        el.setAttribute('href', resolveMarkdownResource(baseDir, href));
                        el.setAttribute('target', '_blank');
                        el.setAttribute('rel', 'noopener noreferrer');
                    }
                }
            });
        }

        function markdownToHtml(markdown, filePath) {
            const markedParser = window.marked && (window.marked.marked || window.marked);
            const source = String(markdown || '');
            const rawHtml = markedParser && typeof markedParser.parse === 'function'
                ? markedParser.parse(source, { breaks: false, gfm: true })
                : `<pre><code>${escapeHtml(source)}</code></pre>`;
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawHtml, 'text/html');
            sanitizeMarkdownContent(doc.body, getDirectoryName(filePath));
            return doc.body.innerHTML;
        }

        async function renderMD(filePath, renderId) {
            try {
                const data = await fs.readFile(filePath, 'utf8');
                if (renderId !== currentRenderId) return;

                const div = document.createElement('div');
                div.className = 'page-placeholder markdown-page';
                div.setAttribute('data-page', 1);
                div.style.height = 'auto';
                div.innerHTML = markdownToHtml(data, filePath);
                reader.appendChild(div);
            } catch (error) {
                reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat MD: ${escapeHtml(error.message)}</div>`;
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

        function getReaderPages() {
            return Array.from(reader.querySelectorAll('.page-placeholder'))
                .filter(page => Number.isFinite(parseInt(page.getAttribute('data-page'), 10)));
        }

        function getCurrentReaderPage() {
            const pages = getReaderPages();
            if (pages.length === 0) return 1;

            const readerRect = reader.getBoundingClientRect();
            let closestPage = pages[0];
            let minDistance = Infinity;

            for (const page of pages) {
                const rect = page.getBoundingClientRect();
                if (rect.bottom > readerRect.top && rect.top < readerRect.bottom) {
                    const distance = Math.abs(rect.top - readerRect.top);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPage = page;
                    }
                }
            }

            return parseInt(closestPage.getAttribute('data-page'), 10) || 1;
        }

        function updatePageJumpControl(forcedPage = null) {
            if (!pageJumpControl || !pageJumpSlider || !pageJumpInput || !pageJumpCurrent || !pageJumpTotal) return;

            const pages = getReaderPages();
            const totalPages = pages.length;
            if (!userSettings.showPageSlider || reader.style.display !== 'flex' || totalPages === 0) {
                pageJumpControl.classList.remove('visible');
                return;
            }

            const currentPage = Math.min(Math.max(parseInt(forcedPage || getCurrentReaderPage(), 10) || 1, 1), totalPages);
            pageJumpSlider.max = totalPages;
            pageJumpSlider.value = currentPage;
            pageJumpInput.max = totalPages;
            if (document.activeElement !== pageJumpInput) {
                pageJumpInput.value = currentPage;
            }
            pageJumpCurrent.innerText = String(currentPage);
            pageJumpTotal.innerText = String(totalPages);
            pageJumpSlider.disabled = totalPages <= 1;
            pageJumpInput.disabled = totalPages <= 1;
            if (pageJumpPrev) pageJumpPrev.disabled = currentPage <= 1;
            if (pageJumpNext) pageJumpNext.disabled = currentPage >= totalPages;
            pageJumpControl.classList.add('visible');
        }

        function updateReadingProgressVisibility() {
            if (!scrollProgressIndicator) return;
            const shouldShow = userSettings.showReadingProgress && reader.style.display === 'flex';
            scrollProgressIndicator.classList.toggle('visible', shouldShow);
        }

        function updateReaderControlButtons() {
            if (togglePageSlider) {
                const span = togglePageSlider.querySelector('span');
                togglePageSlider.classList.toggle('active', userSettings.showPageSlider);
                togglePageSlider.setAttribute('aria-pressed', String(userSettings.showPageSlider));
                if (span) {
                    span.innerText = userSettings.showPageSlider ? 'Sembunyikan slider halaman' : 'Tampilkan slider halaman';
                }
            }

            if (toggleReadingProgress) {
                const span = toggleReadingProgress.querySelector('span');
                toggleReadingProgress.classList.toggle('active', userSettings.showReadingProgress);
                toggleReadingProgress.setAttribute('aria-pressed', String(userSettings.showReadingProgress));
                if (span) {
                    span.innerText = userSettings.showReadingProgress ? 'Sembunyikan persentase baca' : 'Tampilkan persentase baca';
                }
            }
        }

        function goToPage(pageNumber, behavior = 'auto') {
            const pages = getReaderPages();
            if (pages.length === 0) return;

            const targetPage = Math.min(Math.max(parseInt(pageNumber, 10) || 1, 1), pages.length);
            const pageElement = pages.find(page => parseInt(page.getAttribute('data-page'), 10) === targetPage) || pages[targetPage - 1];
            if (!pageElement) return;

            const readerPaddingTop = parseInt(window.getComputedStyle(reader).paddingTop, 10) || 0;
            reader.scrollTo({
                top: pageElement.offsetTop - readerPaddingTop,
                behavior
            });
            if (pageJumpInput) pageJumpInput.value = targetPage;
            updatePageJumpControl(targetPage);

            const historyItem = riwayatBacaan.find(r => r.path === currentBookPath);
            if (historyItem && historyItem.lastPage !== targetPage) {
                historyItem.lastPage = targetPage;
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(saveData, 500);
            }
        }

        function updateScrollProgress() {
            updateReadingProgressVisibility();
            if (!userSettings.showReadingProgress) return;

            const { scrollTop, scrollHeight, clientHeight } = reader;
            if (scrollHeight > clientHeight) {
                const scrollPercent = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
                scrollProgressIndicator.innerText = `${scrollPercent}%`;
            } else {
                scrollProgressIndicator.innerText = '100%';
            }
        }

        reader.addEventListener('scroll', () => {
            updateScrollProgress();
            updatePageJumpControl();

            if (isReaderLoading) return;
            if (!currentBookPath) return;

            const pageNum = getCurrentReaderPage();
            const historyItem = riwayatBacaan.find(r => r.path === currentBookPath);
            if (historyItem && historyItem.lastPage !== pageNum) {
                historyItem.lastPage = pageNum;
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(saveData, 1000);
            }
        });

        if (pageJumpSlider) {
            pageJumpSlider.addEventListener('input', () => {
                goToPage(pageJumpSlider.value, 'auto');
            });
        }

        if (pageJumpInput) {
            pageJumpInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    goToPage(pageJumpInput.value);
                    pageJumpInput.blur();
                }
            });
            pageJumpInput.addEventListener('change', () => {
                goToPage(pageJumpInput.value);
            });
            pageJumpInput.addEventListener('blur', () => {
                updatePageJumpControl();
            });
            pageJumpInput.addEventListener('wheel', (e) => {
                e.preventDefault();
                pageJumpInput.blur();
            });
        }

        if (pageJumpPrev) {
            pageJumpPrev.addEventListener('click', () => {
                goToPage(getCurrentReaderPage() - 1);
            });
        }

        if (pageJumpNext) {
            pageJumpNext.addEventListener('click', () => {
                goToPage(getCurrentReaderPage() + 1);
            });
        }

        if (togglePageSlider) {
            togglePageSlider.addEventListener('click', () => {
                userSettings.showPageSlider = !userSettings.showPageSlider;
                updateReaderControlButtons();
                updatePageJumpControl();
                saveData();
            });
        }

        if (toggleReadingProgress) {
            toggleReadingProgress.addEventListener('click', () => {
                userSettings.showReadingProgress = !userSettings.showReadingProgress;
                updateReaderControlButtons();
                updateReadingProgressVisibility();
                updateScrollProgress();
                saveData();
            });
        }

        updateReaderControlButtons();

        function renderExplore() {
            const genres = new Set();
            libraryData.forEach(book => {
                if(book.genre) book.genre.split(',').forEach(g => genres.add(g.trim()));
            });
            
            const filterContainer = document.getElementById('explore-filters');
            filterContainer.innerHTML = '';
            const allTag = document.createElement('div');
            allTag.className = 'filter-tag active';
            allTag.innerText = t('filter_all');
            allTag.addEventListener('click', () => filterGenre('all', allTag));
            filterContainer.appendChild(allTag);
            genres.forEach(g => {
                const tag = document.createElement('div');
                tag.className = 'filter-tag';
                tag.innerText = g;
                tag.addEventListener('click', () => filterGenre(g, tag));
                filterContainer.appendChild(tag);
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
            userSettings = { username: '', theme: 'light', language: 'id', customFolders: [], ignoredPaths: [], nightModeEnabled: false, nightModeIntensity: 50, pdfQualityMode: 'light', showPageSlider: true, showReadingProgress: true };

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
            userSettings.pdfQualityMode = settingPdfQuality ? settingPdfQuality.value : 'light';
            const selectedMode = document.getElementById('setting-mode').value;
            
            isWebtoonMode = (selectedMode === 'webtoon');
            updateReaderModeUI();
            
            applyTheme(userSettings.theme);
            applyLanguage(userSettings.language);
            await saveData();
            await customAlert(t('msg_saved'), "Berhasil");
        });

        function openLink(url) { shell.openExternal(url); }

        async function checkUpdate() {
            try {
                const result = await ipcRenderer.invoke('updater:check');
                if (result.error) { await customAlert(t('msg_update_fail') + result.error, "Gagal"); return; }
                if (result.updateAvailable) {
                    const releaseUrl = result.remoteInfo.releaseUrl || `https://github.com/KeishaXD/KeiYomi/releases/tag/v${result.remoteInfo.version}`;
                    const msg = `${t('msg_update_available').replace('{0}', result.remoteInfo.version)}\n\nChangelog:\n${result.remoteInfo.changelog || '-'}\n\n${t('msg_update_open_release')}`;

                    if (await customConfirm(msg, t('title_update_available'), t('btn_open_release'), t('btn_cancel'))) {
                        openLink(releaseUrl);
                    }
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
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && reader.style.display === 'flex') {
                e.preventDefault();
                openReaderSearch();
                return;
            }

            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            // Shortcut Fullscreen F1 (Toggle Hidup / Mati)
            if (e.key === 'F1' && reader.style.display === 'flex') {
                e.preventDefault();
                toggleFullscreen();
                return;
            }

            // Shortcut Mode Malam (Night Light) F2
            if (e.key === 'F2' && reader.style.display === 'flex') {
                e.preventDefault();
                toggleNightMode();
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
                if (readerSearchPanel && readerSearchPanel.classList.contains('show')) {
                    readerSearchPanel.classList.remove('show');
                    clearPdfSearchHighlights();
                    return;
                }
                if (btnBack.style.display !== 'none') { btnBack.click(); return; }
                if (await customConfirm(t('msg_exit_confirm'), "Keluar Aplikasi", "Ya, Keluar")) ipcRenderer.send('app:quit');
            }

            if (reader.style.display === 'flex') {
                if (isReaderLoading) return;
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
            if (next) {
                const readerPaddingTop = parseInt(window.getComputedStyle(reader).paddingTop, 10) || 0;
                reader.scrollTo({
                    top: next.offsetTop - readerPaddingTop,
                    behavior: 'smooth'
                });
            }
        }

        function goToPrevPage() {
            const pages = Array.from(document.querySelectorAll('.page-placeholder'));
            const readerRect = reader.getBoundingClientRect();
            const prevs = pages.filter(p => p.getBoundingClientRect().top < readerRect.top - 50);
            if (prevs.length > 0) {
                const prev = prevs[prevs.length - 1];
                const readerPaddingTop = parseInt(window.getComputedStyle(reader).paddingTop, 10) || 0;
                reader.scrollTo({
                    top: prev.offsetTop - readerPaddingTop,
                    behavior: 'smooth'
                });
            }
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
