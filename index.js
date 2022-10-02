const { Telegraf, Scenes, Composer, session, Markup} = require('telegraf');
const { CallbackData } = require('@bot-base/callback-data');
const storybl = require('./modebl');
const storylin = require('./modelink');
const story = require ('./story');
const like = require ('./like');
const user = require ('./user');
const safety = require ('./safety');
const {DataTypes} = require('sequelize');
const sequelize = require('./db');
const { Op } = require("sequelize");
require ('dotenv').config();
const PORT = process.env.PORT || 3000;
const { BOT_TOKEN} = process.env;
const bot = new Telegraf(BOT_TOKEN);
const flagBtn = new CallbackData('flagBtn', ['number', 'action']);


if (BOT_TOKEN === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}

try {
  sequelize.authenticate()
  sequelize.sync({ force: true })
  console.log('Соединение с БД было успешно установлено.')
} catch (e) {
  console.log('Невозможно выполнить подключение к БД ', e)
}

story.hasMany(storybl);
story.hasMany(storylin);

bot.on('text', async (ctx, next) => {
  await safety(ctx.message.from.id, ctx.message.date, ctx.message.from.is_bot);
  const row = await user.findOne({where:{
    authId: ctx.message.from.id
  }})
  if (row.ban == true){
    await ctx.reply ('Вы забанены!')
  }
  else{
    await next()
  }
})
bot.on('callback_query', async (ctx, next) => {
  await safety(ctx.callbackQuery.from.id, ctx.callbackQuery.date, ctx.callbackQuery.from.is_bot);
  const row = await user.findOne({where:{
    authId: ctx.callbackQuery.from.id
  }})
  if (row.ban == true){
    await ctx.reply ('Вы забанены!')
  }
  else{
    await next()
  }
})

bot.start (async (ctx) =>{
  /*if (ctx.message.from.is_bot = true){
    await ctx.telegram.kickChatMember(ctx.chat.id, ctx.message.from.id)
  }*/
  const row = await user.findOne({where:{
    authId: ctx.message.from.id
  }})
  if (row === null){
  await ctx.reply(`Здравствуйте, ${ctx.message.from.first_name ? ctx.message.from.first_name : 'незнакомец'}!`)
  }
  else{
    await ctx.reply(
    `/create - создание истории;
    /addlink - добавление очередной ссылки;
    /addblock - добавление очередного блока;
    /simulate - симуляция истории;
    /edit - редактирование текста;
    /visualization - добавление картинок или эмодзи-кнопок;
    /delete - удаление истории, сюжетной ветви или картинок;
    /public - публикация истории.`)
  }
}
  )

const baseEmpty = new Composer()
baseEmpty.on ('text', async (ctx)=>{
  try {
    ctx.wizard.state.data = {};
    const count = await story.count({where: {
    authId: ctx.message.from.id, 
    release: false,
  }});
  if (count > 0) {
    await ctx.reply ('История уже создаётся!');
    return ctx.scene.leave()
  }
  await ctx.reply ('Введите название истории');
  } catch (e) {
  await ctx.reply ('⚠Ошибка!');
  return ctx.scene.leave()
  }
  return ctx.wizard.next()
})

const storyName = new Composer()
storyName.on ('text', async (ctx)=>{
  try{
  ctx.wizard.state.data.storyName = ctx.message.text;
  await ctx.reply ('Введите описание истории');
  }catch (e) {
    await ctx.reply ('⚠Ошибка!');
    return ctx.scene.leave()
    }
  return ctx.wizard.next()
})

const storyDesc = new Composer()
storyDesc.on ('text', async (ctx)=>{
  try{
  ctx.wizard.state.data.storyDesc = ctx.message.text;
  await ctx.reply ('Введите текст открывающего блока (блок, за которым последует первый выбор).');
}catch (e) {
  await ctx.reply ('⚠Ошибка!');
  return ctx.scene.leave()
  }
  return ctx.wizard.next()
})

const baseSave = new Composer()
baseSave.on ('text', async (ctx)=>{
  ctx.wizard.state.data.baseSave = ctx.message.text;

  const t = await sequelize.transaction();
  try{
  const res = await sequelize.transaction(async (t) => {
    const query = await story.create({
    name: `${ctx.wizard.state.data.storyName}`,
    desc: `${ctx.wizard.state.data.storyDesc}`,
    authId: ctx.message.from.id,
    release: false
  }, { transaction: t });
})
} catch (e) {
  await t.rollback();
  await ctx.reply ('⚠Ошибка!');
  return ctx.scene.leave()
}
const f = await sequelize.transaction();
try{
    const { count, rows } = await story.findAndCountAll({where: {
      authId: ctx.message.from.id,
      release: false}});
    let c = count - 1;
    const t = await sequelize.transaction();
    const result = await sequelize.transaction(async (f) => {
    const query = await storybl.create({
    linid: 0,
    bl: `${ctx.wizard.state.data.baseSave}`,
    authId: ctx.message.from.id,
    storyId: rows[c].id,
    release: false
  }, { transaction: f });
})
}catch(e){
  await f.rollback();
  await ctx.reply ('⚠Ошибка!');
  return ctx.scene.leave()
}

  await ctx.reply ('Вы успешно добавили первый блок своей будущей истории.');
  return ctx.scene.leave()
})
const menuCreate = new Scenes.WizardScene('sceneCreate', baseEmpty, storyName, storyDesc, baseSave)
const stage = new Scenes.Stage ([menuCreate])
bot.use(session())
bot.use(stage.middleware())
bot.command ('create', async (ctx) => ctx.scene.enter('sceneCreate'))








