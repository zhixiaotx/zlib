@echo off
chcp 65001 >nul
echo ========================================================
echo   Z-Library 下载器 - Tauri Windows .EXE 一键构建脚本
echo ========================================================
where node >nul 2>nul || (echo [错误] 未检测到 Node.js，请先安装 Node.js 20/22+ & pause & exit /b 1)
where cargo >nul 2>nul || (echo [错误] 未检测到 Rust Cargo，请先安装 Rustup: https://rustup.rs/ & pause & exit /b 1)

if exist index.html (
  echo [1/3] 安装 npm 依赖...
  call npm install --legacy-peer-deps || (echo [错误] npm 依赖安装失败 & pause & exit /b 1)

  echo [2/3] 使用相对路径编译 Vite 前端生产资源 (dist/)...
  call npm run build || (echo [错误] 前端编译失败 & pause & exit /b 1)
) else if exist dist\index.html (
  echo [1-2/3] 检测到预编译 dist/ 静态包，跳过前端编译步骤...
) else (
  echo [错误] 未找到 index.html 或 dist\index.html，请确认完整解压打包套件！
  pause
  exit /b 1
)

echo [3/3] 编译 Tauri v1.5 原生 Windows .EXE 与 NSIS 安装包...
call npx --yes @tauri-apps/cli@1.5 build || (echo [错误] Tauri Rust 构建失败 & pause & exit /b 1)

echo ========================================================
echo [打包完成] 请在以下路径获取成品:
echo   便携版 EXE: src-tauri\target\release\zlib-downloader.exe
echo   安装版 EXE: src-tauri\target\release\bundle\nsis\
echo ========================================================
pause
