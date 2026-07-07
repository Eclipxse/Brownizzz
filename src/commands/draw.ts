import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder
} from "discord.js";
import type { Command } from "../types.js";
import { createDrawRoom } from "../services/draw-game.js";
import { palette, panelEmbed } from "../utils/ui.js";

export const drawCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("draw")
    .setDescription("Start a Brownie Draw Party room.")
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Create a live drawing and guessing game room.")
        .addIntegerOption((option) =>
          option
            .setName("rounds")
            .setDescription("Number of rounds.")
            .setMinValue(1)
            .setMaxValue(8)
        )
  ),
  async execute(interaction) {
    if (!interaction.guildId || !interaction.channelId) {
      await interaction.reply({ content: "Draw rooms only work inside servers.", flags: MessageFlags.Ephemeral });
      return;
    }

    const rounds = interaction.options.getInteger("rounds") ?? 3;
    const room = createDrawRoom({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      hostId: interaction.user.id,
      maxRounds: rounds
    });

    console.info(`[draw:start] guild=${interaction.guildId} room=${room.code} url=${room.url}`);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Join Draw Party")
        .setStyle(ButtonStyle.Link)
        .setURL(room.url)
    );

    const content = `Brownie Draw Party room \`${room.code}\` is ready: ${room.url}`;
    const embed = panelEmbed(
      "Brownie Draw Party",
      "LIVE GAME",
      `Room \`${room.code}\` is ready. Open the room, sketch the secret word, and guess faster than everyone else.`,
      palette.warning,
      `${rounds} round${rounds === 1 ? "" : "s"}`
    ).addFields(
      { name: "Players", value: "2+ recommended", inline: true },
      { name: "Mode", value: "Drawing + guessing", inline: true }
    );

    try {
      await interaction.reply({
        content,
        embeds: [embed],
        components: [row]
      });
    } catch (error) {
      console.error("Draw command reply failed:", error);

      const channel = interaction.channel;
      if (channel?.isTextBased() && "send" in channel) {
        await channel.send({
          content: `${content}\nDiscord interaction reply timed out, so I dropped the link here.`
        }).catch((sendError) => {
          console.error("Draw channel fallback failed:", sendError);
        });
      }
    }
  }
};
