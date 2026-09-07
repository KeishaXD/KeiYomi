async function bacaFile(filePath, title) {
  const fileName = title || path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  currentReaderSupportsSpread = [".pdf", ".cbz", ".zip", ".cbr"].includes(ext);

  currentRenderId++;
  const myRenderId = currentRenderId;

  document
    .querySelectorAll(".view-section")
    .forEach((el) => (el.style.display = "none"));
  reader.style.display = "flex";
  pageTitle.innerText = fileName;
  currentReaderTitle = fileName;

  btnBack.style.display = "block";
  searchInput.style.display = "none";
  readerSettingsContainer.style.display = "block";
  updateReadingProgressVisibility();
  updatePageJumpControl();
  btnRefresh.style.display = "none";

  currentBookPath = filePath;
  let historyItem = riwayatBacaan.find((r) => r.path === filePath);

  if (historyItem) {
    riwayatBacaan = riwayatBacaan.filter((r) => r.path !== filePath);
  } else {
    const libBook = libraryData.find((b) => b.path === filePath);
    historyItem = libBook
      ? { ...libBook }
      : { title: fileName, path: filePath };
    historyItem.lastPage = 1;
  }

  riwayatBacaan.unshift(historyItem);
  saveData();

  cleanupObjectUrls();
  reader.innerHTML = "";
  updatePageJumpControl();
  showReaderLoadingMessage(fileName);
  reader.scrollTop = 0;
  isReaderLoading = true;
  reader.classList.add("reader-loading");
  setReaderControlsLoading(true);
  reader.style.overflowY = "hidden";
  resetReaderSearch();
  updateReaderModeUI(false);

  updateFullscreenButton(); // Set initial state for fullscreen button
  const chapterNavigationContext = getChapterNavigationContext(filePath);
  try {
    renderChapterNavigation(chapterNavigationContext, "top");

    if (ext === ".pdf") {
      await renderPDF(filePath, myRenderId);
    } else if (ext === ".cbz" || ext === ".zip") {
      await renderCBZ(filePath, myRenderId);
    } else if (ext === ".cbr") {
      await renderCBR(filePath, myRenderId);
    } else if (ext === ".epub") {
      await renderEPUB(filePath, myRenderId);
    } else if (ext === ".md") {
      await renderMD(filePath, myRenderId);
    } else if (ext === ".docx") {
      await renderDOCX(filePath, myRenderId);
    } else if (ext === ".txt") {
      await renderTXT(filePath, myRenderId);
    } else {
      renderSimulasiWebtoon(ext, myRenderId);
    }

    if (myRenderId !== currentRenderId) return;

    renderChapterNavigation(chapterNavigationContext, "bottom");
    applyReaderSpreadLayout(false);
    updatePageJumpControl();

    if (historyItem.lastPage && historyItem.lastPage > 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (myRenderId !== currentRenderId) return;
      if (isSpreadModeActive()) {
        goToPage(historyItem.lastPage);
        return;
      }
      const pageElement = document.querySelector(
        `.page-placeholder[data-page="${historyItem.lastPage}"]`,
      );
      if (pageElement) {
        // Menggunakan scrollTop manual agar tidak menggeser seluruh UI
        const readerPaddingTop =
          parseInt(window.getComputedStyle(reader).paddingTop, 10) || 0;
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
        reader.classList.remove("reader-loading");
        setReaderControlsLoading(false);
        reader.style.overflowY = "";
        updateScrollProgress();
        updatePageJumpControl();
      }, 250);
    }
  }

  if (!hasSeenFullscreenTip) {
    hasSeenFullscreenTip = true;
    setTimeout(() => {
      showToast(
        t("msg_reader_tips") ||
          "Tip: Tekan F1 untuk Layar Penuh, dan F2 untuk Mode Cahaya Malam (Eye Comfort).",
        5000,
      );
    }, 800); // Munculkan pop up setelah buku termuat
  }
}

function showReaderLoadingMessage(fileName) {
  hideReaderLoadingMessage();
  const loading = document.createElement("div");
  loading.className = "reader-loading-message";
  loading.id = "reader-loading-message";
  loading.innerHTML = `
                <div class="reader-loading-spinner"></div>
                <div>
                    <div class="reader-loading-title">${escapeHtml(t("reader_loading_title") || "Sedang memuat bacaan...")}</div>
                    <div class="reader-loading-subtitle">${escapeHtml(fileName)}</div>
                </div>
            `;
  const mainContent = document.querySelector(".main-content");
  (mainContent || document.body).appendChild(loading);
}

function hideReaderLoadingMessage() {
  const loading = document.getElementById("reader-loading-message");
  if (loading) loading.remove();
}

function resetReaderSearch() {
  readerSearchIndex = [];
  readerSearchMatches = [];
  readerSearchMatchIndex = -1;
  if (readerSearchInput) readerSearchInput.value = "";
  if (readerSearchStatus) readerSearchStatus.innerText = "0/0";
  if (readerSearchPanel) readerSearchPanel.classList.remove("show");
  document
    .querySelectorAll(".page-placeholder.search-hit")
    .forEach((page) => page.classList.remove("search-hit"));
  clearPdfSearchHighlights();
}

function openReaderSearch() {
  if (!readerSearchPanel || !readerSearchInput) return;
  if (reader.style.display !== "flex") return;

  if (readerSearchIndex.length === 0) {
    showToast(
      t("reader_search_unavailable") ||
        "Pencarian teks hanya tersedia untuk PDF yang punya lapisan teks.",
      3500,
    );
    return;
  }

  readerSearchPanel.classList.add("show");
  settingsPopup.classList.remove("show");
  readerSearchInput.focus();
  readerSearchInput.select();
}

function updateReaderSearchStatus() {
  if (!readerSearchStatus) return;
  if (readerSearchMatches.length === 0) {
    readerSearchStatus.innerText = "0/0";
    return;
  }
  readerSearchStatus.innerText = `${readerSearchMatchIndex + 1}/${readerSearchMatches.length}`;
}

function goToReaderSearchMatch(direction = 0) {
  if (readerSearchMatches.length === 0) {
    updateReaderSearchStatus();
    showToast(t("reader_search_no_result") || "Kalimat tidak ditemukan.", 2500);
    return;
  }

  if (direction !== 0) {
    readerSearchMatchIndex =
      (readerSearchMatchIndex + direction + readerSearchMatches.length) %
      readerSearchMatches.length;
  }

  const match = readerSearchMatches[readerSearchMatchIndex];
  const pageElement = document.querySelector(
    `.page-placeholder[data-page="${match.page}"]`,
  );
  if (!pageElement) return;

  document
    .querySelectorAll(".page-placeholder.search-hit")
    .forEach((page) => page.classList.remove("search-hit"));
  renderPdfSearchHighlight(match);

  reader.scrollTo({
    top: getReaderSearchScrollTop(match, pageElement),
    behavior: "smooth",
  });
  updateReaderSearchStatus();
}

