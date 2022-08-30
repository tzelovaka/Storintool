const sequelize = require('./db')
const {DataTypes} = require('sequelize')

const story = sequelize.define ('story', {
    id: {type: DataTypes.BIGINT, primaryKey: true, unique: true, autoIncrement: true},
    views: {type: DataTypes.BIGINT, unique: false, allowNull: true, defaultValue: null},
    pic: {type: DataTypes.STRING, allowNull: true, defaultValue: null},
    name: {type: DataTypes.STRING},
    desc: {type: DataTypes.STRING},
    authId: {type: DataTypes.BIGINT, unique: false},
    release: {type: DataTypes.BOOLEAN, defaultValue: false}
})

module.exports = story;