const blockBtn = new CallbackData('blockBtn', ['id', 'linid', 'storyid', 'action']);
const blockEmpty = new Composer()
blockEmpty.on ('text', async (ctx)=>{
ctx.wizard.state.data = {};
try{
  const { count, rows } = await storybl.findAndCountAll({where: {
    authId: ctx.message.from.id,
    release: false
  }});
  if (count <= 0) {
    await ctx.reply ('Требуется создать историю! 👉 /create');
    return ctx.scene.leave()
  }
  let x = count - 1;
  await ctx.reply ('Выберите блок, который будет предлагать ссылку.');
  for (let i=0; i<=x; i++){
    await ctx.reply(`${rows[i].bl}`, Markup.inlineKeyboard(
      [
      [Markup.button.callback('👆', blockBtn.create({
        id: rows[i].id,
        linid: rows[i].linid,
        storyid: rows[i].storyId,
        action: 'blockchoice'
      }))]
    ]
    )
  )
  }
} catch (e){
  console.log(e);
  await ctx.replyWithHTML('⚠Ошибка!')
  return ctx.scene.leave() 
}
  return ctx.wizard.next()
})

const blockChoice = new Composer()
blockChoice.on ('callback_query', async (ctx)=>{
  try{
  const { id, linid, storyid, action} = blockBtn.parse(ctx.callbackQuery.data);
  if (action != 'blockchoice'){
    await ctx.answerCbQuery('⚠Ошибка! Начните заново');
    return ctx.scene.leave()
  }
  const row = await storybl.findOne({where: {
    id: id,
    linid: linid,
    storyId: storyid,
    authId: ctx.callbackQuery.from.id,
    release: false,
  }});
  if (row === null){
    await ctx.answerCbQuery('⚠Ошибка! Начните заново');
    return ctx.scene.leave()
  }
  ctx.wizard.state.data.blockChoice = id;
  await ctx.reply ('Введите текст ссылки.');
} catch(e){
  await ctx.answerCbQuery('⚠Ошибка!');
  return ctx.scene.leave()
}
  return ctx.wizard.next()
})

const blockLink = new Composer()
blockLink.on ('text', async (ctx)=>{
  try{
  ctx.wizard.state.data.blockLink = ctx.message.text;
  const {count, rows} = await storybl.findAndCountAll({where: {
    authId: ctx.message.from.id,
    release: false
  }});
  const t = await sequelize.transaction();
  try{
    const resul = await sequelize.transaction(async (t) => {
    const quer = await storylin.create({
    link: `${ctx.wizard.state.data.blockLink}`,
    authId: ctx.message.from.id,
    release: false,
    storyblId: `${ctx.wizard.state.data.blockChoice}`,
    storyId: `${rows[0].storyId}`
  }, { transaction: t });
})
await t.commit('commit');
} catch (error) {
  await ctx.reply ('⚠Ошибка! Попробуйте сначала.');
  await t.rollback();
  return ctx.scene.leave()
}
  await ctx.reply ('Вы успешно добавили ссылку.');
}catch(e){
  await ctx.reply ('⚠Ошибка! Попробуйте сначала.');
  return ctx.scene.leave()
}
  return ctx.scene.leave()
})

const menuLink = new Scenes.WizardScene('sceneLink', blockEmpty, blockChoice, blockLink)
const stagee = new Scenes.Stage ([menuLink])
bot.use(session())
bot.use(stagee.middleware())
bot.command ('addlink', async (ctx) => ctx.scene.enter('sceneLink'))









const linkBtn = new CallbackData('linkBtn', ['id', 'smile', 'storyblid', 'storyid', 'action']);
const linkEmpty = new Composer()
linkEmpty.on ('text', async (ctx)=>{
  try{
  ctx.wizard.state.data = {};
  const row = await story.findOne({where: {
    authId: ctx.message.from.id,
    release: false
  }});
  if (row === null) {
    await ctx.reply ('Требуется создать создать историю! 👉 /create');
    return ctx.scene.leave()
  }
  const { count, rows } = await storylin.findAndCountAll({where: {
    authId: ctx.message.from.id,
    release: false,
    storyId: row.id
  }});
  if (count < 1 || rows === null) {
    await ctx.reply ('Требуется создать ссылку! 👉 /addlink');
    return ctx.scene.leave()
  }
  await ctx.reply ('Выберите ссылку из доступных:');
    let x = count - 1;
    let p = 0;
    for (let i=0; i<=x; i++){
      console.log(rows[i].id);
      const ro = await storybl.findOne({where:{
        linid: rows[i].id,
        authId: ctx.message.from.id,
        release: false
      }})
      if (ro === null){
      await ctx.reply(`${rows[i].link}`, Markup.inlineKeyboard(
        [
        [Markup.button.callback(`${rows[i].smile}`, linkBtn.create({
          id: rows[i].id,
          smile: rows[i].smile,
          storyblid: rows[i].storyblId,
          storyid: rows[i].storyId,
          action: 'linkchoice'
        }))]
          ]
          )
        )
        p++
      }
      let l = i + 1;
      if (l > x && p < 1){
        await ctx.reply ('⚠Доступных ссылок нет!');
        return ctx.scene.leave()
      }
    }
  } catch (e){
    console.log(e);
    await ctx.replyWithHTML('Ошибка!')
  }
  return ctx.wizard.next()
})

