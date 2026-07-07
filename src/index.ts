import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  type InteractionReplyOptions
} from "discord.js";
import { commandData, commandMap } from "./commands/index.js";
import { renderWelcome } from "./commands/welcome.js";
import { env } from "./env.js";
import { handleInteraction } from "./interactions/index.js";
import { startBirthdayScheduler } from "./services/birthdays.js";
import { startDrawGameServer, stopDrawGameServer } from "./services/draw-game.js";
import { startGiveawayScheduler } from "./services/giveaways.js";
import { handleMessageCreate } from "./services/messages.js";
import { handleMusicRaw, initMusic } from "./services/music.js";
import { getGuildConfig } from "./services/store.js";
import { handleTempVoice } from "./services/temp-voice.js";
import { palette, panelEmbed } from "./utils/ui.js";

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildVoiceStates
];

if (env.enableMessageContentIntent) {
  intents.push(GatewayIntentBits.MessageContent);
}

const client = new Client({
  intents
});

async function registerCommandsOnStart(readyClient: Client<true>) {
  if (!env.registerCommandsOnStart) return;

  if (env.guildId) {
    const guild = await readyClient.guilds.fetch(env.guildId);
    await guild.commands.set(commandData);
    console.log(`Registered ${commandData.length} guild commands in ${guild.name}.`);
    return;
  }

  await readyClient.application.commands.set(commandData);
  console.log(`Registered ${commandData.length} global commands.`);
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}.`);
  initMusic(readyClient);
  startDrawGameServer();
  startGiveawayScheduler(readyClient);
  startBirthdayScheduler(readyClient);

  try {
    await registerCommandsOnStart(readyClient);
  } catch (error) {
    console.error("Failed to register slash commands on startup:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commandMap.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    await handleInteraction(interaction);
  } catch (error) {
    console.error(error);

    if (!interaction.isRepliable()) return;
    const payload: InteractionReplyOptions = {
      content: "Something went wrong while handling that interaction.",
      flags: MessageFlags.Ephemeral
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  }
});

client.on(Events.MessageCreate, (message) => {
  void handleMessageCreate(message).catch((error) => {
    console.error("Message handler failed:", error);
  });
});

client.on(Events.Raw, (packet) => {
  handleMusicRaw(packet);
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  void handleTempVoice(oldState, newState).catch((error) => {
    console.error("Temporary voice handler failed:", error);
  });
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const config = await getGuildConfig(member.guild.id);

    if (config.autoRoleId) {
      await member.roles.add(config.autoRoleId, "Automatic join role").catch(() => null);
    }

    if (!config.welcomeChannelId) return;

    const channel = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
    if (!channel?.isTextBased() || channel.isDMBased()) return;

    await channel.send({
      embeds: [
        panelEmbed(
          "Welcome",
          "ARRIVAL",
          renderWelcome(config.welcomeMessage, `${member}`, member.guild.name),
          config.accentColor ?? palette.primary,
          "Joined"
        ).addFields({ name: "Member Count", value: `${member.guild.memberCount}`, inline: true })
      ]
    }).catch(() => null);
  } catch (error) {
    console.error("Guild member join handler failed:", error);
  }
});

process.on("SIGINT", () => {
  stopDrawGameServer();
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopDrawGameServer();
  client.destroy();
  process.exit(0);
});

await client.login(env.token);