function getReaderSearchScrollTop(match, pageElement) {
  const readerPaddingTop =
    parseInt(window.getComputedStyle(reader).paddingTop, 10) || 0;
  const surface = pageElement.querySelector(".pdf-page-surface");
  const firstHighlightTop =
    match.highlights.length > 0
      ? Math.min(...match.highlights.map((item) => item.top))
      : 0;

  if (!surface) {
    return pageElement.offsetTop - readerPaddingTop - 12;
  }

  const highlightOffset = (firstHighlightTop / 100) * surface.offsetHeight;
  const preferredViewportPosition = Math.max(90, reader.clientHeight * 0.38);
  return (
    pageElement.offsetTop +
    surface.offsetTop +
    highlightOffset -
    preferredViewportPosition
  );
}

function runReaderSearch() {
  if (!readerSearchInput) return;
  const query = readerSearchInput.value.trim().toLowerCase();
  document
    .querySelectorAll(".page-placeholder.search-hit")
    .forEach((page) => page.classList.remove("search-hit"));
  clearPdfSearchHighlights();

  if (!query) {
    readerSearchMatches = [];
    readerSearchMatchIndex = -1;
    updateReaderSearchStatus();
    return;
  }

  readerSearchMatches = readerSearchIndex.flatMap((item) =>
    findPdfTextMatches(item, query),
  );
  readerSearchMatchIndex = readerSearchMatches.length > 0 ? 0 : -1;
  goToReaderSearchMatch(0);
}

function clearPdfSearchHighlights() {
  document
    .querySelectorAll(".pdf-search-highlight")
    .forEach((highlight) => highlight.remove());
}

function findPdfTextMatches(pageIndex, query) {
  const matches = [];
  let startIndex = pageIndex.text.indexOf(query);

  while (startIndex !== -1) {
    const endIndex = startIndex + query.length;
    const highlights = pageIndex.items
      .filter((item) => item.end > startIndex && item.start < endIndex)
      .map((item) => clipPdfHighlightToMatch(item, startIndex, endIndex))
      .filter(Boolean);
    if (highlights.length > 0) {
      matches.push({ page: pageIndex.page, highlights });
    }
    startIndex = pageIndex.text.indexOf(
      query,
      startIndex + Math.max(1, query.length),
    );
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
    left: item.left + item.width * localStartRatio,
    top: item.top,
    width: Math.max(0.35, item.width * (localEndRatio - localStartRatio)),
    height: item.height,
  };
}

function renderPdfSearchHighlight(match) {
  clearPdfSearchHighlights();

  const pageElement = document.querySelector(
    `.page-placeholder[data-page="${match.page}"]`,
  );
  const layer =
    pageElement && pageElement.querySelector(".pdf-highlight-layer");
  if (!layer) return;

  match.highlights.forEach((item) => {
    const highlight = document.createElement("span");
    highlight.className = "pdf-search-highlight";
    highlight.style.left = `${item.left}%`;
    highlight.style.top = `${item.top}%`;
    highlight.style.width = `${item.width}%`;
    highlight.style.height = `${item.height}%`;
    layer.appendChild(highlight);
  });
}

if (btnReaderSearchToggle)
  btnReaderSearchToggle.addEventListener("click", openReaderSearch);
if (btnReaderSearch) btnReaderSearch.addEventListener("click", runReaderSearch);
if (btnReaderSearchPrev)
  btnReaderSearchPrev.addEventListener("click", () =>
    goToReaderSearchMatch(-1),
  );
if (btnReaderSearchNext)
  btnReaderSearchNext.addEventListener("click", () => goToReaderSearchMatch(1));
if (btnReaderSearchClose) {
  btnReaderSearchClose.addEventListener("click", () => {
    readerSearchPanel.classList.remove("show");
    document
      .querySelectorAll(".page-placeholder.search-hit")
      .forEach((page) => page.classList.remove("search-hit"));
    clearPdfSearchHighlights();
  });
}
if (readerSearchInput) {
  readerSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      if (event.shiftKey) goToReaderSearchMatch(-1);
      else if (readerSearchMatches.length > 0) goToReaderSearchMatch(1);
      else runReaderSearch();
    }
    if (event.key === "Escape") {
      readerSearchPanel.classList.remove("show");
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
    let bgColor = "rgba(0, 0, 0, 0)";
    let filter = "none";

    if (intensity > 50) {
      const alpha = 0.1 + distance * 0.42;
      const sepia = Math.round(18 + distance * 42);
      const saturate = Math.round(108 + distance * 34);
      const brightness = (1 - distance * 0.08).toFixed(2);
      bgColor = `linear-gradient(180deg, rgba(255, 214, 92, ${alpha}) 0%, rgba(255, 132, 36, ${alpha * 0.92}) 100%)`;
      filter = `sepia(${sepia}%) saturate(${saturate}%) brightness(${brightness})`;
    } else if (intensity < 50) {
      const alpha = 0.08 + distance * 0.3;
      const saturate = Math.round(112 + distance * 48);
      const brightness = (1 + distance * 0.05).toFixed(2);
      bgColor = `linear-gradient(180deg, rgba(74, 201, 255, ${alpha}) 0%, rgba(37, 99, 235, ${alpha * 0.88}) 100%)`;
      filter = `saturate(${saturate}%) brightness(${brightness})`;
    }

    nightLightOverlay.style.background = bgColor;
    nightLightOverlay.style.backdropFilter = filter;
    nightLightOverlay.style.webkitBackdropFilter = filter;
    nightLightOverlay.classList.add("active");
  } else {
    nightLightOverlay.classList.remove("active");
    nightLightOverlay.style.background = "rgba(0, 0, 0, 0)";
    nightLightOverlay.style.backdropFilter = "none";
    nightLightOverlay.style.webkitBackdropFilter = "none";
  }
}

function updateNightModeButton() {
  if (!btnToggleNightmode) return;
  const span = btnToggleNightmode.querySelector("span");
  const svg = btnToggleNightmode.querySelector("svg");
  if (userSettings.nightModeEnabled) {
    btnToggleNightmode.classList.add("active");
    span.innerText = t("reader_night_mode_exit") || "Matikan Mode Malam";
    svg.innerHTML =
      '<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>';
  } else {
    btnToggleNightmode.classList.remove("active");
    span.innerText = t("reader_night_mode_enter") || "Aktifkan Mode Malam";
    svg.innerHTML =
      '<path d="M9.37 5.51A7.35 7.35 0 0 0 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0 1 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>';
  }
}

function updateNightPreviewButton() {
  if (!btnPreviewNightIntensity) return;
  btnPreviewNightIntensity.classList.toggle("active", nightModeSettingsPreview);
  btnPreviewNightIntensity.innerText = nightModeSettingsPreview
    ? "Matikan Tes"
    : "Tes Intensitas";
}

function toggleNightMode() {
  userSettings.nightModeEnabled = !userSettings.nightModeEnabled;
  nightModeSettingsPreview = false;
  applyNightMode();
  updateNightModeButton();
  updateNightPreviewButton();
  saveData();
}

btnToggleNightmode.addEventListener("click", toggleNightMode);

settingNightIntensity.addEventListener("input", (e) => {
  userSettings.nightModeIntensity = clampNightIntensity(e.target.value);
  e.target.value = userSettings.nightModeIntensity;
  if (nightModeSettingsPreview) applyNightMode();
  clearTimeout(nightModeSaveTimeout);
  nightModeSaveTimeout = setTimeout(saveData, 500);
});

