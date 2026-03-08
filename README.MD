# KeiYomi

KeiYomi adalah aplikasi desktop (PC) berbasis **Electron** untuk membaca novel, dokumen, dan komik digital secara offline dengan antarmuka yang modern dan responsif.

## Fitur Utama

- **Dukungan Format:** Membaca file **PDF**, **CBZ**, **ZIP**, dan **TXT**.
- **Mode Baca Fleksibel:**
  - **Mode Webtoon:** Scroll vertikal tanpa putus (cocok untuk Manhwa/Webtoon).
  - **Mode Normal:** Tampilan per halaman (cocok untuk PDF/Dokumen).
- **Manajemen Pustaka:**
  - **Scan Otomatis:** Mendeteksi buku dan folder komik dari folder lokal (`Documents/KeiYomi`).
  - **Riwayat Bacaan:** Menyimpan halaman terakhir yang dibaca secara otomatis.
  - **Favorit:** Tandai buku atau chapter tertentu sebagai favorit.
  - **Pencarian & Filter:** Cari buku berdasarkan judul atau filter berdasarkan genre.
  - **Sortir:** Urutkan berdasarkan Nama, Tanggal, atau Terakhir Dibaca.
- **Kustomisasi:**
  - **Tema:** Mode Terang (Light) dan Gelap (Dark).
  - **Bahasa:** Dukungan Bahasa Indonesia dan Inggris.
  - **Edit Metadata:** Ubah judul, penulis, sampul, dan sinopsis buku langsung dari aplikasi.
- **Performa Tinggi:** Menggunakan *Lazy Loading* untuk memuat gambar/halaman hanya saat dibutuhkan.

## Teknologi

- Electron
- Node.js
- HTML5, CSS3, JavaScript
- PDF.js (Rendering PDF)
- JSZip (Ekstraksi CBZ/ZIP)

## Cara Menjalankan (Development)

1. Pastikan Node.js sudah terinstall.
2. Masuk ke folder project:
   ```bash
   cd "My Pembaca Dokumen"
   ```
3. Install dependency:
   ```bash
   npm install
   ```
4. Jalankan aplikasi:
   ```bash
   npm start
   ```

## Pintasan Keyboard

- **Panah Atas/Bawah:** Scroll halaman / navigasi menu.
- **Panah Kiri/Kanan:** Pindah halaman (Next/Prev Page).
- **ESC:** Kembali / Tutup Modal / Keluar Aplikasi.

## Struktur Folder (Auto-Scan)

Aplikasi akan membuat folder `KeiYomi` di dalam folder Documents Anda. Anda dapat menyusun folder komik seperti berikut agar terdeteksi sebagai satu seri:

```text
KeiYomi/
└── Judul Manga/
    ├── info.json       (Metadata buku)
    ├── cover.jpg       (Gambar sampul)
    ├── Chapter 1.pdf
    ├── Chapter 2.cbz
    └── ...
```

## Lisensi
ISC License
