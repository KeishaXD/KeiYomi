@echo off
setlocal EnableExtensions

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js tidak ditemukan. Install Node.js dulu, lalu jalankan ulang.
    pause
    exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm tidak ditemukan. Pastikan Node.js terinstall dengan benar.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] node_modules belum ada. Menjalankan npm ci...
    call npm.cmd ci
    if errorlevel 1 goto fail
)

:main_menu
cls
call :banner
echo    ========================================
echo    KeiYomi Tools
echo    ========================================
echo    1. Build
echo    2. Test
echo    0. Exit
echo.
set "choice="
set /p choice="Pilih opsi: "

if "%choice%"=="1" goto build_menu
if "%choice%"=="2" goto test_menu
if "%choice%"=="0" goto done

echo.
echo Pilihan tidak dikenal.
pause
goto main_menu

:build_menu
cls
call :banner
echo    ========================================
echo    Build Menu
echo    ========================================
echo    1. Windows Installer x64          - Aman compile di Windows Intel/AMD
echo    2. Windows Installer ARM64        - Target perangkat Windows ARM
echo    3. Windows Portable x64           - Hasil .exe portable
echo    4. Windows Portable ARM64         - Target portable Windows ARM
echo    5. Windows Installer x64 + ARM64  - Lebih lama
echo    6. Linux Build                    - Lebih aman di Linux/CI
echo    7. Linux Portable tar.gz          - Bisa compile dari Windows
echo    8. macOS Build                    - Idealnya compile di macOS/CI
echo    9. All Platforms                  - Tidak disarankan dari Windows lokal
echo    0. Back
echo.
set "choice="
set /p choice="Pilih build: "

if "%choice%"=="1" goto win_x64
if "%choice%"=="2" goto win_arm64
if "%choice%"=="3" goto win_portable
if "%choice%"=="4" goto win_portable_arm64
if "%choice%"=="5" goto win_all
if "%choice%"=="6" goto linux
if "%choice%"=="7" goto linux_portable
if "%choice%"=="8" goto mac
if "%choice%"=="9" goto all_platforms
if "%choice%"=="0" goto main_menu

echo.
echo Pilihan tidak dikenal.
pause
goto build_menu

:test_menu
cls
call :banner
echo    ========================================
echo    Test Menu
echo    ========================================
echo    1. Check syntax only              - Validasi JavaScript tanpa build
echo    2. Run app from source            - Menjalankan npm start
echo    3. Run unpacked Windows app       - Buka dist\win-unpacked\KeiYomi.exe
echo    4. Test Windows installer x64     - Buka wizard installer tanpa rebuild
echo    5. Show build outputs             - Lihat file rilis di dist
echo    0. Back
echo.
set "choice="
set /p choice="Pilih test: "

if "%choice%"=="1" goto check_only
if "%choice%"=="2" goto test_source_app
if "%choice%"=="3" goto test_unpacked_app
if "%choice%"=="4" goto test_win_installer
if "%choice%"=="5" goto show_outputs
if "%choice%"=="0" goto main_menu

echo.
echo Pilihan tidak dikenal.
pause
goto test_menu

:banner
echo.
echo.
echo    $$\   $$\          $$\ $$\     $$\                       $$\
echo    $$ ^| $$  ^|         \__^|\$$\   $$  ^|                      \__^|
echo    $$ ^|$$  / $$$$$$\  $$\  \$$\ $$  /$$$$$$\  $$$$$$\$$$$\  $$\
echo    $$$$$  / $$  __$$\ $$ ^|  \$$$$  /$$  __$$\ $$  _$$  _$$\ $$ ^|
echo    $$  $$^<  $$$$$$$$ ^|$$ ^|   \$$  / $$ /  $$ ^|$$ / $$ / $$ ^|$$ ^|
echo    $$ ^|\$$\ $$   ____^|$$ ^|    $$ ^|  $$ ^|  $$ ^|$$ ^| $$ ^| $$ ^|$$ ^|
echo    $$ ^| \$$\\$$$$$$$\ $$ ^|    $$ ^|  \$$$$$$  ^|$$ ^| $$ ^| $$ ^|$$ ^|
echo    \__^|  \__^|\_______^|\__^|    \__^|   \______/ \__^| \__^| \__^|\__^|
echo.
exit /b 0