if (btnResetNightIntensity) {
  btnResetNightIntensity.addEventListener("click", () => {
    userSettings.nightModeIntensity = 50;
    settingNightIntensity.value = 50;
    if (nightModeSettingsPreview) applyNightMode();
    saveData();
    showToast("Intensitas cahaya malam dikembalikan ke netral.", 2500);
  });
}

if (btnPreviewNightIntensity) {
  btnPreviewNightIntensity.addEventListener("click", () => {
    nightModeSettingsPreview = !nightModeSettingsPreview;
    userSettings.nightModeEnabled = true;
    userSettings.nightModeIntensity = clampNightIntensity(
      settingNightIntensity.value,
    );
    if (!nightModeSettingsPreview) {
      userSettings.nightModeEnabled = false;
    }
    applyNightMode();
    updateNightModeButton();
    updateNightPreviewButton();
    saveData();
    showToast(
      nightModeSettingsPreview
        ? "Mode cahaya malam aktif. Geser slider untuk mencoba intensitas."
        : "Tes intensitas cahaya malam dimatikan.",
      3500,
    );
  });
}

function createChapterNavigation(foundBook, foundIndex, position = "bottom") {
  const container = document.createElement("div");
  container.className = `chapter-navigation chapter-navigation-${position}`;

  if (foundIndex > 0) {
    const prevChapter = foundBook.chapters[foundIndex - 1];
    const btnPrev = document.createElement("button");
    btnPrev.className = "btn-action btn-primary-action";
    btnPrev.title = prevChapter.name;
    btnPrev.disabled = isReaderLoading;
    btnPrev.innerHTML = `<svg style="width:20px;height:20px;margin-right:8px;fill:currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> ${t("msg_chapter_prev")}`;
    btnPrev.onclick = () => {
      if (isReaderLoading) return;
      reader.scrollTop = 0;
      const prevTitle = `${foundBook.title} - ${prevChapter.name}`;
      bacaFile(prevChapter.path, prevTitle);
    };
    container.appendChild(btnPrev);
  }

  if (foundIndex < foundBook.chapters.length - 1) {
    const nextChapter = foundBook.chapters[foundIndex + 1];
    const btnNext = document.createElement("button");
    btnNext.className = "btn-action btn-primary-action";
    btnNext.title = nextChapter.name;
    btnNext.disabled = isReaderLoading;
    btnNext.innerHTML = `${t("msg_chapter_next")} <svg style="width:20px;height:20px;margin-left:8px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>`;
    btnNext.onclick = () => {
      if (isReaderLoading) return;
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
      const idx = b.chapters.findIndex((c) => c.path === currentPath);
      if (idx !== -1) {
        foundBook = b;
        foundIndex = idx;
        break;
      }
    }
  }

  return foundBook && foundIndex !== -1 ? { foundBook, foundIndex } : null;
}

function renderChapterNavigation(context, position = "both") {
  if (!context) return;

  const { foundBook, foundIndex } = context;
  if (position === "top" || position === "both") {
    const topNavigation = createChapterNavigation(foundBook, foundIndex, "top");
    if (topNavigation.children.length > 0)
      reader.insertBefore(topNavigation, reader.firstChild);
  }

  if (position === "bottom" || position === "both") {
    const bottomNavigation = createChapterNavigation(
      foundBook,
      foundIndex,
      "bottom",
    );
    if (bottomNavigation.children.length > 0)
      reader.appendChild(bottomNavigation);
  }
}

function setReaderControlsLoading(loading) {
  if (btnSettingsFab) {
    btnSettingsFab.disabled = loading;
    btnSettingsFab.classList.toggle("disabled", loading);
  }
  if (settingsPopup && loading) settingsPopup.classList.remove("show");
  document.querySelectorAll(".chapter-navigation button").forEach((button) => {
    button.disabled = loading;
  });
}

function isSpreadModeActive() {
  return (
    userSettings.spreadModeEnabled === true &&
    currentReaderSupportsSpread &&
    !isWebtoonMode
  );
}

function getSpreadStartPage(pageNumber) {
  const page = Math.max(parseInt(pageNumber, 10) || 1, 1);
  return page % 2 === 0 ? page - 1 : page;
}

function unwrapPageSpreads() {
  reader.querySelectorAll(".page-spread").forEach((spread) => {
    while (spread.firstChild) {
      spread.parentNode.insertBefore(spread.firstChild, spread);
    }
    spread.remove();
  });
}

function getReaderSpreads() {
  return Array.from(reader.querySelectorAll(".page-spread"));
}

function getActiveReaderSpread() {
  return getReaderSpreads().find((spread) => spread.classList.contains("active"));
}

function cleanupBookTurnOverlay() {
  reader
    .querySelectorAll(".book-turn-overlay")
    .forEach((overlay) => overlay.remove());
  reader.classList.remove("book-turning", "book-turn-next", "book-turn-prev");
}

function createBookTurnBaseSpread(leftPage, rightPage) {
  const spread = document.createElement("div");
  spread.className = "page-spread book-turn-base active";

  [leftPage, rightPage].forEach((page) => {
    if (!page) return;
    spread.appendChild(page.cloneNode(true));
  });

  spread.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  return spread;
}

function runBookTurnAnimation(targetPage, direction) {
  if (!isSpreadModeActive() || spreadTurnAnimating) return false;

  const activeSpread = getActiveReaderSpread();
  const spreads = getReaderSpreads();
  const targetStart = getSpreadStartPage(targetPage);
  const targetSpread = spreads.find(
    (spread) =>
      parseInt(spread.getAttribute("data-spread-start"), 10) === targetStart,
  );
  if (!activeSpread || !targetSpread || activeSpread === targetSpread) {
    return false;
  }

  const activePages = Array.from(activeSpread.children).filter((child) =>
    child.classList.contains("page-placeholder"),
  );
  const targetPages = Array.from(targetSpread.children).filter((child) =>
    child.classList.contains("page-placeholder"),
  );
  const isNext = direction === "next";
  const frontPage = isNext ? activePages[1] || activePages[0] : activePages[0];
  const backPage = isNext
    ? targetPages[0] || targetPages[1]
    : targetPages[1] || targetPages[0];
  const baseLeftPage = isNext ? activePages[0] : targetPages[0];
  const baseRightPage = isNext
    ? targetPages[1] || targetPages[0]
    : activePages[1] || activePages[0];
  if (!frontPage || !backPage) return false;

  cleanupBookTurnOverlay();
  spreadTurnAnimating = true;
  spreadWheelLocked = true;

  const overlay = document.createElement("div");
  overlay.className = `book-turn-overlay ${isNext ? "turn-next" : "turn-prev"}`;

  const underlay = createBookTurnBaseSpread(baseLeftPage, baseRightPage);
  underlay.classList.add("book-turn-underlay");
  overlay.appendChild(underlay);

  const sheet = document.createElement("div");
  sheet.className = "book-turn-sheet";
  const front = document.createElement("div");
  front.className = "book-turn-face book-turn-front";
  const back = document.createElement("div");
  back.className = "book-turn-face book-turn-back";
  front.appendChild(frontPage.cloneNode(true));
  back.appendChild(backPage.cloneNode(true));
  sheet.append(front, back);
  overlay.appendChild(sheet);
  reader.appendChild(overlay);

  reader.classList.add(
    "book-turning",
    isNext ? "book-turn-next" : "book-turn-prev",
  );

  let didFinish = false;
  const finishTurn = () => {
    if (didFinish) return;
    didFinish = true;
    overlay.removeEventListener("animationend", finishTurn);
    reader.classList.add("spread-commit");
    setActiveSpreadPage(targetPage);
    requestAnimationFrame(() => {
      cleanupBookTurnOverlay();
      reader.classList.remove("spread-commit");
      spreadTurnAnimating = false;
      setTimeout(() => {
        spreadWheelLocked = false;
      }, 80);
    });
  };
  sheet.addEventListener("animationend", finishTurn);
  setTimeout(finishTurn, 760);
  return true;
}

