# 👨‍💻 开发者手册 (Developer Manual)

欢迎参与 **Temp Notes** 的开发！本文档将指导你如何设置环境、遵循规范并提交高质量的代码。

## 🛠️ 环境准备

### 1. 最小要求
*   **Node.js**: v16+ (推荐 v18+)
*   **现代浏览器**: Chrome 85+, Firefox 78+, Safari 14+。
*   **编辑器**: 推荐使用 VS Code。

### 2. 安装依赖
虽然本项目在浏览器中直接打开即可运行，但为了运行测试和进行高效开发，建议安装依赖：
```bash
npm install
```

### 3. 运行开发服务器
为了支持 ES Modules 加载，你需要通过 HTTP 服务访问应用：
```bash
# 方式 A: 使用 Python
npm run dev  # 实际上执行的是 python -m http.server 3000

# 方式 B: 使用 VS Code Live Server 扩展 (推荐)
# 右键 index.html -> Open with Live Server
```

---

## 🧪 测试 (Testing)

我们使用 **Vitest** 进行回归测试，确保核心业务逻辑的准确性。

*   **运行所有测试**: `npm test`
*   **监听模式**: `npm run test:watch`

测试覆盖范围包括：
*   草稿生命周期规则（自动保存、存档、清空）。
*   条目操作（加密、解密、删除至回收站）。
*   导入导出逻辑（ZIP 包装、去重合并）。
*   工具函数（文本统计、时间格式化、ID 生成）。

---

## 📝 编码规范 (Coding Standards)

### 1. 命名约定
*   **文件名**: `kebab-case.js` (例如 `draft-service.js`)。
*   **类名**: `PascalCase` (例如 `AppController`)。
*   **函数/变量**: `camelCase` (例如 `scheduleDraftSave`)。
*   **私有成员**: 内部属性或方法建议以 `_` 开头。

### 2. 模块化原则
*   **单一职责**: 一个 Service 只做一件事。
*   **依赖注入**: 在 `app-bootstrap.js` 中完成实例化，并通过构造函数注入依赖，便于单元测试。
*   **无直接 DOM 操作**: 业务逻辑层（Service/Controller）应通过 `DOMManager` 操作 DOM。

### 3. 注释
使用 JSDoc 为复杂函数编写注释，特别是 Service 层的公共接口。

---

## 🔄 开发工作流示例

### 场景：添加一个新的按钮功能
1.  **HTML**: 在 `index.html` 中添加按钮标签，并赋予唯一的 `id`。
2.  **DOM**: 在 `js/ui/dom-manager.js` 的构造函数中获取该元素的引用。
3.  **Service**: 如果涉及新业务，在 `js/services/` 创建新的 Service，或者在现有 Service 中添加方法。
4.  **Controller**: 在 `js/app-controller.js` 中添加处理逻辑。
5.  **Event**: 在 `js/bootstrap/bind-events.js` 中绑定按钮点击事件到控制器。
6.  **Test**: 在 `tests/` 中编写对应的回归测试。

---

## 📦 提交代码

1.  **检查 Lint**: 确保代码风格一致。
2.  **运行测试**: `npm test` 必须全部通过。
3.  **更新文档**: 如果修改了架构或添加了功能，请同步更新 `./doc` 下的相关文档。

---

**更新时间**: 2026-05-22  
**版本**: v1.2.0

