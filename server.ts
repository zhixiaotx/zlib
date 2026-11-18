import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

// Initialize GoogleGenAI server-side client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Mock initial Z-Library database for search & download
interface Book {
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

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function generateCoverSvg(title: string, author: string, color1: string, color2: string, category: string, ext: string = 'EPUB', isbn: string = '978-0-0000-0000-0'): string {
  const h = Math.abs(hash(title));
  const safeTitle = escapeXml(title);
  const safeAuthor = escapeXml(author);
  const safeCat = escapeXml(category.toUpperCase());
  const extColor = ext.toLowerCase() === 'pdf' ? '#ef4444' : ext.toLowerCase() === 'epub' ? '#10b981' : ext.toLowerCase() === 'mobi' ? '#3b82f6' : '#f59e0b';

  // Artistic motif based on category
  let artPattern = '';
  if (category.includes('科幻') || category.includes('Sci-Fi')) {
    artPattern = `
      <circle cx="150" cy="115" r="45" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="4,4" />
      <ellipse cx="150" cy="115" rx="65" ry="20" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" transform="rotate(-20 150 115)" />
      <circle cx="150" cy="115" r="24" fill="rgba(255,255,255,0.2)" />
      <circle cx="158" cy="107" r="18" fill="rgba(255,255,255,0.4)" />
      <circle cx="95" cy="75" r="3" fill="#ffffff" opacity="0.9" />
      <circle cx="215" cy="85" r="2.5" fill="#ffffff" opacity="0.8" />
      <circle cx="190" cy="155" r="3" fill="#ffffff" opacity="0.85" />
    `;
  } else if (category.includes('计算') || category.includes('架构') || category.includes('System') || category.includes('Web') || category.includes('前端') || category.includes('Program') || category.includes('Rust')) {
    artPattern = `
      <rect x="95" y="80" width="110" height="70" rx="8" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2" />
      <text x="150" y="122" font-family="monospace" font-size="24" font-weight="bold" fill="rgba(255,255,255,0.85)" text-anchor="middle">&lt;/&gt;</text>
      <circle cx="95" cy="115" r="5" fill="#38bdf8" />
      <circle cx="205" cy="115" r="5" fill="#38bdf8" />
      <line x1="150" y1="65" x2="150" y2="80" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
      <line x1="150" y1="150" x2="150" y2="165" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
    `;
  } else if (category.includes('AI') || category.includes('智能') || category.includes('学习') || category.includes('Deep')) {
    artPattern = `
      <circle cx="125" cy="95" r="8" fill="rgba(255,255,255,0.5)" />
      <circle cx="175" cy="95" r="8" fill="rgba(255,255,255,0.5)" />
      <circle cx="110" cy="135" r="8" fill="rgba(255,255,255,0.5)" />
      <circle cx="150" cy="130" r="11" fill="rgba(255,255,255,0.75)" />
      <circle cx="190" cy="135" r="8" fill="rgba(255,255,255,0.5)" />
      <line x1="125" y1="95" x2="150" y2="130" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
      <line x1="175" y1="95" x2="150" y2="130" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
      <line x1="110" y1="135" x2="150" y2="130" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
      <line x1="190" y1="135" x2="150" y2="130" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
    `;
  } else {
    artPattern = `
      <circle cx="150" cy="115" r="38" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
      <path d="M135 115 L150 100 L165 115 L150 130 Z" fill="rgba(255,255,255,0.5)" />
      <line x1="105" y1="115" x2="195" y2="115" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
    <defs>
      <linearGradient id="bg_${h}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}" />
        <stop offset="100%" stop-color="${color2}" />
      </linearGradient>
      <linearGradient id="spine_${h}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="rgba(0,0,0,0.45)" />
        <stop offset="70%" stop-color="rgba(0,0,0,0.15)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0.2)" />
      </linearGradient>
      <linearGradient id="gold_${h}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fbbf24" />
        <stop offset="100%" stop-color="#d97706" />
      </linearGradient>
      <filter id="shadow_${h}" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.3)" />
      </filter>
    </defs>

    <!-- Main Book Cover Background -->
    <rect width="300" height="420" rx="10" fill="url(#bg_${h})" />

    <!-- 3D Book Spine Shading & Crease -->
    <rect x="0" y="0" width="24" height="420" rx="6" fill="url(#spine_${h})" />
    <line x1="24" y1="0" x2="24" y2="420" stroke="rgba(0,0,0,0.35)" stroke-width="1.5" />
    <line x1="26" y1="0" x2="26" y2="420" stroke="rgba(255,255,255,0.15)" stroke-width="1" />

    <!-- Embossed Inner Foil Frame -->
    <rect x="36" y="24" width="244" height="372" rx="8" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
    <rect x="40" y="28" width="236" height="364" rx="6" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1" />

    <!-- Format Tag -->
    <rect x="42" y="32" width="48" height="20" rx="4" fill="${extColor}" />
    <text x="66" y="46" font-family="system-ui, sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">${ext.toUpperCase()}</text>

    <!-- Category Pill -->
    <text x="160" y="47" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="rgba(255,255,255,0.85)" text-anchor="middle" letter-spacing="2.5">${safeCat}</text>

    <!-- Category Visual Art Motif -->
    ${artPattern}

    <!-- Book Title (Multi-line support) -->
    <text x="155" y="195" font-family="'Noto Serif SC', 'Songti SC', 'Georgia', serif" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle">
      ${safeTitle.length > 14 ? safeTitle.substring(0, 13) + '…' : safeTitle}
    </text>
    <text x="155" y="222" font-family="'Noto Serif SC', 'Songti SC', 'Georgia', serif" font-size="13" font-weight="500" fill="rgba(255,255,255,0.85)" text-anchor="middle">
      ${safeTitle.length > 14 ? safeTitle.substring(13, 27) : ''}
    </text>

    <line x1="85" y1="244" x2="225" y2="244" stroke="url(#gold_${h})" stroke-width="1.5" />

    <!-- Author Name -->
    <text x="155" y="272" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="rgba(255,255,255,0.95)" text-anchor="middle">
      ${safeAuthor.length > 18 ? safeAuthor.substring(0, 17) + '…' : safeAuthor}
    </text>

    <!-- Official Seal Badge -->
    <circle cx="155" cy="326" r="18" fill="url(#gold_${h})" opacity="0.9" />
    <polygon points="155,314 158,322 166,322 160,327 162,335 155,330 148,335 150,327 144,322 152,322" fill="#ffffff" />

    <!-- Bottom Archive Brand Ribbon & Barcode -->
    <rect x="52" y="358" width="206" height="24" rx="4" fill="rgba(0,0,0,0.35)" />
    <text x="155" y="374" font-family="monospace" font-size="9.5" font-weight="bold" fill="#fbbf24" text-anchor="middle" letter-spacing="1">Z-LIBRARY OFFICIAL ARCHIVE</text>

    <!-- ISBN Simulation -->
    <text x="155" y="394" font-family="monospace" font-size="8" fill="rgba(255,255,255,0.5)" text-anchor="middle">ISBN ${isbn}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

let mockBooks: Book[] = [
  {
    id: "zlib-101",
    title: "三体 (全集)",
    author: "刘慈欣",
    year: "2018",
    publisher: "重庆出版社",
    extension: "epub",
    filesize: "12.8 MB",
    language: "Chinese",
    rating: 5.0,
    isbn: "978-7-5366-9290-9",
    pages: "880 页",
    quality: "官方插图全集精校版",
    coverUrl: generateCoverSvg("三体 (全集)", "刘慈欣", "#09122c", "#1e3a8a", "科幻文学", "epub", "978-7-5366-9290-9"),
    description: "第73届雨果奖最佳长篇小说。文化大革命如火如荼地进行，军方探寻外星文明的红岸基地取得突破性进展，人类文明与四光年外的三体文明的命运由此发生天翻地覆的交织。",
    downloadsCount: 382400
  },
  {
    id: "zlib-1",
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    year: "2017",
    publisher: "O'Reilly Media",
    extension: "pdf",
    filesize: "35.4 MB",
    language: "English",
    rating: 4.9,
    isbn: "978-1-4493-7332-0",
    pages: "616 页",
    quality: "原版高清文字版 (含高精图表)",
    coverUrl: generateCoverSvg("Designing Data-Intensive Apps", "Martin Kleppmann", "#064e3b", "#047857", "System Architecture", "pdf", "978-1-4493-7332-0"),
    description: "The Big Ideas Behind Reliable, Scalable, and Maintainable Systems. Essential masterwork for distributed backend systems, storage engines, consensus algorithms, and stream processing.",
    downloadsCount: 142850
  },
  {
    id: "zlib-2",
    title: "Clean Code: 代码整洁之道",
    author: "Robert C. Martin (Uncle Bob)",
    year: "2010",
    publisher: "人民邮电出版社",
    extension: "epub",
    filesize: "18.2 MB",
    language: "Chinese",
    rating: 4.8,
    isbn: "978-7-115-21687-8",
    pages: "388 页",
    quality: "官方中文精排版",
    coverUrl: generateCoverSvg("代码整洁之道 Clean Code", "Robert C. Martin", "#1e1b4b", "#4338ca", "软件工艺", "epub", "978-7-115-21687-8"),
    description: "软件工程领域的旷世经典。全面阐述高内聚、低耦合、重构命名、函数法则、错误处理与单元测试的工匠艺术。",
    downloadsCount: 230910
  },
  {
    id: "zlib-3",
    title: "Deep Learning (深度学习 花书)",
    author: "Ian Goodfellow, Yoshua Bengio, Aaron Courville",
    year: "2017",
    publisher: "人民邮电出版社",
    extension: "pdf",
    filesize: "48.9 MB",
    language: "Chinese",
    rating: 4.8,
    isbn: "978-7-115-46147-6",
    pages: "522 页",
    quality: "官方全彩中文文字版",
    coverUrl: generateCoverSvg("Deep Learning (花书)", "Ian Goodfellow et al.", "#4c0519", "#9f1239", "Artificial Intelligence", "pdf", "978-7-115-46147-6"),
    description: "AI 领域公认圣经。涵盖应用数学基础、深度前馈网络、卷积神经网络、循环网络、生成对抗模型与前沿理论研究。",
    downloadsCount: 98400
  },
  {
    id: "zlib-4",
    title: "深入理解计算机系统 (CSAPP 第3版)",
    author: "Randal E. Bryant, David R. O'Hallaron",
    year: "2016",
    publisher: "机械工业出版社",
    extension: "pdf",
    filesize: "68.2 MB",
    language: "Chinese",
    rating: 4.9,
    isbn: "978-7-111-54493-7",
    pages: "752 页",
    quality: "高清双色文字版",
    coverUrl: generateCoverSvg("深入理解计算机系统 CSAPP", "R. E. Bryant", "#1c1917", "#44403c", "计算机底层", "pdf", "978-7-111-54493-7"),
    description: "卡耐基梅隆大学金牌经典教材。从程序员的独特视角透彻剖析计算机体系结构、x86-64 汇编、存储器层次结构、虚拟内存与并发编程。",
    downloadsCount: 198200
  },
  {
    id: "zlib-5",
    title: "The Pragmatic Programmer (20th Anniversary)",
    author: "David Thomas, Andrew Hunt",
    year: "2020",
    publisher: "Addison-Wesley Professional",
    extension: "epub",
    filesize: "12.1 MB",
    language: "English",
    rating: 4.9,
    isbn: "978-0-135-95705-9",
    pages: "352 页",
    quality: "Retail EPUB Original",
    coverUrl: generateCoverSvg("The Pragmatic Programmer", "David Thomas, Andrew Hunt", "#312e81", "#6366f1", "Programming", "epub", "978-0-135-95705-9"),
    description: "Straight from the programming trenches, The Pragmatic Programmer cuts through the increasing specialization of modern software development with actionable wisdom.",
    downloadsCount: 175600
  },
  {
    id: "zlib-6",
    title: "JavaScript 高级程序设计（第4版 红宝书）",
    author: "Matt Frisbie",
    year: "2020",
    publisher: "人民邮电出版社",
    extension: "pdf",
    filesize: "55.7 MB",
    language: "Chinese",
    rating: 4.9,
    isbn: "978-7-115-54538-0",
    pages: "886 页",
    quality: "双色高清文字版",
    coverUrl: generateCoverSvg("JavaScript高级程序设计", "Matt Frisbie", "#831843", "#be185d", "Web开发", "pdf", "978-7-115-54538-0"),
    description: "前端开发者必备红宝书，详尽解析 ECMAScript 2020、DOM、BOM、异步 Promise、模块化及现代 Web API。",
    downloadsCount: 264000
  },
  {
    id: "zlib-7",
    title: "Rust Programming Language, 2nd Edition",
    author: "Steve Klabnik, Carol Nichols",
    year: "2023",
    publisher: "No Starch Press",
    extension: "pdf",
    filesize: "24.6 MB",
    language: "English",
    rating: 4.9,
    isbn: "978-1-718-50310-6",
    pages: "560 页",
    quality: "Official Digital Release",
    coverUrl: generateCoverSvg("Rust Programming 2nd Ed", "Steve Klabnik, Carol Nichols", "#701a75", "#a21caf", "Systems Lang", "pdf", "978-1-718-50310-6"),
    description: "The official authoritative book on the Rust programming language, empowering you to write faster, memory-safe, and highly concurrent software.",
    downloadsCount: 84200
  },
  {
    id: "zlib-8",
    title: "人类简史：从动物到上帝",
    author: "尤瓦尔·赫拉利 (Yuval Noah Harari)",
    year: "2017",
    publisher: "中信出版社",
    extension: "epub",
    filesize: "15.3 MB",
    language: "Chinese",
    rating: 4.8,
    isbn: "978-7-508-64735-7",
    pages: "440 页",
    quality: "官方插图精校版",
    coverUrl: generateCoverSvg("人类简史", "尤瓦尔·赫拉利", "#713f12", "#ca8a04", "历史社科", "epub", "978-7-508-64735-7"),
    description: "全球现象级超级畅销书。从认知革命、农业革命到科学革命，全景式审视智人如何从微不足道的猿类最终统治地球。",
    downloadsCount: 312000
  },
  {
    id: "zlib-9",
    title: "算法导论 (Introduction to Algorithms 4th Edition)",
    author: "Thomas H. Cormen, Charles E. Leiserson",
    year: "2022",
    publisher: "MIT Press",
    extension: "pdf",
    filesize: "78.5 MB",
    language: "English",
    rating: 4.9,
    isbn: "978-0-262-04630-5",
    pages: "1312 页",
    quality: "MIT Press 官方高清版",
    coverUrl: generateCoverSvg("Introduction to Algorithms", "Thomas H. Cormen", "#155e75", "#0e7490", "算法理论", "pdf", "978-0-262-04630-5"),
    description: "The definitive reference for algorithms worldwide. Covers divide-and-conquer, dynamic programming, greedy algorithms, graph theories, and NP-completeness.",
    downloadsCount: 189400
  },
  {
    id: "zlib-10",
    title: "百年孤独 (One Hundred Years of Solitude)",
    author: "加西亚·马尔克斯 (Gabriel García Márquez)",
    year: "2017",
    publisher: "南海出版公司",
    extension: "epub",
    filesize: "8.6 MB",
    language: "Chinese",
    rating: 4.9,
    isbn: "978-7-544-25399-4",
    pages: "360 页",
    quality: "范晔译本正版授权",
    coverUrl: generateCoverSvg("百年孤独", "加西亚·马尔克斯", "#14532d", "#166534", "世界名著", "epub", "978-7-544-25399-4"),
    description: "魔幻现实主义文学巅峰之作。布恩迪亚家族七代人在虚构马孔多小镇兴衰演变、孤独循环的世纪史诗。",
    downloadsCount: 340100
  },
  {
    id: "zlib-11",
    title: "经济学原理 (微观+宏观分册 第8版)",
    author: "N. 格里高利·曼昆 (N. Gregory Mankiw)",
    year: "2020",
    publisher: "北京大学出版社",
    extension: "pdf",
    filesize: "84.2 MB",
    language: "Chinese",
    rating: 4.8,
    isbn: "978-7-301-31102-8",
    pages: "768 页",
    quality: "北大出版社双色高清文字版",
    coverUrl: generateCoverSvg("经济学原理 曼昆第8版", "N. 格里高利·曼昆", "#78350f", "#b45309", "经济金融", "pdf", "978-7-301-31102-8"),
    description: "风靡全球的经典经济学入门读物，清晰阐释供给需求、弹性分析、市场效率、货币银行与宏观经济波动。",
    downloadsCount: 215000
  },
  {
    id: "zlib-12",
    title: "Kubernetes 权威指南：从 Docker 到 Kubernetes 实践全接触（第5版）",
    author: "龚正, 吴治辉, 崔秀龙",
    year: "2021",
    publisher: "电子工业出版社",
    extension: "pdf",
    filesize: "92.4 MB",
    language: "Chinese",
    rating: 4.8,
    isbn: "978-7-121-40905-9",
    pages: "960 页",
    quality: "高清双色完整书签版",
    coverUrl: generateCoverSvg("Kubernetes 权威指南", "龚正, 吴治辉", "#0f172a", "#0284c7", "云计算架构", "pdf", "978-7-121-40905-9"),
    description: "云原生时代权威圣经。深入剖析 Pod 调度、网络插件、Service 网格、持久化存储与企业级微服务集群运维。",
    downloadsCount: 158900
  },
  {
    id: "zlib-13",
    title: "Refactoring: Improving the Design of Existing Code (2nd Edition)",
    author: "Martin Fowler",
    year: "2018",
    publisher: "Addison-Wesley",
    extension: "epub",
    filesize: "14.5 MB",
    language: "English",
    rating: 4.9,
    isbn: "978-0-134-75759-9",
    pages: "448 页",
    quality: "Official Digital Edition",
    coverUrl: generateCoverSvg("Refactoring 2nd Edition", "Martin Fowler", "#1e293b", "#4f46e5", "Software Design", "epub", "978-0-134-75759-9"),
    description: "Fully revised and updated with JavaScript examples, demonstrating how to cleanly restructure code without changing external behavior.",
    downloadsCount: 162300
  },
  {
    id: "zlib-14",
    title: "思考，快与慢 (Thinking, Fast and Slow)",
    author: "丹尼尔·卡尼曼 (Daniel Kahneman)",
    year: "2012",
    publisher: "中信出版社",
    extension: "epub",
    filesize: "9.8 MB",
    language: "Chinese",
    rating: 4.9,
    isbn: "978-7-508-63355-8",
    pages: "424 页",
    quality: "精校完整插图版",
    coverUrl: generateCoverSvg("思考，快与慢", "丹尼尔·卡尼曼", "#451a03", "#d97706", "心理与行为经济学", "epub", "978-7-508-63355-8"),
    description: "诺贝尔经济学奖得主卡尼曼经典代表作，系统揭示大脑系统1（直觉）与系统2（理性）在决策中的认知偏误。",
    downloadsCount: 289000
  },
  {
    id: "zlib-15",
    title: "高性能 MySQL (第4版)",
    author: "Silvia Botros, Jeremy Tinley",
    year: "2022",
    publisher: "电子工业出版社",
    extension: "pdf",
    filesize: "46.8 MB",
    language: "Chinese",
    rating: 4.8,
    isbn: "978-7-121-43456-3",
    pages: "412 页",
    quality: "官方中文高清版",
    coverUrl: generateCoverSvg("高性能 MySQL 第4版", "Silvia Botros", "#111827", "#059669", "数据库架构", "pdf", "978-7-121-43456-3"),
    description: "数据库领域不可替代的经典指南，深度解读 InnoDB 存储引擎、B+树索引优化、主从高可用与海量分库分表策略。",
    downloadsCount: 194500
  },
  {
    id: "zlib-16",
    title: "Don't Make Me Think, Revisited",
    author: "Steve Krug",
    year: "2014",
    publisher: "New Riders",
    extension: "pdf",
    filesize: "19.2 MB",
    language: "English",
    rating: 4.8,
    isbn: "978-0-321-96551-6",
    pages: "216 页",
    quality: "Full-Color UX Classic",
    coverUrl: generateCoverSvg("Don't Make Me Think", "Steve Krug", "#3b0764", "#9333ea", "UX Design", "pdf", "978-0-321-96551-6"),
    description: "A common sense approach to web and mobile usability. Essential handbook for product designers and frontend architects.",
    downloadsCount: 137200
  }
];

// Active mirrors list
let mirrors = [
  { id: "m-1", url: "https://singlelogin.re", status: "online", latency: "142ms", active: true },
  { id: "m-2", url: "https://z-lib.is", status: "online", latency: "198ms", active: false },
  { id: "m-3", url: "https://z-lib.fm", status: "online", latency: "235ms", active: false },
  { id: "m-4", url: "https://1lib.sk", status: "unstable", latency: "650ms", active: false }
];

// API: Search books (Matching Official Z-Library Logic)
app.get("/api/zlib/search", (req, res) => {
  const query = (req.query.q as string || "").trim().toLowerCase();
  const field = (req.query.field as string || "all").toLowerCase();
  const lang = req.query.lang as string || "all";
  const ext = req.query.ext as string || "all";
  const yearFrom = parseInt(req.query.yearFrom as string || "0");
  const yearTo = parseInt(req.query.yearTo as string || "9999");
  const exact = req.query.exact === "true";

  let results = mockBooks.filter(b => {
    let matchQuery = true;
    if (query) {
      if (exact) {
        if (field === "title") matchQuery = b.title.toLowerCase() === query;
        else if (field === "author") matchQuery = b.author.toLowerCase() === query;
        else if (field === "isbn") matchQuery = (b.isbn || "").toLowerCase().replace(/-/g, "") === query.replace(/-/g, "");
        else if (field === "publisher") matchQuery = b.publisher.toLowerCase() === query;
        else matchQuery = b.title.toLowerCase() === query || b.author.toLowerCase() === query;
      } else {
        if (field === "title") matchQuery = b.title.toLowerCase().includes(query);
        else if (field === "author") matchQuery = b.author.toLowerCase().includes(query);
        else if (field === "isbn") matchQuery = (b.isbn || "").toLowerCase().includes(query) || (b.isbn || "").replace(/-/g, "").includes(query.replace(/-/g, ""));
        else if (field === "publisher") matchQuery = b.publisher.toLowerCase().includes(query);
        else matchQuery = b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query) || b.publisher.toLowerCase().includes(query) || (b.isbn || "").includes(query) || b.description.toLowerCase().includes(query);
      }
    }

    const matchLang = lang === "all" || b.language.toLowerCase() === lang.toLowerCase();
    const matchExt = ext === "all" || b.extension.toLowerCase() === ext.toLowerCase();
    const bookYear = parseInt(b.year || "0");
    const matchYear = (yearFrom === 0 || bookYear >= yearFrom) && (yearTo === 9999 || bookYear <= yearTo);

    return matchQuery && matchLang && matchExt && matchYear;
  });

  // If query is specific and no exact match in preloaded list, dynamically generate official Z-Library search results!
  if (results.length === 0 && query) {
    const capitalized = query.charAt(0).toUpperCase() + query.slice(1);
    const chosenExt = ext === 'all' ? 'pdf' : ext;
    const dynamicBooks: Book[] = [
      {
        id: `zlib-dyn-${Date.now()}-1`,
        title: `${capitalized}: Principles, Theory and Practice`,
        author: `Prof. Alex ${capitalized}son`,
        year: "2023",
        publisher: "Springer Nature",
        extension: chosenExt,
        filesize: "28.4 MB",
        language: lang === 'Chinese' ? 'Chinese' : 'English',
        rating: 4.8,
        isbn: "978-3-030-84512-4",
        pages: "498 页",
        quality: "Springer 官方高清文字版",
        coverUrl: generateCoverSvg(`${capitalized}: Theory & Practice`, `Prof. Alex ${capitalized}son`, "#1e293b", "#2563eb", query, chosenExt, "978-3-030-84512-4"),
        description: `Comprehensive academic monograph covering ${query} foundations, real-world case studies, architecture patterns, and future developments.`,
        downloadsCount: 42100
      },
      {
        id: `zlib-dyn-${Date.now()}-2`,
        title: `实战 ${query}：从入门到架构进阶指南`,
        author: `技术专家委员会`,
        year: "2024",
        publisher: "电子工业出版社",
        extension: ext === 'all' ? 'epub' : ext,
        filesize: "16.8 MB",
        language: "Chinese",
        rating: 4.9,
        isbn: "978-7-121-43210-9",
        pages: "380 页",
        quality: "官方全彩精排 EPUB",
        coverUrl: generateCoverSvg(`实战 ${query}`, "技术专家委员会", "#311042", "#7c3aed", query, ext === 'all' ? 'epub' : ext, "978-7-121-43210-9"),
        description: `针对 ${query} 的深度实战指南，涵盖从零起步、核心机制剖析到生产环境高可用落地的完整知识树。`,
        downloadsCount: 68500
      },
      {
        id: `zlib-dyn-${Date.now()}-3`,
        title: `${query} 核心原理与案例全解 (第2版)`,
        author: `李明华 著`,
        year: "2022",
        publisher: "机械工业出版社",
        extension: "pdf",
        filesize: "42.1 MB",
        language: "Chinese",
        rating: 4.8,
        isbn: "978-7-111-68932-1",
        pages: "520 页",
        quality: "高清文字双色版",
        coverUrl: generateCoverSvg(`${query} 核心原理与案例全解`, "李明华 著", "#0f172a", "#0d9488", query, "pdf", "978-7-111-68932-1"),
        description: `汇集一线研发与科研团队多年的深厚沉淀，全面剖析 ${query} 的底层本质与高频实操疑难。`,
        downloadsCount: 31800
      }
    ];
    results = dynamicBooks;
  }

  res.json({ success: true, books: results, total: results.length });
});

// API: Get mirrors
app.get("/api/zlib/mirrors", (req, res) => {
  res.json({ success: true, mirrors });
});

// API: Test mirrors
app.post("/api/zlib/mirrors/test", (req, res) => {
  mirrors = mirrors.map(m => {
    const latencyVal = Math.floor(80 + Math.random() * 300);
    return {
      ...m,
      status: latencyVal < 400 ? "online" : "unstable",
      latency: `${latencyVal}ms`
    };
  });
  res.json({ success: true, mirrors });
});

// API: Multi-Provider AI Book Summary & Recommendation (Google Gemini / OpenAI / DeepSeek / OpenAI-Compatible)
app.post("/api/gemini/summary", async (req, res) => {
  try {
    const { title, author, description, aiConfig } = req.body;
    const provider = aiConfig?.provider || "google";
    const customKey = (aiConfig?.apiKey || "").trim();
    const customBaseUrl = (aiConfig?.baseUrl || "").trim();
    const customModel = (aiConfig?.model || "").trim();

    const prompt = `请作为一名资深学者与书评专家，为书籍《${title}》（作者：${author}）撰写一份结构清晰、内容深入的中文专业导读与精读报告。书籍原始简介如下：“${description}”。
请严格使用中文按以下四个模块排版输出：
1. 【核心内容全景概览】
2. 【必读核心概念与理论拆解】
3. 【适用读者人群与前置知识】
4. 【高效精读路线与实践建议】`;

    if (provider === "openai" || provider === "deepseek" || provider === "openai-compatible") {
      const defaultBase =
        provider === "deepseek"
          ? "https://api.deepseek.com/v1"
          : "https://api.openai.com/v1";
      const defaultModel =
        provider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini";

      const baseUrl = (customBaseUrl || defaultBase).replace(/\/+$/, "");
      const model = customModel || defaultModel;
      const apiKey =
        customKey ||
        (provider === "deepseek" ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY) ||
        "";

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: `当前选择了 ${provider.toUpperCase()} 引擎，但尚未配置 API Key。请前往顶部“设置 -> AI 导读大模型与 API 引擎配置”中填写密钥后保存。`
        });
      }

      const chatUrl = baseUrl.endsWith("/chat/completions")
        ? baseUrl
        : `${baseUrl}/chat/completions`;

      const apiRes = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "你是一位精通计算机科学、社科与文学的资深书评人与学术导师，擅长提炼书籍精华并给出结构化的中文精读指南。" },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })
      });

      const apiData: any = await apiRes.json();
      if (!apiRes.ok) {
        return res.status(apiRes.status).json({
          success: false,
          error: apiData?.error?.message || `上游 API 请求失败 (HTTP ${apiRes.status})`
        });
      }

      const content = apiData?.choices?.[0]?.message?.content;
      if (!content) {
        return res.status(500).json({
          success: false,
          error: "接口返回内容为空，请检查模型名称或 Base URL 是否正确。"
        });
      }

      return res.json({
        success: true,
        summary: content,
        providerUsed: `${provider} (${model})`
      });
    }

    // Default: Google Gemini SDK
    const geminiKey = customKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(400).json({
        success: false,
        error: "未配置 Google Gemini API Key。请在运行环境变量中设置 GEMINI_API_KEY，或在“设置 -> AI 导读大模型多 API 管理中心”中填写自有密钥或切换其他大模型。"
      });
    }

    const useCustomBase =
      customBaseUrl &&
      customBaseUrl !== "https://generativelanguage.googleapis.com";

    const activeAi =
      customKey || useCustomBase
        ? new GoogleGenAI({
            apiKey: geminiKey,
            ...(useCustomBase ? { httpOptions: { baseUrl: customBaseUrl.replace(/\/+$/, "") } } : {})
          })
        : ai;

    const modelName = customModel || "gemini-4-hydrogen";
    const response = await activeAi.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "你是一位精通文学与工程科技的资深书评人与学术导师，请使用清晰、有深度的中文提供结构化图书导读报告。"
      }
    });

    res.json({
      success: true,
      summary: response.text,
      providerUsed: `Google Gemini (${modelName})`
    });
  } catch (err: any) {
    console.error("AI summary error:", err);
    res.status(500).json({ success: false, error: err.message || "生成 AI 图书导读失败" });
  }
});

// API: Test AI Provider Configuration
app.post("/api/ai/test", async (req, res) => {
  try {
    const { aiConfig } = req.body;
    const provider = aiConfig?.provider || "google";
    const customKey = (aiConfig?.apiKey || "").trim();
    const customBaseUrl = (aiConfig?.baseUrl || "").trim();
    const customModel = (aiConfig?.model || "").trim();

    if (provider === "openai" || provider === "deepseek" || provider === "openai-compatible") {
      const defaultBase =
        provider === "deepseek"
          ? "https://api.deepseek.com/v1"
          : "https://api.openai.com/v1";
      const baseUrl = (customBaseUrl || defaultBase).replace(/\/+$/, "");
      const model = customModel || (provider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini");
      const apiKey =
        customKey ||
        (provider === "deepseek" ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY) ||
        "";

      if (!apiKey) {
        return res.status(400).json({ success: false, error: "请先填写 API Key 再进行连通性测试" });
      }

      const chatUrl = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;
      const apiRes = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply with OK only." }],
          max_tokens: 10
        })
      });

      const apiData: any = await apiRes.json();
      if (!apiRes.ok) {
        return res.status(apiRes.status).json({
          success: false,
          error: apiData?.error?.message || `连接失败 (HTTP ${apiRes.status})`
        });
      }

      return res.json({ success: true, message: `连接成功！模型 ${model} 响应正常。` });
    }

    const geminiKey = customKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(400).json({ success: false, error: "未检测到 GEMINI_API_KEY，请在表单中填写自定义 Key" });
    }

    const useCustomBase =
      customBaseUrl &&
      customBaseUrl !== "https://generativelanguage.googleapis.com";

    const activeAi =
      customKey || useCustomBase
        ? new GoogleGenAI({
            apiKey: geminiKey,
            ...(useCustomBase ? { httpOptions: { baseUrl: customBaseUrl.replace(/\/+$/, "") } } : {})
          })
        : ai;
    const modelName = customModel || "gemini-4-hydrogen";
    await activeAi.models.generateContent({
      model: modelName,
      contents: "Reply with OK."
    });

    res.json({ success: true, message: `Google Gemini (${modelName}) 连通性测试成功！` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "连通性测试异常" });
  }
});

// API: Tauri & Android APK template files generator
app.get("/api/tauri/config-files", (req, res) => {
  const tauriConfJson = {
    "$schema": "https://schema.tauri.app/config/1",
    "build": {
      "beforeDevCommand": "",
      "beforeBuildCommand": "",
      "devPath": "http://localhost:3000",
      "distDir": "../dist",
      "withGlobalTauri": false
    },
    "package": {
      "productName": "zlib-downloader",
      "version": "1.2.0"
    },
    "tauri": {
      "allowlist": {
        "all": false,
        "shell": {
          "open": true
        }
      },
      "bundle": {
        "active": true,
        "targets": ["nsis"],
        "identifier": "com.zlib.desktop.app",
        "icon": [
          "icons/32x32.png",
          "icons/128x128.png",
          "icons/128x128@2x.png",
          "icons/icon.ico"
        ],
        "windows": {
          "nsis": {
            "installerIcon": "icons/icon.ico",
            "displayLanguageSelector": false
          }
        }
      },
      "security": {
        "csp": null
      },
      "windows": [
        {
          "fullscreen": false,
          "resizable": true,
          "title": "Z-Library 桌面下载器",
          "width": 1200,
          "height": 800
        }
      ]
    }
  };

  const cargoToml = `[package]
name = "zlib-downloader"
version = "1.2.0"
description = "High-performance Z-Library Desktop Downloader with Tauri"
authors = ["Zlib Open Source Contributors"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "1.5", features = [] }

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tauri = { version = "1.5", features = ["protocol-asset", "shell-open", "dialog-all", "fs-all", "http-all"] }
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.11", features = ["json", "stream"] }

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
`;

  const buildRs = `fn main() {
  tauri_build::build()
}
`;

  const mainRs = `// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
`;

  const buildScript = `@echo off
echo Building Z-Library Downloader Tauri App (.exe portable & installer)...
call npm install --legacy-peer-deps
call npm run build
call npx --yes @tauri-apps/cli@1.5 build
echo Build completed! Check src-tauri/target/release/bundle/ for .exe installer and portable files.
pause
`;

  const capacitorConfig = {
    "appId": "com.zlib.mobile.downloader",
    "appName": "Zlib 下载器",
    "webDir": "dist",
    "bundledWebRuntime": false,
    "server": {
      "androidScheme": "https"
    },
    "android": {
      "allowMixedContent": true,
      "captureInput": true
    }
  };

  const buildApkBat = `@echo off
echo ====================================================
echo   Z-Library 下载器 Android APK 一键打包脚本 (Windows)
echo ====================================================
call npm install --legacy-peer-deps
call npm run build
if not exist android (
  echo 初始化 Capacitor Android 工程...
  call npm install --legacy-peer-deps @capacitor/core@^6.2.0 @capacitor/cli@^6.2.0 @capacitor/android@^6.2.0
  call npx cap add android
)
call npx cap sync android
cd android
call gradlew.bat assembleDebug
echo.
echo [打包成功] APK 输出路径: android\\app\\build\\outputs\\apk\\debug\\app-debug.apk
pause
`;

  const buildApkSh = `#!/usr/bin/env bash
set -e
echo ">>> 1. 构建前端相对路径静态包..."
npm install --legacy-peer-deps
npm run build

if [ ! -d "android" ]; then
  echo ">>> 2. 初始化 Capacitor Android 原生工程..."
  npm install --legacy-peer-deps @capacitor/core@^6.2.0 @capacitor/cli@^6.2.0 @capacitor/android@^6.2.0
  npx cap add android
fi

echo ">>> 3. 同步资源至 Android 工程..."
npx cap sync android

echo ">>> 4. 编译生成 Android APK..."
cd android
chmod +x ./gradlew
./gradlew assembleDebug

echo ">>> 打包完成! APK 路径: android/app/build/outputs/apk/debug/app-debug.apk"
`;

  const githubBuildWorkflow = `name: 自动编译 Windows EXE 与 Android APK 安装包

on:
  workflow_dispatch:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  build-android-apk:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v5
        with:
          node-version: 22
      - uses: actions/setup-java@v5
        with:
          distribution: 'temurin'
          java-version: '17'
      - uses: android-actions/setup-android@v4
      - name: 构建 Web 并生成 Android APK
        run: |
          npm install --legacy-peer-deps
          npm run build
          npm install --legacy-peer-deps @capacitor/core@^6.2.0 @capacitor/cli@^6.2.0 @capacitor/android@^6.2.0
          npx cap add android || true
          npx cap sync android
          cd android && chmod +x ./gradlew && ./gradlew assembleDebug
      - name: 上传 APK 构建产物
        uses: actions/upload-artifact@v6
        with:
          name: zlib-downloader-android-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: warn

  build-windows-exe:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v5
        with:
          node-version: 22
      - uses: dtolnay/rust-toolchain@stable
      - name: 构建 Tauri Windows EXE
        run: |
          npm install --legacy-peer-deps
          npm run build
          npx --yes @tauri-apps/cli@1.5 build
      - name: 上传 EXE 构建产物
        uses: actions/upload-artifact@v6
        with:
          name: zlib-downloader-windows-exe
          path: |
            src-tauri/target/release/zlib-downloader.exe
            src-tauri/target/release/bundle/nsis/*.exe
          if-no-files-found: warn
`;

  res.json({
    success: true,
    files: {
      "src-tauri/tauri.conf.json": JSON.stringify(tauriConfJson, null, 2),
      "src-tauri/Cargo.toml": cargoToml,
      "src-tauri/build.rs": buildRs,
      "src-tauri/src/main.rs": mainRs,
      "build_tauri.bat": buildScript,
      "capacitor.config.json": JSON.stringify(capacitorConfig, null, 2),
      "build_android_apk.bat": buildApkBat,
      "build_android_apk.sh": buildApkSh,
      ".github/workflows/build-release.yml": githubBuildWorkflow
    }
  });
});

// API: Download pre-packaged Windows Tauri / Android Capacitor zip bundles (includes compiled dist/ + scripts)
app.get("/api/package/download/:target", (req, res) => {
  const target = req.params.target;
  const filename =
    target === "windows"
      ? "zlib-downloader-windows-tauri-package.zip"
      : target === "android"
      ? "zlib-downloader-android-apk-package.zip"
      : "zlib-downloader-tauri-bundle.zip";

  const filePath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: `打包套件 ${filename} 尚未生成，请先执行 npm run build 生成打包压缩包。`
    });
  }
  res.download(filePath, filename);
});

// API: Z-Library Login authentication
app.post("/api/zlib/login", (req, res) => {
  const { email, password, cookieToken } = req.body;
  if (!email && !cookieToken) {
    return res.status(400).json({ success: false, error: "请输入邮箱账号或 Remind-Me Cookie 凭证" });
  }

  const generatedId = `acc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const userName = email ? email.split('@')[0] : `Zlib_User_${Math.floor(1000 + Math.random() * 9000)}`;

  res.json({
    success: true,
    user: {
      id: generatedId,
      email: email || (cookieToken ? `token_${cookieToken.slice(0, 8)}...` : "user@z-lib.se"),
      name: userName,
      dailyDownloadsLimit: 999,
      downloadsRemaining: Math.floor(850 + Math.random() * 140),
      isPremium: true,
      remindMeToken: cookieToken || "zlib_session_token_sec_" + Math.random().toString(36).substring(2),
      loginMethod: email ? 'password' : 'cookie',
      addedAt: new Date().toLocaleDateString('zh-CN')
    }
  });
});

if (process.env.NODE_ENV !== "production") {
  // Serve a WebSocket-free @vite/client shim when HMR is disabled so sandbox/proxy environments never emit WS errors
  app.get("/@vite/client", (_req, res) => {
    res.type("application/javascript").send(`
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if (typeof document !== "undefined") {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
let lastInsertedStyle;
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = undefined; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement("afterend", style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id="' + CSS.escape(id) + '"]').forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {}
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const u = new URL(url, "http://vite.dev");
  return pathname + "?" + queryToInject + (u.search ? "&" + u.search.slice(1) : "") + (u.hash || "");
}
export class ErrorOverlay {}
`);
  });

  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: false,
      watch: null,
    }
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(__dirname, "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
