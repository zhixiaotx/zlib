import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Settings } from 'lucide-react';
import { Book, AIConfig } from '../types';

interface AISummaryModalProps {
  book: Book | null;
  aiConfig: AIConfig;
  onClose: () => void;
  onOpenSettings?: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google Gemini',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  'openai-compatible': 'OpenAI 兼容接口'
};

export const AISummaryModal: React.FC<AISummaryModalProps> = ({
  book,
  aiConfig,
  onClose,
  onOpenSettings
}) => {
  const [summary, setSummary] = useState('');
  const [providerUsed, setProviderUsed] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!book) return;
    setLoading(true);
    setError('');
    setSummary('');

    fetch('/api/gemini/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: book.title,
        author: book.author,
        description: book.description,
        aiConfig
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSummary(data.summary);
          setProviderUsed(data.providerUsed || `${PROVIDER_LABELS[aiConfig.provider] || aiConfig.provider}`);
        } else {
          setError(data.error || '生成 AI 摘要失败');
        }
      })
      .catch(() => {
        setError('连接 AI 导读服务网络错误');
      })
      .finally(() => setLoading(false));
  }, [book, aiConfig]);

  if (!book) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl h-[640px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">AI 书籍摘要与精读指南</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {aiConfig.name ? `${aiConfig.name} · ` : ''}
                  {providerUsed || `${PROVIDER_LABELS[aiConfig.provider] || aiConfig.provider} · ${aiConfig.model}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate">{book.title} — {book.author}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-500 font-mono">
                正在通过 {PROVIDER_LABELS[aiConfig.provider] || 'AI'} ({aiConfig.model}) 生成本书的专业书评与精读报告...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-800 space-y-3">
              <p>{error}</p>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenSettings(); }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Settings size={13} />
                  <span>前往设置配置 API 引擎</span>
                </button>
              )}
            </div>
          ) : (
            <div className="whitespace-pre-wrap font-sans space-y-3">
              {summary}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
          {onOpenSettings ? (
            <button
              type="button"
              onClick={() => { onClose(); onOpenSettings(); }}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Settings size={14} />
              <span>切换 AI 模型/API</span>
            </button>
          ) : <span />}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
