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
import { Book, DownloadTask, UserAccount, Mirror, AIConfig } from './types';
import { searchZlibBooks } from './utils/standaloneApi';

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
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [downloadedBooks, setDownloadedBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem('zlib_local_library');
      if (saved) return JSON.parse(saved);
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

  // Mirrors state (Shared across MirrorsManager, LoginModal, and SearchSection)
  const [mirrors, setMirrors] = useState<Mirror[]>([
    { id: "m-1", url: "https://singlelogin.re", status: "online", latency: "142ms", active: true },
    { id: "m-2", url: "https://z-lib.is", status: "online", latency: "198ms", active: false },
    { id: "m-3", url: "https://z-lib.fm", status: "online", latency: "235ms", active: false },
    { id: "m-4", url: "https://1lib.sk", status: "unstable", latency: "650ms", active: false }
  ]);
  const activeMirror = mirrors.find(m => m.active) || mirrors[0];

  // Multi-Account Management State
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('zlib_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'acc-default-1',
        email: 'scholar.vip@z-lib.se',
        name: 'ScholarVIP',
        dailyDownloadsLimit: 999,
        downloadsRemaining: 968,
        isPremium: true,
        remindMeToken: '6d8f2a4e9b1c7d3e5f0a82b4c6e8',
        loginMethod: 'cookie',
        addedAt: '2026/11/17'
      }
    ];
  });

  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('zlib_active_account_id');
      if (saved) return saved;
    } catch (e) {}
    return 'acc-default-1';
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

  // Seed initial sample tasks and local library books on first visit so covers & pagination are immediately visible
  useEffect(() => {
    try {
      const alreadySeeded = localStorage.getItem('zlib_initial_seed_v1');
      if (alreadySeeded) return;
    } catch (e) {}

    searchZlibBooks({})
      .then(data => {
        if (data.success && Array.isArray(data.books) && data.books.length > 0) {
          const sampleBooks: Book[] = data.books.slice(0, 6);
          const sampleTasks: DownloadTask[] = data.books.slice(0, 5).map((b: Book, idx: number) => ({
            id: `seed-task-${b.id}`,
            bookId: b.id,
            title: b.title,
            author: b.author,
            extension: b.extension,
            filesize: b.filesize,
            coverUrl: b.coverUrl,
            progress: idx === 0 ? 68 : 100,
            speed: idx === 0 ? '已暂停' : '0 KB/s',
            eta: idx === 0 ? '剩余 4s' : '完成',
            status: idx === 0 ? 'paused' : 'completed',
            downloadedBytes: idx === 0 ? '5.7 MB' : b.filesize,
            mirrorUrl: 'https://singlelogin.re'
          }));

          setDownloadedBooks(prev => (prev.length === 0 ? sampleBooks : prev));
          setDownloadTasks(prev => (prev.length === 0 ? sampleTasks : prev));
          try {
            localStorage.setItem('zlib_initial_seed_v1', 'true');
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  // Sync dark mode class on html root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Simulate active download progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDownloadTasks(prev =>
        prev.map(task => {
          if (task.status !== 'downloading') return task;
          const nextProgress = task.progress + Math.floor(Math.random() * 8) + 2;
          if (nextProgress >= 100) {
            return { ...task, progress: 100, status: 'completed', speed: '0 KB/s', eta: '完成' };
          }
          const speeds = ['2.8 MB/s', '3.4 MB/s', '4.1 MB/s', '5.2 MB/s', '2.5 MB/s'];
          const etas = ['4s', '3s', '2s', '1s', '5s'];
          return {
            ...task,
            progress: nextProgress,
            speed: speeds[Math.floor(Math.random() * speeds.length)],
            eta: etas[Math.floor(Math.random() * etas.length)]
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleStartDownload = (book: Book) => {
    if (downloadTasks.some(t => t.bookId === book.id)) {
      setActiveTab('downloads');
      return;
    }

    const newTask: DownloadTask = {
      id: `task-${Date.now()}`,
      bookId: book.id,
      title: book.title,
      author: book.author,
      extension: book.extension,
      filesize: book.filesize,
      coverUrl: book.coverUrl,
      progress: 5,
      speed: '3.6 MB/s',
      eta: '5s',
      status: 'downloading',
      downloadedBytes: `1.8 MB`,
      mirrorUrl: activeMirror ? activeMirror.url : 'https://singlelogin.re'
    };

    setDownloadTasks(prev => [newTask, ...prev]);
    setActiveTab('downloads');

    setTimeout(() => {
      setDownloadedBooks(prev => {
        if (prev.some(b => b.id === book.id)) return prev;
        return [book, ...prev];
      });
    }, 4500);
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
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold shadow-xl border border-slate-700/50 animate-in fade-in slide-in-from-bottom-2">
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'search' && (
          <SearchSection
            onStartDownload={handleStartDownload}
            onOpenAISummary={(book) => setAiModalBook(book)}
            downloadedBookIds={downloadedBookIds}
            activeMirror={activeMirror}
            activeAccount={activeAccount}
            onNavigateToMirrors={() => setActiveTab('mirrors')}
            onOpenLogin={() => setShowLoginModal(true)}
          />
        )}

        {activeTab === 'downloads' && (
          <DownloadQueue
            tasks={downloadTasks}
            onPauseTask={handlePauseTask}
            onResumeTask={handleResumeTask}
            onCancelTask={handleCancelTask}
            onOpenFolder={() => showToast('已定位 Tauri 下载目录: C:\\Users\\Public\\ZLibraryDownloads')}
          />
        )}

        {activeTab === 'library' && (
          <LocalLibrary
            downloadedBooks={downloadedBooks}
            onRemoveBook={handleRemoveLibraryBook}
            onOpenFolder={() => showToast('已定位 Tauri 书库目录: C:\\Users\\Public\\ZLibraryDownloads')}
            onOpenAISummary={(book) => setAiModalBook(book)}
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
    </div>
  );
}
