const sequelize = require('./db')
const {DataTypes} = require('sequelize')

const storyrate = sequelize.define ('storyrate', {
    id: {type: DataTypes.BIGINT, primaryKey: true, unique: true, autoIncrement: true},
    rating: {type: DataTypes.BIGINT, defaultValue: 0},
    view: {type: DataTypes.BIGINT, defaultValue: 0},
})

module.exports = storyrate;