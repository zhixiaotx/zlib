import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchSection } from './components/SearchSection';
import { DownloadQueue } from './components/DownloadQueue';
import { MirrorsManager } from './components/MirrorsManager';
import { LocalLibrary } from './components/LocalLibrary';
import { TauriPackagerModal } from './components/TauriPackagerModal';
import { SettingsTab } from './components/SettingsTab';
import { AISummaryModal } from './components/AISummaryModal';
import { LoginModal } from './components/LoginModal';
import { LocalBookModal, LocalBookReaderState } from './components/LocalBookModal';
import { Book, DownloadTask, UserAccount, Mirror, AIConfig } from './types';
import {
  deleteLocalBookBlob,
  downloadBookFromMirror,
  getLocalBookBlob,
  LocalFolderFileItem,
  openBookLocally,
  openDownloadFolder,
  openExternalUrl,
  saveLocalBookBlob,
  testMirrorsLatency
} from './utils/standaloneApi';

const DEFAULT_LIVE_MIRRORS: Mirror[] = [
  { id: 'm-1', url: 'https://z-lib.id', status: 'online', latency: '120ms', active: true },
  { id: 'm-2', url: 'https://z-lib.cc', status: 'online', latency: '160ms', active: false },
  { id: 'm-3', url: 'https://z-library.sk', status: 'unstable', latency: '待测速', active: false },
  { id: 'm-4', url: 'https://1lib.sk', status: 'unstable', latency: '待测速', active: false }
];

function isLegacySampleBook(b: Book): boolean {
  return !b.sourceMirror && !b.savedPath && !b.localFileName && /^zlib-(10[1-5]|[1-9]|1[0-6])$/.test(b.id);
}

