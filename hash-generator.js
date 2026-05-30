const bcrypt = require('bcryptjs');

const password = '12345';
const saltRounds = 10;

const hash = bcrypt.hashSync(password, saltRounds);
console.log('Хэш для пароля "' + password + '":');
console.log(hash);