/**
 * Modal 对话框管理模块
 */

export class Modal {
  constructor() {
    this.modalElement = null;
    this.resolveCallback = null;
  }

  /**
   * 创建 modal 元素
   */
  create(options = {}) {
    const {
      title = "输入信息",
      message = "",
      inputs = [], // 数组，每个元素为 { type, label, placeholder, required }
      cancelText = "取消",
      okText = "确认",
      onCancel = null,
      onOk = null,
    } = options;

    // 创建 modal 容器
    const modal = document.createElement("div");
    modal.className = "modal-overlay";

    const content = document.createElement("div");
    content.className = "modal-content";

    // 标题
    const titleEl = document.createElement("div");
    titleEl.className = "modal-title";
    titleEl.textContent = title;

    // 消息
    const messageEl = document.createElement("div");
    messageEl.className = "modal-message";
    messageEl.textContent = message;

    // 输入字段
    const inputsContainer = document.createElement("div");
    inputsContainer.className = "modal-inputs";

    const inputElements = [];
    inputs.forEach((inputSpec) => {
      const group = document.createElement("div");
      group.className = "modal-input-group";

      if (inputSpec.label) {
        const label = document.createElement("label");
        label.className = "modal-label";
        label.textContent = inputSpec.label;
        group.appendChild(label);
      }

      const input = document.createElement("input");
      input.className = "modal-input";
      input.type = inputSpec.type || "text";
      input.placeholder = inputSpec.placeholder || "";
      input.required = inputSpec.required !== false;
      group.appendChild(input);
      inputsContainer.appendChild(group);
      inputElements.push(input);
    });

    // 按钮容器
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "modal-buttons";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "modal-btn modal-btn-cancel";
    cancelBtn.textContent = cancelText;
    cancelBtn.addEventListener("click", () => {
      this.close();
      if (onCancel) onCancel();
    });

    const okBtn = document.createElement("button");
    okBtn.className = "modal-btn modal-btn-ok";
    okBtn.textContent = okText;
    okBtn.addEventListener("click", () => {
      const values = inputElements.map((el) => el.value);
      this.close();
      if (onOk) onOk(values);
    });

    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(okBtn);

    // 组装
    content.appendChild(titleEl);
    if (message) content.appendChild(messageEl);
    if (inputElements.length > 0) content.appendChild(inputsContainer);
    content.appendChild(buttonContainer);

    modal.appendChild(content);

    // 点击外部关闭
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.close();
        if (onCancel) onCancel();
      }
    });

    this.modalElement = modal;
    return modal;
  }

  /**
   * 显示 modal
   */
  show(options = {}) {
    return new Promise((resolve) => {
      const modal = this.create({
        ...options,
        onOk: (values) => {
          resolve({ ok: true, values });
        },
        onCancel: () => {
          resolve({ ok: false, values: [] });
        },
      });

      document.body.appendChild(modal);

      // 自动聚焦第一个输入框
      setTimeout(() => {
        const firstInput = modal.querySelector(".modal-input");
        if (firstInput) firstInput.focus();
      }, 0);
    });
  }

  /**
   * 关闭 modal
   */
  close() {
    if (this.modalElement && this.modalElement.parentNode) {
      this.modalElement.parentNode.removeChild(this.modalElement);
      this.modalElement = null;
    }
  }
}

export const createGlobalModal = () => {
  return new Modal();
};
