![Banner](assets-repo/banner.svg)
# KeiYomi

[Baca dalam Bahasa Indonesia](README.ID.md)

KeiYomi is a desktop application (PC) based on **Electron** for reading novels, documents, and digital comics offline with a modern and responsive interface.

> **Note:** This project is inspired by the famous Android application **Tachiyomi**. However, please note that **KeiYomi does not use any source code from Tachiyomi**. This is an independent project built from scratch using Electron and web technologies for desktop platforms.

## Key Features

- **Format Support:** Read **PDF**, **EPUB**, **CBZ**, **ZIP**, and **TXT** files.
- **Flexible Reading Modes:**
  - **Webtoon Mode:** Continuous vertical scroll, suitable for Manhwa/Webtoon.
  - **Normal Mode:** Page-by-page view, suitable for PDF/documents.
  - **PDF Quality Mode:** Choose light rendering or original quality.
- **Library Management:**
  - **Auto Scan:** Detects books and comic folders from the local folder (`Documents/KeiYomi`).
  - **Reading History:** Automatically saves reading progress.
  - **Favorites:** Mark books or chapters as favorites.
  - **Search & Filter:** Search books by title or filter by genre.
  - **Sort:** Sort by name, date, or last read.
- **Customization:**
  - **Themes:** Light and Dark Mode.
  - **Language:** Indonesian and English.
  - **Edit Metadata:** Change title, author, cover, and synopsis directly from the app.
- **Data Tools:** Backup, restore, and clear local app data.
- **High Performance:** Uses lazy loading to load images/pages only when needed.

## Technologies

- Electron
- Node.js
- HTML5, CSS3, JavaScript
- PDF.js for PDF rendering
- JSZip for CBZ/ZIP/EPUB extraction

## How to Run (Development)

1. Ensure Node.js is installed. Node.js 22 or newer is recommended for the current Electron build tooling.
2. Enter the app folder:
   ```bash
   cd "Project File"
   ```
3. Install dependencies:
   ```bash
   npm ci
   ```
4. Run the application:
   ```bash
   npm start
   ```

Development and installed releases use the same app identity, `KeiYomi`, so app data is stored in the same OS profile folder:

```text
Windows: %APPDATA%\KeiYomi
```

Do not run the installed release and `npm start` at the same time. The app uses a single-instance lock to prevent config/cache collisions.

## Build & Release

Run all commands from the `Project File` directory.

### Validation

```bash
npm run check
```

This checks JavaScript syntax for the main process, preload, and UI scripts.

### Local Builds

Windows installers:

```bash
npm run build:win
```

This builds both Windows targets configured in `package.json`:

- Windows x64: regular 64-bit Intel/AMD Windows.
- Windows ARM64: native Windows on ARM devices.

Individual Windows targets:

```bash
npm run build:win:x64
npm run build:win:arm64
```

Linux portable package from Windows:

```bash
npm run build:linux:portable
```

This creates a `.tar.gz` package. Full Linux installers such as AppImage and `.deb` should be built on Linux or through GitHub Actions.

### Full Multi-Platform Builds

```bash
npm run build
```

This maps to `npm run build:all` and asks electron-builder to build Windows, Linux, and macOS targets. For reliable release artifacts, use GitHub Actions because each platform is built on the correct OS:

- Windows x64 and Windows ARM64 on `windows-latest`.
- Linux AppImage and `.deb` on `ubuntu-latest`.
- macOS universal `.dmg` and `.zip` on `macos-latest`.

The workflow can be started manually from GitHub Actions, or automatically by pushing a version tag such as:

```bash
git tag v3.2.0
git push origin v3.2.0
```

### Version Updates

When preparing a new release, update the version in these files:

- `Project File/package.json`: `version`, `versionCode`, and `build.extraMetadata.versionCode`.
- `Project File/package-lock.json`: root package version.
- `update.json`: `version`, `versionCode`, `releaseUrl`, and `changelog`.

For normal feature releases, increment the minor version, for example `3.1.0` to `3.2.0`. For small hotfixes only, increment the patch version, for example `3.2.0` to `3.2.1`.

## Keyboard Shortcuts

- **Up/Down Arrow:** Scroll page or navigate menu.
- **Left/Right Arrow:** Change page or chapter depending on the current reader mode.
- **ESC:** Back, close modal, or exit app.

## Folder Structure (Auto-Scan)

The application will create a `KeiYomi` folder inside your Documents folder. You can organize comic folders as follows to be detected as a series:

```text
KeiYomi/
+-- Manga Title/
    +-- info.json       (Book metadata)
    +-- cover.jpg       (Cover image)
    +-- Chapter 1.pdf
    +-- Chapter 2.cbz
    +-- ...
```

## License

MIT License
