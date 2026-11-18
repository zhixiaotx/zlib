import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Sparkles, Star, Globe, CheckCircle2, ArrowRight, BookOpen, SortAsc, RefreshCw, X, Copy, Check, Eye, Tag, Calendar, Layers } from 'lucide-react';
import { Book, Mirror, UserAccount } from '../types';
import { Pagination } from './Pagination';

interface SearchSectionProps {
  onStartDownload: (book: Book) => void;
  onOpenAISummary: (book: Book) => void;
  downloadedBookIds: string[];
  activeMirror?: Mirror;
  activeAccount?: UserAccount | null;
  onNavigateToMirrors?: () => void;
  onOpenLogin?: () => void;
}

const POPULAR_SEARCH_TAGS = [
  '三体',
  '代码整洁之道',
  '深入理解计算机系统',
  'Deep Learning',
  'JavaScript',
  '人类简史',
  '算法导论',
  '百年孤独',
  '经济学原理',
  'Rust'
];

export const SearchSection: React.FC<SearchSectionProps> = ({
  onStartDownload,
  onOpenAISummary,
  downloadedBookIds,
  activeMirror,
  activeAccount,
  onNavigateToMirrors,
  onOpenLogin
}) => {
  const [query, setQuery] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'title' | 'author' | 'isbn' | 'publisher'>('all');
  const [exactMatch, setExactMatch] = useState(false);
  const [language, setLanguage] = useState('all');
  const [extension, setExtension] = useState('all');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'downloads' | 'year'>('relevance');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [expandedDescId, setExpandedDescId] = useState<string | null>(null);
  const [copiedCitationId, setCopiedCitationId] = useState<string | null>(null);
  const [previewCoverBook, setPreviewCoverBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const fetchBooks = async (overrideQuery?: string, overrideField?: string) => {
    setLoading(true);
    try {
      const q = overrideQuery !== undefined ? overrideQuery : query;
      const f = overrideField !== undefined ? overrideField : searchField;

      const params = new URLSearchParams();
      if (q.trim()) params.append('q', q.trim());
      if (f !== 'all') params.append('field', f);
      if (language !== 'all') params.append('lang', language);
      if (extension !== 'all') params.append('ext', extension);
      if (exactMatch) params.append('exact', 'true');
      if (yearFrom) params.append('yearFrom', yearFrom);
      if (yearTo) params.append('yearTo', yearTo);

      const res = await fetch(`/api/zlib/search?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        let sorted = [...data.books];
        if (sortBy === 'rating') {
          sorted.sort((a, b) => b.rating - a.rating);
        } else if (sortBy === 'downloads') {
          sorted.sort((a, b) => b.downloadsCount - a.downloadsCount);
        } else if (sortBy === 'year') {
          sorted.sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0'));
        }
        setBooks(sorted);
        setTotal(data.total);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Failed to search books', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [language, extension, sortBy, exactMatch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBooks();
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    setSearchField('all');
    setCurrentPage(1);
    fetchBooks(tag, 'all');
  };

  const handleAuthorClick = (authorName: string) => {
    setQuery(authorName);
    setSearchField('author');
    setCurrentPage(1);
    fetchBooks(authorName, 'author');
  };

  const totalPages = Math.max(1, Math.ceil(books.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBooks = books.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleCopyCitation = (book: Book) => {
    const citation = `[1] ${book.author}. ${book.title}[M]. ${book.publisher || '出版社'}, ${book.year || '2020'}. (${book.isbn || 'Z-Library Archive'})`;
    navigator.clipboard.writeText(citation);
    setCopiedCitationId(book.id);
    setTimeout(() => setCopiedCitationId(null), 2000);
  };

  // Helper for format badge styling
  const getFormatBadgeClass = (ext: string) => {
    const lower = ext.toLowerCase();
    if (lower === 'pdf') return 'bg-red-600 text-white';
    if (lower === 'epub') return 'bg-emerald-600 text-white';
    if (lower === 'mobi') return 'bg-blue-600 text-white';
    if (lower === 'azw3') return 'bg-amber-600 text-white';
    return 'bg-slate-700 text-white';
  };

  return (
    <div className="space-y-6">
      {/* Active Service Node & Account Privileges Sync Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
            <Globe size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>当前连接镜像：</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{activeMirror ? activeMirror.url : 'https://singlelogin.re'}</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
              {activeMirror ? activeMirror.latency : '142ms'} 在线
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>当前授权账号：</span>
            <strong className="text-slate-800 dark:text-slate-200">
              {activeAccount ? activeAccount.name : '未登录'}
            </strong>
            {activeAccount && (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                VIP (余 {activeAccount.downloadsRemaining} 本)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 ml-auto">
          {onNavigateToMirrors && (
            <button
              type="button"
              onClick={onNavigateToMirrors}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              切换镜像
            </button>
          )}
          <span className="text-slate-300 dark:text-slate-700">·</span>
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {activeAccount ? '管理/切换账号' : '登录 Z-Lib 账号'}
            </button>
          )}
        </div>
      </div>

      {/* Official Z-Library Search Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* Official Scope Switcher tabs + Exact Match checkbox */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold w-fit">
            <button
              type="button"
              onClick={() => setSearchField('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                searchField === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              常规 / 全文检索
            </button>
            <button
              type="button"
              onClick={() => setSearchField('title')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                searchField === 'title'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              按书名 (Title)
            </button>
            <button
              type="button"
              onClick={() => setSearchField('author')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                searchField === 'author'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              按作者 (Author)
            </button>
            <button
              type="button"
              onClick={() => setSearchField('isbn')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                searchField === 'isbn'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              按 ISBN / 出版社
            </button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white select-none">
            <input
              type="checkbox"
              checked={exactMatch}
              onChange={(e) => setExactMatch(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
            <span>精确匹配 (Exact Matching)</span>
          </label>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="relative flex items-center">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
              <Search size={20} />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                searchField === 'title'
                  ? '输入书名，如：三体、代码整洁之道、深入理解计算机系统...'
                  : searchField === 'author'
                  ? '输入作者姓名，如：刘慈欣、Martin Kleppmann、Robert C. Martin...'
                  : searchField === 'isbn'
                  ? '输入 ISBN 号或出版商，如：978-7-5366-9290-9、O\'Reilly、人民邮电...'
                  : '搜索 Z-Library 海量藏书（输入书名、作者、ISBN 或关键词）...'
              }
              className="w-full pl-12 pr-28 sm:pr-32 py-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm sm:text-base"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); fetchBooks('', searchField); }}
                className="absolute right-24 sm:right-28 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="清空输入"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-5 sm:px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-1.5 shadow"
            >
              <span>搜索</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Quick Popular Keywords Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
            <span className="text-slate-400 shrink-0 font-medium flex items-center gap-1">
              <Tag size={12} />
              <span>热门检索:</span>
            </span>
            {POPULAR_SEARCH_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition-all ${
                  query === tag
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Filters & Sorting Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Filter size={14} />
                <span>过滤:</span>
              </div>

              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">所有语言</option>
                <option value="Chinese">中文 (Chinese)</option>
                <option value="English">英语 (English)</option>
                <option value="German">德语 (German)</option>
                <option value="Spanish">西班牙语 (Spanish)</option>
              </select>

              {/* Format Selector */}
              <select
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">所有格式 (.pdf, .epub, .mobi...)</option>
                <option value="pdf">PDF 电子文档</option>
                <option value="epub">EPUB 流式排版</option>
                <option value="mobi">MOBI Kindle</option>
              </select>

              {/* Year Range Inputs */}
              <div className="hidden md:flex items-center gap-1 text-xs text-slate-500">
                <Calendar size={13} className="text-slate-400" />
                <span>出版年份:</span>
                <input
                  type="number"
                  placeholder="从"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  onBlur={() => fetchBooks()}
                  className="w-16 px-1.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="至"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  onBlur={() => fetchBooks()}
                  className="w-16 px-1.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Sorting Selector */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider ml-2">
                <SortAsc size={14} />
                <span>排序:</span>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="relevance">相关度优先</option>
                <option value="rating">评分最高</option>
                <option value="downloads">下载量最多</option>
                <option value="year">最新出版年份</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              在 Z-Library 镜像中找到 <span className="font-bold text-slate-900 dark:text-white font-mono">{total}</span> 本匹配书籍
            </div>
          </div>
        </form>
      </div>

      {/* Book Results Grid: div里面显示搜索到的结果需要有图片 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-56 animate-pulse flex gap-5">
              <div className="w-32 h-44 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0"></div>
              <div className="flex-1 space-y-3 py-1">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-4">
            <Search size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">未找到匹配的书籍</h3>
          <p className="text-sm text-slate-500 mt-1">请尝试更换检索关键词、放宽语言/格式筛选，或在“镜像节点”中切换可用镜像。</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {paginatedBooks.map((book) => {
            const isDownloaded = downloadedBookIds.includes(book.id);
            const isDescExpanded = expandedDescId === book.id;
            const isCopied = copiedCitationId === book.id;

            return (
              <div
                key={book.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex gap-4 sm:gap-5 hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
              >
                {/* Book Cover Image Container: div里面显示搜索到的结果需要有图片 */}
                <div className="relative w-28 sm:w-36 h-40 sm:h-52 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-md border border-slate-200/90 dark:border-slate-800 group-hover:scale-[1.02] transition-transform select-none cursor-pointer"
                  onClick={() => setPreviewCoverBook(book)}
                  title="点击放大查看高清封面"
                >
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover shadow-inner"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                    }}
                  />

                  {/* Fallback styling container if img fails to load */}
                  <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white">
                    <BookOpen size={28} className="text-indigo-400 mb-2" />
                    <span className="text-xs font-bold line-clamp-2">{book.title}</span>
                    <span className="text-[10px] text-slate-400 mt-1">{book.author}</span>
                  </div>

                  {/* Format Badge Overlay (Top Left) */}
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shadow-sm ${getFormatBadgeClass(book.extension)}`}>
                    {book.extension}
                  </span>

                  {/* Quality/Type Badge Overlay (Bottom Center) */}
                  {book.quality && (
                    <span className="absolute bottom-2 inset-x-2 px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-900/85 text-amber-300 text-center truncate backdrop-blur-xs shadow">
                      {book.quality}
                    </span>
                  )}

                  {/* Cover Zoom Hover Hint */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="p-1.5 rounded-full bg-slate-900/70 text-white backdrop-blur-xs">
                      <Eye size={16} />
                    </div>
                  </div>
                </div>

                {/* Book Details Right Column */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3
                        className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug cursor-pointer"
                        title={book.title}
                        onClick={() => onOpenAISummary(book)}
                      >
                        {book.title}
                      </h3>
                    </div>

                    {/* Author & Publisher Metadata */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
                      <button
                        type="button"
                        onClick={() => handleAuthorClick(book.author)}
                        className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[160px]"
                        title="按该作者检索书籍"
                      >
                        {book.author}
                      </button>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                      <span>{book.year} 年</span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="truncate max-w-[130px]">{book.publisher}</span>
                      {book.pages && (
                        <>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="font-mono">{book.pages}</span>
                        </>
                      )}
                    </div>

                    {/* ISBN Badge if available */}
                    {book.isbn && (
                      <div className="text-[11px] font-mono text-slate-400 mb-2 truncate">
                        ISBN: <span className="text-slate-600 dark:text-slate-300">{book.isbn}</span>
                      </div>
                    )}

                    {/* Description preview with toggle */}
                    <div className="relative mb-3">
                      <p className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed ${isDescExpanded ? '' : 'line-clamp-2'}`}>
                        {book.description}
                      </p>
                      {book.description && book.description.length > 70 && (
                        <button
                          type="button"
                          onClick={() => setExpandedDescId(isDescExpanded ? null : book.id)}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium mt-0.5 inline-block"
                        >
                          {isDescExpanded ? '收起简介' : '展开简介'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom Stats & Action Buttons */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-amber-500 font-semibold">
                          <Star size={13} className="fill-current" />
                          <span>{book.rating.toFixed(1)}</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span>{book.filesize}</span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span className="text-slate-600 dark:text-slate-400">{book.language}</span>
                      </div>
                      <span className="tabular-nums text-[11px] text-slate-400">
                        {book.downloadsCount.toLocaleString()} 次下载
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => onOpenAISummary(book)}
                        className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                        title="查看 AI 提炼书评与导读"
                      >
                        <Sparkles size={13} className="text-amber-500" />
                        <span>AI 导读</span>
                      </button>

                      <button
                        onClick={() => handleCopyCitation(book)}
                        className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                        title="复制标准学术文献引用"
                      >
                        {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        <span>{isCopied ? '已复制' : '复制引用'}</span>
                      </button>

                      <button
                        onClick={() => onStartDownload(book)}
                        disabled={isDownloaded}
                        className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm ${
                          isDownloaded
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                        }`}
                      >
                        {isDownloaded ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>已在书库</span>
                          </>
                        ) : (
                          <>
                            <Download size={13} />
                            <span>立即下载</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          <Pagination
            currentPage={safePage}
            totalItems={books.length}
            pageSize={pageSize}
            pageSizeOptions={[4, 6, 8, 12, 20]}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            itemLabel="本"
          />
        </>
      )}

      {/* High-Res Book Cover Lightbox Preview Modal (Unified Modal Dimensions) */}
      {previewCoverBook && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setPreviewCoverBook(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl h-[640px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[400px]">
                {previewCoverBook.title} — 高清封面立体预览
              </h4>
              <button onClick={() => setPreviewCoverBook(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-56 sm:w-64 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                <img src={previewCoverBook.coverUrl} alt={previewCoverBook.title} className="w-full h-full object-cover" />
              </div>
              <div className="text-center text-xs text-slate-500 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{previewCoverBook.title}</div>
                <div>作者：{previewCoverBook.author} · 出版社：{previewCoverBook.publisher} ({previewCoverBook.year})</div>
                <div className="font-mono text-[11px] text-slate-400">ISBN: {previewCoverBook.isbn || 'Z-Library Archive'}</div>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end shrink-0">
              <button
                onClick={() => setPreviewCoverBook(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold"
              >
                关闭预览
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
