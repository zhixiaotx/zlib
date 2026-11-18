import { AIConfig, Book, Mirror, UserAccount } from '../types';

export function normalizeMirrorBaseUrl(mirrorUrl?: string): string {
  const raw = (mirrorUrl || 'https://z-lib.id').trim().replace(/\/+$/, '');
  if (!raw) return 'https://z-lib.id';
  return raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
}

export function formatCookieHeader(token?: string): string {
  const raw = (token || '')
    .trim()
    .replace(/^Cookie:\s*/i, '')
    .replace(/\r?\n+/g, '; ')
    .trim();
  if (!raw) return '';
  if (raw.includes('=')) return raw;
  return `zlibrary_session=${raw}; remind_me=${raw}; remix_userkey=${raw}`;
}

function parseCookieMeta(cookieStr: string): {
  remixUserId: string;
  remixUserKey: string;
  zlibrarySession: string;
  remindMe: string;
} {
  const getVal = (name: string) => {
    const m = cookieStr.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`, 'i'));
    return m ? m[1].trim() : '';
  };
  return {
    remixUserId: getVal('remix_userid'),
    remixUserKey: getVal('remix_userkey'),
    zlibrarySession: getVal('zlibrary_session'),
    remindMe: getVal('remind_me')
  };
}

export function buildMirrorSearchUrl(params: {
  mirrorUrl?: string;
  q?: string;
  field?: string;
  lang?: string;
  ext?: string;
  exact?: boolean;
  yearFrom?: string;
  yearTo?: string;
  page?: number;
}): string {
  const base = normalizeMirrorBaseUrl(params.mirrorUrl);
  const q = (params.q || '').trim();
  const field = (params.field || 'all').toLowerCase();

  let searchTerm = q;
  if (q && field === 'author') searchTerm = `author:${q}`;
  else if (q && field === 'isbn') searchTerm = q.replace(/\s+/g, '');
  else if (q && field === 'publisher') searchTerm = `publisher:${q}`;

  const useQueryStyle = /z-lib\.id|z-lib\.cc/i.test(base);
  const url = searchTerm
    ? useQueryStyle
      ? (() => {
          const u = new URL(`${base}/s`);
          u.searchParams.set('q', searchTerm);
          return u;
        })()
      : new URL(`${base}/s/${encodeURIComponent(searchTerm)}`)
    : new URL(`${base}/`);

  if (params.lang && params.lang !== 'all') {
    url.searchParams.append('languages[]', params.lang.toLowerCase());
  }
  if (params.ext && params.ext !== 'all') {
    url.searchParams.append('extensions[]', params.ext.toUpperCase());
  }
  if (params.exact) {
    url.searchParams.set('e', '1');
  }
  if (params.yearFrom) {
    url.searchParams.set('yearFrom', params.yearFrom);
  }
  if (params.yearTo) {
    url.searchParams.set('yearTo', params.yearTo);
  }
  if (params.page && params.page > 1) {
    url.searchParams.set('page', String(params.page));
  }
  return url.toString();
}

function getTauriInvoke():
  | ((cmd: string, args?: Record<string, any>) => Promise<any>)
  | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  if (w.__TAURI__?.tauri?.invoke) return w.__TAURI__.tauri.invoke;
  if (w.__TAURI__?.invoke) return w.__TAURI__.invoke;
  return null;
}

export async function openExternalUrl(url: string): Promise<void> {
  const w = window as any;
  if (w.__TAURI__?.shell?.open) {
    try {
      await w.__TAURI__.shell.open(url);
      return;
    } catch {
      // fall back to anchor navigation
    }
  }
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();
}

function resolveMirrorAssetUrl(rawUrl: string | null | undefined, mirrorBase: string): string {
  const val = (rawUrl || '').trim();
  if (!val || val.startsWith('data:image/gif')) return '';
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  if (val.startsWith('//')) return `https:${val}`;
  if (val.startsWith('/')) return `${mirrorBase}${val}`;
  return `${mirrorBase}/${val}`;
}

export function isCloudflareChallengeHtml(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes('just a moment...') ||
    lower.includes('cf-browser-verification') ||
    lower.includes('challenge-platform') ||
    lower.includes('attention required! | cloudflare') ||
    lower.includes('enable javascript and cookies to continue') ||
    lower.includes('verifying your browser | diamwall') ||
    lower.includes('__diamwall')
  );
}

/**
 * Parse real Z-Library mirror HTML (<z-bookcard> & classic .resItemBox) via DOMParser
 */
export function parseZlibMirrorHtmlClient(html: string, mirrorUrl: string): Book[] {
  const base = normalizeMirrorBaseUrl(mirrorUrl);
  if (!html || typeof DOMParser === 'undefined') return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const books: Book[] = [];
  const seenIds = new Set<string>();

  // Strategy 1: Modern Z-Library <z-bookcard> web components
  const cards = Array.from(doc.querySelectorAll('z-bookcard'));
  for (const card of cards) {
    const id = card.getAttribute('id') || `zlib-${books.length + 1}`;
    if (seenIds.has(id)) continue;

    const titleEl = card.querySelector('[slot="title"]');
    const authorEl = card.querySelector('[slot="author"]');
    const noteEl = card.querySelector('[slot="note"]');
    const imgEl = card.querySelector('img');

    const title = (titleEl?.textContent || card.getAttribute('title') || '').trim();
    if (!title) continue;

    seenIds.add(id);
    const author = (authorEl?.textContent || card.getAttribute('author') || '未知作者').trim();
    const href = card.getAttribute('href') || '';
    const dlAttr = card.getAttribute('download') || '';
    const rawCover =
      imgEl?.getAttribute('data-src') ||
      imgEl?.getAttribute('src') ||
      card.getAttribute('cover') ||
      '';

    const ext = (card.getAttribute('extension') || 'pdf').replace(/^\./, '').toLowerCase();
    const filesize = (card.getAttribute('filesize') || '未知大小').trim();
    const year = (card.getAttribute('year') || '').trim() || '-';
    const publisher = (card.getAttribute('publisher') || 'Z-Library').trim();
    const language = (card.getAttribute('language') || '未知').trim();
    const ratingRaw = parseFloat(card.getAttribute('rating') || '0');
    const qualityRaw = card.getAttribute('quality') || '';
    const isbn = (card.getAttribute('isbn') || '').trim();
    const pages = (card.getAttribute('pages') || '').trim();

    books.push({
      id,
      title,
      author,
      year,
      publisher,
      extension: ext || 'pdf',
      filesize,
      language,
      rating: Number.isFinite(ratingRaw) && ratingRaw > 0 ? ratingRaw : 0,
      coverUrl: resolveMirrorAssetUrl(rawCover, base),
      description: (noteEl?.textContent || '').trim(),
      downloadsCount: 0,
      isbn: isbn || undefined,
      pages: pages || undefined,
      quality: qualityRaw || undefined,
      detailUrl: href ? resolveMirrorAssetUrl(href, base) : base,
      downloadUrl: dlAttr ? resolveMirrorAssetUrl(dlAttr, base) : undefined,
      sourceMirror: base
    });
  }

  if (books.length > 0) return books;

  // Strategy 2: Classic .resItemBox / table.resItemTable layout
  const itemBoxes = Array.from(doc.querySelectorAll('.resItemBox, table.resItemTable'));
  for (const box of itemBoxes) {
    const titleLink = box.querySelector('h3[itemprop="name"] a, h3 a, td a[href*="/book/"]');
    const title = (titleLink?.textContent || '').trim();
    if (!title) continue;

    const href = titleLink?.getAttribute('href') || '';
    const bookIdAttr = box.getAttribute('data-book_id') || '';
    const isbnAttr = box.getAttribute('data-isbn') || '';
    const idMatch = href.match(/\/book\/([^/?#]+)/);
    const id = bookIdAttr || (idMatch ? idMatch[1] : `zlib-${books.length + 1}`);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const authors = Array.from(box.querySelectorAll('.authors a'))
      .map((a) => (a.textContent || '').trim())
      .filter(Boolean)
      .join(', ');
    const imgEl = box.querySelector('img.cover, img');
    const rawCover = imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src') || '';

    const year = (box.querySelector('.property_year .property_value')?.textContent || '-').trim();
    const publisher = (
      box.querySelector('.property_publisher .property_value, a[title*="Publisher"], [itemprop="publisher"]')?.textContent || 'Z-Library'
    ).trim();
    const language = (
      box.querySelector('.property_language .property_value')?.textContent || '未知'
    ).trim();
    const fileProp = (
      box.querySelector('.property__file .property_value')?.textContent || ''
    ).trim();
    const [rawExt, rawSize] = fileProp.split(',').map((s) => s.trim());

    books.push({
      id,
      title,
      author: authors || '未知作者',
      year,
      publisher,
      extension: (rawExt || 'pdf').toLowerCase(),
      filesize: rawSize || '见详情页',
      language,
      rating: 0,
      coverUrl: resolveMirrorAssetUrl(rawCover, base),
      description: '',
      downloadsCount: 0,
      isbn: isbnAttr || undefined,
      detailUrl: href ? resolveMirrorAssetUrl(href, base) : base,
      sourceMirror: base
    });
  }

  return books;
}

async function tryFetchJson(url: string, options?: RequestInit): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

export async function loginZlibAccount(payload: {
  email?: string;
  password?: string;
  cookieToken?: string;
  mirrorUrl?: string;
}): Promise<{ success: boolean; user?: UserAccount; error?: string; warning?: string }> {
  const email = (payload.email || '').trim();
  const password = payload.password || '';
  const cookieToken = (payload.cookieToken || '').trim();
  const mirrorBase = normalizeMirrorBaseUrl(payload.mirrorUrl);

  if (!email && !cookieToken) {
    return { success: false, error: '请输入邮箱账号或 Remind-Me Cookie 凭证' };
  }
  if (email && !password && !cookieToken) {
    return { success: false, error: '请输入登录密码' };
  }

  // 1. Express Backend Proxy (dev / Node server mode)
  const serverData = await tryFetchJson('/api/zlib/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, cookieToken, mirrorUrl: mirrorBase })
  });
  if (serverData && typeof serverData.success === 'boolean') {
    return serverData;
  }

  // 2. Tauri Desktop Native Rust HTTP Request (CORS-free directly to active mirror!)
  const tauriInvoke = getTauriInvoke();
  if (tauriInvoke) {
    try {
      if (email && password) {
        // Check modern /api/auth-status + /login flow (e.g. z-lib.id)
        let authMeta: any = null;
        let sessionCookies: string[] = [];
        try {
          const statusResp = await tauriInvoke('mirror_http_request', {
            url: `${mirrorBase}/api/auth-status`,
            method: 'GET',
            headers: { Accept: 'application/json', Referer: `${mirrorBase}/login` },
            body: null
          });
          sessionCookies = Array.isArray(statusResp.setCookies) ? statusResp.setCookies : [];
          if (statusResp.ok) {
            authMeta = JSON.parse(statusResp.body || 'null');
          }
        } catch {
          authMeta = null;
        }

        if (authMeta && authMeta.csrf_token) {
          const cookiePair = sessionCookies.map((c) => c.split(';')[0].trim()).filter(Boolean).join('; ');
          const loginResp = await tauriInvoke('mirror_http_request', {
            url: `${mirrorBase}/login`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Referer: `${mirrorBase}/login`,
              Origin: mirrorBase,
              ...(cookiePair ? { Cookie: cookiePair } : {})
            },
            body: new URLSearchParams({
              _token: String(authMeta.csrf_token),
              email,
              password
            }).toString()
          });
          const loginHtml = String(loginResp.body || '');
          const afterCookies = [
            cookiePair,
            ...(Array.isArray(loginResp.setCookies) ? loginResp.setCookies.map((c: string) => c.split(';')[0].trim()) : [])
          ].filter(Boolean).join('; ');

          const verifyResp = await tauriInvoke('mirror_http_request', {
            url: `${mirrorBase}/api/auth-status`,
            method: 'GET',
            headers: { Accept: 'application/json', ...(afterCookies ? { Cookie: afterCookies } : {}) },
            body: null
          });
          const verifyJson: any = (() => {
            try { return JSON.parse(verifyResp.body || 'null'); } catch { return null; }
          })();

          if (verifyJson?.authenticated && verifyJson?.user) {
            return {
              success: true,
              user: {
                id: `acc_${Date.now()}`,
                email: verifyJson.user.email || email,
                name: verifyJson.user.name || email.split('@')[0],
                dailyDownloadsLimit: 10,
                downloadsRemaining: 10,
                isPremium: false,
                remindMeToken: afterCookies,
                loginMethod: 'password',
                addedAt: new Date().toLocaleDateString('zh-CN'),
                mirrorUrl: mirrorBase,
                verified: true
              }
            };
          }

          if (/cf-turnstile|turnstile|captcha/i.test(loginHtml) || isCloudflareChallengeHtml(loginHtml)) {
            return {
              success: false,
              error: `镜像站 (${mirrorBase}) 的账号密码登录页启用了人机验证码 (Turnstile/Captcha)，客户端无法代填验证码。请点击“在浏览器打开”完成登录后复制 Cookie 导入。`
            };
          }

          return {
            success: false,
            error: `镜像站 (${mirrorBase}) 账号密码校验未通过，如开启了人机验证请使用浏览器登录后导出 Cookie 免密导入。`
          };
        }

        // Classic Z-Library /rpc.php flow
        const formBody = new URLSearchParams({
          isModal: 'true',
          email,
          password,
          action: 'login',
          redirectUrl: '',
          gg_json_mode: '1'
        }).toString();

        const resp = await tauriInvoke('mirror_http_request', {
          url: `${mirrorBase}/rpc.php`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Referer: mirrorBase,
            Origin: mirrorBase
          },
          body: formBody
        });

        if (isCloudflareChallengeHtml(resp.body || '') || resp.status === 403 || resp.status === 513) {
          return {
            success: false,
            error: `镜像站 (${mirrorBase}) 触发了人机验证 (HTTP ${resp.status})，无法通过密码直连。请点击“在浏览器打开”完成登录后复制 Cookie 免密导入。`
          };
        }

        let parsed: any = null;
        try {
          parsed = JSON.parse(resp.body || '{}');
        } catch {
          parsed = null;
        }

        const respErr = parsed?.response?.validationError || parsed?.errors?.[0]?.message || parsed?.error;
        if (respErr) {
          return { success: false, error: `镜像站 (${mirrorBase}) 返回：${respErr}` };
        }

        const cookieList: string[] = Array.isArray(resp.setCookies) ? resp.setCookies : [];
        const extractedCookie = cookieList
          .map((c) => c.split(';')[0].trim())
          .filter(Boolean)
          .join('; ');

        if (!extractedCookie && (!parsed || parsed?.response?.user_id === undefined)) {
          return {
            success: false,
            error: `镜像站 (${mirrorBase}) 未返回登录会话凭证（HTTP ${resp.status}），请改用浏览器登录后提取 Cookie。`
          };
        }

        return {
          success: true,
          user: {
            id: `acc_${Date.now()}`,
            email,
            name: email.split('@')[0],
            dailyDownloadsLimit: 10,
            downloadsRemaining: 10,
            isPremium: false,
            remindMeToken: extractedCookie || cookieToken,
            loginMethod: 'password',
            addedAt: new Date().toLocaleDateString('zh-CN'),
            mirrorUrl: mirrorBase,
            verified: true
          }
        };
      }

      // Cookie verification via Tauri Rust
      const formattedCookie = formatCookieHeader(cookieToken);
      const cookieMeta = parseCookieMeta(formattedCookie);
      const mirrorHost = mirrorBase.replace(/^https?:\/\//, '');
      const defaultName = cookieMeta.remixUserId ? `Z-Lib (${cookieMeta.remixUserId})` : 'Z-Lib 账号';
      const defaultEmail = cookieMeta.remixUserId
        ? `UID ${cookieMeta.remixUserId} (${mirrorHost})`
        : `Cookie (${mirrorHost})`;
      const isZlibIdCluster = /z-lib\.id|z-lib\.cc/i.test(mirrorBase);

      if (isZlibIdCluster && cookieMeta.remixUserId && cookieMeta.remixUserKey && !cookieMeta.zlibrarySession) {
        return {
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
            loginMethod: 'cookie',
            addedAt: new Date().toLocaleDateString('zh-CN'),
            mirrorUrl: mirrorBase,
            verified: false
          }
        };
      }

      try {
        const authResp = await tauriInvoke('mirror_http_request', {
          url: `${mirrorBase}/api/auth-status`,
          method: 'GET',
          headers: { Cookie: formattedCookie, Accept: 'application/json' },
          body: null
        });
        if (authResp.ok) {
          const authJson = JSON.parse(authResp.body || 'null');
          if (authJson && typeof authJson.authenticated === 'boolean') {
            if (authJson.authenticated && authJson.user) {
              return {
                success: true,
                user: {
                  id: `acc_${Date.now()}`,
                  email: authJson.user.email || defaultEmail,
                  name: authJson.user.name || defaultName,
                  dailyDownloadsLimit: 10,
                  downloadsRemaining: 10,
                  isPremium: false,
                  remindMeToken: formattedCookie,
                  loginMethod: 'cookie',
                  addedAt: new Date().toLocaleDateString('zh-CN'),
                  mirrorUrl: mirrorBase,
                  verified: true
                }
              };
            }
            return {
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
                loginMethod: 'cookie',
                addedAt: new Date().toLocaleDateString('zh-CN'),
                mirrorUrl: mirrorBase,
                verified: false
              }
            };
          }
        }
      } catch {
        // fall through to EAPI / homepage check
      }

      // Classic Z-Library EAPI profile check
      if (cookieMeta.remixUserId && cookieMeta.remixUserKey) {
        try {
          const profileResp = await tauriInvoke('mirror_http_request', {
            url: `${mirrorBase}/eapi/user/profile`,
            method: 'GET',
            headers: {
              Cookie: formattedCookie,
              Referer: mirrorBase,
              Accept: 'application/json'
            },
            body: null
          });
          if (profileResp.ok) {
            const profileJson = JSON.parse(profileResp.body || 'null');
            const u = profileJson?.user;
            if (u && (u.id || u.email)) {
              const limit = Number(u.downloads_limit) > 0 ? Number(u.downloads_limit) : 10;
              const today = Number(u.downloads_today) >= 0 ? Number(u.downloads_today) : 0;
              const remaining = Math.max(0, limit - today);
              return {
                success: true,
                user: {
                  id: `acc_${Date.now()}`,
                  email: u.email || defaultEmail,
                  name: u.name || defaultName,
                  dailyDownloadsLimit: limit,
                  downloadsRemaining: remaining,
                  isPremium: limit > 20,
                  remindMeToken: formattedCookie,
                  loginMethod: 'cookie',
                  addedAt: new Date().toLocaleDateString('zh-CN'),
                  mirrorUrl: mirrorBase,
                  verified: true
                }
              };
            }
          }
        } catch {
          // fall through to homepage check
        }
      }

      const resp = await tauriInvoke('mirror_http_request', {
        url: `${mirrorBase}/`,
        method: 'GET',
        headers: {
          Cookie: formattedCookie,
          Referer: mirrorBase
        },
        body: null
      });

      const bodyText = String(resp.body || '');
      const cfBlocked = isCloudflareChallengeHtml(bodyText) || resp.status === 403 || resp.status === 513;
      const quotaMatch = bodyText.match(/(\d+)\s*\/\s*(\d+)/);
      const isVip = !cfBlocked && /premium|vip|unlimited/i.test(bodyText) && Number(quotaMatch?.[2] || 0) > 20;

      const limit = isVip ? Number(quotaMatch?.[2] || 999) : 10;
      const remaining = quotaMatch ? Math.min(limit, Number(quotaMatch[1])) : limit;

      return {
        success: true,
        warning: cfBlocked
          ? `镜像站 (${mirrorBase}) 开启了人机防爬校验 (HTTP ${resp.status})，已本地保存 Cookie 凭证（${cookieMeta.remixUserId ? `UID ${cookieMeta.remixUserId}` : 'Cookie'}）。`
          : undefined,
        user: {
          id: `acc_${Date.now()}`,
          email: defaultEmail,
          name: defaultName,
          dailyDownloadsLimit: limit,
          downloadsRemaining: remaining,
          isPremium: isVip,
          remindMeToken: formattedCookie,
          loginMethod: 'cookie',
          addedAt: new Date().toLocaleDateString('zh-CN'),
          mirrorUrl: mirrorBase,
          verified: !cfBlocked && resp.ok
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: `连接镜像站 (${mirrorBase}) 失败：${err?.message || String(err)}`
      };
    }
  }

  // 3. Static browser fallback (cannot bypass CORS without server/Tauri)
  if (!cookieToken) {
    return {
      success: false,
      error: `当前为纯前端浏览器环境，受浏览器跨域策略限制无法直接向镜像站 (${mirrorBase}) 提交账号密码。请在浏览器打开镜像登录后使用 Cookie（remix_userid / zlibrary_session）导入。`
    };
  }

  const formattedFallbackCookie = formatCookieHeader(cookieToken);
  const fallbackMeta = parseCookieMeta(formattedFallbackCookie);
  const fallbackHost = mirrorBase.replace(/^https?:\/\//, '');

  return {
    success: true,
    warning: `当前为纯前端静态页面，已绑定镜像 ${mirrorBase} 并保存 Cookie${fallbackMeta.remixUserId ? ` (remix_userid: ${fallbackMeta.remixUserId})` : ''}（默认非 VIP 每日 10 本额度）。`,
    user: {
      id: `acc_${Date.now()}`,
      email: fallbackMeta.remixUserId ? `UID ${fallbackMeta.remixUserId} (${fallbackHost})` : `Cookie (${fallbackHost})`,
      name: fallbackMeta.remixUserId ? `Z-Lib (${fallbackMeta.remixUserId})` : `Z-Lib 账号`,
      dailyDownloadsLimit: 10,
      downloadsRemaining: 10,
      isPremium: false,
      remindMeToken: formattedFallbackCookie,
      loginMethod: 'cookie',
      addedAt: new Date().toLocaleDateString('zh-CN'),
      mirrorUrl: mirrorBase,
      verified: false
    }
  };
}

export async function searchZlibBooks(params: {
  q?: string;
  field?: string;
  lang?: string;
  ext?: string;
  exact?: boolean;
  yearFrom?: string;
  yearTo?: string;
  page?: number;
  mirrorUrl?: string;
  cookieToken?: string;
}): Promise<{
  success: boolean;
  books: Book[];
  total: number;
  mirrorUrl: string;
  mirrorSearchUrl: string;
  blockedByCloudflare?: boolean;
  error?: string;
}> {
  const mirrorBase = normalizeMirrorBaseUrl(params.mirrorUrl);
  const mirrorSearchUrl = buildMirrorSearchUrl(params);

  const searchParams = new URLSearchParams();
  if (params.q?.trim()) searchParams.append('q', params.q.trim());
  if (params.field && params.field !== 'all') searchParams.append('field', params.field);
  if (params.lang && params.lang !== 'all') searchParams.append('lang', params.lang);
  if (params.ext && params.ext !== 'all') searchParams.append('ext', params.ext);
  if (params.exact) searchParams.append('exact', 'true');
  if (params.yearFrom) searchParams.append('yearFrom', params.yearFrom);
  if (params.yearTo) searchParams.append('yearTo', params.yearTo);
  if (params.page && params.page > 1) searchParams.append('page', String(params.page));
  searchParams.append('mirrorUrl', mirrorBase);

  // 1. Express Backend Proxy (Node full-stack mode)
  const serverData = await tryFetchJson(`/api/zlib/search?${searchParams.toString()}`, {
    headers: params.cookieToken
      ? { 'x-zlib-cookie': formatCookieHeader(params.cookieToken) }
      : undefined
  });
  if (serverData && Array.isArray(serverData.books)) {
    return {
      success: !!serverData.success,
      books: serverData.books,
      total: serverData.total ?? serverData.books.length,
      mirrorUrl: serverData.mirrorUrl || mirrorBase,
      mirrorSearchUrl: serverData.mirrorSearchUrl || mirrorSearchUrl,
      blockedByCloudflare: serverData.blockedByCloudflare,
      error: serverData.error
    };
  }

  // 2. Tauri Desktop Native Rust HTTP Request (CORS-free directly to active mirror!)
  const tauriInvoke = getTauriInvoke();
  if (tauriInvoke) {
    try {
      const headers: Record<string, string> = {
        Referer: `${mirrorBase}/`,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      };
      if (params.cookieToken) {
        headers.Cookie = formatCookieHeader(params.cookieToken);
      }

      let resp = await tauriInvoke('mirror_http_request', {
        url: mirrorSearchUrl,
        method: 'GET',
        headers,
        body: null
      });

      // Fallback between /s/... and /s?q=... if mirror returns 404
      let finalSearchUrl = mirrorSearchUrl;
      if (resp.status === 404 && params.q?.trim()) {
        const altUrl = new URL(`${mirrorBase}/s`);
        altUrl.searchParams.set('q', params.q.trim());
        finalSearchUrl = altUrl.toString();
        resp = await tauriInvoke('mirror_http_request', {
          url: finalSearchUrl,
          method: 'GET',
          headers,
          body: null
        });
      }

      const html = String(resp.body || '');
      if (isCloudflareChallengeHtml(html) || resp.status === 403 || resp.status === 503 || resp.status === 513) {
        return {
          success: false,
          books: [],
          total: 0,
          mirrorUrl: mirrorBase,
          mirrorSearchUrl: finalSearchUrl,
          blockedByCloudflare: true,
          error: `镜像节点 (${mirrorBase}) 触发了人机拦截 (HTTP ${resp.status})。请尝试切换至 https://z-lib.id，或点击下方按钮在浏览器打开镜像搜索结果页。`
        };
      }

      if (!resp.ok) {
        return {
          success: false,
          books: [],
          total: 0,
          mirrorUrl: mirrorBase,
          mirrorSearchUrl: finalSearchUrl,
          error: `镜像节点 (${mirrorBase}) 返回状态码 HTTP ${resp.status}，请尝试切换镜像节点。`
        };
      }

      const parsedBooks = parseZlibMirrorHtmlClient(html, mirrorBase);
      return {
        success: true,
        books: parsedBooks,
        total: parsedBooks.length,
        mirrorUrl: mirrorBase,
        mirrorSearchUrl: finalSearchUrl
      };
    } catch (err: any) {
      return {
        success: false,
        books: [],
        total: 0,
        mirrorUrl: mirrorBase,
        mirrorSearchUrl,
        error: `无法连接镜像节点 (${mirrorBase})：${err?.message || String(err)}。请检查网络或切换镜像节点。`
      };
    }
  }

  // 3. Browser / Capacitor direct fetch attempt (no fake fabricated results!)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(mirrorSearchUrl, { signal: controller.signal });
    clearTimeout(timer);
    const html = await res.text();
    if (isCloudflareChallengeHtml(html) || res.status === 403) {
      return {
        success: false,
        books: [],
        total: 0,
        mirrorUrl: mirrorBase,
        mirrorSearchUrl,
        blockedByCloudflare: true,
        error: `镜像节点 (${mirrorBase}) 需要人机验证 (HTTP ${res.status})，请点击下方按钮直接在浏览器打开镜像搜索结果。`
      };
    }
    const parsedBooks = parseZlibMirrorHtmlClient(html, mirrorBase);
    return {
      success: true,
      books: parsedBooks,
      total: parsedBooks.length,
      mirrorUrl: mirrorBase,
      mirrorSearchUrl
    };
  } catch {
    return {
      success: false,
      books: [],
      total: 0,
      mirrorUrl: mirrorBase,
      mirrorSearchUrl,
      error: `当前纯静态网页受浏览器跨域 (CORS) 限制，无法后台静默抓取 ${mirrorBase}。请使用本地 Node 服务 / Windows 桌面客户端，或点击下方按钮直达镜像搜索页。`
    };
  }
}

