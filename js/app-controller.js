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
import { firstLine, now, uid, storageBytes, isMac } from "./utils.js";

export class AppController {
    constructor(uiController, domManager) {
        this.ui = uiController;
        this.dom = domManager;
        this.items = [];
        this.saveTimer = null;
        this.currentLoadedItemId = null; // 追踪当前加载的条目ID
        this.modal = new Modal(); // 模态框实例
    }

    init() {
        return (async () => {
            try {
                // 加载初始数据
                const draft = await loadDraft();
                this.dom.setDraftValue(draft);

                // 加载存档条目
                this.items = await loadItems();

                this.dom.setAutosaveState("已保存");
                this.ui.updateMeta(this.dom.getDraftValue(), this.items, storageBytes());
                this.render();
                this.dom.focusDraft();
            } catch (e) {
                console.error("初始化失败", e);
                this.ui.showToast("初始化失败：可能是 IndexedDB 被禁用");
            }
        })();
    }

    scheduleDraftSave() {
        this.dom.setAutosaveState("正在保存...");
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(
            async () => {
                try {
                    await saveDraft(this.dom.getDraftValue());
                    this.dom.setAutosaveState("已保存");
                    this.ui.updateMeta(this.dom.getDraftValue(), this.items, storageBytes());
                } catch (e) {
                    this.dom.setAutosaveState("保存失败");
                    this.ui.showToast("保存失败：IndexedDB 可能已满或被禁用");
                    console.error(e);
                }
            }, 250);
    }

    render() {
        this.ui.renderItemsList(this.items, this.items);
        this.ui.updateMeta(this.dom.getDraftValue(), this.items, storageBytes());
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
        this.ui.updateMeta(this.dom.getDraftValue(), this.items, storageBytes());
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

    deleteItem(id) {
        const it = this.items.find((x) => x.id === id);
        if (!it) return;

        const ok = confirm(`确认删除该条目？\n\n标题：${firstLine(it.content)}`);
        if (!ok) return;

        this.items = this.items.filter((x) => x.id !== id);
        saveItems(this.items); // 异步但不等待
        this.render();
        this.ui.showToast("已删除条目");
    }

    clearDraft() {
        const ok = confirm("确认清空草稿？此操作不可恢复。");
        if (!ok) return;

        this.dom.setDraftValue("");
        saveDraft(""); // 异步但不等待
        this.currentLoadedItemId = null; // 清除加载的条目ID
        this.dom.setAutosaveState("已保存");
        this.ui.updateMeta(this.dom.getDraftValue(), this.items, storageBytes());
        this.ui.showToast("草稿已清空");
        this.dom.focusDraft();
    }

    clearArchive() {
        const ok = confirm("确认删除所有存档条目？此操作不可恢复。");
        if (!ok) return;

        this.items = [];
        saveItems(this.items); // 异步但不等待
        this.render();
        this.ui.showToast("存档已清空");
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
        this.scheduleDraftSave();
        this.ui.updateMeta(this.dom.getDraftValue(), this.items, storageBytes());
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
