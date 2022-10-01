const sequelize = require('./db')
const {DataTypes} = require('sequelize')

const user = sequelize.define ('user', {
    authId: {type: DataTypes.BIGINT, unique: false},
    last_message_time: {type: DataTypes.BIGINT},
    isbot: {type: DataTypes.BOOLEAN},
    ban: {type: DataTypes.BOOLEAN}
})

module.exports = user;