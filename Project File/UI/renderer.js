// --- NAVIGATION LOGIC ---
let currentView = "library";
let previousViewBeforeSettings = "library";
let returnToReaderFromSettings = false;
let currentReaderTitle = "";
let bookCoverSrcCache = new WeakMap();
let bookCoverThumbCache = new WeakMap();
const gridHandlerState = new WeakSet();
let searchRenderTimeout = null;
let readerScrollFrame = null;
let coverImageObserver = null;
let isPageSliderDragging = false;
let pageSliderPendingValue = null;
let isPageJumpAnimating = false;
let pageJumpAnimatingTarget = null;
const coverThumbnailQueue = [];
let activeCoverThumbnailJobs = 0;
const scrollIdleTimers = new WeakMap();
const GRID_BATCH_SIZE = 24;
const BLANK_COVER_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const MAX_COVER_THUMBNAIL_JOBS = 2;
const BOOK_COVER_ICON = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M16 10h28a6 6 0 0 1 6 6v40H22a6 6 0 0 1-6-6V10z"/><path d="M22 10v40a6 6 0 0 0 6 6"/><path d="M24 20h16M24 28h14"/></svg>`;
const INLINE_CALENDAR_ICON = `<svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v3h6V2h2v3h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3V2zm13 9H4v9h16v-9zM4 9h16V7H4v2z"/></svg>`;

function switchTab(tabName) {
  if (tabName === "settings") {
    previousViewBeforeSettings =
      currentView === "settings" ? previousViewBeforeSettings : currentView;
    returnToReaderFromSettings = reader.style.display === "flex";
  } else {
    returnToReaderFromSettings = false;
  }

  currentView = tabName;
  document
    .querySelectorAll(".view-section, .reader-container")
    .forEach((el) => (el.style.display = "none"));
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));

  btnBack.style.display = "none";
  searchInput.style.display = "block";
  readerSettingsContainer.style.display = "none";
  if (readerSearchPanel) readerSearchPanel.classList.remove("show");
  scrollProgressIndicator.classList.remove("visible");
  if (pageJumpControl) pageJumpControl.classList.remove("visible");
  btnRefresh.style.display = "none";
  searchInput.value = "";

  if (tabName === "library") {
    document.getElementById("view-library").style.display = "block";
    document.querySelector(".nav-item:nth-child(1)").classList.add("active");
    pageTitle.innerText = t("page_library");
    btnRefresh.style.display = "block";
    renderLibrarySorted();
  } else if (tabName === "history") {
    document.getElementById("view-history").style.display = "block";
    document.querySelector(".nav-item:nth-child(2)").classList.add("active");
    pageTitle.innerText = t("page_history");
    renderHistoryList(riwayatBacaan);
  } else if (tabName === "favorites") {
    document.getElementById("view-favorites").style.display = "block";
    document.querySelector(".nav-item:nth-child(3)").classList.add("active");
    pageTitle.innerText = t("page_favorites");
    const favorites = libraryData.filter((b) => b.isFavorite);
    renderGrid(favorites, "favorites-grid");
  } else if (tabName === "explore") {
    document.getElementById("view-explore").style.display = "block";
    document.querySelector(".nav-item:nth-child(4)").classList.add("active");
    pageTitle.innerText = t("page_explore");
    searchInput.style.display = "block";
    renderExplore();
  } else if (tabName === "settings") {
    document.getElementById("view-settings").style.display = "block";
    document.querySelector(".nav-item:nth-child(5)").classList.add("active");
    pageTitle.innerText = t("page_settings");
    searchInput.style.display = "none";
    btnBack.style.display = "block";

    document.getElementById("setting-username").value = userSettings.username;
    document.getElementById("setting-theme").value = userSettings.theme;
    document.getElementById("setting-mode").value = isWebtoonMode
      ? "webtoon"
      : "normal";
    if (settingPdfQuality)
      settingPdfQuality.value = userSettings.pdfQualityMode || "light";
    document.getElementById("setting-language").value = userSettings.language;
    if (settingAutoCover)
      settingAutoCover.checked = userSettings.autoCoverEnabled === true;
    settingNightIntensity.value = userSettings.nightModeIntensity;
    renderCustomFolders();
    renderIgnoredPaths();
  }
}

function restoreReaderFromSettings() {
  document
    .querySelectorAll(".view-section")
    .forEach((el) => (el.style.display = "none"));
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
  reader.style.display = "flex";
  pageTitle.innerText =
    currentReaderTitle || path.basename(currentBookPath || "");
  btnBack.style.display = "block";
  searchInput.style.display = "none";
  readerSettingsContainer.style.display = "block";
  updateReadingProgressVisibility();
  updatePageJumpControl();
  btnRefresh.style.display = "none";
  currentView = previousViewBeforeSettings || "library";
}

// --- SORTING LOGIC ---
sortSelect.addEventListener("change", () => {
  renderLibrarySorted();
});

function renderLibrarySorted() {
  const criteria = sortSelect.value;
  let sortedData = [...libraryData];
  const historyOrder =
    criteria === "recent"
      ? new Map(riwayatBacaan.map((item, index) => [item.path, index]))
      : null;

  sortedData.sort((a, b) => {
    switch (criteria) {
      case "name_asc":
        return a.title.localeCompare(b.title);
      case "name_desc":
        return b.title.localeCompare(a.title);
      case "date_new":
        return new Date(b.date || 0) - new Date(a.date || 0);
      case "date_old":
        return new Date(a.date || 0) - new Date(b.date || 0);
      case "recent":
        const indexA = historyOrder.has(a.path) ? historyOrder.get(a.path) : -1;
        const indexB = historyOrder.has(b.path) ? historyOrder.get(b.path) : -1;
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const keyword = searchInput.value.toLowerCase();
  if (keyword) {
    sortedData = sortedData.filter((b) =>
      b.title.toLowerCase().includes(keyword),
    );
  }
  renderGrid(sortedData, "library-grid");
}

// --- SEARCH LOGIC ---
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchRenderTimeout);
  searchRenderTimeout = setTimeout(() => {
    const keyword = e.target.value.toLowerCase();
    if (currentView === "library") {
      renderLibrarySorted();
    } else if (currentView === "history") {
      const filtered = riwayatBacaan.filter(
        (b) =>
          String(b.title || "")
            .toLowerCase()
            .includes(keyword) ||
          String(b.path || "")
            .toLowerCase()
            .includes(keyword),
      );
      renderHistoryList(filtered);
    } else if (currentView === "favorites") {
      const filtered = libraryData.filter(
        (b) => b.isFavorite && b.title.toLowerCase().includes(keyword),
      );
      renderGrid(filtered, "favorites-grid");
    } else if (currentView === "explore") {
      const filtered = libraryData.filter(
        (b) =>
          b.title.toLowerCase().includes(keyword) ||
          (b.genre && b.genre.toLowerCase().includes(keyword)),
      );
      renderGrid(filtered, "explore-grid");
    }
  }, 120);
});

// --- BACK BUTTON LOGIC ---
btnBack.addEventListener("click", () => {
  if (currentView === "settings") {
    if (returnToReaderFromSettings && currentBookPath) {
      restoreReaderFromSettings();
    } else {
      switchTab(previousViewBeforeSettings || "library");
    }
    return;
  }

  if (reader.style.display === "flex") {
    let book = libraryData.find((b) => {
      if (b.path === currentBookPath) return true;
      if (b.chapters && b.chapters.some((c) => c.path === currentBookPath))
        return true;
      return false;
    });

    if (!book) {
      book = riwayatBacaan.find((b) => b.path === currentBookPath);
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
btnRefresh.addEventListener("click", async () => {
  await scanLocalFolder();
  renderLibrarySorted();
});

// --- RENDER FUNCTIONS ---
function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function escapeJsArg(value) {
  return escapeHtml(JSON.stringify(String(value ?? "")));
}

function safeNumericId(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getBookCoverInfo(book) {
  const cache = bookCoverSrcCache.get(book);
  if (cache && cache.cover === book.cover && cache.path === book.path) {
    return cache;
  }

  let coverSrc = "";
  let sourcePath = "";
  if (book.cover) {
    if (path.isAbsolute(book.cover)) {
      sourcePath = book.cover;
    } else {
      sourcePath = path.join(book.path, book.cover);
    }
    coverSrc = sourcePath;
    coverSrc = coverSrc.replace(/\\/g, "/");
    if (!coverSrc.startsWith("file://")) coverSrc = `file://${coverSrc}`;
    coverSrc = escapeHtml(coverSrc);
  }

  const info = {
    cover: book.cover,
    path: book.path,
    src: coverSrc,
    sourcePath,
  };
  bookCoverSrcCache.set(book, info);
  return info;
}

function queueBookCoverThumbnailLoad(img, book) {
  coverThumbnailQueue.push({ img, book });
  runNextCoverThumbnailJob();
}

function runNextCoverThumbnailJob() {
  while (
    activeCoverThumbnailJobs < MAX_COVER_THUMBNAIL_JOBS &&
    coverThumbnailQueue.length > 0
  ) {
    const job = coverThumbnailQueue.shift();
    if (!job.img.isConnected) continue;

    activeCoverThumbnailJobs += 1;
    loadBookCoverThumbnail(job.img, job.book).finally(() => {
      activeCoverThumbnailJobs -= 1;
      runNextCoverThumbnailJob();
    });
  }
}

function loadBookCoverThumbnail(img, book) {
  const coverInfo = getBookCoverInfo(book);
  if (!coverInfo.sourcePath) return Promise.resolve();

  const cached = bookCoverThumbCache.get(book);
  if (cached && cached.cover === book.cover && cached.path === book.path) {
    if (cached.src) img.src = cached.src;
    return Promise.resolve();
  }

  const token = `${Date.now()}-${Math.random()}`;
  img.dataset.coverToken = token;

  const request = ipcRenderer
    .invoke("image:getCoverThumbnail", coverInfo.sourcePath)
    .then((src) => {
      const finalSrc = src || coverInfo.src;
      bookCoverThumbCache.set(book, {
        cover: book.cover,
        path: book.path,
        src: finalSrc,
      });
      if (img.isConnected && img.dataset.coverToken === token) {
        img.src = finalSrc;
      }
    })
    .catch(() => {
      bookCoverThumbCache.set(book, {
        cover: book.cover,
        path: book.path,
        src: coverInfo.src,
      });
      if (img.isConnected && img.dataset.coverToken === token) {
        img.src = coverInfo.src;
      }
    });

  bookCoverThumbCache.set(book, {
    cover: book.cover,
    path: book.path,
    src: "",
    request,
  });
  return request;
}

function observeBookCoverImage(img, book) {
  if (!coverImageObserver) {
    coverImageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const image = entry.target;
          coverImageObserver.unobserve(image);
          if (image.__book) {
            queueBookCoverThumbnailLoad(image, image.__book);
          }
        });
      },
      { root: null, rootMargin: "500px 0px", threshold: 0.01 },
    );
  }

  img.__book = book;
  coverImageObserver.observe(img);
}

async function generatePdfFirstPageCover(filePath) {
  if (path.extname(filePath).toLowerCase() !== ".pdf") return null;

  try {
    const data = await fs.readFile(filePath);
    const loadingTask = pdfjsLib.getDocument(new Uint8Array(data));
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const targetWidth = 320;
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });

    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    return await ipcRenderer.invoke("image:saveCoverDataUrl", dataUrl);
  } catch (error) {
    console.warn("Gagal membuat sampul otomatis dari halaman pertama:", error);
    return null;
  }
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca gambar sampul."));
    };
    img.src = url;
  });
}

