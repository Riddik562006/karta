// Запуск: node db/make-admin.js <username>
// Пример:  node db/make-admin.js admin

const sequelize = require('./index');
const User = require('../models/User');

const username = process.argv[2];
if (!username) {
    console.error('Укажи имя пользователя: node db/make-admin.js <username>');
    process.exit(1);
}

sequelize.sync().then(async () => {
    const user = await User.findOne({ where: { username } });
    if (!user) {
        console.error(`Пользователь "${username}" не найден`);
        process.exit(1);
    }
    user.role = 'admin';
    await user.save();
    console.log(`✅ Пользователь "${username}" теперь администратор!`);
    process.exit(0);
});
