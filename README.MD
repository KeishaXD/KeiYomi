![Banner](assets-repo/banner.svg)
# KeiYomi

[Baca dalam Bahasa Indonesia](README.ID.md)

KeiYomi is a desktop application (PC) based on **Electron** for reading novels, documents, and digital comics offline with a modern and responsive interface.

> **Note:** This project is inspired by the famous Android application **Tachiyomi**. However, please note that **KeiYomi does not use any source code from Tachiyomi**. This is an independent project built from scratch using Electron and web technologies for desktop platforms.

## Key Features

- **Format Support:** Read **PDF**, **CBZ**, **ZIP**, and **TXT** files.
- **Flexible Reading Modes:**
  - **Webtoon Mode:** Continuous vertical scroll (suitable for Manhwa/Webtoon).
  - **Normal Mode:** Page-by-page view (suitable for PDF/Documents).
- **Library Management:**
  - **Auto Scan:** Detects books and comic folders from the local folder (`Documents/KeiYomi`).
  - **Reading History:** Automatically saves the last read page.
  - **Favorites:** Mark specific books or chapters as favorites.
  - **Search & Filter:** Search books by title or filter by genre.
  - **Sort:** Sort by Name, Date, or Last Read.
- **Customization:**
  - **Themes:** Light and Dark Mode.
  - **Language:** Support for Indonesian and English.
  - **Edit Metadata:** Change title, author, cover, and synopsis directly from the app.
- **High Performance:** Uses *Lazy Loading* to load images/pages only when needed.

## Technologies

- Electron
- Node.js
- HTML5, CSS3, JavaScript
- PDF.js (PDF Rendering)
- JSZip (CBZ/ZIP Extraction)

## How to Run (Development)

1. Ensure Node.js is installed.
2. Enter the project folder:
   ```bash
   cd "My Pembaca Dokumen"
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the application:
   ```bash
   npm start
   ```

## Keyboard Shortcuts

- **Up/Down Arrow:** Scroll page / navigate menu.
- **Left/Right Arrow:** Change page (Next/Prev Page).
- **ESC:** Back / Close Modal / Exit App.

## Folder Structure (Auto-Scan)

The application will create a `KeiYomi` folder inside your Documents folder. You can organize comic folders as follows to be detected as a series:

```text
KeiYomi/
└── Manga Title/
    ├── info.json       (Book metadata)
    ├── cover.jpg       (Cover image)
    ├── Chapter 1.pdf
    ├── Chapter 2.cbz
    └── ...
```

## Lisensi
MIT License
