const { app, BrowserWindow, ipcMain, dialog, nativeTheme, net, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const appName = 'KeiYomi';
app.setName(appName);

const gotSingleInstanceLock = app.requestSingleInstanceLock();
let mainWindow = null;

if (!gotSingleInstanceLock) {
    app.quit();
}

const allowedDocumentExts = new Set(['.pdf', '.epub', '.cbz', '.zip', '.txt']);
const allowedImageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.avif', '.jfif', '.ico']);
const allowedPickedFiles = new Set();
const allowedPickedDirs = new Set();

function isAllowedReleaseUrl(releaseUrl) {
    try {
        const parsed = new URL(releaseUrl);
        return parsed.protocol === 'https:' &&
            parsed.hostname === 'github.com' &&
            parsed.pathname.startsWith('/KeishaXD/KeiYomi/releases');
    } catch {
        return false;
    }
}

function isSafeExternalUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
        return false;
    }
}

function getUserConfigPath() {
    return path.join(app.getPath('userData'), 'user_config.json');
}

function getInstallerPreferencesPath() {
    return path.join(app.getPath('userData'), 'installer_preferences.ini');
}

function readUserConfig() {
    const filePath = getUserConfigPath();
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
}

function writeUserConfig(data) {
    const filePath = getUserConfigPath();
    const tempPath = `${filePath}.tmp-${process.pid}`;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    fs.renameSync(tempPath, filePath);
}

function getDefaultLibraryPath() {
    return path.join(app.getPath('documents'), appName);
}

function normalizeInstallerPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
        return {};
    }

    const normalized = {};

    if (typeof preferences.username === 'string' && preferences.username.trim() !== '') {
        normalized.username = preferences.username.trim().slice(0, 80);
    }

    if (preferences.theme === 'dark' || preferences.theme === 'light') {
        normalized.theme = preferences.theme;
    }

    if (preferences.language === 'id' || preferences.language === 'en') {
        normalized.language = preferences.language;
    }

    if (preferences.mode === 'webtoon' || preferences.mode === 'normal') {
        normalized.mode = preferences.mode;
    }

    if (preferences.pdfQualityMode === 'light' || preferences.pdfQualityMode === 'original') {
        normalized.pdfQualityMode = preferences.pdfQualityMode;
    }

    return normalized;
}

function readTextFileWithDetectedEncoding(filePath) {
    const buffer = fs.readFileSync(filePath);

    if (buffer.length >= 2) {
        if (buffer[0] === 0xff && buffer[1] === 0xfe) {
            return buffer.slice(2).toString('utf16le');
        }

        if (buffer[0] === 0xfe && buffer[1] === 0xff) {
            return buffer.slice(2).swap16().toString('utf16le');
        }
    }

    for (let index = 1; index < Math.min(buffer.length, 64); index += 2) {
        if (buffer[index] === 0) {
            return buffer.toString('utf16le').replace(/^\uFEFF/, '');
        }
    }

    return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

function parseInstallerPreferences(rawPreferences) {
    const preferences = {};

    rawPreferences.split(/\r?\n/).forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('[') || trimmedLine.startsWith(';')) return;

        const separatorIndex = trimmedLine.indexOf('=');
        if (separatorIndex === -1) return;

        const key = trimmedLine.slice(0, separatorIndex).trim();
        const value = trimmedLine.slice(separatorIndex + 1).trim();
        preferences[key] = value;
    });

    return preferences;
}

function applyInstallerPreferences() {
    const preferencesPath = getInstallerPreferencesPath();
    if (!fs.existsSync(preferencesPath)) return;

    try {
        const preferences = normalizeInstallerPreferences(
            parseInstallerPreferences(readTextFileWithDetectedEncoding(preferencesPath))
        );

        const currentConfig = readUserConfig();
        if (currentConfig) return;

        const initialConfig = {
            library: [],
            history: [],
            customFolders: [],
            ignoredPaths: []
        };

        writeUserConfig({
            ...initialConfig,
            ...preferences
        });
    } catch (error) {
        console.error('Gagal menerapkan preferensi installer:', error);
    } finally {
        try {
            fs.unlinkSync(preferencesPath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Gagal menghapus preferensi installer:', error);
            }
        }
    }
}

