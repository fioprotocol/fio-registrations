const crypto = require('crypto')

// Up to 47 characters, at least 256 bits, troublesome characters removed
console.log(
  crypto.randomBytes(35).toString("base64").replace(/[\+\/=]/g, "")
)
