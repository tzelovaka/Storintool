const sequelize = require('./db')
const {DataTypes} = require('sequelize')

const user = sequelize.define ('user', {
    authId: {type: DataTypes.BIGINT, unique: false},
    last_message_time: {type: DataTypes.BIGINT},
    count: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, unique: false},
    isbot: {type: DataTypes.BOOLEAN, defaultValue: false},
    ban: {type: DataTypes.BOOLEAN, defaultValue: false}
})

module.exports = user;