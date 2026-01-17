# 临时笔记 - 项目架构文档

一个基于 LocalStorage 的临时笔记应用，支持草稿保存、条目存档、数据导入导出等功能。

## 📂 项目结构

```
临时笔记/
├── src/
│   └── index.html          # 应用主页面（已分离CSS、JS）
├── css/                    # 样式文件目录
│   ├── theme.css          # 主题系统（颜色变量定义）
│   ├── base.css           # 基础样式（全局重置、Utility类）
│   ├── layout.css         # 布局组件（app、header、main、panel等）
│   └── components.css     # UI组件（button、textarea、card等）
├── js/                     # JavaScript 模块目录
│   ├── main.js            # 应用入口和事件绑定
│   ├── constants.js       # 常量定义（存储键、主题等）
│   ├── utils.js           # 工具函数库（时间、格式化、计算等）
│   ├── storage.js         # 数据存储管理（LocalStorage操作）
│   ├── dom-manager.js     # DOM元素选择器和管理
│   ├── ui-controller.js   # UI控制器（渲染、显示、交互反馈）
│   └── app-controller.js  # 应用业务逻辑（核心功能实现）
├── index.html             # 原始单文件版本（保留备份）
└── README.md              # 项目文档
```

## 🎯 架构设计

### 分层架构

1. **表现层（Presentation）**
   - `ui-controller.js`: UI渲染和状态展示
   - `css/*`: 所有样式文件

2. **业务逻辑层（Business Logic）**
   - `app-controller.js`: 核心业务流程
   - `constants.js`: 业务常量

3. **数据访问层（Data Access）**
   - `storage.js`: LocalStorage操作
   - `dom-manager.js`: DOM操作

4. **工具层（Utilities）**
   - `utils.js`: 通用工具函数

### 模块职责

| 模块 | 职责 | 导出内容 |
|------|------|---------|
| `constants.js` | 常量定义 | STORAGE_KEYS, THEMES, DEFAULT_THEME |
| `utils.js` | 工具函数 | 时间格式化、字数统计、字节转换等 |
| `storage.js` | 存储管理 | Load/Save数据、导入导出处理 |
| `dom-manager.js` | DOM管理 | DOMManager类，提供DOM操作接口 |
| `ui-controller.js` | UI控制 | UIController类，渲染和反馈 |
| `app-controller.js` | 业务逻辑 | AppController类，核心功能实现 |
| `main.js` | 应用启动 | 初始化和事件绑定 |

## 🎨 CSS 结构

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

## 🚀 快速开始

### 基础使用
```bash
# 直接在浏览器中打开
file:///d:/OneDrive/2026年/寒假/临时笔记/src/index.html
```

### 快捷键
- `Ctrl+S`: 存档当前草稿
- `Ctrl+K`: 搜索存档条目
- `Ctrl+L`: 清空草稿

## 🔄 数据流

```
用户输入
   ↓
DOMManager 捕获
   ↓
AppController 业务处理
   ↓
Storage 持久化 + UIController 渲染
   ↓
用户看到反馈
```

## 📝 主要功能

- ✍️ 自动保存草稿
- 📦 条目存档管理
- 🔍 全文搜索条目
- 📊 实时字数/存储统计
- 🌓 深色/浅色主题切换
- 💾 导出为 JSON
- 📥 从 JSON 导入（支持合并去重）
- ⌨️ 丰富的快捷键支持

## 🔧 扩展指南

### TODO
- [x] 改为 IndexedDB 存储：提供更大的存储空间，并确保所有客户端（不同浏览器、不同设备）都能正常使用（不是同步，只是为了确保所有用户都能正常使用功能）。  
- [x] 增加对称加密：为数据提供密码保护功能，确保数据的隐私性和安全性。用户可以设置密码来加密/解密数据。
- [x] 草稿区与存档条目合并：如果新保存的草稿与之前才保存的条目开头一致，则自动更新为同一条记录，而不是创建新条目。如果打开的草稿修改后保存，需要覆盖保存。
- [x] 中文字体优化：将默认字体调整为其他清晰可读的字体，避免使用宋体（例如改为微软雅黑、苹方等）。
- [x] 滑动条美化：优化滚动条的样式，使其更加现代且易于使用（例如增加自定义样式，改善视觉效果）。
- [ ] 字体大小在设置功能中可以调整
- [ ] 更多功能入口：将“清空”改为“更多”入口，点击后弹出包含“回收站”和“导入/导出”功能的界面。更多点击后会弹出一个界面，左侧包括“回收站” “导入/导出” 这两个功能，点开回收站后，其中可以一条一条删除，这里可以二次确认，自己做弹窗，还有清空所有的按钮，同样二次确认。
- [ ] 删除逻辑：删除条目时不再需要二次确认，而是将其放入“回收站”。回收站可以随时查看和恢复条目。
- [ ] 更多功能入口：将“清空”改为“更多”入口，点击后弹出包含“回收站”和“导入/导出”功能的界面。
- [ ] 回收站管理：在回收站中，用户可以逐条删除条目，需要二次确认删除操作。还可以清空所有内容，需要二次确认。
- [ ] 导入与导出功能：提供数据导入/导出的功能，允许用户将数据迁移或备份成 JSON 格式。导入时需要考虑数据去重和格式兼容。
- [ ] 支持保存图片：增加图片上传和保存功能，允许用户将图片作为笔记的一部分存储。可以考虑将图片与笔记一起存储，或者以文件形式保存到特定位置。

### 添加新功能

1. **添加新的UI组件**
   - 在 `css/components.css` 中编写样式
   - 在 `ui-controller.js` 中编写渲染逻辑

2. **添加新的业务功能**
   - 在 `app-controller.js` 中实现业务方法
   - 在 `main.js` 中绑定事件

3. **添加新的数据存储**
   - 在 `storage.js` 中添加 Load/Save 方法
   - 在 `constants.js` 中定义存储键

4. **添加新的工具函数**
   - 在 `utils.js` 中实现，并导出

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

MIT License

---

**创建日期**: 2026-01-18  
**开发者**: GitHub Copilot  
**版本**: 1.0.0 (Modularized)
