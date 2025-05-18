require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });
const secureMessages = new Map();
var secretMessage;


bot.deleteWebHook().then(() => console.log("✅ Webhook removed"));

bot.on("polling_error", (error) => {
  console.error("❌ Polling error:", error.code, error.message);
});
bot.on("message", (msg) => {
  const chatType = msg.chat.type;
  const text = msg.text?.trim();
  if (text.startsWith("set")) {
    secretMessage = text.split("-")[1];
  }
  if (!text?.startsWith("popup")) return;

  // ✅ Only allow specific user
  if (
    msg.from.username?.toLowerCase() !== "sadiq_dev" &&
    msg.from.username?.toLowerCase() !== "sadiq_dm"
  )
    return;

  const parts = text.split(" ");
  if (parts.length < 2 || !parts[1].startsWith("@")) {
    return bot.sendMessage(
      msg.chat.id,
      "⚠️ Usage: /popup @username secret message"
    );
  }

  const targetUsername = parts[1].substring(1).toLowerCase();
  // const secretMessage = parts.slice(2).join(" ").trim();
  const callbackId = `popup_${Date.now()}`;

  secureMessages.set(callbackId, {
    allowedUser: targetUsername,
    message: secretMessage,
  });

  // ✅ Send button to group
  bot
    .sendMessage(
      msg.chat.id,
      `🔒 Only @${targetUsername} can view this popup.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔔 Open Secret", callback_data: callbackId }],
          ],
        },
      }
    )
    .catch((err) => {
      console.error("❌ Failed to send message to group:", err.message);
      bot.sendMessage(msg.chat.id, "❌ Failed to send message");
    });
});

// ✅ Handle popup button click
bot.on("callback_query", (query) => {
  const clickedBy = query.from.username?.toLowerCase();
  const callbackId = query.data;

  const data = secureMessages.get(callbackId);
  if (!data) {
    return bot.answerCallbackQuery(query.id, {
      text: "⚠️ This popup is invalid or expired.",
      show_alert: true,
    });
  }

  const { allowedUser, message } = data;

  if (clickedBy === allowedUser) {
    bot.answerCallbackQuery(query.id, {
      text: `${message}`,
      show_alert: true,
    });
  } else {
    bot.answerCallbackQuery(query.id, {
      text: `❌ Unauthorized. This popup is for @${allowedUser} only.`,
      show_alert: true,
    });

    // ✅ Send warning to group
    bot.sendMessage(
      query.message.chat.id,
      `🚫 STAY OUT @${clickedBy} !!, you are Unauthorized😒❗ DO NOT CLICK AGAIN!`
    );
  }
});
