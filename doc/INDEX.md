# 📑 项目文件索引

## 🎯 快速导航

根据你的目的选择相应的文档：

### 👤 普通用户
想使用这个应用？
→ [QUICK_START.md](QUICK_START.md)

### 👨‍💻 开发者
想参与开发或扩展功能？
→ [DEVELOPER.md](DEVELOPER.md)

### 🏗️ 架构师
想理解应用架构设计？
→ [ARCHITECTURE.md](ARCHITECTURE.md)

### 📖 项目概览
想了解项目整体信息？
→ [README.md](README.md)

---

## 📂 项目文件结构详解

### 入口文件
```
src/index.html           打开这个文件启动应用
                         ├─ 引入 CSS 文件 (css/*)
                         └─ 引入 JS 入口 (js/main.js)
```

### 样式文件 (CSS)
```
css/
├── theme.css            设计系统 - 主题颜色变量、明暗模式
├── base.css             基础样式 - 全局重置、工具类
├── layout.css           布局系统 - 容器、栅格、响应式
└── components.css       组件库 - 按钮、卡片、输入框等UI
```

### 应用代码 (JavaScript 模块)
```
js/
├── main.js              应用启动入口
│                        ├─ 创建各种控制器
│                        ├─ 绑定所有事件
│                        └─ 初始化应用
│
├── app-controller.js    应用业务逻辑核心
│                        ├─ 草稿管理（存档、加载、清空）
│                        ├─ 条目管理（删除、搜索）
│                        ├─ 数据导入导出
│                        └─ 用户交互处理
│
├── ui-controller.js     UI 渲染和反馈
│                        ├─ 列表渲染
│                        ├─ Toast 提示
│                        ├─ 主题切换
│                        └─ 复制功能
│
├── dom-manager.js       DOM 操作抽象层
│                        ├─ DOM 元素引用
│                        └─ DOM 操作接口
│
├── storage.js           数据存储管理
│                        ├─ LocalStorage 操作
│                        ├─ 数据加载/保存
│                        ├─ 导入/导出处理
│                        └─ 数据修复/合并
│
├── utils.js             工具函数库
│                        ├─ 时间/日期处理
│                        ├─ 字符串处理
│                        ├─ 数据转换
│                        └─ 计算函数
│
└── constants.js         常量定义
                         ├─ 存储键定义
                         ├─ 主题枚举
                         └─ 其他常量
```

### 文档文件
```
QUICK_START.md           快速开始指南（用户向）
ARCHITECTURE.md          架构设计详解（架构师向）
DEVELOPER.md             开发者指南（开发向）
README.md                项目总览
package.json             项目配置
index.html               原始备份版本
```

---

## 🔗 文件关系图

### 导入关系
```
main.js
  ├─ imports → dom-manager.js
  ├─ imports → ui-controller.js
  ├─ imports → app-controller.js
  │             ├─ imports → storage.js
  │             ├─ imports → utils.js
  │             └─ imports → dom-manager.js
  ├─ imports → storage.js
  │             └─ imports → utils.js
  └─ imports → constants.js

ui-controller.js
  ├─ imports → utils.js
  └─ imports → dom-manager.js

storage.js
  └─ imports → utils.js
              └─ imports → constants.js

dom-manager.js
  └─ 不导入任何模块（纯 DOM 操作）
```

### 执行流程
```
页面加载 (src/index.html)
  ↓
加载 CSS 文件
  ├─ theme.css
  ├─ base.css
  ├─ layout.css
  └─ components.css
  ↓
执行 JS 入口 (js/main.js)
  ├─ 创建 DOMManager
  ├─ 创建 UIController
  ├─ 创建 AppController
  ├─ 绑定事件监听
  └─ 初始化应用状态
  ↓
应用就绪，等待用户操作
```

---

## 🎯 文件功能速查表

| 文件 | 主要功能 | 关键导出 |
|------|---------|---------|
| **入口** | | |
| src/index.html | HTML 结构 + 资源加载 | - |
| js/main.js | 应用启动 + 事件绑定 | initApp() |
| **核心业务** | | |
| app-controller.js | 业务逻辑实现 | AppController 类 |
| storage.js | 数据持久化 | load*/save* 函数 |
| **UI 层** | | |
| ui-controller.js | UI 渲染和反馈 | UIController 类 |
| dom-manager.js | DOM 操作接口 | DOMManager 类 |
| **样式** | | |
| css/theme.css | 颜色 + 主题系统 | CSS 变量 |
| css/base.css | 全局重置 + 工具类 | .muted, .small 等 |
| css/layout.css | 布局组件 | .app, .main, .panel 等 |
| css/components.css | UI 组件 | button, .item, .toast 等 |
| **工具** | | |
| utils.js | 通用工具函数 | 20+ 工具函数 |
| constants.js | 常量定义 | STORAGE_KEYS, THEMES |
| **文档** | | |
| README.md | 项目总览 | 功能列表、项目结构 |
| ARCHITECTURE.md | 架构详解 | 架构图、模块设计 |
| DEVELOPER.md | 开发指南 | 开发规范、工作流 |
| QUICK_START.md | 快速开始 | 使用方法、常见问题 |

