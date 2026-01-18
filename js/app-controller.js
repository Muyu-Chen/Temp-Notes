/**
 * 业务逻辑核心模块
 */

import {
    loadDraft,
    saveDraft,
    loadItems,
    saveItems,
    normalizeImportedData,
    mergeItems,
    exportData,
    saveTheme,
    loadEncryptionData,
    saveEncryptionData,
    clearEncryptionData,
} from "./storage.js";
import { encryptContent, decryptContent, verifyPassword } from "./crypto.js";
import { Modal } from "./modal.js";
import { firstLine, now, uid, estimateStorageBytes, isMac } from "./utils.js";
import { RecycleManager } from "./recycle-manager.js";

export class AppController {
    constructor(uiController, domManager) {
        this.ui = uiController;
        this.dom = domManager;
        this.items = [];
        this.saveTimer = null;
        this.currentLoadedItemId = null; // 追踪当前加载的条目ID
        this.modal = new Modal(); // 模态框实例
        this.recycleManager = new RecycleManager(domManager, uiController); // 回收站管理器
        this.moreViewActive = false; // 更多功能界面是否激活
    }

    getStorageUsageBytes(draftValue = this.dom.getDraftValue()) {
        const recycleItems = this.recycleManager.getRecycleItems();
        const settings = { theme: this.ui.getTheme(), fontSize: this.getFontSize() };
        return estimateStorageBytes(draftValue, this.items, recycleItems, settings);
    }

    getDraftUsageBytes(draftValue = this.dom.getDraftValue()) {
        return (draftValue || "").length * 2;
    }

    init() {
        return (async () => {
            try {
                // 初始化字体大小
                const fontSize = this.getFontSize();
                document.documentElement.style.setProperty("--font-size", fontSize + "px");

                // 设置回收站管理器的事件回调
                this.recycleManager.onItemRestore = (index) => this.restoreFromRecycle(index);
                this.recycleManager.onItemDelete = (index) => this.deleteFromRecycle(index);

                // 加载初始数据
                const draft = await loadDraft();
                this.dom.setDraftValue(draft);

                // 加载存档条目
                this.items = await loadItems();

                this.dom.setAutosaveState("已保存");
                this.ui.updateMeta(
                    draft,
                    this.items,
                    this.getDraftUsageBytes(draft),
                    this.getStorageUsageBytes(draft)
                );
                this.render();
                this.dom.focusDraft();
            } catch (e) {
                console.error("初始化失败", e);
                this.ui.showToast("初始化失败：可能是 IndexedDB 被禁用");
            }
        })();
    }

    scheduleDraftSave() {
        this.dom.setAutosaveState("保存中");
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(
            async () => {
                try {
                    const draft = this.dom.getDraftValue();
                    await saveDraft(draft);
                    this.dom.setAutosaveState("已保存");
                    this.ui.updateMeta(
                        draft,
                        this.items,
                        this.getDraftUsageBytes(draft),
                        this.getStorageUsageBytes(draft)
                    );
                } catch (e) {
                    this.dom.setAutosaveState("保存失败");
                    this.ui.showToast("保存失败：IndexedDB 可能已满或被禁用");
                    console.error(e);
                }
            }, 250);
    }

    render() {
        this.ui.renderItemsList(this.items, this.items);
        const draft = this.dom.getDraftValue();
        this.ui.updateMeta(
            draft,
            this.items,
            this.getDraftUsageBytes(draft),
            this.getStorageUsageBytes(draft)
        );
    }

    loadToDraft(id) {
        const it = this.items.find((x) => x.id === id);
        if (!it) return;

        // 如果条目已加密，不允许加载
        if (it.encrypted) {
            this.ui.showToast("该条目已加密，请先解密");
            return;
        }

        this.dom.setDraftValue(it.content);
        saveDraft(it.content); // 异步但不等待
        this.currentLoadedItemId = id; // 记录加载的条目ID
        this.dom.setAutosaveState("已保存");
        this.ui.updateMeta(
            it.content,
            this.items,
            this.getDraftUsageBytes(it.content),
            this.getStorageUsageBytes(it.content)
        );
        this.ui.showToast("已加载到草稿区");
        this.dom.focusDraft();
    }

