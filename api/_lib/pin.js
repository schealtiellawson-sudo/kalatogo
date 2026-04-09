// ================================================================
// WOLO Pay — PIN helpers (scrypt)
// ================================================================
import crypto from 'node:crypto';

export function hashPin(pin, salt = null) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), s, 64).toString('hex');
  return { hash, salt: s };
}

export function verifyPin(pin, hash, salt) {
  const check = crypto.scryptSync(String(pin), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
}
