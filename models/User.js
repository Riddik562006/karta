const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    exp: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    level: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'user',
        allowNull: false
    },
    token: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Зашифрованный токен авторизации для сессий или API'
    }
}, {
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
            // Генерация стартового токена при регистрации
            const rawToken = require('crypto').randomBytes(32).toString('hex');
            user.token = await bcrypt.hash(rawToken, 10);
        }
    }
});

// Helper to check password
User.prototype.validPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = User;
