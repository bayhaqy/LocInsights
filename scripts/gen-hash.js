// One-shot script: generate bcrypt hash for the superadmin password
const bcrypt = require('bcryptjs')
const password = 'LockInsight@01!!'
const hash = bcrypt.hashSync(password, 10)
console.log('Password:', password)
console.log('Hash:    ', hash)
console.log('Verify:  ', bcrypt.compareSync(password, hash))