async function saveImageBlobAsCover(blob) {
  const img = await blobToImage(blob);
  const targetWidth = 320;
  const scale = targetWidth / Math.max(1, img.naturalWidth || img.width);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  canvas.width = targetWidth;
  canvas.height = Math.max(
    1,
    Math.round((img.naturalHeight || img.height) * scale),
  );
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(img, 0, 0, canvas.width, canvas.height);

  return ipcRenderer.invoke(
    "image:saveCoverDataUrl",
    canvas.toDataURL("image/jpeg", 0.72),
  );
}

function getSortedArchiveImages(zip) {
  return Object.keys(zip.files)
    .filter(
      (filename) =>
        !zip.files[filename].dir &&
        /\.(jpg|jpeg|png|gif|webp)$/i.test(filename),
    )
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
}

async function generateArchiveImageCover(filePath) {
  try {
    const fileContent = await fs.readFile(filePath);
    const zip = await JSZip.loadAsync(fileContent);
    const imageFiles = getSortedArchiveImages(zip);
    if (imageFiles.length === 0) return null;

    const blob = await zip.files[imageFiles[0]].async("blob");
    return saveImageBlobAsCover(blob);
  } catch (error) {
    console.warn("Gagal membuat sampul otomatis dari arsip gambar:", error);
    return null;
  }
}

async function generateCbrFirstImageCover(filePath) {
  try {
    const item = await ipcRenderer.invoke("cbr:extractCover", filePath);
    if (!item) return null;

    const bytes =
      item.data instanceof Uint8Array ? item.data : new Uint8Array(item.data);
    const blob = new Blob([bytes], {
      type: item.mime || "application/octet-stream",
    });
    return saveImageBlobAsCover(blob);
  } catch (error) {
    console.warn("Gagal membuat sampul otomatis dari CBR:", error);
    return null;
  }
}

async function generateEpubCover(filePath) {
  try {
    const fileContent = await fs.readFile(filePath);
    const zip = await JSZip.loadAsync(fileContent);
    const parser = new DOMParser();
    const containerFile = zip.file("META-INF/container.xml");
    let preferredImagePath = "";

    if (containerFile) {
      const containerXml = parser.parseFromString(
        await containerFile.async("text"),
        "application/xml",
      );
      const rootfile = getElementsByLocalName(containerXml, "rootfile")[0];
      const opfPath = rootfile && rootfile.getAttribute("full-path");
      const opfFile = getZipFile(zip, opfPath);

      if (opfPath && opfFile) {
        const opfDir = opfPath.includes("/")
          ? opfPath.slice(0, opfPath.lastIndexOf("/"))
          : "";
        const opfXml = parser.parseFromString(
          await opfFile.async("text"),
          "application/xml",
        );
        const manifestById = new Map();

        getElementsByLocalName(opfXml, "item").forEach((item) => {
          const id = item.getAttribute("id");
          const href = item.getAttribute("href");
          if (!id || !href) return;
          manifestById.set(id, {
            href,
            mediaType: item.getAttribute("media-type") || "",
            properties: item.getAttribute("properties") || "",
          });
        });

        const coverMeta = getElementsByLocalName(opfXml, "meta").find(
          (meta) => (meta.getAttribute("name") || "").toLowerCase() === "cover",
        );
        const coverId = coverMeta && coverMeta.getAttribute("content");
        const coverItem =
          (coverId && manifestById.get(coverId)) ||
          Array.from(manifestById.values()).find((item) =>
            /\bcover-image\b/i.test(item.properties),
          ) ||
          Array.from(manifestById.values()).find((item) =>
            /^image\//i.test(item.mediaType),
          );

        if (coverItem) {
          preferredImagePath = resolveZipPath(opfDir, coverItem.href);
        }
      }
    }

    const fallbackImage = getSortedArchiveImages(zip)[0];
    const imagePath = preferredImagePath || fallbackImage;
    const imageFile = getZipFile(zip, imagePath);
    if (!imageFile) return null;

    return saveImageBlobAsCover(await imageFile.async("blob"));
  } catch (error) {
    console.warn("Gagal membuat sampul otomatis dari EPUB:", error);
    return null;
  }
}

function cleanPreviewText(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[#>*_`~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = cleanPreviewText(text).split(" ").filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });
  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((drawLine, index) => {
    context.fillText(drawLine, x, y + index * lineHeight);
  });

  return lines.length;
}

async function saveTextPreviewCover(title, body, label) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  canvas.width = 320;
  canvas.height = 460;

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#2563eb";
  context.fillRect(0, 0, canvas.width, 12);
  context.fillStyle = "#e2e8f0";
  context.fillRect(28, 90, 264, 1);

  context.fillStyle = "#0f172a";
  context.font = "700 24px Segoe UI, Arial, sans-serif";
  wrapCanvasText(context, title || "Untitled", 28, 56, 264, 30, 2);

  context.fillStyle = "#64748b";
  context.font = "700 13px Segoe UI, Arial, sans-serif";
  context.fillText(String(label || "DOCUMENT").toUpperCase(), 28, 122);

  context.fillStyle = "#334155";
  context.font = "16px Segoe UI, Arial, sans-serif";
  wrapCanvasText(context, body || title || "", 28, 160, 264, 24, 10);

  return ipcRenderer.invoke(
    "image:saveCoverDataUrl",
    canvas.toDataURL("image/jpeg", 0.76),
  );
}

async function generateTextDocumentCover(filePath, title) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".docx") {
      if (
        !window.mammoth ||
        typeof window.mammoth.extractRawText !== "function"
      ) {
        return saveTextPreviewCover(title, "", "DOCX");
      }

      const data = await fs.readFile(filePath);
      const arrayBuffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      );
      const result = await window.mammoth.extractRawText({ arrayBuffer });
      return saveTextPreviewCover(title, result.value || "", "DOCX");
    }

    const text = await fs.readFile(filePath, "utf8");
    return saveTextPreviewCover(title, text, ext === ".md" ? "MD" : "TXT");
  } catch (error) {
    console.warn("Gagal membuat sampul otomatis dari dokumen teks:", error);
    return null;
  }
}

async function generateAutoCoverForFile(filePath, title) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return generatePdfFirstPageCover(filePath);
  if (ext === ".cbz" || ext === ".zip")
    return generateArchiveImageCover(filePath);
  if (ext === ".cbr") return generateCbrFirstImageCover(filePath);
  if (ext === ".epub") return generateEpubCover(filePath);
  if (ext === ".txt" || ext === ".md" || ext === ".docx")
    return generateTextDocumentCover(filePath, title);
  return null;
}

async function ensureAutoCoverForBook(book) {
  if (userSettings.autoCoverEnabled === false) return false;
  if (!book || book.cover || !book.path) return false;

  const firstChapter = Array.isArray(book.chapters)
    ? book.chapters.find(
        (chapter) =>
          chapter &&
          [
            ".pdf",
            ".cbz",
            ".zip",
            ".cbr",
            ".epub",
            ".txt",
            ".md",
            ".docx",
          ].includes(path.extname(chapter.path || "").toLowerCase()),
      )
    : null;
  const sourcePath = [
    ".pdf",
    ".cbz",
    ".zip",
    ".cbr",
    ".epub",
    ".txt",
    ".md",
    ".docx",
  ].includes(path.extname(book.path).toLowerCase())
    ? book.path
    : firstChapter && firstChapter.path;

  if (!sourcePath) return false;

  const coverPath = await generateAutoCoverForFile(sourcePath, book.title);
  if (!coverPath) return false;

  book.cover = coverPath;
  bookCoverSrcCache.delete(book);
  bookCoverThumbCache.delete(book);
  return true;
}

function rememberObjectUrl(url) {
  activeObjectUrls.push(url);
  return url;
}

function cleanupObjectUrls() {
  activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  activeObjectUrls = [];
}

