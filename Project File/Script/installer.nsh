!include LogicLib.nsh
!include nsDialogs.nsh

!ifndef BUILD_UNINSTALLER
Var PrefTheme
Var PrefLanguage
Var PrefReaderMode
Var PrefPdfQuality
Var PrefUsername
Var InstallerLanguage
Var KeiYomiInstallType
Var InstallerLanguageIdControl
Var InstallerLanguageEnControl
Var KeiYomiInstallTypeUpdateControl
Var KeiYomiInstallTypeFreshControl
Var ThemeControl
Var LanguageControl
Var ReaderModeControl
Var PdfQualityControl
Var UsernameControl

!macro customWelcomePage
  Page custom KeiYomiInstallerLanguageCreate KeiYomiInstallerLanguageLeave
!macroend

!macro customPageAfterChangeDir
  Page custom KeiYomiInstallModeCreate KeiYomiInstallModeLeave
  Page custom KeiYomiProfilePreferencesCreate KeiYomiProfilePreferencesLeave
  Page custom KeiYomiReadingPreferencesCreate KeiYomiReadingPreferencesLeave
!macroend

Function KeiYomiInstallerLanguageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  StrCpy $InstallerLanguage "id"
  StrCpy $KeiYomiInstallType "fresh"

  ${NSD_CreateLabel} 0 0 100% 18u "Bahasa Installer / Installer Language"
  Pop $0

  ${NSD_CreateLabel} 0 24u 100% 24u "Pilih bahasa yang dipakai untuk halaman pengaturan KeiYomi."
  Pop $0

  ${NSD_CreateRadioButton} 0 56u 100% 12u "Indonesia"
  Pop $InstallerLanguageIdControl
  ${NSD_Check} $InstallerLanguageIdControl

  ${NSD_CreateRadioButton} 0 78u 100% 12u "English"
  Pop $InstallerLanguageEnControl

  nsDialogs::Show
FunctionEnd

Function KeiYomiInstallerLanguageLeave
  ${NSD_GetState} $InstallerLanguageEnControl $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $InstallerLanguage "en"
  ${Else}
    StrCpy $InstallerLanguage "id"
  ${EndIf}
FunctionEnd

Function KeiYomiInstallModeCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${If} $InstallerLanguage == "en"
    ${NSD_CreateLabel} 0 0 100% 18u "Installation Type"
    Pop $0
    ${NSD_CreateLabel} 0 24u 100% 24u "Choose whether to keep existing KeiYomi data or create new default preferences."
    Pop $0
    ${NSD_CreateRadioButton} 0 58u 100% 12u "Update existing installation"
    Pop $KeiYomiInstallTypeUpdateControl
    ${NSD_CreateRadioButton} 0 82u 100% 12u "Fresh installation"
    Pop $KeiYomiInstallTypeFreshControl
  ${Else}
    ${NSD_CreateLabel} 0 0 100% 18u "Jenis Instalasi"
    Pop $0
    ${NSD_CreateLabel} 0 24u 100% 24u "Pilih apakah data KeiYomi lama dipertahankan atau dibuat pengaturan awal baru."
    Pop $0
    ${NSD_CreateRadioButton} 0 58u 100% 12u "Update instalasi yang sudah ada"
    Pop $KeiYomiInstallTypeUpdateControl
    ${NSD_CreateRadioButton} 0 82u 100% 12u "Fresh installation"
    Pop $KeiYomiInstallTypeFreshControl
  ${EndIf}

  ${NSD_Check} $KeiYomiInstallTypeFreshControl

  nsDialogs::Show
FunctionEnd

Function KeiYomiInstallModeLeave
  ${NSD_GetState} $KeiYomiInstallTypeUpdateControl $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $KeiYomiInstallType "update"
  ${Else}
    StrCpy $KeiYomiInstallType "fresh"
  ${EndIf}
FunctionEnd

