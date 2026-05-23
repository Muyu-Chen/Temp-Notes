# 项目结构详解 (Project Structure)

Temp Notes 采用了清晰的、模块化的目录结构，便于维护和扩展。

## 完整目录树

```text
Temp-Notes/
├── css/                    # 样式目录 (Vanilla CSS)
│   ├── theme.css           # 主题系统 (颜色变量、明暗模式)
│   ├── base.css            # 基础样式 (Reset, Utilities)
│   ├── layout.css          # 布局结构 (Grid, Flexbox, App Containers)
│   └── components.css      # UI 组件样式 (Buttons, Inputs, Cards)
├── js/                     # JavaScript 源代码 (ES Modules)
│   ├── main.js             # 应用入口点
│   ├── app-controller.js   # 顶级控制器，协调各服务
│   ├── constants.js        # 全局常量
│   ├── crypto.js           # 加密基础方法
│   ├── storage.js          # 数据存储统一导出入口
│   ├── utils.js            # 工具函数统一导出入口
│   ├── bootstrap/          # 引导与初始化逻辑
│   │   ├── app-bootstrap.js # 应用启动编排
│   │   ├── bind-events.js   # DOM 事件绑定
│   │   └── first-run.js     # 首次运行检查与引导
│   ├── services/           # 核心业务逻辑服务
│   │   ├── draft-service.js # 草稿与存档管理
│   │   ├── item-service.js  # 条目管理 (删除、重命名)
│   │   ├── encryption-service.js # 加密流程
│   │   ├── recycle-service.js # 回收站状态管理
│   │   ├── llm-service.js   # AI 增强功能
│   │   └── ...              # 其他服务
│   ├── storage/            # 数据持久化层 (IndexedDB)
│   │   ├── idb.js           # IndexedDB 基础连接
│   │   ├── draft-storage.js # 草稿存储
│   │   ├── item-storage.js  # 条目存储
│   │   └── ...              # 其他存储模块
│   ├── ui/                 # 表现层 (DOM 操作与视图)
│   │   ├── dom-manager.js   # DOM 引用管理
│   │   ├── ui-controller.js # 通用 UI 反馈 (Toast, Meta)
│   │   ├── item-list-view.js# 条目列表渲染
│   │   └── modal.js         # 模态框组件
│   ├── lib/                # 聚焦的辅助工具集
│   │   ├── text-utils.js    # 文本处理
│   │   ├── time-utils.js    # 时间格式化
│   │   └── ...              # 其他工具
│   └── vendor/             # 第三方依赖 (本地化)
│       ├── jszip.min.js     # ZIP 导出支持
│       └── marked.min.js    # Markdown 渲染
├── tests/                  # 测试目录 (Vitest)
│   └── ...                 # 单元测试与集成测试
├── index.html              # 应用主页面
├── README.md               # 项目主文档
└── package.json            # NPM 配置与依赖管理
```

---

## 🏗️ 核心模块职责

### 1. 引导层 (Bootstrap)
*   `main.js`: 监听 `DOMContentLoaded` 并调用 `bootstrapApp`。
*   `app-bootstrap.js`: 创建核心对象实例，按序启动服务和绑定事件。

### 2. 控制器层 (Controllers)
*   `app-controller.js`: 作为“指挥官”，持有所有服务引用，处理跨服务的逻辑。
*   `ui-controller.js`: 管理应用级 UI 状态（如 Toast 提示、元数据统计）。

### 3. 服务层 (Services)
*   每个服务（如 `DraftService`）都遵循单一职责原则。
*   服务层不直接操作 DOM，而是通过回调或更新状态由表现层渲染。

### 4. 存储层 (Storage)
*   基于 **IndexedDB** 实现，克服了 LocalStorage 的容量限制（5-10MB）。
*   `idb.js` 统一管理数据库连接和 Object Stores。

---

## 样式规范 (CSS)

使用原生的 Vanilla CSS 以保持轻量化：
*   **变量优先**: 所有颜色和间距均定义在 `theme.css` 中。
*   **组件化**: 每个 UI 元素在 `components.css` 中都有对应的独立类名。

---

## 🧪 扩展指引

如果你想添加一个新功能：
1.  **UI**: 在 `js/ui/` 添加新的 View 模块。
2.  **逻辑**: 在 `js/services/` 添加新的 Service。
3.  **持久化**: 在 `js/storage/` 添加对应的存储逻辑。
4.  **注入**: 在 `app-bootstrap.js` 中实例化并在 `bind-events.js` 中绑定。

---

**更新时间**: 2026-05-22  
**状态**: ✅ 完整同步