function isSafeNewFolderName(folderName) {
    if (typeof folderName !== 'string') return false;

    const trimmedName = folderName.trim();
    if (!trimmedName || trimmedName === '.' || trimmedName === '..') return false;
    if (path.isAbsolute(trimmedName)) return false;
    if (/[\\/]/.test(trimmedName)) return false;
    if (/[<>:"|?*\x00-\x1F]/.test(trimmedName)) return false;
    if (/[. ]$/.test(trimmedName)) return false;

    const reservedWindowsNames = new Set([
        'con', 'prn', 'aux', 'nul',
        'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
        'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
    ]);
    return !reservedWindowsNames.has(trimmedName.toLowerCase());
}

function normalizePathForAccess(targetPath) {
    if (typeof targetPath !== 'string' || targetPath.trim() === '') {
        return null;
    }

    try {
        return path.resolve(targetPath);
    } catch {
        return null;
    }
}

function rememberAllowedFile(filePath) {
    const normalized = normalizePathForAccess(filePath);
    if (normalized) allowedPickedFiles.add(normalized.toLowerCase());
}

function rememberAllowedDir(dirPath) {
    const normalized = normalizePathForAccess(dirPath);
    if (normalized) allowedPickedDirs.add(normalized.toLowerCase());
}

function isPathInside(childPath, parentPath) {
    const child = normalizePathForAccess(childPath);
    const parent = normalizePathForAccess(parentPath);
    if (!child || !parent) return false;

    const relative = path.relative(parent, child);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function getSavedAccessRoots() {
    const roots = [
        getDefaultLibraryPath(),
        path.join(app.getPath('userData'), 'covers_cache')
    ];

    try {
        const configPath = getUserConfigPath();
        if (fs.existsSync(configPath)) {
            const data = readUserConfig();
            if (!data || typeof data !== 'object' || Array.isArray(data)) return roots.filter(Boolean);

            if (Array.isArray(data.customFolders)) {
                data.customFolders.forEach(folderPath => roots.push(folderPath));
            }

            const collectBookPaths = (items = []) => {
                items.forEach(item => {
                    if (!item || typeof item !== 'object') return;
                    if (item.structureType === 'series' && item.path) roots.push(item.path);
                    if (item.path) rememberAllowedFile(item.path);
                    if (Array.isArray(item.chapters)) {
                        item.chapters.forEach(chapter => {
                            if (chapter && chapter.path) rememberAllowedFile(chapter.path);
                        });
                    }
                });
            };

            collectBookPaths(data.library);
            collectBookPaths(data.history);
        }
    } catch (error) {
        console.error('Gagal membaca daftar akses file tersimpan:', error);
    }

    return roots.filter(Boolean);
}

function isKnownAllowedPath(targetPath) {
    const normalized = normalizePathForAccess(targetPath);
    if (!normalized) return false;

    const lower = normalized.toLowerCase();
    if (allowedPickedFiles.has(lower) || allowedPickedDirs.has(lower)) return true;
    return getSavedAccessRoots().some(root => isPathInside(normalized, root));
}

function isAllowedReadableFile(filePath, allowedExts) {
    const normalized = normalizePathForAccess(filePath);
    if (!normalized) return false;
    const ext = path.extname(normalized).toLowerCase();
    return allowedExts.has(ext) && isKnownAllowedPath(normalized);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 720,
        title: "KeiYomi",
        icon: path.join(__dirname, '../assets/logo.ico'), // Path disesuaikan
        backgroundColor: '#1e1e1e', // Mencegah flash putih saat loading (Dark Mode)
        autoHideMenuBar: true, // Menyembunyikan menu bar File, Edit, View, dll.
        frame: false, // Menghilangkan border dan title bar bawaan OS
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
        console.error(`Preload error (${preloadPath}):`, error);
    });

    mainWindow.webContents.on('console-message', (event, details) => {
        if (details.level >= 3) {
            console.error(`[renderer:${details.level}] ${details.message} (${details.sourceId}:${details.lineNumber})`);
        }
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
        console.error('Renderer process gone:', details);
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`Gagal memuat ${validatedURL}: ${errorCode} ${errorDescription}`);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.loadFile(path.join(__dirname, '../UI/index.html')); // Path disesuaikan
}

app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
});

