# 项目架构设计文档

## 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      应用入口 (main.js)                       │
│                 负责初始化和事件绑定                          │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼──────────────┐  │  ┌──────────────────────┐
│  AppController   │  │  │   DOMManager         │
│  (业务逻辑)       │  └─▶│  (DOM操作接口)       │
│                  │     └──────────────────────┘
│ • archiveDraft   │     
│ • loadToDraft    │     ┌──────────────────────┐
│ • deleteItem     │     │  UIController       │
│ • exportAll      │     │  (UI渲染反馈)        │
│ • importAll      │     │                      │
└───┬──────────────┘     │ • renderItemsList   │
    │                    │ • showToast         │
    │                    │ • updateTheme       │
    │                    │ • copyText          │
    │                    └──────────────────────┘
    │
    │ 调用
    │
    ▼
┌──────────────────────────────────────────────────┐
│              Storage Module (storage.js)          │
│                                                   │
│  • loadDraft() / saveDraft()                     │
│  • loadItems() / saveItems()                     │
│  • exportData() / normalizeImportedData()        │
│  • mergeItems() (去重合并)                       │
└──────────────────────────────────────────────────┘
    │
    │ 操作
    │
    ▼
┌──────────────────────────────────────────────────┐
│          LocalStorage (浏览器持久化层)             │
│                                                   │
│  tempnotes:draft:v1      (当前草稿)              │
│  tempnotes:items:v1      (存档条目)              │
│  tempnotes:theme:v1      (主题设置)              │
└──────────────────────────────────────────────────┘
```

## 数据流向

### 用户输入流程
```
用户在textarea中输入
         │
         ▼
draft.addEventListener("input")  [main.js 绑定]
         │
         ▼
appController.onDraftInput()  [AppController]
         │
         ├─▶ scheduleDraftSave()  [延迟防抖保存]
         │        │
         │        ▼
         │   saveDraft()  [storage.js]
         │        │
         │        ▼
         │   localStorage.setItem()
         │
         └─▶ updateMeta()  [计算字数等]
                  │
                  ▼
             uiController.updateMeta()
                  │
                  ▼
             更新页面显示
```

### 条目存档流程
```
用户点击"存档为条目"按钮
         │
         ▼
btnArchive.addEventListener("click")  [main.js]
         │
         ▼
appController.archiveDraft()  [AppController]
         │
         ├─ 验证草稿内容
         │
         ├─ 创建Item对象
         │
         ├─ items.unshift(item)
         │
         ├─ saveItems()  [storage.js]
         │        │
         │        ▼
         │   localStorage.setItem()
         │
         ├─ render()  [重新渲染列表]
         │
         └─ showToast()  [显示成功提示]
```

### 条目加载流程
```
用户点击某条存档条目
         │
         ▼
card.onclick  [在 ui-controller.js 中绑定]
         │
         ▼
uiController.onItemLoadClick(id)
         │
         ▼
appController.loadToDraft(id)
         │
         ├─ 获取Item对象
         │
         ├─ dom.setDraftValue(content)  [更新textarea]
         │
         ├─ saveDraft()  [保存到localStorage]
         │
         ├─ updateMeta()  [更新元数据显示]
         │
         └─ showToast()  [显示加载成功]
```

## 模块职责分解

### constants.js
```javascript
export STORAGE_KEYS = {
  DRAFT: "tempnotes:draft:v1",
  ITEMS: "tempnotes:items:v1",
  THEME: "tempnotes:theme:v1",
}

export THEMES = { DARK, LIGHT }
export DEFAULT_THEME = "dark"
```
**职责**: 集中管理所有常量，避免硬编码

---

### utils.js
```javascript
export {
  now,           // 获取时间戳
  pad2,          // 数字补零
  fmt,           // 时间格式化
  uid,           // 生成唯一ID
  safeJsonParse, // 安全JSON解析
  clamp,         // 截断字符串
  firstLine,     // 获取第一行
  wordCount,     // 字数统计
  storageBytes,  // 计算存储占用
  humanBytes,    // 字节格式化
  isMac,         // 检测平台
}
```
**职责**: 提供通用工具函数，无状态、无依赖

---

### storage.js
```javascript
export {
  loadTheme,               // 从LocalStorage读取主题
  saveTheme,               // 保存主题到LocalStorage
  loadDraft,               // 读取草稿
  saveDraft,               // 保存草稿
  loadItems,               // 读取条目列表（含自动修复）
  saveItems,               // 保存条目列表
  exportData,              // 生成导出数据结构
  normalizeImportedData,   // 验证和规范导入数据
  itemSignature,           // 生成条目去重签名
  mergeItems,              // 合并条目（去重）
}
```
**职责**: 所有LocalStorage操作的抽象层，支持数据导入导出

---

### dom-manager.js (DOMManager类)
```javascript
class DOMManager {
  // DOM元素引用
  draft, list, search, toast, btn*
  
  // 方法
  getDraftValue()        // 获取草稿文本
  setDraftValue()        // 设置草稿文本
  getSearchValue()       // 获取搜索词
  setSearchValue()       // 设置搜索词
  
  setAutosaveState()     // 更新自动保存状态显示
  updateWordCount()      // 更新字数显示
  updateItemCount()      // 更新条目数显示
  updateUsage()          // 更新存储占用显示
  
