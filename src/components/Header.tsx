import React from 'react';
import { BookOpen, Download, Globe, HardDrive, Terminal, Settings, Sun, Moon, Search, User, Users } from 'lucide-react';
import { UserAccount } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  activeDownloadsCount: number;
  activeAccount: UserAccount | null;
  accountsCount: number;
  onOpenAccountManager: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  activeDownloadsCount,
  activeAccount,
  accountsCount,
  onOpenAccountManager
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 select-none shadow-sm transition-colors sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      {/* Fake OS Window Title Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2 truncate">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
          </div>
          <span className="ml-1 font-mono text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 truncate">
            Z-Library 桌面下载器 v1.2.0 (Tauri 多端构建版)
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium border border-emerald-200 dark:border-emerald-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            多端原生就绪 (.exe / .apk)
          </span>
        </div>
      </div>

      {/* Main Navigation Bar (3-zone contract compliant) */}
      <div className="flex items-center justify-between gap-2 sm:gap-8 px-3 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-slate-900">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 cursor-pointer" onClick={() => setActiveTab('search')}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30 text-white shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Zlib 下载器</span>
              <span className="hidden xs:inline-block sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Tauri
              </span>
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400">高速多镜像文献下载引擎</p>
          </div>
        </div>

        {/* Zone 2: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'search'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Search size={16} />
            <span>书籍搜索</span>
          </button>

          <button
            onClick={() => setActiveTab('downloads')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all relative ${
              activeTab === 'downloads'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Download size={16} />
            <span>下载队列</span>
            {activeDownloadsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center animate-bounce shadow">
                {activeDownloadsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'library'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HardDrive size={16} />
            <span>本地书库</span>
          </button>

          <button
            onClick={() => setActiveTab('mirrors')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'mirrors'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Globe size={16} />
            <span>镜像节点</span>
          </button>

          <button
            onClick={() => setActiveTab('tauri')}
            title="Windows .EXE 与 Android .APK 多端打包"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeTab === 'tauri'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/30 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Terminal size={16} />
            <span>多端打包</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions (Multi-Account Button, Theme, Settings) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={onOpenAccountManager}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm ${
              activeAccount
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
            }`}
            title="点击打开 Z-Library 官方多账号管理中心"
          >
            {activeAccount ? (
              <>
                <div className="relative">
                  <User size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                </div>
                <span className="max-w-[75px] sm:max-w-[120px] truncate font-medium">
                  {activeAccount.name}
                </span>
              </>
            ) : (
              <>
                <Users size={15} />
                <span className="hidden sm:inline">官方账号登录</span>
                <span className="sm:hidden">登录</span>
              </>
            )}
            {accountsCount > 1 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                {accountsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="切换明暗主题"
          >
            {darkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`p-2 sm:p-2.5 rounded-xl transition-colors ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="设置"
          >
            <Settings size={17} />
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Navigation Strip (Ensures perfect multi-device responsiveness) */}
      <div className="lg:hidden flex items-center gap-1 px-3 py-2 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto text-xs font-medium scrollbar-none bg-slate-50/70 dark:bg-slate-950/50">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'search'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Search size={14} />
          <span>书籍搜索</span>
        </button>

        <button
          onClick={() => setActiveTab('downloads')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors relative ${
            activeTab === 'downloads'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Download size={14} />
          <span>下载队列</span>
          {activeDownloadsCount > 0 && (
            <span className="w-4 h-4 bg-amber-500 text-slate-950 font-bold text-[9px] rounded-full flex items-center justify-center">
              {activeDownloadsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'library'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HardDrive size={14} />
          <span>本地书库</span>
        </button>

        <button
          onClick={() => setActiveTab('mirrors')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'mirrors'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Globe size={14} />
          <span>镜像节点</span>
        </button>

        <button
          onClick={() => setActiveTab('tauri')}
          title="Windows .EXE 与 Android .APK 多端打包"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'tauri'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Terminal size={14} />
          <span>多端打包</span>
        </button>
      </div>
    </header>
  );
};
