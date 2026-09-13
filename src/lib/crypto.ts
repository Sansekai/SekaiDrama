import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_CRYPTO_SECRET || "Sansekai-SekaiDrama";

export function encryptData(data: any): string {
  // If data is an object/array, stringify it first
  const stringified = typeof data === "string" ? data : JSON.stringify(data);
  return CryptoJS.AES.encrypt(stringified, SECRET_KEY).toString();
}

export function decryptData<T>(ciphertext: string): T {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      throw new Error("Decryption failed: Empty result");
    }

    return JSON.parse(decryptedString);
  } catch (error) {
    console.error("Decryption Error:", error);
    throw error;
  }
}
