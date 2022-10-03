const sequelize = require('./db')
const {DataTypes} = require('sequelize')
const { Telegraf, Scenes, Composer, session, Markup} = require('telegraf');
const user = require ('./user');
require ('dotenv').config();
const PORT = process.env.PORT || 3000;
const { BOT_TOKEN} = process.env;
const bot = new Telegraf(BOT_TOKEN);

module.exports = async function safety(authId, lmt, isbot) {
    const row = await user.findOne({ 
        where:{
        authId: authId
        }
      })
      if (row === null){
        const row = await user.create({
            authId: authId,
            last_message_time: lmt,
        })
        await user.increment({ count: 1}, {
            where: {
                authId: authId
            }});
        if (isbot == true){
            const row = await user.update({
                isbot: true,
                ban: true
            }, {
                where: {
                authId: authId
            }})
      }
    }else{
        if (row.ban == false){
        const row = await user.findOne({
            where:{
            authId: authId
            }
          })
      await user.increment({ count: 1}, {
        where: {
            authId: authId
        }});

        if (row.count >= 12){
        let x = lmt - row.last_message_time;
        if (x <= 9){
        const row = await user.update({
            last_message_time: lmt,
            ban: true
        }, {
            where: {
            authId: authId
        }})
    }else{
        const rov = await user.update({
            last_message_time: lmt,
            count: 0
        }, {
            where: {
            authId: authId
        }})
    }
      }
    }
    }
}