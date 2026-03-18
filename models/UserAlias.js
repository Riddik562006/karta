const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const UserAlias = sequelize.define('UserAlias', {
    alias: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
});

User.hasMany(UserAlias, {
    foreignKey: {
        allowNull: false
    },
    onDelete: 'CASCADE'
});

UserAlias.belongsTo(User, {
    foreignKey: {
        allowNull: false
    }
});

module.exports = UserAlias;