function setActiveSpreadPage(pageNumber, updateHistory = true) {
  const pages = getReaderPages();
  if (pages.length === 0) return;

  const spreadStart = getSpreadStartPage(
    Math.min(Math.max(parseInt(pageNumber, 10) || 1, 1), pages.length),
  );
  const spreads = getReaderSpreads();
  const activeSpread =
    spreads.find(
      (spread) =>
        parseInt(spread.getAttribute("data-spread-start"), 10) ===
        spreadStart,
    ) || spreads[0];

  spreads.forEach((spread) => {
    const isActive = spread === activeSpread;
    spread.classList.toggle("active", isActive);
    spread.setAttribute("aria-hidden", String(!isActive));
  });

  reader.scrollTop = 0;
  updatePageJumpControl(spreadStart);
  updateScrollProgress();

  if (!updateHistory) return;
  const historyItem = riwayatBacaan.find((r) => r.path === currentBookPath);
  if (historyItem && historyItem.lastPage !== spreadStart) {
    historyItem.lastPage = spreadStart;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveData, 500);
  }
}

function applyReaderSpreadLayout(preservePage = true) {
  const targetPage = preservePage ? getCurrentReaderPage() : 1;

  cleanupBookTurnOverlay();
  spreadTurnAnimating = false;
  spreadWheelLocked = false;
  unwrapPageSpreads();
  const spreadActive = isSpreadModeActive();
  reader.classList.toggle("spread-mode", spreadActive);

  if (!spreadActive) {
    updatePageJumpControl();
    updateReaderControlButtons();
    return;
  }

  const pages = Array.from(reader.children)
    .filter(
      (child) =>
        child.classList &&
        child.classList.contains("page-placeholder") &&
        Number.isFinite(parseInt(child.getAttribute("data-page"), 10)),
    )
    .sort(
      (a, b) =>
        parseInt(a.getAttribute("data-page"), 10) -
        parseInt(b.getAttribute("data-page"), 10),
    );

  for (let index = 0; index < pages.length; index += 2) {
    const spread = document.createElement("div");
    spread.className = "page-spread";
    spread.setAttribute(
      "data-spread-start",
      pages[index].getAttribute("data-page") || String(index + 1),
    );
    reader.insertBefore(spread, pages[index]);
    spread.appendChild(pages[index]);
    if (pages[index + 1]) spread.appendChild(pages[index + 1]);
  }

  setActiveSpreadPage(targetPage, false);
  updateReaderControlButtons();
}

function updateReaderModeUI(applySpread = true) {
  if (isWebtoonMode) {
    reader.classList.add("webtoon-mode");
    radioWebtoon.checked = true;
  } else {
    reader.classList.remove("webtoon-mode");
    radioPages.checked = true;
  }
  if (applySpread) {
    applyReaderSpreadLayout(true);
  } else {
    unwrapPageSpreads();
    reader.classList.remove("spread-mode");
    updateReaderControlButtons();
  }
}

btnSettingsFab.addEventListener("click", (e) => {
  e.stopPropagation();
  if (isReaderLoading) return;
  settingsPopup.classList.toggle("show");
});

document.addEventListener("click", (e) => {
  if (!settingsPopup.contains(e.target) && !btnSettingsFab.contains(e.target)) {
    settingsPopup.classList.remove("show");
  }
});

function changeMode(mode) {
  isWebtoonMode = mode === "webtoon";
  saveData();
  updateReaderModeUI();
}

radioWebtoon.addEventListener("change", () => changeMode("webtoon"));
radioPages.addEventListener("change", () => changeMode("normal"));

// --- FULLSCREEN LOGIC ---
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement
      .requestFullscreen()
      .catch((err) => console.error(err));
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  }
}

function updateFullscreenButton() {
  const span = btnToggleFullscreen.querySelector("span");
  const svg = btnToggleFullscreen.querySelector("svg");
  if (document.fullscreenElement) {
    span.innerText = t("reader_fullscreen_exit") || "Keluar Layar Penuh";
    svg.innerHTML =
      '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>';
  } else {
    span.innerText = t("reader_fullscreen_enter") || "Mode Layar Penuh";
    svg.innerHTML =
      '<path d="M5 5h5V3H3v7h2V5zm5 14H5v-5H3v7h7v-2zm11-5h-2v5h-5v2h7v-7zm-2-9h-5V3h7v7h-2V5z"/>';
  }
}

btnToggleFullscreen.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", updateFullscreenButton);

function createPdfPageElements(pageNum, viewport) {
  const div = document.createElement("div");
  div.className = "page-placeholder pdf-page-loading";
  div.setAttribute("data-page", pageNum);
  div.setAttribute("data-render-state", "loading");
  div.style.height = "auto";
  div.style.background = "transparent";
  div.style.boxShadow = "none";
  div.innerHTML = `<div class="pdf-page-loader">
    <div class="reader-loading-spinner"></div>
    <span>Memuat halaman ${pageNum}</span>
  </div>`;

  const surface = document.createElement("div");
  surface.className = "pdf-page-surface";
  surface.style.width = `${Math.floor(viewport.width)}px`;

  const highlightLayer = document.createElement("div");
  highlightLayer.className = "pdf-highlight-layer";
  surface.appendChild(highlightLayer);

  return { div, surface, highlightLayer };
}

function createPdfPageCanvas(viewport, outputScale) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  });
  canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
  canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = "auto";
  canvas.style.maxWidth = "100%";
  canvas.style.display = "block";
  context.save();
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();
  return { canvas, context };
}

function isCanvasVisiblyBlank(canvas) {
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) return true;

  const sampleSize = 64;
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = sampleSize;
  sampleCanvas.height = sampleSize;
  const sampleContext = sampleCanvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  });
  sampleContext.drawImage(canvas, 0, 0, sampleSize, sampleSize);

  const pixels = sampleContext.getImageData(0, 0, sampleSize, sampleSize).data;
  let visiblePixels = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (r < 248 || g < 248 || b < 248) visiblePixels++;
    if (visiblePixels > 4) return false;
  }
  return true;
}

