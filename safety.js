const sequelize = require('./db')
const {DataTypes} = require('sequelize')
const { Telegraf, Scenes, Composer, session, Markup} = require('telegraf');
require ('dotenv').config();
const PORT = process.env.PORT || 3000;
const { BOT_TOKEN} = process.env;
const bot = new Telegraf(BOT_TOKEN);

const safety = bot.help ((ctx) =>
  /*if (ctx.message.from.is_bot = true){
    await ctx.telegram.kickChatMember(ctx.chat.id, ctx.message.from.id)
  }*/
  ctx.reply(`Здравствуй, ${ctx.message.from.first_name ? ctx.message.from.first_name : 'незнакомец'}!`))


module.exports = safety;