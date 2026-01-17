# 👨‍💻 开发者指南

本文档帮助开发者快速上手项目开发。

---

## 📖 文档导航

| 文档 | 用途 |
|------|------|
| [QUICK_START.md](QUICK_START.md) | 快速开始（用户向） |
| [README.md](README.md) | 项目总览 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 架构设计详解 |
| **本文档** | 开发指南（开发者向） |

---

## 🛠️ 开发环境设置

### 最小要求
- 现代浏览器（带 DevTools）
- 代码编辑器（VS Code 推荐）
- 可选：Python/Node.js（用于本地服务器）

### VS Code 推荐扩展
```json
{
  "extensions": [
    "esbenp.prettier-vscode",           // 代码格式化
    "dbaeumer.vscode-eslint",           // 代码检查
    "ritwickdey.liveserver",            // Live Server
    "ritwickdey.LiveServer",            // 热更新
    "eamodio.gitlens"                   // Git 工具
  ]
}
```

### 启动开发服务器
```bash
# 方式1: Python
python -m http.server 8000

# 方式2: Node.js http-server
npm install -g http-server
http-server

# 方式3: VS Code Live Server
# 右键 src/index.html → Open with Live Server
```

访问: `http://localhost:8000/src/index.html`

---

## 🎯 核心概念

### MVC 式设计
```
Model (Data)      → storage.js
View  (Display)   → ui-controller.js + CSS
Controller (Logic)→ app-controller.js
```

### 事件驱动架构
```
用户操作
   ↓
事件监听 (main.js)
   ↓
事件处理器 (app-controller.js)
   ↓
更新数据 (storage.js)
   ↓
更新UI (ui-controller.js)
   ↓
用户看到反馈
```

### 依赖注入
```javascript
// 而不是这样：
class AppController {
  ui = new UIController()
  dom = new DOMManager()
}

// 采用注入的方式：
class AppController {
  constructor(uiController, domManager) {
    this.ui = uiController
    this.dom = domManager
  }
}
```

---

## 📝 编码规范

### 命名约定
```javascript
// 常量 - 全大写
const KEY_DRAFT = "tempnotes:draft:v1"
const MAX_ITEMS = 1000

// 类名 - PascalCase
class AppController { }
class DOMManager { }

// 函数/方法 - camelCase
function loadDraft() { }
export const wordCount = () => { }

// 私有方法 - 前缀下划线或约定俗成
class UIController {
  _formatTime() { }
  #privateField = null
}

// 常量对象 - PascalCase
const STORAGE_KEYS = { }
const THEMES = { }
```

### 代码风格
```javascript
// ✅ 推荐
export const addItem = (items, item) => {
  if (!item || !item.content.trim()) {
    return items
  }
  return [...items, item].sort((a, b) => b.updatedAt - a.updatedAt)
}

// ❌ 避免
export function addItem(items, item) {
  items.push(item)
  return items
}
```

### 注释规范
```javascript
/**
 * 功能描述（必须）
 * @param {type} name - 参数描述
 * @returns {type} 返回值描述
 * @throws {Error} 异常描述
 */
export const myFunction = (name) => { }

// 行内注释 - 解释"为什么"而不是"是什么"
const items = filtered.sort((a, b) => b.updatedAt - a.updatedAt) // 最新的在前面
```

---

## 🔄 工作流示例

### 场景1: 添加新的按钮功能

#### Step 1: 在 DOM 中添加按钮
```html
<!-- src/index.html -->
<button id="btnMyFeature" title="我的功能">我的功能</button>
```

#### Step 2: 在 DOMManager 中添加引用
```javascript
// js/dom-manager.js
export class DOMManager {
  constructor() {
    // ... 现有代码 ...
    this.btnMyFeature = document.getElementById("btnMyFeature")
  }
}
```

#### Step 3: 在 AppController 中实现逻辑
```javascript
// js/app-controller.js
export class AppController {
  myFeature() {
    // 实现业务逻辑
    this.ui.showToast("功能已执行")
  }
}
```

#### Step 4: 在 main.js 中绑定事件
```javascript
// js/main.js
domManager.btnMyFeature.addEventListener("click", () => {
  appController.myFeature()
})
```

