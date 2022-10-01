const sequelize = require('./db')
const {DataTypes} = require('sequelize')
const { Telegraf, Scenes, Composer, session, Markup} = require('telegraf');
require ('dotenv').config();
const PORT = process.env.PORT || 3000;
const { BOT_TOKEN} = process.env;
const bot = new Telegraf(BOT_TOKEN);

module.exports = function safety() {
    console.log(SAFETY);
}