/** Make config available in whole project */
global.config = require('./config');

/** Load encrypt and decrypt function */
const Crypto = require('./crypto');

/** Prepare Telegram bot */
const TelegramBot = require('node-telegram-bot-api');
const botUpdatesUri = `/bot${config.token}`;
const bot = new TelegramBot(config.token);
const host = config.host;
bot.setWebHook(`${host}${botUpdatesUri}`);

/** Prepare local server */
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const multipart = require('connect-multiparty');
const multipartMiddleware = multipart();

/**
 * Enable urlencoded and multipart parsers
 */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(multipartMiddleware);

/** Enable pug */
app.set('view engine', 'pug');

/**
 * Send message to target chat wrapper
 *
 * @param {number|string} chatId - user, group or channel chat id
 * @param {string} message - message text
 * @param {string} options.parse_mode - (default: null) HTML of Markdown
 * @param {boolean|string|number} options.disable_web_page_preview - (default: false) disable loading first link info
 * @param {boolean|string|number} options.disable_notification - (default: false) send message silently
 * @param {string} options.reply_markup - (default: null) json encoded string
 *                                        example: {\"inline_keyboard\":[[{\"text\":\"CodeX\",\"url\":\"ifmo.su\"}]]}
 *                                        https://core.telegram.org/bots/api#replykeyboardmarkup
 * @return {Promise<void>}
 */
let sendMessage = async (chatId, message, options = {}) => {
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

/**
 * Set route for receiving updates from Telegram
 */
app.post(`${botUpdatesUri}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/**
 * GET request handler returns form for sending message
 */
app.get(`/:id`, async (req, res) => {
  res.render('form')
});

/**
 * POST request handler
 *
 * Requires chat token from uri
 * https://domain.com/<encrypted_chat_token>
 *
 * POST params:
 * - message
 * - (optional) parse_mode
 * - (optional) disable_web_page_preview
 * - (optional) disable_notification
 * - (optional) reply_markup
 */
app.post(`/:id`, async (req, res) => {
  try {
    let chatId;

    /**
     * Try to decrypt chatId
     */
    try {
      chatId = Crypto.decrypt(req.params.id);

      if (!chatId) {
        throw 'Chat ID is empty';
      }
    } catch (e) {
      throw 'Bad chat identifier';
    }

    let body = req.body;

    let options = {
      parse_mode: body.parse_mode,
      disable_web_page_preview: body.disable_web_page_preview,
      disable_notification: body.disable_notification,
      reply_markup: body.reply_markup
    };

    let message = body.message || body.text;

    await sendMessage(chatId, message, options);

    res.status(200).json({success: true});
  } catch(e) {
    console.log(e);
    res.status(400).json({error: e});
  }
});

/**
 * Start Express Server
 */
app.listen(config.port, () => {
  console.log(`Express server is listening on ${config.port}`);
});

/**
 * Get webhook url by chatId
 *
 * @param {string} chatId
 *
 * @return {string}
 */
let getWebhookByChatId = (chatId) => {
  let encryptedId = Crypto.encrypt(chatId.toString());

  let hook = `${host}/${encryptedId}`;

  return hook;
};

/**
 * Get message with hook and bot description
 *
 * @param {string} hook - webhook url
 * @param {string} title - chat title
 *
 * @return {string} message
 */
let getMessageByHook = (hook, title = '') => {
  let chatName = title ? `*${title}* channel` : 'this chat';

  let message = `Use this webhook to send messages to ${chatName}:\n` +
    "\n" +
    `\`${hook}\`\n` +
    "\n" +
    "Send POST request with message in `text` param.\n" +
    // "Send POST request with params:\n" +
    // "• `text` — message to send\n" +
    // "• `parse_mode` (default: null) — HTML or Markdown\n" +
    // "• `disable_web_page_preview` (default: false) — hide preview for links\n" +
    // "• `disable_notification` (default: false) — send message silently\n" +
    // "• `reply_markup` (default: null) — add link keys to message\n" +
    "\n" +
    "Check out [GitHub project](https://github.com/talyguryn/wbhkbot) for more params, sources, and documentation.";

  return message;
};

/**
 * Handler for bot command /start
 */
bot.onText(/\/start/, async msg => {
  try {
    let chatId = msg.chat.id,
        hook = getWebhookByChatId(chatId),
        message = getMessageByHook(hook),
        options = {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          reply_markup: `{\"inline_keyboard\":[[{\"text\":\"Send message via web form\",\"url\":\"${hook}\"}]]}`
        };

    await sendMessage(chatId, message, options);
  } catch (e) {
    console.log(e);
  }
});

/**
 * Handler for forwarded messages from channel
 *
 * 1. Check if bot can send messages to the channel
 * 2. Check if user can post messages to the channel
 */
bot.on('message', async msg => {
  let chatId = msg.chat.id;

  try {
    /**
     * Try to get channel info: {id, title, type}
     */
    let channelInfo = msg.forward_from_chat;

    if (!channelInfo) {
      throw 'Forwarded message was not from a channel';
    }

    /**
     * Get channel's admins
     * [
     *  {
     *    user: {
     *      id,
     *      is_bot,
     *      first_name,
     *      username
     *    },
     *    status,
     *    can_be_edited,
     *    can_change_info,
     *    can_post_messages,
     *    can_edit_messages,
     *    can_delete_messages,
     *    can_invite_users,
     *    can_restrict_members,
     *    can_promote_members
     *  },
     *  ...
     * ]
     */

    let admins = [];

    try {
      admins = await bot.getChatAdministrators(channelInfo.id);
    } catch (e) {
      let message = 'Can not get list of admins for this channel. Have you added this bot to list of admins?';
      await sendMessage(chatId, message);
      return;
    }

    /**
     * Get bot's info: {id, is_bot, first_name, username}
     */
    let botInfo = await bot.getMe();

    let botIsAdmin = false,
        userIsAdmin = false;
    admins.forEach(user => {
      if (user.user.id === chatId && (user.can_post_messages === true || user.status === 'creator')) {
        userIsAdmin = true;
      }

      if (user.user.id === botInfo.id && user.can_post_messages === true) {
        botIsAdmin = true;
      }
    });

    if (!userIsAdmin) {
      let message = 'You have no permissions to post messages to this channel.';
      await sendMessage(chatId, message);
      return;
    }

    if (!botIsAdmin) {
      let message = 'Bot has no permissions to post messages to this channel.';
      await sendMessage(chatId, message);
      return;
    }

    let hook = getWebhookByChatId(channelInfo.id),
        message = getMessageByHook(hook, channelInfo.title),
        options = {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          reply_markup: `{\"inline_keyboard\":[[{\"text\":\"Send message via web form\",\"url\":\"${hook}\"}]]}`
        };

    await sendMessage(chatId, message, options);
  } catch (e) {
    console.log(e);

    await sendMessage(chatId, e.message);
  }
});



