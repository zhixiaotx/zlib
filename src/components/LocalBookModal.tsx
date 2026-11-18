import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Download, ExternalLink, FileText, FolderOpen, HardDrive, Upload, X } from 'lucide-react';
import { Book } from '../types';
import {
  getLocalBookBlob,
  LocalFolderFileItem,
  openExternalUrl
} from '../utils/standaloneApi';

export interface LocalBookReaderState {
  mode: 'reader' | 'folder';
  book?: Book;
  blob?: Blob;
  filename?: string;
  mimeType?: string;
  needsFile?: boolean;
  message?: string;
  folderPath?: string;
  folderFiles?: LocalFolderFileItem[];
}

interface LocalBookModalProps {
  state: LocalBookReaderState;
  onClose: () => void;
  onAttachLocalFile: (file: File, targetBook?: Book) => Promise<void>;
  onOpenBookByFileItem: (item: LocalFolderFileItem) => Promise<void>;
  onExportBook?: (book: Book) => void;
}

export const LocalBookModal: React.FC<LocalBookModalProps> = ({
  state,
  onClose,
  onAttachLocalFile,
  onOpenBookByFileItem,
  onExportBook
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fileName = state.filename || (state.book ? `${state.book.title}.${state.book.extension || 'pdf'}` : 'book');
  const lowerName = fileName.toLowerCase();
  const isPdf = (state.mimeType || '').includes('pdf') || lowerName.endsWith('.pdf');
  const isText =
    (state.mimeType || '').startsWith('text/') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.json');

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    setTextPreview(null);

    if (state.mode === 'reader' && state.blob) {
      url = URL.createObjectURL(state.blob);
      setObjectUrl(url);
      if (isText) {
        state.blob.text().then((txt) => {
          if (!cancelled) {
            setTextPreview(txt.slice(0, 300000));
          }
        }).catch(() => {});
      }
    } else {
      setObjectUrl(null);
    }

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [state.mode, state.blob, isText]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await onAttachLocalFile(file, state.book);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const handleDownloadCachedItem = async (item: LocalFolderFileItem) => {
    if (item.source === 'browser' && item.bookId) {
      const rec = await getLocalBookBlob(item.bookId);
      if (rec?.blob) {
        const u = URL.createObjectURL(rec.blob);
        const a = document.createElement('a');
        a.href = u;
        a.download = rec.filename || item.name;
        a.click();
        URL.revokeObjectURL(u);
      }
    } else if (item.source === 'disk') {
      const a = document.createElement('a');
      a.href = `/api/system/local-file?name=${encodeURIComponent(item.name)}`;
      a.download = item.name;
      a.click();
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl h-[640px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.epub,.mobi,.azw3,.fb2,.djvu,.txt,.md,.html,.htm"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              {state.mode === 'folder' ? <FolderOpen size={18} /> : <BookOpen size={18} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {state.mode === 'folder'
                  ? '本地书库文件夹与文件导入'
                  : state.book?.title || fileName}
              </h3>
              <p className="text-xs text-slate-500 font-mono truncate">
                {state.mode === 'folder'
                  ? `存储路径：${state.folderPath || 'ZLibraryDownloads'}`
                  : `${state.book?.author ? `${state.book.author} · ` : ''}${fileName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Upload size={14} />
              <span>{state.mode === 'folder' ? '导入本地电子书' : '选择本地文件打开'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {state.mode === 'folder' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <HardDrive size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    当前为浏览器 / 沙盒环境，已列出本地缓存与下载目录中的书籍文件；您也可以点击右上角「导入本地电子书」直接打开磁盘或手机中的电子书文件。
                  </span>
                </div>
              </div>

              {!state.folderFiles || state.folderFiles.length === 0 ? (
                <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <FolderOpen size={32} className="mx-auto text-slate-400" />
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    书库文件夹暂无已缓存文件
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    从镜像下载完成的书籍会自动保存至此；现在也可以点击下方按钮从设备本地选择 PDF / EPUB / TXT 文件打开并加入书库。
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Upload size={14} />
                    <span>选择本地电子书文件</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {state.folderFiles.map((item, idx) => (
                    <div
                      key={`${item.source}-${item.name}-${idx}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText size={18} className="text-indigo-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {formatBytes(item.size)} · {item.source === 'disk' ? '本地目录文件' : '浏览器离线缓存'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenBookByFileItem(item)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                        >
                          打开阅读
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadCachedItem(item)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
                        >
                          保存副本
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : state.blob && objectUrl ? (
            isPdf ? (
              <div className="h-full flex flex-col space-y-3">
                <iframe
                  src={objectUrl}
                  title={fileName}
                  className="w-full flex-1 min-h-[420px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>若当前容器未内置 PDF 插件，可点击右侧按钮保存或系统打开。</span>
                  <a
                    href={objectUrl}
                    download={fileName}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold inline-flex items-center gap-1"
                  >
                    <Download size={13} />
                    <span>保存 / 调起系统阅读器</span>
                  </a>
                </div>
              </div>
            ) : isText && textPreview !== null ? (
              <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-sans bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                {textPreview}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-10">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <BookOpen size={32} />
                </div>
                <div className="space-y-1 max-w-md">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{fileName}</h4>
                  <p className="text-xs text-slate-500">
                    文件大小：{formatBytes(state.blob.size)} · 格式 {(state.book?.extension || 'EPUB/MOBI').toUpperCase()} 建议使用系统阅读器（如静读天下 / Kindle / Calibre / 微信读书）打开。
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={objectUrl}
                    download={fileName}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow"
                  >
                    <Download size={14} />
                    <span>保存 / 用系统应用打开</span>
                  </a>
                  {state.book?.detailUrl && (
                    <button
                      type="button"
                      onClick={() => openExternalUrl(state.book!.detailUrl!)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <ExternalLink size={14} />
                      <span>查看镜像原页</span>
                    </button>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-10">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                <BookOpen size={28} />
              </div>
              <div className="space-y-1.5 max-w-lg">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {state.book?.title || '打开本地书籍'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {state.message || '当前暂未在浏览器缓存中检测到该书的电子书实体文件。您可以直接从本地选择对应的 PDF / EPUB / TXT 文件打开阅读，或前往镜像原页重新下载。'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow"
                >
                  <Upload size={14} />
                  <span>从本地选择电子书文件打开</span>
                </button>
                {state.book && onExportBook && (
                  <button
                    type="button"
                    onClick={() => onExportBook(state.book!)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Download size={14} />
                    <span>从镜像重新下载/导出</span>
                  </button>
                )}
                {(state.book?.downloadUrl || state.book?.detailUrl) && (
                  <button
                    type="button"
                    onClick={() => openExternalUrl((state.book?.downloadUrl || state.book?.detailUrl)!)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <ExternalLink size={14} />
                    <span>打开镜像原书页</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
