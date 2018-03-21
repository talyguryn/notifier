global.config = require('./config');
const Crypto = require('./crypto');

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');


const botUpdatesUri = `/bot${config.token}`;

const bot = new TelegramBot(config.token);
const host = `https://${config.host}`;
bot.setWebHook(`${host}${botUpdatesUri}`);

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/** We are receiving updates at the route below! */
app.post(`${botUpdatesUri}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});


let sendMessage = async (chatId, message, options) => {
  /**
   * Throw error if message is empty
   */
  if (!message) {
    throw 'No message was passed';
  }

  /**
   * Try to send message
   */
  try {
    await bot.sendMessage(chatId, message, options);
  } catch (e) {
    let errorMessage = `Cannot send message to chat ${chatId} because of ${e}`;

    console.log(errorMessage);
    throw errorMessage;
  }
};


app.post(`/:id`, async (req, res) => {
  try {
    let chatId;

    /**
     * Try to decrypt chatId
     */
    try {
      chatId = Crypto.decrypt(req.params.id);
    } catch (e) {
      throw 'Bad chat identifier';
    }

    let body = req.body;

    let options = {
      parse_mode: body.parse_mode,
      disable_web_page_preview: body.disable_web_page_preview,
      disable_notification: body.disable_notification
    };

    await sendMessage(chatId, body.message, options);

    res.sendStatus(200);
  } catch(e) {
    console.log(e);
    res.status(400).send(e);
  }
});

/** Start Express Server */
app.listen(config.port, () => {
  console.log(`Express server is listening on ${config.port}`);
});


bot.onText(/\/start/, async msg => {
  try {
    let user_id = msg.chat.id;
    let encryptedId = Crypto.encrypt(user_id.toString());

    let hook = `${host}/${encryptedId}`;

    let chatId = msg.chat.id;
    let message = "Use this webhook to send messages:\n" +
                  "\n" +
                  `\`${hook}\`\n` +
                  "\n" +
                  "Send POST request with params:\n" +
                  "• `message` — text to send\n" +
                  "• `parse_mode` (default: null) — HTML or Markdown\n" +
                  "• `disable_web_page_preview` (default: false) — hide preview for links\n" +
                  "• `disable_notification` (default: false) — send message silently";
    let options = {
      parse_mode: 'Markdown'
    };

    await sendMessage(chatId, message, options);
    console.log(chatId, message);
  } catch (e) {
    console.log(e);
  }
});