app.whenReady().then(() => {
    applyInstallerPreferences();
    nativeTheme.themeSource = 'dark'; // Memaksa elemen native (menu, scrollbar, dll) jadi gelap
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Menangani permintaan pemilihan file dari index.html
ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Documents', extensions: ['pdf', 'epub', 'cbz', 'zip', 'txt'] }
        ]
    });
    if (canceled) {
        return null;
    } else {
        rememberAllowedFile(filePaths[0]);
        return filePaths[0];
    }
});

ipcMain.handle('dialog:openCover', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif', 'jfif', 'ico'] }
        ]
    });
    if (canceled) {
        return null;
    } else {
        rememberAllowedFile(filePaths[0]);
        return filePaths[0];
    }
});

// Menangani permintaan pemilihan direktori folder dari index.html
ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (canceled) {
        return null;
    } else {
        rememberAllowedDir(filePaths[0]);
        return filePaths[0];
    }
});

// --- FITUR BARU: KOMPRESI GAMBAR SAMPUL ---
ipcMain.handle('image:compressCover', async (event, sourcePath) => {
    try {
        if (!isAllowedReadableFile(sourcePath, allowedImageExts)) {
            throw new Error('Akses gambar sampul tidak diizinkan.');
        }

        const userDataPath = app.getPath('userData');
        const coversDir = path.join(userDataPath, 'covers_cache');
        
        // Buat folder cache cover jika belum ada
        if (!fs.existsSync(coversDir)) {
            fs.mkdirSync(coversDir, { recursive: true });
        }

        // Gunakan nativeImage bawaan Electron untuk resize & kompresi
        let image = nativeImage.createFromPath(sourcePath);
        const size = image.getSize();
        
        // Resize ke lebar maksimal 400px agar ringan tapi tetap tajam
        if (size.width > 400) {
            image = image.resize({ width: 400 });
        }

        const buffer = image.toJPEG(80); // Kompresi kualitas 80%
        const fileName = `cover_${Date.now()}.jpg`;
        const destPath = path.join(coversDir, fileName);
        
        fs.writeFileSync(destPath, buffer);
        rememberAllowedFile(destPath);
        return destPath;
    } catch (error) {
        console.error('Gagal mengkompresi gambar:', error);
        return sourcePath; // Fallback ke gambar asli jika gagal
    }
});

// --- FITUR BARU: SAVE/LOAD DATA KE FILE TERSEMBUNYI ---
ipcMain.handle('data:save', async (event, data) => {
    try {
        const existingData = readUserConfig() || {};
        writeUserConfig({ ...existingData, ...data });
        return true;
    } catch (error) {
        console.error("Gagal menyimpan data:", error);
        return false;
    }
});

ipcMain.handle('data:load', async () => {
    try {
        return readUserConfig();
    } catch (error) {
        console.error("Gagal memuat data:", error);
    }
    return null;
});

