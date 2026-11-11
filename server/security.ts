import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { config } from "./config";
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, expected] = hash.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const buffer = Buffer.from(expected, "hex");
  return actual.length === buffer.length && timingSafeEqual(actual, buffer);
}
function key() {
  const buffer = Buffer.from(config.encryptionKey, "hex");
  if (buffer.length !== 32)
    throw new Error("TOKEN_ENCRYPTION_KEY doit contenir 32 octets hexadécimaux.");
  return buffer;
}
export function encrypt(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString("base64url")).join(".");
}
export function decrypt<T>(value: string): T {
  const [iv, tag, data] = value.split(".").map((s) => Buffer.from(s, "base64url"));
  if (!iv || !tag || !data) throw new Error("Jeton chiffré invalide");
  const cipher = createDecipheriv("aes-256-gcm", key(), iv);
  cipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8")) as T;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
