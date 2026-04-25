import { randomUUID } from "crypto";
import * as path from "path";

const SAFE_EXT = /^\.[a-zA-Z0-9]{1,10}$/;

export function buildSafeS3ObjectKey(originalFilename: string): string {
  const ext = path.extname(originalFilename || "");
  const normalized = SAFE_EXT.test(ext) ? ext.toLowerCase() : "";
  return `uploads/${randomUUID()}${normalized || ""}`;
}

export function publicS3ObjectUrl(bucket: string, region: string, key: string): string {
  if (region === "us-east-1") {
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
