!include LogicLib.nsh
!include nsDialogs.nsh

!ifndef BUILD_UNINSTALLER
Var PrefTheme
Var PrefLanguage
Var PrefReaderMode
Var PrefPdfQuality
Var PrefUsername
Var ThemeControl
Var LanguageControl
Var ReaderModeControl
Var PdfQualityControl
Var UsernameControl

!macro customPageAfterChangeDir
  Page custom KeiYomiProfilePreferencesCreate KeiYomiProfilePreferencesLeave
  Page custom KeiYomiReadingPreferencesCreate KeiYomiReadingPreferencesLeave
!macroend

Function KeiYomiProfilePreferencesCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 18u "Preferensi profil dan tampilan"
  Pop $0

  ${NSD_CreateLabel} 0 22u 100% 12u "Atur identitas dan tampilan awal KeiYomi."
  Pop $0

  ${NSD_CreateLabel} 0 36u 32% 12u "Nama pengguna"
  Pop $0
  ${NSD_CreateText} 36% 34u 60% 12u ""
  Pop $UsernameControl

  ${NSD_CreateLabel} 0 56u 32% 12u "Bahasa"
  Pop $0
  ${NSD_CreateDropList} 36% 54u 60% 64u "Indonesia"
  Pop $LanguageControl
  ${NSD_CB_AddString} $LanguageControl "Indonesia"
  ${NSD_CB_AddString} $LanguageControl "English"
  ${NSD_CB_SelectString} $LanguageControl "Indonesia"

  ${NSD_CreateLabel} 0 76u 32% 12u "Tema"
  Pop $0
  ${NSD_CreateDropList} 36% 74u 60% 64u "Gelap (Dark)"
  Pop $ThemeControl
  ${NSD_CB_AddString} $ThemeControl "Gelap (Dark)"
  ${NSD_CB_AddString} $ThemeControl "Terang (Light)"
  ${NSD_CB_SelectString} $ThemeControl "Gelap (Dark)"

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
    StrCpy $PrefTheme "light"
  ${Else}
    StrCpy $PrefTheme "dark"
  ${EndIf}
FunctionEnd

Function KeiYomiReadingPreferencesCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 18u "Preferensi baca"
  Pop $0

  ${NSD_CreateLabel} 0 22u 100% 12u "Pilih mode baca dan kualitas PDF bawaan."
  Pop $0

  ${NSD_CreateLabel} 0 42u 32% 12u "Mode baca"
  Pop $0
  ${NSD_CreateDropList} 36% 40u 60% 64u "Webtoon (Scroll)"
  Pop $ReaderModeControl
  ${NSD_CB_AddString} $ReaderModeControl "Webtoon (Scroll)"
  ${NSD_CB_AddString} $ReaderModeControl "Normal (Per Halaman)"
  ${NSD_CB_SelectString} $ReaderModeControl "Webtoon (Scroll)"

  ${NSD_CreateLabel} 0 66u 32% 12u "Kualitas PDF"
  Pop $0
  ${NSD_CreateDropList} 36% 64u 60% 64u "Mode Ringan"
  Pop $PdfQualityControl
  ${NSD_CB_AddString} $PdfQualityControl "Mode Ringan"
  ${NSD_CB_AddString} $PdfQualityControl "Mode Asli"
  ${NSD_CB_SelectString} $PdfQualityControl "Mode Ringan"

  nsDialogs::Show
FunctionEnd

Function KeiYomiReadingPreferencesLeave
  ${NSD_GetText} $ReaderModeControl $0
  ${If} $0 == "Normal (Per Halaman)"
    StrCpy $PrefReaderMode "normal"
  ${Else}
    StrCpy $PrefReaderMode "webtoon"
  ${EndIf}

  ${NSD_GetText} $PdfQualityControl $0
  ${If} $0 == "Mode Asli"
    StrCpy $PrefPdfQuality "original"
  ${Else}
    StrCpy $PrefPdfQuality "light"
  ${EndIf}
FunctionEnd

!macro customInstall
  CreateDirectory "$APPDATA\KeiYomi"
  Delete "$APPDATA\KeiYomi\installer_preferences.ini"

  WriteINIStr "$APPDATA\KeiYomi\installer_preferences.ini" "Preferences" "username" "$PrefUsername"
  WriteINIStr "$APPDATA\KeiYomi\installer_preferences.ini" "Preferences" "theme" "$PrefTheme"
  WriteINIStr "$APPDATA\KeiYomi\installer_preferences.ini" "Preferences" "language" "$PrefLanguage"
  WriteINIStr "$APPDATA\KeiYomi\installer_preferences.ini" "Preferences" "mode" "$PrefReaderMode"
  WriteINIStr "$APPDATA\KeiYomi\installer_preferences.ini" "Preferences" "pdfQualityMode" "$PrefPdfQuality"
!macroend
!endif
