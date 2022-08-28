const sequelize = require('./db')
const {DataTypes} = require('sequelize')

const storyrate = sequelize.define ('storyrate', {
    id: {type: DataTypes.BIGINT, primaryKey: true, unique: true, autoIncrement: true},
    rating: {type: DataTypes.INTEGER(1), allowNull: true, defaultValue: null},
    view: {type: DataTypes.BIGINT}
})

module.exports = storyrate;