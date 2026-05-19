!include nsDialogs.nsh
!include LogicLib.nsh

!ifndef BUILD_UNINSTALLER
Var Dialog
Var LabelUsername
Var TextUsername
Var CheckboxTheme
Var UsernameState
Var ThemeState
Var ThemeStr

!macro customPageAfterChangeDir
  Page custom ConfigPageCreate ConfigPageLeave
!macroend

Function ConfigPageCreate
  IfFileExists "$APPDATA\KeiYomi\user_config.json" 0 +2
    Abort

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
  ${NSD_SetState} $CheckboxTheme ${BST_CHECKED}

  nsDialogs::Show
FunctionEnd

Function ConfigPageLeave
  ${NSD_GetText} $TextUsername $UsernameState
  ${NSD_GetState} $CheckboxTheme $ThemeState
FunctionEnd
!endif

!macro customHeader
!macroend

!macro customInit
!macroend

!macro customInstall
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
  FileWrite $0 '  "theme": "$ThemeStr",$\r$\n'
  FileWrite $0 '  "language": "id",$\r$\n'
  FileWrite $0 '  "library": [],$\r$\n'
  FileWrite $0 '  "history": [],$\r$\n'
  FileWrite $0 '  "customFolders": [],$\r$\n'
  FileWrite $0 '  "ignoredPaths": []$\r$\n'
  FileWrite $0 "}$\r$\n"
  FileClose $0

  SkipConfigWrite:
!macroend
