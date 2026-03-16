const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Place = require('./Place');

const Route = sequelize.define('Route', {
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
    image: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    duration: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    distance: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'walk', // walk, bike, car
    }
});

const RoutePlace = sequelize.define('RoutePlace', {
    order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    timestamps: false
});

// Relationships
Route.belongsToMany(Place, { through: RoutePlace, as: 'places' });
Place.belongsToMany(Route, { through: RoutePlace, as: 'routes' });

module.exports = { Route, RoutePlace };
