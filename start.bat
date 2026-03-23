@echo off
title Machine Manager
cd /d "%~dp0"
set PATH=C:\Program Files\nodejs;%PATH%
npx electron-vite dev