function renderGrid(data, elementId) {
  const grid = document.getElementById(elementId);
  grid.innerHTML = "";
  grid.__books = data;
  grid.__renderedCount = 0;

  if (!gridHandlerState.has(grid)) {
    grid.addEventListener("click", (e) => {
      const importButton = e.target.closest("[data-action='import-file']");
      if (importButton && grid.contains(importButton)) {
        btnPilihFile.click();
        return;
      }

      const card = e.target.closest(".book-card");
      if (!card || !grid.contains(card)) return;
      const book = grid.__books && grid.__books[Number(card.dataset.bookIndex)];
      if (book) showBookDetail(book);
    });

    grid.addEventListener("contextmenu", (e) => {
      const card = e.target.closest(".book-card");
      if (!card || !grid.contains(card)) return;
      const book = grid.__books && grid.__books[Number(card.dataset.bookIndex)];
      if (!book) return;
      e.preventDefault();
      showContextMenu(e.pageX, e.pageY, book);
    });

    const scrollParent = grid.closest(".view-section");
    if (scrollParent) {
      let loadFrame = null;
      scrollParent.addEventListener(
        "scroll",
        () => {
          markGridScrollActive(scrollParent);
          if (loadFrame) return;
          loadFrame = requestAnimationFrame(() => {
            loadFrame = null;
            if (
              scrollParent.scrollTop + scrollParent.clientHeight >=
              scrollParent.scrollHeight - 700
            ) {
              appendGridBatch(grid);
            }
          });
        },
        { passive: true },
      );
    }

    gridHandlerState.add(grid);
  }

  if (data.length === 0) {
    const isLibraryEmpty =
      elementId === "library-grid" && libraryData.length === 0;
    const emptyAction = isLibraryEmpty
      ? `<button class="empty-state-import" type="button" data-action="import-file">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8zm0 12H4V8h16z" />
          </svg>
          ${t("btn_import")}
        </button>`
      : "";

    grid.innerHTML = `
      <section class="empty-state" aria-live="polite">
        <div class="empty-state-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 4h11a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2zm13 4h1a2 2 0 0 1 2 2v10H8" />
            <path d="M7 8h7M7 12h7" />
          </svg>
        </div>
        <h2>${isLibraryEmpty ? t("empty_library_title") : t("msg_empty_library")}</h2>
        ${isLibraryEmpty ? `<p>${t("empty_library_description")}</p>` : ""}
        ${emptyAction}
      </section>
    `;
    return;
  }

  appendGridBatch(grid);
  requestAnimationFrame(() => fillGridViewport(grid));
}

function markGridScrollActive(scrollParent) {
  scrollParent.classList.add("is-scrolling");
  const oldTimer = scrollIdleTimers.get(scrollParent);
  if (oldTimer) clearTimeout(oldTimer);

  const timer = setTimeout(() => {
    scrollParent.classList.remove("is-scrolling");
    scrollIdleTimers.delete(scrollParent);
  }, 140);
  scrollIdleTimers.set(scrollParent, timer);
}

function fillGridViewport(grid) {
  const scrollParent = grid.closest(".view-section");
  if (!scrollParent) return;

  let guard = 0;
  while (
    grid.__renderedCount < grid.__books.length &&
    scrollParent.scrollHeight <= scrollParent.clientHeight + 80 &&
    guard < 4
  ) {
    appendGridBatch(grid);
    guard += 1;
  }
}

function appendGridBatch(grid) {
  if (!grid.__books || grid.__renderedCount >= grid.__books.length) return;

  const start = grid.__renderedCount;
  const end = Math.min(start + GRID_BATCH_SIZE, grid.__books.length);
  const fragment = document.createDocumentFragment();
  for (let index = start; index < end; index += 1) {
    const card = createBookCard(grid.__books[index], index);
    fragment.appendChild(card);
  }
  grid.appendChild(fragment);
  grid.__renderedCount = end;
}

function createBookCard(book, index) {
  const div = document.createElement("div");
  div.className = "book-card";
  div.dataset.bookIndex = String(index);

  const coverInfo = getBookCoverInfo(book);

  const coverHtml = coverInfo.src
    ? `<img class="book-cover" width="160" height="220" loading="lazy" decoding="async" fetchpriority="low" alt="">`
    : `<div class="book-cover book-cover-placeholder">${BOOK_COVER_ICON}</div>`;

  div.innerHTML = `
                ${coverHtml}
                <div class="book-info">
                    <div class="book-title">${escapeHtml(book.title)}</div>
                    <div class="book-meta">${escapeHtml(book.genre || t("msg_unknown_genre"))}</div>
                </div>
            `;
  if (coverInfo.src) {
    const image = div.querySelector("img.book-cover");
    const cached = bookCoverThumbCache.get(book);
    image.src = cached && cached.src ? cached.src : BLANK_COVER_SRC;
    if (!cached || !cached.src) {
      observeBookCoverImage(image, book);
    }
  }
  return div;
}