### 场景2: 修改样式

#### 查找样式所在文件
```bash
# 在 CSS 目录搜索
grep -r "item" css/
# 结果: css/components.css
```

#### 修改样式
```css
/* css/components.css */
.item {
  /* 修改现有样式 */
  border-radius: 12px;  /* 改这里 */
}
```

#### 刷新浏览器验证
- Live Server 会自动刷新
- 或手动 F5 刷新

---

## 🧬 模块间通信模式

### 模式1: 直接调用
```javascript
// ui-controller.js
this.ui.showToast("消息")

// app-controller.js
this.archiveDraft()
```

### 模式2: 回调注入
```javascript
// main.js - 设置回调
uiController.onItemLoadClick = (id) => {
  appController.loadToDraft(id)
}

// ui-controller.js - 调用回调
card.onclick = () => this.onItemLoadClick(it.id)
```

### 模式3: 事件监听
```javascript
// main.js
domManager.draft.addEventListener("input", () => {
  appController.onDraftInput()
})
```

### ⚠️ 避免的模式
```javascript
// ❌ 循环依赖
// app-controller.js imports storage.js
// storage.js imports app-controller.js

// ❌ 全局变量
window.globalState = { }

// ❌ 直接 DOM 操作
document.querySelector(".item").textContent = "..."
```

---

## 🐛 调试技巧

### Chrome DevTools

#### 查看 LocalStorage
```
DevTools → Application → LocalStorage → file://
```

#### 查看网络请求
```
DevTools → Network （查看模块加载）
```

#### 查看性能
```
DevTools → Performance → 记录 → 分析
```

### 控制台调试
```javascript
// 在浏览器控制台输入
// 查看 LocalStorage
JSON.parse(localStorage.getItem("tempnotes:items:v1"))

// 查看应用状态
window.appController?.items

// 测试工具函数
import { wordCount } from "./js/utils.js"
wordCount("测试文本")

// 清除所有数据
["tempnotes:draft:v1", "tempnotes:items:v1", "tempnotes:theme:v1"]
  .forEach(k => localStorage.removeItem(k))
```

### 常见问题排查

#### 模块加载失败
```javascript
// 检查控制台是否有 404
// 确保路径是正确的相对路径
// 确保使用 type="module"
```

#### 事件不触发
```javascript
// 1. 确保 DOM 元素存在
console.log(document.getElementById("btnArchive"))

// 2. 确保事件绑定在正确的元素
// 3. 检查是否有其他代码阻止事件传播
```

#### 数据没有保存
```javascript
// 1. 检查 LocalStorage 是否可用
console.log(typeof localStorage !== "undefined")

// 2. 查看是否有异常
try {
  localStorage.setItem("test", "value")
} catch (e) {
  console.error("LocalStorage 出错:", e)
}
```

---

## 📦 版本管理

### 版本号格式
```
1.0.0
├─ 1: 主版本（重大功能变更）
├─ 0: 小版本（新功能）
└─ 0: 补丁版本（bug修复）
```

### 更新 STORAGE_KEYS 版本
```javascript
// constants.js - 升级版本时
export const STORAGE_KEYS = {
  DRAFT: "tempnotes:draft:v2",  // 升级版本
  ITEMS: "tempnotes:items:v2",
  THEME: "tempnotes:theme:v2",
}
```

### 数据迁移示例
```javascript
// storage.js - 迁移旧数据
const oldDraft = localStorage.getItem("tempnotes:draft:v1")
if (oldDraft) {
  localStorage.setItem("tempnotes:draft:v2", oldDraft)
  localStorage.removeItem("tempnotes:draft:v1")
}
```

---

## 🚀 构建和部署

### 开发环境
```bash
# 启动开发服务器
python -m http.server 8000

# 访问
http://localhost:8000/src/index.html
```

### 生产环境

#### 选项1: 直接使用现有文件
```bash
# 部署整个目录到服务器
scp -r ./* user@server:/var/www/tempnotes/

# 访问
https://yourdomain.com/src/index.html
```

