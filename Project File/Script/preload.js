const { contextBridge, ipcRenderer } = require('electron');

const invokeChannels = new Set([
    'dialog:openFile',
    'dialog:openCover',
    'dialog:openDirectory',
    'image:compressCover',
    'image:getCoverThumbnail',
    'image:saveCoverDataUrl',
    'data:save',
    'data:load',
    'data:clear',
    'data:backup',
    'data:restore',
    'file:read',
    'cbr:extract',
    'cbr:extractCover',
    'lang:load',
    'library:createFolder',
    'dialog:deleteBook',
    'library:scanLocal',
    'shell:openExternal',
    'shell:openPath',
    'updater:check'
]);

const sendChannels = new Set([
    'app:quit',
    'app:relaunch',
    'window:minimize',
    'window:maximize',
    'window:close'
]);

function basename(filePath, extension = '') {
    const name = String(filePath || '').split(/[\\/]/).filter(Boolean).pop() || '';
    return extension && name.endsWith(extension) ? name.slice(0, -extension.length) : name;
}

function extname(filePath) {
    const name = basename(filePath);
    const dotIndex = name.lastIndexOf('.');
    return dotIndex > 0 ? name.slice(dotIndex) : '';
}

function isAbsolute(filePath) {
    return /^[a-zA-Z]:[\\/]/.test(filePath) || String(filePath || '').startsWith('/') || String(filePath || '').startsWith('\\\\');
}

function join(...parts) {
    return parts
        .filter(part => part !== undefined && part !== null && String(part) !== '')
        .map((part, index) => {
            const text = String(part);
            if (index === 0) return text.replace(/[\\/]+$/g, '');
            return text.replace(/^[\\/]+|[\\/]+$/g, '');
        })
        .join('\\');
}

contextBridge.exposeInMainWorld('keiyomi', {
    invoke(channel, ...args) {
        if (!invokeChannels.has(channel)) {
            throw new Error(`IPC invoke channel is not allowed: ${channel}`);
        }
        return ipcRenderer.invoke(channel, ...args);
    },

    send(channel, ...args) {
        if (!sendChannels.has(channel)) {
            throw new Error(`IPC send channel is not allowed: ${channel}`);
        }
        ipcRenderer.send(channel, ...args);
    },

    path: {
        basename,
        extname,
        isAbsolute,
        join
    },

    files: {
        readFile: (filePath, encoding) => ipcRenderer.invoke('file:read', filePath, encoding)
    },

    shell: {
        openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
        openPath: (targetPath) => ipcRenderer.invoke('shell:openPath', targetPath)
    },

    loadTranslations: () => ipcRenderer.invoke('lang:load')
});