    archiveDraft() {
        const content = this.dom.getDraftValue();
        if (!content.trim()) {
            this.ui.showToast("草稿为空：无需存档");
            return;
        }

        // 如果当前加载了某个条目，就更新该条目
        if (this.currentLoadedItemId) {
            const itemIndex = this.items.findIndex(x => x.id === this.currentLoadedItemId);
            if (itemIndex !== -1) {
                this.items[itemIndex] = {
                    ...this.items[itemIndex],
                    content,
                    updatedAt: now()
                };
                this.ui.showToast("已更新条目");
                saveItems(this.items); // 异步但不等待
                this.render();
                return;
            }
        }

        // 否则创建新条目
        const it = { id: uid(), content, createdAt: now(), updatedAt: now() };
        this.items.unshift(it);
        this.currentLoadedItemId = it.id; // 记录新创建条目的ID，后续编辑会更新此条目
        this.ui.showToast("已存档为新条目");
        saveItems(this.items); // 异步但不等待
        this.render();
    }

    async deleteItem(id) {
        const it = this.items.find((x) => x.id === id);
        if (!it) return;

        // 无需二次确认，直接放入回收站
        await this.recycleManager.addToRecycle(it);

        this.items = this.items.filter((x) => x.id !== id);
        saveItems(this.items); // 异步但不等待
        this.render();
        this.ui.showToast("已删除条目（可在回收站恢复）");
    }

    clearDraft() {
        const ok = confirm("确认清空草稿？此操作不可恢复。");
        if (!ok) return;

        this.dom.setDraftValue("");
        saveDraft(""); // 异步但不等待
        this.currentLoadedItemId = null; // 清除加载的条目ID
        this.dom.setAutosaveState("已保存");
        this.ui.updateMeta("", this.items, 0, this.getStorageUsageBytes(""));
        this.ui.showToast("草稿已清空");
        this.dom.focusDraft();
    }

    /**
     * 打开更多功能面板
     */
    openMorePanel() {
        this.moreViewActive = true;
        this.dom.moreModalOverlay.style.display = "block";
        this.dom.moreModal.style.display = "flex";
        // 默认显示回收站
        this.switchPanel("recycle");
    }

    /**
     * 关闭更多功能面板
     */
    closeMorePanel() {
        this.moreViewActive = false;
        this.dom.moreModalOverlay.style.display = "none";
        this.dom.moreModal.style.display = "none";
    }

    /**
     * 切换面板
     */
    switchPanel(panelName) {
        // 隐藏所有面板
        this.dom.recyclePanel.classList.remove("active");
        this.dom.importExportPanel.classList.remove("active");
        this.dom.settingsPanel.classList.remove("active");
        
        // 移除所有侧边栏项的高亮
        this.dom.sidebarRecycle.classList.remove("active");
        this.dom.sidebarImportExport.classList.remove("active");
        this.dom.sidebarSettings.classList.remove("active");

        // 显示选中的面板和高亮对应的菜单
        if (panelName === "recycle") {
            this.dom.recyclePanel.classList.add("active");
            this.dom.sidebarRecycle.classList.add("active");
            const items = this.recycleManager.getRecycleItems();
            this.recycleManager.renderRecycleList(items);
        } else if (panelName === "importExport") {
            this.dom.importExportPanel.classList.add("active");
            this.dom.sidebarImportExport.classList.add("active");
        } else if (panelName === "settings") {
            this.dom.settingsPanel.classList.add("active");
            this.dom.sidebarSettings.classList.add("active");
            this.loadSettingsUI();
        }
    }

    /**
     * 加载设置UI的当前值
     */
    loadSettingsUI() {
        const fontSize = this.getFontSize();
        this.dom.fontSizeSlider.value = fontSize;
        this.dom.fontSizeValue.textContent = fontSize + "px";

        const llmSettings = this.getLLMSettings();
        this.dom.setLLMSettings(llmSettings);
    }

