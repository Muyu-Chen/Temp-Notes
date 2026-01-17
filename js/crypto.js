/**
 * 对称加密模块 - 使用 Web Crypto API
 */

/**
 * 从密码派生密钥
 */
export const deriveKey = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("tempnotes-salt-2026"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  
  return key;
};

/**
 * 加密内容
 */
export const encryptContent = async (id, content, password) => {
  try {
    const key = await deriveKey(password);
    const encoder = new TextEncoder();
    
    // 生成随机 IV（初始化向量）
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // 待加密的数据：id + "|" + content
    const plaintext = encoder.encode(`${id}|${content}`);
    
    // 加密
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      plaintext
    );
    
    // 返回 iv + ciphertext 的 base64 编码
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error("Encryption failed:", err);
    throw err;
  }
};

/**
 * 解密内容
 */
export const decryptContent = async (encryptedData, password) => {
  try {
    const key = await deriveKey(password);
    const decoder = new TextDecoder();
    
    // Base64 解码
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // 提取 IV 和密文
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    // 解密
    const plaintext = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    
    return decoder.decode(plaintext);
  } catch (err) {
    console.error("Decryption failed:", err);
    throw err;
  }
};

/**
 * 验证密码（通过检查解密后是否能正确解析 id|content）
 */
export const verifyPassword = async (id, encryptedData, password) => {
  try {
    const decrypted = await decryptContent(encryptedData, password);
    const [decryptedId] = decrypted.split("|", 1);
    
    // 验证 id 是否匹配
    return decryptedId === id;
  } catch (err) {
    return false;
  }
};

/**
 * 从加密数据中提取内容（不需要验证密码）
 */
export const extractFromEncrypted = (encryptedData) => {
  try {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    // 只返回存在加密数据的标记，不能解密内容
    return "encrypted";
  } catch (err) {
    return null;
  }
};