const linkChoice = new Composer()
linkChoice.on ('callback_query', async (ctx)=>{
  try{
  const { id, smile, storyblid, storyid, action} = linkBtn.parse(ctx.callbackQuery.data);
  if (action != 'linkchoice'){
    await ctx.answerCbQuery('⚠Ошибка! Начните заново');
    return ctx.scene.leave()
  }
    const row = await storylin.findOne({where:{
      id: id,
      smile: smile,
      storyblId: storyblid,
      storyId: storyid,
      release: false,
      authId: ctx.callbackQuery.from.id
    }})
    if (row === null){
      await ctx.answerCbQuery('⚠Ошибка! Начните заново');
      return ctx.scene.leave()
    }
  const count = await storybl.count({where: {
    linid: id,
    authId: ctx.callbackQuery.from.id,
    release: false,
    storyId: storyid
  }});
  if (count > 0){
    await ctx.answerCbQuery('⚠Ошибка!')
    return ctx.scene.leave()
  }
  ctx.wizard.state.data.linkChoice = id;
  await ctx.reply('Введите текст блока.');
} catch(e){
  await ctx.answerCbQuery('Произошла ошибка!')
  return ctx.scene.leave()
}
  return ctx.wizard.next()
})

const linkBlock = new Composer()
linkBlock.on ('text', async (ctx)=>{
  ctx.wizard.state.data.linkBlock = ctx.message.text;
  const t = await sequelize.transaction();
  try{
  const row = await story.findOne({where: {
    authId: ctx.message.from.id,
    release: false
  }});
    const resul = await sequelize.transaction(async (t) => {
    const quer = await storybl.create({
    linid: ctx.wizard.state.data.linkChoice,
    bl: `${ctx.wizard.state.data.linkBlock}`,
    authId: ctx.message.from.id,
    release: false,
    storyId: row.id,
  }, { transaction: t });
})
await t.commit('commit');
} catch (error) {
  await ctx.reply ('Ошибка! Пожалуйста попробуйте сначала.');
  await t.rollback();
  return ctx.scene.leave()
}
  await ctx.reply ('Вы успешно добавили блок.');
  return ctx.scene.leave()
})

const menuBlock = new Scenes.WizardScene('sceneBlock', linkEmpty, linkChoice, linkBlock)
const stager = new Scenes.Stage ([menuBlock])
bot.use(session())
bot.use(stager.middleware())
bot.command ('addblock', async (ctx) => ctx.scene.enter('sceneBlock'))







const playBtn = new CallbackData('playBtn', ['number', 'action']);
const playScene = new Composer()
playScene.on('text', async (ctx) => {
  ctx.wizard.state.data = {};
  try{
    const row = await story.findOne({where: {
      authId: ctx.message.from.id,
      release: false
    }});
    if (row===null){
      await ctx.reply('Вы не добавили ни одной истории!')
      return ctx.scene.leave()
    }
    if (row.pic != null) await ctx.replyWithPhoto({ url: `${row.pic}` }, { caption: `🎫 ${row.name}`});
    else  await ctx.reply(`🎫 ${row.name}`);
    await ctx.reply (`📖 ${row.desc}`)
    await ctx.reply('Начать читать?', Markup.inlineKeyboard(
      [
      [Markup.button.callback('👆', playBtn.create({
        number: 0,
        action: 'play'}))]
    ]))
  } catch (e){
    await ctx.reply('⚠Ошибка!')
    return ctx.scene.leave()
}
return ctx.wizard.next()
})


const playMech = new Composer()
playMech.on('callback_query', async (ctx) => {
  try{
    const { number, action } = playBtn.parse(ctx.callbackQuery.data);
    if (action != 'play'){
      await ctx.answerCbQuery('⚠Ошибка!');
      return ctx.scene.leave()
    }
  await ctx.answerCbQuery('Выбор сделан');
  ctx.wizard.state.data.playMech = number;
  const ro = await story.findOne({where: {
    authId: ctx.callbackQuery.from.id,
    release: false
  }});
  const row = await storybl.findOne({where: {
    linid: ctx.wizard.state.data.playMech,
    storyId: ro.id,
    authId: ctx.callbackQuery.from.id,
    release: false
  }
});
if (row.pic != null) {
  let res = await ctx.replyWithPhoto({ url: `${row.pic}` }, { caption: `${row.bl}`});
}
else {
  let res = await ctx.reply(`${row.bl}`);
}
  const {count, rows} = await storylin.findAndCountAll ({where: {
    authId: ctx.callbackQuery.from.id,
    release: false,
    storyblId: row.id
  }});
  if (count < 1) {
    await ctx.reply('Вы завершили прохождение истории!');
    return ctx.scene.leave()
  }

  let x = count - 1;
  for (let i = 0; i <= x; i++){
    await ctx.reply(`${rows[i].link}`, Markup.inlineKeyboard(
      [
      [Markup.button.callback(`${rows[i].smile}`, playBtn.create({
        number: rows[i].id,
        action: 'play'}))]
    ]
    )
  )
  }
} catch(e){
  await ctx.answerCbQuery('⚠Ошибка!');
  await ctx.reply('Вы завершили прохождение истории!');
  return ctx.scene.leave()
}
return ctx.wizard.selectStep(1)
})

const playmenuScene = new Scenes.WizardScene('playScene', playScene, playMech)
const staget = new Scenes.Stage([playmenuScene])
bot.use(session())
bot.use(staget.middleware())
bot.command('simulate', async (ctx) => ctx.scene.enter('playScene'))






