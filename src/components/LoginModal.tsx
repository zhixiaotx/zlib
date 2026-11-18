import React, { useState } from 'react';
import { User, Lock, Key, CheckCircle2, X, Shield, LogOut, Plus, Trash2, Check, HelpCircle, ChevronDown, ChevronUp, Copy, ExternalLink, ArrowRight, Globe, Info } from 'lucide-react';
import { UserAccount, Mirror } from '../types';

interface LoginModalProps {
  accounts: UserAccount[];
  activeAccountId: string | null;
  activeMirror?: Mirror;
  onAddAccount: (account: UserAccount) => void;
  onSwitchAccount: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onLogoutCurrent: () => void;
  onClose: () => void;
  onNavigateToMirrors?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  accounts,
  activeAccountId,
  activeMirror,
  onAddAccount,
  onSwitchAccount,
  onDeleteAccount,
  onLogoutCurrent,
  onClose,
  onNavigateToMirrors
}) => {
  // If there are accounts, default to 'list' view; if empty, default to 'add'
  const [view, setView] = useState<'list' | 'add'>(accounts.length > 0 ? 'list' : 'add');

  // Add account form states
  const [loginMode, setLoginMode] = useState<'password' | 'cookie'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cookieToken, setCookieToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWhyBrowser, setShowWhyBrowser] = useState(true);
  const [copiedStep, setCopiedStep] = useState(false);
  const [selectedMirrorUrl, setSelectedMirrorUrl] = useState(activeMirror ? activeMirror.url : 'https://singlelogin.re');

  const activeAccount = accounts.find(a => a.id === activeAccountId) || null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/zlib/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginMode === 'password' ? email.trim() : '',
          password: loginMode === 'password' ? password : '',
          cookieToken: loginMode === 'cookie' ? cookieToken.trim() : ''
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        onAddAccount(data.user);
        setEmail('');
        setPassword('');
        setCookieToken('');
        setView('list');
      } else {
        setError(data.error || '登录验证失败，请检查账号密码或 Cookie');
      }
    } catch (err) {
      setError('网络连接错误，无法连接到验证服务器');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyGuide = () => {
    const guideText = `【如何获取 Z-Library remind-me Cookie】\n1. 在电脑浏览器（Chrome / Edge / Firefox）打开当前镜像站点（如 ${selectedMirrorUrl}）\n2. 登录账号后按键盘 F12 打开开发者工具，点击【Application】(应用程序) 或【Storage】(存储)\n3. 左侧展开【Cookies】，点击当前站点域名\n4. 在列表中找到 Name 为 "remind_me" 的条目，双击复制其 Value 值\n5. 将该值粘贴到下载器中即可免密登录并绕过 Cloudflare 验证！`;
    navigator.clipboard.writeText(guideText);
    setCopiedStep(true);
    setTimeout(() => setCopiedStep(false), 2000);
  };

  const formattedMirrorUrl = (activeMirror?.url || selectedMirrorUrl).startsWith('http')
    ? (activeMirror?.url || selectedMirrorUrl)
    : `https://${activeMirror?.url || selectedMirrorUrl}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Unified Fixed Modal Dimensions: w-full max-w-2xl h-[640px] max-h-[90vh] flex flex-col */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl h-[640px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header (Fixed at top) */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Z-Library 官方账号中心</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  已存 {accounts.length} 个账号
                </span>
              </h3>
              <p className="text-xs text-slate-500">统一模态窗口 · 支持多账号管理、免密登录与一键平滑切换</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher: CSS selector 1 (List button), CSS selector 2 (Add button), CSS selector 5 (Logout button) */}
        <div className="px-5 sm:px-6 pt-3.5 pb-2.5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold w-full sm:w-auto">
            <button
              onClick={() => { setView('list'); setError(''); }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all ${
                view === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              已存账号列表 ({accounts.length})
            </button>
            <button
              onClick={() => { setView('add'); setError(''); }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                view === 'add'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Plus size={14} />
              <span>添加新账号</span>
            </button>
          </div>

          {activeAccount && (
            <button
              onClick={onLogoutCurrent}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              title="退出当前选中的活跃账号"
            >
              <LogOut size={14} />
              <span>退出当前账号</span>
            </button>
          )}
        </div>

        {/* Modal Body (Scrollable inside fixed 640px height container) */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">

          {/* Active Mirror Notice Banner (Links Mirror selection to Login) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-indigo-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300">
                当前关联镜像：<strong className="text-slate-900 dark:text-white font-mono">{selectedMirrorUrl}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={formattedMirrorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-medium transition-colors flex items-center gap-1"
                title="在电脑浏览器打开此站点进行登录并获取 Cookie"
              >
                <span>在浏览器打开</span>
                <ExternalLink size={12} />
              </a>
              {onNavigateToMirrors && (
                <button
                  type="button"
                  onClick={() => { onClose(); onNavigateToMirrors(); }}
                  className="px-2.5 py-1 rounded bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                >
                  更换镜像
                </button>
              )}
            </div>
          </div>

          {/* Explanation Callout: 为什么要在电脑浏览器中登录 Z-Library 镜像？ */}
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Info size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>为什么要在电脑浏览器中登录 Z-Library 镜像？</span>
              </span>
              <button
                type="button"
                onClick={() => setShowWhyBrowser(!showWhyBrowser)}
                className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline"
              >
                {showWhyBrowser ? '收起说明' : '展开说明'}
              </button>
            </div>
            {showWhyBrowser && (
              <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                <strong>核心原理：</strong>官方 Z-Library 镜像站普遍配置了 <strong>Cloudflare 5秒盾人机防御（Turnstile / Captcha）</strong>。如果直接在客户端发起网络请求容易遭遇 403 阻断。在电脑浏览器（Chrome / Edge / Firefox）中打开镜像并登录，能正常通过人机验证并下发核心会话令牌 <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono font-bold text-amber-950 dark:text-amber-200">remind_me</code>。把该值填入本软件即可 100% 绕过阻断，直接继承账号全部 VIP 高速配额！
              </p>
            )}
          </div>

          {/* VIEW: Accounts List */}
          {view === 'list' && (
            <div className="space-y-4">
              {accounts.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <User size={24} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">暂未登录任何 Z-Library 账号</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    登录或导入 Remind-Me Cookie 可以提升每日下载配额与高带宽线路。
                  </p>
                  <button
                    onClick={() => setView('add')}
                    className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm inline-flex items-center gap-1.5"
                  >
                    <Plus size={16} />
                    <span>立即添加第一个账号</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((acc) => {
                    const isActive = acc.id === activeAccountId;
                    return (
                      <div
                        key={acc.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/10'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {acc.name}
                              </span>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  当前活跃
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                VIP 999本
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {acc.loginMethod === 'cookie' ? 'Cookie 免密' : '密码授权'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              {acc.email}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                                <Check size={14} />
                                <span>使用中</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => onSwitchAccount(acc.id)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 transition-colors"
                              >
                                切换至此
                              </button>
                            )}

                            <button
                              onClick={() => onDeleteAccount(acc.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="删除此账号"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Account stats bar with visual download quota meter */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                            <div>今日剩余下载: <span className="font-bold text-slate-800 dark:text-slate-200">{acc.downloadsRemaining}</span> / {acc.dailyDownloadsLimit} 本</div>
                            <div className="text-[11px] text-slate-400">添加时间: {acc.addedAt}</div>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.round((acc.downloadsRemaining / acc.dailyDownloadsLimit) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW: Add Account Form */}
          {view === 'add' && (
            <div className="space-y-4">
              {/* Method Tabs: CSS selector 3 (Password mode button), CSS selector 4 (Cookie mode button) */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLoginMode('password')}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    loginMode === 'password'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  账号密码登录
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode('cookie')}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    loginMode === 'cookie'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Remind-Me Cookie 免密登录
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginMode === 'password' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Z-Library 邮箱账号
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <User size={16} />
                        </span>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your-email@z-lib.se"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        登录密码
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Lock size={16} />
                        </span>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Remind-Me Cookie 凭证值
                      </label>
                      <button
                        type="button"
                        onClick={handleCopyGuide}
                        className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        {copiedStep ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{copiedStep ? '已复制步骤' : '复制提取教程'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Key size={16} />
                      </span>
                      <input
                        type="text"
                        value={cookieToken}
                        onChange={(e) => setCookieToken(e.target.value)}
                        placeholder="例如：6d8f2a4e9b1c7d3e5f0a... (直接粘贴值即可)"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Collapsible Cookie Guide */}
                {loginMode === 'cookie' && (
                  <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                        <HelpCircle size={15} className="text-indigo-600 dark:text-indigo-400" />
                        <span>小白指南：如何 30 秒获取 remind-me Cookie？</span>
                      </span>
                    </div>

                    <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed font-sans">
                      <li>
                        在电脑浏览器中访问并登录 Z-Library（当前镜像：<span className="font-mono text-indigo-600 dark:text-indigo-400">{selectedMirrorUrl}</span>）。
                      </li>
                      <li>
                        登录成功后，按键盘 <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px]">F12</kbd> 键（或右键点击“检查”）。
                      </li>
                      <li>
                        在顶部切换至 <strong className="text-slate-800 dark:text-slate-200">Application</strong>（应用程序）标签页（Firefox 为 <strong className="text-slate-800 dark:text-slate-200">Storage</strong> 存储）。
                      </li>
                      <li>
                        在左侧栏展开 <strong className="text-slate-800 dark:text-slate-200">Cookies</strong>，点击当前登录的镜像域名。
                      </li>
                      <li>
                        在表格中找到名为 <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-300">remind_me</code> 的条目，双击复制它的 <strong className="text-slate-800 dark:text-slate-200">Value</strong> 字符串并粘贴在上方即可！
                      </li>
                    </ol>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? '正在验证并添加...' : '确认添加并登录'}
                  </button>

                  {accounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setView('list')}
                      className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors"
                    >
                      返回列表
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer (Fixed at bottom) */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Shield size={14} className="text-emerald-500" />
            <span>本地隔离安全存储，凭证绝不上报第三方服务器</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold transition-colors ml-auto mt-2 sm:mt-0"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
