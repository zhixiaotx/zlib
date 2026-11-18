import React, { useState, useEffect } from 'react';
import { Terminal, Download, Copy, Check, FileCode, Monitor, Smartphone, Cloud, Sparkles } from 'lucide-react';
import { getPackagerConfigFilesClient } from '../utils/standaloneApi';

export const TauriPackagerModal: React.FC = () => {
  const [configFiles, setConfigFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState('capacitor.config.json');
  const [targetPlatform, setTargetPlatform] = useState<'android' | 'windows'>('android');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  useEffect(() => {
    getPackagerConfigFilesClient()
      .then(files => {
        setConfigFiles(files);
        if (files['capacitor.config.json']) {
          setActiveFile('capacitor.config.json');
        } else {
          const firstKey = Object.keys(files)[0];
          if (firstKey) setActiveFile(firstKey);
        }
      })
      .catch(err => console.error('Failed to load packaging files', err))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadZipTarget = async (target: 'android' | 'windows', fallbackName: string) => {
    setDownloadNotice(null);
    try {
      const res = await fetch(`/api/package/download/${target}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/zip')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fallbackName;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // fall through to standalone notice
    }
    handleDownloadBundle();
    setDownloadNotice('当前运行在独立静态/桌面客户端环境，已为您导出完整 JSON 配置清单；完整 .zip 工程套件请在源码仓库运行打包脚本或通过 GitHub Actions 获取。');
    setTimeout(() => setDownloadNotice(null), 5000);
  };

  const handlePlatformChange = (platform: 'android' | 'windows') => {
    setTargetPlatform(platform);
    if (platform === 'android' && configFiles['capacitor.config.json']) {
      setActiveFile('capacitor.config.json');
    } else if (platform === 'windows' && configFiles['src-tauri/tauri.conf.json']) {
      setActiveFile('src-tauri/tauri.conf.json');
    }
  };

  const handleCopy = () => {
    if (configFiles[activeFile]) {
      navigator.clipboard.writeText(configFiles[activeFile]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadBundle = () => {
    const blob = new Blob([JSON.stringify(configFiles, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zlib-downloader-multiplatform-bundle.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner with Platform Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono border border-indigo-500/30">
              <Terminal size={14} />
              <span>Tauri v1.5 + Capacitor v6 多端工程化打包</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono border border-emerald-500/30">
              <Cloud size={13} />
              <span>支持 GitHub Actions 云端自动构建 APK / EXE</span>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {targetPlatform === 'android'
              ? '一键打包 Android 移动端原生 .APK 安装包'
              : '打包生成 Windows .EXE 便携版与 NSIS 安装包'}
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            {targetPlatform === 'android'
              ? '通过 Capacitor 跨平台引擎将 Vite + React 前端封装为真正的 Android 原生 APK（支持 Android 7.0 ~ Android 15）。内置一键批处理/Shell 脚本与 GitHub Actions 云端构建工作流，免本地配置复杂 Android Studio 环境也能直接下载 APK！'
              : 'Tauri 将 Rust 高性能后端与 Web 前端（Vite + React）结合，为您打造极速、轻量（体积仅约 15MB）的 Windows 桌面应用程序。支持本地一键编译或云端自动发布。'}
          </p>

          {/* Platform Switcher & Direct Package Downloads */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="inline-flex p-1 rounded-xl bg-slate-950/70 border border-slate-700/80">
              <button
                type="button"
                onClick={() => handlePlatformChange('android')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  targetPlatform === 'android'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Smartphone size={15} />
                <span>Android 移动端 (.apk)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePlatformChange('windows')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  targetPlatform === 'windows'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Monitor size={15} />
                <span>Windows 桌面端 (.exe)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleDownloadZipTarget('android', 'zlib-downloader-android-apk-package.zip')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <Download size={15} />
              <span>下载安卓打包套件 (.zip)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadZipTarget('windows', 'zlib-downloader-windows-tauri-package.zip')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              <Download size={15} />
              <span>下载 Win 打包套件 (.zip)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadBundle}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-2"
            >
              <FileCode size={15} />
              <span>导出配置清单 (.json)</span>
            </button>
          </div>
          {downloadNotice && (
            <div className="p-2.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-100 text-xs">
              {downloadNotice}
            </div>
          )}
          <p className="text-[11px] text-indigo-200/80 leading-relaxed">
            注：下载的压缩套件包已包含预编译的 <code className="font-mono text-white">dist/</code> 前端产物、全部平台工程配置与一键脚本；解压后在本地双击 <code className="font-mono text-white">build_tauri.bat</code> / <code className="font-mono text-white">build_android_apk.bat</code>，或推送至 GitHub 点击 Actions 的 <code className="font-mono text-white">build-release.yml</code> 即可在云端直接生成最终 <code className="font-mono text-white">.exe</code> 与 <code className="font-mono text-white">.apk</code> 文件。
          </p>
        </div>
      </div>

      {/* Step-by-Step Build Guide */}
      {targetPlatform === 'android' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center justify-center">
                  01
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  小白推荐：云端构建
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">GitHub Actions 免环境自动出包</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                将代码推送到 GitHub 仓库后，在仓库 <strong>Actions</strong> 页面手动触发 <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-emerald-600 font-mono">Build Android APK &amp; Windows EXE</code> 工作流（或打上 <code className="font-mono">v*</code> 标签），约 4 分钟即可直接下载现成的 <code className="font-mono">.apk</code> 安装包！
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-mono font-bold flex items-center justify-center">
                02
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">本地准备 JDK 17 与 Android SDK</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                若需在自己电脑打包，请安装 <strong>Node.js (&gt;=18)</strong>、<strong>JDK 17</strong> 与 <strong>Android Studio</strong>（包含 Android SDK Platform 34 &amp; Build-Tools），并配置 <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">ANDROID_HOME</code> 环境变量。
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-mono font-bold flex items-center justify-center">
                03
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">双击脚本一键编译 APK</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Windows 用户直接双击根目录下的 <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 font-mono">build_android_apk.bat</code>，Mac/Linux 用户执行 <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">bash build_android_apk.sh</code>。APK 将输出至 <code className="font-mono">android/app/build/outputs/apk/debug/</code>。
              </p>
            </div>
          </div>

          <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-300">
            <Sparkles size={16} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="leading-relaxed">
              <strong>为什么 APK 安装包能丝滑运行？</strong> 项目已在 <code className="font-mono font-bold">vite.config.ts</code> 中全局启用相对路径 <code className="font-mono font-bold">base: './'</code>，并在 <code className="font-mono font-bold">capacitor.config.json</code> 中配置了 <code className="font-mono">androidScheme: "https"</code> 与 <code className="font-mono">allowMixedContent: true</code>，确保在手机 WebView 容器内不会出现资源 404 白屏或 HTTPS 混合请求拦截。
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-mono font-bold flex items-center justify-center">
              01
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">安装 Rust 与 Node 环境</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              确保您的 Windows 开发环境中已安装 Node.js (&gt;= 18)、Rust (`rustc` &amp; `cargo`) 以及 Visual Studio C++ 生成工具。
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-mono font-bold flex items-center justify-center">
              02
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">执行 build_tauri.bat</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              双击项目根目录 <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 font-mono">build_tauri.bat</code>，或运行 <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">npx tauri build</code> 触发 Rust 原生打包。
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-mono font-bold flex items-center justify-center">
              03
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">获取 .EXE 便携版与安装包</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              编译后的便携单文件与 NSIS 安装程序将输出在 <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">src-tauri/target/release/bundle/</code>。同样支持通过 GitHub Actions 云端自动构建！
            </p>
          </div>
        </div>
      )}

      {/* Code Viewer for Multi-Platform Config Files */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <FileCode size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">多端打包核心配置文件与脚本查看器</span>
          </div>

          <div className="flex items-center gap-1.5 max-w-full overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {Object.keys(configFiles).map((filename) => (
              <button
                key={filename}
                onClick={() => setActiveFile(filename)}
                className={`px-2.5 py-1.5 text-xs font-mono rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeFile === filename
                    ? 'bg-indigo-600 text-white font-semibold shadow'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {filename}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-slate-950 text-slate-100 relative">
          <button
            onClick={handleCopy}
            className="absolute top-6 right-6 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 shadow z-10"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? '已复制!' : '复制代码'}</span>
          </button>

          <pre className="text-xs font-mono overflow-x-auto p-4 bg-slate-900 rounded-lg text-slate-300 leading-relaxed max-h-[420px]">
            {loading ? '正在加载多端配置文件...' : configFiles[activeFile] || '未找到该配置文件'}
          </pre>
        </div>
      </div>
    </div>
  );
};