const deletelinkBtn = new CallbackData('deletelinkBtn', ['number', 'smile', 'action']);
const deleteScene = new Scenes.BaseScene('delete')
deleteScene.enter(async (ctx) => {
  try{
  ctx.session.myData = {};
  ctx.reply('Выберите вид удаляемого элемента:', Markup.inlineKeyboard(
    [
    [Markup.button.callback('История', 'Story')], 
    [Markup.button.callback('Сюжетная ветка', 'Branch')],
    [Markup.button.callback('Картинка блока', 'Pic')],
    [Markup.button.callback('Обложка', 'Avatar')],
  ]))
}
catch(e){
  await ctx.reply('⚠Ошибка!');
  return ctx.scene.leave();
}
});

deleteScene.action('Story', async (ctx) => {
  try{
  ctx.session.myData.preferenceType = 'Story';
  const row = await story.findOne({where:{
    authId: ctx.callbackQuery.from.id,
    release: false
  }})
  if (row === null) {
    await ctx.answerCbQuery('Для этой функции треубется создать историю!⚠');
    return ctx.scene.leave();
  }
  await story.destroy({
    where: {
      authId: ctx.callbackQuery.from.id,
      release: false
    }
  });
  await storybl.destroy({
    where: {
      authId: ctx.callbackQuery.from.id,
      release: false
    }
  });
  await storylin.destroy({
    where: {
      authId: ctx.callbackQuery.from.id,
      release: false
    }
  });
  await ctx.answerCbQuery('Создаваемая история была успешна удалена.');
}catch(e){
  await ctx.answerCbQuery('⚠Ошибка!');
  return ctx.scene.leave();
}
  return ctx.scene.leave();
});

deleteScene.action('Branch', async (ctx) => {
  try{
  ctx.session.myData.preferenceType = 'Branch';
    const row = await story.findOne({where: {
      authId: ctx.callbackQuery.from.id,
      release: false
    }});
    if (row === null) {
      await ctx.answerCbQuery('⚠Для этой функции требуется создать историю!');
      return ctx.scene.leave();
    }
    const { count, rows } = await storylin.findAndCountAll({where: {storyId: row.id}});
    if (count < 1) {
      await ctx.answerCbQuery('⚠Требуется больше ссылок!');
      return ctx.scene.leave();
    }
    await ctx.reply ('Выберите ссылку, после которой требуется удалить контент (включая ссылку):');
      let x = count - 1;
      for (let i=0; i<=x; i++){
        await ctx.reply(`${rows[i].link}`, Markup.inlineKeyboard(
          [
          [Markup.button.callback(`${rows[i].smile}❌`, deletelinkBtn.create({
            number: rows[i].id,
            smile: rows[i].smile,
            action: 'deletelink'}))]
        ]
        )
      )
      }
    } catch (e){
      await ctx.answerCbQuery('⚠Ошибка!')
      return ctx.scene.leave();
    }
});

deleteScene.action(deletelinkBtn.filter({action: 'deletelink'}), async (ctx) => {
  await ctx.answerCbQuery()
  try{
  const { number, smile, action } = deletelinkBtn.parse(ctx.callbackQuery.data);
  console.log(number);
  ctx.session.myData.preferenceType = number;
  /*const row = await story.findOne({where: {
    authId: ctx.callbackQuery.from.id,
    release: false,
  }})*/
  const row = await storylin.findOne({where:{
    id: number,
    smile: smile,
    authId: ctx.callbackQuery.from.id,
    release: false,
  }})
  if (row === null){
    await ctx.answerCbQuery('⚠Ошибка!')
    return ctx.scene.leave();
  }
  await storylin.destroy({ 
    where: { 
    id: ctx.session.myData.preferenceType,
    authId: ctx.callbackQuery.from.id,
    release: false,
    //storyId: row.id
}
})
  await storybl.destroy({ 
    where: { 
    linid: ctx.session.myData.preferenceType,
    authId: ctx.callbackQuery.from.id,
    release: false,
    //storyId: row.id
}
});

for (; ;){
  const {count, rows} = await storylin.findAndCountAll({where: {
    authId: ctx.callbackQuery.from.id,
    release: false,
    storyblId: null,
    //storyId: row.id
  }})
  if (count<1){
    break
  }
  let x = count - 1;
  for (let i=0; i<=x; i++){
  await storybl.destroy({
    where:{
      linid: rows[i].id,
      authId: ctx.callbackQuery.from.id,
      release: false
      }
    })
    await storylin.destroy({
      where:{
        id: rows[i].id,
        authId: ctx.callbackQuery.from.id,
        release: false
      }
    })
    }
  }
  await ctx.answerCbQuery('Ветка удалена.');
} catch(e){
  await ctx.answerCbQuery('⚠Ошибка!')
  return ctx.scene.leave();
}
  return ctx.scene.leave();
})