async function renderPdfPageWithRetry({
  page,
  pageNum,
  viewport,
  outputScale,
  surface,
  highlightLayer,
  pageElement,
  renderId,
  hasText,
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (renderId !== currentRenderId) return false;

    const { canvas, context } = createPdfPageCanvas(viewport, outputScale);
    surface.replaceChildren(canvas, highlightLayer);
    pageElement.classList.add("pdf-page-loading");
    pageElement.classList.remove("pdf-page-rendered", "pdf-page-error");
    pageElement.setAttribute("data-render-state", "loading");
    pageElement.setAttribute("data-render-attempt", String(attempt));

    try {
      const renderTask = page.render({
        canvasContext: context,
        viewport,
        transform:
          outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null,
      });
      await renderTask.promise;
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const looksBlank = isCanvasVisiblyBlank(canvas);
      if (looksBlank) {
        lastError = new Error(`Halaman ${pageNum} ter-render kosong`);
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 80 * attempt));
          continue;
        }
        if (hasText) throw lastError;
      }

      pageElement.innerHTML = "";
      pageElement.appendChild(surface);
      pageElement.classList.remove("pdf-page-loading", "pdf-page-error");
      pageElement.classList.add("pdf-page-rendered");
      pageElement.setAttribute(
        "data-render-state",
        looksBlank ? "rendered-blank" : "rendered",
      );
      return true;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
    }
  }

  pageElement.classList.remove("pdf-page-loading");
  pageElement.classList.add("pdf-page-error");
  pageElement.setAttribute("data-render-state", "error");
  pageElement.innerHTML = `<div class="pdf-page-loader pdf-page-error-message">
    <span>Gagal memuat halaman ${pageNum}</span>
    <small>${escapeHtml(lastError?.message || "Render PDF gagal")}</small>
  </div>`;
  return false;
}

async function renderPDF(filePath, renderId) {
  try {
    const data = await fs.readFile(filePath);
    if (renderId !== currentRenderId) return;

    const loadingTask = pdfjsLib.getDocument(new Uint8Array(data));
    const pdf = await loadingTask.promise;
    const isOriginalQuality = userSettings.pdfQualityMode === "original";
    const baseScale = isOriginalQuality ? 1.75 : 1.5;
    const outputScale = isOriginalQuality
      ? Math.min(window.devicePixelRatio || 1, 2)
      : 1;
    const textIndex = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      if (renderId !== currentRenderId) return;

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: baseScale });
      const textContentPromise = page
        .getTextContent()
        .then((textContent) =>
          buildPdfPageSearchIndex(textContent, viewport, pageNum),
        )
        .catch(() => null);

      const { div, surface, highlightLayer } = createPdfPageElements(
        pageNum,
        viewport,
      );
      reader.appendChild(div);

      const pageIndex = await textContentPromise;
      await renderPdfPageWithRetry({
        page,
        pageNum,
        viewport,
        outputScale,
        surface,
        highlightLayer,
        pageElement: div,
        renderId,
        hasText: Boolean(pageIndex?.text),
      });

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
  let pageText = "";

  textContent.items.forEach((textItem) => {
    const rawText = String(textItem.str || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!rawText) return;

    if (pageText) pageText += " ";
    const start = pageText.length;
    pageText += rawText.toLowerCase();
    const end = pageText.length;

    const transform = pdfjsLib.Util.transform(
      viewport.transform,
      textItem.transform,
    );
    const fontHeight =
      Math.hypot(transform[2], transform[3]) || Math.abs(transform[3]) || 10;
    const x = transform[4];
    const y = transform[5];
    const itemWidth = Math.max(
      2,
      (textItem.width || rawText.length * fontHeight * 0.45) * viewport.scale,
    );
    const itemHeight = Math.max(8, fontHeight * 1.15);

    items.push({
      start,
      end,
      text: rawText.toLowerCase(),
      left: Math.max(0, (x / viewport.width) * 100),
      top: Math.max(0, ((y - itemHeight) / viewport.height) * 100),
      width: Math.min(100, (itemWidth / viewport.width) * 100),
      height: Math.min(100, (itemHeight / viewport.height) * 100),
    });
  });

  return { page: pageNum, text: pageText, items };
}

async function renderCBZ(filePath, renderId) {
  try {
    const fileContent = await fs.readFile(filePath);
    if (renderId !== currentRenderId) return;

    const zip = await JSZip.loadAsync(fileContent);
    const imageFiles = Object.keys(zip.files).filter((filename) => {
      return (
        !zip.files[filename].dir && /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)
      );
    });

    imageFiles.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
    if (imageFiles.length === 0) {
      reader.innerHTML =
        '<div style="padding:20px; color:red;">Tidak ada gambar ditemukan.</div>';
      return;
    }

    for (let i = 0; i < imageFiles.length; i++) {
      if (renderId !== currentRenderId) return;
      const filename = imageFiles[i];
      const fileData = await zip.files[filename].async("blob");
      if (renderId !== currentRenderId) return;

      const imageUrl = rememberObjectUrl(URL.createObjectURL(fileData));
      const div = document.createElement("div");
      div.className = "page-placeholder";
      div.setAttribute("data-page", i + 1);
      div.style.height = "auto";
      div.style.background = "transparent";
      div.style.boxShadow = "none";
      div.innerText = "";

      const img = document.createElement("img");
      img.src = imageUrl;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.display = "block";

      div.appendChild(img);
      reader.appendChild(div);
    }
  } catch (error) {
    reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat CBZ/ZIP: ${escapeHtml(error.message)}</div>`;
  }
}

async function renderCBR(filePath, renderId) {
  try {
    const imageFiles = await ipcRenderer.invoke("cbr:extract", filePath);
    if (renderId !== currentRenderId) return;

    if (!Array.isArray(imageFiles) || imageFiles.length === 0) {
      reader.innerHTML =
        '<div style="padding:20px; color:red;">Tidak ada gambar ditemukan di CBR.</div>';
      return;
    }

    for (let i = 0; i < imageFiles.length; i++) {
      if (renderId !== currentRenderId) return;

      const item = imageFiles[i];
      const bytes =
        item.data instanceof Uint8Array ? item.data : new Uint8Array(item.data);
      const imageUrl = rememberObjectUrl(
        URL.createObjectURL(
          new Blob([bytes], { type: item.mime || "application/octet-stream" }),
        ),
      );

      const div = document.createElement("div");
      div.className = "page-placeholder";
      div.setAttribute("data-page", i + 1);
      div.style.height = "auto";
      div.style.background = "transparent";
      div.style.boxShadow = "none";
      div.innerText = "";

      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = path.basename(item.name || `Halaman ${i + 1}`);
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.display = "block";

      div.appendChild(img);
      reader.appendChild(div);
    }
  } catch (error) {
    reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat CBR: ${escapeHtml(error.message)}</div>`;
  }
}

function getElementsByLocalName(root, localName) {
  return Array.from(root.getElementsByTagName("*")).filter(
    (el) => el.localName === localName,
  );
}

function resolveZipPath(baseDir, relativePath) {
  const baseParts = baseDir ? baseDir.split("/").filter(Boolean) : [];
  const relParts = String(relativePath || "")
    .split("#")[0]
    .split("/")
    .filter(Boolean);
  const parts = [...baseParts];

  relParts.forEach((part) => {
    if (part === ".") return;
    if (part === "..") parts.pop();
    else parts.push(part);
  });

  return parts.join("/");
}

function getZipFile(zip, filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  const exact = zip.file(normalized);
  if (exact) return exact;

  try {
    return zip.file(decodeURIComponent(normalized));
  } catch {
    return null;
  }
}

