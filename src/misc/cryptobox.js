const crypto = require('crypto')
class CryptoBox {
    constructor(secret, algo) {
        const crypto = require('crypto')
        const {SHA3} = require('sha3');

        this.algo = algo || 'aes-192-cbc'
        this.key = crypto.scryptSync(secret, 'salt', 24)
        this.iv = Buffer.alloc(16, 0)
        const hash = new SHA3(256);
        hash.update('foo');
        this.iv.fill(hash.digest())
    }

    cipher() {
        return crypto.createCipheriv(this.algo, this.key, this.iv);
    }

    encrypt(plain) {
        const cipher = this.cipher()
        let encrypted = cipher.update(plain, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted
    }

    decipher() {
        return crypto.createDecipheriv(this.algo, this.key, this.iv);
    }

    decrypt(encrypted) {
        const decipher = this.decipher()
        let plain = decipher.update(encrypted, 'hex');
        plain += decipher.final();
        return plain
    }

}
return module.exports = CryptoBox