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

## 🌟 核心三步操作工作流（选择镜像 -> 浏览器提取 Cookie -> 免密下载）

为了给您提供与官方一致且不受网络防火墙干扰的下载体验，软件推荐以下三步标准流程：

```text
【步骤 1：选择镜像节点】
在软件的「镜像节点」中测试延迟，选择一个绿色的最优站点（如 https://singlelogin.re）。
        ⬇
【步骤 2：在电脑浏览器登录并提取凭证】
点击“在浏览器打开”，在 Chrome / Edge / Firefox 中登录官方账号，按 F12 复制 remind_me Cookie。
        ⬇
【步骤 3：填入账号中心并搜索下载】
在软件右上角「账号中心」粘贴该 Cookie，系统立即获得 VIP 下载配额，在「书籍搜索」畅快下载！
```

---

## 💡 重点：为什么要在电脑浏览器中登录 Z-Library 镜像并提取 Cookie？

很多刚接触 Z-Library 的小伙伴经常会问：*“为什么不能直接在软件里输入账号密码登录？为什么要多一步在电脑浏览器里登录并复制 Cookie 呢？”*

### 1. Cloudflare 5秒盾人机防御拦截
Z-Library 官方及其公开镜像站点普遍配置了严苛的 **Cloudflare 5秒盾防火墙与 Turnstile 人机验证码**。如果任何第三方客户端或脚本直接向登录接口发送账号密码请求，Cloudflare 会立刻将其判定为机器人恶意攻击，直接返回 **`403 Forbidden`** 或 **`503 Service Temporarily Unavailable`** 阻断登录。

### 2. 浏览器是官方认可的权威合法环境
当您在电脑正规浏览器（Chrome、Edge、Firefox 或 Brave）中打开镜像站点并登录时，浏览器能够完美运行 Cloudflare 的 JavaScript 验证挑战脚本，顺利通过人机判定。验证通过后，官方服务器就会向您的浏览器颁发一张权威的登录通行证——名为 **`remind_me` 的会话 Cookie**。

### 3. 免密授权，100% 绕过人机拦截
这个 `remind_me` Cookie 包含了您账号的合法登录态、VIP 等级和专属高速下载通道权限。将它复制粘贴到本下载器后，软件后续发起的所有图书检索与下载请求，都带着这张权威通行证，从而 **100% 绕过 Cloudflare 验证码拦截**，绝不会弹窗阻断，享受高速稳定的满速文献下载！

### 📋 30 秒提取凭证手把手教程：
1. **浏览器打开镜像**：在电脑浏览器打开当前选中的镜像站点（例如 `https://singlelogin.re` 或 `https://z-lib.is`）。
2. **正常登录**：输入您的 Z-Library 邮箱和密码，完成登录（如遇人机验证，勾选验证框通过）。
3. **按 F12 键**：登录成功进入主页后，按键盘最上方的 **`F12`** 键（或在页面空白处点击鼠标**右键 -> 检查**）。
4. **定位到 Cookies 表格**：
   - **Chrome / Edge / 360 极速浏览器**：点击顶部标签栏的 **“Application”（应用程序）**，左侧展开 **Storage -> Cookies -> 点击当前站点域名**。
   - **Firefox 火狐浏览器**：点击顶部标签栏的 **“Storage”（存储）**，左侧展开 **Cookies -> 点击当前站点域名**。
5. **复制 Value 值**：在右侧列表中找到 Name 为 **`remind_me`** 的这一行，双击它的 **Value** 列，按 `Ctrl + C`（Mac 用户按 `Cmd + C`）复制这一长串字母与数字。
6. **粘贴完成授权**：回到本下载器，点击右上角 **“账号登录” -> “添加新账号” -> “Remind-Me Cookie 免密登录”**，直接粘贴并点击“确认添加并登录”即可！

---

## 📂 项目文件结构与每个文件的详细功能解析（零基础小白必读）