#### 选项2: 打包压缩
```bash
# 创建生产包
zip -r tempnotes-v1.0.0.zip src/ css/ js/ *.md *.json
```

#### 选项3: 使用构建工具（可选）
```bash
# 安装 Vite（推荐）
npm install -D vite

# 配置 vite.config.js
# 编译和压缩代码
npm run build
```

---

## 🧪 测试

### 单元测试示例
```javascript
// 创建 tests/utils.test.js
import { wordCount, pad2 } from "../js/utils.js"

// 测试 pad2 函数
console.assert(pad2(5) === "05", "pad2(5) 应该返回 '05'")
console.assert(pad2(15) === "15", "pad2(15) 应该返回 '15'")

// 测试 wordCount 函数
console.assert(wordCount("你好") === 2, "中文计算")
console.assert(wordCount("hello") === 1, "英文计算")
```

### 集成测试检查清单
- [ ] 打开应用能加载
- [ ] 输入和保存工作
- [ ] 存档/加载功能正常
- [ ] 搜索功能有效
- [ ] 导出/导入正常
- [ ] 主题切换生效
- [ ] 快捷键响应
- [ ] 移动端显示正确

---

## 📊 性能优化清单

### 已实施
- [x] 防抖保存（250ms）
- [x] 条件渲染
- [x] 模块化加载

### 可以做的
- [ ] 压缩 CSS/JS
- [ ] 使用 Service Worker
- [ ] 图片优化
- [ ] CDN 分发
- [ ] 虚拟滚动（大数据）

### 性能测试
```javascript
// 测试保存性能
console.time("save")
saveDraft("...")
console.timeEnd("save")

// 测试渲染性能
console.time("render")
this.render()
console.timeEnd("render")
```

---

## 🔐 安全性考虑

### 存储安全
```javascript
// ❌ 不要存储敏感信息
localStorage.setItem("password", "123456")

// ✅ 用户数据是安全的（仅限本地）
localStorage.setItem("tempnotes:draft:v1", userContent)
```

### 输入校验
```javascript
// ✅ 校验用户输入
const content = (input || "").trim()
if (!content) return

// ✅ 防止 XSS（使用 textContent 而不是 innerHTML）
element.textContent = userInput
```

### 跨站脚本 (XSS)
```javascript
// ❌ 危险
element.innerHTML = userContent

// ✅ 安全
element.textContent = userContent
element.appendChild(document.createTextNode(userContent))
```

---

## 📚 学习资源

### JavaScript
- [MDN Web Docs](https://developer.mozilla.org)
- [ES6 模块系统](https://developer.mozilla.org/en-US/docs/web/javascript/reference/statements/import)
- [Promise 和 async/await](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous)

### Web API
- [LocalStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [File API](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard)

### CSS
- [CSS 变量](https://developer.mozilla.org/en-US/docs/Web/CSS/var)
- [CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
- [响应式设计](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)

---

## 🤝 贡献指南

### 提交代码
1. 创建新分支: `git checkout -b feature/my-feature`
2. 提交更改: `git commit -m "feat: 添加新功能"`
3. 推送到远程: `git push origin feature/my-feature`
4. 创建 Pull Request

### 代码审查
- 遵循现有的代码风格
- 添加注释说明复杂逻辑
- 更新相关文档
- 确保没有破坏现有功能

---

## 📞 常见开发问题

### Q: 如何添加新的快捷键？
**A**: 在 `app-controller.js` 中修改 `onKeyDown` 方法

### Q: 如何修改默认主题？
**A**: 修改 `constants.js` 中的 `DEFAULT_THEME`

### Q: 如何提高性能？
**A**: 查看上面的"性能优化清单"部分

### Q: 模块之间如何通信？
**A**: 查看"模块间通信模式"部分

---

## 🎓 下一步

1. 阅读 [ARCHITECTURE.md](ARCHITECTURE.md) 了解详细设计
2. 在本地启动开发环境
3. 尝试添加一个小功能
4. 查看浏览器 DevTools 了解运行情况

---

**Happy Coding! 🎉**

---

版本: 1.0.0  
最后更新: 2026-01-18
