/**
 * 条目加密与解密流程
 */

import { clearDraftItemId } from "../storage/draft-storage.js";
import { saveItems } from "../storage/item-storage.js";
import { decryptContent, encryptContent, verifyPassword } from "../crypto.js";
import { cleanTitle, firstLine } from "../lib/text-utils.js";
import { now } from "../lib/time-utils.js";

export class EncryptionService {
  constructor(app) {
    this.app = app;
  }

  async encryptItem(id) {
    const { app } = this;
    const item = app.items.find((x) => x.id === id);
    if (!item) return;

    if (item.encrypted) {
      app.ui.showToast("该条目已加密");
      return;
    }

    const autoTitle = firstLine(item.content);
    const currentTitle = cleanTitle(item.title) || cleanTitle(item.encryptedTitle) || autoTitle;

    const result = await app.modal.show({
      title: "加密条目",
      message: "设置密码保护此条目（密码留空则使用默认密码）",
      inputs: [
        { type: "text", label: "条目标题", placeholder: "例如：私人笔记", value: currentTitle, required: false },
        { type: "password", label: "输入密码", placeholder: "留空使用默认密码", required: false },
        { type: "text", label: "密码提示", placeholder: "例如：我的生日", required: false, value: item.encryptionHint || "" },
      ],
      okText: "加密",
      cancelText: "取消",
    });

    if (!result.ok) {
      return;
    }

    const [encryptedTitle, rawPassword, hint] = result.values;
    const rawManualTitle = cleanTitle(encryptedTitle);
    const manualTitle = rawManualTitle === autoTitle ? undefined : rawManualTitle;
    const displayTitle = manualTitle || autoTitle;

    const useDefaultPassword = !rawPassword.trim();
    const password = useDefaultPassword ? "password" : rawPassword.trim();

    try {
      const encrypted = encryptContent(item.id, item.content, password);
      const itemIndex = app.items.findIndex((x) => x.id === id);
      if (itemIndex !== -1) {
        app.items[itemIndex] = {
          ...app.items[itemIndex],
          content: encrypted,
          title: manualTitle,
          encrypted: true,
          encryptedTitle: displayTitle,
          encryptionHint: hint.trim() || undefined,
          defaultPassword: useDefaultPassword || undefined,
          updatedAt: now(),
        };

        await saveItems(app.items);
        if (app.currentLoadedItemId === id) {
          app.currentLoadedItemId = null;
          clearDraftItemId();
        }
        app.ui.showToast(useDefaultPassword ? "条目已加密（使用默认密码）" : "条目已加密");
        app.render();
      }
    } catch (err) {
      console.error("加密失败:", err);
      app.ui.showToast("加密失败");
    }
  }

  async decryptItem(id) {
    const { app } = this;
    const item = app.items.find((x) => x.id === id);
    if (!item) return;

    if (!item.encrypted) {
      app.ui.showToast("该条目未加密");
      return;
    }

    let password;

    if (item.defaultPassword) {
      password = "password";
    } else {
      const result = await app.modal.show({
        title: "解密条目",
        message: `提示：${item.encryptionHint || "无提示"}`,
        inputs: [{ type: "password", label: "输入密码", placeholder: "密码", required: true }],
        okText: "解密",
        cancelText: "取消",
      });

      if (!result.ok) {
        return;
      }

      password = result.values[0];
    }

    try {
      const decrypted = decryptContent(item.content, password);
      const content = decrypted.slice(decrypted.indexOf("|") + 1);

      const isValid = verifyPassword(item.id, item.content, password);
      if (!isValid) {
        app.ui.showToast("密码错误");
        return;
      }

      const itemIndex = app.items.findIndex((x) => x.id === id);
      if (itemIndex !== -1) {
        app.items[itemIndex] = {
          ...app.items[itemIndex],
          content,
          title: item.title,
          encrypted: false,
          encryptedTitle: undefined,
          encryptionHint: item.encryptionHint,
          defaultPassword: undefined,
          updatedAt: now(),
        };

        await saveItems(app.items);
        app.ui.showToast("解密成功");
        app.render();
      }
    } catch (err) {
      console.error("解密失败:", err);
      app.ui.showToast("解密失败，密码可能错误");
    }
  }
}
