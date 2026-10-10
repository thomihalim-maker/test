@echo off
title Marbot Masjid
rem Double-click to play Marbot Masjid offline in your browser.
rem Starts a small local web server (built-in Windows PowerShell, nothing to install).
cd /d "%~dp0"
if not exist "game\index.html" (
  echo Folder "game" tidak ditemukan. Pastikan file .bat ini ada di folder utama hasil ekstrak.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "game\tools\serve-windows.ps1" -Root "%~dp0game"
if errorlevel 1 pause
