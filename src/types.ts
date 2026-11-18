export interface Book {
  id: string;
  title: string;
  author: string;
  year: string;
  publisher: string;
  extension: string;
  filesize: string;
  language: string;
  rating: number;
  coverUrl: string;
  description: string;
  downloadsCount: number;
  isbn?: string;
  pages?: string;
  quality?: string;
}

export interface DownloadTask {
  id: string;
  bookId: string;
  title: string;
  author: string;
  extension: string;
  filesize: string;
  coverUrl?: string;
  progress: number; // 0 - 100
  speed: string;
  eta: string;
  status: 'downloading' | 'paused' | 'completed' | 'failed';
  downloadedBytes: string;
  mirrorUrl: string;
}

export interface Mirror {
  id: string;
  url: string;
  status: 'online' | 'unstable' | 'offline';
  latency: string;
  active: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  dailyDownloadsLimit: number;
  downloadsRemaining: number;
  isPremium: boolean;
  remindMeToken: string;
  loginMethod: 'password' | 'cookie';
  addedAt: string;
  personalDomain?: string;
  telegramBotLinked?: boolean;
}

export type AIProvider = 'google' | 'openai' | 'deepseek' | 'openai-compatible';

export interface AIConfig {
  id: string;
  name: string;
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  createdAt?: string;
}