    /**
     * 获取当前字体大小
     */
    getFontSize() {
        try {
            const size = localStorage.getItem("font_size");
            return size ? parseInt(size) : 16;
        } catch {
            return 16;
        }
    }

    /**
     * 获取 LLM 设置
     */
    getLLMSettings() {
        try {
            const baseUrl = localStorage.getItem("llm_base_url") || "";
            const apiKey = localStorage.getItem("llm_api_key") || "";
            const model = localStorage.getItem("llm_model") || "";
            return { baseUrl, apiKey, model };
        } catch {
            return { baseUrl: "", apiKey: "", model: "" };
        }
    }

    /**
     * 保存 LLM 设置
     */
    saveLLMSettings(baseUrl, apiKey, model) {
        try {
            localStorage.setItem("llm_base_url", baseUrl);
            localStorage.setItem("llm_api_key", apiKey);
            localStorage.setItem("llm_model", model);
        } catch (err) {
            console.error("Failed to save LLM settings:", err);
        }
    }

    /**
     * 设置字体大小
     */
    setFontSize(size) {
        try {
            size = parseInt(size);
            if (size >= 12 && size <= 20) {
                localStorage.setItem("font_size", size);
                document.documentElement.style.setProperty("--font-size", size + "px");
                this.dom.fontSizeValue.textContent = size + "px";
            }
        } catch (err) {
            console.error("Failed to set font size:", err);
        }
    }

    /**
     * 回收站搜索
     */
    onRecycleSearch() {
        const searchQuery = this.dom.getRecycleSearchValue();
        const items = this.recycleManager.getRecycleItems();
        this.recycleManager.renderRecycleList(items, searchQuery);
    }

    /**
     * 清除所有内容（包括草稿、条目、回收站、设置）
     */
    async clearAllData() {
        const result = await this.modal.show({
            title: "清除所有内容",
            message: "此操作将永久删除所有草稿、条目、回收站和设置数据，无法恢复。\n\n请确认是否继续。",
            okText: "继续清除",
            cancelText: "取消",
        });

        if (!result.ok) return;

        // 二级确认
        const confirmResult = await this.modal.show({
            title: "最后确认",
            message: "确定要清除所有数据吗？此操作不可逆。",
            okText: "确认清除",
            cancelText: "取消",
        });

        if (!confirmResult.ok) return;

        try {
            // 清除 IndexedDB
            const db = await this.getDB();
            const transaction = db.transaction(["settings", "items", "recycle"], "readwrite");
            
            ["settings", "items", "recycle"].forEach(storeName => {
                transaction.objectStore(storeName).clear();
            });

            await new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });

            // 清除 localStorage 中所有数据
            localStorage.clear();

            // 清除内存数据
            this.items = [];
            this.currentLoadedItemId = null;
            this.recycleManager.deletedItems = [];

            // 重置UI
            this.dom.setDraftValue("");
            this.dom.setAutosaveState("已保存");
            this.ui.updateMeta("", [], 0, 0);
            
            // 重置所有设置输入框
            this.dom.fontSizeSlider.value = "16";
            this.dom.fontSizeValue.textContent = "16px";
            this.dom.setLLMSettings({ baseUrl: "", apiKey: "", model: "" });
            
            this.render();

