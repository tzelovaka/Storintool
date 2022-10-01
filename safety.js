const sequelize = require('./db')
const {DataTypes} = require('sequelize')

bot.help ((ctx) =>
  /*if (ctx.message.from.is_bot = true){
    await ctx.telegram.kickChatMember(ctx.chat.id, ctx.message.from.id)
  }*/
  ctx.reply(`Здравствуй, ${ctx.message.from.first_name ? ctx.message.from.first_name : 'незнакомец'}!`))


module.exports = safety;