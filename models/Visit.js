const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');
const Place = require('./Place');

const Visit = sequelize.define('Visit', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        description: 'Заметки пользователя о посещенном месте'
    },
    visitedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

// Связи таблиц (Это создаст 5-ю таблицу в БД, связанную с Пользователями и Местами)
// Таким образом мы связываем Users <-> Visits <-> Places
User.hasMany(Visit);
Visit.belongsTo(User);

Place.hasMany(Visit);
Visit.belongsTo(Place);

module.exports = Visit;
