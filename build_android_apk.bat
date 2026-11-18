@echo off
chcp 65001 >nul
echo ====================================================
echo   Z-Library 下载器 Android APK 一键打包脚本 (Windows)
echo ====================================================
where node >nul 2>nul || (echo [错误] 未检测到 Node.js 20/22+ & pause & exit /b 1)
where java >nul 2>nul || (echo [错误] 未检测到 JDK 17，请先安装 Temurin/Adoptium JDK 17 & pause & exit /b 1)

echo [1/4] 安装项目依赖并构建前端相对路径产物...
call npm install --legacy-peer-deps || (pause & exit /b 1)
call npm run build || (pause & exit /b 1)

if not exist android (
  echo [2/4] 初始化 Capacitor v6 Android 原生工程...
  call npm install --legacy-peer-deps @capacitor/core@^6.2.0 @capacitor/cli@^6.2.0 @capacitor/android@^6.2.0 || (pause & exit /b 1)
  call npx cap add android || (pause & exit /b 1)
) else (
  echo [2/4] 检测到已有 android 工程，跳过初始化...
)

echo [3/4] 同步 dist/ 至 Android WebView 资源目录...
call npx cap sync android || (pause & exit /b 1)

echo [4/4] 调用 Gradle 编译 Android APK...
cd android
call gradlew.bat assembleDebug || (cd .. & pause & exit /b 1)
cd ..
echo.
echo [打包成功] APK 输出路径: android\app\build\outputs\apk\debug\app-debug.apk
pause

