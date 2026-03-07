const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

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

// --- FITUR BARU: SCAN LIBRARY OTOMATIS ---
ipcMain.handle('library:scanLocal', async () => {
    const docPath = app.getPath('documents');
    const baseDir = path.join(docPath, 'MyPembacaDokumen');

    // 1. Buat folder jika belum ada
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
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
                        
                        // Cari file chapter di dalam folder ini
                        const chapterFiles = fs.readdirSync(fullPath)
                            .filter(f => supportedExts.includes(path.extname(f).toLowerCase()))
                            .map(f => ({
                                name: f,
                                path: path.join(fullPath, f)
                            }));

                        results.push({
                            type: 'series',
                            ...infoData, // Mengambil title, genre, synopsis, cover dari json
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