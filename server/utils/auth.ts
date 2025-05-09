import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Generates a cryptographically secure random invite code
 * @param length Length of the code to generate (default: 12)
 * @returns A string containing a random invite code
 */
export function generateInviteCode(length: number = 12): string {
  // Use alphanumeric characters but exclude easily confused ones (0, O, 1, l, I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let result = '';
  const randomBytesBuffer = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    // Use modulo to get an index within the range of our charset
    const randomIndex = randomBytesBuffer[i] % chars.length;
    result += chars.charAt(randomIndex);
  }
  
  return result;
}

