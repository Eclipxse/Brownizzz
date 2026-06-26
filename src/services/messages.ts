import type { Message } from "discord.js";
import { addXp, getGuildConfig } from "./store.js";
import { levelFromXp, randomXp } from "../utils/levels.js";
import { palette, panelEmbed } from "../utils/ui.js";
import { env } from "../env.js";
import { generateAiReply, hasAiKey } from "./ai.js";

const xpCooldowns = new Map<string, number>();
const contentIntentWarnings = new Set<string>();

async function handleLeveling(message: Message<true>) {
  const config = await getGuildConfig(message.guild.id);
  if (!config.levelingEnabled) return;

  const key = `${message.guild.id}:${message.author.id}`;
  const last = xpCooldowns.get(key) ?? 0;
  if (Date.now() - last < 60_000) return;
  xpCooldowns.set(key, Date.now());

  const result = await addXp(message.guild.id, message.author.id, randomXp(), levelFromXp);
  if (!result.leveledUp) return;

  const target = config.levelUpChannelId
    ? await message.guild.channels.fetch(config.levelUpChannelId).catch(() => null)
    : message.channel;

  if (!target?.isTextBased() || target.isDMBased()) return;
  await target.send({
    embeds: [
      panelEmbed(
        "Level Up",
        "XP SYSTEM",
        `${message.author} reached level **${result.record.level}**.`,
        config.accentColor ?? palette.success,
        "Level Up"
      ).addFields(
        { name: "Current XP", value: `\`${result.record.xp}\``, inline: true },
        { name: "New Level", value: `\`${result.record.level}\``, inline: true }
      )
    ]
  }).catch(() => null);
}

async function handleAiResponder(message: Message<true>) {
  const config = await getGuildConfig(message.guild.id);
  if (!config.aiResponderEnabled || !hasAiKey()) return;
  if (!config.aiResponderChannelId || message.channel.id !== config.aiResponderChannelId) return;
  if (!env.enableMessageContentIntent || !message.content) {
    const warningKey = `${message.guild.id}:${message.channel.id}`;
    if (!contentIntentWarnings.has(warningKey)) {
      contentIntentWarnings.add(warningKey);
      console.warn(
        `AI auto-reply is enabled in guild ${message.guild.id} channel ${message.channel.id}, ` +
        "but message content is unavailable. Enable Message Content Intent in Discord Developer Portal and set ENABLE_MESSAGE_CONTENT_INTENT=true."
      );
    }
    return;
  }

  const botId = message.client.user?.id;
  const cleaned = botId
    ? message.content.replace(new RegExp(`<@!?${botId}>`, "g"), "").trim()
    : message.content.trim();

  if (!cleaned) return;

  await message.channel.sendTyping().catch(() => null);

  const answer = await generateAiReply({
    guildName: message.guild.name,
    channelName: message.channel.isDMBased() ? "dm" : message.channel.name,
    authorName: message.author.username,
    content: cleaned,
    customPrompt: config.aiResponderPrompt,
    persona: config.aiResponderPersona
  }).catch((error) => {
    console.error("AI auto-reply failed:", error);
    return env.aiProvider === "openrouter"
      ? "AI auto-reply failed. Check OpenRouter key, model, and usage limits."
      : "AI auto-reply failed. Check OpenAI key, model, and billing.";
  });

  await message.reply({
    content: answer,
    allowedMentions: { repliedUser: false }
  }).catch(() => null);
}

export async function handleMessageCreate(message: Message) {
  if (!message.guild || message.author.bot) return;
  await handleLeveling(message as Message<true>);
  await handleAiResponder(message as Message<true>);
}
