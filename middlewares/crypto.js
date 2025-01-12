const CryptoJS = require("crypto-js");

const secretKey = "{WaA8#o0T4dj+$dahd%^kj]l";
const smallSecretKey = 37565159;

// Encrypt the userId and message
function encrypt(data) {
  const ciphertext = CryptoJS.AES.encrypt(
    data.toString(),
    secretKey
  ).toString();
  return ciphertext;
}

// Decrypt the userId and message
function decrypt(encryptedData) {
  const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
  const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
  return decryptedData;
}

function smallEncrypt(data) {
  const secretKey = parseInt(smallSecretKey, 10);
  const saltedData = parseInt(data, 10) + secretKey;
  const obfuscated = Buffer.from(saltedData.toString()).toString("base64");
  return obfuscated;
}

function smallDecrypt(encryptedData) {
  const deobfuscated = Buffer.from(encryptedData, "base64").toString("utf8");
  const secretKey = parseInt(smallSecretKey, 10);
  const deobfuscatedData = parseInt(deobfuscated, 10);
  const data = Math.abs(deobfuscatedData - secretKey);
  return data;
}

function urlEncrypt(data, is_smallEncrypt) {
  if (is_smallEncrypt) {
    return encodeURIComponent(smallEncrypt(data));
  }
  return encodeURIComponent(encrypt(data));
}

function urlDecrypt(encryptedData, is_smallDecrypt) {
  if (is_smallDecrypt) {
    return smallDecrypt(decodeURIComponent(smallDecrypt(encryptedData)));
  }
  return decrypt(decodeURIComponent(encryptedData));
}

module.exports = {
  encrypt,
  decrypt,
  urlEncrypt,
  urlDecrypt,
  smallEncrypt,
  smallDecrypt,
};
