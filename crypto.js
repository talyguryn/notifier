const crypto = require('crypto');

const algorithm = 'aes-256-ctr';
const password = config.password;

class Crypto {

  /**
   * Encrypt target string
   * @param {string} text
   * @return {IDBRequest | Promise<void> | void}
   */
  static encrypt(text) {
    let cipher = crypto.createCipher(algorithm, password);
    let crypted = cipher.update(text, 'utf8', 'hex');

    crypted += cipher.final('hex');
    return crypted;
  }

  /**
   * Decrypt target string
   * @param {string} text
   * @return {IDBRequest | Promise<void> | void}
   */
  static decrypt(text){
    let decipher = crypto.createDecipher(algorithm, password);
    let dec = decipher.update(text, 'hex', 'utf8');

    dec += decipher.final('utf8');
    return dec;
  }

}

module.exports = Crypto;