            this.ui.showToast("所有数据已清除");
            this.closeMorePanel();
        } catch (err) {
            console.error("清除数据失败:", err);
            this.ui.showToast("清除数据失败");
        }
    }

    /**
     * 获取 IndexedDB 连接（简化版）
     */
    async getDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("tempnotes_db", 2);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 打开回收站
     */
    openRecycleBin() {
        this.switchPanel("recycle");
    }

    /**
     * 返回更多功能主菜单
     */
    backToMoreMenu() {
        this.dom.recycleContent.style.display = "none";
    }

    /**
     * 恢复回收站中的条目
     */
    async restoreFromRecycle(index) {
        const items = this.recycleManager.getRecycleItems();
        if (index < 0 || index >= items.length) return;

        const item = items[index];
        const title = `恢复条目？`;
        const msg = `标题：${firstLine(item.content)}`;
        
        const result = await this.modal.show({
            title: title,
            message: msg,
            okText: "确认恢复",
            cancelText: "取消",
        });

        if (!result.ok) return;

        const restoredItem = await this.recycleManager.restoreItem(index);
        if (restoredItem) {
            // 移除 deletedAt 属性
            delete restoredItem.deletedAt;
            this.items.unshift(restoredItem);
            saveItems(this.items);
            this.render();
            this.ui.showToast("条目已恢复");
            
            // 刷新回收站列表
            const updatedItems = this.recycleManager.getRecycleItems();
            this.recycleManager.renderRecycleList(updatedItems);
        }
    }

    /**
     * 永久删除回收站中的条目
     */
    async deleteFromRecycle(index) {
        const items = this.recycleManager.getRecycleItems();
        if (index < 0 || index >= items.length) return;

        const item = items[index];
        const title = `永久删除条目？`;
        const msg = `此操作不可恢复。\n\n标题：${firstLine(item.content)}`;
        
        const result = await this.modal.show({
            title: title,
            message: msg,
            okText: "永久删除",
            cancelText: "取消",
        });

        if (!result.ok) return;

        await this.recycleManager.deleteFromRecycle(index);
        this.ui.showToast("条目已永久删除");

        // 刷新回收站列表
        const updatedItems = this.recycleManager.getRecycleItems();
        this.recycleManager.renderRecycleList(updatedItems);
    }

    /**
     * 清空回收站
     */
    async clearRecycleBin() {
        const items = this.recycleManager.getRecycleItems();
        if (items.length === 0) {
            this.ui.showToast("回收站已为空");
            return;
        }

        const result = await this.modal.show({
            title: "清空回收站",
            message: `将永久删除所有 ${items.length} 个已删除的条目，此操作不可恢复。`,
            okText: "清空",
            cancelText: "取消",
        });

        if (!result.ok) return;

        await this.recycleManager.clearRecycle();
        this.ui.showToast("回收站已清空");

        // 刷新回收站列表
        const updatedItems = this.recycleManager.getRecycleItems();
        this.recycleManager.renderRecycleList(updatedItems);
    }

    exportAll() {
        const payload = exportData(this.dom.getDraftValue(), this.items);
        const json = JSON.stringify(payload, null, 2);

        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tempnotes-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        this.ui.showToast("已导出 JSON");
    }

    importAll() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";
        input.onchange = async () => {
            const file = input.files && input.files[0];
            if (!file) return;

            const text = await file.text();
            const data = JSON.parse(text);

            if (!data) {
                this.ui.showToast("导入失败：JSON 格式不正确");
                return;
            }

            const { draft: importedDraft, items: importedItems, valid } =
                normalizeImportedData(data);

            if (!valid) {
                this.ui.showToast("导入失败：数据格式不正确");
                return;
            }
            this.items = mergeItems(this.items, importedItems);

            const overwrite = confirm(
                "是否用导入文件中的 draft 覆盖当前草稿？\n\n选择\"取消\"将保留当前草稿，仅导入条目。"
            );
            if (overwrite) {
                this.dom.setDraftValue(importedDraft);
                saveDraft(importedDraft); // 异步但不等待
                this.dom.setAutosaveState("已保存");
            }

            saveItems(this.items); // 异步但不等待
            this.render();
            const addedCount = importedItems.filter(
                (x) => this.items.some((it) => it.id === x.id)
            ).length;
            this.ui.showToast(`导入完成：新增 ${addedCount} 条`);
        };
        input.click();
    }

    // Event handlers
    onDraftInput() {
        const draft = this.dom.getDraftValue();

        // 草稿被清空后，切断与已有条目的关联，后续保存必定新建ID
        if (!draft.trim()) {
            this.currentLoadedItemId = null;
        }

        this.scheduleDraftSave();
        this.ui.updateMeta(
            draft,
            this.items,
            this.getDraftUsageBytes(draft),
            this.getStorageUsageBytes(draft)
        );
    }

    onSearchInput() {
        this.render();
    }

    onThemeToggle() {
        const cur = this.ui.getTheme();
        const nxt = cur === "dark" ? "light" : "dark";
        this.ui.updateTheme(nxt);
        saveTheme(nxt); // 异步但不等待
        this.ui.showToast(`主题已切换为：${nxt === "dark" ? "暗色" : "亮色"}`);
    }

    onKeyDown(e) {
        const ctrl = isMac() ? e.metaKey : e.ctrlKey;

        if (ctrl && e.key.toLowerCase() === "s") {
            e.preventDefault();
            this.archiveDraft();
        }
        if (ctrl && e.key.toLowerCase() === "k") {
            e.preventDefault();
            this.dom.focusSearch();
        }
        if (ctrl && e.key.toLowerCase() === "l") {
            e.preventDefault();
            this.clearDraft();
        }
    }

    /**
     * 加密指定条目
     */
    async encryptItem(id) {
        const item = this.items.find((x) => x.id === id);
        if (!item) return;

        if (item.encrypted) {
            this.ui.showToast("该条目已加密");
            return;
        }

        // 显示输入框，让用户输入密码和提示
        const result = await this.modal.show({
            title: "加密条目",
            message: "设置密码保护此条目",
            inputs: [
                { type: "password", label: "输入密码", placeholder: "密码", required: true },
                { type: "text", label: "密码提示", placeholder: "例如：我的生日", required: true }
            ],
            okText: "加密",
            cancelText: "取消",
        });

        if (!result.ok) {
            return;
        }

        const [password, hint] = result.values;

        if (!password.trim() || !hint.trim()) {
            this.ui.showToast("密码和提示均不能为空");
            return;
        }

        try {
            // 加密内容（包含 ID 便于验证）
            const encrypted = await encryptContent(item.id, item.content, password);
            
            // 更新条目为加密状态
            const itemIndex = this.items.findIndex((x) => x.id === id);
            if (itemIndex !== -1) {
                this.items[itemIndex] = {
                    ...this.items[itemIndex],
                    content: encrypted,
                    encrypted: true,
                    encryptionHint: hint,
                    updatedAt: now(),
                };
                
                await saveItems(this.items);
                // 加密后立刻切断与加载条目的关联，防止后续保存覆盖加密内容
                if (this.currentLoadedItemId === id) {
                    this.currentLoadedItemId = null;
                }
                this.ui.showToast("条目已加密");
                this.render();
            }
        } catch (err) {
            console.error("加密失败:", err);
            this.ui.showToast("加密失败");
        }
    }

    /**
     * 解密指定条目
     */
    async decryptItem(id) {
        const item = this.items.find((x) => x.id === id);
        if (!item) return;

        if (!item.encrypted) {
            this.ui.showToast("该条目未加密");
            return;
        }

        const result = await this.modal.show({
            title: "解密条目",
            message: `提示：${item.encryptionHint || "无提示"}`,
            inputs: [
                { type: "password", label: "输入密码", placeholder: "密码", required: true }
            ],
            okText: "解密",
            cancelText: "取消",
        });

        if (!result.ok) {
            return;
        }

        const password = result.values[0];

        try {
            // 尝试解密
            const decrypted = await decryptContent(item.content, password);
            const [decryptedId, content] = decrypted.split("|", 2);
            
            // 验证密码正确性
            const isValid = await verifyPassword(item.id, item.content, password);
            if (!isValid) {
                this.ui.showToast("密码错误");
                return;
            }
            
            // 更新条目为未加密状态
            const itemIndex = this.items.findIndex((x) => x.id === id);
            if (itemIndex !== -1) {
                this.items[itemIndex] = {
                    ...this.items[itemIndex],
                    content: content,
                    encrypted: false,
                    encryptionHint: undefined,
                    updatedAt: now(),
                };
                
                await saveItems(this.items);
                this.ui.showToast("解密成功");
                this.render();
            }
        } catch (err) {
            console.error("解密失败:", err);
            this.ui.showToast("解密失败，密码可能错误");
        }
    }
}