deleteScene.action('Pic', async (ctx) => {
  try{
  ctx.session.myData.preferenceType = 'Pic';
    const row = await story.findOne({where: {
      authId: ctx.callbackQuery.from.id,
      release: false
    }});
    if (row === null) {
      await ctx.answerCbQuery('Для этой функции требуется создать историю!⚠');
      return ctx.scene.leave();
    }
    const { count, rows } = await storybl.findAndCountAll({where: {
      storyId: row.id,
      authId: ctx.callbackQuery.from.id,
      release: false,
      pic: {[Op.not]: null}
    }});
    if (count < 1) {
      await ctx.answerCbQuery('Для этой функции требуется добавить минимум одну картинку к блоку!⚠');
      return ctx.scene.leave();
    }
    await ctx.reply ('Выберите блок, картинку которого требуется удалить:');
      let x = count - 1;
      for (let i=0; i<=x; i++){
        await ctx.reply(`${rows[i].bl}`, Markup.inlineKeyboard(
          [
          [Markup.button.callback('🌆❌', flagBtn.create({
            number: rows[i].id,
            action: 'deleteblockpic'}))]
        ]
        )
      )
      }
    } catch (e){
      await ctx.answerCbQuery('⚠Ошибка!')
      return ctx.scene.leave();
    }
});

deleteScene.action(flagBtn.filter({action: 'deleteblockpic'}), async (ctx) => {
  try{
  const { number, action } = flagBtn.parse(ctx.callbackQuery.data);
  console.log(number);
  const row = await storybl.findOne({where:{
    id: number,
    authId: ctx.callbackQuery.from.id,
    release: false
  }})
  if (row === null){
    await ctx.answerCbQuery('⚠Ошибка!')
    return ctx.scene.leave();
  }
  ctx.session.myData.preferenceType = number;
    await storybl.update({ pic: null }, {
      where: {
        id: `${number}`,
        authId: ctx.callbackQuery.from.id,
        release: false,
      }
    });
    await ctx.answerCbQuery('Картинка выбранного блока была удалена.');
    }catch(e){
    await ctx.answerCbQuery('⚠Ошибка!')
    return ctx.scene.leave();
  }
      return ctx.scene.leave();
  })


  deleteScene.action('Avatar', async (ctx) => {
    try{
    ctx.session.myData.preferenceType = 'Avatar';
    const row = await story.findOne({where: {
      authId: ctx.callbackQuery.from.id,
      release: false
    }});
    if (row === null) {
      await ctx.answerCbQuery('⚠Для этой функции требуется создать историю!');
      return ctx.scene.leave();
    }
    if (row.pic === null) {
      await ctx.answerCbQuery('⚠Для этой функции требуется добавить обложку!');
      return ctx.scene.leave();
    }
    await story.update ({pic: null},{
      where:{
        authId: ctx.callbackQuery.from.id,
        release: false,
      }
    })
    await ctx.answerCbQuery('Обложка истории была удалена.');
  } catch(e){
    await ctx.answerCbQuery('⚠Ошибка!');
    return ctx.scene.leave();
  }
    return ctx.scene.leave();
  });

deleteScene.leave(async (ctx) => {
  try{
  await ctx.reply('Операция успешно завершена.');
  }catch(e){
    await ctx.reply('⚠Ошибка!')
    return ctx.scene.leave();
  }
});
deleteScene.use(async (ctx) =>{ 
await ctx.answerCbQuery('⚠Ошибка!')
return ctx.scene.leave()});

const staged = new Scenes.Stage([deleteScene])
bot.use(session())
bot.use(staged.middleware())
bot.command('delete', (ctx) => ctx.scene.enter('delete'))






const editBtn = new CallbackData('editBtn', ['number', 'action']);
const editChoice = new Composer()
editChoice.on ('text', async (ctx)=>{
  try{
  ctx.wizard.state.data = {};
  await ctx.reply('Выберите вид редактируемого элемента:', Markup.inlineKeyboard(
    [
    [Markup.button.callback('Название', editBtn.create({
      number: '1',
      action: 'edit'})), 
      Markup.button.callback('Описание', editBtn.create({
        number: '2',
        action: 'edit'})
        )],
    [Markup.button.callback('Блок', editBtn.create({
      number: '3',
      action: 'edit'})), 
      Markup.button.callback('Ссылка', editBtn.create({
        number: '4',
        action: 'edit'}))]
  ]))
} catch(e){
  await ctx.reply('⚠Ошибка!');
  return ctx.scene.leave();
}
  return ctx.wizard.next()
})

