const sequelize = require('./db')
const {DataTypes} = require('sequelize')

const user = sequelize.define ('user', {
    authId: {type: DataTypes.BIGINT, unique: false},
    isbot: {type: DataTypes.BOOLEAN},
    last_message_time: {type: DataTypes.TIME},
    ban: {type: DataTypes.BOOLEAN}
})

module.exports = user;