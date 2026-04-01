!include nsDialogs.nsh
!include LogicLib.nsh

Var Dialog
Var LabelUsername
Var TextUsername
Var CheckboxTheme
Var UsernameState
Var ThemeState
Var ThemeStr

; --- FITUR BARU: Halaman Pengaturan Kustom ---
Page custom ConfigPageCreate ConfigPageLeave

Function ConfigPageCreate
  !insertmacro MUI_HEADER_TEXT "Pengaturan Awal" "Atur preferensi aplikasi KeiYomi sebelum instalasi."

  nsDialogs::Create 1018
  Pop $Dialog

  ${If} $Dialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 12u "Nama Pengguna (Akan ditampilkan di Pustaka):"
  Pop $LabelUsername

  ${NSD_CreateText} 0 15u 100% 12u ""
  Pop $TextUsername

  ${NSD_CreateCheckbox} 0 40u 100% 10u "Gunakan Tema Gelap (Dark Mode) secara bawaan"
  Pop $CheckboxTheme

  nsDialogs::Show
FunctionEnd

Function ConfigPageLeave
  ${NSD_GetText} $TextUsername $UsernameState
  ${NSD_GetState} $CheckboxTheme $ThemeState
FunctionEnd

!macro customHeader
  ; Mengubah teks pada halaman Welcome Instalasi
  !define MUI_WELCOMEPAGE_TITLE "Selamat Datang di Instalasi KeiYomi"
  !define MUI_WELCOMEPAGE_TEXT "KeiYomi adalah aplikasi desktop modern untuk membaca novel, dokumen (PDF), dan komik digital (CBZ/ZIP) secara offline.\r\n\nVersi ini akan dipasang di komputer Anda.\r\n\nKlik Lanjut (Next) untuk memulai proses instalasi."
  
  ; Mengubah teks pada halaman Selesai (Finish) Instalasi
  !define MUI_FINISHPAGE_TITLE "Instalasi Selesai"
  !define MUI_FINISHPAGE_TEXT "KeiYomi telah berhasil dipasang di komputer Anda.\r\n\nKlik Selesai (Finish) untuk keluar dari wizard instalasi."
  
  ; --- FITUR BARU: Jalankan aplikasi setelah instalasi ---
  !define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  !define MUI_FINISHPAGE_RUN_TEXT "Jalankan KeiYomi"
!macroend

!macro customInit
  ; Logika tambahan yang bisa dijalankan saat installer baru saja dibuka
!macroend

!macro customInstall
  ; Jika Anda ingin menjalankan perintah khusus SETELAH aplikasi terpasang, letakkan di sini.
  
  ; Cek apakah file konfigurasi sudah ada (agar tidak menimpa data jika user melakukan update/reinstall)
  IfFileExists "$APPDATA\KeiYomi\user_config.json" SkipConfigWrite
  
  StrCpy $ThemeStr "light"
  ${If} $ThemeState == ${BST_CHECKED}
    StrCpy $ThemeStr "dark"
  ${EndIf}

  ; Buat folder AppData jika belum ada
  CreateDirectory "$APPDATA\KeiYomi"

  ; Tulis konfigurasi awal ke user_config.json
  FileOpen $0 "$APPDATA\KeiYomi\user_config.json" w
  FileWrite $0 "{$\r$\n"
  FileWrite $0 '  "username": "$UsernameState",$\r$\n'
  FileWrite $0 '  "theme": "$ThemeStr"$\r$\n'
  FileWrite $0 "}$\r$\n"
  FileClose $0

  SkipConfigWrite:
!macroend