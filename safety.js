const sequelize = require('./db')
const {DataTypes} = require('sequelize')
const { Telegraf, Scenes, Composer, session, Markup} = require('telegraf');
const user = require ('./user');
require ('dotenv').config();
const PORT = process.env.PORT || 3000;
const { BOT_TOKEN} = process.env;
const bot = new Telegraf(BOT_TOKEN);

module.exports = async function safety() {
    const row = await user.findOne({ //ищем юзера в таблице
        where:{
        authId: `${ctx.message.from.id}`
        }
      })
      if (row === null){ //если не находим его, то регистрируем
        const row = await user.create({
            authId: `${ctx.message.from.id}`,
            last_message_time: `${ctx.message.date}`,
        })}
        /*if (ctx.message.from.is_bot === true){
            //ставим галочку в таблице, что это бот и баним его
            const row = await user.update({
                isbot: true,
                ban: true
            }, {
                where: {
                authId: `${ctx.message.from.id}`
            }})
        }
      }else{//если юзер есть в таблице, то проверяем время его последнего сообщения с нынешним, если разница меньше 5 сек, то баним его на 30 сек
        let x = row.last_message_time - ctx.message.date;

      }*/
}