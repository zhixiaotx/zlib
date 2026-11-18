@echo off
echo ====================================================
echo   Z-Library 下载器 Android APK 一键打包脚本 (Windows)
echo ====================================================
call npm install
call npm run build
if not exist android (
  echo 初始化 Capacitor Android 工程...
  call npm install @capacitor/core @capacitor/cli @capacitor/android
  call npx cap add android
)
call npx cap sync android
cd android
call gradlew.bat assembleDebug
echo.
echo [打包成功] APK 输出路径: android\app\build\outputs\apk\debug\app-debug.apk
pause