Function KeiYomiProfilePreferencesCreate
  ${If} $KeiYomiInstallType == "update"
    Abort
  ${EndIf}

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${If} $InstallerLanguage == "en"
    ${NSD_CreateLabel} 0 0 100% 18u "Profile and Display Preferences"
    Pop $0
    ${NSD_CreateLabel} 0 22u 100% 12u "Set KeiYomi's initial identity and appearance."
    Pop $0
    ${NSD_CreateLabel} 0 36u 32% 12u "Username"
    Pop $0
  ${Else}
    ${NSD_CreateLabel} 0 0 100% 18u "Preferensi profil dan tampilan"
    Pop $0
    ${NSD_CreateLabel} 0 22u 100% 12u "Atur identitas dan tampilan awal KeiYomi."
    Pop $0
    ${NSD_CreateLabel} 0 36u 32% 12u "Nama pengguna"
    Pop $0
  ${EndIf}

  ${NSD_CreateText} 36% 34u 60% 12u ""
  Pop $UsernameControl

  ${If} $InstallerLanguage == "en"
    ${NSD_CreateLabel} 0 56u 32% 12u "Language"
  ${Else}
    ${NSD_CreateLabel} 0 56u 32% 12u "Bahasa"
  ${EndIf}
  Pop $0
  ${If} $InstallerLanguage == "en"
    ${NSD_CreateDropList} 36% 54u 60% 64u "English"
  ${Else}
    ${NSD_CreateDropList} 36% 54u 60% 64u "Indonesia"
  ${EndIf}
  Pop $LanguageControl
  ${NSD_CB_AddString} $LanguageControl "Indonesia"
  ${NSD_CB_AddString} $LanguageControl "English"
  ${If} $InstallerLanguage == "en"
    ${NSD_CB_SelectString} $LanguageControl "English"
  ${Else}
    ${NSD_CB_SelectString} $LanguageControl "Indonesia"
  ${EndIf}

  ${If} $InstallerLanguage == "en"
    ${NSD_CreateLabel} 0 76u 32% 12u "Theme"
  ${Else}
    ${NSD_CreateLabel} 0 76u 32% 12u "Tema"
  ${EndIf}
  Pop $0
  ${If} $InstallerLanguage == "en"
    ${NSD_CreateDropList} 36% 74u 60% 64u "Dark"
  ${Else}
    ${NSD_CreateDropList} 36% 74u 60% 64u "Gelap (Dark)"
  ${EndIf}
  Pop $ThemeControl
  ${NSD_CB_AddString} $ThemeControl "Gelap (Dark)"
  ${NSD_CB_AddString} $ThemeControl "Terang (Light)"
  ${NSD_CB_AddString} $ThemeControl "Dark"
  ${NSD_CB_AddString} $ThemeControl "Light"
  ${If} $InstallerLanguage == "en"
    ${NSD_CB_SelectString} $ThemeControl "Dark"
  ${Else}
    ${NSD_CB_SelectString} $ThemeControl "Gelap (Dark)"
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function KeiYomiProfilePreferencesLeave
  ${NSD_GetText} $UsernameControl $PrefUsername

  ${NSD_GetText} $LanguageControl $0
  ${If} $0 == "English"
    StrCpy $PrefLanguage "en"
  ${Else}
    StrCpy $PrefLanguage "id"
  ${EndIf}

  ${NSD_GetText} $ThemeControl $0
  ${If} $0 == "Terang (Light)"
  ${OrIf} $0 == "Light"
    StrCpy $PrefTheme "light"
  ${Else}
    StrCpy $PrefTheme "dark"
  ${EndIf}
FunctionEnd

