const sequelize = require('./db')
const storylin = require('./modelink')
const {DataTypes} = require('sequelize');

const storybl = sequelize.define ('storybl', {
    id: {type: DataTypes.INTEGER, primaryKey: true, unique: true, autoIncrement: true},
    linid: {type: DataTypes.INTEGER, primaryKey: true, unique: true, null: true},
    bl: {type: DataTypes.STRING, allowNull: true},
})
storybl.hasMany(storylin);

module.exports = storybl;