const DEFAULT_AI_PROFILE: AIConfig = {
  id: 'ai-google-default',
  name: 'Google 官方服务端代理（默认免配）',
  provider: 'google',
  apiKey: '',
  baseUrl: 'https://generativelanguage.googleapis.com',
  model: 'gemini-4-hydrogen',
  createdAt: '2026/11/17'
};

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [darkMode, setDarkMode] = useState(false);
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>(() => {
    try {
      const saved = localStorage.getItem('zlib_download_tasks');
      if (saved) {
        const parsed: DownloadTask[] = JSON.parse(saved);
        return parsed.filter(t => !t.id.startsWith('seed-task-'));
      }
    } catch (e) {}
    return [];
  });
  const [downloadedBooks, setDownloadedBooks] = useState<Book[]>(() => {
    try {
      localStorage.removeItem('zlib_initial_seed_v1');
      const saved = localStorage.getItem('zlib_local_library');
      if (saved) {
        const parsed: Book[] = JSON.parse(saved);
        return parsed.filter(b => !isLegacySampleBook(b));
      }
    } catch (e) {}
    return [];
  });
  const [aiProfiles, setAiProfiles] = useState<AIConfig[]>(() => {
    try {
      const savedList = localStorage.getItem('zlib_ai_profiles');
      if (savedList) {
        const parsed = JSON.parse(savedList);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Migrate legacy single config if present
      const legacy = localStorage.getItem('zlib_ai_config');
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (parsedLegacy && parsedLegacy.provider) {
          return [
            {
              ...DEFAULT_AI_PROFILE,
              ...parsedLegacy,
              id: 'ai-migrated-1',
              name: parsedLegacy.name || `${parsedLegacy.provider.toUpperCase()} 自定义配置`
            }
          ];
        }
      }
    } catch (e) {}
    return [DEFAULT_AI_PROFILE];
  });
  const [activeAIProfileId, setActiveAIProfileId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('zlib_active_ai_profile_id');
      if (savedId) return savedId;
    } catch (e) {}
    return DEFAULT_AI_PROFILE.id;
  });
  const activeAIConfig = aiProfiles.find(p => p.id === activeAIProfileId) || aiProfiles[0] || DEFAULT_AI_PROFILE;
  const [aiModalBook, setAiModalBook] = useState<Book | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [localBookModal, setLocalBookModal] = useState<LocalBookReaderState | null>(null);

  // Mirrors state (Shared across MirrorsManager, LoginModal, and SearchSection)
  const [mirrors, setMirrors] = useState<Mirror[]>(() => {
    try {
      const saved = localStorage.getItem('zlib_mirrors_v2');
      if (saved) {
        const parsed: Mirror[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_LIVE_MIRRORS;
  });
  const activeMirror = mirrors.find(m => m.active) || mirrors[0];

  // Multi-Account Management State (starts empty; removes legacy fake ScholarVIP seed if present)
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('zlib_accounts');
      if (saved) {
        const parsed: UserAccount[] = JSON.parse(saved);
        return parsed.filter(a => a.id !== 'acc-default-1');
      }
    } catch (e) {}
    return [];
  });

  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('zlib_active_account_id');
      if (saved && saved !== 'acc-default-1') return saved;
    } catch (e) {}
    return null;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('zlib_accounts', JSON.stringify(accounts));
    } catch (e) {}
  }, [accounts]);

  useEffect(() => {
    try {
      if (activeAccountId) {
        localStorage.setItem('zlib_active_account_id', activeAccountId);
      } else {
        localStorage.removeItem('zlib_active_account_id');
      }
    } catch (e) {}
  }, [activeAccountId]);

  useEffect(() => {
    try {
      localStorage.setItem('zlib_download_tasks', JSON.stringify(downloadTasks));
    } catch (e) {}
  }, [downloadTasks]);

  useEffect(() => {
    try {
      localStorage.setItem('zlib_local_library', JSON.stringify(downloadedBooks));
    } catch (e) {}
  }, [downloadedBooks]);

  useEffect(() => {
    try {
      localStorage.setItem('zlib_ai_profiles', JSON.stringify(aiProfiles));
    } catch (e) {}
  }, [aiProfiles]);

  useEffect(() => {
    try {
      localStorage.setItem('zlib_active_ai_profile_id', activeAIProfileId);
    } catch (e) {}
  }, [activeAIProfileId]);

  const handleAddAIProfile = (profile: AIConfig, setAsActive = true) => {
    setAiProfiles(prev => [profile, ...prev]);
    if (setAsActive) {
      setActiveAIProfileId(profile.id);
    }
  };

  const handleUpdateAIProfile = (updated: AIConfig) => {
    setAiProfiles(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteAIProfile = (id: string) => {
    setAiProfiles(prev => {
      const next = prev.filter(p => p.id !== id);
      if (next.length === 0) return prev;
      if (activeAIProfileId === id) {
        setActiveAIProfileId(next[0].id);
      }
      return next;
    });
  };

  // Persist mirrors list
  useEffect(() => {
    try {
      localStorage.setItem('zlib_mirrors_v2', JSON.stringify(mirrors));
    } catch (e) {}
  }, [mirrors]);

  // Silently test mirror latency on startup so node statuses reflect real reachability
  useEffect(() => {
    let cancelled = false;
    testMirrorsLatency(mirrors)
      .then((tested) => {
        if (!cancelled && Array.isArray(tested) && tested.length > 0) {
          setMirrors(tested);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Clean up any legacy fake seeded data on upgrade
  useEffect(() => {
    setDownloadTasks(prev => prev.filter(t => !t.id.startsWith('seed-task-')));
    setDownloadedBooks(prev => prev.filter(b => !isLegacySampleBook(b)));
    try {
      localStorage.removeItem('zlib_initial_seed_v1');
    } catch (e) {}
  }, []);

  const handleQuickSwitchMirror = (targetUrl: string) => {
    const cleanTarget = targetUrl.trim().replace(/\/+$/, '');
    setMirrors(prev => {
      const exists = prev.some(m => m.url.replace(/\/+$/, '').toLowerCase() === cleanTarget.toLowerCase());
      if (exists) {
        return prev.map(m => ({
          ...m,
          active: m.url.replace(/\/+$/, '').toLowerCase() === cleanTarget.toLowerCase()
        }));
      }
      return [
        { id: `m-${Date.now()}`, url: cleanTarget, status: 'online', latency: '在线', active: true },
        ...prev.map(m => ({ ...m, active: false }))
      ];
    });
    showToast(`已切换镜像节点至 ${cleanTarget}`);
  };

  // Sync dark mode class on html root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleStartDownload = async (book: Book) => {
    const mirrorUrl = book.sourceMirror || (activeMirror ? activeMirror.url : 'https://z-lib.id');
    const taskId = `task-${Date.now()}`;

    const newTask: DownloadTask = {
      id: taskId,
      bookId: book.id,
      title: book.title,
      author: book.author,
      extension: book.extension,
      filesize: book.filesize,
      coverUrl: book.coverUrl,
      progress: 20,
      speed: '正在请求镜像节点...',
      eta: '连接中',
      status: 'downloading',
      downloadedBytes: '0 KB',
      mirrorUrl,
      detailUrl: book.detailUrl,
      downloadUrl: book.downloadUrl
    };

    setDownloadTasks(prev => [newTask, ...prev.filter(t => t.bookId !== book.id)]);
    setActiveTab('downloads');

    const res = await downloadBookFromMirror(book, mirrorUrl, activeAccount?.remindMeToken);

    if (res.success) {
      setDownloadTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? {
                ...t,
                progress: 100,
                status: 'completed',
                speed: '已完成',
                eta: '完成',
                downloadedBytes: book.filesize,
                savedPath: res.savedPath
              }
            : t
        )
      );
      const savedBook: Book = {
        ...book,
        savedPath: res.savedPath || book.savedPath,
        localFileName: res.localFileName || book.localFileName
      };
      setDownloadedBooks(prev => [savedBook, ...prev.filter(b => b.id !== book.id)]);
      if (activeAccountId) {
        setAccounts(prev =>
          prev.map(a =>
            a.id === activeAccountId
              ? { ...a, downloadsRemaining: Math.max(0, a.downloadsRemaining - 1) }
              : a
          )
        );
      }
      showToast(res.savedPath ? `已下载至：${res.savedPath}` : `已从镜像导出《${book.title}》`);
    } else {
      setDownloadTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? {
                ...t,
                progress: 0,
                status: 'failed',
                speed: '需浏览器确认',
                eta: '-',
                errorMsg: res.error
              }
            : t
        )
      );
      showToast(res.error || '正在为您打开镜像原页继续下载');
      if (res.requiresBrowser && res.targetUrl) {
        openExternalUrl(res.targetUrl);
      }
    }
  };

  const handleExportBook = async (book: Book) => {
    const res = await downloadBookFromMirror(book, book.sourceMirror || activeMirror?.url, activeAccount?.remindMeToken);
    if (res.success) {
      showToast(res.savedPath ? `已导出至：${res.savedPath}` : `已重新导出《${book.title}》`);
    } else {
      showToast(res.error || '正在打开镜像原书页进行导出');
      if (res.targetUrl) {
        openExternalUrl(res.targetUrl);
      }
    }
  };

  const handlePauseTask = (id: string) => {
    setDownloadTasks(prev =>
      prev.map(t => t.id === id ? { ...t, status: 'paused', speed: '已暂停' } : t)
    );
  };

  const handleResumeTask = (id: string) => {
    setDownloadTasks(prev =>
      prev.map(t => t.id === id ? { ...t, status: 'downloading', speed: '2.9 MB/s' } : t)
    );
  };

  const handleCancelTask = (id: string) => {
    setDownloadTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleRemoveLibraryBook = (id: string) => {
    setDownloadedBooks(prev => prev.filter(b => b.id !== id));
    deleteLocalBookBlob(id);
  };

  const handleOpenFolder = async () => {
    const res = await openDownloadFolder();
    if (res.mode === 'native') {
      showToast(res.path ? `已打开本地书库文件夹：${res.path}` : '已打开本地书库文件夹');
      return;
    }
    setLocalBookModal({
      mode: 'folder',
      folderPath: res.path,
      folderFiles: res.files
    });
  };

  const handleOpenLocalBook = async (book: Book) => {
    const res = await openBookLocally(book);
    if (res.mode === 'native') {
      showToast(`正在打开书籍：《${book.title}》`);
      return;
    }
    if (res.mode === 'reader' && res.blob) {
      setLocalBookModal({
        mode: 'reader',
        book,
        blob: res.blob,
        filename: res.filename,
        mimeType: res.mimeType
      });
      return;
    }
    setLocalBookModal({
      mode: 'reader',
      book,
      filename: res.filename,
      needsFile: true,
      message: res.error
    });
  };

  const handleAttachLocalFile = async (file: File, targetBook?: Book) => {
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
    const sizeText =
      file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    const bookId = targetBook?.id || `local-${Date.now()}`;
    await saveLocalBookBlob(bookId, file.name, file.type || 'application/octet-stream', file);

    const updatedBook: Book = targetBook
      ? {
          ...targetBook,
          localFileName: file.name,
          filesize: targetBook.filesize === '未知大小' ? sizeText : targetBook.filesize
        }
      : {
          id: bookId,
          title: file.name.replace(/\.[^.]+$/, ''),
          author: '本地导入书籍',
          year: String(new Date().getFullYear()),
          publisher: '本地文件',
          extension: ext,
          filesize: sizeText,
          language: '本地',
          rating: 0,
          coverUrl: '',
          description: '从本地磁盘导入的电子书文件',
          downloadsCount: 0,
          sourceMirror: 'local',
          localFileName: file.name
        };

    setDownloadedBooks(prev => [updatedBook, ...prev.filter(b => b.id !== updatedBook.id)]);
    setLocalBookModal({
      mode: 'reader',
      book: updatedBook,
      blob: file,
      filename: file.name,
      mimeType: file.type
    });
    showToast(`已打开本地书籍：《${updatedBook.title}》`);
  };

  const handleOpenBookByFileItem = async (item: LocalFolderFileItem) => {
    if (item.source === 'browser' && item.bookId) {
      const rec = await getLocalBookBlob(item.bookId);
      if (rec?.blob) {
        const matched = downloadedBooks.find(b => b.id === item.bookId);
        setLocalBookModal({
          mode: 'reader',
          book: matched,
          blob: rec.blob,
          filename: rec.filename,
          mimeType: rec.mimeType
        });
        return;
      }
    }
    if (item.source === 'disk') {
      try {
        const res = await fetch(`/api/system/local-file?name=${encodeURIComponent(item.name)}`);
        if (res.ok) {
          const blob = await res.blob();
          setLocalBookModal({
            mode: 'reader',
            blob,
            filename: item.name,
            mimeType: res.headers.get('content-type') || blob.type
          });
          return;
        }
      } catch {
        // ignore
      }
    }
    showToast('未能读取该文件内容');
  };

  // Multi-Account Action Handlers
  const handleAddAccount = (newAccount: UserAccount) => {
    setAccounts(prev => {
      const filtered = prev.filter(a => a.email !== newAccount.email && a.id !== newAccount.id);
      return [newAccount, ...filtered];
    });
    setActiveAccountId(newAccount.id);
  };

  const handleSwitchAccount = (id: string) => {
    setActiveAccountId(id);
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts(prev => {
      const nextAccounts = prev.filter(a => a.id !== id);
      if (activeAccountId === id) {
        setActiveAccountId(nextAccounts.length > 0 ? nextAccounts[0].id : null);
      }
      return nextAccounts;
    });
  };

  const handleLogoutCurrent = () => {
    setActiveAccountId(null);
  };

  const activeAccount = accounts.find(a => a.id === activeAccountId) || null;
  const activeDownloadsCount = downloadTasks.filter(t => t.status === 'downloading').length;
  const downloadedBookIds = downloadedBooks.map(b => b.id);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors">
      {toastMsg && (
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-50 px-4 py-3 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold shadow-xl border border-slate-700/50 animate-in fade-in slide-in-from-bottom-2 break-words">
          {toastMsg}
        </div>
      )}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        activeDownloadsCount={activeDownloadsCount}
        activeAccount={activeAccount}
        accountsCount={accounts.length}
        onOpenAccountManager={() => setShowLoginModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {activeTab === 'search' && (
          <SearchSection
            onStartDownload={handleStartDownload}
            onOpenAISummary={(book) => setAiModalBook(book)}
            downloadedBookIds={downloadedBookIds}
            activeMirror={activeMirror}
            activeAccount={activeAccount}
            onNavigateToMirrors={() => setActiveTab('mirrors')}
            onOpenLogin={() => setShowLoginModal(true)}
            onQuickSwitchMirror={handleQuickSwitchMirror}
          />
        )}

        {activeTab === 'downloads' && (
          <DownloadQueue
            tasks={downloadTasks}
            onPauseTask={handlePauseTask}
            onResumeTask={handleResumeTask}
            onCancelTask={handleCancelTask}
            onOpenFolder={handleOpenFolder}
          />
        )}

        {activeTab === 'library' && (
          <LocalLibrary
            downloadedBooks={downloadedBooks}
            onRemoveBook={handleRemoveLibraryBook}
            onOpenFolder={handleOpenFolder}
            onOpenBook={handleOpenLocalBook}
            onOpenAISummary={(book) => setAiModalBook(book)}
            onExportBook={handleExportBook}
          />
        )}

        {activeTab === 'mirrors' && (
          <MirrorsManager
            mirrors={mirrors}
            setMirrors={setMirrors}
            onNavigateToLogin={() => setShowLoginModal(true)}
            onNavigateToSearch={() => setActiveTab('search')}
          />
        )}

        {activeTab === 'tauri' && <TauriPackagerModal />}

        {activeTab === 'settings' && (
          <SettingsTab
            aiProfiles={aiProfiles}
            activeAIProfileId={activeAIConfig.id}
            onAddAIProfile={handleAddAIProfile}
            onUpdateAIProfile={handleUpdateAIProfile}
            onDeleteAIProfile={handleDeleteAIProfile}
            onSelectAIProfile={(id) => setActiveAIProfileId(id)}
            onShowToast={showToast}
          />
        )}
      </main>

      {aiModalBook && (
        <AISummaryModal
          book={aiModalBook}
          aiConfig={activeAIConfig}
          onClose={() => setAiModalBook(null)}
          onOpenSettings={() => {
            setAiModalBook(null);
            setActiveTab('settings');
          }}
        />
      )}

      {showLoginModal && (
        <LoginModal
          accounts={accounts}
          activeAccountId={activeAccountId}
          activeMirror={activeMirror}
          onAddAccount={handleAddAccount}
          onSwitchAccount={handleSwitchAccount}
          onDeleteAccount={handleDeleteAccount}
          onLogoutCurrent={handleLogoutCurrent}
          onClose={() => setShowLoginModal(false)}
          onNavigateToMirrors={() => { setShowLoginModal(false); setActiveTab('mirrors'); }}
        />
      )}
      {localBookModal && (
        <LocalBookModal
          state={localBookModal}
          onClose={() => setLocalBookModal(null)}
          onAttachLocalFile={handleAttachLocalFile}
          onOpenBookByFileItem={handleOpenBookByFileItem}
          onExportBook={handleExportBook}
        />
      )}
    </div>
  );
}