:check
echo.
echo [INFO] Menjalankan validasi syntax...
call npm.cmd run check
if errorlevel 1 exit /b 1
exit /b 0

:win_x64
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Windows Installer x64...
call npm.cmd run build:win:x64
if errorlevel 1 goto fail
goto success_build

:win_all
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Windows Installer x64 + ARM64...
call npm.cmd run build:win
if errorlevel 1 goto fail
goto success_build

:win_arm64
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Windows Installer ARM64...
call npm.cmd run build:win:arm64
if errorlevel 1 goto fail
goto success_build

:win_portable
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Windows Portable x64...
call npm.cmd run build:win:portable:x64
if errorlevel 1 goto fail
goto success_build

:win_portable_arm64
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Windows Portable ARM64...
call npm.cmd run build:win:portable:arm64
if errorlevel 1 goto fail
goto success_build

:linux
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Linux AppImage + deb...
call npm.cmd run build:linux
if errorlevel 1 goto fail
goto success_build

:linux_portable
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Linux Portable tar.gz...
call npm.cmd run build:linux:portable
if errorlevel 1 goto fail
goto success_build

:mac
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build macOS dmg + zip...
echo [WARN] Build macOS biasanya butuh macOS agar hasilnya valid untuk release.
call npm.cmd run build:mac
if errorlevel 1 goto fail
goto success_build

:all_platforms
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build semua platform...
echo [WARN] Build macOS biasanya butuh macOS; Linux installer penuh lebih aman dibuat di Linux/GitHub Actions.
call npm.cmd run build:all
if errorlevel 1 goto fail
goto success_build

:check_only
call :check
if errorlevel 1 goto fail
goto success_test

:test_source_app
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Menjalankan app dari source. Tutup window app untuk kembali ke menu.
call npm.cmd start
if errorlevel 1 goto fail
goto success_test

:test_unpacked_app
echo.
if not exist "dist\win-unpacked\KeiYomi.exe" (
    echo [ERROR] dist\win-unpacked\KeiYomi.exe belum ditemukan.
    echo [INFO] Jalankan Build ^> Windows Installer x64 atau Windows Portable x64 dulu.
    pause
    goto test_menu
)
echo [INFO] Membuka dist\win-unpacked\KeiYomi.exe
start "" "dist\win-unpacked\KeiYomi.exe"
pause
goto test_menu

:test_win_installer
echo.
echo [INFO] Mencari installer Windows x64 terbaru di folder dist...
set "INSTALLER="
for /f "delims=" %%F in ('dir /b /a-d /o-d "dist\KeiYomi-Setup-*-x64.exe" 2^>nul') do (
    set "INSTALLER=dist\%%F"
    goto installer_found
)

:installer_found
if not defined INSTALLER (
    echo [ERROR] Installer Windows x64 belum ditemukan.
    echo [INFO] Jalankan Build ^> Windows Installer x64 dulu.
    pause
    goto test_menu
)

echo [INFO] Membuka "%INSTALLER%"
echo [INFO] Untuk test UI saja, klik Cancel sebelum tombol Install.
start "" "%INSTALLER%"
pause
goto test_menu

:show_outputs
echo.
if not exist "dist" (
    echo [INFO] Folder dist belum ada.
    pause
    goto test_menu
)
echo [INFO] Output release di dist:
echo.
dir /b /a-d /o-d "dist\*.exe" "dist\*.tar.gz" "dist\*.AppImage" "dist\*.deb" "dist\*.dmg" "dist\*.zip" 2>nul
echo.
pause
goto test_menu

:success_build
echo.
echo [OK] Build selesai. Cek output di folder dist.
pause
goto build_menu

:success_test
echo.
echo [OK] Test selesai.
pause
goto test_menu

:fail
echo.
echo [ERROR] Proses gagal. Lihat pesan error di atas.
pause
exit /b 1

:done
endlocal
