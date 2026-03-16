const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Place = sequelize.define('Place', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    category: {
        // architecture | bridge | nature | history
        type: DataTypes.STRING,
        allowNull: false,
    },
    lat: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    lng: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Оренбург',
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true,
    },
});

module.exports = Place;
