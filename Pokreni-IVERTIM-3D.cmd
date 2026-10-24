@echo off
setlocal
cd /d "%~dp0"
title IVERTIM 3D - pokretanje
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-corpus.ps1"
if errorlevel 1 (
  echo.
  echo Pokretanje nije uspjelo. Pogledaj poruku iznad.
  pause
)
