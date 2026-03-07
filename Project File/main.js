const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "My Pembaca Document",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
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
            { name: 'Documents', extensions: ['pdf', 'epub', 'cbz', 'zip'] }
        ]
    });
    if (canceled) {
        return null;
    } else {
        return filePaths[0];
    }
});

ipcMain.handle('dialog:openCover', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
        ]
    });
    if (canceled) {
        return null;
    } else {
        return filePaths[0];
    }
});

// --- FITUR BARU: SAVE/LOAD DATA KE FILE TERSEMBUNYI ---
ipcMain.handle('data:save', async (event, data) => {
    const docPath = app.getPath('documents');
    const baseDir = path.join(docPath, 'MyPembacaDokumen');
    const filePath = path.join(baseDir, '.user_config.json'); // Nama file dengan awalan titik

    try {
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        
        // Simpan data ke file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        // Set atribut hidden pada file (Windows)
        if (process.platform === 'win32') {
            exec(`attrib +h "${filePath}"`);
        }
        return true;
    } catch (error) {
        console.error("Gagal menyimpan data:", error);
        return false;
    }
});

ipcMain.handle('data:load', async () => {
    const docPath = app.getPath('documents');
    const filePath = path.join(docPath, 'MyPembacaDokumen', '.user_config.json');
    
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw);
        }
    } catch (error) {
        console.error("Gagal memuat data:", error);
    }
    return null;
});

// --- FITUR BARU: SCAN LIBRARY OTOMATIS ---
ipcMain.handle('library:scanLocal', async () => {
    const docPath = app.getPath('documents');
    const baseDir = path.join(docPath, 'MyPembacaDokumen');

    // 1. Buat folder jika belum ada
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    // --- FITUR BARU: Buat Contoh Folder Schema (Agar user paham formatnya) ---
    const examplePath = path.join(baseDir, 'Contoh Folder Schema');
    if (!fs.existsSync(examplePath)) {
        try {
            fs.mkdirSync(examplePath, { recursive: true });
            const infoContent = {
                title: "Contoh Buku Folder",
                author: "Admin",
                genre: "Panduan",
                synopsis: "Ini adalah contoh format folder. Letakkan file info.json, cover.jpg, dan file buku (PDF/ZIP) di dalam satu folder agar terdeteksi otomatis.",
                type: "Artikel"
            };
            fs.writeFileSync(path.join(examplePath, 'info.json'), JSON.stringify(infoContent, null, 2));
            fs.writeFileSync(path.join(examplePath, 'cover.jpg'), ''); // Dummy cover
            fs.writeFileSync(path.join(examplePath, 'buku_dummy.pdf'), ''); // Dummy content
        } catch (e) {
            console.error("Gagal membuat contoh folder:", e);
        }
    }

    const results = [];
    const supportedExts = ['.pdf', '.epub', '.cbz', '.zip'];

    try {
        const items = fs.readdirSync(baseDir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(baseDir, item.name);

            // KASUS 1: File Langsungan (Simple)
            if (item.isFile()) {
                const ext = path.extname(item.name).toLowerCase();
                if (supportedExts.includes(ext)) {
                    results.push({
                        type: 'simple',
                        title: item.name,
                        path: fullPath,
                        genre: 'Local File',
                        synopsis: 'File ditemukan otomatis di folder MyPembacaDokumen'
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
                        if (!detectedCover) {
                            const possibleCovers = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.webp'];
                            for (const img of possibleCovers) {
                                if (fs.existsSync(path.join(fullPath, img))) {
                                    detectedCover = img; // Gunakan nama file relatif
                                    break;
                                }
                            }
                        }

                        // Cari file chapter di dalam folder ini
                        const chapterFiles = fs.readdirSync(fullPath)
                            .filter(f => supportedExts.includes(path.extname(f).toLowerCase()))
                            .map(f => ({
                                name: f,
                                path: path.join(fullPath, f)
                            }));

                        results.push({
                            type: 'series',
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
        console.error("Gagal scan folder:", error);
    }

    return results;
});