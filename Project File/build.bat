@echo off
setlocal EnableExtensions

cd /d "%~dp0"
set "ROOT_DIR=%cd%"
mode con: cols=88 lines=38 >nul 2>nul

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js tidak ditemukan.
    echo [INFO] Install Node.js, lalu jalankan ulang.
    pause
    exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm tidak ditemukan.
    echo [INFO] Pastikan Node.js terinstall dengan benar.
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
echo .   
echo    ============================================================
echo                            KeiYomi Tools
echo    ============================================================
echo.    
echo    Build                         Test / Output
echo    -----                         -------------
echo    1. Win installer x64          A. Syntax check
echo    2. Win installer ARM64        B. Run from source
echo    3. Win portable x64           C. Run unpacked app
echo    4. Win portable ARM64         D. Test installer x64
echo    5. Win installer x64+ARM64    E. Show outputs
echo    6. Linux build                R. Reset build output
echo    7. Linux portable
echo    8. macOS build                Quality
echo    9. All platforms              -------
echo                                  F. ESLint
echo    Kontrol                       G. Prettier check
echo    -----                         H. Prettier write
echo    0. Exit                       I. npm audit
echo    X. Refresh menu               J. npm audit fix
echo    Y. Buka ulang script
echo.
echo.
set "choice="
set /p choice="Pilih opsi: "

if /i "%choice%"=="1" goto win_x64
if /i "%choice%"=="2" goto win_arm64
if /i "%choice%"=="3" goto win_portable
if /i "%choice%"=="4" goto win_portable_arm64
if /i "%choice%"=="5" goto win_all
if /i "%choice%"=="6" goto linux
if /i "%choice%"=="7" goto linux_portable
if /i "%choice%"=="8" goto mac
if /i "%choice%"=="9" goto all_platforms
if /i "%choice%"=="A" goto check_only
if /i "%choice%"=="B" goto test_source_app
if /i "%choice%"=="C" goto test_unpacked_app
if /i "%choice%"=="D" goto test_win_installer
if /i "%choice%"=="E" goto show_outputs
if /i "%choice%"=="R" goto reset_build_output
if /i "%choice%"=="F" goto quality_eslint
if /i "%choice%"=="G" goto quality_prettier_check
if /i "%choice%"=="H" goto quality_prettier_write
if /i "%choice%"=="I" goto quality_audit
if /i "%choice%"=="J" goto quality_audit_fix
if "%choice%"=="0" goto done
if /i "%choice%"=="X" goto main_menu
if /i "%choice%"=="Y" goto relaunch_script

echo.
echo Pilihan tidak dikenal.
pause
goto main_menu

rem ---------------------------------------------------------------------------
rem UI
rem ---------------------------------------------------------------------------
:banner
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

rem ---------------------------------------------------------------------------
rem Shared helpers
rem ---------------------------------------------------------------------------
:check
echo.
echo [INFO] Menjalankan validasi syntax...
call npm.cmd run check
if errorlevel 1 exit /b 1
exit /b 0

:run_checked_script
call :check
if errorlevel 1 exit /b 1
echo.
echo [INFO] %~1...
call npm.cmd run %~2
exit /b %errorlevel%

:require_eslint
if exist "node_modules\.bin\eslint.cmd" exit /b 0
echo.
echo [ERROR] ESLint belum terpasang di project ini.
echo [INFO] Install dulu dengan: npm install --save-dev eslint
exit /b 1

:require_prettier
if exist "node_modules\.bin\prettier.cmd" exit /b 0
echo.
echo [ERROR] Prettier belum terpasang di project ini.
echo [INFO] Install dulu dengan: npm install --save-dev prettier
exit /b 1

rem ---------------------------------------------------------------------------
rem Build commands
rem ---------------------------------------------------------------------------
:win_x64
call :run_checked_script "Build Windows Installer x64" "build:win:x64"
if errorlevel 1 goto fail
goto success_build

:win_arm64
call :run_checked_script "Build Windows Installer ARM64" "build:win:arm64"
if errorlevel 1 goto fail
goto success_build

:win_portable
call :run_checked_script "Build Windows Portable x64" "build:win:portable:x64"
if errorlevel 1 goto fail
goto success_build

:win_portable_arm64
call :run_checked_script "Build Windows Portable ARM64" "build:win:portable:arm64"
if errorlevel 1 goto fail
goto success_build

:win_all
call :run_checked_script "Build Windows Installer x64 + ARM64" "build:win"
if errorlevel 1 goto fail
goto success_build

:linux
call :run_checked_script "Build Linux AppImage + deb" "build:linux"
if errorlevel 1 goto fail
goto success_build

:linux_portable
call :run_checked_script "Build Linux Portable tar.gz" "build:linux:portable"
if errorlevel 1 goto fail
goto success_build