// ========================
// IndexedDB Local Book File Storage (for Browser / Android APK / Web Preview)
// ========================
export interface StoredLocalBookRecord {
  bookId: string;
  filename: string;
  mimeType: string;
  size: number;
  updatedAt: string;
  blob: Blob;
}

const IDB_NAME = 'zlib_local_books_db';
const IDB_STORE = 'book_files';

function openBookDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'bookId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalBookBlob(
  bookId: string,
  filename: string,
  mimeType: string,
  blob: Blob
): Promise<void> {
  try {
    const db = await openBookDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({
        bookId,
        filename,
        mimeType: mimeType || blob.type || 'application/octet-stream',
        size: blob.size,
        updatedAt: new Date().toISOString(),
        blob
      } as StoredLocalBookRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore storage quota errors gracefully
  }
}

export async function getLocalBookBlob(bookId: string): Promise<StoredLocalBookRecord | null> {
  try {
    const db = await openBookDb();
    return await new Promise<StoredLocalBookRecord | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(bookId);
      req.onsuccess = () => resolve((req.result as StoredLocalBookRecord) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function listLocalBookBlobs(): Promise<StoredLocalBookRecord[]> {
  try {
    const db = await openBookDb();
    return await new Promise<StoredLocalBookRecord[]>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve((req.result as StoredLocalBookRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteLocalBookBlob(bookId: string): Promise<void> {
  try {
    const db = await openBookDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(bookId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export interface LocalFolderFileItem {
  bookId?: string;
  name: string;
  size: number;
  path?: string;
  mtime?: string;
  source: 'disk' | 'browser';
}

export async function openDownloadFolder(): Promise<{
  mode: 'native' | 'virtual';
  path: string;
  files: LocalFolderFileItem[];
}> {
  const tauriInvoke = getTauriInvoke();
  if (tauriInvoke) {
    try {
      const dirPath = await tauriInvoke('open_download_folder');
      return { mode: 'native', path: String(dirPath || ''), files: [] };
    } catch {
      // fall through
    }
  }

  const serverData = await tryFetchJson('/api/system/open-folder', { method: 'POST' });
  const browserRecords = await listLocalBookBlobs();
  const browserFiles: LocalFolderFileItem[] = browserRecords.map((r) => ({
    bookId: r.bookId,
    name: r.filename,
    size: r.size,
    mtime: r.updatedAt,
    source: 'browser'
  }));

  if (serverData && serverData.success) {
    if (serverData.opened) {
      return {
        mode: 'native',
        path: serverData.path || '',
        files: browserFiles
      };
    }
    const diskFiles: LocalFolderFileItem[] = Array.isArray(serverData.files)
      ? serverData.files.map((f: any) => ({
          name: f.name,
          size: Number(f.size || 0),
          path: f.path,
          mtime: f.mtime,
          source: 'disk' as const
        }))
      : [];
    return {
      mode: 'virtual',
      path: serverData.path || 'ZLibraryDownloads',
      files: [...diskFiles, ...browserFiles]
    };
  }

  return {
    mode: 'virtual',
    path: '浏览器 / 手机本地沙盒书库',
    files: browserFiles
  };
}

export async function openBookLocally(book: Book): Promise<{
  mode: 'native' | 'reader' | 'needs-file';
  path?: string;
  blob?: Blob;
  serverFileUrl?: string;
  filename?: string;
  mimeType?: string;
  error?: string;
}> {
  // 1. Tauri Desktop native OS file opener
  const tauriInvoke = getTauriInvoke();
  if (tauriInvoke && book.savedPath) {
    try {
      const openedPath = await tauriInvoke('open_local_book', {
        path: book.savedPath,
        fallbackUrl: null
      });
      return { mode: 'native', path: String(openedPath || book.savedPath) };
    } catch {
      // fall through to IndexedDB / file picker if moved
    }
  }

  // 2. IndexedDB cached binary blob
  const cached = await getLocalBookBlob(book.id);
  if (cached && cached.blob) {
    return {
      mode: 'reader',
      blob: cached.blob,
      filename: cached.filename,
      mimeType: cached.mimeType
    };
  }

  // 3. Express local saved file on server disk
  const candidateName =
    book.localFileName ||
    (book.savedPath ? book.savedPath.split(/[\\/]/).pop() : undefined);
  if (candidateName) {
    try {
      const checkUrl = `/api/system/local-file?name=${encodeURIComponent(candidateName)}`;
      const res = await fetch(checkUrl, { method: 'GET' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('application/json')) {
        const blob = await res.blob();
        await saveLocalBookBlob(book.id, candidateName, contentType, blob);
        return {
          mode: 'reader',
          blob,
          serverFileUrl: checkUrl,
          filename: candidateName,
          mimeType: contentType
        };
      }
    } catch {
      // fall through
    }
  }

  return {
    mode: 'needs-file',
    filename: candidateName || `${book.title}.${book.extension || 'pdf'}`,
    error: '未检测到该书的本地文件缓存（可能由早期版本记录或直接从浏览器下载）。您可以从本地目录选择该电子书文件立即阅读。'
  };
}

export async function downloadBookFromMirror(
  book: Book,
  mirrorUrl?: string,
  cookieToken?: string
): Promise<{
  success: boolean;
  savedPath?: string;
  localFileName?: string;
  requiresBrowser?: boolean;
  targetUrl: string;
  error?: string;
}> {
  const mirrorBase = normalizeMirrorBaseUrl(mirrorUrl || book.sourceMirror);
  const targetUrl = book.downloadUrl || book.detailUrl || `${mirrorBase}/s/${encodeURIComponent(book.title)}`;
  const ext = (book.extension || 'pdf').replace(/^\./, '');
  const cleanTitle = (book.title || 'zlib-book').replace(/[\\/:*?"<>|]/g, '_');
  const filename = `${cleanTitle}.${ext}`;

  // 1. Express Server Download Proxy
  const isNodeAvailable = await tryFetchJson('/api/zlib/mirrors');
  if (isNodeAvailable) {
    try {
      const dlApi = new URL('/api/zlib/download', window.location.origin);
      dlApi.searchParams.set('url', targetUrl);
      dlApi.searchParams.set('mirrorUrl', mirrorBase);
      dlApi.searchParams.set('filename', filename);
      if (cookieToken) dlApi.searchParams.set('cookie', formatCookieHeader(cookieToken));

      const res = await fetch(dlApi.toString());
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('application/json') && !contentType.includes('text/html')) {
        const blob = await res.blob();
        await saveLocalBookBlob(book.id, filename, contentType, blob);
        const rawSavedHeader = res.headers.get('x-saved-path');
        const savedPath = rawSavedHeader ? decodeURIComponent(rawSavedHeader) : undefined;
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(blobUrl);
        return { success: true, savedPath, localFileName: filename, targetUrl };
      }

      if (contentType.includes('application/json')) {
        const errJson = await res.json();
        return {
          success: false,
          requiresBrowser: !!errJson.requiresBrowser,
          targetUrl: errJson.targetUrl || targetUrl,
          error: errJson.error || '镜像站未直接返回文件流'
        };
      }
    } catch {
      // fall through
    }
  }

  // 2. Tauri Rust Native Binary Download
  const tauriInvoke = getTauriInvoke();
  if (tauriInvoke) {
    try {
      const headers: Record<string, string> = { Referer: book.detailUrl || mirrorBase };
      if (cookieToken) headers.Cookie = formatCookieHeader(cookieToken);

      // If book only has detailUrl (not direct /dl/ link), first inspect detail page for real /dl/ href
      let finalDlUrl = targetUrl;
      if (!book.downloadUrl && book.detailUrl) {
        const detailResp = await tauriInvoke('mirror_http_request', {
          url: book.detailUrl,
          method: 'GET',
          headers,
          body: null
        });
        const dlMatch = String(detailResp.body || '').match(/href=["'](\/dl\/[^"']+)["']/i);
        if (dlMatch) {
          finalDlUrl = `${mirrorBase}${dlMatch[1]}`;
        }
      }

      const result = await tauriInvoke('mirror_download_file', {
        url: finalDlUrl,
        headers,
        filename
      });

      if (result.ok && result.savedPath) {
        return { success: true, savedPath: result.savedPath, localFileName: filename, targetUrl: finalDlUrl };
      }
      return {
        success: false,
        requiresBrowser: true,
        targetUrl: result.finalUrl || finalDlUrl,
        error: `镜像站 (${mirrorBase}) 返回网页验证或配额提示 (HTTP ${result.status})，请在浏览器打开完成下载。`
      };
    } catch (err: any) {
      return {
        success: false,
        requiresBrowser: true,
        targetUrl,
        error: err?.message || '下载请求失败，请在浏览器打开镜像页面下载'
      };
    }
  }

  // 3. Static browser fallback: open real mirror book page directly
  return {
    success: false,
    requiresBrowser: true,
    targetUrl,
    error: `纯前端页面受跨域策略限制无法代理二进制下载，将为您跳转到镜像节点原书页完成下载/导出。`
  };
}

export async function testMirrorsLatency(currentMirrors: Mirror[]): Promise<Mirror[]> {
  const serverData = await tryFetchJson('/api/zlib/mirrors/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mirrors: currentMirrors })
  });
  if (serverData?.success && Array.isArray(serverData.mirrors)) {
    const activeId = currentMirrors.find((m) => m.active)?.id;
    return serverData.mirrors.map((m: Mirror) => ({
      ...m,
      active: m.id === activeId
    }));
  }

  const tauriInvoke = getTauriInvoke();
  const tested = await Promise.all(
    currentMirrors.map(async (m) => {
      const targetUrl = normalizeMirrorBaseUrl(m.url);
      const t0 = performance.now();
      if (tauriInvoke) {
        try {
          const resp = await tauriInvoke('mirror_http_request', {
            url: targetUrl,
            method: 'GET',
            headers: {},
            body: null
          });
          const ms = Math.max(20, Math.round(performance.now() - t0));
          const ok = resp.status > 0 && resp.status < 500;
          return {
            ...m,
            status: (ok ? (ms < 1200 ? 'online' : 'unstable') : 'offline') as Mirror['status'],
            latency: `${ms}ms`
          };
        } catch {
          return {
            ...m,
            status: 'offline' as Mirror['status'],
            latency: '超时/不可达'
          };
        }
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        await fetch(targetUrl, { mode: 'no-cors', signal: controller.signal });
        clearTimeout(timer);
        const ms = Math.max(30, Math.round(performance.now() - t0));
        return {
          ...m,
          status: (ms < 1200 ? 'online' : 'unstable') as Mirror['status'],
          latency: `${ms}ms`
        };
      } catch {
        return {
          ...m,
          status: 'offline' as Mirror['status'],
          latency: '不可达'
        };
      }
    })
  );
  return tested;
}

export async function generateAISummaryClient(
  book: Book,
  aiConfig: AIConfig
): Promise<{ success: boolean; summary?: string; providerUsed?: string; error?: string }> {
  const serverData = await tryFetchJson('/api/gemini/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: book.title,
      author: book.author,
      description: book.description,
      aiConfig
    })
  });
  if (serverData) return serverData;

  const prompt = `请作为一名资深学者与书评专家，为书籍《${book.title}》（作者：${book.author}）撰写一份结构清晰、内容深入的中文专业导读与精读报告。书籍原始简介如下：“${book.description || '无'}”。
请严格使用中文按以下四个模块排版输出：
1. 【核心内容全景概览】
2. 【必读核心概念与理论拆解】
3. 【适用读者人群与前置知识】
4. 【高效精读路线与实践建议】`;

  const apiKey = (aiConfig.apiKey || '').trim();
  const baseUrl = (aiConfig.baseUrl || '').replace(/\/+$/, '');
  const model = aiConfig.model;

  if (!apiKey) {
    return {
      success: false,
      error: '当前运行在独立客户端/静态模式，请在「全局设置 → AI 导读大模型多 API 管理中心」中填入您自己的 Gemini / OpenAI / DeepSeek API Key 后直接调用。'
    };
  }

  try {
    if (aiConfig.provider === 'google') {
      const apiBase = baseUrl || 'https://generativelanguage.googleapis.com';
      const url = `${apiBase}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.error?.message || `Google API 错误 (HTTP ${res.status})` };
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return { success: false, error: 'Google Gemini 返回内容为空' };
      return { success: true, summary: text, providerUsed: `Google Gemini (${model})` };
    }

    const chatUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
    const res = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一位资深书评人与学术导师，擅长用清晰结构化的中文输出书籍精读报告。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error?.message || `API 请求失败 (HTTP ${res.status})` };
    }
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return { success: false, error: '接口返回内容为空' };
    return { success: true, summary: text, providerUsed: `${aiConfig.provider} (${model})` };
  } catch (err: any) {
    return { success: false, error: err?.message || '直连 AI API 网络错误（请检查 Base URL 与网络连通性）' };
  }
}

export async function testAIConfigClient(
  aiConfig: Partial<AIConfig>
): Promise<{ success: boolean; message?: string; error?: string }> {
  const serverData = await tryFetchJson('/api/ai/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aiConfig })
  });
  if (serverData) return serverData;

  const apiKey = (aiConfig.apiKey || '').trim();
  const baseUrl = (aiConfig.baseUrl || '').replace(/\/+$/, '');
  const model = aiConfig.model || '';
  if (!apiKey) {
    return { success: false, error: '独立客户端模式下请先填写您的 API Key 再测试连通性' };
  }

  try {
    if (aiConfig.provider === 'google') {
      const apiBase = baseUrl || 'https://generativelanguage.googleapis.com';
      const url = `${apiBase}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with OK only.' }] }] })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data?.error?.message || `HTTP ${res.status}` };
      return { success: true, message: `Google Gemini (${model}) 直连测试成功！` };
    }

    const chatUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
    const res = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with OK only.' }],
        max_tokens: 10
      })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data?.error?.message || `HTTP ${res.status}` };
    return { success: true, message: `直连测试成功！模型 ${model} 响应正常。` };
  } catch (err: any) {
    return { success: false, error: err?.message || '网络请求异常，请检查接口地址' };
  }
}

export async function getPackagerConfigFilesClient(): Promise<Record<string, string>> {
  const serverData = await tryFetchJson('/api/tauri/config-files');
  if (serverData?.success && serverData.files) {
    return serverData.files;
  }

  return {
    'capacitor.config.json': JSON.stringify(
      {
        appId: 'com.zlib.mobile.downloader',
        appName: 'Zlib 下载器',
        webDir: 'dist',
        bundledWebRuntime: false,
        server: { androidScheme: 'https' },
        android: { allowMixedContent: true, captureInput: true }
      },
      null,
      2
    ),
    'src-tauri/tauri.conf.json': JSON.stringify(
      {
        $schema: 'https://schema.tauri.app/config/1',
        build: {
          beforeDevCommand: '',
          beforeBuildCommand: '',
          devPath: 'http://localhost:3000',
          distDir: '../dist',
          withGlobalTauri: true
        },
        package: { productName: 'zlib-downloader', version: '1.2.0' },
        tauri: {
          allowlist: { all: false, shell: { open: true } },
          bundle: {
            active: true,
            targets: ['nsis'],
            identifier: 'com.zlib.desktop.app',
            icon: ['icons/32x32.png', 'icons/128x128.png', 'icons/128x128@2x.png', 'icons/icon.ico']
          },
          security: { csp: null },
          windows: [{ fullscreen: false, resizable: true, title: 'Z-Library 桌面下载器', width: 1200, height: 800 }]
        }
      },
      null,
      2
    ),
    'build_tauri.bat': `@echo off
chcp 65001 >nul
where node >nul 2>nul || (echo [错误] 请先安装 Node.js 20/22+ & pause & exit /b 1)
where cargo >nul 2>nul || (echo [错误] 请先安装 Rustup & pause & exit /b 1)
if exist index.html (
  call npm install --legacy-peer-deps || (pause & exit /b 1)
  call npm run build || (pause & exit /b 1)
)
call npx --yes @tauri-apps/cli@1.5 build || (pause & exit /b 1)
pause`,
    'build_android_apk.bat': `@echo off
chcp 65001 >nul
where node >nul 2>nul || (echo [错误] 请先安装 Node.js 20/22+ & pause & exit /b 1)
where java >nul 2>nul || (echo [错误] 请先安装 JDK 17 & pause & exit /b 1)
if exist index.html (
  call npm install --legacy-peer-deps || (pause & exit /b 1)
  call npm run build || (pause & exit /b 1)
)
if not exist android (
  call npm install --legacy-peer-deps @capacitor/core@^6.2.0 @capacitor/cli@^6.2.0 @capacitor/android@^6.2.0 || (pause & exit /b 1)
  call npx cap add android || (pause & exit /b 1)
)
call npx cap sync android || (pause & exit /b 1)
cd android
call gradlew.bat assembleDebug || (cd .. & pause & exit /b 1)
cd ..
pause`,
    '.github/workflows/deploy.yml': `name: 打包并推送至 gh-pages 分支自动部署 GitHub Pages

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build-and-push-gh-pages:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: 'npm'
      - run: npm install --legacy-peer-deps
      - run: |
          npm run build
          grep -q "./assets/" dist/index.html
          cp dist/index.html dist/404.html
          touch dist/.nojekyll
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          publish_branch: gh-pages
          force_orphan: true`,
    '.github/workflows/build-release.yml': `name: 自动编译 Windows EXE 与 Android APK 安装包

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
          cache: 'npm'
      - uses: actions/setup-java@v5
        with:
          distribution: 'temurin'
          java-version: '17'
      - uses: android-actions/setup-android@v4
      - name: 构建 Web 并编译 Android APK
        run: |
          npm install --legacy-peer-deps
          npm run build
          npm install --legacy-peer-deps @capacitor/core@^6.2.0 @capacitor/cli@^6.2.0 @capacitor/android@^6.2.0
          if [ ! -d "android" ]; then npx cap add android; fi
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
          cache: 'npm'
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
          if-no-files-found: warn`,
    'vercel.json': `{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "npm install --legacy-peer-deps",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}`,
    'netlify.toml': `[build]
  command = "npm install --legacy-peer-deps && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
  NPM_FLAGS = "--legacy-peer-deps"`
  };
}