本项目遵循生产级全栈单体工程结构，以下是仓库中**每一个文件与目录的详细功能与作用说明**，帮助零基础同学彻底看懂整个项目架构：

```text
├── .env.example
│   └── 环境变量模板文件。声明了 GEMINI_API_KEY、OPENAI_API_KEY、DEEPSEEK_API_KEY 及 PORT=3000 等配置模板（不含任何真实密钥）。
│
├── .gitignore
│   └── Git 忽略规则文件。规定构建输出目录（dist/、android/、src-tauri/target/）与依赖目录（node_modules/）不提交到代码仓库，保持仓库干净。
│
├── index.html
│   └── 整个 Web 与移动端 App 的 HTML5 根入口文件。配置了中文语言声明（lang="zh-CN"）、viewport 移动端自适应缩放标签、SEO 标题描述以及防无状态沙箱报错的 WebSocket 守卫脚本。
│
├── metadata.json
│   └── AI Studio 沙箱平台应用元数据清单。声明应用名称、功能描述以及服务端 Gemini API 调用能力。
│
├── package.json
│   └── 项目的“身份证与管家”。记录了前端（React 19、Tailwind CSS v4、Motion、Lucide 图标）、后端（Express、tsx、@google/genai）依赖包清单，以及开发（npm run dev）、打包（npm run build）脚本命令。
│
├── tsconfig.json
│   └── TypeScript 编译器配置文件。设定严格类型检查标准与模块解析规则，提前在写代码阶段拦截低级错误。
│
├── vite.config.ts
│   └── Vite 极速构建工具配置。核心配置了 base: './'（全站相对路径基准，确保 GitHub Pages 子目录、APK 本地 WebView 容器及虚拟主机永不 404 白屏），并禁用易报错的 HMR WebSocket。
│
├── server.ts
│   └── Node.js 全栈后端核心服务（Express + tsx）。承担六大职责：
│       1) Z-Library 官方检索与 16 本内置经典示例书库接口（/api/zlib/search）；
│       2) 立体书皮封面矢量图（SVG Data URI）实时生成，确保断网也能清晰显示精装封面；
│       3) 多镜像节点在线状态与毫秒延迟测速（/api/zlib/mirrors）；
│       4) 官方账号密码与 remind_me Cookie 验证接口（/api/zlib/login）；
│       5) 多大模型 AI 导读服务端安全代理（/api/gemini/summary 与 /api/ai/test），统一代发 Google Gemini、OpenAI、DeepSeek 及自定义兼容 API 请求，彻底解决浏览器跨域（CORS）拦截；
│       6) 多端打包套件下载接口（/api/package/download/windows 与 /api/package/download/android），直接导出包含已编译 dist/ 的 Windows 与安卓打包压缩包。
│
├── capacitor.config.json
│   └── Android 移动端 APK 打包核心配置文件。定义了包名（com.zlib.downloader）、应用显示名称、打包输出目录（dist）以及 Android WebView HTTPS 安全策略。
│
├── build_android_apk.bat
│   └── Windows 一键打包 Android .APK 批处理脚本。双击自动检测环境、安装 Capacitor Android 模块、同步前端编译资源并调用 Gradle 编译出原生 .apk 安装包。
│
├── build_android_apk.sh
│   └── macOS / Linux 一键打包 Android .APK Shell 脚本。功能同上，适合 Mac 与 Linux 开发者在终端执行。
│
├── build_tauri.bat
│   └── Windows 一键打包桌面版 .EXE 批处理脚本。自动构建前端并调用 Rust/Tauri 编译出 Windows 便携版和安装向导。
│
├── .github/workflows/
│   ├── deploy.yml             # GitHub Pages 网页自动发布工作流：每次 push 到 main，自动以相对路径构建并推送到 gh-pages 分支完成网站部署。
│   └── build-release.yml      # 云端多端自动化构建工作流：无需本地装 Android Studio 或 Rust，在 GitHub 云端服务器自动编译生成 Android .apk 与 Windows .exe 安装包供直接下载！
│
├── src-tauri/                 # Tauri 原生桌面应用核心目录（Rust 语言）
│   ├── Cargo.toml             # Rust 项目的依赖清单（tauri、tokio 异步运行时、reqwest 下载器）。
│   ├── tauri.conf.json        # Windows 桌面窗口配置文件（窗口尺寸 1200x800、应用图标、NSIS 安装向导规则）。
│   └── src/main.rs            # Rust 程序入口，启动原生桌面 WebView 窗口并初始化底层多线程文件下载器。
│
└── src/                       # React 前端源代码核心目录
    ├── main.tsx               # React 前端启动入口，把 App 组件渲染到 index.html 的 root 节点中。
    ├── App.tsx                # 全局状态中枢。统一管控多账号切换、镜像节点、下载任务队列（含封面图）、本地书库、AI 大模型配置、明暗主题及全局 Toast 轻提示。
    ├── index.css              # 全局样式总入口。导入 Tailwind CSS v4 框架与滚动条美化规则。
    ├── types.ts               # TypeScript 数据类型字典。严格定义了 Book（图书）、DownloadTask（下载任务含封面）、Mirror（镜像）、UserAccount（账号）、AIConfig（AI 引擎配置）结构。
    └── components/            # 模块化 UI 界面组件库
        ├── Header.tsx         # 顶部导航栏。包含仿桌面窗口控制条、活跃账号 VIP 额度胶囊、明暗主题切换、设置按钮与移动端横向滑动导航条。
        ├── SearchSection.tsx  # 书籍检索大厅。支持官方 4 种字段检索、精确匹配、热门标签、格式/语言筛选，展示带有立体封面图的卡片，并内置可调整每页显示数量的分页器。
        ├── DownloadQueue.tsx  # 下载队列页面。展示每本书的高清封面缩略图、毫秒级进度条、实时速度与剩余时间，支持暂停/恢复/取消，并在任务多时自动分页显示。
        ├── LocalLibrary.tsx   # 本地书库页面。以网格卡片形式展示已下载书籍的立体封面、文件大小与格式徽章，支持启动 AI 导读、定位本地目录，支持分页及每页数量切换。
        ├── MirrorsManager.tsx # 镜像节点管理中心。提供官方与社区镜像测速、一键智能切换到最快节点，以及新增、编辑、删除自定义镜像站点。
        ├── LoginModal.tsx     # 官方账号中心弹窗（统一 640px 高度规范）。支持多账号列表切换、配额进度条、密码登录、remind_me Cookie 免密登录、退出与删除账号。
        ├── AISummaryModal.tsx # AI 图书精读导读弹窗（统一 640px 高度规范）。展示当前激活的模型引擎，自动请求后端代理生成结构化书评、核心思想与阅读建议。
        ├── SettingsTab.tsx    # 全局设置中心。除了下载目录、并发线程设置外，内置完整的「AI 导读大模型多 API 管理中心」，支持同一模型下添加多个不同 API 配置，并对每条配置进行新增、编辑修改、连通性测试、删除与一键启用切换。
        ├── TauriPackagerModal.tsx # 多端打包指导中心。提供 Windows 套件包与 Android 套件包的一键 ZIP 下载、双向构建教程及全套配置文件/脚本在线查看与导出功能。
        └── Pagination.tsx     # 通用智能分页组件。支持首页/上一页/页码跳转/下一页/末页以及自定义“每页显示 X 条”，自动适配手机端和桌面端。
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
   - 卡片上直观显示该账号今日的剩余下载额度进度条（如 `968 / 999 本`）与 VIP 标识；
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

---

## 📄 开源许可证

本项目遵循 **Apache-2.0** 开源许可证。
仅供学术交流、电子书管理技术研究及跨平台客户端工程学习使用，图书版权归原作者与出版机构所有。