// --- FITUR BARU: BACKUP & RESTORE DATA ---
ipcMain.handle('data:backup', async () => {
    const sourcePath = getUserConfigPath();

    try {
        if (!fs.existsSync(sourcePath)) {
            return { success: false, message: 'Belum ada data aplikasi yang bisa dibackup.' };
        }

        const now = new Date();
        const dateStamp = now.toISOString().slice(0, 10);
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Backup Data KeiYomi',
            defaultPath: path.join(app.getPath('documents'), `KeiYomi_Backup_${dateStamp}.json`),
            filters: [
                { name: 'KeiYomi Backup', extensions: ['json'] }
            ]
        });

        if (canceled || !filePath) {
            return { success: false, canceled: true };
        }

        const raw = await fs.promises.readFile(sourcePath, 'utf8');
        JSON.parse(raw);
        await fs.promises.writeFile(filePath, raw, 'utf8');

        return { success: true, filePath };
    } catch (error) {
        console.error('Gagal backup data:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('data:restore', async () => {
    const targetPath = getUserConfigPath();

    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Restore Data KeiYomi',
            properties: ['openFile'],
            filters: [
                { name: 'KeiYomi Backup', extensions: ['json'] }
            ]
        });

        if (canceled || !filePaths || filePaths.length === 0) {
            return { success: false, canceled: true };
        }

        const backupPath = filePaths[0];
        const raw = await fs.promises.readFile(backupPath, 'utf8');
        const parsed = JSON.parse(raw);

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { success: false, message: 'File backup tidak valid.' };
        }

        if (parsed.library !== undefined && !Array.isArray(parsed.library)) {
            return { success: false, message: 'Format library pada file backup tidak valid.' };
        }

        if (parsed.history !== undefined && !Array.isArray(parsed.history)) {
            return { success: false, message: 'Format history pada file backup tidak valid.' };
        }

        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.promises.writeFile(targetPath, JSON.stringify(parsed, null, 2), 'utf8');

        return { success: true, filePath: backupPath };
    } catch (error) {
        console.error('Gagal restore data:', error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('file:read', async (event, filePath, encoding) => {
    if (!isAllowedReadableFile(filePath, allowedDocumentExts)) {
        throw new Error('Akses file tidak diizinkan.');
    }

    const normalized = normalizePathForAccess(filePath);
    return fs.promises.readFile(normalized, encoding);
});

ipcMain.handle('lang:load', async () => {
    const idPath = path.join(__dirname, '../Lang/id.json');
    const enPath = path.join(__dirname, '../Lang/en.json');

    const [idData, enData] = await Promise.all([
        fs.promises.readFile(idPath, 'utf8'),
        fs.promises.readFile(enPath, 'utf8')
    ]);

    return {
        id: JSON.parse(idData),
        en: JSON.parse(enData)
    };
});

ipcMain.handle('shell:openExternal', async (event, url) => {
    if (!isSafeExternalUrl(url)) {
        throw new Error('URL eksternal tidak diizinkan.');
    }
    return shell.openExternal(url);
});

ipcMain.handle('shell:openPath', async (event, targetPath) => {
    if (typeof targetPath !== 'string' || targetPath.trim() === '') {
        throw new Error('Path tidak valid.');
    }

    if (!isKnownAllowedPath(targetPath)) {
        throw new Error('Akses path tidak diizinkan.');
    }

    return shell.openPath(normalizePathForAccess(targetPath));
});

// --- FITUR BARU: HAPUS CACHE ---
ipcMain.handle('data:clear', async () => {
    const userDataPath = app.getPath('userData');
    const filePath = getUserConfigPath();
    
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Menghapus file cache
        }
        // Hapus juga folder cache cover jika ada
        const coversDir = path.join(userDataPath, 'covers_cache');
        if (fs.existsSync(coversDir)) {
            fs.rmSync(coversDir, { recursive: true, force: true });
        }
        return true;
    } catch (error) {
        console.error("Gagal menghapus cache:", error);
        return false;
    }
});

