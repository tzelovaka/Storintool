const sequelize = require('./db')
const {DataTypes} = require('sequelize')

const like = sequelize.define ('like', {
    id: {type: DataTypes.BIGINT, primaryKey: true, unique: true, autoIncrement: true},
    authId: {type: DataTypes.BIGINT, unique: false},
})

module.exports = like;