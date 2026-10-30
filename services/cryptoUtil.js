const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getSecretKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is missing. Cannot perform encryption/decryption.');
  }
  // Ensure the key is exactly 32 bytes for aes-256-gcm
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  } else if (key.length === 44) {
    return Buffer.from(key, 'base64');
  } else {
    // Hash it to exactly 32 bytes if it doesn't match standard hex/base64 lengths
    return crypto.createHash('sha256').update(key).digest();
  }
}

function encrypt(text) {
  if (!text) return text;
  
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(text) {
  if (!text || !text.startsWith('enc:')) return text;
  
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encryptedText = parts[3];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err.message);
    return null; // Return null on decryption failure instead of crashing
  }
}

module.exports = {
  encrypt,
  decrypt
};
