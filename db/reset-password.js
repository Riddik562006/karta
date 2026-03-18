const sequelize = require('./index');
const User = require('../models/User');

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
    console.error('Использование: node db/reset-password.js <username> <newPassword>');
    process.exit(1);
}

sequelize.sync().then(async () => {
    const user = await User.findOne({ where: { username } });
    if (!user) {
        console.error(`Пользователь "${username}" не найден`);
        process.exit(1);
    }

    user.password = newPassword;
    await user.save();

    console.log(`Пароль пользователя "${username}" обновлён`);
    process.exit(0);
}).catch((error) => {
    console.error('Ошибка сброса пароля:', error.message);
    process.exit(1);
});