Function KeiYomiReadingPreferencesCreate
  ${If} $KeiYomiInstallType == "update"
    Abort
  ${EndIf}

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${If} $InstallerLanguage == "en"
    ${NSD_CreateLabel} 0 0 100% 18u "Reading Preferences"
    Pop $0
    ${NSD_CreateLabel} 0 22u 100% 12u "Choose the default reading mode and PDF quality."
    Pop $0
    ${NSD_CreateLabel} 0 42u 32% 12u "Reading mode"
  ${Else}
    ${NSD_CreateLabel} 0 0 100% 18u "Preferensi baca"
    Pop $0
    ${NSD_CreateLabel} 0 22u 100% 12u "Pilih mode baca dan kualitas PDF bawaan."
    Pop $0
    ${NSD_CreateLabel} 0 42u 32% 12u "Mode baca"
  ${EndIf}
  Pop $0
  ${If} $InstallerLanguage == "en"
    ${NSD_CreateDropList} 36% 40u 60% 64u "Webtoon (Scroll)"
  ${Else}
    ${NSD_CreateDropList} 36% 40u 60% 64u "Webtoon (Scroll)"
  ${EndIf}
  Pop $ReaderModeControl
  ${NSD_CB_AddString} $ReaderModeControl "Webtoon (Scroll)"
  ${NSD_CB_AddString} $ReaderModeControl "Normal (Per Halaman)"
  ${NSD_CB_AddString} $ReaderModeControl "Normal (Page by Page)"
  ${NSD_CB_SelectString} $ReaderModeControl "Webtoon (Scroll)"

  ${If} $InstallerLanguage == "en"
    ${NSD_CreateLabel} 0 66u 32% 12u "PDF quality"
  ${Else}
    ${NSD_CreateLabel} 0 66u 32% 12u "Kualitas PDF"
  ${EndIf}
  Pop $0
  ${If} $InstallerLanguage == "en"
    ${NSD_CreateDropList} 36% 64u 60% 64u "Light Mode"
  ${Else}
    ${NSD_CreateDropList} 36% 64u 60% 64u "Mode Ringan"
  ${EndIf}
  Pop $PdfQualityControl
  ${NSD_CB_AddString} $PdfQualityControl "Mode Ringan"
  ${NSD_CB_AddString} $PdfQualityControl "Mode Asli"
  ${NSD_CB_AddString} $PdfQualityControl "Light Mode"
  ${NSD_CB_AddString} $PdfQualityControl "Original Mode"
  ${If} $InstallerLanguage == "en"
    ${NSD_CB_SelectString} $PdfQualityControl "Light Mode"
  ${Else}
    ${NSD_CB_SelectString} $PdfQualityControl "Mode Ringan"
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function KeiYomiReadingPreferencesLeave
  ${NSD_GetText} $ReaderModeControl $0
  ${If} $0 == "Normal (Per Halaman)"
  ${OrIf} $0 == "Normal (Page by Page)"
    StrCpy $PrefReaderMode "normal"
  ${Else}
    StrCpy $PrefReaderMode "webtoon"
  ${EndIf}

  ${NSD_GetText} $PdfQualityControl $0
  ${If} $0 == "Mode Asli"
  ${OrIf} $0 == "Original Mode"
    StrCpy $PrefPdfQuality "original"
  ${Else}
    StrCpy $PrefPdfQuality "light"
  ${EndIf}
FunctionEnd

!macro customInstall
  ${If} $KeiYomiInstallType == "fresh"
    CreateDirectory "$APPDATA\KeiYomi"
    Delete "$APPDATA\KeiYomi\installer_preferences.ini"

    WriteINIStr "$APPDATA\KeiYomi\installer_preferences.ini" "Preferences" "username" "$PrefUsername"
    WriteINIStr "$APPDATA\KeiYomi\installer_preferences.ini" "Preferences" "theme" "$PrefTheme"
    WriteINIStr "$APPDATA\KeiYomi\installer_preferences.ini" "Preferences" "language" "$PrefLanguage"
    WriteINIStr "$APPDATA\KeiYomi\installer_preferences.ini" "Preferences" "mode" "$PrefReaderMode"
    WriteINIStr "$APPDATA\KeiYomi\installer_preferences.ini" "Preferences" "pdfQualityMode" "$PrefPdfQuality"
  ${EndIf}
!macroend
!endif
