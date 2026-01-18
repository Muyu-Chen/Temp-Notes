/**
 * 对称加密模块 - 使用 CryptoJS
 */

const ENC_V = 1;
const PBKDF2_ITERS = 200000; // PBKDF2 迭代次数，可调
const KEY_SIZE_WORDS = 256 / 32; // 256-bit key

/**
 * 加密内容
 */
export const encryptContent = (id, plainText, password) => {
  if (!password) throw new Error("Missing password");
  if (typeof CryptoJS === "undefined") throw new Error("CryptoJS not loaded");

  // 待加密的数据：id + "|" + content
  const content = `${id}|${plainText}`;

  const salt = CryptoJS.lib.WordArray.random(16);
  const iv = CryptoJS.lib.WordArray.random(16);

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE_WORDS,
    iterations: PBKDF2_ITERS,
    hasher: CryptoJS.algo.SHA256,
  });

  const encrypted = CryptoJS.AES.encrypt(content, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // 存储结构：版本 + 参数 + 密文
  const payload = {
    v: ENC_V,
    kdf: "PBKDF2-SHA256",
    iters: PBKDF2_ITERS,
    salt: CryptoJS.enc.Base64.stringify(salt),
    iv: CryptoJS.enc.Base64.stringify(iv),
    ct: CryptoJS.enc.Base64.stringify(encrypted.ciphertext),
  };

  return JSON.stringify(payload);
};

/**
 * 解密内容
 */
export const decryptContent = (cipherPayloadText, password) => {
  if (!password) throw new Error("Missing password");
  if (typeof CryptoJS === "undefined") throw new Error("CryptoJS not loaded");

  let payload;
  try {
    payload = JSON.parse(cipherPayloadText);
  } catch {
    throw new Error("Invalid ciphertext payload");
  }

  if (!payload || payload.v !== ENC_V) throw new Error("Unsupported payload version");

  const salt = CryptoJS.enc.Base64.parse(payload.salt);
  const iv = CryptoJS.enc.Base64.parse(payload.iv);
  const ct = CryptoJS.enc.Base64.parse(payload.ct);

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE_WORDS,
    iterations: payload.iters || PBKDF2_ITERS,
    hasher: CryptoJS.algo.SHA256,
  });

  const decrypted = CryptoJS.AES.decrypt({ ciphertext: ct }, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const plainText = decrypted.toString(CryptoJS.enc.Utf8);
  if (plainText === "") {
    // 密码错误 / 数据损坏：CBC 无认证会解出空串
    throw new Error("Decrypt failed (wrong password or corrupted data)");
  }
  return plainText;
};

/**
 * 从加密数据中提取内容（不需要验证密码）
 */
export const extractFromEncrypted = (encryptedData) => {
  try {
    // 只返回存在加密数据的标记，不能解密内容
    return "encrypted";
  } catch (err) {
    return null;
  }
};

/**
 * 验证密码（通过检查解密后是否能正确解析 id|content）
 */
export const verifyPassword = (id, encryptedData, password) => {
  try {
    const decrypted = decryptContent(encryptedData, password);
    const [decryptedId] = decrypted.split("|", 1);

    // 验证 id 是否匹配
    return decryptedId === id;
  } catch (err) {
    return false;
  }
};