// --- FITUR BARU: BUAT FOLDER SERI ---
ipcMain.handle('library:createFolder', async (event, data) => {
    if (!data || !isSafeNewFolderName(data.folderName)) {
        return { success: false, message: "Nama folder tidak valid." };
    }

    const folderName = data.folderName.trim();
    const baseDir = path.join(getDefaultLibraryPath(), folderName);
    
    if (fs.existsSync(baseDir)) {
        return { success: false, message: "Folder dengan nama tersebut sudah ada!" };
    }
    
    try {
        fs.mkdirSync(baseDir, { recursive: true });
        rememberAllowedDir(baseDir);
        
        let coverFileName = "";
        if (data.cover && fs.existsSync(data.cover)) {
            if (!isAllowedReadableFile(data.cover, allowedImageExts)) {
                return { success: false, message: "Akses gambar sampul tidak diizinkan." };
            }

            const ext = path.extname(data.cover);
            coverFileName = `cover${ext}`;
            fs.copyFileSync(data.cover, path.join(baseDir, coverFileName));
        }

        const infoPath = path.join(baseDir, 'info.json');
        const infoContent = {
            title: data.title || folderName,
            author: data.author || "Unknown",
            cover: coverFileName,
            genre: data.genre || "",
            synopsis: data.synopsis || "",
            type: data.type || "Manga",
            date: data.date || ""
        };
        fs.writeFileSync(infoPath, JSON.stringify(infoContent, null, 2));
        return { success: true, path: baseDir };
    } catch (err) {
        return { success: false, message: err.message };
    }
});

// --- FITUR BARU: DIALOG HAPUS BUKU ---
ipcMain.handle('dialog:deleteBook', async (event, options) => {
    const { response } = await dialog.showMessageBox({
        type: 'warning',
        title: options.title,
        message: options.message,
        detail: options.detail,
        buttons: [options.btnCancel, options.btnRemoveLib],
        cancelId: 0,
        defaultId: 0
    });
    return response;
});

