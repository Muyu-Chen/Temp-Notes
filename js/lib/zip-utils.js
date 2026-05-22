/**
 * 本地 JSZip 适配层。
 */

const textDecoder = new TextDecoder();

const getJSZip = () => {
  if (typeof globalThis.JSZip !== "function") {
    throw new Error("ZIP 工具未加载");
  }
  return globalThis.JSZip;
};

const normalizeEntryName = (name) =>
  String(name || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .join("/");

export const createZipBlob = async (entries, timestamp = Date.now()) => {
  const JSZip = getJSZip();
  const zip = new JSZip();
  const date = new Date(timestamp);

  for (const entry of entries) {
    const name = normalizeEntryName(entry.name);
    if (name) {
      zip.file(name, entry.data, { date, compression: "STORE" });
    }
  }

  return zip.generateAsync({ type: "blob", compression: "STORE" });
};

export const readZipEntries = async (blob) => {
  const JSZip = getJSZip();
  const zip = await JSZip.loadAsync(blob);
  const entries = new Map();

  for (const file of Object.values(zip.files)) {
    if (!file.dir) {
      entries.set(file.name, {
        name: file.name,
        data: await file.async("uint8array"),
      });
    }
  }

  return entries;
};

export const decodeZipTextEntry = (entry) => textDecoder.decode(entry.data);
