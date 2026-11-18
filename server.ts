import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { spawn } from "child_process";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

function getLocalDownloadsDir(): string {
  const candidates = [
    path.resolve(os.homedir(), "Downloads", "ZLibraryDownloads"),
    path.resolve(process.cwd(), "ZLibraryDownloads")
  ];
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    } catch {
      // try next fallback
    }
  }
  return process.cwd();
}

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

// Z-Library Book Schema (strictly parsed from active mirror URL)
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
  detailUrl?: string;
  downloadUrl?: string;
  sourceMirror?: string;
}

const DEFAULT_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function normalizeMirrorUrl(raw?: string): string {
  const cleaned = (raw || "https://z-lib.id").trim().replace(/\/+$/, "");
  if (!cleaned) return "https://z-lib.id";
  return cleaned.startsWith("http://") || cleaned.startsWith("https://")
    ? cleaned
    : `https://${cleaned}`;
}

function formatZlibCookie(token?: string): string {
  const raw = (token || "")
    .trim()
    .replace(/^Cookie:\s*/i, "")
    .replace(/\r?\n+/g, "; ")
    .trim();
  if (!raw) return "";
  if (raw.includes("=")) return raw;
  return `zlibrary_session=${raw}; remind_me=${raw}; remix_userkey=${raw}`;
}

function parseCookieMeta(cookieStr: string): {
  remixUserId: string;
  remixUserKey: string;
  zlibrarySession: string;
  remindMe: string;
} {
  const getVal = (name: string) => {
    const m = cookieStr.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`, "i"));
    return m ? m[1].trim() : "";
  };
  return {
    remixUserId: getVal("remix_userid"),
    remixUserKey: getVal("remix_userkey"),
    zlibrarySession: getVal("zlibrary_session"),
    remindMe: getVal("remind_me")
  };
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "));
}

function extractAttr(tag: string, attrName: string): string {
  const re = new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i");
  const m = tag.match(re);
  return m ? decodeHtmlEntities(m[1] ?? m[2] ?? "") : "";
}

function resolveUrl(raw: string, base: string): string {
  const v = (raw || "").trim();
  if (!v || v.startsWith("data:image/gif")) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("//")) return `https:${v}`;
  if (v.startsWith("/")) return `${base}${v}`;
  return `${base}/${v}`;
}

function formatMirrorNetworkError(err: any, mirrorBase: string): string {
  const code = err?.cause?.code || err?.code || "";
  const msg = String(err?.cause?.message || err?.message || err || "");
  if (code === "CERT_HAS_EXPIRED" || /certificate has expired/i.test(msg)) {
    return `镜像节点 (${mirrorBase}) SSL 证书已过期，节点不可用。请一键切换至在线镜像 (https://z-lib.id) 重试。`;
  }
  if (code === "ENOTFOUND" || /getaddrinfo ENOTFOUND/i.test(msg)) {
    return `镜像节点 (${mirrorBase}) 域名解析失败或已下线。请一键切换至在线镜像 (https://z-lib.id) 重试。`;
  }
  if (/redirect count exceeded/i.test(msg)) {
    return `镜像节点 (${mirrorBase}) 触发反爬重定向校验，无法直接抓取。请一键切换至 https://z-lib.id 或在浏览器打开搜索页。`;
  }
  if (err?.name === "AbortError" || /aborted|timeout/i.test(msg)) {
    return `连接镜像节点 (${mirrorBase}) 超时，请一键切换至可用镜像 (https://z-lib.id) 重试。`;
  }
  return `无法连接镜像节点 (${mirrorBase})：${msg}。请尝试切换至可用镜像 (https://z-lib.id) 或点击下方按钮直接打开镜像网页搜索。`;
}

async function fetchWithCookieJar(
  url: string,
  opts: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    cookie?: string;
    timeoutMs?: number;
    maxRedirects?: number;
  } = {}
): Promise<{ res: Response; finalUrl: string; cookieHeader: string; setCookies: string[] }> {
  const cookieMap = new Map<string, string>();
  const seed = (opts.cookie || "").trim();
  if (seed) {
    seed.split(";").forEach((part) => {
      const idx = part.indexOf("=");
      if (idx > 0) {
        cookieMap.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
      }
    });
  }

  const allSetCookies: string[] = [];
  let currentUrl = url;
  let method = opts.method || "GET";
  let body = opts.body;
  const maxRedirects = opts.maxRedirects ?? 6;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const cookieStr = Array.from(cookieMap.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);

    try {
      const reqHeaders: Record<string, string> = {
        "User-Agent": DEFAULT_BROWSER_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        ...(opts.headers || {})
      };
      if (cookieStr) {
        reqHeaders["Cookie"] = cookieStr;
      }

      const res = await fetch(currentUrl, {
        method,
        headers: reqHeaders,
        body: method === "GET" || method === "HEAD" ? undefined : body,
        redirect: "manual",
        signal: controller.signal
      });
      clearTimeout(timer);

      const getSetCookie = (res.headers as any).getSetCookie?.bind(res.headers);
      const setCookies: string[] = getSetCookie ? getSetCookie() : [];
      if (!setCookies.length) {
        const single = res.headers.get("set-cookie");
        if (single) setCookies.push(single);
      }

      for (const sc of setCookies) {
        allSetCookies.push(sc);
        const pair = sc.split(";")[0];
        const eq = pair.indexOf("=");
        if (eq > 0) {
          cookieMap.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
        }
      }

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get("location");
        if (loc && hop < maxRedirects) {
          currentUrl = new URL(loc, currentUrl).toString();
          if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === "POST")) {
            method = "GET";
            body = undefined;
          }
          continue;
        }
      }

      const finalCookieHeader = Array.from(cookieMap.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
      return { res, finalUrl: currentUrl, cookieHeader: finalCookieHeader, setCookies: allSetCookies };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  throw new Error("Redirect count exceeded");
}