const editChoiceTrue = new Composer()
  editChoiceTrue.on ('callback_query', async (ctx)=>{
  try{
  const { number, action } = editBtn.parse(ctx.callbackQuery.data);
  if (action != 'edit'){
    await ctx.answerCbQuery('⚠Ошибка!');
    return ctx.scene.leave()
  }
  ctx.wizard.state.data.editChoiceTrue = number;
  switch (ctx.wizard.state.data.editChoiceTrue) {
    case '1':
       const row = await story.findOne({where:{
        authId: ctx.callbackQuery.from.id,
        release: false,
      }});
      if (row === null) {
        await ctx.answerCbQuery('⚠Требуется создать историю!');
        return ctx.scene.leave();
      }
      await ctx.reply('Введите новое название')
      ctx.wizard.selectStep(2)
      break;
    case '2':
      try{
      const row = await story.findOne({where:{
          authId: ctx.callbackQuery.from.id,
          release: false,
      }});
      if (row === null) {
        await ctx.answerCbQuery('⚠Требуется создать историю!');
        return ctx.scene.leave();
      }
      await ctx.reply('Введите новое описание')
      ctx.wizard.selectStep(3)
    } catch(e){
      await ctx.answerCbQuery('⚠Ошибка!')
      return ctx.scene.leave()
    }
      break;
    case '3':
      try{
        const { count, rows } = await storybl.findAndCountAll({where: {
          authId: ctx.callbackQuery.from.id,
          release: false
        }});
      if (rows === null || count < 1) {
        await ctx.answerCbQuery('⚠Требуется больше блоков!');
        return ctx.scene.leave();
      }
      await ctx.reply('Выберите блок, который требуется отредактровать:')
        let x = count - 1;
        for (let i=0; i<=x; i++){
          await ctx.reply(`${rows[i].bl}`, Markup.inlineKeyboard(
            [
            [Markup.button.callback('👆', editBtn.create({
              number: rows[i].id,
              action: 'editblock'}))]
          ]
          )
        )
        }
      } catch (e){
        console.log(e);
        await ctx.replyWithHTML('<i>Ошибка!</i>')
      }
      ctx.wizard.selectStep(4)
      break;
    case '4':
      const { count, rows } = await storylin.findAndCountAll({where: {
        authId: ctx.callbackQuery.from.id,
      release: false}});
      if (count < 1) {
        await ctx.answerCbQuery('Требуется больше ссылок! 👉 /addlink');
        return ctx.scene.leave()
      }
      await ctx.reply('Выберите ссылку, которую требуется отредактровать:');
          let x = count - 1;
          for (let i=0; i<=x; i++){
            await ctx.reply(`${rows[i].link}`, Markup.inlineKeyboard(
              [
              [Markup.button.callback(`${rows[i].smile}`, editBtn.create({
                number: rows[i].id,
                action: 'editlink'}))]
                  ]
                )
              )
          }
      ctx.wizard.selectStep(6)
      break;
  }}
catch(e){
  await ctx.answerCbQuery('⚠Ошибка!')
  return ctx.scene.leave()
}
})
const editStory = new Composer()
editStory.on ('text', async (ctx)=>{
  try{
  ctx.wizard.state.data.editStory = ctx.message.text;
  await story.update({ name: `${ctx.wizard.state.data.editStory}` }, {
    where: {
      authId: ctx.message.from.id,
      release: false,
    }
  });
  await ctx.reply('Название создаваемой истории отредактировано.')
}catch(e){
  await ctx.reply('⚠Ошибка!')
  return ctx.scene.leave()
}
return ctx.scene.leave()
  })

  const editDesc = new Composer()
  editDesc.on ('text', async (ctx)=>{
    try{
    ctx.wizard.state.data.editDesc = ctx.message.text;
    await story.update({ desc: `${ctx.wizard.state.data.editDesc}` }, {
    where: {
      authId: ctx.message.from.id,
      release: false,
    }
  });
  await ctx.reply('Описание создаваемой истории отредактировано.')
} catch(e){
  await ctx.reply('⚠Ошибка!')
  return ctx.scene.leave()
}
  return ctx.scene.leave()
  })

  const editBlock = new Composer()
  editBlock.on ('callback_query', async (ctx)=>{
    try{
  const { number, action } = editBtn.parse(ctx.callbackQuery.data);
  if (action != 'editblock'){
    await ctx.answerCbQuery('⚠Ошибка!')
    return ctx.scene.leave()
  }
  const row = await storybl.findOne({where:{
    id: number,
    authId: ctx.callbackQuery.from.id,
    release: false
  }})
  if (row === null){
    await ctx.answerCbQuery('⚠Ошибка!')
    return ctx.scene.leave()
  }
  ctx.wizard.state.data.editBlock = number;
  await ctx.reply('Введите текст блока.')
    }catch(e){
    await ctx.reply('⚠Ошибка!')
    return ctx.scene.leave()
    }
  return ctx.wizard.next()
  })

  const editBlockTrue = new Composer()
  editBlockTrue.on ('text', async (ctx)=>{
    try{
  ctx.wizard.state.data.editBlockTrue = ctx.message.text;
  await storybl.update({ bl: `${ctx.wizard.state.data.editBlockTrue}` }, {
    where: {
      id: ctx.wizard.state.data.editBlock,
      authId: ctx.message.from.id,
      release: false,
    }
  });
  await ctx.reply('Один из блоков создаваемой истории был отредактирован.')
}catch(e){
  await ctx.reply('⚠Ошибка!')
  return ctx.scene.leave()
}
  return ctx.scene.leave()
  })

  const editLink = new Composer()
  editLink.on ('callback_query', async (ctx)=>{
    try{
      const { number, action } = editBtn.parse(ctx.callbackQuery.data);
      if (action != 'editlink'){
        await ctx.answerCbQuery('⚠Ошибка!')
        return ctx.scene.leave()
      }
      const row = await storylin.findOne({where:{
        id: number,
        authId: ctx.callbackQuery.from.id,
        release: false
      }})
      if (row === null) {
        await ctx.answerCbQuery('⚠Ошибка!')
        return ctx.scene.leave()
      }
      ctx.wizard.state.data.editLink = number;
      await ctx.reply('Введите текст ссылки.')
    } catch (e){
      await ctx.answerCbQuery('Ошибка!')
      return ctx.scene.leave()
    }
    return ctx.wizard.next()
  })

  const editLinkTrue = new Composer()
  editLinkTrue.on ('text', async (ctx)=>{
  try{
    ctx.wizard.state.data.editLinkTrue = ctx.message.text;
    await storylin.update({ link: `${ctx.wizard.state.data.editLinkTrue}` }, {
      where: {
        id: ctx.wizard.state.data.editLink,
        authId: ctx.message.from.id,
        release: false,
      }
    });
    await ctx.reply('Одна из ссылок создаваемой истории была отредактирована.')
    } catch (e){
      await ctx.reply('Ошибка!')
      return ctx.scene.leave()
    }
  return ctx.scene.leave()
  })

