# 📑 项目文档索引 (Documentation Index)

欢迎查阅 **Temp Notes** 的项目文档。本项目已从简单的 Demo 演进为基于 **Service-Oriented (面向服务)** 和 **Layered (分层)** 架构的高质量应用。

## 🎯 快速导航 (Quick Navigation)

根据你的需求选择合适的文档：

### 👤 用户向 (For Users)
*   **[QUICK_START.md](QUICK_START.md)**: 快速上手指南，包含功能介绍、快捷键和隐私说明。
*   **[START_HERE.md](START_HERE.md)**: 项目初探，适合第一次接触本项目的任何人。

### 👨‍💻 开发者向 (For Developers)
*   **[DEVELOPER.md](DEVELOPER.md)**: 开发者手册，包含环境搭建、编码规范、测试指南和工作流。
*   **[ARCHITECTURE.md](ARCHITECTURE.md)**: 架构深度解析，涵盖分层设计、服务模型、数据流和存储方案。
*   **[STRUCTURE.md](STRUCTURE.md)**: 详细的文件系统结构说明。

### 📋 项目管理 (For Management)
*   **[CHECKLIST.md](CHECKLIST.md)**: 功能清单与质量验收标准。

---

## 📂 核心架构概览 (Core Architecture Overview)

| 层级 (Layer) | 职责 (Responsibility) | 核心模块 (Core Modules) |
| :--- | :--- | :--- |
| **入口与引导层** | 应用启动编排、事件绑定 | `main.js`, `bootstrap/*` |
| **表现层 (UI)** | DOM 抽象、视图渲染、用户交互 | `ui/dom-manager.js`, `ui/ui-controller.js`, `ui/item-list-view.js` |
| **编排与服务层** | 业务逻辑协调、状态管理 | `app-controller.js`, `services/*-service.js` |
| **数据访问层** | 持久化存储 (IndexedDB) | `storage/idb.js`, `storage/*-storage.js` |
| **通用工具层** | 文本、时间、加密等辅助工具 | `lib/*`, `utils.js`, `crypto.js` |

---

## 🔍 快速查找指南 (Quick Search)

*   **如何修改样式?** → 查阅 `css/` 目录，详见 [STRUCTURE.md](STRUCTURE.md)。
*   **如何添加新功能?** → 参考 [DEVELOPER.md](DEVELOPER.md#场景1-添加新的按钮功能) 中的工作流。
*   **数据存在哪里?** → 浏览器 IndexedDB，详见 [ARCHITECTURE.md](ARCHITECTURE.md#数据持久化层)。
*   **如何运行测试?** → 使用 `npm test`，详见 [DEVELOPER.md](DEVELOPER.md#🧪-测试)。

---

## 📊 项目统计 (Project Stats)

*   **JavaScript 模块**: 30+ 个
*   **CSS 文件**: 4 个核心文件 (Theme, Base, Layout, Components)
*   **存储引擎**: IndexedDB (v3+)
*   **测试框架**: Vitest
*   **许可证**: AGPL-3.0

---

**更新时间**: 2026-05-22  
**状态**: ✅ 文档已同步至 v1.2.0 代码架构