  focusDraft()           // 聚焦草稿框
  focusSearch()          // 聚焦搜索框
  
  clearListContent()     // 清空条目列表DOM
  appendListItem()       // 添加条目到列表
}
```
**职责**: 
- 集中管理所有DOM元素引用
- 提供统一的DOM操作接口
- 避免在其他模块中频繁的document.querySelector

---

### ui-controller.js (UIController类)
```javascript
class UIController {
  // 私有状态
  toastTimer

  // 方法
  showToast(msg)              // 显示消息提示
  updateTheme(theme)          // 更新页面主题
  getTheme()                  // 获取当前主题
  
  updateMeta(draft, items, bytes)  // 更新所有元数据显示
  renderItemsList(items)      // 渲染条目列表
  
  copyText(text)              // 复制文本到剪贴板
  
  // 回调函数（在 main.js 中赋值）
  onItemLoadClick(id)
  onItemDeleteClick(id)
}
```
**职责**:
- 处理所有UI的显示和更新
- 处理用户交互反馈（Toast、提示）
- 提供高层次的UI操作接口

---

### app-controller.js (AppController类)
```javascript
class AppController {
  // 私有状态
  items = []
  saveTimer

  // 初始化
  init()

  // 业务方法
  archiveDraft()         // 存档当前草稿
  loadToDraft(id)        // 加载条目到草稿
  deleteItem(id)         // 删除条目
  clearDraft()           // 清空草稿
  clearArchive()         // 清空所有存档
  exportAll()            // 导出为JSON
  importAll()            // 从JSON导入
  
  // 事件处理
  onDraftInput()
  onSearchInput()
  onThemeToggle()
  onKeyDown(e)
  
  // 内部方法
  scheduleDraftSave()    // 防抖保存
  render()               // 重新渲染列表
}
```
**职责**:
- 核心业务逻辑实现
- 调用Storage进行持久化
- 调用UI进行显示
- 处理所有用户交互

---

### main.js
```javascript
function initApp() {
  // 创建实例
  const domManager = new DOMManager()
  const uiController = new UIController(domManager)
  const appController = new AppController(uiController, domManager)
  
  // 设置初始主题
  const theme = loadTheme()
  uiController.updateTheme(theme)
  
  // 绑定事件监听器
  domManager.draft.addEventListener("input", () => {
    appController.onDraftInput()
  })
  
  // ... 其他事件绑定
  
  // 初始化应用
  appController.init()
}

// DOM加载完后启动
document.addEventListener("DOMContentLoaded", initApp)
```
**职责**:
- 应用启动入口
- 创建所有必要的对象
- 绑定所有事件监听器
- 初始化应用状态

## CSS 模块化策略

### 1. theme.css - 设计系统层
```css
:root {
  --bg: #0b0f17;           /* 背景色 */
  --text: rgba(...);       /* 文字色 */
  --accent: #7aa2ff;       /* 强调色 */
  --shadow: 0 10px 30px;   /* 阴影 */
  /* ... 所有颜色变量 ... */
}

[data-theme="light"] {
  /* Light主题变量覆盖 */
}
```

### 2. base.css - 基础样式层
```css
* { box-sizing: border-box; }
body { /* 全局字体、背景等 */ }
.muted { color: var(--muted); }  /* Utility */
.small { font-size: 12px; }      /* Utility */
```

### 3. layout.css - 布局层
```css
.app { /* 主容器布局 */ }
header { /* 头部布局 */ }
.main { /* 主内容区域布局，Grid系统 */ }
.panel { /* 面板容器 */ }
@media (max-width: 960px) { /* 响应式 */ }
```

### 4. components.css - 组件层
```css
button, .btn { /* 按钮基础样式 */ }
button.primary { /* 按钮变体 */ }
.item { /* 条目卡片 */ }
textarea { /* 编辑器 */ }
.toast { /* 消息提示 */ }
```

## 扩展建议

### 添加新功能的步骤

1. **需要新的样式**
   - 在 `css/components.css` 中添加
   - 或创建新的 `css/feature-xxx.css`

2. **需要新的UI交互**
   - 在 `ui-controller.js` 中添加渲染方法
   - 在 `app-controller.js` 中实现业务逻辑

3. **需要新的存储**
   - 在 `storage.js` 中添加 load/save 方法
   - 在 `constants.js` 中定义存储键

4. **需要新的事件监听**
   - 在 `main.js` 中添加事件绑定
   - 在 `app-controller.js` 中实现事件处理器

### 注意事项

- ✅ 每个模块保持单一职责
- ✅ 使用接口抽象（DOMManager）隐藏实现
- ✅ 所有公开函数都进行参数校验
- ✅ 关键操作使用try-catch处理异常
- ✅ 避免循环依赖（可以通过回调注入解决）

## 性能优化

### 已实施
1. **防抖保存** (250ms) - 避免频繁写入localStorage
2. **条件渲染** - 只在必要时重新渲染列表
3. **条件更新** - 元数据只在数据变化时更新

### 可进一步优化
1. 虚拟滚动 - 处理大量条目时
2. IndexedDB - 突破localStorage限制
3. Web Workers - 大数据处理时
4. 本地缓存 - 减少重复计算

---

**更新时间**: 2026-01-18  
**版本**: 1.0.0
