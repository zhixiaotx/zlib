@echo off
echo ========================================================
echo Z-Library Downloader - Tauri Windows .EXE Builder
echo ========================================================
echo 1. Installing Node dependencies...
call npm install

echo 2. Building frontend production bundle...
call npm run build

echo 3. Compiling Tauri Windows .EXE & NSIS Installer...
call npx tauri build

echo ========================================================
echo Build complete! Check src-tauri/target/release/bundle/
echo for the portable .exe and NSIS installer (.exe).
echo ========================================================
pause
