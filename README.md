# Z-Library 桌面与移动端文献下载器 (Tauri + Capacitor 多端构建版)

> 本项目基于开源项目 [lcyy052/Zlib-downloader-public](https://github.com/lcyy052/Zlib-downloader-public) 进行二次深度开发与工程化增强。
> 不仅完整还原官方文献检索体验（支持封面图展示、书名/作者/ISBN 分类检索、精确匹配、分页显示），更全面升级了 **多端原生打包（Windows `.exe` 桌面端 + Android `.apk` 手机安装包）**、**下载队列与本地书库立体封面展示**、**自定义多模型 AI 导读（Google Gemini / OpenAI / DeepSeek / OpenAI 兼容接口）**、**多账号持久化平滑切换**、**多镜像测速管理** 以及 **统一规范尺寸模态窗口**。

---

## 📖 目录

1. [🌟 核心三步操作工作流（选择镜像 -> 浏览器提取 Cookie -> 免密下载）](#-核心三步操作工作流选择镜像---浏览器提取-cookie---免密下载)
2. [💡 重点：为什么要在电脑浏览器中登录 Z-Library 镜像并提取 Cookie？](#-重点为什么要在电脑浏览器中登录-z-library-镜像并提取-cookie)
3. [📂 项目文件结构与每个文件的详细功能解析（零基础小白必读）](#-项目文件结构与每个文件的详细功能解析零基础小白必读)
4. [👥 多账号管理与平滑切换实操说明（登录/登出/增加/删除/切换）](#-多账号管理与平滑切换实操说明登录登出增加删除切换)
5. [🤖 AI 导读多模型 API 配置指南（Google / OpenAI / DeepSeek / 兼容接口）](#-ai-导读多模型-api-配置指南google--openai--deepseek--兼容接口)
6. [📄 全站封面图展示与可配置分页系统](#-全站封面图展示与可配置分页系统)
7. [🖥️ 统一标准模态窗口设计规范（长宽尺寸严格统一）](#-统一标准模态窗口设计规范长宽尺寸严格统一)
8. [💻 本地开发与调试运行](#-本地开发与调试运行)
9. [📱 移动端 Android `.APK` 安装包打包教程（支持一键脚本与云端免环境出包）](#-移动端-android-apk-安装包打包教程支持一键脚本与云端免环境出包)
10. [📦 桌面端 Windows `.EXE` 便携版与 NSIS 安装包打包](#-桌面端-windows-exe-便携版与-nsis-安装包打包)
11. [🌐 全平台部署实操指南](#-全平台部署实操指南)
    - [11.1 GitHub Pages 自动工作流（相对路径打包 -> 推送 gh-pages -> 自动部署）](#111-github-pages-自动工作流相对路径打包---推送-gh-pages---自动部署)
    - [11.2 Cloudflare Pages 部署（推荐，国内访问极速）](#112-cloudflare-pages-部署推荐国内访问极速)
    - [11.3 Vercel 部署](#113-vercel-部署)
    - [11.4 Netlify 部署](#114-netlify-部署)
    - [11.5 传统 Linux 云服务器与虚拟主机部署（Nginx + PM2 / 宝塔面板）](#115-传统-linux-云服务器与虚拟主机部署nginx--pm2--宝塔面板)
12. [📲 移动端与不同设备响应式适配优化](#-移动端与不同设备响应式适配优化)
13. [⚠️ 编程与部署避坑指南（小白排错大全）](#-编程与部署避坑指南小白排错大全)

---

## 🌟 核心三步操作工作流（选择镜像 -> 浏览器打开登录账号提取 Cookie -> 免密下载）

为了给您提供与官方一致且不受人机验证码干扰的下载体验，软件推荐以下三步标准流程：

```text
【步骤 1：选择可用镜像节点】
在软件的「镜像节点」中自动测速，选择一个在线的绿色节点（如 https://z-lib.id 或 https://z-lib.cc）。
        ⬇
【步骤 2：在浏览器打开登录账号并提取凭证】
在「账号中心」点击「浏览器打开登录账号」按钮，在 Chrome / Edge / Firefox 中完成账号登录与人机验证，按 F12 复制 zlibrary_session 或 remind_me Cookie。
        ⬇
【步骤 3：填入 Cookie 免密登录并搜索下载】
在软件右上角「账号中心」切换到「浏览器 Cookie 免密登录」粘贴凭证，系统立即校验证书与真实配额（非 VIP 普通账号默认每日 10 本），在「书籍搜索」检索真实馆藏！
```

---

## 💡 重点：双登录协议说明 & 为什么建议用「浏览器打开登录账号」？

很多刚接触 Z-Library 的小伙伴经常会问：*“为什么有时在软件里输入邮箱和密码会提示需要验证码，或者要用浏览器打开登录并复制 Cookie 呢？”*

### 1. 本项目已同步兼容新旧两大登录协议
- **新架构镜像（如 `https://z-lib.id`）**：采用 **`GET /api/auth-status` + `POST /login`（含 CSRF `_token`）**，会话凭证字段为 **`zlibrary_session`**。如果该站点没有开启验证，客户端可直接完成登录；若登录页开启了 **Cloudflare Turnstile 人机验证码**，后台代理与桌面客户端无法代填图形验证。
- **传统架构镜像（如 `z-library.sk` 等经典节点）**：采用 **`POST /rpc.php`** 接口登录，会话凭证字段为 **`remind_me`** / `remix_userkey`；若站点前置了 Cloudflare 5 秒盾或 DiamWall `__diamwall` 防护，同样会在浏览器外返回 403/513 拦截。

### 2. 「浏览器打开登录账号」一键打通闭环
当您在软件 **「Z-Library 官方账号中心」**（或 **「镜像节点」**）点击 **「浏览器打开登录账号」** 时：
1. 系统会自动使用本机默认浏览器打开当前选中的镜像 `/login` 登录页（Windows 桌面版通过 Tauri 原生壳呼出，网页与手机端通过安全外链打开）；
2. 您在真实浏览器中可正常勾选通过 **Turnstile / Captcha 人机验证**，官方服务器会向浏览器颁发权威会话 Cookie（**`zlibrary_session`** 或 **`remind_me`**）；
3. 复制该凭证回到软件粘贴到 **「浏览器 Cookie 免密登录」**，无论是服务端代理还是 Tauri 原生客户端，均会调用 `/api/auth-status` 或首页校验真实登录身份，**100% 绕过密码页人机验证码限制！**

### 📋 30 秒提取 Cookie 凭证手把手教程：
1. **一键打开登录页**：在软件右上角 **「官方账号登录」** 弹窗中点击 **「浏览器打开登录账号」**（推荐在线镜像 `https://z-lib.id`）。
2. **在浏览器正常登录**：输入 Z-Library 邮箱和密码，勾选通过人机验证码并登录成功。
3. **按 F12 键打开控制台**：按键盘最上方 **`F12`** 键（或页面空白处**右键 -> 检查**）。
4. **定位 Cookies 表格**：
   - **Chrome / Edge / Brave**：顶部点 **Application（应用程序）** -> 左侧展开 **Storage -> Cookies -> 点击当前域名**；
   - **Firefox 火狐浏览器**：顶部点 **Storage（存储）** -> 左侧展开 **Cookies -> 点击当前域名**。
5. **复制凭证值**：
   - 若使用的是 `z-lib.id` 等新镜像，找到 **`zlibrary_session`**，复制其 Value（也可以填入 `zlibrary_session=你的值` 或直接粘贴值，本软件会自动识别双格式！）；
   - 若使用的是传统镜像，找到 **`remind_me`**，双击复制其 Value 值。
6. **粘贴完成同步**：回到软件切换到 **「浏览器 Cookie 免密登录」**，粘贴并点击 **「确认添加并登录」** 即可！

---

## 📂 项目文件结构与每个文件的详细功能解析（零基础小白必读）

本项目遵循生产级全栈单体工程结构，以下是仓库中**每一个文件与目录的详细功能与作用说明**，帮助零基础同学彻底看懂整个项目架构：

```text
├── .env.example
│   └── 环境变量模板文件。声明了 GEMINI_API_KEY、OPENAI_API_KEY、DEEPSEEK_API_KEY 及 PORT=3000 等配置模板（不含任何真实密钥）。
│
├── .npmrc
│   └── npm 包管理器全局配置文件。内置 legacy-peer-deps=true，确保无论在 GitHub Actions、Vercel 还是本地电脑运行 npm install，都不会因 Vite 8 与 esbuild 对等依赖冲突而中断。
│
├── .gitignore
│   └── Git 忽略规则文件。规定构建输出目录（dist/、android/、src-tauri/target/）与依赖目录（node_modules/）不提交到代码仓库，保持仓库干净。
│
├── bun.lock
│   └── 依赖版本锁定文件，用于保证云端 CI 或合作者安装依赖时版本号严格一致。
│
├── index.html
│   └── 整个 Web 与移动端 App 的 HTML5 根入口文件。配置了中文语言声明（lang="zh-CN"）、viewport-fit=cover 移动端刘海屏自适应、PWA 移动端元标签以及防无状态沙箱报错的 WebSocket 守卫脚本。
│
├── metadata.json
│   └── 应用元数据清单。声明应用名称、功能描述以及服务端 API 能力。
│
├── package.json
│   └── 项目的“身份证与管家”。记录前端（React 19、Tailwind CSS v4、Lucide 图标）、后端（Express、tsx、@google/genai）依赖与 esbuild@^0.28.0 兼容版本，以及 npm run dev / build / lint 命令。
│
├── tsconfig.json
│   └── TypeScript 编译器配置文件。设定类型检查标准与模块解析规则，在构建前拦截语法与类型错误。
│
├── vite.config.ts
│   └── Vite 极速构建工具配置。核心配置了 base: './'（全站相对路径基准，确保 GitHub Pages gh-pages 子目录、APK 本地 WebView 容器及虚拟主机二级目录永不 404 白屏），并禁用易报错的 HMR WebSocket。
│
├── server.ts
│   └── Node.js 全栈后端核心服务（Express + tsx）。承担八大职责：
│       1) 内置 fetchWithCookieJar 自动 Cookie-Jar 重定向追踪，直连镜像（支持 /s?q= 与 /s/ 双格式）解析真实 HTML 书籍卡片（绝不预设或伪造示例书籍）；
│       2) 自动识别 SSL 证书过期（CERT_HAS_EXPIRED）、域名失效（ENOTFOUND）、DiamWall (__diamwall HTTP 513) 与 Cloudflare 拦截并给出中文诊断；
│       3) 书籍二进制真实流式下载、本地落盘与导出转发（/api/zlib/download，同步写入 ZLibraryDownloads 目录）；
│       4) 本地书库文件夹真打开与目录文件读取（/api/system/open-folder、/api/system/local-files、/api/system/local-file）；
│       5) 多镜像节点实时 HTTP 连通性与毫秒延迟测速（/api/zlib/mirrors/test，识别域名跳转劫持与证书过期）；
│       6) 同步兼容 /api/auth-status + /login（含 CSRF _token、Turnstile 验证码识别与 zlibrary_session 校验）以及传统 /rpc.php（remind_me 校验），非 VIP 普通账号默认每日 10 本额度；
│       7) 多大模型 AI 导读服务端安全代理（/api/gemini/summary 与 /api/ai/test），解决跨域限制；
│       8) 多端打包配置读取与压缩套件下载接口（/api/tauri/config-files 与 /api/package/download/:target）。
│
├── capacitor.config.json
│   └── Android 移动端 APK 打包核心配置文件。定义包名（com.zlib.mobile.downloader）、应用名称、打包目录（dist）与 Android WebView HTTPS/混合内容策略。
│
├── build_android_apk.bat / build_android_apk.sh
│   └── 一键打包 Android .APK 脚本（分别面向 Windows 批处理与 macOS/Linux Shell）。自动检测 Node 与 JDK 17，执行依赖安装、相对路径编译、Capacitor v6 初始化与 Gradle build。
│
├── build_tauri.bat
│   └── Windows 一键打包桌面版 .EXE 批处理脚本（自动检测 Node 与 Rust Cargo）。自动安装依赖、编译前端并调用 Tauri v1.5 编译 Windows 便携版和 NSIS 安装向导。
│
├── zlib-downloader-*.zip / *.tar.gz
│   └── 预先生成好的跨平台打包套件压缩包：
│       - zlib-downloader-windows-tauri-package.zip（含 dist/ + src-tauri/ + build_tauri.bat）
│       - zlib-downloader-android-apk-package.zip（含 dist/ + capacitor.config.json + build_android_apk.*）
│       - zlib-downloader-tauri-bundle.zip（含全套前端/后端/桌面/安卓工程与工作流）
│       - zlib-downloader-tauri-src.tar.gz（轻量化源码归档包）
│
├── .github/workflows/
│   ├── deploy.yml             # GitHub Pages 网页自动发布工作流：在 ubuntu-24.04 + Node 22 下以相对路径（base: './'）构建 dist/，先打包并推送至 gh-pages 分支后自动部署。
│   └── build-release.yml      # 云端多端自动化构建工作流（已全面支持 Node 24 原生 Actions v4/v5/v6）：无需本地装 Android Studio 或 Rust，在 GitHub 云端直接出 Android .apk 与 Windows .exe 安装包！
│
├── src-tauri/                 # Tauri v1.5 原生桌面应用核心目录（Rust 语言）
│   ├── Cargo.toml             # Rust 项目的依赖清单（tauri 1.5、tokio 异步运行时、reqwest 下载器）。
│   ├── build.rs               # Tauri v1.5 必需的编译期构建脚本（执行 tauri_build::build()）。
│   ├── tauri.conf.json        # 严格符合 Tauri v1.5 Schema 的桌面窗口配置文件（package 信息、NSIS 安装向导规则与窗口尺寸）。
│   ├── icons/                 # 桌面端应用图标资源目录（32x32.png、128x128.png、128x128@2x.png、icon.ico）。
│   └── src/main.rs            # Rust 程序入口，注册 reqwest 原生 HTTP 代理、二进制文件下载以及系统文件夹/本地电子书调用命令（open_download_folder / open_local_book）。
│
└── src/                       # React 前端源代码核心目录
    ├── main.tsx               # React 前端启动入口，挂载 App 组件至 index.html 的 root 节点。
    ├── App.tsx                # 全局状态中枢。管理已验证的在线镜像列表（优先 z-lib.id / z-lib.cc）、启动自动测速、一键镜像切换、多账号持久切换、下载队列、真实本地书库（零示例数据）、多 AI API 列表与明暗主题。
    ├── index.css              # 全局样式入口。导入 Tailwind CSS v4，提供移动端隐藏横向滚动条（.scrollbar-none）与安全区底部内边距适配。
    ├── types.ts               # TypeScript 数据类型字典。定义 Book（含本地路径/文件名）、DownloadTask、Mirror、UserAccount、AIConfig 结构。
    ├── utils/
    │   └── standaloneApi.ts   # 【核心】全端三模自适应通信与本地离线存储引擎！自动按 Express 后端 -> Tauri Rust 原生通道 -> 浏览器直连/IndexedDB 路由，支持 /s?q= 与 /s/ 双检索、/api/auth-status + /login 与 /rpc.php 双登录校验、zlibrary_session / remind_me 解析、真实文件夹与文件阅读打开。
    └── components/            # 模块化 UI 界面组件库
        ├── Header.tsx         # 顶部导航栏。包含多端适配的紧凑品牌栏、多账号中心入口、明暗主题、设置按钮与移动端可横向滑动导航条。
        ├── SearchSection.tsx  # 书籍检索大厅。不显示预设示例书籍；直连当前镜像检索，支持 4 种字段检索、出版年份与精确匹配；若当前节点异常提供“一键切换至可用镜像 (z-lib.id) 并重试”。
        ├── DownloadQueue.tsx  # 下载队列页面。展示封面缩略图、实时状态与镜像源跳转；若镜像触发验证提示可一键打开原书页继续。
        ├── LocalLibrary.tsx   # 本地书库页面。仅展示真实下载/导入书籍（无示例书），点击封面/标题/「打开」直接打开书籍阅读，「打开书库文件夹」直接呼出系统目录或内嵌文件浏览器。
        ├── LocalBookModal.tsx # 本地书籍内嵌阅读器（支持 PDF/TXT 预览与本地导入绑定）与本地下载目录弹窗。
        ├── MirrorsManager.tsx # 镜像节点管理中心。提供真实连通性测速、智能一键切到最快在线节点、浏览器登录按钮以及镜像增删改功能。
        ├── LoginModal.tsx     # 官方账号中心弹窗（统一 640px 高度规范）。支持“浏览器打开登录账号”一键跳转、账号密码与 Cookie 双模切换、Turnstile 验证码指引及多账号配额管理。
        ├── AISummaryModal.tsx # AI 图书精读导读弹窗（统一 640px 高度规范）。仅在点击「导读」按钮时呼出，支持多模型报告生成。
        ├── SettingsTab.tsx    # 全局设置中心。支持同模型下多条 API 配置的新增、编辑、连通性测试、删除与一键启用切换。
        ├── TauriPackagerModal.tsx # 多端打包指导中心。提供 Windows / Android 打包套件 ZIP 下载，以及实时的脚本与工作流在线查阅复制。
        └── Pagination.tsx     # 通用智能分页组件。支持首页/上页/页码/下页/末页及每页条数切换，自动折叠适应小屏手机。
```

---

## 👥 多账号管理与平滑切换实操说明（登录/登出/增加/删除/切换）

为了满足科研工作者和重度阅读者拥有多个高配额账号的需求，本项目构建了真正的**多账号持久化隔离存储与秒级平滑切换系统**：

1. **添加新账号**：
   - 点击右上角用户名或“官方账号登录”按钮打开账号中心；
   - 切换到 **“添加新账号”** 标签；
   - 可任选“账号密码登录”或“Remind-Me Cookie 免密登录”；
   - 提交验证成功后，新账号会自动存入本地 `localStorage`，并立即激活为当前活跃账号。
2. **秒级平滑切换**：
   - 打开账号中心，在“已存账号列表”中可以看到每个账号的卡片；
   - 卡片上直观显示该账号的每日配额进度条（如普通非 VIP 账号默认 `10 / 10 本`，以镜像真实返回为准）与所属节点；
   - 点击任意账号右侧的 **“切换至此”** 按钮，整个软件立即切换为该账号的会话凭证，搜索和下载无需重新启动！
3. **安全退出与彻底删除**：
   - 点击卡片右侧的 **垃圾桶（删除）** 图标，即可将该账号从本设备中彻底抹除；
   - 点击底部 **“退出当前账号”**，可临时将当前账号置为未登录访客态，账号信息保留在列表方便随时重新激活。

---

## 🤖 AI 导读多模型 API 配置指南（支持同模型多 API 增删改查与切换）

点击右上角的 **⚙️ 设置图标**，即可进入 **「AI 导读大模型多 API 管理中心」**。**同一个模型厂商下可以同时保存多个不同的 API（如主力 Key、备用 Key、不同中转线路）**，并对每一条 API 单独进行 **新增、编辑修改、连通性测试、删除与一键切换启用**：

| 引擎类型 | 默认接口地址 (Base URL) | 推荐模型 ID | 小白说明 |
| :--- | :--- | :--- | :--- |
| **Google Gemini** | `https://generativelanguage.googleapis.com` | `gemini-4-hydrogen` / `gemini-2.5-flash` | 支持系统内置代理免配使用，也可新增多个自有 Gemini Key 或反代中转地址 |
| **OpenAI 官方** | `https://api.openai.com/v1` | `gpt-4o-mini` / `gpt-4o` | 可同时添加多个 `sk-...` 密钥方便额度轮换 |
| **DeepSeek (深度求索)** | `https://api.deepseek.com/v1` | `deepseek-chat` / `deepseek-reasoner` | 国产顶尖模型，中文书评极佳，支持同时存 V3 与 R1 多个 API 配置 |
| **OpenAI 兼容接口** | 可自由填写（如硅基流动 `https://api.siliconflow.cn/v1`、通义千问、Kimi、OneAPI、本地 Ollama 等） | `Qwen/Qwen2.5-72B-Instruct` 等 | 只要支持 `/v1/chat/completions` 规范均可作为独立配置添加并随时切换！ |

> **操作小贴士**：
> 1. 点击上方任意模型卡片，下方立即列出该模型下已保存的所有 API 配置；
> 2. 点击 **“新增 API”** 可为当前模型继续添加不同 Key/地址/别名的新配置；
> 3. 每条 API 均支持 **“启用”**、**“测试”**、**“编辑”**、**“删除”**，修改结果实时持久化保存并在打开任意书籍「AI 导读」时立即生效。
> 4. 所有请求均通过 `server.ts` 后端 `/api/gemini/summary` 和 `/api/ai/test` 代理转发，**彻底避免浏览器 CORS 跨域错误**。

---

## 📄 全站封面图展示与可配置分页系统

1. **三端封面全覆盖**：无论是 **书籍搜索（SearchSection）**、**下载队列（DownloadQueue）** 还是 **本地书库（LocalLibrary）**，每一本电子书条目都会渲染高清立体书皮封面图，并自带格式徽章（PDF/EPUB/MOBI）与图片加载失败时的兜底精装封面。
2. **自定义分页器（`Pagination.tsx`）**：
   - **书籍搜索**：默认每页 `6` 本，支持切换 `4 / 6 / 8 / 12 / 20 本/页`；
   - **下载队列**：默认每页 `4` 条，支持切换 `4 / 6 / 10 / 20 条/页`；
   - **本地书库**：默认每页 `6` 本，支持切换 `3 / 6 / 9 / 12 / 24 本/页`；
   - 切换搜索关键词或筛选条件时自动回到第 1 页，避免数据增多时页面无限下拉卡顿。

---

## 🖥️ 统一标准模态窗口设计规范（长宽尺寸严格统一）

本软件对所有的模态弹窗（Modal）执行了**统一长宽尺寸约束规范**：
- **统一容器尺寸**：所有模态窗口一律严格设定为 `w-full max-w-2xl h-[640px] max-h-[90vh] flex flex-col`；
- **消除视觉跳动**：在账号中心的 **已存账号列表 / 添加新账号 / 账号密码登录 / Remind-Me Cookie 免密登录 / 退出当前账号** 等状态之间切换时，弹窗外框尺寸**保持绝对固定统一**，只有内部内容区域顺滑滚动；
- **全站统一**：AI 导读弹窗（`AISummaryModal`）、镜像编辑弹窗（`MirrorsManager`）以及图书封面高清预览弹窗（`SearchSection`）均遵循完全一致的尺寸标准。

---

## 💻 本地开发与调试运行

### 1. 环境准备
确保您的电脑安装了 **Node.js (>= 18.0.0)**。可在终端运行 `node -v` 验证。

### 2. 下载并安装依赖
```bash
git clone https://github.com/你的用户名/zlib-downloader-public.git
cd zlib-downloader-public
npm install
```

### 3. 启动全栈开发服务器
```bash
npm run dev
```
启动后在电脑浏览器访问 `http://localhost:3000` 即可开始使用！

---

## 📱 移动端 Android `.APK` 安装包打包教程（支持一键脚本与云端免环境出包）

现在您可以把本项目直接变成安装到安卓手机上的原生 `.apk` App！提供 **两种打包方案**：

### 方案 A：GitHub Actions 云端自动构建（零基础小白首选，不用装任何安卓开发软件！）
1. 将代码推送到您的 GitHub 仓库（确保仓库里包含 `.github/workflows/build-release.yml`）；
2. 打开 GitHub 仓库页面，点击顶部的 **`Actions`** 标签页；
3. 在左侧找到 **`Build Android APK & Windows EXE`** 工作流，点击右侧的 **`Run workflow`** 按钮；
4. 等待约 3~5 分钟构建完成，在结果页面的 **`Artifacts`** 区域即可直接下载编译好的 **`ZLib-Downloader-Android-APK`** 压缩包，解压得到 `.apk` 文件传到手机即可安装！

### 方案 B：下载内置打包套件并在自己电脑本地一键编译 `.APK`
在应用顶部切换至 **「多端打包」**，可直接点击 **「下载安卓打包套件 (.zip)」**（对应 `/api/package/download/android`，已内置预编译完成的 `dist/` 网页资源、`capacitor.config.json`、`package.json` 及本地构建脚本），然后按以下步骤执行：
1. **本地前置环境**（仅需配置一次）：
   - 安装 **Node.js (>= 18)**；
   - 安装 **Java JDK 17**（注意必须为 JDK 17，Gradle 8 要求）；
   - 安装 **Android Studio**（安装时自带 Android SDK Platform 34 和 Build-Tools），并在系统环境变量中设置 `ANDROID_HOME` 指向 Android SDK 目录。
2. **执行一键打包脚本**：
   - **Windows 电脑**：解压套件包后直接**双击运行 `build_android_apk.bat`**；
   - **Mac / Linux 电脑**：在终端运行：
     ```bash
     bash build_android_apk.sh
     ```
3. **获取 APK 产物**：
   编译完成后，安装包会生成在：
   `android/app/build/outputs/apk/debug/app-debug.apk`
   把它发到微信/QQ或通过数据线拷入安卓手机点击安装即可！

---

## 📦 桌面端 Windows `.EXE` 便携版与 NSIS 安装包打包

1. **直接获取预编译打包套件**：在应用 **「多端打包」** 页面点击 **「下载 Win 打包套件 (.zip)」**（对应 `/api/package/download/windows`），压缩包内已含编译完成的 `dist/` 产物、`src-tauri/` Rust 工程、一键脚本 `build_tauri.bat` 及云端工作流。
2. **本地环境准备**：安装 [Rust (rustup.rs)](https://rustup.rs/) 与 Visual Studio Installer（勾选“使用 C++ 的桌面开发”）。
3. **一键打包**：解压后双击根目录的 **`build_tauri.bat`**（或者推送至 GitHub 使用 Actions 中的 `build-release.yml` 云端自动构建免环境出包）。
4. **打包产物路径**：
   - **免安装便携单文件（`.exe`）**：`src-tauri/target/release/zlib-downloader.exe`（仅约 15MB）
   - **标准 Windows 安装包（`.exe`）**：`src-tauri/target/release/bundle/nsis/zlib-downloader_1.2.0_x64-setup.exe`

---

## 🌐 全平台部署实操指南

本项目已在 `vite.config.ts` 中启用全站相对路径（`base: './'`），无论部署在域名根目录还是二级子目录下都不会出现静态资源 404 白屏问题。

### 11.1 GitHub Pages 自动工作流（相对路径打包 -> 推送 gh-pages -> 自动部署）

本项目已内置 `.github/workflows/deploy.yml` 自动化工作流（先通过 `base: './'` 相对路径构建出 `dist/`，再推送至 `gh-pages` 分支完成发布）。

1. **推送代码到 GitHub 仓库**：
   ```bash
   git init
   git add .
   git commit -m "feat: multi-platform apk/exe, pagination, cover art & multi-AI"
   git branch -M main
   git remote add origin https://github.com/你的用户名/你的仓库名.git
   git push -u origin main
   ```
2. **开启 Actions 写入权限**（关键步骤，否则无法推送 `gh-pages` 分支）：
   - 打开 GitHub 仓库 -> **Settings -> Actions -> General**；
   - 滚动到底部找到 **Workflow permissions**，选中 **“Read and write permissions”**，点击 **Save**。
3. **设置 Pages 部署来源**：
   - 进入仓库 **Settings -> Pages**；
   - **Build and deployment -> Source** 选择 **“Deploy from a branch”**；
   - **Branch** 选择 **`gh-pages`**，目录选择 **`/ (root)`**，点击 **Save**。
4. 几分钟后即可通过 `https://你的用户名.github.io/你的仓库名/` 访问线上网站！

---

### 11.2 Cloudflare Pages 部署（推荐，国内访问极速）
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)；
2. 点击 **Workers & Pages -> Create -> Pages -> Connect to Git**；
3. 选择本项目的 GitHub 仓库；
4. 构建设置填写：
   - **Framework preset**：`Vite`
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
5. 点击 **Save and Deploy**，约 1 分钟生成全球高速 HTTPS 访问地址。

---

### 11.3 Vercel 部署
1. 访问 [Vercel](https://vercel.com/) 并使用 GitHub 登录；
2. 点击 **Add New... -> Project** 导入本仓库；
3. 框架预设会自动识别为 `Vite`（Build Command 为 `npm run build`，Output Directory 为 `dist`）；
4. 若需在线使用默认 Gemini AI 导读，可在 **Environment Variables** 中添加 `GEMINI_API_KEY`；
5. 点击 **Deploy** 即可上线。

---

### 11.4 Netlify 部署
1. 访问 [Netlify](https://www.netlify.com/) 并登录；
2. 点击 **Add new site -> Import an existing project**，选择您的 GitHub 仓库；
3. 填写：
   - **Build command**：`npm run build`
   - **Publish directory**：`dist`
4. 点击 **Deploy site** 完成部署。

---

### 11.5 传统 Linux 云服务器与虚拟主机部署（Nginx + PM2 / 宝塔面板）

#### 方式 A：纯静态托管（适合虚拟主机、OSS 对象存储、宝塔静态站点）
1. 本地执行 `npm run build` 生成 `dist/` 文件夹；
2. 将 `dist/` 里的全部文件（`index.html` 与 `assets/` 目录）通过 FTP 或宝塔文件管理器上传到虚拟主机根目录（如 `public_html/` 或 `/www/wwwroot/你的域名/`）；
3. 得益于 `base: './'` 相对路径设定，即使放在子文件夹（如 `https://你的域名/zlib/`）也能直接打开运行。

#### 方式 B：Node.js 全栈服务器部署（Nginx 反向代理 + PM2 守护，完整支持后端 AI 代理与接口）
1. 登录 Linux 云服务器（Ubuntu/CentOS/Debian），安装 Node.js (>=18) 与全局进程管理器：
   ```bash
   sudo npm install -g pm2 tsx
   ```
2. 上传项目源码至 `/var/www/zlib-app`，安装依赖并打包前端：
   ```bash
   cd /var/www/zlib-app
   npm install
   npm run build
   ```
3. （可选）创建 `.env` 文件填入 `GEMINI_API_KEY=你的密钥`、`PORT=3000`。
4. 启动服务并设置开机自启：
   ```bash
   pm2 start server.ts --name "zlib-app" --interpreter tsx
   pm2 save
   pm2 startup
   ```
5. 配置 Nginx 反向代理，将域名流量转发到 `http://127.0.0.1:3000`：
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   重载 Nginx（`sudo nginx -s reload`）即可通过域名全功能访问！

---

## 📲 移动端与不同设备响应式适配优化

为了确保在 iPhone、Android 全面屏手机、iPad 平板与 2K/4K 桌面显示器上都具备一流体验，项目做了全方位多设备适配：

1. **自适应双层导航**：
   - 桌面宽屏（`>= 1024px`）展示清晰的三段式导航栏；
   - 手机与小屏设备（`< 1024px`）自动切出**横向顺滑滚动功能栏**，手指左右轻滑即可切换搜索/队列/书库/镜像/多端打包，绝不发生文字换行挤压变形。
2. **模态弹窗屏幕保护**：
   - 所有弹窗应用 `max-h-[90vh]` 与弹性内部滚动，在手机端屏幕较矮或弹出输入法键盘时依然可以顺畅滚动查看底部的提交按钮。
3. **响应式瀑布卡片与分页器**：
   - 书库与搜索卡片在手机端为单列大触控布局，在平板端为双列，在大屏桌面上扩展为三列高密度视图；
   - 底部分页组件自动折叠首尾辅助按钮，保证小屏手机上页码可精准点击不溢出屏幕。

---

## ⚠️ 编程与部署避坑指南（小白排错大全）

在开发、打包或上线过程中遇到问题？先对照以下常见高频坑位排查：

### 1. 部署到 GitHub Pages 或二级目录后打开是白屏？
- **原因**：如果未配置相对路径，打包器默认以 `/assets/xxx.js` 绝对路径引用文件，导致二级目录（`user.github.io/repo/`）找不到资源报 404。
- **解法**：确认 `vite.config.ts` 中存在 `base: './'`（本项目已配置妥当）。

### 2. GitHub Actions 部署或构建报错 `Permission denied`（403 权限不足）？
- **原因**：GitHub 新建仓库默认将 Actions 权限锁定为“只读”。
- **解法**：进入仓库 **Settings -> Actions -> General -> Workflow permissions**，务必切换勾选 **“Read and write permissions”** 并保存。

### 3. 本地或云端打包 Android `.APK` 时 Gradle 报错？
- **原因**：Capacitor 6 + Gradle 8.x 强制要求 **JDK 17**，如果您电脑里装的是 JDK 8 或 JDK 11 会导致编译失败；此外国内网络拉取 Google Maven 仓库较慢。
- **解法**：安装 **JDK 17** 并在环境变量设置 `JAVA_HOME`；如果嫌本地配置安卓环境太麻烦，强烈建议直接使用本项目提供的 **GitHub Actions 云端自动打包（`build-release.yml`）**，全自动免费出包！

### 4. 配置自定义 OpenAI / DeepSeek API 时提示连接失败？
- **原因**：常见原因有两个：① Base URL 漏掉或重复写了 `/chat/completions`（通常只需填到 `/v1`，如 `https://api.deepseek.com/v1`）；② 模型 ID 拼写与服务商要求不匹配。
- **解法**：在「设置 -> AI 导读大模型 API 引擎配置」中点击一键预设按钮，填写正确 Key 后先点击 **“测试 API 连通性”** 验证通过再保存。

### 5. 浏览器控制台出现 WebSocket 报错怎么办？
- **原因**：Vite 默认的热重载（HMR）依赖开发服务器 WebSocket 长连接，在纯静态托管或云端反向代理环境中容易断开报错。
- **解法**：本项目已在 `vite.config.ts` 与 `server.ts` 显式关闭 `hmr: false` 并在 `index.html` 注入全局异常拦截，彻底消除误报。

### 6. `remind_me` Cookie 会失效吗？
- **解答**：正常情况下 `remind_me` 拥有数月至一年的长效期；但如果您在网页端手动点击了“退出登录（Logout）”，官方会作废该会话凭证。届时只需在浏览器重新登录一次并复制新的 `remind_me` 更新即可。

### 7. GitHub Actions 运行 `npm install` 报错 `ERESOLVE: vite@8.3.8 vs esbuild@0.25`？
- **原因**：`vite@8` 的可选对等依赖要求 `esbuild@^0.27.0 || ^0.28.0`，如果 `package.json` 写了低版本 `esbuild@^0.25.0` 或未开启兼容模式，npm 严格依赖解析会直接报错退出，导致后面找不到 `vite` 命令。同时 Vite 8 需要 Node `^20.19.0 || >=22.12.0`。
- **解法**：本项目已将 `esbuild` 升级至 `^0.28.0`，新增 `.npmrc`（`legacy-peer-deps=true`），并在所有工作流中使用 `Node 22` + `npm install --legacy-peer-deps`，彻底解决冲突。

### 8. Tauri 打包报错 `tauri.conf.json error: Additional properties are not allowed ('bundle', 'identifier', 'productName', 'version')`？
- **原因**：这是 **Tauri v1 与 Tauri v2 配置文件格式混用** 导致的经典坑！`@tauri-apps/cli@1.5` 使用 v1 Schema，要求 `productName`/`version` 必须写在 `"package"` 对象内，`identifier`/`bundle`/`icon` 必须写在 `"tauri.bundle"` 对象内，同时必须具备 `src-tauri/build.rs` 和 `src-tauri/icons/icon.ico`。
- **解法**：本项目已将 `src-tauri/tauri.conf.json` 修正为 100% 合法的 Tauri v1.5 格式，并补齐了 `build.rs` 与全套 `icons/` 图标文件，Windows CI 与本地打包均可直接通过。

### 9. 打包 Android APK 时 Capacitor 与 Java JDK 版本冲突？
- **原因**：Capacitor 7+ 要求 JDK 21，而主流打包环境默认配置的是 JDK 17，如果直接 `npm install @capacitor/android` 不指定版本会导致 Gradle 编译报错。
- **解法**：脚本与工作流已显式锁定兼容 JDK 17 的 `@capacitor/core@^6.2.0 @capacitor/cli@^6.2.0 @capacitor/android@^6.2.0`，并配合 `android-actions/setup-android@v4`（原生支持 Node 24 与 Ubuntu 24.04）自动配置 SDK。

### 10. 打包成 Windows `.exe`、Android `.apk` 或部署纯静态网页后，点击登录报错“网络连接错误，无法连接到验证服务器”？
- **原因**：在开发模式（`npm run dev`）下有本地 Express 后端监听 `/api/*` 接口；但打包成桌面 `.exe`（Tauri WebView）、手机 `.apk`（Capacitor WebView）或托管在 GitHub Pages / Cloudflare Pages / Vercel / Netlify / 虚拟主机时，容器内只有纯静态前端 `dist/` 文件，没有 Node 后端进程，因此原始 `fetch('/api/zlib/login')` 会报网络异常或返回 404 HTML。
- **解法**：本项目已在 `src/utils/standaloneApi.ts` 与 `src-tauri/src/main.rs` 中构建了**全端镜像直连通信层**（自动路由：`Express 后端代理 -> Tauri Rust 原生 reqwest 通道（.exe） -> 客户端直连`）：
  - **双协议登录与浏览器一键打开**：同步兼容 `/api/auth-status + /login`（`zlibrary_session`）与传统 `/rpc.php`（`remind_me`），遇到 Turnstile 人机验证时提供「浏览器打开登录账号」按钮并支持粘贴两种 Cookie；非 VIP 账号默认每日 10 本额度；
  - **真实镜像搜索与导出**：自动适配 `/s?q=...` 与 `/s/...` 双路径格式，解析真实书单与封面（绝不虚构不存在的示例书籍）；
  - **AI 导读与测试**：在「设置 → AI 导读大模型多 API 管理中心」填入您的 Gemini / OpenAI / DeepSeek / 兼容 API Key 后，客户端可直接并发请求官方或自定义 Base URL。

### 11. GitHub Actions 构建时提示 `Node.js 20 is deprecated`、`setup-java v4 is deprecated` 或 `ubuntu-latest` 警告？
- **原因**：GitHub Actions 逐步弃用 Node 20 运行时旧版插件与即将迁移的 `ubuntu-latest`。
- **解法**：本项目的 `.github/workflows/deploy.yml` 与 `.github/workflows/build-release.yml` 已全面升级为 **`ubuntu-24.04`**，并将核心插件升级至原生 Node 24 支持版本（`actions/checkout@v6`、`actions/setup-node@v5`、`actions/setup-java@v5`、`android-actions/setup-android@v4`、`actions/upload-artifact@v6`、`peaceiris/actions-gh-pages@v4`），构建日志零弃用警告。

### 12. 为什么老镜像节点如 `z-lib.fm` / `singlelogin.re` / `1lib.sk` 会提示 `fetch failed` 或连接异常？
- **原因**：Z-Library 镜像域名经常动态轮换。实测老域名会出现 **SSL 证书过期（`CERT_HAS_EXPIRED`）**、**DNS 解析下线（`ENOTFOUND`）**、跳转广告页或触发 **`__diamwall` 重定向防爬拦截（HTTP 513）**。
- **解法**：本项目已将默认活跃镜像切换为实测可稳定检索的 **`https://z-lib.id`** 与 **`https://z-lib.cc`**，同时在后端加入 Cookie-Jar 重定向跟踪与证书/域名精准中文报错；遇到节点失效时，搜索提示卡片上可直接点击 **「一键切换至可用镜像 (z-lib.id) 并重试」**。

---

## 📄 开源许可证

本项目遵循 **Apache-2.0** 开源许可证。
仅供学术交流、电子书管理技术研究及跨平台客户端工程学习使用，图书版权归原作者与出版机构所有。
