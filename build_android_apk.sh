#!/usr/bin/env bash
set -e
echo ">>> 1. 构建前端相对路径静态包..."
npm install --legacy-peer-deps
npm run build

if [ ! -d "android" ]; then
  echo ">>> 2. 初始化 Capacitor Android 原生工程..."
  npm install --legacy-peer-deps @capacitor/core@^6.2.0 @capacitor/cli@^6.2.0 @capacitor/android@^6.2.0
  npx cap add android
fi

echo ">>> 3. 同步资源至 Android 工程..."
npx cap sync android

echo ">>> 4. 编译生成 Android APK..."
cd android
chmod +x ./gradlew
./gradlew assembleDebug

echo ">>> 打包完成! APK 路径: android/app/build/outputs/apk/debug/app-debug.apk"
