import React, { useState, useEffect } from 'react';
import { Download, Pause, Play, Trash2, CheckCircle2, FolderOpen, ArrowDown, BookOpen } from 'lucide-react';
import { DownloadTask } from '../types';
import { Pagination } from './Pagination';

interface DownloadQueueProps {
  tasks: DownloadTask[];
  onPauseTask: (id: string) => void;
  onResumeTask: (id: string) => void;
  onCancelTask: (id: string) => void;
  onOpenFolder: () => void;
}

export const DownloadQueue: React.FC<DownloadQueueProps> = ({
  tasks,
  onPauseTask,
  onResumeTask,
  onCancelTask,
  onOpenFolder
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);

  const activeCount = tasks.filter(t => t.status === 'downloading').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [tasks.length, pageSize, currentPage, totalPages]);

  const paginatedTasks = tasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getFormatBadgeClass = (ext: string) => {
    const lower = ext.toLowerCase();
    if (lower === 'pdf') return 'bg-red-600 text-white';
    if (lower === 'epub') return 'bg-emerald-600 text-white';
    if (lower === 'mobi') return 'bg-blue-600 text-white';
    return 'bg-slate-700 text-white';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Download className="text-indigo-600" size={24} />
            <span>下载队列与实时下载进度 ({tasks.length})</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            正在下载: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{activeCount}</span> · 已完成: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{completedCount}</span>
          </p>
        </div>

        <button
          onClick={onOpenFolder}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
        >
          <FolderOpen size={16} />
          <span>打开下载目录</span>
        </button>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-4">
            <ArrowDown size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">暂无下载任务</h3>
          <p className="text-sm text-slate-500 mt-1">请前往“书籍搜索”标签页并点击下载按钮开始传输。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              {/* Book Cover Thumbnail in Download Queue */}
              <div className="relative w-20 sm:w-24 h-28 sm:h-32 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-800 self-start">
                {task.coverUrl ? (
                  <img
                    src={task.coverUrl}
                    alt={task.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center p-1.5 text-center bg-gradient-to-br from-indigo-900 to-slate-950 text-white">
                  <BookOpen size={20} className="text-indigo-400 mb-1" />
                  <span className="text-[9px] font-bold line-clamp-2">{task.title}</span>
                </div>
                <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shadow ${getFormatBadgeClass(task.extension)}`}>
                  {task.extension}
                </span>
              </div>

              {/* Task Details & Progress Bar */}
              <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        {task.extension}
                      </span>
                      <span className="text-xs text-slate-500 font-mono truncate">镜像: {task.mirrorUrl}</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">{task.title}</h4>
                    <p className="text-xs text-slate-500 truncate">{task.author} · {task.filesize}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === 'downloading' && (
                      <button
                        onClick={() => onPauseTask(task.id)}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                        title="暂停"
                      >
                        <Pause size={16} />
                      </button>
                    )}
                    {task.status === 'paused' && (
                      <button
                        onClick={() => onResumeTask(task.id)}
                        className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                        title="继续"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => onCancelTask(task.id)}
                      className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition-colors"
                      title="删除任务"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Status */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      {task.status === 'completed' && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 size={14} /> 已完成
                        </span>
                      )}
                      {task.status === 'downloading' && (
                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                          下载中... {task.speed}
                        </span>
                      )}
                      {task.status === 'paused' && (
                        <span className="flex items-center gap-1 text-amber-500 font-semibold">
                          <Pause size={14} /> 已暂停
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500">
                      {task.downloadedBytes} / {task.filesize} ({task.progress}%) {task.status === 'downloading' && `· 剩余时间: ${task.eta}`}
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        task.status === 'completed'
                          ? 'bg-emerald-500'
                          : task.status === 'paused'
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-indigo-500 to-violet-600'
                      }`}
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Pagination
            currentPage={currentPage}
            totalItems={tasks.length}
            pageSize={pageSize}
            pageSizeOptions={[4, 6, 10, 20]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            itemLabel="个任务"
          />
        </div>
      )}
    </div>
  );
};