---

## 🔍 快速查找

### 我想...

**修改样式**
1. 确定要修改的 UI 元素（如按钮）
2. 在 `css/` 中查找相关样式
3. 修改 CSS 属性

**查找**: `grep -r "button" css/`

---

**添加新功能**
1. 在 HTML 中添加 UI 元素
2. 在 `dom-manager.js` 中添加引用
3. 在 `app-controller.js` 中实现逻辑
4. 在 `main.js` 中绑定事件

**查找**: `grep "addEventListener" js/main.js`

---

**查看数据流**
1. 打开 `app-controller.js` 查看业务逻辑
2. 打开 `storage.js` 查看数据操作
3. 打开 `ui-controller.js` 查看 UI 更新

**查找**: 搜索相关方法名称

---

**理解快捷键**
查看: `app-controller.js` 的 `onKeyDown` 方法

---

**查找工具函数**
查看: `utils.js`

例如: `wordCount()`, `pad2()`, `fmt()` 等

---

## 📊 代码行数统计

```
CSS
  theme.css          ~70 行   (主题定义)
  base.css           ~30 行   (基础样式)
  layout.css         ~90 行   (布局组件)
  components.css     ~180 行  (UI组件)
  总计              ~370 行

JavaScript
  main.js            ~60 行   (启动 + 事件)
  app-controller.js  ~200 行  (业务逻辑)
  ui-controller.js   ~140 行  (UI 控制)
  storage.js         ~120 行  (数据存储)
  dom-manager.js     ~80 行   (DOM 管理)
  utils.js           ~140 行  (工具函数)
  constants.js       ~10 行   (常量)
  总计              ~750 行

HTML
  src/index.html     ~120 行  (页面结构)

文档
  README.md          ~200 行
  ARCHITECTURE.md    ~400 行
  DEVELOPER.md       ~500 行
  QUICK_START.md     ~300 行

总代码量: ~1240 行
总文档量: ~1400 行
代码注释率: ~25%
```

---

## 🚀 文件修改指南

### 当你想...

**修改应用的主标题**
→ 编辑 `src/index.html` 中的 `<h1>` 标签

**改变默认主题**
→ 编辑 `js/constants.js` 中的 `DEFAULT_THEME`

**添加新的字段到存档**
→ 修改 `js/storage.js` 中的 Item 结构

**改变自动保存延迟**
→ 修改 `js/app-controller.js` 中的 `scheduleDraftSave()` (当前 250ms)

**修改 LocalStorage 数据版本**
→ 编辑 `js/constants.js` 中的 `STORAGE_KEYS`

**改变深色模式颜色**
→ 修改 `css/theme.css` 中 `:root` 的 CSS 变量

**改变浅色模式颜色**
→ 修改 `css/theme.css` 中 `[data-theme="light"]` 的 CSS 变量

**改变按钮样式**
→ 修改 `css/components.css` 中的 `button, .btn` 规则

**添加新的快捷键**
→ 修改 `js/app-controller.js` 中的 `onKeyDown()` 方法

**改变字数计算算法**
→ 修改 `js/utils.js` 中的 `wordCount()` 函数

---

## 📚 文档参考

### 快速查询
- 想快速上手？→ [QUICK_START.md](QUICK_START.md#快速开始指南)
- 想深入了解？→ [ARCHITECTURE.md](ARCHITECTURE.md#整体架构图)
- 想开始开发？→ [DEVELOPER.md](DEVELOPER.md#开发环境设置)
- 想了解全貌？→ [README.md](README.md#项目架构)

### 主题相关
- CSS 主题系统 → [theme.css](css/theme.css)
- 如何添加新主题 → [ARCHITECTURE.md#css-模块化策略](ARCHITECTURE.md#css-模块化策略)

### 模块相关
- 模块职责分解 → [ARCHITECTURE.md#模块职责分解](ARCHITECTURE.md#模块职责分解)
- 数据流向 → [ARCHITECTURE.md#数据流向](ARCHITECTURE.md#数据流向)

### 开发相关
- 编码规范 → [DEVELOPER.md#编码规范](DEVELOPER.md#编码规范)
- 工作流示例 → [DEVELOPER.md#工作流示例](DEVELOPER.md#工作流示例)
- 调试技巧 → [DEVELOPER.md#调试技巧](DEVELOPER.md#调试技巧)

---

## 🆘 找不到什么？

| 问题 | 解决方案 |
|------|---------|
| 找不到某个样式 | 搜索 `grep -r "class-name" css/` |
| 找不到某个函数 | 搜索 `grep -r "function-name" js/` |
| 不知道从哪开始 | 阅读 [QUICK_START.md](QUICK_START.md) |
| 想学习架构 | 阅读 [ARCHITECTURE.md](ARCHITECTURE.md) |
| 想开始开发 | 阅读 [DEVELOPER.md](DEVELOPER.md) |
| 想了解某个文件 | 查看本文件的"文件功能速查表" |

---

**更新时间**: 2026-01-18  
**版本**: 1.0.0