const menuEdit = new Scenes.WizardScene('editScene', editChoice, editChoiceTrue, editStory, editDesc, editBlock, editBlockTrue, editLink, editLinkTrue)
const stageu = new Scenes.Stage ([menuEdit])
bot.use(session())
bot.use(stageu.middleware())
bot.command ('edit', async (ctx) => ctx.scene.enter('editScene'))









const sceneVisualization = new Composer()
sceneVisualization.on ('text', async (ctx)=>{
ctx.wizard.state.data = {};
try{
  await ctx.reply('Выберите, что требуется добавить:', Markup.inlineKeyboard(
    [
    [Markup.button.callback('Картинки к блокам', flagBtn.create({
      number: '1',
      action: 'vis'}))], 
    [Markup.button.callback('Настраиваемые символы к ссылкам', flagBtn.create({
      number: '2',
      action: 'vis'})
      )],
    [Markup.button.callback('Обложка истории', flagBtn.create({
      number: '3',
      action: 'vis'})
      )]
  ]))
} catch (e){
  console.log(e);
  await ctx.replyWithHTML('⚠Ошибка!')
  return ctx.scene.leave()
}
  return ctx.wizard.next()
})

const sceneVisualizationChoice = new Composer()
sceneVisualizationChoice.on ('callback_query', async (ctx)=>{
  try{
    const { number, action } = flagBtn.parse(ctx.callbackQuery.data);
    if (action != 'vis'){
      await ctx.answerCbQuery('⚠Ошибка!')
      return ctx.scene.leave()
    }
ctx.wizard.state.data.sceneVisualizationChoice = number;
switch (ctx.wizard.state.data.sceneVisualizationChoice) {
  case '1':
    try{
    const { count, rows } = await storybl.findAndCountAll({where: {
      authId: ctx.callbackQuery.from.id,
      release: false
    }});
    if (count <= 0) {
      await ctx.answerCbQuery('Требуется создать историю! 👉 /create');
      return ctx.scene.leave()
    }
    let x = count - 1;
    await ctx.reply('Выберите блок, к которому хотите добавить картинку:')
    for (let i=0; i<=x; i++){
      await ctx.reply(`${rows[i].bl}`, Markup.inlineKeyboard(
        [
        [Markup.button.callback('👆', flagBtn.create({
          number: `${rows[i].id}`,
          action: 'setblockpic'}))]
      ]
      )
    )
    }
    return ctx.wizard.selectStep(2)
    break;
  } catch (e){
    console.log(e);
    await ctx.replyWithHTML('<i>Ошибка!</i>⚠')
    return ctx.scene.leave()
  }
  case '2':
    try{
    const { count, rows } = await storylin.findAndCountAll({where: {
      authId: ctx.callbackQuery.from.id,
      release: false,
    }});
    if (count <= 0) {
      await ctx.answerCbQuery('Для выполнения требуется минимум одна ссылка! 👉 /addlink');
      return ctx.scene.leave()
    }
    let y = count - 1;
    await ctx.reply('Выберите ссылку, символ которой требуется заменить:')
    for (let o=0; o<=y; o++){
      await ctx.reply(`${rows[o].link}`, Markup.inlineKeyboard(
        [
        [Markup.button.callback(`${rows[o].smile}`, flagBtn.create({
          number: `${rows[o].id}`,
          action: 'smilechoice'}))]
      ]
      )
    )
    }
    return ctx.wizard.selectStep(4)
    break;
  } catch (e){
    console.log(e);
    await ctx.answerCbQuery('⚠Ошибка!')
    return ctx.scene.leave()
  }
    case '3':
      try{
      const row = await story.findOne({where: {
        authId: ctx.callbackQuery.from.id,
        release: false
      }});
      if (row === null) {
        await ctx.answerCbQuery('Требуется создать историю! 👉 /create');
        return ctx.scene.leave()
      }
      await ctx.reply('Вставьте ссылку на картинку.')
      return ctx.wizard.selectStep(6)
      break;
      } catch (e){
        console.log(e);
        await ctx.answerCbQuery('⚠Ошибка!')
        return ctx.scene.leave()
      }
}
}catch (e){
  console.log(e);
  await ctx.answerCbQuery('⚠Ошибка!')
  return ctx.scene.leave()
}
  return ctx.scene.leave()
})

const setBlockPic = new Composer()
setBlockPic.on ('callback_query', async (ctx)=>{
try{
const { number, action } = flagBtn.parse(ctx.callbackQuery.data);
if (action != 'setblockpic') {
  await ctx.answerCbQuery('⚠Ошибка!')
  return ctx.scene.leave()
}
const row = await storybl.findOne({where:{
  id: number,
  authId: ctx.callbackQuery.from.id,
  release: false
}})
if (row === null){
  await ctx.answerCbQuery('⚠Ошибка!')
  return ctx.scene.leave()
}
ctx.wizard.state.data.setBlockPic = number;
await ctx.reply('Вставьте ссылку на картинку.')
} catch (e){
  console.log(e);
  await ctx.answerCbQuery('⚠Ошибка!')
  return ctx.scene.leave()
}
  return ctx.wizard.next()
})