:mac
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build macOS dmg + zip...
echo [WARN] Build macOS sebaiknya dibuat di macOS/CI.
call npm.cmd run build:mac
if errorlevel 1 goto fail
goto success_build

:all_platforms
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Build semua platform...
echo [WARN] Build release lebih stabil lewat OS/CI sesuai target.
call npm.cmd run build:all
if errorlevel 1 goto fail
goto success_build

rem ---------------------------------------------------------------------------
rem Test commands
rem ---------------------------------------------------------------------------
:check_only
call :check
if errorlevel 1 goto fail
goto success_test

:test_source_app
call :check
if errorlevel 1 goto fail
echo.
echo [INFO] Menjalankan app dari source.
echo [INFO] Tutup window app untuk kembali ke menu.
call npm.cmd start
if errorlevel 1 goto fail
goto success_test

:test_unpacked_app
echo.
if not exist "dist\win-unpacked\KeiYomi.exe" (
    echo [ERROR] dist\win-unpacked\KeiYomi.exe belum ditemukan.
    echo [INFO] Jalankan build Windows x64 dulu.
    pause
    goto main_menu
)
echo [INFO] Membuka dist\win-unpacked\KeiYomi.exe
start "" "dist\win-unpacked\KeiYomi.exe"
pause
goto main_menu

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
    goto main_menu
)

echo [INFO] Membuka "%INSTALLER%"
echo [INFO] Untuk test UI saja, klik Cancel sebelum tombol Install.
start "" "%INSTALLER%"
pause
goto main_menu

:show_outputs
echo.
if not exist "dist" (
    echo [INFO] Folder dist belum ada.
    pause
    goto main_menu
)
echo [INFO] Output release di dist:
echo.
dir /b /a-d /o-d "dist\*.exe" "dist\*.tar.gz" "dist\*.AppImage" "dist\*.deb" "dist\*.dmg" "dist\*.zip" 2>nul
echo.
pause
goto main_menu

:reset_build_output
echo.
echo [WARN] Reset ini akan menghapus folder output build:
echo        %cd%\dist
echo.
echo Data aplikasi, source code, dan node_modules tidak akan dihapus.
echo.
set "confirm="
set /p confirm="Ketik RESET untuk lanjut: "
if /i not "%confirm%"=="RESET" (
    echo.
    echo [INFO] Reset dibatalkan.
    pause
    goto main_menu
)
call :delete_dist
if errorlevel 1 goto fail
echo.
echo [OK] Output build berhasil direset.
pause
goto main_menu

rem ---------------------------------------------------------------------------
rem Quality commands
rem ---------------------------------------------------------------------------
:quality_eslint
call :require_eslint
if errorlevel 1 goto quality_tool_missing
echo.
echo [INFO] Menjalankan ESLint...
call npm.cmd run lint
if errorlevel 1 goto fail
goto success_quality

:quality_prettier_check
call :require_prettier
if errorlevel 1 goto quality_tool_missing
echo.
echo [INFO] Mengecek format dengan Prettier...
call npm.cmd run format:check
if errorlevel 1 goto fail
goto success_quality

:quality_prettier_write
call :require_prettier
if errorlevel 1 goto quality_tool_missing
echo.
echo [INFO] Merapikan format dengan Prettier...
call npm.cmd run format
if errorlevel 1 goto fail
goto success_quality

:quality_audit
echo.
echo [INFO] Menjalankan npm audit...
call npm.cmd audit
if errorlevel 1 goto fail
goto success_quality

:quality_audit_fix
echo.
echo [INFO] Menjalankan npm audit fix...
echo [WARN] Ini dapat mengubah dependency dan package-lock.json.
call npm.cmd audit fix
if errorlevel 1 goto fail
goto success_quality

rem ---------------------------------------------------------------------------
rem Result handlers
rem ---------------------------------------------------------------------------
:success_build
echo.
echo [OK] Build selesai. Cek output di folder dist.
pause
goto main_menu

:success_test
echo.
echo [OK] Test selesai.
pause
goto main_menu

:success_quality
echo.
echo [OK] Quality check selesai.
pause
goto main_menu

:quality_tool_missing
pause
goto main_menu

:delete_dist
set "DIST_DIR=%ROOT_DIR%\dist"
if /i "%DIST_DIR%"=="%ROOT_DIR%\dist" (
    if exist "%DIST_DIR%" (
        rmdir /s /q "%DIST_DIR%"
        if errorlevel 1 exit /b 1
    )
    exit /b 0
)
echo [ERROR] Path dist tidak valid.
exit /b 1

:relaunch_script
echo.
echo [INFO] Membuka ulang script...
start "" "%~f0"
goto done

:fail
echo.
echo [ERROR] Proses gagal. Lihat pesan error di atas.
pause
goto main_menu

:done
endlocal
