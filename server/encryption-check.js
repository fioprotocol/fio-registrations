/**
 * @module Encryption
 */
const crypto = require('crypto')

const randomBytes = require('randombytes')
const createHmac = require('create-hmac')
const createHash = require('create-hash')

/**
  Provides AES-256-CBC encryption and message authentication. The CBC cipher is
  used for good platform native compatability.

  @see https://security.stackexchange.com/a/63134
  @see https://security.stackexchange.com/a/20493

  @arg {Buffer} secret - See PrivateKey.getSharedSecret()
  @arg {Buffer} message - plaintext
  @arg {Buffer} [IV = randomBytes(16)] - An unpredictable strong random value
    is required and supplied by default.  Unit tests may provide a static value
    to achieve predictable results.

  @throws {Error} IV must be 16 bytes
*/
function checkEncrypt(secret, message, IV) {
    const K = createHash('sha512').update(secret).digest();
    const Ke = K.slice(0, 32); // Encryption
    const Km = K.slice(32); // MAC
    if(IV == null) {
        IV = randomBytes(16);
    } else {
        if(IV.length !== 16) {
            throw new TypeError('IV must be 16 bytes');
        }
    }

    // Cipher performs PKCS#5 padded automatically
    const cipher = crypto.createCipheriv('aes-256-cbc', Ke, IV);
    const C = Buffer.concat([cipher.update(message), cipher.final()]);
    // Include in the HMAC input everything that impacts the decryption
    const M = createHmac('sha256', Km).update(Buffer.concat([IV, C])).digest(); // AuthTag

    return Buffer.concat([IV, C, M]);
}

/**
    Provides AES-256-CBC message authentication then decryption.

    @arg {Buffer} secret - See PrivateKey.getSharedSecret()
    @arg {Buffer} message - ciphertext (from checkEncrypt)

    @throws {Error} decrypt failed
*/
function checkDecrypt(secret, message) {
    const K = createHash('sha512').update(secret).digest();
    const Ke = K.slice(0, 32); // Encryption
    const Km = K.slice(32); // MAC
    const IV = message.slice(0, 16);
    const C = message.slice(16, message.length - 32);
    const M = message.slice(message.length - 32);

    // Side-channel attack protection: First verify the HMAC, then and only then proceed to the decryption step
    const Mc = createHmac('sha256', Km).update(Buffer.concat([IV, C])).digest();

    if(Buffer.compare(M, Mc) !== 0) {
        throw new Error('decrypt failed');
    }

    // Cipher performs PKCS#5 padded automatically
    const cipher = crypto.createDecipheriv('aes-256-cbc', Ke, IV);
    return Buffer.concat([cipher.update(C, 'binary'), cipher.final()]);
}

module.exports = {
  checkEncrypt,
  checkDecrypt
}
