import React, { useState } from 'react';
import {
  Settings, FolderOpen, CheckCircle2, Sparkles, Key, Globe, Cpu, Eye, EyeOff,
  Loader2, ShieldCheck, AlertCircle, Plus, Pencil, Trash2, Check, X, Zap
} from 'lucide-react';
import { AIConfig, AIProvider } from '../types';
import { testAIConfigClient } from '../utils/standaloneApi';

interface SettingsTabProps {
  aiProfiles: AIConfig[];
  activeAIProfileId: string;
  onAddAIProfile: (profile: AIConfig, setAsActive?: boolean) => void;
  onUpdateAIProfile: (profile: AIConfig) => void;
  onDeleteAIProfile: (id: string) => void;
  onSelectAIProfile: (id: string) => void;
  onShowToast?: (msg: string) => void;
}

const PROVIDER_PRESETS: Record<
  AIProvider,
  { label: string; desc: string; defaultBaseUrl: string; defaultModel: string; models: string[] }
> = {
  google: {
    label: 'Google Gemini',
    desc: '官方原生大模型，支持内置代理及自定义 Gemini 密钥/中转',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-4-hydrogen',
    models: ['gemini-4-hydrogen', 'gemini-2.5-flash', 'gemini-2.5-pro']
  },
  openai: {
    label: 'OpenAI 官方',
    desc: '支持 GPT-4o / GPT-4o-mini / GPT-4.1-mini 等多个 Key 轮换',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini']
  },
  deepseek: {
    label: 'DeepSeek (深度求索)',
    desc: '高性价比国产顶尖大模型，支持 V3 与 R1 多 Key 分流配置',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  'openai-compatible': {
    label: 'OpenAI 兼容接口',
    desc: '自由添加多个第三方接口（硅基流动、OneAPI、Kimi、通义、Ollama 等）',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    models: ['Qwen/Qwen2.5-72B-Instruct', 'moonshot-v1-8k', 'llama3.1:8b']
  }
};

function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return '未填写（如为 Google 默认代理可留空）';
  if (trimmed.length <= 10) return '••••••••';
  return `${trimmed.slice(0, 6)}••••••${trimmed.slice(-4)}`;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  aiProfiles,
  activeAIProfileId,
  onAddAIProfile,
  onUpdateAIProfile,
  onDeleteAIProfile,
  onSelectAIProfile,
  onShowToast
}) => {
  const [downloadDir, setDownloadDir] = useState('C:\\Users\\Public\\ZLibraryDownloads');
  const [concurrency, setConcurrency] = useState('3');
  const [savedToken, setSavedToken] = useState('');
  const [proxy, setProxy] = useState('DIRECT');
  const [saved, setSaved] = useState(false);

  const activeProfile = aiProfiles.find(p => p.id === activeAIProfileId) || aiProfiles[0];
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(activeProfile?.provider || 'google');

  // Inline Add / Edit API Form State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [setAsActiveOnAdd, setSetAsActiveOnAdd] = useState(true);

  // Testing states
  const [testingProfileId, setTestingProfileId] = useState<string | null>(null);
  const [testingEditor, setTestingEditor] = useState(false);
  const [editorTestResult, setEditorTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [cardTestResults, setCardTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const providerProfiles = aiProfiles.filter(p => p.provider === selectedProvider);
  const preset = PROVIDER_PRESETS[selectedProvider];

  const handleSelectProviderTab = (nextProvider: AIProvider) => {
    setSelectedProvider(nextProvider);
    setIsEditorOpen(false);
    setEditingProfileId(null);
    setEditorTestResult(null);
  };

  const openAddForm = () => {
    const count = providerProfiles.length + 1;
    setEditingProfileId(null);
    setFormName(`${preset.label} 配置 #${count}`);
    setFormBaseUrl(preset.defaultBaseUrl);
    setFormModel(preset.defaultModel);
    setFormApiKey('');
    setShowKey(false);
    setSetAsActiveOnAdd(true);
    setEditorTestResult(null);
    setIsEditorOpen(true);
  };

  const openEditForm = (profile: AIConfig) => {
    setSelectedProvider(profile.provider);
    setEditingProfileId(profile.id);
    setFormName(profile.name);
    setFormBaseUrl(profile.baseUrl);
    setFormModel(profile.model);
    setFormApiKey(profile.apiKey);
    setShowKey(false);
    setEditorTestResult(null);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingProfileId(null);
    setEditorTestResult(null);
  };

  const handleSaveEditor = () => {
    const cleanName = formName.trim() || `${preset.label} API`;
    const cleanBaseUrl = formBaseUrl.trim() || preset.defaultBaseUrl;
    const cleanModel = formModel.trim() || preset.defaultModel;
    const cleanKey = formApiKey.trim();

    if (editingProfileId) {
      const existing = aiProfiles.find(p => p.id === editingProfileId);
      const updated: AIConfig = {
        id: editingProfileId,
        name: cleanName,
        provider: selectedProvider,
        baseUrl: cleanBaseUrl,
        model: cleanModel,
        apiKey: cleanKey,
        createdAt: existing?.createdAt || new Date().toLocaleDateString('zh-CN')
      };
      onUpdateAIProfile(updated);
      onShowToast && onShowToast(`已修改 API 配置：「${cleanName}」(${cleanModel})`);
    } else {
      const newProfile: AIConfig = {
        id: `ai-${selectedProvider}-${Date.now()}`,
        name: cleanName,
        provider: selectedProvider,
        baseUrl: cleanBaseUrl,
        model: cleanModel,
        apiKey: cleanKey,
        createdAt: new Date().toLocaleDateString('zh-CN')
      };
      onAddAIProfile(newProfile, setAsActiveOnAdd);
      onShowToast && onShowToast(`已新增「${cleanName}」${setAsActiveOnAdd ? '并设为当前启用' : ''}`);
    }
    closeEditor();
  };

  const handleTestEditorAI = async () => {
    setTestingEditor(true);
    setEditorTestResult(null);
    try {
      const data = await testAIConfigClient({
        provider: selectedProvider,
        baseUrl: formBaseUrl.trim() || preset.defaultBaseUrl,
        model: formModel.trim() || preset.defaultModel,
        apiKey: formApiKey.trim()
      });
      if (data.success) {
        setEditorTestResult({ ok: true, msg: data.message || '连通性测试成功！' });
      } else {
        setEditorTestResult({ ok: false, msg: data.error || '连通性测试失败' });
      }
    } catch (err) {
      setEditorTestResult({ ok: false, msg: '网络错误：无法连接到 AI 接口' });
    } finally {
      setTestingEditor(false);
    }
  };

  const handleTestSavedProfile = async (profile: AIConfig) => {
    setTestingProfileId(profile.id);
    try {
      const data = await testAIConfigClient(profile);
      setCardTestResults(prev => ({
        ...prev,
        [profile.id]: data.success
          ? { ok: true, msg: data.message || '连通性正常！' }
          : { ok: false, msg: data.error || '测试失败' }
      }));
      if (onShowToast) {
        onShowToast(data.success ? `「${profile.name}」连通性正常！` : `「${profile.name}」测试失败：${data.error}`);
      }
    } catch (err) {
      setCardTestResults(prev => ({
        ...prev,
        [profile.id]: { ok: false, msg: '网络异常' }
      }));
    } finally {
      setTestingProfileId(null);
    }
  };

  const handleSaveGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    if (onShowToast) {
      onShowToast(`全局偏好已保存！当前启用 AI：${activeProfile?.name || '默认引擎'}`);
    }
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSaveGeneralSettings} className="space-y-6">
        {/* Card 1: AI 导读大模型与同模型多 API 管理中心 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="text-amber-500" size={22} />
                <span>AI 导读大模型多 API 管理中心</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                同一个模型厂商下可保存多个不同的 API 配置，支持随时新增、编辑修改、测试连通性、删除与一键切换启用。
              </p>
            </div>
            {activeProfile && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>当前生效：{activeProfile.name}</span>
                <span className="font-mono text-[11px] opacity-80">({activeProfile.model})</span>
              </div>
            )}
          </div>

          {/* 4 Provider Selection Buttons (Matches focused selector div:nth-of-type(2) > button:nth-of-type(1..4)) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(PROVIDER_PRESETS) as AIProvider[]).map((key) => {
              const item = PROVIDER_PRESETS[key];
              const isSelected = selectedProvider === key;
              const countForProvider = aiProfiles.filter(p => p.provider === key).length;
              const hasActiveInside = activeProfile?.provider === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectProviderTab(key)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/15 shadow-sm'
                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center justify-between gap-1.5 w-full">
                    <span className="truncate">{item.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                        hasActiveInside
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold'
                          : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {countForProvider} 个 API
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Selected Provider's Saved APIs List & Controls */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>「{preset.label}」下的已配置 API 列表</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-[11px]">
                  共 {providerProfiles.length} 项
                </span>
              </div>

              <button
                type="button"
                onClick={openAddForm}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
              >
                <Plus size={14} />
                <span>新增「{preset.label}」API</span>
              </button>
            </div>

            {providerProfiles.length === 0 ? (
              <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center space-y-2 bg-slate-50/40 dark:bg-slate-800/20">
                <p className="text-xs sm:text-sm text-slate-500">
                  当前「{preset.label}」下还没有保存任何 API 配置。
                </p>
                <button
                  type="button"
                  onClick={openAddForm}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold transition-colors"
                >
                  <Plus size={14} />
                  <span>立即添加第一个 {preset.label} API</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {providerProfiles.map((profile) => {
                  const isActive = profile.id === activeAIProfileId;
                  const isTesting = testingProfileId === profile.id;
                  const testStatus = cardTestResults[profile.id];

                  return (
                    <div
                      key={profile.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/60 shadow-sm'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {profile.name}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                              <Check size={11} /> 当前使用中
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-mono font-semibold border border-indigo-200/80 dark:border-indigo-800">
                            {profile.model}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span className="truncate max-w-[260px]" title={profile.baseUrl}>
                            URL: {profile.baseUrl}
                          </span>
                          <span>Key: {maskApiKey(profile.apiKey)}</span>
                          {profile.createdAt && <span className="text-slate-400">更新于 {profile.createdAt}</span>}
                        </div>

                        {testStatus && (
                          <div className={`text-[11px] font-medium flex items-center gap-1 pt-0.5 ${testStatus.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {testStatus.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            <span>{testStatus.msg}</span>
                          </div>
                        )}
                      </div>

                      {/* CRUD Action Buttons per API item */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectAIProfile(profile.id);
                              onShowToast && onShowToast(`已切换 AI 导读引擎至：「${profile.name}」`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <Zap size={12} />
                            <span>启用</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleTestSavedProfile(profile)}
                          disabled={isTesting}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="测试此 API 连通性"
                        >
                          {isTesting ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={13} className="text-indigo-500" />}
                          <span>测试</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditForm(profile)}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center gap-1"
                          title="编辑修改此 API 配置"
                        >
                          <Pencil size={12} />
                          <span>编辑</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onDeleteAIProfile(profile.id);
                            if (editingProfileId === profile.id) closeEditor();
                            onShowToast && onShowToast(`已删除 API 配置：「${profile.name}」`);
                          }}
                          disabled={aiProfiles.length <= 1}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900 text-slate-500 text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={aiProfiles.length <= 1 ? '至少保留 1 个 API 配置' : '删除此 API'}
                        >
                          <Trash2 size={12} />
                          <span>删除</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inline Add / Edit API Panel */}
          {isEditorOpen && (
            <div className="border-2 border-indigo-500/40 dark:border-indigo-500/30 bg-indigo-50/30 dark:bg-slate-800/60 rounded-2xl p-5 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-indigo-200/60 dark:border-slate-700 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {editingProfileId ? <Pencil size={15} className="text-indigo-600" /> : <Plus size={16} className="text-indigo-600" />}
                  <span>
                    {editingProfileId
                      ? `编辑修改「${preset.label}」API 配置`
                      : `新增「${preset.label}」API 配置`}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="关闭编辑"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Alias + Model ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    配置名称 / 别名（方便区分多个 API）
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={`例如：${preset.label} 个人 Key`}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Cpu size={13} />
                    <span>模型名称 (Model ID)</span>
                  </label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder={preset.defaultModel}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400">快捷填入:</span>
                    {preset.models.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormModel(m)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          formModel === m
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Base URL + API Key */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Globe size={13} />
                    <span>API 接口地址 (Base URL)</span>
                  </label>
                  <input
                    type="text"
                    value={formBaseUrl}
                    onChange={(e) => setFormBaseUrl(e.target.value)}
                    placeholder={preset.defaultBaseUrl}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    {selectedProvider === 'google'
                      ? '默认官方地址使用 @google/genai SDK，若填第三方反代地址也可灵活切换。'
                      : '系统会自动补全 /chat/completions 后缀（如 https://api.deepseek.com/v1）。'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Key size={13} />
                    <span>
                      API Key {selectedProvider === 'google' ? '（留空即走内置服务端代理）' : '（必填）'}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={formApiKey}
                      onChange={(e) => setFormApiKey(e.target.value)}
                      placeholder={
                        selectedProvider === 'google'
                          ? '可留空使用默认服务端密钥，或填入 AIzaSy...'
                          : `输入您的 ${preset.label} API Key（sk-...）`
                      }
                      className="w-full pl-3.5 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title={showKey ? '隐藏密钥' : '显示密钥'}
                    >
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {editorTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                    editorTestResult.ok
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                  }`}
                >
                  {editorTestResult.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  <span>{editorTestResult.msg}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-200/50 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleTestEditorAI}
                    disabled={testingEditor}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testingEditor ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                    <span>{testingEditor ? '正在测试...' : '测试 API 连通性'}</span>
                  </button>

                  {!editingProfileId && (
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={setAsActiveOnAdd}
                        onChange={(e) => setSetAsActiveOnAdd(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>新增后立即设为启用</span>
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditor}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>{editingProfileId ? '保存修改' : '确认新增 API'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: 桌面下载器偏好设置 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Settings className="text-indigo-600" size={22} />
              <span>桌面与移动端下载器偏好设置</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              配置本地存储路径、并发下载线程数、网络代理以及会话凭证。
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              默认下载保存目录
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={downloadDir}
                onChange={(e) => setDownloadDir(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => onShowToast && onShowToast(`当前默认存储目录: ${downloadDir}`)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shrink-0"
              >
                <FolderOpen size={16} />
                <span>浏览</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                并发下载任务数 (1 - 5)
              </label>
              <select
                value={concurrency}
                onChange={(e) => setConcurrency(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="1">1 (单线程)</option>
                <option value="2">2 个并发文件</option>
                <option value="3">3 个并发文件 (推荐)</option>
                <option value="5">5 个高速多线程</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                网络代理路由
              </label>
              <select
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="DIRECT">DIRECT (不使用代理)</option>
                <option value="SOCKS5">SOCKS5 代理 (127.0.0.1:1080)</option>
                <option value="HTTP">HTTP 代理 (127.0.0.1:8080)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              备用全局 Remind-Me 会话 Cookie (可选)
            </label>
            <input
              type="password"
              value={savedToken}
              onChange={(e) => setSavedToken(e.target.value)}
              placeholder="在此粘贴您的 remind-me 账户凭证..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {saved ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 size={16} /> 偏好设置已保存
              </span>
            ) : (
              <span className="text-xs text-slate-400">所有多 API 配置自动持久化保存在本地浏览器中。</span>
            )}

            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all ml-auto"
            >
              保存基础偏好设置
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