function renderHistoryList(data) {
  const list = document.getElementById("history-list");
  if (!list) return;

  list.innerHTML = "";
  if (data.length === 0) {
    list.innerHTML = `<p style="color:#94a3b8; text-align:center; padding-top: 20px;">${escapeHtml(t("msg_empty_library"))}</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  data.forEach((item) => {
    const row = createHistoryRow(item);
    fragment.appendChild(row);
  });
  list.appendChild(fragment);
}

function createHistoryRow(item) {
  const row = document.createElement("div");
  row.className = "history-row";

  const ext =
    path
      .extname(item.path || "")
      .replace(".", "")
      .toUpperCase() || "FILE";
  const fileName = item.path ? path.basename(item.path) : "-";
  const lastPageText = item.lastPage
    ? `${escapeHtml(t("history_last_page") || "Halaman terakhir")}: ${escapeHtml(item.lastPage)}`
    : escapeHtml(
        t("history_last_page_unknown") || "Halaman terakhir belum tersimpan",
      );

  row.innerHTML = `
                <div class="history-filetype">${escapeHtml(ext)}</div>
                <div class="history-main">
                    <div class="history-title">${escapeHtml(item.title || fileName)}</div>
                    <div class="history-path">${escapeHtml(fileName)}</div>
                </div>
                <div class="history-meta">${lastPageText}</div>
            `;

  row.addEventListener("click", () => {
    if (item.path) bacaFile(item.path, item.title || fileName);
  });
  row.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showContextMenu(e.pageX, e.pageY, item);
  });
  return row;
}

function showBookDetail(book) {
  document
    .querySelectorAll(".view-section, .reader-container")
    .forEach((el) => (el.style.display = "none"));
  const detailView = document.getElementById("view-detail");
  detailView.style.display = "block";
  pageTitle.innerText = t("page_detail");
  const safeBookId = safeNumericId(book.id);

  btnBack.style.display = "block";
  searchInput.style.display = "none";
  readerSettingsContainer.style.display = "none";
  scrollProgressIndicator.classList.remove("visible");
  if (pageJumpControl) pageJumpControl.classList.remove("visible");
  btnRefresh.style.display = "none";

  let coverSrc = "";
  if (book.cover) {
    if (path.isAbsolute(book.cover)) {
      coverSrc = book.cover;
    } else {
      coverSrc = path.join(book.path, book.cover);
    }
    coverSrc = coverSrc.replace(/\\/g, "/");
    if (!coverSrc.startsWith("file://")) coverSrc = `file://${coverSrc}`;
    coverSrc = escapeHtml(coverSrc);
  }
  const detailCoverHtml = coverSrc
    ? `<div class="detail-cover" style="background-image: url('${coverSrc}'); background-size: cover;"></div>`
    : `<div class="detail-cover detail-cover-placeholder">${BOOK_COVER_ICON}</div>`;

  let chapterListHtml = "";
  let chapterCount = 0;

  const readPaths = new Set(riwayatBacaan.map((r) => r.path));

  if (
    book.structureType === "series" ||
    (book.chapters && book.chapters.length > 0)
  ) {
    if (book.chapters && book.chapters.length > 0) {
      chapterCount = book.chapters.length;
      book.chapters.forEach((chap, index) => {
        const safePath = escapeJsArg(chap.path);
        const safeTitle = escapeJsArg(`${book.title} - ${chap.name}`);
        const safeChapterName = escapeHtml(chap.name);
        const isChapFav = chap.isFavorite;
        const starColor = isChapFav ? "#eab308" : "currentColor";
        const starFill = isChapFav ? "#eab308" : "none";

        const isRead = readPaths.has(chap.path);
        const readClass = isRead ? "chapter-read" : "";
        const checkColor = isRead ? "#3b82f6" : "#94a3b8";
        const editChapterTitle = escapeHtml(
          t("msg_edit_chapter") || "Edit Chapter",
        );
        const deleteChapterTitle = escapeHtml(
          t("msg_delete_chapter") || "Hapus Chapter",
        );
        chapterListHtml += `
                        <div class="chapter-row ${readClass}" onclick="bacaFile(${safePath}, ${safeTitle})" style="cursor: pointer;">
                            <div style="flex-grow: 1;"><span class="chapter-name">${safeChapterName}</span></div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div title="${isRead ? "Sudah Dibaca" : "Belum Dibaca"}" style="color: ${checkColor}; display: flex; cursor: pointer;" onclick="event.stopPropagation(); toggleReadStatus(${safeBookId}, ${index})">
                                    <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>
                                </div>
                                <button class="btn-icon" onclick="event.stopPropagation(); toggleChapterFavorite(${safeBookId}, ${index})" title="${escapeHtml(isChapFav ? t("msg_unmark_fav") : t("msg_mark_fav"))}">
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
      chapterListHtml = `<div class="chapter-row" style="cursor: default; justify-content: center;"><span class="chapter-meta">${t("msg_no_chapters")}</span></div>`;
    }
  } else {
    chapterCount = 1;
    const safePath = escapeJsArg(book.path);
    const safeTitle = escapeJsArg(book.title);

    const isRead = readPaths.has(book.path);
    const readClass = isRead ? "chapter-read" : "";
    const checkColor = isRead ? "#3b82f6" : "#94a3b8";
    const isFav = book.isFavorite;
    const starColor = isFav ? "#eab308" : "currentColor";
    const starFill = isFav ? "#eab308" : "none";

    chapterListHtml = `
                <div class="chapter-row ${readClass}" onclick="bacaFile(${safePath}, ${safeTitle})" style="cursor: pointer;">
                    <div style="flex-grow: 1;">
                        <span class="chapter-name">${escapeHtml(t("msg_read_main"))}</span>
                        <span class="chapter-meta" style="margin-left:8px; font-size:0.85rem; color:#94a3b8;">${escapeHtml(t("msg_full"))}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div title="${isRead ? "Sudah Dibaca" : "Belum Dibaca"}" style="color: ${checkColor}; display: flex; cursor: pointer;" onclick="event.stopPropagation(); toggleReadStatus(${safeBookId}, -1)">
                            <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>
                        </div>
                        <button class="btn-icon" onclick="event.stopPropagation(); toggleFavorite(${safeBookId})" title="${escapeHtml(isFav ? t("msg_unmark_fav") : t("msg_mark_fav"))}">
                            <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:${starColor};fill:${starFill};stroke-width:2"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                        </button>
                    </div>
                </div>`;
  }

  const isFav = book.isFavorite;

  const iconPlay = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
  const iconHeart = isFav
    ? `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
  const iconPlus = `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
  const iconEdit = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
  const iconTrash = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

  const favBtnClass = isFav
    ? "btn-action btn-favorite-action active"
    : "btn-action btn-favorite-action";

  let tagsHtml = "";
  if (book.genre) {
    tagsHtml = book.genre
      .split(",")
      .map((g) => `<span class="tag-pill">${escapeHtml(g.trim())}</span>`)
      .join("");
  }

  let targetPath = "";
  let targetTitle = "";
  let startButtonText = t("btn_start_read");

  if (book.chapters && book.chapters.length > 0) {
    const lastReadHistory = riwayatBacaan.find((h) =>
      book.chapters.some((c) => c.path === h.path),
    );
    if (lastReadHistory) {
      const chapterInfo = book.chapters.find(
        (c) => c.path === lastReadHistory.path,
      );
      if (chapterInfo) {
        targetPath = chapterInfo.path;
        targetTitle = `${book.title} - ${chapterInfo.name}`;
        startButtonText = `${t("btn_continue_read")}: ${chapterInfo.name}`;
      }
    }
    if (!targetPath) {
      const firstChapter = book.chapters[0];
      targetPath = firstChapter.path;
      targetTitle = `${book.title} - ${firstChapter.name}`;
      startButtonText = t("btn_start_read");
    }
  } else {
    targetPath = book.path;
    targetTitle = book.title;
    const isInHistory = riwayatBacaan.some((h) => h.path === book.path);
    startButtonText = isInHistory
      ? t("btn_continue_read")
      : t("btn_start_read");
  }

  const safeTargetPath = escapeJsArg(targetPath);
  const safeTargetTitle = escapeJsArg(targetTitle);
  const safeBookTitle = escapeHtml(book.title);
  const safeBookType = escapeHtml(book.type || "Book");
  const safeBookAuthor = escapeHtml(book.author || t("msg_unknown_author"));
  const safeSynopsis = escapeHtml(book.synopsis || t("msg_no_synopsis"));
  const safeStartButtonText = escapeHtml(startButtonText);

  const container = document.getElementById("detail-content");
  container.innerHTML = `
                <div class="comic-header">
                    ${detailCoverHtml}
                    <div class="detail-content">
                        <div class="detail-meta-top">
                            <span class="detail-type">${safeBookType}</span>
                        </div>
                        <h1 class="detail-title">${safeBookTitle}</h1>
                        <div class="detail-author">
                            <span>${escapeHtml(t("detail_author"))}:</span> ${safeBookAuthor}
                        </div>
                        ${book.publishDate ? `<div class="detail-date">${INLINE_CALENDAR_ICON} ${escapeHtml(t("detail_date"))}: ${escapeHtml(book.publishDate)}</div>` : ""}
                        
                        <div class="detail-tags-container">
                            ${tagsHtml}
                        </div>

                        <div class="action-buttons">
                            <button class="btn-action btn-primary-action" onclick="bacaFile(${safeTargetPath}, ${safeTargetTitle})">${iconPlay} ${safeStartButtonText}</button>
                            <button class="${favBtnClass}" onclick="toggleFavorite(${safeBookId})">${iconHeart} ${escapeHtml(t("btn_favorite"))}</button>
                            <button class="btn-action btn-secondary-action" onclick="openAddChapterModal(${safeBookId})">${iconPlus} ${escapeHtml(t("btn_chapter"))}</button>
                            <button class="btn-action btn-secondary-action" onclick="openEditBookModal(${safeBookId})">${iconEdit} ${escapeHtml(t("btn_edit"))}</button>
                            <button class="btn-action btn-danger-action" onclick="deleteBook(${safeBookId})">${iconTrash} ${escapeHtml(t("btn_delete"))}</button>
                        </div>
                    </div>
                </div>
                
                <div class="detail-synopsis">
                    <div class="section-title">${escapeHtml(t("detail_synopsis"))}:</div>
                    <p class="synopsis-text">${safeSynopsis}</p>
                </div>

                <div class="chapter-list-container">
                    <div class="chapter-list-header">
                        <div class="section-title" style="margin-bottom:0">${escapeHtml(t("detail_chapters"))}:</div>
                        <div class="chapter-count">${chapterCount} ${escapeHtml(t("detail_chapter_count"))}</div>
                    </div>
                    <div class="chapter-grid">
                        ${chapterListHtml}
                    </div>
                </div>
            `;
}

window.openAddChapterModal = function (bookId) {
  currentAddingBookId = bookId;
  const book = libraryData.find((b) => b.id === bookId);
  let nextNum = 1;
  if (book) {
    if (book.chapters) {
      nextNum = book.chapters.length + 1;
    } else {
      nextNum = 2;
    }
  }
  inputChapterName.value = `Chapter ${nextNum}`;
  inputChapterPath.value = "";
  modalAddChapter.classList.add("show");
};

btnCancelChapter.addEventListener("click", () => {
  modalAddChapter.classList.remove("show");
  currentAddingBookId = null;
});

btnBrowseChapter.addEventListener("click", async () => {
  const filePath = await ipcRenderer.invoke("dialog:openFile");
  if (filePath) {
    inputChapterPath.value = filePath;
    if (!inputChapterName.value) {
      inputChapterName.value = path.basename(filePath, path.extname(filePath));
    }
  }
});

btnSaveChapter.addEventListener("click", async () => {
  if (!inputChapterName.value || !inputChapterPath.value) {
    await customAlert(t("msg_fill_chapter"));
    return;
  }

  const book = libraryData.find((b) => b.id === currentAddingBookId);
  if (book) {
    if (!book.chapters) {
      book.chapters = [];
      if (book.path && path.extname(book.path)) {
        book.chapters.push({
          name: "Chapter 1",
          path: book.path,
          importSource: book.importSource || "manual",
        });
      }
    }
    book.chapters.push({
      name: inputChapterName.value,
      path: inputChapterPath.value,
      importSource: "manual",
    });
    const saved = await saveData();
    if (!saved) {
      book.chapters.pop();
      await customAlert(
        "Gagal menyimpan chapter. Coba jalankan ulang aplikasi lalu tambah chapter lagi.",
        "Error",
      );
      return;
    }
    showBookDetail(book);
    modalAddChapter.classList.remove("show");
    currentAddingBookId = null;
  }
});

function updateEditGenreOptions() {
  const type = inputEditType.value;
  const genreGroup = genreEditContainer.parentElement;
  let genres = [];

  if (!type) {
    groupEditDate.style.display = "none";
    genreGroup.style.display = "none";
  } else if (type === "Artikel") {
    genres = genreLists.artikel;
    groupEditDate.style.display = "block";
    genreGroup.style.display = "none";
  } else if (type === "Journal") {
    genres = genreLists.journal;
    groupEditDate.style.display = "block";
    genreGroup.style.display = "none";
  } else if (isAcademicType(type)) {
    genres = genreLists.academic;
    groupEditDate.style.display = "block";
    genreGroup.style.display = "block";
  } else {
    groupEditDate.style.display = "none";
    genreGroup.style.display = "block";
    genres = [...genreLists.commonComic];
    if (type === "Manga") genres.push(...genreLists.manga);
    if (type === "Manhwa") genres.push(...genreLists.manhwa);
    if (type === "Manhua") genres.push(...genreLists.manhua);
    if (type === "Novel") genres.push(...genreLists.novel);
  }

  genres = [...new Set(genres)].sort();

  genreEditContainer.innerHTML = "";
  genres.forEach((g) => {
    const label = document.createElement("label");
    label.className = "genre-option";
    label.innerHTML = `<input type="checkbox" value="${g}"> ${g}`;
    genreEditContainer.appendChild(label);
  });
}

inputEditType.addEventListener("change", updateEditGenreOptions);

window.openEditBookModal = function (bookId) {
  const book = libraryData.find((b) => b.id === bookId);
  if (!book) return;

  currentEditingBookId = bookId;
  inputEditTitle.value = book.title;
  inputEditAuthor.value = book.author || "";
  inputEditCover.value = book.cover || "";
  inputEditType.value = book.type || "";
  inputEditDate.value = book.publishDate || "";
  inputEditSynopsis.value = book.synopsis || "";

  updateEditGenreOptions();

  if (book.genre) {
    const bookGenres = book.genre.split(",").map((g) => g.trim());
    const checkboxes = genreEditContainer.querySelectorAll(
      'input[type="checkbox"]',
    );
    checkboxes.forEach((cb) => {
      if (bookGenres.includes(cb.value)) {
        cb.checked = true;
      }
    });
  }

  modalEditBook.classList.add("show");
};

btnCancelEdit.addEventListener("click", () => {
  modalEditBook.classList.remove("show");
  currentEditingBookId = null;
});

btnBrowseEditCover.addEventListener("click", async () => {
  const coverPath = await ipcRenderer.invoke("dialog:openCover");
  if (coverPath) {
    // Kompresi otomatis gambar yang dipilih
    const compressedPath = await ipcRenderer.invoke(
      "image:compressCover",
      coverPath,
    );
    inputEditCover.value = compressedPath;
  }
});

if (btnRemoveEditCover) {
  btnRemoveEditCover.addEventListener("click", () => {
    inputEditCover.value = "";
  });
}

btnSaveEdit.addEventListener("click", async () => {
  if (!inputEditTitle.value) {
    await customAlert(t("msg_fill_title"));
    return;
  }
  if (!inputEditType.value) {
    await customAlert(t("msg_fill_type") || "Mohon pilih jenis buku!");
    return;
  }

  const book = libraryData.find((b) => b.id === currentEditingBookId);
  if (book) {
    book.title = inputEditTitle.value;
    book.author = inputEditAuthor.value;
    book.cover = inputEditCover.value || null;
    if (!book.cover) {
      await ensureAutoCoverForBook(book);
    } else {
      bookCoverSrcCache.delete(book);
      bookCoverThumbCache.delete(book);
    }
    book.type = inputEditType.value;
    book.synopsis = inputEditSynopsis.value;

    if (book.type === "Artikel" || book.type === "Journal") {
      book.publishDate = inputEditDate.value;
      book.genre = "";
    } else if (isAcademicType(book.type)) {
      book.publishDate = inputEditDate.value;
      const selectedGenres = Array.from(
        genreEditContainer.querySelectorAll("input:checked"),
      )
        .map((cb) => cb.value)
        .join(", ");
      book.genre = selectedGenres;
    } else {
      book.publishDate = null;
      const selectedGenres = Array.from(
        genreEditContainer.querySelectorAll("input:checked"),
      )
        .map((cb) => cb.value)
        .join(", ");
      book.genre = selectedGenres;
    }

    saveData();
    showBookDetail(book);
    modalEditBook.classList.remove("show");
  }
});

window.toggleFavorite = function (bookId) {
  const book = libraryData.find((b) => b.id == bookId);
  if (book) {
    book.isFavorite = !book.isFavorite;
    saveData();
    showBookDetail(book);
  }
};

window.toggleChapterFavorite = function (bookId, chapterIndex) {
  const book = libraryData.find((b) => b.id == bookId);
  if (book && book.chapters && book.chapters[chapterIndex]) {
    book.chapters[chapterIndex].isFavorite =
      !book.chapters[chapterIndex].isFavorite;
    saveData();
    showBookDetail(book);
  }
};

window.toggleReadStatus = function (bookId, chapterIndex) {
  const book = libraryData.find((b) => b.id == bookId);
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

  const isRead = riwayatBacaan.some((r) => r.path === targetPath);
  if (isRead) {
    riwayatBacaan = riwayatBacaan.filter((r) => r.path !== targetPath);
  } else {
    const historyItem = {
      title: targetName,
      path: targetPath,
      cover: book.cover,
      lastPage: 1,
    };
    riwayatBacaan.unshift(historyItem);
  }

  saveData();
  showBookDetail(book);
};

window.editChapterName = async function (bookId, chapterIndex) {
  const book = libraryData.find((b) => b.id == bookId);
  if (!book || !book.chapters || !book.chapters[chapterIndex]) return;

  const chapter = book.chapters[chapterIndex];
  const oldName = chapter.name;
  const newName = await customPrompt(
    t("msg_edit_chapter_name") || "Masukkan nama chapter baru:",
    oldName,
    t("modal_edit_chapter_title") || "Edit Chapter",
    t("btn_save") || "Simpan",
    t("btn_cancel") || "Batal",
  );

  if (newName === null) return;
  const trimmedName = newName.trim();
  if (!trimmedName) {
    await customAlert(
      t("msg_fill_chapter_name") || "Nama chapter harus diisi.",
    );
    return;
  }
  if (trimmedName === oldName) return;

  chapter.name = trimmedName;
  riwayatBacaan = riwayatBacaan.map((item) => {
    if (item.path !== chapter.path) return item;
    return { ...item, title: `${book.title} - ${trimmedName}` };
  });

  const saved = await saveData();
  if (!saved) {
    chapter.name = oldName;
    riwayatBacaan = riwayatBacaan.map((item) => {
      if (item.path !== chapter.path) return item;
      return { ...item, title: `${book.title} - ${oldName}` };
    });
    await customAlert(
      t("msg_edit_chapter_fail") ||
        "Gagal menyimpan nama chapter. Coba lagi setelah menjalankan ulang aplikasi.",
      "Error",
    );
    return;
  }

  showBookDetail(book);
};

window.deleteChapter = async function (bookId, chapterIndex) {
  const book = libraryData.find((b) => b.id == bookId);
  if (!book || !book.chapters || !book.chapters[chapterIndex]) return;

  const chapter = book.chapters[chapterIndex];
  const confirmed = await customConfirm(
    (t("msg_delete_chapter_confirm") ||
      "Hapus chapter ini dari daftar aplikasi? File asli di komputer Anda tetap aman.") +
      `\n\n${chapter.name}`,
    t("modal_delete_chapter_title") || "Hapus Chapter",
    t("btn_delete") || "Hapus",
    t("btn_cancel") || "Batal",
  );
  if (!confirmed) return;

  const removedChapter = book.chapters.splice(chapterIndex, 1)[0];
  riwayatBacaan = riwayatBacaan.filter((r) => r.path !== removedChapter.path);

  const saved = await saveData();
  if (!saved) {
    book.chapters.splice(chapterIndex, 0, removedChapter);
    await customAlert(
      t("msg_delete_chapter_fail") ||
        "Gagal menghapus chapter. Coba lagi setelah menjalankan ulang aplikasi.",
      "Error",
    );
    return;
  }

  showBookDetail(book);
};

window.deleteBook = async function (bookId) {
  const book = libraryData.find((b) => b.id == bookId);
  if (!book) return;

  const options = {
    title: t("modal_delete_title") || "Hapus Buku",
    message: t("msg_delete_options") || "Hapus buku ini dari Pustaka?",
    detail:
      t("msg_delete_detail") ||
      "Buku ini akan dihapus dari daftar aplikasi. File aslinya di komputer Anda akan tetap aman.",
    btnCancel: t("btn_cancel") || "Batal",
    btnRemoveLib: t("btn_remove_lib") || "Hapus dari Pustaka",
  };

  const response = await customConfirm(
    options.message + "\n\n" + options.detail,
    options.title,
    options.btnRemoveLib,
    options.btnCancel,
  );

  if (response) {
    // Masukkan ke daftar abaikan (Ignore List) HANYA jika buku berasal dari auto-scan
    if (book.path && book.structureType) {
      const normPath = book.path.replace(/[\\/]+/g, "/").toLowerCase();
      if (!userSettings.ignoredPaths) userSettings.ignoredPaths = [];
      if (!userSettings.ignoredPaths.includes(normPath)) {
        userSettings.ignoredPaths.push(normPath);
      }
    }

    libraryData = libraryData.filter((b) => b.id != bookId);
    riwayatBacaan = riwayatBacaan.filter((r) => r.path !== book.path);
    saveData();
    switchTab("library");
  }
};

function showContextMenu(x, y, book) {
  contextMenuBook = book;
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;

  const contextLabel = ctxDelete.querySelector(".context-label");
  const contextLabelKey =
    currentView === "history"
      ? "ctx_delete_history"
      : currentView === "favorites"
        ? "ctx_remove_favorite"
        : "ctx_delete";

  if (contextLabel) contextLabel.innerText = t(contextLabelKey);
  contextMenu.style.display = "block";
}

document.addEventListener("click", () => {
  contextMenu.style.display = "none";
});

ctxDelete.addEventListener("click", () => {
  if (!contextMenuBook) return;

  if (currentView === "history") {
    riwayatBacaan = riwayatBacaan.filter(
      (r) => r.path !== contextMenuBook.path,
    );
    saveData();
    renderHistoryList(riwayatBacaan);
  } else if (currentView === "favorites") {
    const book = libraryData.find((b) => b.id === contextMenuBook.id);
    if (book) book.isFavorite = false;
    saveData();
    renderGrid(
      libraryData.filter((b) => b.isFavorite),
      "favorites-grid",
    );
  } else {
    deleteBook(contextMenuBook.id);
  }
});

let pendingBookPath = null;
let pendingBookId = null;
const genreLists = {
  academic: [
    "Makalah",
    "Materi Kuliah",
    "Rangkuman",
    "Catatan Kuliah",
    "Referensi",
  ],
  commonComic: [
    "Action",
    "Romance",
    "Fantasy",
    "Sci-Fi",
    "Slice of Life",
    "Horror",
    "Mystery",
    "Comedy",
    "Drama",
    "Psychological",
    "Supernatural",
    "Sports",
    "Historical",
  ],
  manga: [
    "Shounen",
    "Shoujo",
    "Seinen",
    "Josei",
    "Isekai",
    "Mecha",
    "Iyashikei",
    "Mahou Shoujo",
  ],
  manhwa: [
    "Hunter/System",
    "Regression",
    "Murim",
    "Villainess",
    "School Bullying",
  ],
  manhua: ["Wuxia", "Xianxia", "Xuanhuan", "Cultivation"],
  artikel: [
    "News",
    "Feature",
    "Opinion",
    "Editorial",
    "Guide",
    "Review",
    "Essay",
  ],
  journal: [
    "Original Research",
    "Literature Review",
    "Case Study",
    "Methodology",
    "Short Communication",
  ],
  novel: [
    "Romance",
    "Mystery",
    "Horror",
    "Fantasy",
    "Sci-Fi",
    "Thriller",
    "Historical",
    "Teenlit",
    "Chicklit",
    "Metropop",
    "Comedy",
    "Inspirational",
  ],
};

function isAcademicType(type) {
  return ["Makalah", "Materi Kuliah"].includes(type);
}

function inferManualBookType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".txt" || ext === ".md" || ext === ".docx" || ext === ".epub")
    return "Novel";
  if (ext === ".cbz" || ext === ".zip" || ext === ".cbr") return "Manga";
  return "Artikel";
}

function updateGenreOptions() {
  const type = inputType.value;
  const genreGroup = genreContainer.parentElement;
  let genres = [];

  if (!type) {
    groupDate.style.display = "none";
    genreGroup.style.display = "none";
  } else if (type === "Artikel") {
    genres = genreLists.artikel;
    groupDate.style.display = "block";
    genreGroup.style.display = "none";
  } else if (type === "Journal") {
    genres = genreLists.journal;
    groupDate.style.display = "block";
    genreGroup.style.display = "none";
  } else if (isAcademicType(type)) {
    genres = genreLists.academic;
    groupDate.style.display = "block";
    genreGroup.style.display = "block";
  } else {
    groupDate.style.display = "none";
    genreGroup.style.display = "block";
    genres = [...genreLists.commonComic];
    if (type === "Manga") genres.push(...genreLists.manga);
    if (type === "Manhwa") genres.push(...genreLists.manhwa);
    if (type === "Manhua") genres.push(...genreLists.manhua);
    if (type === "Novel") genres.push(...genreLists.novel);
  }

  genres = [...new Set(genres)].sort();
  genreContainer.innerHTML = "";
  genres.forEach((g) => {
    const label = document.createElement("label");
    label.className = "genre-option";
    label.innerHTML = `<input type="checkbox" value="${g}"> ${g}`;
    genreContainer.appendChild(label);
  });
}

inputType.addEventListener("change", updateGenreOptions);
btnCancelAdd.addEventListener("click", () => {
  modalAddBook.classList.remove("show");
  pendingBookPath = null;
  pendingBookId = null;
});

btnBrowseCover.addEventListener("click", async () => {
  const coverPath = await ipcRenderer.invoke("dialog:openCover");
  if (coverPath) {
    // Kompresi otomatis gambar yang dipilih
    const compressedPath = await ipcRenderer.invoke(
      "image:compressCover",
      coverPath,
    );
    inputCover.value = compressedPath;
  }
});

btnSaveAdd.addEventListener("click", async () => {
  if (!inputTitle.value) {
    await customAlert(t("msg_fill_title"));
    return;
  }
  if (!inputType.value) {
    await customAlert(t("msg_fill_type") || "Mohon pilih jenis buku!");
    return;
  }
  const selectedGenres = Array.from(
    genreContainer.querySelectorAll("input:checked"),
  )
    .map((cb) => cb.value)
    .join(", ");
  const existingDraft = pendingBookId
    ? libraryData.find((b) => b.id === pendingBookId)
    : null;
  const bookData = {
    id: existingDraft ? existingDraft.id : Date.now(),
    title: inputTitle.value,
    author: inputAuthor.value || "Unknown",
    path: pendingBookPath,
    importSource: "manual",
    type: inputType.value,
    genre: selectedGenres,
    synopsis: inputSynopsis.value,
    publishDate:
      inputType.value === "Artikel" ||
      inputType.value === "Journal" ||
      isAcademicType(inputType.value)
        ? inputDate.value
        : null,
    cover: inputCover.value || (existingDraft ? existingDraft.cover : null),
  };

  const newBook = existingDraft
    ? Object.assign(existingDraft, bookData)
    : bookData;
  if (!existingDraft) libraryData.unshift(newBook);
  await saveData();
  modalAddBook.classList.remove("show");
  pendingBookPath = null;
  pendingBookId = null;
  showBookDetail(newBook);
});

btnPilihFile.addEventListener("click", async () => {
  const filePath = await ipcRenderer.invoke("dialog:openFile");
  if (filePath) {
    const selectedPath = filePath.replace(/[\\/]+/g, "/").toLowerCase();
    let book = libraryData.find((b) => {
      const bookPath = String(b.path || "")
        .replace(/[\\/]+/g, "/")
        .toLowerCase();
      return bookPath === selectedPath;
    });
    if (book) {
      if (book.importSource !== "manual") {
        book.importSource = "manual";
        await saveData();
      }
      showBookDetail(book);
    } else {
      const defaultType = inferManualBookType(filePath);
      const newBook = {
        id: Date.now(),
        title: path.basename(filePath, path.extname(filePath)),
        author: "Unknown",
        path: filePath,
        importSource: "manual",
        type: defaultType,
        genre: "",
        synopsis: "",
        publishDate:
          defaultType === "Artikel" || defaultType === "Journal" ? "" : null,
        cover: null,
      };

      libraryData.unshift(newBook);
      await ensureAutoCoverForBook(newBook);
      const saved = await saveData();
      if (!saved) {
        libraryData = libraryData.filter((b) => b.id !== newBook.id);
        await customAlert(
          "Gagal menyimpan file import. Coba jalankan ulang aplikasi lalu import lagi.",
          "Error",
        );
        return;
      }

      pendingBookPath = filePath;
      pendingBookId = newBook.id;
      inputTitle.value = path.basename(filePath, path.extname(filePath));
      inputAuthor.value = "";
      inputCover.value = newBook.cover || "";
      inputSynopsis.value = "";
      inputType.value = defaultType;
      inputDate.value = "";
      updateGenreOptions();
      showBookDetail(newBook);
      modalAddBook.classList.add("show");
    }
  }
});

if (btnCreateFolder) {
  btnCreateFolder.addEventListener("click", () => {
    inputCfFolder.value = "";
    populateCreateFolderLocations();
    inputCfAuthor.value = "";
    inputCfCover.value = "";
    inputCfType.value = "";
    inputCfDate.value = "";
    inputCfSynopsis.value = "";
    updateCfGenreOptions();
    modalCreateFolder.classList.add("show");
  });
}

function populateCreateFolderLocations() {
  if (!inputCfLocation) return;

  inputCfLocation.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.innerText =
    t("folder_location_default") || "KeiYomi Library (Default)";
  inputCfLocation.appendChild(defaultOption);

  const uniqueFolders = [
    ...new Set((userSettings.customFolders || []).filter(Boolean)),
  ];
  uniqueFolders.forEach((folderPath) => {
    const option = document.createElement("option");
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
    groupCfDate.style.display = "none";
    genreGroup.style.display = "none";
  } else if (type === "Artikel") {
    genres = genreLists.artikel;
    groupCfDate.style.display = "block";
    genreGroup.style.display = "none";
  } else if (type === "Journal") {
    genres = genreLists.journal;
    groupCfDate.style.display = "block";
    genreGroup.style.display = "none";
  } else if (isAcademicType(type)) {
    genres = genreLists.academic;
    groupCfDate.style.display = "block";
    genreGroup.style.display = "block";
  } else {
    groupCfDate.style.display = "none";
    genreGroup.style.display = "block";
    genres = [...genreLists.commonComic];
    if (type === "Manga") genres.push(...genreLists.manga);
    if (type === "Manhwa") genres.push(...genreLists.manhwa);
    if (type === "Manhua") genres.push(...genreLists.manhua);
    if (type === "Novel") genres.push(...genreLists.novel);
  }

  genres = [...new Set(genres)].sort();
  genreCfContainer.innerHTML = "";
  genres.forEach((g) => {
    const label = document.createElement("label");
    label.className = "genre-option";
    label.innerHTML = `<input type="checkbox" value="${g}"> ${g}`;
    genreCfContainer.appendChild(label);
  });
}
inputCfType.addEventListener("change", updateCfGenreOptions);

btnCancelCf.addEventListener("click", () =>
  modalCreateFolder.classList.remove("show"),
);

btnBrowseCfCover.addEventListener("click", async () => {
  const coverPath = await ipcRenderer.invoke("dialog:openCover");
  if (coverPath) {
    const compressedPath = await ipcRenderer.invoke(
      "image:compressCover",
      coverPath,
    );
    inputCfCover.value = compressedPath;
  }
});

btnSaveCf.addEventListener("click", async () => {
  const folderName = inputCfFolder.value.trim();
  if (!folderName) {
    await customAlert("Nama folder wajib diisi!");
    return;
  }
  if (!inputCfType.value) {
    await customAlert(t("msg_fill_type") || "Mohon pilih jenis buku!");
    return;
  }

  const selectedGenres = Array.from(
    genreCfContainer.querySelectorAll("input:checked"),
  )
    .map((cb) => cb.value)
    .join(", ");

  const folderData = {
    folderName: folderName,
    basePath: inputCfLocation ? inputCfLocation.value : "",
    title: folderName,
    author: inputCfAuthor.value.trim(),
    cover: inputCfCover.value,
    type: inputCfType.value,
    date:
      inputCfType.value === "Artikel" ||
      inputCfType.value === "Journal" ||
      isAcademicType(inputCfType.value)
        ? inputCfDate.value
        : null,
    genre: selectedGenres,
    synopsis: inputCfSynopsis.value.trim(),
  };

  const result = await ipcRenderer.invoke("library:createFolder", folderData);
  if (result.success) {
    await customAlert(
      (
        t("msg_create_folder_success") || "Folder berhasil dibuat di:\n{0}"
      ).replace("{0}", result.path),
    );
    shell.openPath(result.path);
    await scanLocalFolder(true);
    renderLibrarySorted();
    modalCreateFolder.classList.remove("show");
  } else {
    await customAlert(
      (t("msg_create_folder_fail") || "Gagal membuat folder:\n{0}").replace(
        "{0}",
        result.message,
      ),
    );
  }
});

btnExitApp.addEventListener("click", async () => {
  if (
    await customConfirm(t("msg_exit_confirm"), "Keluar Aplikasi", "Ya, Keluar")
  ) {
    ipcRenderer.send("app:quit");
  }
});

async function scanLocalFolder(silent = false) {
  const scannedBooks = await ipcRenderer.invoke(
    "library:scanLocal",
    userSettings.customFolders || [],
  );
  if (scannedBooks) {
    const ignoredPathsSet = new Set(userSettings.ignoredPaths || []);
    const normalizeLibraryPath = (targetPath) =>
      String(targetPath || "")
        .replace(/[\\/]+/g, "/")
        .toLowerCase();

    for (const newBook of scannedBooks) {
      const normNewBookPath = normalizeLibraryPath(newBook.path);
      if (ignoredPathsSet.has(normNewBookPath)) continue; // Abaikan jika ada di ignore list

      const exists = libraryData.find((b) => {
        const normExistPath = normalizeLibraryPath(b.path);
        return normExistPath === normNewBookPath;
      });

      if (!exists) {
        newBook.id = Date.now() + Math.random();
        libraryData.push(newBook);
      } else {
        if (newBook.chapters) {
          const existingChapters = exists.chapters || [];
          const mergedChapters = newBook.chapters.map((newChap) => {
            const newBasename = path.basename(newChap.path).toLowerCase();
            const oldChap = existingChapters.find((c) => {
              if (!c.path) return false;
              return path.basename(c.path).toLowerCase() === newBasename;
            });
            if (oldChap) {
              return { ...oldChap, path: newChap.path };
            }
            return newChap;
          });
          const mergedChapterPaths = new Set(
            mergedChapters.map((chapter) => normalizeLibraryPath(chapter.path)),
          );
          const manualChapters = existingChapters.filter((chapter) => {
            if (!chapter || !chapter.path) return false;
            const chapterPath = normalizeLibraryPath(chapter.path);
            return (
              chapter.importSource === "manual" &&
              !mergedChapterPaths.has(chapterPath)
            );
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
          publishDate: exists.publishDate,
        };

        // Timpa data yang ada dengan hasil scan terbaru (untuk update chapter list, dll)
        Object.assign(exists, newBook);

        // Kembalikan data yang sudah diedit user.
        // Ini akan menimpa kembali title, author, dll dari hasil scan
        // dengan data yang sudah disimpan oleh user sebelumnya.
        Object.assign(exists, userPreservedData);
      }
    }

    for (const book of libraryData) {
      if (!book.cover) {
        await ensureAutoCoverForBook(book);
      }
    }

    const scannedPaths = new Set(
      scannedBooks.map((b) => normalizeLibraryPath(b.path)),
    );
    libraryData = libraryData.filter((book) => {
      if (isManualImportedBook(book)) return true; // Pertahankan buku yang diimpor manual
      const normPath = normalizeLibraryPath(book.path);
      return scannedPaths.has(normPath); // Hapus buku otomatis yang file/foldernya telah dihapus/hilang
    });

    await saveData();
    if (!silent)
      await customAlert(
        t("msg_scan_success").replace("{0}", libraryData.length),
      );
  } else if (!silent) {
    await customAlert(t("msg_scan_fail"));
  }
}

function renderExplore() {
  const genres = new Set();
  libraryData.forEach((book) => {
    if (book.genre) book.genre.split(",").forEach((g) => genres.add(g.trim()));
  });

  const filterContainer = document.getElementById("explore-filters");
  filterContainer.innerHTML = "";
  const allTag = document.createElement("div");
  allTag.className = "filter-tag active";
  allTag.innerText = t("filter_all");
  allTag.addEventListener("click", () => filterGenre("all", allTag));
  filterContainer.appendChild(allTag);
  genres.forEach((g) => {
    const tag = document.createElement("div");
    tag.className = "filter-tag";
    tag.innerText = g;
    tag.addEventListener("click", () => filterGenre(g, tag));
    filterContainer.appendChild(tag);
  });

  renderGrid(libraryData, "explore-grid");
}

window.filterGenre = function (genre, element) {
  document
    .querySelectorAll(".filter-tag")
    .forEach((el) => el.classList.remove("active"));
  element.classList.add("active");
  const filtered =
    genre === "all"
      ? libraryData
      : libraryData.filter((b) => b.genre && b.genre.includes(genre));
  renderGrid(filtered, "explore-grid");
};

// --- CUSTOM FOLDERS LOGIC ---
const customFoldersList = document.getElementById("custom-folders-list");
const btnAddFolder = document.getElementById("btn-add-folder");

function renderCustomFolders() {
  if (!customFoldersList) return;
  customFoldersList.innerHTML = "";
  const isDark = document.body.getAttribute("data-theme") === "dark";

  (userSettings.customFolders || []).forEach((folder, index) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.background = isDark ? "#334155" : "#f8f9fa";
    div.style.padding = "8px 12px";
    div.style.borderRadius = "6px";
    div.style.border = "1px solid " + (isDark ? "#475569" : "#cbd5e1");

    const span = document.createElement("span");
    span.innerText = folder;
    span.style.wordBreak = "break-all";
    span.style.marginRight = "12px";
    span.style.color = isDark ? "#f1f5f9" : "inherit";

    const btn = document.createElement("button");
    btn.innerText = t("btn_remove") || "Hapus";
    btn.className = "btn-cancel";
    btn.style.padding = "4px 8px";
    btn.style.fontSize = "0.8rem";
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
  btnAddFolder.addEventListener("click", async () => {
    const folderPath = await ipcRenderer.invoke("dialog:openDirectory");
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
const ignoredPathsList = document.getElementById("ignored-paths-list");
const btnRestoreAllIgnored = document.getElementById("btn-restore-all-ignored");

function renderIgnoredPaths() {
  if (!ignoredPathsList) return;
  ignoredPathsList.innerHTML = "";
  const isDark = document.body.getAttribute("data-theme") === "dark";

  if (!userSettings.ignoredPaths || userSettings.ignoredPaths.length === 0) {
    ignoredPathsList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">${t("msg_empty_ignored") || "Tidak ada buku yang disembunyikan."}</p>`;
    if (btnRestoreAllIgnored) btnRestoreAllIgnored.style.display = "none";
    return;
  }

  if (btnRestoreAllIgnored) btnRestoreAllIgnored.style.display = "block";

  userSettings.ignoredPaths.forEach((folderPath, index) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.background = isDark ? "#334155" : "#f8f9fa";
    div.style.padding = "8px 12px";
    div.style.borderRadius = "6px";
    div.style.border = "1px solid " + (isDark ? "#475569" : "#cbd5e1");

    const span = document.createElement("span");
    const folderName = folderPath.split(/[\\/]/).pop(); // Ambil nama file/folder terakhirnya saja
    span.innerText = folderName;
    span.title = folderPath;
    span.style.wordBreak = "break-all";
    span.style.marginRight = "12px";
    span.style.color = isDark ? "#f1f5f9" : "inherit";

    const btn = document.createElement("button");
    btn.innerText = t("btn_restore_ignored") || "Pulihkan";
    btn.className = "btn-action btn-primary-action";
    btn.style.padding = "4px 12px";
    btn.style.fontSize = "0.8rem";
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
  btnRestoreAllIgnored.addEventListener("click", async () => {
    if (
      await customConfirm(
        t("msg_restore_all_ignored_confirm") ||
          "Apakah Anda yakin ingin memulihkan semua buku yang disembunyikan?",
        t("btn_restore_all_ignored") || "Pulihkan Semua",
        "Ya, Pulihkan",
      )
    ) {
      userSettings.ignoredPaths = []; // Kosongkan daftar blokir
      await saveData();
      renderIgnoredPaths(); // Update UI list
      await scanLocalFolder(true); // Scan ulang otomatis di background
    }
  });
}

function isCoverCachePath(coverPath) {
  return String(coverPath || "")
    .replace(/\\/g, "/")
    .toLowerCase()
    .includes("/covers_cache/");
}

document
  .getElementById("btn-clear-cache")
  .addEventListener("click", async () => {
    if (
      await customConfirm(
        "Hapus data pustaka, riwayat, dan pengaturan aplikasi? Cache sampul tidak akan ikut dihapus.",
        "Hapus Data/Pengaturan",
        "Hapus Data",
      )
    ) {
      // 1. Batalkan semua proses auto-save yang mungkin sedang berjalan
      clearTimeout(saveTimeout);

      // 2. Kosongkan memori sementara agar data lama tidak ter-save ulang
      libraryData = [];
      riwayatBacaan = [];
      userSettings = {
        username: "",
        theme: "light",
        language: "id",
        customFolders: [],
        ignoredPaths: [],
        nightModeEnabled: false,
        nightModeIntensity: 50,
        pdfQualityMode: "light",
        autoCoverEnabled: false,
        showPageSlider: false,
        showReadingProgress: false,
        spreadModeEnabled: false,
      };

      const success = await ipcRenderer.invoke("data:clear");
      if (success) {
        await customAlert("Data dan pengaturan aplikasi berhasil dihapus.");
        ipcRenderer.send("app:relaunch"); // Restart aplikasi secara native
      }
    }
  });

const btnClearCoverCache = document.getElementById("btn-clear-cover-cache");
if (btnClearCoverCache) {
  btnClearCoverCache.addEventListener("click", async () => {
    const confirmed = await customConfirm(
      "Hapus cache sampul? Sampul yang tersimpan di cache aplikasi akan dikosongkan dari pustaka, tetapi data/pengaturan lain tetap aman.",
      "Hapus Cache Sampul",
      "Hapus Sampul",
      "Batal",
    );
    if (!confirmed) return;

    const success = await ipcRenderer.invoke("cover:clearCache");
    if (!success) {
      await customAlert("Gagal menghapus cache sampul.", "Error");
      return;
    }

    libraryData.forEach((book) => {
      if (isCoverCachePath(book.cover)) book.cover = null;
    });
    riwayatBacaan.forEach((item) => {
      if (isCoverCachePath(item.cover)) item.cover = null;
    });
    bookCoverSrcCache = new WeakMap();
    bookCoverThumbCache = new WeakMap();

    await saveData();
    if (currentView === "library") renderLibrarySorted();
    if (currentView === "favorites")
      renderGrid(
        libraryData.filter((b) => b.isFavorite),
        "favorites-grid",
      );
    if (currentView === "explore") renderExplore();

    await customAlert("Cache sampul berhasil dihapus.", "Hapus Cache Sampul");
  });
}

// --- FITUR BARU: BACKUP & RESTORE DATA ---
const btnBackup = document.getElementById("btn-backup");
if (btnBackup) {
  btnBackup.addEventListener("click", async () => {
    try {
      const result = await ipcRenderer.invoke("data:backup");
      if (result.success) {
        await customAlert(
          t("msg_backup_success").replace("{0}", result.filePath),
        );
      } else if (!result.canceled) {
        await customAlert(
          t("msg_backup_fail") + (result.message || "Error tidak diketahui"),
        );
      }
    } catch (error) {
      await customAlert(t("msg_backup_fail") + error.message);
    }
  });
}

const btnRestore = document.getElementById("btn-restore");
if (btnRestore) {
  btnRestore.addEventListener("click", async () => {
    try {
      const result = await ipcRenderer.invoke("data:restore");
      if (result.success) {
        await customAlert(t("msg_restore_success"));
        ipcRenderer.send("app:relaunch"); // Restart aplikasi secara otomatis
      } else if (!result.canceled) {
        await customAlert(
          t("msg_restore_fail") + (result.message || "File tidak valid"),
        );
      }
    } catch (error) {
      await customAlert(t("msg_restore_fail") + error.message);
    }
  });
}

const btnOptimizeCovers = document.getElementById("btn-optimize-covers");
if (btnOptimizeCovers) {
  btnOptimizeCovers.addEventListener("click", async () => {
    const booksWithCovers = libraryData.filter((book) => book && book.cover);
    if (booksWithCovers.length === 0) {
      await customAlert(
        "Tidak ada sampul yang perlu dioptimalkan.",
        "Optimalkan Sampul",
      );
      return;
    }

    const confirmed = await customConfirm(
      `Optimalkan ${booksWithCovers.length} sampul buku? Proses ini membuat versi sampul yang lebih kecil agar beranda lebih ringan.`,
      "Optimalkan Sampul",
      "Mulai",
      "Batal",
    );
    if (!confirmed) return;

    const originalHtml = btnOptimizeCovers.innerHTML;
    btnOptimizeCovers.disabled = true;

    let optimizedCount = 0;
    let skippedCount = 0;

    for (let index = 0; index < booksWithCovers.length; index += 1) {
      const book = booksWithCovers[index];
      const coverInfo = getBookCoverInfo(book);
      if (!coverInfo.sourcePath) {
        skippedCount += 1;
        continue;
      }

      btnOptimizeCovers.innerHTML = `<span>Optimalkan ${index + 1}/${booksWithCovers.length}</span>`;

      try {
        const compressedPath = await ipcRenderer.invoke(
          "image:compressCover",
          coverInfo.sourcePath,
        );
        if (compressedPath && compressedPath !== book.cover) {
          book.cover = compressedPath;
          optimizedCount += 1;
        } else {
          skippedCount += 1;
        }
      } catch {
        skippedCount += 1;
      }

      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    await saveData();
    if (currentView === "library") renderLibrarySorted();
    if (currentView === "favorites")
      renderGrid(
        libraryData.filter((b) => b.isFavorite),
        "favorites-grid",
      );
    if (currentView === "explore") renderExplore();

    btnOptimizeCovers.disabled = false;
    btnOptimizeCovers.innerHTML = originalHtml;
    await customAlert(
      `Selesai.\nSampul dioptimalkan: ${optimizedCount}\nDilewati/gagal: ${skippedCount}`,
      "Optimalkan Sampul",
    );
  });
}

// --- CUSTOM TITLE BAR LOGIC ---
document
  .getElementById("btn-minimize")
  .addEventListener("click", () => ipcRenderer.send("window:minimize"));
document
  .getElementById("btn-maximize")
  .addEventListener("click", () => ipcRenderer.send("window:maximize"));
document
  .getElementById("btn-close")
  .addEventListener("click", () => ipcRenderer.send("window:close"));

document
  .getElementById("btn-save-settings-page")
  .addEventListener("click", async () => {
    userSettings.username = document.getElementById("setting-username").value;
    userSettings.theme = document.getElementById("setting-theme").value;
    userSettings.language = document.getElementById("setting-language").value;
    userSettings.pdfQualityMode = settingPdfQuality
      ? settingPdfQuality.value
      : "light";
    userSettings.autoCoverEnabled = settingAutoCover
      ? settingAutoCover.checked
      : false;
    const selectedMode = document.getElementById("setting-mode").value;

    isWebtoonMode = selectedMode === "webtoon";
    updateReaderModeUI();

    applyTheme(userSettings.theme);
    applyLanguage(userSettings.language);
    await saveData();
    await customAlert(t("msg_saved"), "Berhasil");
  });

function openLink(url) {
  shell.openExternal(url);
}

async function checkUpdate() {
  try {
    const result = await ipcRenderer.invoke("updater:check");
    if (result.error) {
      await customAlert(t("msg_update_fail") + result.error, "Gagal");
      return;
    }
    if (result.updateAvailable) {
      const releaseUrl =
        result.remoteInfo.releaseUrl ||
        `https://github.com/KeishaXD/KeiYomi/releases/tag/v${result.remoteInfo.version}`;
      const msg = `${t("msg_update_available").replace("{0}", result.remoteInfo.version)}\n\nChangelog:\n${result.remoteInfo.changelog || "-"}\n\n${t("msg_update_open_release")}`;

      if (
        await customConfirm(
          msg,
          t("title_update_available"),
          t("btn_open_release"),
          t("btn_cancel"),
        )
      ) {
        openLink(releaseUrl);
      }
    } else {
      await customAlert(
        t("msg_update_latest").replace("{0}", result.localInfo.version),
        "Pembaruan",
      );
    }
  } catch (e) {
    await customAlert(t("msg_update_error"), "Error");
  }
}

window.showQrisModal = function () {
  document.getElementById("qris-modal").classList.add("show");
};

window.showPaypalModal = function () {
  document.getElementById("paypal-modal").classList.add("show");
};

document.addEventListener("keydown", async (e) => {
  if (
    (e.ctrlKey || e.metaKey) &&
    e.key.toLowerCase() === "f" &&
    reader.style.display === "flex"
  ) {
    e.preventDefault();
    openReaderSearch();
    return;
  }

  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  // Shortcut Fullscreen F1 (Toggle Hidup / Mati)
  if (e.key === "F1" && reader.style.display === "flex") {
    e.preventDefault();
    toggleFullscreen();
    return;
  }

  // Shortcut Mode Malam (Night Light) F2
  if (e.key === "F2" && reader.style.display === "flex") {
    e.preventDefault();
    toggleNightMode();
    return;
  }

  if (e.key === "Escape") {
    // Jika sedang Fullscreen, cukup keluar dari Fullscreen saja (jangan tutup buku)
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => console.error(err));
      return;
    }

    const openModals = document.querySelectorAll(".modal.show");
    if (openModals.length > 0) {
      const openModal = openModals[openModals.length - 1];
      const btnCancel = openModal.querySelector(".btn-cancel");
      const btnOk = openModal.querySelector("#btn-custom-alert-ok");
      if (btnCancel) btnCancel.click();
      else if (btnOk) btnOk.click();
      else openModal.classList.remove("show");
      return;
    }
    if (settingsPopup.classList.contains("show")) {
      settingsPopup.classList.remove("show");
      return;
    }
    if (readerSearchPanel && readerSearchPanel.classList.contains("show")) {
      readerSearchPanel.classList.remove("show");
      clearPdfSearchHighlights();
      return;
    }
    if (btnBack.style.display !== "none") {
      btnBack.click();
      return;
    }
    if (
      await customConfirm(
        t("msg_exit_confirm"),
        "Keluar Aplikasi",
        "Ya, Keluar",
      )
    )
      ipcRenderer.send("app:quit");
  }

  if (reader.style.display === "flex") {
    if (isReaderLoading) return;
    const scrollAmount = 400;
    if (e.key === "ArrowDown")
      reader.scrollBy({ top: scrollAmount, behavior: "smooth" });
    else if (e.key === "ArrowUp")
      reader.scrollBy({ top: -scrollAmount, behavior: "smooth" });
    else if (e.key === "ArrowRight") goToNextPage();
    else if (e.key === "ArrowLeft") goToPrevPage();
  } else {
    const activeView = Array.from(
      document.querySelectorAll(".view-section"),
    ).find((el) => el.style.display === "block");
    if (activeView) {
      const menuScrollAmount = 200;
      if (e.key === "ArrowDown")
        activeView.scrollBy({ top: menuScrollAmount, behavior: "smooth" });
      else if (e.key === "ArrowUp")
        activeView.scrollBy({ top: -menuScrollAmount, behavior: "smooth" });
    }
  }
});

function goToNextPage() {
  if (isSpreadModeActive()) {
    goToPage(getCurrentReaderPage() + 2, "smooth");
    return;
  }

  const pages = Array.from(document.querySelectorAll(".page-placeholder"));
  const readerRect = reader.getBoundingClientRect();
  const next = pages.find(
    (p) => p.getBoundingClientRect().top > readerRect.top + 50,
  );
  if (next) {
    const readerPaddingTop =
      parseInt(window.getComputedStyle(reader).paddingTop, 10) || 0;
    reader.scrollTo({
      top: next.offsetTop - readerPaddingTop,
      behavior: "smooth",
    });
  }
}

function goToPrevPage() {
  if (isSpreadModeActive()) {
    goToPage(getCurrentReaderPage() - 2, "smooth");
    return;
  }

  const pages = Array.from(document.querySelectorAll(".page-placeholder"));
  const readerRect = reader.getBoundingClientRect();
  const prevs = pages.filter(
    (p) => p.getBoundingClientRect().top < readerRect.top - 50,
  );
  if (prevs.length > 0) {
    const prev = prevs[prevs.length - 1];
    const readerPaddingTop =
      parseInt(window.getComputedStyle(reader).paddingTop, 10) || 0;
    reader.scrollTo({
      top: prev.offsetTop - readerPaddingTop,
      behavior: "smooth",
    });
  }
}

function navigateChapter(direction) {
  if (!currentBookPath) return;
  let foundBook = null,
    foundIndex = -1;
  for (let b of libraryData) {
    if (b.chapters && Array.isArray(b.chapters)) {
      const idx = b.chapters.findIndex((c) => c.path === currentBookPath);
      if (idx !== -1) {
        foundBook = b;
        foundIndex = idx;
        break;
      }
    }
  }
  if (foundBook && foundIndex !== -1) {
    if (direction === "next" && foundIndex < foundBook.chapters.length - 1) {
      reader.scrollTop = 0;
      const nextChapter = foundBook.chapters[foundIndex + 1];
      bacaFile(nextChapter.path, `${foundBook.title} - ${nextChapter.name}`);
    } else if (direction === "prev" && foundIndex > 0) {
      reader.scrollTop = 0;
      const prevChapter = foundBook.chapters[foundIndex - 1];
      bacaFile(prevChapter.path, `${foundBook.title} - ${prevChapter.name}`);
    }
  }
}
