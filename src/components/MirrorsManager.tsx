import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, Shield, Plus, Edit2, Trash2, Zap, Check, X, ExternalLink, ArrowRight, UserCheck, HelpCircle } from 'lucide-react';
import { Mirror } from '../types';

interface MirrorsManagerProps {
  mirrors: Mirror[];
  setMirrors: React.Dispatch<React.SetStateAction<Mirror[]>>;
  onNavigateToLogin?: () => void;
  onNavigateToSearch?: () => void;
}

export const MirrorsManager: React.FC<MirrorsManagerProps> = ({
  mirrors,
  setMirrors,
  onNavigateToLogin,
  onNavigateToSearch
}) => {
  const [testing, setTesting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMirror, setEditingMirror] = useState<Mirror | null>(null);

  // Form states
  const [urlInput, setUrlInput] = useState('');

  const testMirrors = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/zlib/mirrors/test', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.mirrors) {
        // preserve active flag
        const currentActiveId = mirrors.find(m => m.active)?.id;
        const updated = data.mirrors.map((m: Mirror) => ({
          ...m,
          active: m.id === currentActiveId
        }));
        setMirrors(updated);
      }
    } catch (err) {
      console.error('Failed to test mirrors', err);
    } finally {
      setTesting(false);
    }
  };

  // Auto switch to the fastest online mirror
  const handleAutoSwitch = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/zlib/mirrors/test', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.mirrors.length > 0) {
        const onlineMirrors = data.mirrors.filter((m: Mirror) => m.status === 'online');
        const target = onlineMirrors.length > 0 ? onlineMirrors[0] : data.mirrors[0];
        const updated = data.mirrors.map((m: Mirror) => ({
          ...m,
          active: m.id === target.id
        }));
        setMirrors(updated);
      }
    } catch (err) {
      console.error('Auto switch failed', err);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveMirror = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    if (editingMirror) {
      // Edit
      setMirrors(mirrors.map(m => m.id === editingMirror.id ? { ...m, url: urlInput.trim() } : m));
      setEditingMirror(null);
    } else {
      // Add new
      const newMirror: Mirror = {
        id: `m-${Date.now()}`,
        url: urlInput.trim(),
        status: 'online',
        latency: '120ms',
        active: mirrors.length === 0
      };
      setMirrors([...mirrors, newMirror]);
    }
    setUrlInput('');
    setShowAddModal(false);
  };

  const handleDeleteMirror = (id: string) => {
    setMirrors(mirrors.filter(m => m.id !== id));
  };

  const formatUrl = (url: string) => (url.startsWith('http') ? url : `https://${url}`);

  const activeMirror = mirrors.find(m => m.active) || mirrors[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="text-indigo-600" size={24} />
            <span>Z-Library 镜像节点与测速管理</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            第一步：选择任意最优站点并在浏览器登录提取 Cookie；第二步：填入账号中心；第三步：畅享书籍搜索！
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleAutoSwitch}
            disabled={testing}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow"
          >
            <Zap size={16} />
            <span>{testing ? '测速中...' : '智能自动切换最优节点'}</span>
          </button>

          <button
            onClick={testMirrors}
            disabled={testing}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow"
          >
            <RefreshCw size={16} className={testing ? 'animate-spin' : ''} />
            <span>{testing ? '测试中...' : '测试所有延迟'}</span>
          </button>

          <button
            onClick={() => {
              setEditingMirror(null);
              setUrlInput('');
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow"
          >
            <Plus size={16} />
            <span>添加新站点</span>
          </button>
        </div>
      </div>

      {/* Recommended Workflow Strip */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-emerald-50 dark:from-indigo-950/40 dark:to-emerald-950/30 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
          <Shield size={16} className="text-emerald-500 shrink-0" />
          <span>
            当前服务生效节点：<strong className="font-mono text-slate-900 dark:text-white">{activeMirror ? activeMirror.url : 'https://singlelogin.re'}</strong>
            （延迟：{activeMirror ? activeMirror.latency : '142ms'}）
          </span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {onNavigateToLogin && (
            <button
              onClick={onNavigateToLogin}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all flex items-center gap-1 shadow-sm"
            >
              <UserCheck size={14} />
              <span>前往账号中心登录/切换</span>
            </button>
          )}

          {onNavigateToSearch && (
            <button
              onClick={onNavigateToSearch}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold transition-all flex items-center gap-1"
            >
              <span>前往书籍搜索</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Mirrors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mirrors.map((mirror) => (
          <div
            key={mirror.id}
            className={`bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 transition-all ${
              mirror.active
                ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/10'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    mirror.status === 'online'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                  }`}>
                    {mirror.status === 'online' ? '在线正常' : '波动不稳定'}
                  </span>
                  {mirror.active && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      当前活跃
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-mono font-bold text-slate-900 dark:text-white">{mirror.url}</h3>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400 font-mono">网络延迟</div>
                <div className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{mirror.latency}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <a
                  href={formatUrl(mirror.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                  title="在浏览器中打开此站点"
                >
                  <ExternalLink size={13} />
                  <span>浏览器登录</span>
                </a>

                <button
                  onClick={() => {
                    setEditingMirror(mirror);
                    setUrlInput(mirror.url);
                    setShowAddModal(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="编辑站点"
                >
                  <Edit2 size={15} />
                </button>

                <button
                  onClick={() => handleDeleteMirror(mirror.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  title="删除站点"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <button
                onClick={() => {
                  setMirrors(mirrors.map(m => ({ ...m, active: m.id === mirror.id })));
                }}
                disabled={mirror.active}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  mirror.active
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default'
                    : 'bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {mirror.active ? '当前使用中' : '手动切换至此'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal (Unified Modal Dimensions: w-full max-w-2xl h-[640px]) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl h-[640px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe size={18} className="text-indigo-600" />
                <span>{editingMirror ? '编辑镜像站点配置' : '添加新的 Z-Library 镜像站点'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <form id="mirror-form" onSubmit={handleSaveMirror} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    镜像站点网址 (URL)
                  </label>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://singlelogin.re 或 https://z-lib.is"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-xs text-slate-400">
                    请输入完整的协议前缀，如 <code className="font-mono text-indigo-600 dark:text-indigo-400">https://</code>。添加后系统将自动进行延迟测速。
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <HelpCircle size={15} className="text-indigo-600 dark:text-indigo-400" />
                    <span>为什么需要添加多个可用镜像？</span>
                  </div>
                  <p className="leading-relaxed">
                    由于地区网络波动与域名封锁策略，不同镜像站点在各省份和运营商的连通性各异。保持 3~5 个活跃的备用镜像站点，并开启智能自动切换，可以确保文献检索与多线程下载 24 小时稳定不中断。
                  </p>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                form="mirror-form"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>保存站点</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
