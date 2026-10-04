@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"

title Install Agent Reach
echo ==================================================
echo   Install Agent Reach (Windows)
echo   https://github.com/Panniantong/agent-reach
echo ==================================================
echo.

set "VENV=%USERPROFILE%\.agent-reach-venv"
set "ZIP_URL=https://github.com/Panniantong/agent-reach/archive/main.zip"

REM ---------- 1. Cari Python 3.10+ (hindari alias Microsoft Store) ----------
set "PY="
where py >nul 2>&1 && (
    py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1 && set "PY=py -3"
)
if not defined PY (
    where python >nul 2>&1 && (
        python -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1 && set "PY=python"
    )
)

if not defined PY (
    echo [!] Python 3.10+ tidak ditemukan.
    where winget >nul 2>&1 || (
        echo     Silakan install Python dari https://www.python.org/downloads/
        echo     Centang "Add python.exe to PATH" saat install, lalu jalankan file ini lagi.
        goto :fail
    )
    choice /C YN /M "    Install Python 3.12 lewat winget sekarang"
    if errorlevel 2 goto :fail
    winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements
    echo.
    echo [i] Python sudah diinstall. TUTUP jendela ini lalu jalankan file .bat ini lagi
    echo     supaya PATH yang baru terbaca.
    goto :end
)
echo [OK] Python ditemukan: %PY%

REM ---------- 2. Cek Node.js (dibutuhkan untuk pencarian Exa / mcporter) ----------
where node >nul 2>&1
if errorlevel 1 (
    echo [!] Node.js belum terinstall ^(dibutuhkan untuk fitur pencarian web / Exa^).
    call :install_node
) else (
    echo [OK] Node.js ditemukan
)
echo.

REM ---------- 3. Buat virtualenv dan install Agent Reach ----------
if not exist "%VENV%\Scripts\python.exe" (
    echo [..] Membuat virtualenv di %VENV%
    %PY% -m venv "%VENV%" || goto :fail
)
echo [..] Install / update Agent Reach ...
"%VENV%\Scripts\python.exe" -m pip install --upgrade pip --quiet
"%VENV%\Scripts\python.exe" -m pip install --upgrade "%ZIP_URL%" || goto :fail
echo [OK] Agent Reach terinstall
echo.

set "AR=%VENV%\Scripts\agent-reach.exe"

REM ---------- 4. Tambahkan ke PATH user (opsional) ----------
echo %PATH% | find /I "%VENV%\Scripts" >nul
if errorlevel 1 (
    choice /C YN /M "Tambahkan agent-reach ke PATH supaya bisa dipanggil dari terminal mana saja"
    if not errorlevel 2 (
        powershell -NoProfile -Command "$p=[Environment]::GetEnvironmentVariable('Path','User'); $d='%VENV%\Scripts'; if(($p -split ';') -notcontains $d){[Environment]::SetEnvironmentVariable('Path', (($p.TrimEnd(';')+';'+$d).TrimStart(';')), 'User')}"
        echo [OK] Ditambahkan ke PATH. Berlaku di jendela terminal yang baru.
    )
)
echo.

REM ---------- 5. Pemeriksaan aman (tidak mengubah sistem) ----------
echo ==================================================
echo   Pemeriksaan lingkungan (mode aman)
echo ==================================================
"%AR%" install --env=auto
echo.

REM ---------- 6. Install komponen sistem (yt-dlp, mcporter, Exa, skill) ----------
choice /C YN /M "Lanjut install komponen sistem (yt-dlp, mcporter, Exa search, skill untuk Claude Code)"
if errorlevel 2 goto :done
"%AR%" install --env=auto --system
echo.

REM ---------- 7. Channel opsional ----------
echo Channel opsional: twitter, reddit, xiaohongshu, bilibili, facebook, instagram,
echo                   linkedin, xueqiu, xiaoyuzhou, opencli, boss, all
echo (Sebagian besar butuh cookie login - disarankan pakai akun kedua.)
set "CH="
set /p "CH=Ketik nama channel dipisah koma (kosongkan untuk lewati): "
if defined CH (
    "%AR%" install --env=auto --system --channels=!CH!
)

:done
echo.
echo ==================================================
echo   Selesai! Cek status kapan saja dengan:
echo     "%AR%" doctor
echo   (atau cukup: agent-reach doctor  - di terminal baru jika sudah masuk PATH)
echo ==================================================
goto :end

:fail
echo.
echo [X] Instalasi gagal. Lihat pesan error di atas.

:end
echo.
pause
endlocal
exit /b

:install_node
where winget >nul 2>&1
if errorlevel 1 (
    echo     Install manual dari https://nodejs.org lalu jalankan file ini lagi bila perlu.
    exit /b
)
choice /C YN /M "    Install Node.js LTS lewat winget sekarang"
if errorlevel 2 exit /b
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
echo [i] Node.js terinstall. Kalau langkah berikutnya gagal menemukan node/npm,
echo     tutup jendela ini lalu jalankan file .bat ini lagi.
exit /b
