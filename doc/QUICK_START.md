# 🚀 快速开始指南

## 📋 项目概览

**临时笔记** 是一个功能完整的 Web 笔记应用，采用 **模块化架构**，专为大项目设计。

- ✅ 所有原有代码和功能**完全保留**
- ✅ CSS、JS、HTML 已**彻底分离**
- ✅ 采用 **ES6 模块系统**
- ✅ 清晰的**分层架构**
- ✅ 易于扩展和维护

---

## 📂 项目结构速览

```
临时笔记/
├── css/                        ← 样式文件
│   ├── theme.css              （主题系统）
│   ├── base.css               （基础样式）
│   ├── layout.css             （布局组件）
│   └── components.css         （UI组件）
├── js/                         ← 应用逻辑
│   ├── main.js                （应用启动）
│   ├── constants.js           （常量定义）
│   ├── utils.js               （工具函数）
│   ├── storage.js             （数据存储）
│   ├── dom-manager.js         （DOM管理）
│   ├── ui-controller.js       （UI控制）
│   └── app-controller.js      （业务逻辑）
├── README.md                   ← 项目文档
├── ARCHITECTURE.md             ← 架构详解
├── package.json                ← 项目配置
└── index.html                  ← 主
```

---


## 🎨 功能列表

### 核心功能
- ✍️ 自动保存草稿（250ms防抖）
- 📦 条目存档管理
- 🔍 全文搜索
- 📊 实时统计（字数、条目数、存储占用）

---

## 🏗️ 架构亮点

### 分层设计
```
UI层 (ui-controller.js)
     ↓
业务层 (app-controller.js)
     ↓
数据层 (storage.js)
     ↓
LocalStorage
```

### 模块职责清晰

| 模块 | 职责 |
|------|------|
| `main.js` | 应用启动 + 事件绑定 |
| `app-controller.js` | 核心业务逻辑 |
| `ui-controller.js` | UI渲染反馈 |
| `storage.js` | 数据持久化 |
| `dom-manager.js` | DOM操作抽象 |
| `utils.js` | 工具函数库 |

### CSS模块化
- **theme.css**: 设计系统（颜色变量）
- **base.css**: 全局重置和工具类
- **layout.css**: 布局结构
- **components.css**: UI组件

---

## 🔧 开发工作流

### 添加新页面功能
1. 在 `css/` 中编写样式
2. 在 `app-controller.js` 中实现业务逻辑
3. 在 `ui-controller.js` 中编写渲染代码
4. 在 `main.js` 中绑定事件

### 添加新工具函数
```javascript
// 1. 编写函数 (utils.js)
export const myTool = (params) => { /* ... */ }

// 2. 导入使用 (app-controller.js)
import { myTool } from "./utils.js"

// 3. 调用
myTool(params)
```

### 添加新的主题
```css
/* css/theme.css */
[data-theme="my-theme"] {
  --bg: #ffffff;
  --text: #000000;
  /* ... 其他变量 ... */
}
```

---

## 💾 数据结构

### LocalStorage 结构
```javascript
{
  "tempnotes:draft:v1": "当前草稿内容...",
  
  "tempnotes:items:v1": [
    {
      "id": "abc-123-def",
      "content": "条目内容...",
      "createdAt": 1705513200000,
      "updatedAt": 1705513200000
    },
    // ... 更多条目 ...
  ],
  
  "tempnotes:theme:v1": "dark"
}
```

### 导出数据格式
```json
{
  "version": 1,
  "exportedAt": "2026-01-18T10:30:00.000Z",
  "draft": "...",
  "items": [
    { "id": "...", "content": "...", "createdAt": ..., "updatedAt": ... }
  ]
}
```

---

## 🧪 测试清单

- [ ] 打开 `src/index.html` 能正常加载
- [ ] 输入草稿后自动保存
- [ ] 存档功能正常工作
- [ ] 搜索能找到条目
- [ ] 导出/导入数据没问题
- [ ] 主题切换生效
- [ ] 快捷键响应正确
- [ ] localStorage 占用显示正确

---

## 🚨 常见问题

### Q: 为什么我的浏览器报错？
**A**: 确保使用现代浏览器（Chrome 85+, Firefox 78+, Safari 14+）

### Q: 导入总是说格式不对？
**A**: 确保导入的JSON是从应用本身导出的，或者手动创建的格式正确

### Q: 快捷键不工作？
**A**: 部分应用（如某些输入法）会拦截快捷键，可以直接点击按钮

### Q: 数据会永久保存吗？
**A**: 数据保存在 LocalStorage，关闭浏览器后仍然存在，除非手动清除或清理浏览器缓存

### Q: 能同时在多个标签页使用吗？
**A**: 可以，但同时编辑会造成数据冲突。建议只在一个标签页使用

---

## 📈 下一步扩展建议

### 短期
- [ ] 添加标签功能
- [ ] 条目分类
- [ ] 批量操作
- [ ] 撤销/重做

### 中期
- [ ] 迁移到 IndexedDB
- [ ] 支持同步到云端
- [ ] PWA 支持（离线使用）
- [ ] 插件系统

### 长期
- [ ] 跨设备同步
- [ ] 协作编辑
- [ ] 版本历史
- [ ] 完整的桌面应用

---

## 📚 相关文档

- [README.md](README.md) - 项目总览
- [ARCHITECTURE.md](ARCHITECTURE.md) - 详细架构文档
- [package.json](package.json) - 项目配置

---

## 💡 最佳实践

✅ **必做**
- 定期导出数据备份
- 在多个浏览器测试
- 保持 localStorage 数据版本号

❌ **避免**
- 在多个标签页同时编辑
- 清理浏览器缓存而不备份
- 手动修改 localStorage 数据

---

## 📞 技术支持

遇到问题？
1. 检查浏览器控制台是否有错误 (F12)
2. 查看 [ARCHITECTURE.md](ARCHITECTURE.md) 中的设计说明
3. 确保文件路径和导入都正确

---

**版本**: 1.0.0  
**最后更新**: 2026-01-18  
**状态**: ✅ 生产就绪
