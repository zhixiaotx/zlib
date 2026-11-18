import React, { useState, useEffect } from 'react';
import { HardDrive, BookOpen, Trash2, FolderOpen, Sparkles, Star } from 'lucide-react';
import { Book } from '../types';
import { Pagination } from './Pagination';

interface LocalLibraryProps {
  downloadedBooks: Book[];
  onRemoveBook: (id: string) => void;
  onOpenFolder: () => void;
  onOpenAISummary: (book: Book) => void;
}

export const LocalLibrary: React.FC<LocalLibraryProps> = ({
  downloadedBooks,
  onRemoveBook,
  onOpenFolder,
  onOpenAISummary
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const totalPages = Math.max(1, Math.ceil(downloadedBooks.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [downloadedBooks.length, pageSize, currentPage, totalPages]);

  const paginatedBooks = downloadedBooks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getFormatBadgeClass = (ext: string) => {
    const lower = ext.toLowerCase();
    if (lower === 'pdf') return 'bg-red-600 text-white';
    if (lower === 'epub') return 'bg-emerald-600 text-white';
    if (lower === 'mobi') return 'bg-blue-600 text-white';
    return 'bg-slate-700 text-white';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive className="text-indigo-600" size={24} />
            <span>本地已下载书库 ({downloadedBooks.length})</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            管理您已下载并保存在本地下载目录中的 EPUB、PDF 与 MOBI 书籍。
          </p>
        </div>

        <button
          onClick={onOpenFolder}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
        >
          <FolderOpen size={16} />
          <span>打开书库文件夹</span>
        </button>
      </div>

      {downloadedBooks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-4">
            <BookOpen size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">本地书库暂无书籍</h3>
          <p className="text-sm text-slate-500 mt-1">下载完成的书籍将自动显示在此处。</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedBooks.map((book) => (
              <div
                key={book.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex gap-4 hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
              >
                {/* Book Cover Image in Local Library */}
                <div className="relative w-24 sm:w-28 h-36 sm:h-40 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-800 group-hover:scale-[1.02] transition-transform">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-indigo-900 to-slate-950 text-white">
                    <BookOpen size={22} className="text-indigo-400 mb-1" />
                    <span className="text-[10px] font-bold line-clamp-2">{book.title}</span>
                  </div>
                  <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shadow ${getFormatBadgeClass(book.extension)}`}>
                    {book.extension}
                  </span>
                </div>

                {/* Right Metadata & Actions */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        已本地保存 · {book.filesize}
                      </span>
                    </div>
                    <h3
                      className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug cursor-pointer"
                      onClick={() => onOpenAISummary(book)}
                    >
                      {book.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{book.author}</span>
                      <span aria-hidden="true">·</span>
                      <span>{book.year}</span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-500 text-xs font-mono font-semibold mt-1">
                      <Star size={12} className="fill-current" />
                      <span>{book.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onOpenAISummary(book)}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Sparkles size={13} className="text-amber-500" />
                      <span>AI 导读</span>
                    </button>

                    <button
                      onClick={() => onRemoveBook(book.id)}
                      className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 size={13} />
                      <span>移除</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={downloadedBooks.length}
            pageSize={pageSize}
            pageSizeOptions={[3, 6, 9, 12, 24]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            itemLabel="本"
          />
        </div>
      )}
    </div>
  );
};
