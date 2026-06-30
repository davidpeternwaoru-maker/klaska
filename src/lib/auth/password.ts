// Password hashing. We never store raw passwords. bcrypt turns a password into
// a one-way hash (with a built-in salt); to check a login we hash the attempt
// and compare. bcryptjs is pure JavaScript, so it needs no native build on
// Windows. It runs only on the Node server (never in Edge middleware).

import bcrypt from "bcryptjs";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10); // 10 = work factor (cost)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
