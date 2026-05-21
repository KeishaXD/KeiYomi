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

:menu
cls
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
echo    ========================================
echo    KeiYomi Build Menu
echo    ========================================
echo    1. Windows Installer x64          - Aman compile di Windows Intel/AMD
echo    2. Windows Installer ARM64        - Aman compile di Windows, target perangkat Windows ARM
echo    3. Windows Portable x64           - Aman compile di Windows, hasil .exe portable
echo    4. Windows Portable ARM64         - Aman compile di Windows, target portable Windows ARM
echo    5. Windows Installer x64 + ARM64  - Aman compile di Windows, lebih lama
echo    6. Linux Build                    - Bisa dicoba di Windows, lebih aman di Linux/CI
echo    7. Linux Portable tar.gz          - Bisa compile dari Windows
echo    8. macOS Build                    - Idealnya compile di macOS/CI
echo    9. All Platforms                  - Tidak disarankan dari Windows lokal
echo    C. Check only                     - Validasi syntax, bukan compile
echo    0. Exit
echo.
set /p choice="Pilih opsi: "

if "%choice%"=="1" goto win_x64
if "%choice%"=="2" goto win_arm64
if "%choice%"=="3" goto win_portable
if "%choice%"=="4" goto win_portable_arm64
if "%choice%"=="5" goto win_all
if "%choice%"=="6" goto linux
if "%choice%"=="7" goto linux_portable
if "%choice%"=="8" goto mac
if "%choice%"=="9" goto all_platforms
if /I "%choice%"=="C" goto check_only
if "%choice%"=="0" goto done

echo.
echo Pilihan tidak dikenal.
pause
goto menu

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
goto success

:win_all
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Windows Installer x64 + ARM64...
call npm.cmd run build:win
if errorlevel 1 goto fail
goto success

:win_arm64
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Windows Installer ARM64...
call npm.cmd run build:win:arm64
if errorlevel 1 goto fail
goto success

:win_portable
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Windows Portable x64...
call npm.cmd run build:win:portable:x64
if errorlevel 1 goto fail
goto success

:win_portable_arm64
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Windows Portable ARM64...
call npm.cmd run build:win:portable:arm64
if errorlevel 1 goto fail
goto success

:linux
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Linux AppImage + deb...
call npm.cmd run build:linux
if errorlevel 1 goto fail
goto success

:linux_portable
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build Linux Portable tar.gz...
call npm.cmd run build:linux:portable
if errorlevel 1 goto fail
goto success

:mac
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build macOS dmg + zip...
echo [WARN] Build macOS biasanya butuh macOS agar hasilnya valid untuk release.
call npm.cmd run build:mac
if errorlevel 1 goto fail
goto success

:all_platforms
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build semua platform...
echo [WARN] Build macOS biasanya butuh macOS; Linux installer penuh lebih aman dibuat di Linux/GitHub Actions.
call npm.cmd run build:all
if errorlevel 1 goto fail
goto success

:check_only
call :check
if errorlevel 1 goto fail
goto success

:success
echo.
echo [OK] Selesai. Cek output di folder dist.
pause
goto menu

:fail
echo.
echo [ERROR] Proses gagal. Lihat pesan error di atas.
pause
exit /b 1

:done
endlocal