const setBlockPicTrue = new Composer()
setBlockPicTrue.on ('text', async (ctx)=>{
try{
ctx.wizard.state.data.setBlockPicTrue = ctx.message.text;
try{
 const row = await storybl.findOne ({where:{
  id: `${ctx.wizard.state.data.setBlockPic}`,
  authId: ctx.message.from.id,
  release: false,
}})
let testpost = await ctx.replyWithPhoto({ url: `${ctx.wizard.state.data.setBlockPicTrue}` }, { caption: `${row.bl}`});
let res = await ctx.telegram.deleteMessage(ctx.chat.id, testpost.message_id);
} catch(e){
  await ctx.reply('⚠Ошибка!')
  return ctx.scene.leave()
}
await storybl.update({ pic: `${ctx.wizard.state.data.setBlockPicTrue}` }, {
  where: {
    id: `${ctx.wizard.state.data.setBlockPic}`,
    authId: ctx.message.from.id,
    release: false,
  }
});
} catch (e){
  console.log(e);
  await ctx.reply('⚠Ошибка!')
  return ctx.scene.leave()
}
  await ctx.reply('Картинка успешно добавлена.')
  return ctx.scene.leave()
})

const setLinkSmile = new Composer()
setLinkSmile.on ('callback_query', async (ctx)=>{
try{
const { number, action } = flagBtn.parse(ctx.callbackQuery.data);
if (action != 'smilechoice'){
  await ctx.answerCbQuery('⚠Ошибка!')
  return ctx.scene.leave()
}
const row = await storylin.findOne({where:{
  id: number,
  authId: ctx.callbackQuery.from.id,
  release: false
}})
if (row === null){
  await ctx.answerCbQuery('⚠Ошибка!')
  return ctx.scene.leave()
}
ctx.wizard.state.data.setLinkSmile = number;
await ctx.reply('Введите предпочитаемый символ.')
} catch (e){
  console.log(e);
  await ctx.answerCbQuery('⚠Ошибка!')
  return ctx.scene.leave()
}
  return ctx.wizard.next()
})

const setLinkSmileTrue = new Composer()
setLinkSmileTrue.on ('text', async (ctx)=>{
try{
ctx.wizard.state.data.setLinkSmileTrue = ctx.message.text;
await storylin.update({ smile: `${ctx.wizard.state.data.setLinkSmileTrue}` }, {
  where: {
    id: `${ctx.wizard.state.data.setLinkSmile}`,
    authId: ctx.message.from.id,
    release: false,
  }
});
} catch (e){
  console.log(e);
  await ctx.reply('⚠Ошибка!')
  return ctx.scene.leave()
}
await ctx.reply ('Символ-кнопка успешно обновлён.')
  return ctx.scene.leave()
})


const setStoryPic = new Composer()
setStoryPic.on ('text', async (ctx)=>{
try{
ctx.wizard.state.data.setStoryPic = ctx.message.text;
try{
  const row = await story.findOne({
    where: {
      authId: ctx.message.from.id,
      release: false,
    }})
let testpost = await ctx.replyWithPhoto({ url: `${ctx.wizard.state.data.setStoryPic}` }, { caption: `${row.name}`});
let res = await ctx.telegram.deleteMessage(ctx.chat.id, testpost.message_id);
} catch(e){
  await ctx.reply('⚠Ошибка!')
  return ctx.scene.leave()
}
await story.update({ pic: `${ctx.wizard.state.data.setStoryPic}` }, {
  where: {
    authId: ctx.message.from.id,
    release: false,
  }
});
} catch (e){
  console.log(e);
  await ctx.reply('⚠Ошибка!')
  return ctx.scene.leave()
}
  await ctx.reply ('Обложка успешно добавлена.')
  return ctx.scene.leave()
})


const menuVisualization = new Scenes.WizardScene('sceneVisualization', sceneVisualization, sceneVisualizationChoice, setBlockPic, setBlockPicTrue, setLinkSmile, setLinkSmileTrue, setStoryPic)
const stagev = new Scenes.Stage ([menuVisualization])
bot.use(session())
bot.use(stagev.middleware())
bot.command ('visualization', async (ctx) => ctx.scene.enter('sceneVisualization'))




bot.command ('public', async (ctx) => {
  try{
  const {count, rows} = await storylin.findAndCountAll({where:{
    authId: ctx.message.from.id,
    release: false
  }})
  let p = 0;
  let x = count - 1;
  for (let i = 0; i<=x; i++){
    const block = await storybl.findOne({where:{
      linid: rows[i].id,
      authId: ctx.message.from.id,
      release: false
    }})
    if (block === null){
      await ctx.reply('⚠Ошибка! Не все сюжетные ветви кончаются блоками!')
      p = p + 1;
      return ctx.scene.leave()
    }
  }
  if (p<1){
    try{
      const row = await story.findOne({
        where: {
          authId: ctx.message.from.id,
          release: false,
        }})
  await story.update(
    { 
      release: true, 
      views: 0,
    }, {
    where: {
      authId: ctx.message.from.id,
      release: false,
    }})
    await storylin.update({ release: true }, {
      where: {
        authId: ctx.message.from.id,
        release: false,
      }
  });
  await storybl.update({ release: true }, {
    where: {
      authId: ctx.message.from.id,
      release: false,
    }
  });
  } catch (e) {
    await ctx.reply ('⚠Ошибка! Попробуйте сначала.');
  }
await ctx.reply('История опубликована')
  }
  }catch(e){
    await ctx.reply('⚠Ошибка!')
    return ctx.scene.leave()
  }
})




bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))