// --- FITUR BARU: SCAN LIBRARY OTOMATIS ---
ipcMain.handle('library:scanLocal', async (event, customFolders = []) => {
    const baseDir = getDefaultLibraryPath();
    rememberAllowedDir(baseDir);

    // 1. Buat folder jika belum ada
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    // --- FITUR BARU: Buat Contoh Folder Schema (Agar user paham formatnya) ---
    const examplePath = path.join(baseDir, 'Custom Folder');
    
    try {
        if (!fs.existsSync(examplePath)) {
            fs.mkdirSync(examplePath, { recursive: true });
        }
        
            // 1. Siapkan Cover (Cari di assets: cover.svg -> logo.svg)
            const assetCover = path.join(__dirname, '../assets', 'cover.svg'); // Path disesuaikan
            const assetLogo = path.join(__dirname, '../assets', 'logo.svg'); // Path disesuaikan
            let usedCoverName = 'cover.svg';

            if (fs.existsSync(assetCover)) {
                fs.copyFileSync(assetCover, path.join(examplePath, 'cover.svg'));
            } else if (fs.existsSync(assetLogo)) {
                fs.copyFileSync(assetLogo, path.join(examplePath, 'cover.svg'));
            }

        // 2. Cek/Update info.json
        const infoPath = path.join(examplePath, 'info.json');
        let shouldWriteInfo = !fs.existsSync(infoPath);
        let infoContent = {
                title: "Guide Book",
                author: "Developer (KeishaXD)",
                cover: usedCoverName,
                genre: "Guide",
                synopsis: "(English) This is an example of a folder format. Place the info.json, cover.svg, and book files (PDF/ZIP) in one folder to be detected automatically.\n\n (Indonesia) Ini adalah contoh format folder. Letakkan file info.json, cover.svg, dan file buku (PDF/ZIP) di dalam satu folder agar terdeteksi otomatis.",
                type: "Artikel",
                date: "2024-06-01"
        };

        if (fs.existsSync(infoPath)) {
            try {
                const currentInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
                // Jika ini adalah Guide Book default, pastikan cover-nya benar
                if (currentInfo.title === "Guide Book") {
                    currentInfo.cover = "cover.svg";
                    infoContent = currentInfo;
                    shouldWriteInfo = true;
                }
            } catch (e) { shouldWriteInfo = true; }
        }

        if (shouldWriteInfo) {
            fs.writeFileSync(infoPath, JSON.stringify(infoContent, null, 2));
        }
        
        // 3. Buat panduan.txt jika belum ada
        const panduanPath = path.join(examplePath, 'panduan.txt');
        if (!fs.existsSync(panduanPath)) {
            const panduanText = `CUSTOM FOLDER STRUCTURE GUIDE (ENGLISH)
=======================================

To allow the app to automatically detect books/comics, create a new folder inside "KeiYomi" with the following structure:

KeiYomi/
└── Your Book Title/           <-- Any Folder Name
    ├── info.json              <-- REQUIRED: Book identity file
    ├── cover.svg              <-- OPTIONAL: Cover image (can be .png/.jpeg)
    ├── Chapter 1.pdf          <-- Book content file (Chapter 1)
    ├── Chapter 2.cbz          <-- Book content file (Chapter 2)
    └── Vol 3.zip              <-- Book content file (Chapter 3)

-------------------------------------------------------
EXAMPLE CONTENT OF info.json:
-------------------------------------------------------
{
  "title": "Cool Book Title",
  "author": "Author Name",
  "cover": "cover.svg",
  "genre": "Action, Fantasy",
  "synopsis": "Write synopsis or story summary here...",
  "type": "Manga",
  "date": "2024-01-01"
}

Notes:
- Chapter files will be sorted automatically by filename.
- It is recommended to use numbering (01, 02, etc.) in chapter filenames.

=======================================================
=======================================================

PANDUAN STRUKTUR FOLDER CUSTOM (BAHASA INDONESIA)
=================================================

Agar aplikasi dapat mendeteksi buku/komik secara otomatis, buat folder baru di dalam "KeiYomi" dengan struktur berikut:

KeiYomi/
└── Judul Buku Anda/           <-- Nama Folder Bebas
    ├── info.json              <-- WAJIB: File identitas buku
    ├── cover.svg              <-- OPSIONAL: Gambar sampul (bisa .png/.jpeg)
    ├── Chapter 1.pdf          <-- File isi buku (Chapter 1)
    ├── Chapter 2.cbz          <-- File isi buku (Chapter 2)
    └── Vol 3.zip              <-- File isi buku (Chapter 3)

-------------------------------------------------------
CONTOH ISI FILE info.json:
-------------------------------------------------------
{
  "title": "Judul Buku Keren",
  "author": "Nama Penulis",
  "cover": "cover.svg",
  "genre": "Action, Fantasy",
  "synopsis": "Tulis sinopsis atau ringkasan cerita di sini...",
  "type": "Manga",
  "date": "2024-01-01"
}

Catatan:
- File chapter akan diurutkan otomatis berdasarkan nama file.
- Disarankan menggunakan penomoran (01, 02, dst) pada nama file chapter.`;

            fs.writeFileSync(panduanPath, panduanText);
        }
    } catch (e) {
        console.error("Gagal update contoh folder:", e);
    }

    const results = [];
    const supportedExts = ['.pdf', '.epub', '.cbz', '.zip', '.txt'];

    const safeCustomFolders = Array.isArray(customFolders)
        ? customFolders.filter(folderPath => isKnownAllowedPath(folderPath))
        : [];
    const foldersToScan = [baseDir, ...safeCustomFolders];
    const scannedDirs = new Set();

    for (const targetDir of foldersToScan) {
        if (!fs.existsSync(targetDir)) continue;
        rememberAllowedDir(targetDir);
        
        // Menghindari scan ganda jika user menambahkan path default secara manual
        const normPath = path.normalize(targetDir).toLowerCase();
        if (scannedDirs.has(normPath)) continue;
        scannedDirs.add(normPath);

        try {
            const items = fs.readdirSync(targetDir, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(targetDir, item.name);

                // KASUS 1: File Langsungan (Simple)
                if (item.isFile()) {
                    const ext = path.extname(item.name).toLowerCase();
                    if (supportedExts.includes(ext)) {
                        results.push({
                            structureType: 'simple',
                            title: item.name,
                            path: fullPath,
                            genre: 'Local File',
                            synopsis: `File ditemukan otomatis di folder ${path.basename(targetDir)}`
                        });
                    }
                } 
                // KASUS 2: Folder Khusus (Structured/Manga)
                else if (item.isDirectory()) {
                    const infoPath = path.join(fullPath, 'info.json');
                    
                    if (fs.existsSync(infoPath)) {
                        try {
                            // Baca info.json
                            const infoData = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
                            
                            // --- LOGIKA BARU: Auto-detect Cover ---
                            let detectedCover = infoData.cover;
                            
                            // FIX: Cek apakah file cover yang tertulis di info.json benar-benar ada
                            if (detectedCover && !fs.existsSync(path.join(fullPath, detectedCover))) {
                                detectedCover = null; // Jika tidak ada, paksa auto-detect ulang
                            }

                            if (!detectedCover) {
                                const possibleCovers = [
                                    'cover.svg', 'cover.jpeg', 'cover.png', 'cover.webp', 'cover.gif', 'cover.avif',
                                ];
                                for (const img of possibleCovers) {
                                    if (fs.existsSync(path.join(fullPath, img))) {
                                        detectedCover = img; // Gunakan nama file relatif
                                        break;
                                    }
                                }
                            }

                            // Cari file chapter di dalam folder ini
                            const files = fs.readdirSync(fullPath)
                                .filter(f => supportedExts.includes(path.extname(f).toLowerCase()));
                            
                            // Sortir file agar urutan benar (1, 2, 10)
                            files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                            const chapterFiles = files.map((f, index) => ({
                                name: `Chapter ${index + 1}`,
                                path: path.join(fullPath, f)
                            }));

                            results.push({
                                structureType: 'series',
                                ...infoData, // Mengambil title, genre, synopsis dari json
                                cover: detectedCover, // Gunakan cover yang dideteksi
                                path: fullPath, // Path folder utama
                                chapters: chapterFiles // List file chapter
                            });
                        } catch (err) {
                            console.error("Error parsing info.json in " + item.name, err);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Gagal scan folder ${targetDir}:`, error);
        }
    }

    return results;
});

// --- FITUR BARU: CHECK UPDATE (MAGISK STYLE) ---
ipcMain.handle('updater:check', async () => {
    try {
        // Baca package.json lokal untuk mendapatkan konfigurasi
        const packagePath = path.join(app.getAppPath(), 'package.json');
        const localInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        if (!localInfo.updateJson) {
            return { error: 'URL updateJson tidak ditemukan di package.json' };
        }

        // Fetch update.json dari remote (GitHub) menggunakan net module Electron
        // Menggunakan net.request lebih stabil daripada fetch di lingkungan Electron
        const remoteInfo = await new Promise((resolve, reject) => {
            const request = net.request(localInfo.updateJson);
            
            request.on('response', (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Gagal akses update.json: HTTP ${response.statusCode}`));
                    return;
                }
                
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(new Error('Format JSON tidak valid')); }
                });
            });
            
            request.on('error', (error) => reject(error));
            request.end();
        });

        const localCode = parseInt(localInfo.versionCode || 0);
        const remoteCode = parseInt(remoteInfo.versionCode || 0);
        const defaultReleaseUrl = `https://github.com/KeishaXD/KeiYomi/releases/tag/v${remoteInfo.version}`;
        const releaseUrl = isAllowedReleaseUrl(remoteInfo.releaseUrl) ? remoteInfo.releaseUrl : defaultReleaseUrl;

        return {
            updateAvailable: remoteCode > localCode,
            localInfo: { version: localInfo.version, versionCode: localCode },
            remoteInfo: { ...remoteInfo, releaseUrl }
        };
    } catch (error) {
        console.error("Update check failed:", error);
        return { error: error.message };
    }
});

// --- FITUR BARU: KELUAR APLIKASI ---
ipcMain.on('app:quit', () => {
    app.quit();
});

// --- FITUR BARU: RESTART APLIKASI ---
ipcMain.on('app:relaunch', () => {
    app.relaunch();
    app.quit();
});

// --- FITUR BARU: CUSTOM TITLE BAR CONTROLS ---
ipcMain.on('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
});

ipcMain.on('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.isMaximized() ? win.unmaximize() : win.maximize();
    }
});

ipcMain.on('window:close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
});