function sanitizeEpubContent(root) {
  const blockedTags = new Set([
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "link",
    "meta",
    "title",
  ]);
  const allowedAttrs = new Set(["src", "alt", "title", "colspan", "rowspan"]);

  Array.from(root.querySelectorAll("*")).forEach((el) => {
    const tagName = el.tagName.toLowerCase();
    if (blockedTags.has(tagName)) {
      el.remove();
      return;
    }

    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || !allowedAttrs.has(name)) {
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
    const containerFile = zip.file("META-INF/container.xml");
    if (!containerFile) throw new Error("container.xml tidak ditemukan.");

    const parser = new DOMParser();
    const containerXml = parser.parseFromString(
      await containerFile.async("text"),
      "application/xml",
    );
    const rootfile = getElementsByLocalName(containerXml, "rootfile")[0];
    const opfPath = rootfile && rootfile.getAttribute("full-path");
    const opfFile = getZipFile(zip, opfPath);
    if (!opfPath || !opfFile) throw new Error("File OPF EPUB tidak ditemukan.");

    const opfDir = opfPath.includes("/")
      ? opfPath.slice(0, opfPath.lastIndexOf("/"))
      : "";
    const opfXml = parser.parseFromString(
      await opfFile.async("text"),
      "application/xml",
    );
    const manifestItems = new Map();
    getElementsByLocalName(opfXml, "item").forEach((item) => {
      const id = item.getAttribute("id");
      const href = item.getAttribute("href");
      if (id && href) {
        manifestItems.set(id, {
          href,
          mediaType: item.getAttribute("media-type") || "",
        });
      }
    });

    const spineRefs = getElementsByLocalName(opfXml, "itemref")
      .map((itemref) => manifestItems.get(itemref.getAttribute("idref")))
      .filter(Boolean);

    if (spineRefs.length === 0) throw new Error("Daftar chapter EPUB kosong.");

    for (let i = 0; i < spineRefs.length; i++) {
      if (renderId !== currentRenderId) return;

      const spineItem = spineRefs[i];
      const chapterPath = resolveZipPath(opfDir, spineItem.href);
      const chapterFile = getZipFile(zip, chapterPath);
      if (!chapterFile) continue;

      const chapterDir = chapterPath.includes("/")
        ? chapterPath.slice(0, chapterPath.lastIndexOf("/"))
        : "";
      const chapterHtml = await chapterFile.async("text");
      const doc = parser.parseFromString(chapterHtml, "text/html");
      const body = doc.body;
      if (!body) continue;

      const imageTasks = Array.from(body.querySelectorAll("img")).map(
        async (img) => {
          const rawSrc =
            img.getAttribute("src") ||
            img.getAttribute("xlink:href") ||
            img.getAttribute("href");
          if (!rawSrc || /^https?:|^data:/i.test(rawSrc)) {
            img.removeAttribute("src");
            return;
          }

          const imagePath = resolveZipPath(chapterDir, rawSrc);
          const imageFile = getZipFile(zip, imagePath);
          if (!imageFile) {
            img.removeAttribute("src");
            return;
          }

          const blob = await imageFile.async("blob");
          const objectUrl = rememberObjectUrl(URL.createObjectURL(blob));
          img.setAttribute("src", objectUrl);
        },
      );

      await Promise.all(imageTasks);
      sanitizeEpubContent(body);
      if (renderId !== currentRenderId) return;

      const div = document.createElement("div");
      div.className = "page-placeholder epub-page";
      div.setAttribute("data-page", i + 1);
      div.style.height = "auto";
      div.innerText = "";

      while (body.firstChild) {
        div.appendChild(document.importNode(body.firstChild, true));
        body.removeChild(body.firstChild);
      }

      reader.appendChild(div);
    }

    if (reader.children.length === 0) {
      throw new Error("Tidak ada konten EPUB yang bisa ditampilkan.");
    }
  } catch (error) {
    cleanupObjectUrls();
    reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat EPUB: ${escapeHtml(error.message)}</div>`;
  }
}

async function renderTXT(filePath, renderId) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    if (renderId !== currentRenderId) return;

    const div = document.createElement("div");
    div.className = "page-placeholder";
    div.setAttribute("data-page", 1);
    div.style.height = "auto";
    div.style.background = "white";
    div.style.padding = "40px";
    div.style.whiteSpace = "pre-wrap";
    div.style.fontFamily = "'Segoe UI', sans-serif";
    div.style.fontSize = "1.1rem";
    div.style.lineHeight = "1.8";
    div.style.color = "#333";
    div.innerText = data;
    reader.appendChild(div);
  } catch (error) {
    reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat TXT: ${escapeHtml(error.message)}</div>`;
  }
}

function getDirectoryName(filePath) {
  const text = String(filePath || "");
  const separatorIndex = Math.max(
    text.lastIndexOf("\\"),
    text.lastIndexOf("/"),
  );
  return separatorIndex >= 0 ? text.slice(0, separatorIndex) : "";
}

function toFileUrl(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  const prefix = normalized.startsWith("/") ? "file://" : "file:///";
  return (
    prefix +
    normalized
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")
  );
}

function resolveMarkdownResource(baseDir, resourcePath) {
  const value = String(resourcePath || "").trim();
  if (!value || /^(https?:|data:|file:|mailto:|#)/i.test(value)) return value;
  const normalized = value.split("#")[0].replace(/\\/g, "/");
  const hash = value.includes("#") ? value.slice(value.indexOf("#")) : "";
  const resolved = path.isAbsolute(normalized)
    ? normalized
    : path.join(baseDir, normalized);
  return toFileUrl(resolved) + hash;
}

function sanitizeMarkdownContent(root, baseDir) {
  const blockedTags = new Set([
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "link",
    "meta",
  ]);
  const allowedAttrs = new Set([
    "href",
    "src",
    "alt",
    "title",
    "colspan",
    "rowspan",
    "class",
  ]);

  Array.from(root.querySelectorAll("*")).forEach((el) => {
    const tagName = el.tagName.toLowerCase();
    if (blockedTags.has(tagName)) {
      el.remove();
      return;
    }

    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || !allowedAttrs.has(name)) {
        el.removeAttribute(attr.name);
      }
    });

    if (tagName === "img") {
      const src = el.getAttribute("src") || "";
      if (/^javascript:/i.test(src)) {
        el.removeAttribute("src");
      } else {
        el.setAttribute("src", resolveMarkdownResource(baseDir, src));
      }
    }

    if (tagName === "a") {
      const href = el.getAttribute("href") || "";
      if (/^javascript:/i.test(href)) {
        el.removeAttribute("href");
      } else if (href) {
        el.setAttribute("href", resolveMarkdownResource(baseDir, href));
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    }
  });
}

function markdownToHtml(markdown, filePath) {
  const markedParser = window.marked && (window.marked.marked || window.marked);
  const source = String(markdown || "");
  const rawHtml =
    markedParser && typeof markedParser.parse === "function"
      ? markedParser.parse(source, { breaks: false, gfm: true })
      : `<pre><code>${escapeHtml(source)}</code></pre>`;
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");
  sanitizeMarkdownContent(doc.body, getDirectoryName(filePath));
  return doc.body.innerHTML;
}

async function renderMD(filePath, renderId) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    if (renderId !== currentRenderId) return;

    const div = document.createElement("div");
    div.className = "page-placeholder markdown-page";
    div.setAttribute("data-page", 1);
    div.style.height = "auto";
    div.innerHTML = markdownToHtml(data, filePath);
    reader.appendChild(div);
  } catch (error) {
    reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat MD: ${escapeHtml(error.message)}</div>`;
  }
}

function sanitizeDocxContent(root) {
  const blockedTags = new Set([
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "link",
    "meta",
  ]);
  const allowedAttrs = new Set([
    "href",
    "src",
    "alt",
    "title",
    "colspan",
    "rowspan",
  ]);

  Array.from(root.querySelectorAll("*")).forEach((el) => {
    const tagName = el.tagName.toLowerCase();
    if (blockedTags.has(tagName)) {
      el.remove();
      return;
    }

    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || !allowedAttrs.has(name)) {
        el.removeAttribute(attr.name);
      }
    });

    if (tagName === "a") {
      const href = el.getAttribute("href") || "";
      if (/^javascript:/i.test(href)) {
        el.removeAttribute("href");
      } else if (href) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    }

    if (
      tagName === "img" &&
      /^javascript:/i.test(el.getAttribute("src") || "")
    ) {
      el.removeAttribute("src");
    }
  });
}

async function renderDOCX(filePath, renderId) {
  try {
    if (!window.mammoth || typeof window.mammoth.convertToHtml !== "function") {
      throw new Error("Vendor Mammoth belum dimuat.");
    }

    const data = await fs.readFile(filePath);
    if (renderId !== currentRenderId) return;

    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    );
    const result = await window.mammoth.convertToHtml({ arrayBuffer });
    if (renderId !== currentRenderId) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(result.value || "", "text/html");
    sanitizeDocxContent(doc.body);

    const div = document.createElement("div");
    div.className = "page-placeholder docx-page";
    div.setAttribute("data-page", 1);
    div.style.height = "auto";
    div.innerHTML = doc.body.innerHTML || "<p>Dokumen DOCX kosong.</p>";
    reader.appendChild(div);

    if (Array.isArray(result.messages) && result.messages.length > 0) {
      console.warn("Mammoth DOCX warnings:", result.messages);
    }
  } catch (error) {
    reader.innerHTML = `<div style="padding:20px; color:red;">Gagal memuat DOCX: ${escapeHtml(error.message)}</div>`;
  }
}

function renderSimulasiWebtoon(ext, renderId) {
  for (let i = 1; i <= 5; i++) {
    if (renderId !== currentRenderId) return;
    const page = document.createElement("div");
    page.className = "page-placeholder";
    page.setAttribute("data-page", i);
    page.innerText = `Simulasi Halaman ${i} - Area render untuk ${ext}`;
    reader.appendChild(page);
  }
}

function getReaderPages() {
  return Array.from(reader.querySelectorAll(".page-placeholder")).filter(
    (page) =>
      Number.isFinite(parseInt(page.getAttribute("data-page"), 10)) &&
      !page.closest(".book-turn-overlay"),
  );
}

function getCurrentReaderPage() {
  if (isSpreadModeActive()) {
    const activePage = reader.querySelector(
      ".page-spread.active .page-placeholder",
    );
    if (activePage) {
      return parseInt(activePage.getAttribute("data-page"), 10) || 1;
    }
  }

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

  return parseInt(closestPage.getAttribute("data-page"), 10) || 1;
}

function updatePageJumpControl(forcedPage = null) {
  if (
    !pageJumpControl ||
    !pageJumpSlider ||
    !pageJumpInput ||
    !pageJumpCurrent ||
    !pageJumpTotal
  )
    return;

  const pages = getReaderPages();
  const totalPages = pages.length;
  if (
    !userSettings.showPageSlider ||
    reader.style.display !== "flex" ||
    totalPages === 0
  ) {
    pageJumpControl.classList.remove("visible");
    return;
  }

  const displayPage =
    isPageJumpAnimating && pageJumpAnimatingTarget
      ? pageJumpAnimatingTarget
      : forcedPage || getCurrentReaderPage();
  const currentPage = Math.min(
    Math.max(parseInt(displayPage, 10) || 1, 1),
    totalPages,
  );
  pageJumpSlider.max = totalPages;
  if (!isPageSliderDragging) {
    pageJumpSlider.value = currentPage;
  }
  pageJumpInput.max = totalPages;
  if (document.activeElement !== pageJumpInput && !isPageSliderDragging) {
    pageJumpInput.value = currentPage;
  }
  const currentText = String(currentPage);
  const totalText = String(totalPages);
  if (pageJumpCurrent.innerText !== currentText)
    pageJumpCurrent.innerText = currentText;
  if (pageJumpTotal.innerText !== totalText)
    pageJumpTotal.innerText = totalText;
  pageJumpSlider.disabled = totalPages <= 1;
  pageJumpInput.disabled = totalPages <= 1;
  if (pageJumpPrev) pageJumpPrev.disabled = currentPage <= 1;
  if (pageJumpNext) {
    pageJumpNext.disabled = isSpreadModeActive()
      ? getSpreadStartPage(currentPage) + 2 > totalPages
      : currentPage >= totalPages;
  }
  pageJumpControl.classList.add("visible");
}

function updateReadingProgressVisibility() {
  if (!scrollProgressIndicator) return;
  const shouldShow =
    userSettings.showReadingProgress && reader.style.display === "flex";
  scrollProgressIndicator.classList.toggle("visible", shouldShow);
}

function updateReaderControlButtons() {
  if (toggleSpreadMode) {
    const span = toggleSpreadMode.querySelector("span");
    const spreadActive = isSpreadModeActive();
    toggleSpreadMode.classList.toggle("active", spreadActive);
    toggleSpreadMode.disabled = !currentReaderSupportsSpread || isWebtoonMode;
    toggleSpreadMode.setAttribute("aria-pressed", String(spreadActive));
    if (span) {
      if (!currentReaderSupportsSpread) {
        span.innerText = "Mode buku hanya untuk PDF/komik";
      } else if (isWebtoonMode) {
        span.innerText = "Mode buku perlu Mode Halaman";
      } else {
        span.innerText = userSettings.spreadModeEnabled
          ? "Matikan mode buku"
          : "Mode buku dua halaman";
      }
    }
  }

  if (togglePageSlider) {
    const span = togglePageSlider.querySelector("span");
    togglePageSlider.classList.toggle("active", userSettings.showPageSlider);
    togglePageSlider.setAttribute(
      "aria-pressed",
      String(userSettings.showPageSlider),
    );
    if (span) {
      span.innerText = userSettings.showPageSlider
        ? "Sembunyikan slider halaman"
        : "Tampilkan slider halaman";
    }
  }

  if (toggleReadingProgress) {
    const span = toggleReadingProgress.querySelector("span");
    toggleReadingProgress.classList.toggle(
      "active",
      userSettings.showReadingProgress,
    );
    toggleReadingProgress.setAttribute(
      "aria-pressed",
      String(userSettings.showReadingProgress),
    );
    if (span) {
      span.innerText = userSettings.showReadingProgress
        ? "Sembunyikan persentase baca"
        : "Tampilkan persentase baca";
    }
  }
}

function goToPage(pageNumber, behavior = "auto") {
  const pages = getReaderPages();
  if (pages.length === 0) return;

  const targetPage = Math.min(
    Math.max(parseInt(pageNumber, 10) || 1, 1),
    pages.length,
  );
  if (isSpreadModeActive()) {
    if (behavior === "smooth") {
      const currentPage = getSpreadStartPage(getCurrentReaderPage());
      const targetSpreadPage = getSpreadStartPage(targetPage);
      if (targetSpreadPage !== currentPage) {
        const direction = targetSpreadPage > currentPage ? "next" : "prev";
        if (runBookTurnAnimation(targetSpreadPage, direction)) return;
      }
    }
    setActiveSpreadPage(targetPage);
    return;
  }

  const pageElement =
    pages.find(
      (page) => parseInt(page.getAttribute("data-page"), 10) === targetPage,
    ) || pages[targetPage - 1];
  if (!pageElement) return;

  const readerPaddingTop =
    parseInt(window.getComputedStyle(reader).paddingTop, 10) || 0;
  isPageJumpAnimating = behavior === "smooth";
  pageJumpAnimatingTarget = isPageJumpAnimating ? targetPage : null;
  reader.classList.add("page-jump-scrolling");
  reader.scrollTo({
    top: pageElement.offsetTop - readerPaddingTop,
    behavior,
  });
  setTimeout(
    () => {
      reader.classList.remove("page-jump-scrolling");
      if (isPageJumpAnimating && pageJumpAnimatingTarget === targetPage) {
        isPageJumpAnimating = false;
        pageJumpAnimatingTarget = null;
        updatePageJumpControl(targetPage);
      }
    },
    behavior === "smooth" ? 420 : 80,
  );
  if (pageJumpInput) pageJumpInput.value = targetPage;
  updatePageJumpControl(targetPage);

  const historyItem = riwayatBacaan.find((r) => r.path === currentBookPath);
  if (historyItem && historyItem.lastPage !== targetPage) {
    historyItem.lastPage = targetPage;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveData, 500);
  }
}

function updateScrollProgress() {
  updateReadingProgressVisibility();
  if (!userSettings.showReadingProgress) return;

  if (isSpreadModeActive()) {
    const spreads = getReaderSpreads();
    const activeIndex = Math.max(
      spreads.findIndex((spread) => spread.classList.contains("active")),
      0,
    );
    const maxIndex = Math.max(spreads.length - 1, 1);
    scrollProgressIndicator.innerText = `${Math.round((activeIndex / maxIndex) * 100)}%`;
    return;
  }

  const { scrollTop, scrollHeight, clientHeight } = reader;
  if (scrollHeight > clientHeight) {
    const scrollPercent = Math.round(
      (scrollTop / (scrollHeight - clientHeight)) * 100,
    );
    scrollProgressIndicator.innerText = `${scrollPercent}%`;
  } else {
    scrollProgressIndicator.innerText = "100%";
  }
}

reader.addEventListener("scroll", () => {
  if (readerScrollFrame) return;

  readerScrollFrame = requestAnimationFrame(() => {
    readerScrollFrame = null;
    updateScrollProgress();
    updatePageJumpControl();

    if (isReaderLoading) return;
    if (!currentBookPath) return;

    const pageNum = getCurrentReaderPage();
    const historyItem = riwayatBacaan.find((r) => r.path === currentBookPath);
    if (historyItem && historyItem.lastPage !== pageNum) {
      historyItem.lastPage = pageNum;
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveData, 1000);
    }
  });
});

reader.addEventListener(
  "wheel",
  (event) => {
    if (!isSpreadModeActive() || isReaderLoading) return;
    if (
      event.target.closest(
        "#settings-popup, #reader-search-panel, #page-jump-control",
      )
    )
      return;

    const dominantDelta =
      Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;
    if (Math.abs(dominantDelta) < 8) return;

    event.preventDefault();
    event.stopPropagation();
    if (spreadWheelLocked) return;

    spreadWheelLocked = true;
    const currentPage = getSpreadStartPage(getCurrentReaderPage());
    goToPage(currentPage + (dominantDelta > 0 ? 2 : -2), "smooth");
    setTimeout(() => {
      spreadWheelLocked = false;
    }, 820);
  },
  { passive: false },
);

if (pageJumpSlider) {
  pageJumpSlider.addEventListener("input", () => {
    pageSliderPendingValue = pageJumpSlider.value;
    if (pageJumpCurrent)
      pageJumpCurrent.innerText = String(pageSliderPendingValue);
    if (pageJumpInput) pageJumpInput.value = pageSliderPendingValue;
  });
  pageJumpSlider.addEventListener("pointerdown", () => {
    isPageSliderDragging = true;
    pageSliderPendingValue = pageJumpSlider.value;
  });
  pageJumpSlider.addEventListener("pointerup", () => {
    const target = pageSliderPendingValue || pageJumpSlider.value;
    isPageSliderDragging = false;
    pageSliderPendingValue = null;
    goToPage(target, "smooth");
  });
  pageJumpSlider.addEventListener("pointercancel", () => {
    isPageSliderDragging = false;
    pageSliderPendingValue = null;
    updatePageJumpControl();
  });
  pageJumpSlider.addEventListener("change", () => {
    if (isPageSliderDragging) return;
    goToPage(pageJumpSlider.value, "smooth");
  });
  pageJumpSlider.addEventListener("keydown", (e) => {
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
      ].includes(e.key)
    ) {
      requestAnimationFrame(() => goToPage(pageJumpSlider.value, "smooth"));
    }
  });
}

if (pageJumpInput) {
  pageJumpInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goToPage(pageJumpInput.value);
      pageJumpInput.blur();
    }
  });
  pageJumpInput.addEventListener("change", () => {
    goToPage(pageJumpInput.value);
  });
  pageJumpInput.addEventListener("blur", () => {
    updatePageJumpControl();
  });
  pageJumpInput.addEventListener("wheel", (e) => {
    e.preventDefault();
    pageJumpInput.blur();
  });
}

if (pageJumpPrev) {
  pageJumpPrev.addEventListener("click", () => {
    goToPage(getCurrentReaderPage() - (isSpreadModeActive() ? 2 : 1));
  });
}

if (pageJumpNext) {
  pageJumpNext.addEventListener("click", () => {
    goToPage(getCurrentReaderPage() + (isSpreadModeActive() ? 2 : 1));
  });
}

if (toggleSpreadMode) {
  toggleSpreadMode.addEventListener("click", () => {
    if (!currentReaderSupportsSpread || isWebtoonMode) return;
    userSettings.spreadModeEnabled = !userSettings.spreadModeEnabled;
    applyReaderSpreadLayout(true);
    updateReaderControlButtons();
    saveData();
  });
}

if (togglePageSlider) {
  togglePageSlider.addEventListener("click", () => {
    userSettings.showPageSlider = !userSettings.showPageSlider;
    updateReaderControlButtons();
    updatePageJumpControl();
    saveData();
  });
}

if (toggleReadingProgress) {
  toggleReadingProgress.addEventListener("click", () => {
    userSettings.showReadingProgress = !userSettings.showReadingProgress;
    updateReaderControlButtons();
    updateReadingProgressVisibility();
    updateScrollProgress();
    saveData();
  });
}

updateReaderControlButtons();