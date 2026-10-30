const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
const JOURNAL_ENC_KEY = process.env.JOURNAL_ENC_KEY
  ? Buffer.from(process.env.JOURNAL_ENC_KEY, 'hex')
  : null;

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.user_id, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Envelope-style encryption for journal free text (AES-256-GCM).
// In production, JOURNAL_ENC_KEY should come from a managed KMS, not a static env var.
function encryptText(plainText) {
  if (!JOURNAL_ENC_KEY) throw new Error('JOURNAL_ENC_KEY is not configured');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', JOURNAL_ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // store as iv(12) || authTag(16) || ciphertext
  return Buffer.concat([iv, authTag, encrypted]);
}

function decryptText(buffer) {
  if (!JOURNAL_ENC_KEY) throw new Error('JOURNAL_ENC_KEY is not configured');
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const ciphertext = buffer.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', JOURNAL_ENC_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function hashForAudit(value) {
  // one-way hash for things like IP addresses in audit logs — never store raw IPs
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

module.exports = {
  hashPassword, verifyPassword, signToken, verifyToken,
  encryptText, decryptText, hashForAudit
};