function isCfChallenge(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("just a moment...") ||
    lower.includes("cf-browser-verification") ||
    lower.includes("challenge-platform") ||
    lower.includes("attention required! | cloudflare") ||
    lower.includes("enable javascript and cookies to continue") ||
    lower.includes("verifying your browser | diamwall") ||
    lower.includes("__diamwall")
  );
}

function parseZlibMirrorHtmlServer(html: string, mirrorBase: string): Book[] {
  const books: Book[] = [];
  const seenIds = new Set<string>();

  // Strategy 1: Modern <z-bookcard ...>...</z-bookcard>
  const cardRe = /<z-bookcard\b([^>]*)>([\s\S]*?)<\/z-bookcard>/gi;
  let match: RegExpExecArray | null;
  while ((match = cardRe.exec(html)) !== null) {
    const attrs = match[1] || "";
    const inner = match[2] || "";

    const id = extractAttr(attrs, "id") || `zlib-${books.length + 1}`;
    if (seenIds.has(id)) continue;

    const titleSlot = inner.match(/<[^>]*slot=["']title["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
    const authorSlot = inner.match(/<[^>]*slot=["']author["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
    const noteSlot = inner.match(/<[^>]*slot=["']note["'][^>]*>([\s\S]*?)<\/[^>]+>/i);

    const title = titleSlot ? stripTags(titleSlot[1]) : extractAttr(attrs, "title");
    if (!title) continue;

    seenIds.add(id);
    const author = (authorSlot ? stripTags(authorSlot[1]) : extractAttr(attrs, "author")) || "未知作者";
    const href = extractAttr(attrs, "href");
    const dlAttr = extractAttr(attrs, "download");

    const imgMatch = inner.match(/<img\b([^>]*)>/i);
    const imgAttrs = imgMatch ? imgMatch[1] : "";
    const rawCover =
      extractAttr(imgAttrs, "data-src") ||
      extractAttr(imgAttrs, "src") ||
      extractAttr(attrs, "cover");

    const ext = (extractAttr(attrs, "extension") || "pdf").replace(/^\./, "").toLowerCase();
    const filesize = extractAttr(attrs, "filesize") || "未知大小";
    const year = extractAttr(attrs, "year") || "-";
    const publisher = extractAttr(attrs, "publisher") || "Z-Library";
    const language = extractAttr(attrs, "language") || "未知";
    const ratingNum = parseFloat(extractAttr(attrs, "rating") || "0");
    const quality = extractAttr(attrs, "quality");
    const isbn = extractAttr(attrs, "isbn");
    const pages = extractAttr(attrs, "pages");

    books.push({
      id,
      title,
      author,
      year,
      publisher,
      extension: ext || "pdf",
      filesize,
      language,
      rating: Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum : 0,
      coverUrl: resolveUrl(rawCover, mirrorBase),
      description: noteSlot ? stripTags(noteSlot[1]) : "",
      downloadsCount: 0,
      isbn: isbn || undefined,
      pages: pages || undefined,
      quality: quality || undefined,
      detailUrl: href ? resolveUrl(href, mirrorBase) : mirrorBase,
      downloadUrl: dlAttr ? resolveUrl(dlAttr, mirrorBase) : undefined,
      sourceMirror: mirrorBase
    });
  }

  if (books.length > 0) return books;

  // Strategy 2: Classic resItemBox blocks (supports z-lib.id & classic mirrors)
  const boxRe = /<div\b([^>]*class=["'][^"']*resItemBox[^"']*["'][^>]*)>([\s\S]*?)(?=<div\b[^>]*class=["'][^"']*resItemBox|$)/gi;
  while ((match = boxRe.exec(html)) !== null) {
    const boxAttrs = match[1] || "";
    const block = match[2] || "";
    const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a\b([^>]*)>([\s\S]*?)<\/a>/i) ||
      block.match(/<a\b([^>]*href=["']\/book\/[^"']*["'][^>]*)>([\s\S]*?)<\/a>/i);
    if (!titleMatch) continue;

    const title = stripTags(titleMatch[2]);
    if (!title) continue;
    const href = extractAttr(titleMatch[1], "href");
    const bookIdAttr = extractAttr(boxAttrs, "data-book_id");
    const isbnAttr = extractAttr(boxAttrs, "data-isbn");
    const idMatch = href.match(/\/book\/([^/?#]+)/);
    const id = bookIdAttr || (idMatch ? idMatch[1] : `zlib-${books.length + 1}`);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const authorsBlockMatch = block.match(/<div[^>]*class=["'][^"']*authors[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const authorSource = authorsBlockMatch ? authorsBlockMatch[1] : block;
    const authorMatches = [...authorSource.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)];
    const author = authorMatches.map((m) => stripTags(m[1])).filter(Boolean).join(", ") || "未知作者";

    const imgMatch = block.match(/<img\b([^>]*)>/i);
    const rawCover = imgMatch
      ? extractAttr(imgMatch[1], "data-src") || extractAttr(imgMatch[1], "src")
      : "";

    const yearMatch = block.match(/property_year[\s\S]*?property_value[^>]*>([\s\S]*?)<\/div>/i);
    const langMatch = block.match(/property_language[\s\S]*?property_value[^>]*>([\s\S]*?)<\/div>/i);
    const pubMatch = block.match(/property_publisher[\s\S]*?property_value[^>]*>([\s\S]*?)<\/div>/i) ||
      block.match(/<a[^>]*title=["'][^"']*Publisher[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    const fileMatch = block.match(/property__file[\s\S]*?property_value[^>]*>([\s\S]*?)<\/div>/i);
    const [rawExt, rawSize] = (fileMatch ? stripTags(fileMatch[1]) : "").split(",").map((s) => s.trim());

    books.push({
      id,
      title,
      author,
      year: yearMatch ? stripTags(yearMatch[1]) : "-",
      publisher: pubMatch ? stripTags(pubMatch[1]) : "Z-Library",
      extension: (rawExt || "pdf").toLowerCase(),
      filesize: rawSize || "见详情页",
      language: langMatch ? stripTags(langMatch[1]) : "未知",
      rating: 0,
      coverUrl: resolveUrl(rawCover, mirrorBase),
      description: "",
      downloadsCount: 0,
      isbn: isbnAttr || undefined,
      detailUrl: href ? resolveUrl(href, mirrorBase) : mirrorBase,
      sourceMirror: mirrorBase
    });
  }

  return books;
}

// Active mirrors list (verified live mirrors prioritized first)
let mirrors = [
  { id: "m-1", url: "https://z-lib.id", status: "online", latency: "120ms", active: true },
  { id: "m-2", url: "https://z-lib.cc", status: "online", latency: "160ms", active: false },
  { id: "m-3", url: "https://z-library.sk", status: "unstable", latency: "待测速", active: false },
  { id: "m-4", url: "https://1lib.sk", status: "unstable", latency: "待测速", active: false }
];

// API: Real Z-Library Mirror Search (supports both /s?q=... and /s/... with cookie-jar & error diagnosis)
function buildServerSearchUrls(
  mirrorBase: string,
  searchTerm: string,
  opts: { lang: string; ext: string; exact: boolean; yearFrom: string; yearTo: string; page: number }
): string[] {
  const applyParams = (u: URL) => {
    if (opts.lang !== "all") u.searchParams.append("languages[]", opts.lang.toLowerCase());
    if (opts.ext !== "all") u.searchParams.append("extensions[]", opts.ext.toUpperCase());
    if (opts.exact) u.searchParams.set("e", "1");
    if (opts.yearFrom) u.searchParams.set("yearFrom", opts.yearFrom);
    if (opts.yearTo) u.searchParams.set("yearTo", opts.yearTo);
    if (opts.page > 1) u.searchParams.set("page", String(opts.page));
    return u.toString();
  };

  if (!searchTerm) return [applyParams(new URL(`${mirrorBase}/`))];

  const queryStyle = new URL(`${mirrorBase}/s`);
  queryStyle.searchParams.set("q", searchTerm);
  const pathStyle = new URL(`${mirrorBase}/s/${encodeURIComponent(searchTerm)}`);

  const preferQuery = /z-lib\.id|z-lib\.cc/i.test(mirrorBase);
  return preferQuery
    ? [applyParams(queryStyle), applyParams(pathStyle)]
    : [applyParams(pathStyle), applyParams(queryStyle)];
}

app.get("/api/zlib/search", async (req, res) => {
  const query = ((req.query.q as string) || "").trim();
  const field = ((req.query.field as string) || "all").toLowerCase();
  const lang = (req.query.lang as string) || "all";
  const ext = (req.query.ext as string) || "all";
  const yearFrom = (req.query.yearFrom as string) || "";
  const yearTo = (req.query.yearTo as string) || "";
  const exact = req.query.exact === "true";
  const page = parseInt((req.query.page as string) || "1", 10) || 1;
  const mirrorBase = normalizeMirrorUrl((req.query.mirrorUrl as string) || mirrors.find((m) => m.active)?.url);
  const cookieHeader = ((req.headers["x-zlib-cookie"] as string) || "").trim();

  let searchTerm = query;
  if (query && field === "author") searchTerm = `author:${query}`;
  else if (query && field === "isbn") searchTerm = query.replace(/\s+/g, "");
  else if (query && field === "publisher") searchTerm = `publisher:${query}`;

  const candidateUrls = buildServerSearchUrls(mirrorBase, searchTerm, {
    lang,
    ext,
    exact,
    yearFrom,
    yearTo,
    page
  });
  let mirrorSearchUrl = candidateUrls[0];

  try {
    let html = "";
    let upstreamStatus = 0;
    let ok = false;

    for (const url of candidateUrls) {
      mirrorSearchUrl = url;
      const { res: upstream } = await fetchWithCookieJar(url, {
        headers: { Referer: `${mirrorBase}/` },
        cookie: cookieHeader
      });
      upstreamStatus = upstream.status;
      ok = upstream.ok;
      html = await upstream.text();
      if (upstreamStatus !== 404) break;
    }

    if (isCfChallenge(html) || upstreamStatus === 403 || upstreamStatus === 503 || upstreamStatus === 513) {
      return res.json({
        success: false,
        books: [],
        total: 0,
        mirrorUrl: mirrorBase,
        mirrorSearchUrl,
        blockedByCloudflare: true,
        error: `镜像节点 (${mirrorBase}) 触发了人机拦截 (HTTP ${upstreamStatus})。建议一键切换至可用镜像 (https://z-lib.id)，或点击下方按钮在浏览器完成验证。`
      });
    }

    if (!ok) {
      return res.json({
        success: false,
        books: [],
        total: 0,
        mirrorUrl: mirrorBase,
        mirrorSearchUrl,
        error: `镜像节点 (${mirrorBase}) 返回 HTTP ${upstreamStatus}，请切换其他可用镜像节点（如 https://z-lib.id）重试。`
      });
    }

    const parsedBooks = parseZlibMirrorHtmlServer(html, mirrorBase);
    return res.json({
      success: true,
      books: parsedBooks,
      total: parsedBooks.length,
      mirrorUrl: mirrorBase,
      mirrorSearchUrl
    });
  } catch (err: any) {
    return res.json({
      success: false,
      books: [],
      total: 0,
      mirrorUrl: mirrorBase,
      mirrorSearchUrl,
      error: formatMirrorNetworkError(err, mirrorBase)
    });
  }
});

// API: Real Mirror File Download / Export Proxy
app.get("/api/zlib/download", async (req, res) => {
  const rawTarget = ((req.query.url as string) || "").trim();
  const mirrorBase = normalizeMirrorUrl((req.query.mirrorUrl as string) || "https://z-lib.id");
  const cookieRaw = ((req.query.cookie as string) || "").trim();
  const filename = ((req.query.filename as string) || "zlib-book.pdf").replace(/[\\/:*?"<>|]/g, "_");

  if (!rawTarget) {
    return res.status(400).json({ success: false, error: "缺少书籍下载链接" });
  }

  const targetUrl = resolveUrl(rawTarget, mirrorBase);

  try {
    let downloadTarget = targetUrl;
    if (!targetUrl.includes("/dl/")) {
      const { res: detailRes } = await fetchWithCookieJar(targetUrl, {
        headers: { Referer: `${mirrorBase}/` },
        cookie: cookieRaw
      });
      const detailHtml = await detailRes.text();
      if (isCfChallenge(detailHtml) || detailRes.status === 403 || detailRes.status === 513) {
        return res.status(403).json({
          success: false,
          requiresBrowser: true,
          targetUrl,
          error: `镜像站 (${mirrorBase}) 需要人机验证，请点击跳转在浏览器中下载。`
        });
      }
      const dlMatch = detailHtml.match(/href=["']([^"']*\/dl\/[^"']+)["']/i) ||
        detailHtml.match(/href=["']([^"']*download[^"']*\.(?:pdf|epub|mobi|azw3|zip)[^"']*)["']/i);
      if (dlMatch) {
        downloadTarget = resolveUrl(dlMatch[1], mirrorBase);
      } else {
        const needsLogin = /href=["'][^"']*\/login["'][^>]*>[\s\S]{0,80}Login/i.test(detailHtml);
        return res.status(400).json({
          success: false,
          requiresBrowser: true,
          targetUrl,
          error: needsLogin
            ? `镜像站 (${mirrorBase}) 要求登录账号后才提供下载直链，将在浏览器打开原书页供登录下载。`
            : `未在镜像详情页提取到直链（可能需先登录或今日配额已用完），将在浏览器为您打开原书页。`
        });
      }
    }

    const { res: fileRes } = await fetchWithCookieJar(downloadTarget, {
      headers: { Referer: targetUrl },
      cookie: cookieRaw,
      timeoutMs: 30000
    });
    const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
    if (!fileRes.ok || contentType.includes("text/html")) {
      return res.status(403).json({
        success: false,
        requiresBrowser: true,
        targetUrl: downloadTarget,
        error: `镜像站未直接下发文件流（可能需账号权限确认或人机验证），请在浏览器中打开继续下载。`
      });
    }

    const arrayBuf = await fileRes.arrayBuffer();
    const fileBuf = Buffer.from(arrayBuf);
    let savedPath = "";
    try {
      const targetDir = getLocalDownloadsDir();
      savedPath = path.join(targetDir, filename);
      fs.writeFileSync(savedPath, fileBuf);
    } catch {
      savedPath = "";
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    if (savedPath) {
      res.setHeader("X-Saved-Path", encodeURIComponent(savedPath));
    }
    return res.send(fileBuf);
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      requiresBrowser: true,
      targetUrl,
      error: `下载导出失败：${formatMirrorNetworkError(err, mirrorBase)}`
    });
  }
});

// API: Open or list local ZLibraryDownloads folder
function listLocalDownloadFiles(dir: string) {
  try {
    return fs
      .readdirSync(dir)
      .map((name) => {
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (!stat.isFile()) return null;
        return {
          name,
          size: stat.size,
          path: full,
          mtime: stat.mtime.toISOString()
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

app.post("/api/system/open-folder", (_req, res) => {
  const dir = getLocalDownloadsDir();
  const files = listLocalDownloadFiles(dir);
  const hasDesktopGui =
    process.platform === "win32" ||
    process.platform === "darwin" ||
    Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);

  if (!hasDesktopGui) {
    return res.json({
      success: true,
      opened: false,
      headless: true,
      path: dir,
      files
    });
  }

  try {
    const cmd =
      process.platform === "win32"
        ? "explorer"
        : process.platform === "darwin"
        ? "open"
        : "xdg-open";
    const child = spawn(cmd, [dir], { detached: true, stdio: "ignore" });
    child.unref();
    return res.json({
      success: true,
      opened: true,
      headless: false,
      path: dir,
      files
    });
  } catch (err: any) {
    return res.json({
      success: true,
      opened: false,
      headless: true,
      path: dir,
      files,
      error: err?.message
    });
  }
});

app.get("/api/system/local-files", (_req, res) => {
  const dir = getLocalDownloadsDir();
  res.json({ success: true, path: dir, files: listLocalDownloadFiles(dir) });
});

app.get("/api/system/local-file", (req, res) => {
  const rawName = String(req.query.name || "");
  const safeName = path.basename(rawName);
  if (!safeName) {
    return res.status(400).json({ success: false, error: "缺少文件名" });
  }
  const dir = getLocalDownloadsDir();
  const fullPath = path.resolve(dir, safeName);
  if (!fullPath.startsWith(dir) || !fs.existsSync(fullPath)) {
    return res.status(404).json({ success: false, error: "本地书库文件不存在" });
  }
  const ext = path.extname(safeName).toLowerCase();
  const mime =
    ext === ".pdf"
      ? "application/pdf"
      : ext === ".epub"
      ? "application/epub+zip"
      : ext === ".txt"
      ? "text/plain; charset=utf-8"
      : ext === ".html" || ext === ".htm"
      ? "text/html; charset=utf-8"
      : "application/octet-stream";
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`);
  return res.sendFile(fullPath);
});

// API: Get mirrors
app.get("/api/zlib/mirrors", (req, res) => {
  res.json({ success: true, mirrors });
});

// API: Real Latency Check for Mirrors (detects SSL errors, parked redirects, and DiamWall/CF)
app.post("/api/zlib/mirrors/test", async (req, res) => {
  const inputMirrors = Array.isArray(req.body?.mirrors) && req.body.mirrors.length > 0 ? req.body.mirrors : mirrors;

  const tested = await Promise.all(
    inputMirrors.map(async (m: any) => {
      const target = normalizeMirrorUrl(m.url);
      const t0 = Date.now();
      try {
        const { res: upstream, finalUrl } = await fetchWithCookieJar(target, { timeoutMs: 5500 });
        const ms = Math.max(20, Date.now() - t0);
        const origHost = new URL(target).hostname.replace(/^www\./, "");
        const finalHost = new URL(finalUrl).hostname.replace(/^www\./, "");
        // Detect parked domain redirects (e.g. z-lib.is -> ad domain)
        if (!finalHost.includes(origHost) && !origHost.includes(finalHost)) {
          return {
            ...m,
            status: "offline",
            latency: "域名已跳转失效"
          };
        }
        if (upstream.status === 403 || upstream.status === 503 || upstream.status === 513) {
          return {
            ...m,
            status: "unstable",
            latency: `${ms}ms (需验证)`
          };
        }
        const ok = upstream.status >= 200 && upstream.status < 400;
        return {
          ...m,
          status: ok ? (ms < 1500 ? "online" : "unstable") : "offline",
          latency: ok ? `${ms}ms` : `HTTP ${upstream.status}`
        };
      } catch (err: any) {
        const code = err?.cause?.code || err?.code || "";
        return {
          ...m,
          status: "offline",
          latency: code === "CERT_HAS_EXPIRED" ? "证书过期" : code === "ENOTFOUND" ? "域名失效" : "超时/不可达"
        };
      }
    })
  );

  mirrors = tested;
  res.json({ success: true, mirrors: tested });
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
      "withGlobalTauri": true
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

  const mainRs = fs.existsSync(path.resolve(process.cwd(), "src-tauri/src/main.rs"))
    ? fs.readFileSync(path.resolve(process.cwd(), "src-tauri/src/main.rs"), "utf8")
    : `// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
`;

  const buildScript = `@echo off
chcp 65001 >nul
echo ========================================================
echo   Z-Library 下载器 - Tauri Windows .EXE 一键构建脚本
echo ========================================================
where node >nul 2>nul || (echo [错误] 未检测到 Node.js，请先安装 Node.js 20/22+ & pause & exit /b 1)
where cargo >nul 2>nul || (echo [错误] 未检测到 Rust Cargo，请先安装 Rustup: https://rustup.rs/ & pause & exit /b 1)

echo [1/3] 安装 npm 依赖...
call npm install --legacy-peer-deps || (echo [错误] npm 依赖安装失败 & pause & exit /b 1)

echo [2/3] 编译 Vite 前端生产资源 (dist/)...
call npm run build || (echo [错误] 前端编译失败 & pause & exit /b 1)

echo [3/3] 编译 Tauri v1.5 原生 Windows .EXE 与 NSIS 安装包...
call npx --yes @tauri-apps/cli@1.5 build || (echo [错误] Tauri Rust 构建失败 & pause & exit /b 1)

echo ========================================================
echo [打包完成] 请在以下路径获取成品:
echo   便携版 EXE: src-tauri\\target\\release\\zlib-downloader.exe
echo   安装版 EXE: src-tauri\\target\\release\\bundle\\nsis\\
echo ========================================================
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
chcp 65001 >nul
echo ====================================================
echo   Z-Library 下载器 Android APK 一键打包脚本 (Windows)
echo ====================================================
where node >nul 2>nul || (echo [错误] 未检测到 Node.js 20/22+ & pause & exit /b 1)
where java >nul 2>nul || (echo [错误] 未检测到 JDK 17，请先安装 Temurin/Adoptium JDK 17 & pause & exit /b 1)

echo [1/4] 安装项目依赖并构建前端相对路径产物...
call npm install --legacy-peer-deps || (pause & exit /b 1)
call npm run build || (pause & exit /b 1)

if not exist android (
  echo [2/4] 初始化 Capacitor v6 Android 原生工程...
  call npm install --legacy-peer-deps @capacitor/core@^6.2.0 @capacitor/cli@^6.2.0 @capacitor/android@^6.2.0 || (pause & exit /b 1)
  call npx cap add android || (pause & exit /b 1)
) else (
  echo [2/4] 检测到已有 android 工程，跳过初始化...
)

echo [3/4] 同步 dist/ 至 Android WebView 资源目录...
call npx cap sync android || (pause & exit /b 1)

echo [4/4] 调用 Gradle 编译 Android APK...
cd android
call gradlew.bat assembleDebug || (cd .. & pause & exit /b 1)
cd ..
echo.
echo [打包成功] APK 输出路径: android\\app\\build\\outputs\\apk\\debug\\app-debug.apk
pause
`;

  const buildApkSh = `#!/usr/bin/env bash
set -e
echo ">>> [1/4] 安装依赖并构建前端相对路径静态包..."
command -v node >/dev/null 2>&1 || { echo "[错误] 请先安装 Node.js 20/22+"; exit 1; }
command -v java >/dev/null 2>&1 || { echo "[错误] 请先安装 JDK 17"; exit 1; }

npm install --legacy-peer-deps
npm run build

if [ ! -d "android" ]; then
  echo ">>> [2/4] 初始化 Capacitor v6 Android 原生工程..."
  npm install --legacy-peer-deps @capacitor/core@^6.2.0 @capacitor/cli@^6.2.0 @capacitor/android@^6.2.0
  npx cap add android
else
  echo ">>> [2/4] 已检测到 android/ 目录，跳过初始化..."
fi

echo ">>> [3/4] 同步资源至 Android 工程..."
npx cap sync android

echo ">>> [4/4] 编译生成 Android APK..."
cd android
chmod +x ./gradlew
./gradlew assembleDebug
cd ..

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

  const readOrFallback = (relPath: string, fallback: string) => {
    try {
      const p = path.resolve(process.cwd(), relPath);
      if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
    } catch {
      // ignore
    }
    return fallback;
  };

  res.json({
    success: true,
    files: {
      "src-tauri/tauri.conf.json": readOrFallback("src-tauri/tauri.conf.json", JSON.stringify(tauriConfJson, null, 2)),
      "src-tauri/Cargo.toml": readOrFallback("src-tauri/Cargo.toml", cargoToml),
      "src-tauri/build.rs": readOrFallback("src-tauri/build.rs", buildRs),
      "src-tauri/src/main.rs": mainRs,
      "build_tauri.bat": readOrFallback("build_tauri.bat", buildScript),
      "capacitor.config.json": readOrFallback("capacitor.config.json", JSON.stringify(capacitorConfig, null, 2)),
      "build_android_apk.bat": readOrFallback("build_android_apk.bat", buildApkBat),
      "build_android_apk.sh": readOrFallback("build_android_apk.sh", buildApkSh),
      ".github/workflows/deploy.yml": readOrFallback(".github/workflows/deploy.yml", "# GitHub Pages relative-path deploy workflow"),
      ".github/workflows/build-release.yml": readOrFallback(".github/workflows/build-release.yml", githubBuildWorkflow),
      "vite.config.ts": readOrFallback("vite.config.ts", ""),
      "vercel.json": readOrFallback("vercel.json", "{}"),
      "netlify.toml": readOrFallback("netlify.toml", ""),
      ".npmrc": readOrFallback(".npmrc", "legacy-peer-deps=true\n")
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

// API: Z-Library Mirror Login & Cookie Verification (Supports both /api/auth-status + /login and classic /rpc.php; non-VIP 10/day)
app.post("/api/zlib/login", async (req, res) => {
  const email = (req.body?.email || "").trim();
  const password = req.body?.password || "";
  const cookieToken = (req.body?.cookieToken || "").trim();
  const mirrorBase = normalizeMirrorUrl(req.body?.mirrorUrl || mirrors.find((m) => m.active)?.url);

  if (!email && !cookieToken) {
    return res.status(400).json({ success: false, error: "请输入邮箱账号或 Cookie 凭证" });
  }

  try {
    if (email && password) {
      // Check if mirror uses modern /api/auth-status + /login (e.g. z-lib.id)
      let authMeta: any = null;
      let sessionCookie = "";
      try {
        const { res: statusRes, cookieHeader } = await fetchWithCookieJar(`${mirrorBase}/api/auth-status`, {
          headers: { Referer: `${mirrorBase}/login`, Accept: "application/json" },
          timeoutMs: 8000
        });
        sessionCookie = cookieHeader;
        const ct = statusRes.headers.get("content-type") || "";
        if (statusRes.ok && ct.includes("application/json")) {
          authMeta = await statusRes.json();
        }
      } catch {
        authMeta = null;
      }

      if (authMeta && authMeta.csrf_token) {
        const formBody = new URLSearchParams({
          _token: String(authMeta.csrf_token),
          email,
          password
        }).toString();

        const { res: loginRes, cookieHeader: afterCookie } = await fetchWithCookieJar(`${mirrorBase}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: `${mirrorBase}/login`,
            Origin: mirrorBase
          },
          body: formBody,
          cookie: sessionCookie
        });
        const loginHtml = await loginRes.text();

        // Check updated auth-status
        const { res: verifyRes } = await fetchWithCookieJar(`${mirrorBase}/api/auth-status`, {
          headers: { Accept: "application/json" },
          cookie: afterCookie
        });
        const verifyJson: any = await verifyRes.json().catch(() => null);

        if (verifyJson?.authenticated && verifyJson?.user) {
          const u = verifyJson.user;
          return res.json({
            success: true,
            user: {
              id: `acc_${Date.now()}`,
              email: u.email || email,
              name: u.name || email.split("@")[0],
              dailyDownloadsLimit: 10,
              downloadsRemaining: 10,
              isPremium: false,
              remindMeToken: afterCookie,
              loginMethod: "password",
              addedAt: new Date().toLocaleDateString("zh-CN"),
              mirrorUrl: mirrorBase,
              verified: true
            }
          });
        }

        if (/cf-turnstile|turnstile|captcha/i.test(loginHtml) || isCfChallenge(loginHtml)) {
          return res.status(403).json({
            success: false,
            error: `镜像站 (${mirrorBase}) 的账号密码登录页启用了人机验证码 (Turnstile/Captcha)，客户端无法直接代填验证码。请点击上方「在浏览器打开」完成登录后复制 Cookie 导入。`
          });
        }

        const errMatch = loginHtml.match(/class=["'][^"']*(?:alert-danger|error|invalid-feedback)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
        const errText = errMatch ? stripTags(errMatch[1]) : "";
        return res.status(401).json({
          success: false,
          error: errText || `镜像站 (${mirrorBase}) 账号或密码校验未通过，如该站开启了人机验证请改用浏览器登录后导入 Cookie。`
        });
      }

      // Classic Z-Library /rpc.php flow
      const formBody = new URLSearchParams({
        isModal: "true",
        email,
        password,
        action: "login",
        redirectUrl: "",
        gg_json_mode: "1"
      }).toString();

      const { res: upstream, setCookies } = await fetchWithCookieJar(`${mirrorBase}/rpc.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Referer: mirrorBase,
          Origin: mirrorBase
        },
        body: formBody
      });

      const bodyText = await upstream.text();
      if (isCfChallenge(bodyText) || upstream.status === 403 || upstream.status === 513) {
        return res.status(403).json({
          success: false,
          error: `镜像站 (${mirrorBase}) 触发了人机验证 (HTTP ${upstream.status})，无法直接提交账号密码。请先在浏览器打开镜像登录后提取 Cookie 免密导入。`
        });
      }

      let parsed: any = null;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = null;
      }

      const respErr = parsed?.response?.validationError || parsed?.errors?.[0]?.message || parsed?.error;
      if (respErr) {
        return res.status(401).json({ success: false, error: `镜像站 (${mirrorBase}) 返回：${respErr}` });
      }

      const extractedCookie = setCookies
        .map((c) => c.split(";")[0].trim())
        .filter(Boolean)
        .join("; ");

      if (!extractedCookie && parsed?.response?.user_id === undefined) {
        return res.status(401).json({
          success: false,
          error: `镜像站 (${mirrorBase}) 未返回登录会话凭证（HTTP ${upstream.status}），请改用浏览器登录后提取 Cookie 导入，或切换到 https://z-lib.id。`
        });
      }

      return res.json({
        success: true,
        user: {
          id: `acc_${Date.now()}`,
          email,
          name: email.split("@")[0],
          dailyDownloadsLimit: 10,
          downloadsRemaining: 10,
          isPremium: false,
          remindMeToken: extractedCookie || cookieToken,
          loginMethod: "password",
          addedAt: new Date().toLocaleDateString("zh-CN"),
          mirrorUrl: mirrorBase,
          verified: true
        }
      });
    }

    // Cookie verification against active mirror
    const formattedCookie = formatZlibCookie(cookieToken);
    const cookieMeta = parseCookieMeta(formattedCookie);
    const mirrorHost = mirrorBase.replace(/^https?:\/\//, "");
    const defaultName = cookieMeta.remixUserId ? `Z-Lib (${cookieMeta.remixUserId})` : "Z-Lib 账号";
    const defaultEmail = cookieMeta.remixUserId
      ? `UID ${cookieMeta.remixUserId} (${mirrorHost})`
      : `Cookie (${mirrorHost})`;
    const isZlibIdCluster = /z-lib\.id|z-lib\.cc/i.test(mirrorBase);

    // If user imported official-cluster remix_userid + remix_userkey while active mirror is z-lib.id/z-lib.cc,
    // save immediately with an accurate cross-cluster explanation instead of triggering false auth-status warning.
    if (isZlibIdCluster && cookieMeta.remixUserId && cookieMeta.remixUserKey && !cookieMeta.zlibrarySession) {
      return res.json({
        success: true,
        warning: `已成功保存官方集群凭证 (remix_userid: ${cookieMeta.remixUserId})！该凭证用于 z-library.sk / 1lib.sk 等官方镜像；当前检索节点 (${mirrorBase}) 无需登录即可搜书，若要校验该凭证实时配额可切换至官方节点。`,
        user: {
          id: `acc_${Date.now()}`,
          email: defaultEmail,
          name: defaultName,
          dailyDownloadsLimit: 10,
          downloadsRemaining: 10,
          isPremium: false,
          remindMeToken: formattedCookie,
          loginMethod: "cookie",
          addedAt: new Date().toLocaleDateString("zh-CN"),
          mirrorUrl: mirrorBase,
          verified: false
        }
      });
    }

    try {
      const { res: authRes } = await fetchWithCookieJar(`${mirrorBase}/api/auth-status`, {
        headers: { Accept: "application/json" },
        cookie: formattedCookie,
        timeoutMs: 8000
      });
      const ct = authRes.headers.get("content-type") || "";
      if (authRes.ok && ct.includes("application/json")) {
        const authJson: any = await authRes.json();
        if (authJson.authenticated && authJson.user) {
          return res.json({
            success: true,
            user: {
              id: `acc_${Date.now()}`,
              email: authJson.user.email || defaultEmail,
              name: authJson.user.name || defaultName,
              dailyDownloadsLimit: 10,
              downloadsRemaining: 10,
              isPremium: false,
              remindMeToken: formattedCookie,
              loginMethod: "cookie",
              addedAt: new Date().toLocaleDateString("zh-CN"),
              mirrorUrl: mirrorBase,
              verified: true
            }
          });
        }
        return res.json({
          success: true,
          warning: `已保存 Cookie，但 ${mirrorBase} 返回未登录状态（提示：z-lib.id 节点使用 zlibrary_session，而官网 z-library.sk 等使用 remix_userid + remix_userkey）。`,
          user: {
            id: `acc_${Date.now()}`,
            email: defaultEmail,
            name: defaultName,
            dailyDownloadsLimit: 10,
            downloadsRemaining: 10,
            isPremium: false,
            remindMeToken: formattedCookie,
            loginMethod: "cookie",
            addedAt: new Date().toLocaleDateString("zh-CN"),
            mirrorUrl: mirrorBase,
            verified: false
          }
        });
      }
    } catch {
      // fall through to classic check
    }

    // Classic Z-Library EAPI profile check (works with remix_userid + remix_userkey when mirror is reachable)
    if (cookieMeta.remixUserId && cookieMeta.remixUserKey) {
      try {
        const { res: profileRes } = await fetchWithCookieJar(`${mirrorBase}/eapi/user/profile`, {
          headers: { Accept: "application/json", Referer: mirrorBase },
          cookie: formattedCookie,
          timeoutMs: 8000
        });
        const ct = profileRes.headers.get("content-type") || "";
        if (profileRes.ok && ct.includes("application/json")) {
          const profileJson: any = await profileRes.json();
          const u = profileJson?.user;
          if (u && (u.id || u.email)) {
            const limit = Number(u.downloads_limit) > 0 ? Number(u.downloads_limit) : 10;
            const today = Number(u.downloads_today) >= 0 ? Number(u.downloads_today) : 0;
            const remaining = Math.max(0, limit - today);
            return res.json({
              success: true,
              user: {
                id: `acc_${Date.now()}`,
                email: u.email || defaultEmail,
                name: u.name || defaultName,
                dailyDownloadsLimit: limit,
                downloadsRemaining: remaining,
                isPremium: limit > 20,
                remindMeToken: formattedCookie,
                loginMethod: "cookie",
                addedAt: new Date().toLocaleDateString("zh-CN"),
                mirrorUrl: mirrorBase,
                verified: true
              }
            });
          }
        }
      } catch {
        // fall through to homepage check
      }
    }

    const { res: upstream } = await fetchWithCookieJar(`${mirrorBase}/`, {
      headers: { Referer: mirrorBase },
      cookie: formattedCookie
    });
    const html = await upstream.text();
    const cfBlocked = isCfChallenge(html) || upstream.status === 403 || upstream.status === 513;
    const quotaMatch = html.match(/(\d+)\s*\/\s*(\d+)/);
    const isVip = !cfBlocked && /premium|vip|unlimited/i.test(html) && Number(quotaMatch?.[2] || 0) > 20;
    const limit = isVip ? Number(quotaMatch?.[2] || 999) : 10;
    const remaining = quotaMatch ? Math.min(limit, Number(quotaMatch[1])) : limit;

    return res.json({
      success: true,
      warning: cfBlocked
        ? `镜像站 (${mirrorBase}) 触发人机防爬拦截 (HTTP ${upstream.status})，已本地保存 Cookie 凭证（${cookieMeta.remixUserId ? `UID ${cookieMeta.remixUserId}` : "Cookie"}）。`
        : undefined,
      user: {
        id: `acc_${Date.now()}`,
        email: defaultEmail,
        name: defaultName,
        dailyDownloadsLimit: limit,
        downloadsRemaining: remaining,
        isPremium: isVip,
        remindMeToken: formattedCookie,
        loginMethod: "cookie",
        addedAt: new Date().toLocaleDateString("zh-CN"),
        mirrorUrl: mirrorBase,
        verified: !cfBlocked && upstream.ok
      }
    });
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      error: formatMirrorNetworkError(err, mirrorBase)
    });
  }
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
