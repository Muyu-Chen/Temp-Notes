# 临时笔记 - 默认离线的隐私草稿应用 📝

一个**默认完全离线运行**的临时笔记应用，支持快速草稿、条目存档、Markdown 预览、录音附件、ZIP 备份和可选 AI 标签。所有笔记数据默认存储在本地浏览器；只有用户主动启用大模型功能并点击测试连接或使用 AI 功能时，才会请求用户自己配置的服务。
在需要快速记录想法、灵感或待办事项时，临时笔记提供了一个快捷、安全的环境，让你随时捕捉和管理你的笔记内容，而不需要打开臃肿的笔记应用。  
在临时需要粘贴文本、保存临时信息的时候，临时笔记是一个轻量级的工具，可以快速打开并使用，帮助你高效地管理临时信息。  

> 你的笔记，你的数据，始终在你的手中：ZIP（Json+mp3） 导入导出可以同时备份文本和录音，确保你可以随时查看、备份、迁移或恢复你的数据，无论何时何地。  

## 🌐 在线体验

**完全相同的两个独立部署**（浏览器同源策略隔离，数据不互通）：

| 网址 | 说明 |
|------|------|
| [muyyy.link/draft](https://muyyy.link/draft) | 部署地址 1，目前版本与GitHub同步 |
| [imagingmodel.com/draft](https://imagingmodel.com/draft/) | 部署地址 2，版本略低于GitHub版本，更稳定 |

> **为什么数据不互通？** 由于浏览器的同源策略（Same-Origin Policy），不同域名的网页无法访问彼此的本地存储。每个域名的笔记完全隔离，不相互污染。

## 如何部署？
使用git clone克隆仓库后，直接打开 `./index.html` 即可使用，无需任何服务器配置。  
`git clone https://github.com/Muyu-Chen/Temp-Notes.git`.   
可以直接在服务器上git clone，也可以在本地git clone后直接本地打开，也可以将整个文件夹上传到任意静态文件服务器（如GitHub Pages、Netlify等）进行部署。本项目完全静态，无需后端支持。    

## 隐私保证

- **默认离线运行**：在浏览器本地执行，不会自动发起网络连接
- **源代码开放**：所有 JavaScript 文件开源，**无任何隐藏的网络请求**
- **本地存储**：所有笔记内容仅保存在本地浏览器 LocalStorage/IndexedDB
- **默认不上传**：除非用户明确启用并使用自定义大模型功能，否则不会发送笔记数据
- **无追踪**：无分析工具、无 Cookie、无隐藏连接
- **tips**：大模型功能默认关闭。连接测试只会在用户启用大模型并点击测试按钮后，请求 `GET {base_url}/models`；AI 标签只会在用户点击 `AI 生成标签` 后发送当前条目文本；`base_url`、`api_key`、`model` 均由用户输入并保存在本地。

### 隐私保证细节

我们的 JavaScript 文件中：
- **没有** 自动 `fetch()` 网络请求
- **没有** `XMLHttpRequest` 
- **没有** `WebSocket` 连接
- **没有** 任何外部资源加载，可完全离线使用，llm功能也可以设置为本地base_url。
- **只有** 本地 LocalStorage/IndexedDB 操作
- 可选的大模型连接测试和 AI 标签只会在用户明确点击后使用 `fetch()` 请求用户配置的地址。

所有代码开源透明，欢迎审计！

## 项目结构

```
临时笔记/
├── css/                    # 样式文件目录
│   ├── theme.css          # 主题系统（颜色变量定义）
│   ├── base.css           # 基础样式（全局重置、Utility类）
│   ├── layout.css         # 布局组件（app、header、main、panel等）
│   └── components.css     # UI组件（button、textarea、card等）
├── js/                     # JavaScript 模块目录
│   ├── main.js            # 最薄入口（DOM ready -> bootstrap）
│   ├── app-controller.js  # 应用级协调器
│   ├── constants.js       # 稳定常量
│   ├── crypto.js          # 加密底层函数
│   ├── crypto-js.min.js   # 本地 CryptoJS 依赖
│   ├── storage.js         # 存储模块统一出口
│   ├── utils.js           # 工具模块统一出口
│   ├── bootstrap/         # 启动编排与事件绑定
│   ├── services/          # 业务服务
│   ├── storage/           # IndexedDB 与数据持久化模块
│   ├── ui/                # DOM、视图、弹窗、UI反馈
│   ├── lib/               # 按职责拆分的工具函数
│   └── vendor/            # 本地第三方浏览器库
├── tests/                 # Vitest 回归测试
├── index.html             # 应用入口页面
├── README.md              # 英文项目文档
└── README-CHINESE.md      # 中文项目文档
```

## 架构设计

### 分层架构

1. **入口与启动层（Entry & Bootstrap）**
   - `main.js`: 等待 DOM 就绪并启动应用
   - `bootstrap/app-bootstrap.js`: 创建核心对象并编排启动步骤
   - `bootstrap/bind-events.js`: 绑定 DOM 事件到控制器动作
   - `bootstrap/first-run.js`: 首次打开标记和使用说明写入

2. **表现层（Presentation）**
   - `ui/ui-controller.js`: toast、meta 信息和壳层级 UI 反馈
   - `ui/item-list-view.js`: 存档条目列表渲染
   - `ui/recycle-list-view.js`: 回收站列表渲染
   - `ui/dom-manager.js`: DOM 访问封装
   - `ui/modal.js`: 通用弹窗组件
   - `css/*`: 所有样式文件

3. **协调与业务服务层（Coordination & Services）**
   - `app-controller.js`: 应用级协调器和共享状态
   - `services/*`: 草稿、条目、加密、回收站、设置、主题、导入导出流程

4. **数据访问层（Data Access）**
   - `storage/idb.js`: IndexedDB 连接和 object store 初始化
   - `storage/*-storage.js`: 草稿、条目、回收站、设置、导入导出相关存储能力
   - `storage.js`: 对外统一存储出口

5. **工具层（Utilities）**
   - `lib/*`: 文本、时间、字节、ID、平台判断等工具
   - `utils.js`: 对外统一工具出口

### 模块职责

| 模块 | 职责 | 导出内容 |
|------|------|---------|
| `main.js` | 应用入口 | DOM ready 启动 |
| `bootstrap/app-bootstrap.js` | 启动编排 | `bootstrapApp` |
| `bootstrap/bind-events.js` | 事件绑定 | `bindAppEvents` |
| `bootstrap/first-run.js` | 首次打开逻辑 | `initializeFirstRun` |
| `app-controller.js` | 应用协调 | `AppController` 类 |
| `services/draft-service.js` | 草稿自动保存与存档流程 | `DraftService` |
| `services/item-service.js` | 条目标题和删除流程 | `ItemService` |
| `services/encryption-service.js` | 条目加密/解密流程 | `EncryptionService` |
| `services/recycle-service.js` | 回收站数据状态 | `RecycleService` |
| `services/recycle-actions-service.js` | 回收站恢复/删除/清空动作 | `RecycleActionsService` |
| `services/import-export-service.js` | JSON/ZIP 导入导出流程 | `ImportExportService` |
| `services/llm-service.js` | 可选大模型连接与 AI 标签请求 | `LLMService` |
| `services/settings-service.js` | 字体大小、LLM 设置、清空数据 | 设置相关函数 |
| `services/theme-manager.js` | 主题读取、应用、切换 | 主题相关函数 |
| `storage/idb.js` | IndexedDB 基础能力 | `getDB`、store 常量 |
| `storage/draft-storage.js` | 草稿持久化 | 草稿读写函数 |
| `storage/item-storage.js` | 条目持久化 | 条目读写函数 |
| `storage/recycle-storage.js` | 回收站持久化 | 回收站读写函数 |
| `storage/settings-storage.js` | settings object store 访问 | `readSetting`、`writeSetting` |
| `storage/import-export-storage.js` | 导入导出规范化 | 导出、规范化、合并函数 |
| `ui/ui-controller.js` | UI 反馈和 meta 信息 | `UIController` 类 |
| `ui/dom-manager.js` | DOM 管理 | `DOMManager` 类 |
| `ui/item-list-view.js` | 条目列表渲染 | `ItemListView` 类 |
| `ui/recycle-list-view.js` | 回收站渲染 | `RecycleListView` 类 |
| `ui/markdown-renderer.js` | Markdown 渲染封装 | `renderMarkdown` |
| `lib/download-utils.js` | 单条文本导出工具 | 文件名与下载内容生成 |
| `ui/modal.js` | 弹窗组件 | `Modal` 类 |
| `lib/*` | 聚焦工具函数 | 文本/时间/字节/ID/平台工具 |
| `vendor/*` | 本地第三方库 | JSZip、Marked、DOMPurify |
| `constants.js` | 稳定常量 | `STORAGE_KEYS` |
| `crypto.js` | 加密底层能力 | 加密/解密/密码校验函数 |

## CSS 结构

### theme.css
- CSS变量定义（--bg, --text, --accent等）
- Dark/Light主题切换

### base.css
- 全局重置（box-sizing, margin, font等）
- Utility类（.muted, .small, .mono）

### layout.css
- 主要容器（.app, header, .main, .panel）
- 响应式设计（媒体查询）

### components.css
- UI组件样式（button、textarea、input、card等）
- 交互反馈（hover、active状态）

## 快速开始

### 测试流程

项目使用 Vitest 作为标准回归测试工具。

1. 安装依赖：

```bash
npm install
```

2. 运行测试：

```bash
npm test
```

当前测试重点覆盖以下回归场景：

- 草稿生命周期：存档、清空、新建、自动保存、加密条目加载拦截、时间戳保持
- 条目操作：标题修改回退、加密标题元数据同步、删除进入回收站
- 回收站状态：初始化只加载一次、添加、删除、恢复、清空
- 回收站自动清理：永不/7天/30天/90天保留策略，以及切换设置后的清理触发
- 导入导出工具：数据规范化、空条目过滤、去重、排序、ZIP 封装、录音导入导出和导出结构
- 单条 TXT/Markdown 导出：文件名清理、时间戳、MIME 类型、加密条目菜单限制
- 设置项：Markdown 模式记忆、回收站保留策略、LLM 设置保存
- LLM 连接与 AI 标签服务：关闭或配置不完整时不请求、OpenAI-compatible `/models` 与 `/chat/completions` 请求、成功/失败状态、本地失败日志
- Markdown 渲染：无依赖兜底转义、本地 `marked` + `DOMPurify` 集成
- 文本工具：标题解析、首行回退、文本截断、中英文混合字数统计

### 快捷键
- `Ctrl+S`: 存档当前草稿
- `Ctrl+K`: 搜索存档条目
- `Ctrl+L`: 清空草稿

## 数据流

```
用户输入
   ↓
DOMManager 读写 DOM 状态
   ↓
bindAppEvents 分发浏览器事件
   ↓
AppController 协调服务模块
   ↓
Services 更新应用状态并调用 storage 模块
   ↓
UIController 和视图模块渲染反馈
   ↓
用户看到反馈
```

## 📝 主要功能

- 🖊️ 第一次启动自动弹出使用说明
- ✍️ 自动保存草稿
- 📦 条目存档管理
- 🔍 全文搜索条目
- 📊 实时字数/存储统计
- 🌓 深色/浅色主题切换
- 💾 全量导出为 ZIP，包含 `notes.json` 和本地录音文件
- 📄 单条存档导出为 TXT 或 Markdown
- 📥 从旧版 JSON 或新版 ZIP 导入（支持合并去重）
- 👀 本地 Markdown 预览，并记住编辑/预览模式
- 🧹 可选回收站自动清理
- 🏷️ 条目置顶、收藏、标签、标签筛选和可选 AI 标签生成
- 🎙️ 本地草稿录音附件，支持播放、重命名、导出、回收站和恢复
- 🔌 可选 OpenAI-compatible 大模型连接测试
- ⌨️ 丰富的快捷键支持

## 🔧 扩展指南

### TODO - 已完成
- [x] 改为 IndexedDB 存储：提供更大的存储空间，并确保所有客户端（不同浏览器、不同设备）都能正常使用（不是同步，只是为了确保所有用户都能正常使用功能）。  
- [x] 增加对称加密：为数据提供密码保护功能，确保数据的隐私性和安全性。用户可以设置密码来加密/解密数据。
- [x] 草稿区与存档条目合并：如果新保存的草稿与之前才保存的条目开头一致，则自动更新为同一条记录，而不是创建新条目。如果打开的草稿修改后保存，需要覆盖保存。
- [x] 中文字体优化：将默认字体调整为其他清晰可读的字体，避免使用宋体（例如改为微软雅黑、苹方等）。
- [x] 滑动条美化：优化滚动条的样式，使其更加现代且易于使用（例如增加自定义样式，改善视觉效果）。
- [x] 字体大小在设置功能中可以调整
- [x] 更多功能入口：将“清空”改为“更多”入口，点击后弹出包含“回收站”和“导入/导出”功能的界面。
- [x] 更多点击后会弹出一个界面，左侧包括“回收站” “导入/导出” 这两个功能，点开回收站后，其中可以一条一条删除，这里可以二次确认，自己做弹窗，还有清空所有的按钮，同样二次确认。
- [x] 删除逻辑：删除条目时不再需要二次确认，而是将其放入“回收站”。回收站可以随时查看和恢复条目。
- [x] 回收站管理：在回收站中，用户可以逐条删除条目，需要二次确认删除操作。还可以清空所有内容，需要二次确认。
- [x] 旧版 JSON 导入与导出功能：提供基础数据迁移能力，导入时考虑数据去重和格式兼容。
- [x] 清空切断链路：只要草稿在任意时刻变为空（清空），则视为一次“重新开始”。从“草稿为空”之后开始输入的内容，只要用户点击保存，就必须新建一条记录（新 id），不允许覆盖/合并到之前保存的记录。  
- [x] 加密的默认密码为“password”，若用户加密时密码为空，则使用默认密码。解密时对于默认密码的笔记，直接自动解密。该修改确保用户只是为了不被别人一眼看见而加密，而非为了真正的安全保护，因此不强制用户设置密码。此修改不会降低数据的安全性，用户仍然可以选择设置更强的密码来保护他们的数据。  
- [x] 解密后仍然保留密码提示，如果用户需要再次加密，可以直接使用之前的密码提示，无需重新输入。但密码仍需要重新输入。未来会增加记住密码的功能，用户可以选择是否记住密码以便下次自动填充。
- [x] 页面主标题右侧增加 GitHub 小字链接，直接跳转到仓库地址。
- [x] 条目标题支持点击修改，不再只能在加密时填写。
- [x] 加密弹窗会自动读取并填入当前已有标题，避免重复输入。
- [x] 条目标题清空后自动回退为正文第一行，保持默认标题逻辑。
- [x] 首次打开逻辑会维护 `firstOpen` 标记，并在需要时向草稿区注入使用说明。
- [x] 清空草稿时，如果当前草稿已经存档，则直接清空；未存档草稿才显示确认提示。
- [x] 重复存档未变化的草稿时，不再更新时间戳。
- [x] 常见单条条目修改改为增量保存，不再每次重写完整存档列表。
- [x] 草稿区新增本地 Markdown 预览。
- [x] 存档条目菜单新增单条 TXT/Markdown 导出。
- [x] Markdown 编辑/预览模式跨条目和刷新后保持。
- [x] 新增可配置的回收站自动清理。
- [x] 新增可选 OpenAI-compatible 大模型配置和连接测试。
- [x] 新增条目置顶、收藏、标签和标签筛选。
- [x] 基于可选 OpenAI-compatible 配置新增手动 AI 生成标签。
- [x] 新增本地草稿录音附件，支持播放、重命名、导出、回收站和恢复。
- [x] 全量备份升级为 ZIP：包含 `notes.json` 和录音文件，同时保留旧版 JSON 导入。

### TODO - 待开发

#### 近期工作流优化

- [ ] 将 `Ctrl+K` 升级为全局快速跳转面板：支持搜索存档、回收站和当前草稿，支持键盘上下选择与回车打开。
- [ ] 增加存档条目批量操作：多选删除、批量导出，以及在安全边界清楚的前提下支持批量加密/解密。
- [ ] 增加草稿版本历史，保留最近几次编辑，并支持误覆盖后的简单恢复。
- [ ] 优化大体量本地数据库的首次加载性能，并增加克制的加载状态。

#### 录音与附件

- [x] 在条目中增加录音播放控件，支持进度拖动、倍速播放、重命名和移除附件。
- [ ] 支持图片附件：提供本地预览、体积提示，并兼容 ZIP 备份。
- [ ] 增加附件管理器，集中列出大体积附件，帮助用户清理存储空间而不是整条删除。
- [ ] 规划可选的录音转写能力：只能由用户主动触发，并且只调用用户自己配置的大模型/转写服务。

#### 安全与数据控制

- [ ] 新增默认密码修改功能，目前默认密码为“password”，用户可以在设置中修改默认密码；新加密条目使用新默认密码，旧条目保持原密码逻辑。
- [ ] 在上一条基础上新增“一键迁移密码”功能，将旧默认密码加密的条目批量迁移到新的默认密码；执行前应明确建议用户先备份。
- [ ] 新增解密后记住密码功能：用户可以选择在解密后记住密码，以便下次自动填充。
- [ ] 增加存档自动清理规则，与回收站自动清理分开配置，例如把超过指定期限的条目删除或移入回收站。
- [ ] 增加备份提醒与备份健康检查，例如展示上次导出时间、本地存储估算体积、是否存在大附件。
- [ ] 增加导入预览，在真正合并前展示新增、重复、冲突条目的数量与示例。

#### Markdown 与编辑体验

- [ ] 增强 Markdown 编辑工具栏：支持标题、加粗、链接、列表、代码块、任务列表等常见操作。
- [ ] 在大屏上增加 Markdown 分屏预览，小屏继续保留现有编辑/预览切换。
- [ ] 增加当前草稿内搜索，显示匹配数量，并支持上一个/下一个匹配跳转。
- [ ] 增加可复用笔记模板，例如会议记录、每日记录、任务清单等临时笔记格式。

#### 可选大模型能力

- [ ] 基于可选 LLM 配置新增摘要、润色、续写、提取待办等草稿能力。
- [ ] 每次大模型请求前展示将要发送的文本范围，由用户确认后才发起请求。
- [ ] 在设置中补充模型能力说明，帮助用户判断当前配置模型是否适合摘要、改写或转写。
- [ ] 保持所有大模型功能默认关闭、用户主动触发，并且只请求用户配置的 OpenAI-compatible 服务。

#### 同步与平台能力

- [ ] 新增同步功能，由于该功能需要连接互联网，设计为独立开关且默认关闭；用户需自行配置自定义服务器的 `POST`/`GET` 地址。
- [ ] 新增服务端组件：采用独立 Python 轻量脚本实现基础数据接收/读取接口，并配置 CORS 以配合同步功能。
- [ ] 增加同步冲突处理：本地优先合并规则，以及冲突条目的人工确认界面。
- [ ] 考虑增加 PWA 支持，方便安装、离线启动，以及改善移动端快速记录体验。
- [ ] 增加录音、附件、大体积 IndexedDB 数据在不同浏览器中的兼容性检查。


### 添加新功能

1. **添加新的UI组件**
   - 在 `css/components.css` 中编写样式
   - 在 `js/ui/` 中编写聚焦的渲染逻辑
   - `ui/ui-controller.js` 只处理共享 UI 反馈和 meta 信息

2. **添加新的业务功能**
   - 在 `js/services/` 中实现核心流程
   - `app-controller.js` 只负责协调
   - 在 `bootstrap/bind-events.js` 中绑定 DOM 事件

3. **添加新的数据存储**
   - 在 `js/storage/` 中添加 Load/Save 方法
   - 在 `constants.js` 中定义存储键
   - 需要公开给外部使用时，通过 `storage.js` 导出

4. **添加新的工具函数**
   - 在 `js/lib/` 中按职责实现
   - 需要公开给外部使用时，通过 `utils.js` 导出

### 添加新的CSS主题
```css
/* css/theme.css 中添加新主题 */
[data-theme="custom"] {
  --bg: #your-color;
  --text: #your-color;
  /* ... 其他变量 ... */
}
```

## 💡 最佳实践

1. **模块独立性**: 每个JS模块只负责一个职责
2. **参数校验**: 所有公开API都进行输入校验
3. **错误处理**: 使用try-catch保护关键操作
4. **性能**: 防抖保存草稿（250ms延迟）
5. **可访问性**: 保留语义化HTML结构

## 🐛 已知限制

- LocalStorage 大小限制（通常5-10MB）
- 不支持离线同步
- 单标签页使用（多标签页可能冲突）

## 📦 浏览器兼容性

- Chrome/Edge 85+
- Firefox 78+
- Safari 14+
- 需要ES6 Module支持

## 📄 许可证

**AGPL-3.0 (GNU Affero General Public License v3.0)**

- 任何修改必须开源
- 商业使用时必须开源所有代码
- 网络服务使用也受约束  

详见 [LICENSE](LICENSE) 文件。

## 🤝 商业化需求

如果您有商业化需求或需要其他许可证协议，欢迎访问：

**https://imagingmodel.com/**

联系我们了解更多信息、获取商业许可证或讨论合作方案。

---

**开发者**: MuYYY @ 成都英赛特科技有限公司    
**最新版本**: 1.1.0  
**许可证**: AGPL-3.0    
**AI使用**: 本项目使用了AI辅助开发，部分代码由AI生成，但均经过人工审核和修改；README文档由AI生成，经过人工编辑完善。注意，`./doc`目录下的文档由AI生成，帮助AI理解项目的半临时文件，未经人工修改，仅供参考。   


## 欢迎大家在 GitHub 上提出问题、提出需求和提交PR！
