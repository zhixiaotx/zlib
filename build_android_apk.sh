#!/usr/bin/env bash
set -e
echo ">>> [1/4] 安装依赖并构建前端相对路径静态包..."
command -v node >/dev/null 2>&1 || { echo "[错误] 请先安装 Node.js 20/22+"; exit 1; }
command -v java >/dev/null 2>&1 || { echo "[错误] 请先安装 JDK 17"; exit 1; }

npm install --legacy-peer-deps
npm run build

if [ ! -d "android" ]; then
  echo ">>> [2/4] 初始化 Capacitor v6 Android 原生工程..."
  npm install --legacy-peer-deps @capacitor/core@^6.2.0 @capacitor/cli@^6.2.0 @capacitor/android@^6.2.0
  npx cap add android
else
  echo ">>> [2/4] 已检测到 android/ 目录，跳过初始化..."
fi

echo ">>> [3/4] 同步资源至 Android 工程..."
npx cap sync android

echo ">>> [4/4] 编译生成 Android APK..."
cd android
chmod +x ./gradlew
./gradlew assembleDebug
cd ..

echo ">>> 打包完成! APK 路径: android/app/build/outputs/apk/debug/app-debug.apk"

