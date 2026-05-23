/**
 * 启动前加载页面片段
 */

export const loadHtmlPartial = async (selector) => {
  const mount = document.querySelector(selector);
  if (!mount) return;

  const url = mount.dataset.partial;
  if (!url) return;

  if (typeof fetch === "function") {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load partial: ${url}`);
    }

    mount.innerHTML = await response.text();
    return;
  }

  if (typeof XMLHttpRequest === "function") {
    mount.innerHTML = await new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          resolve(request.responseText);
          return;
        }

        reject(new Error(`Failed to load partial: ${url}`));
      };
      request.onerror = () => reject(new Error(`Failed to load partial: ${url}`));
      request.send();
    });
    return;
  }

  mount.innerHTML = await new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.hidden = true;
    iframe.onload = () => {
      const html = iframe.contentDocument?.body?.innerHTML;
      iframe.remove();
      if (html) {
        resolve(html);
        return;
      }

      reject(new Error(`Failed to load partial: ${url}`));
    };
    iframe.onerror = () => {
      iframe.remove();
      reject(new Error(`Failed to load partial: ${url}`));
    };
    iframe.src = url;
    document.body.appendChild(iframe);
  });
};
