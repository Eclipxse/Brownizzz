import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { generateAiReply, hasAiKey } from "../services/ai.js";
import { getGuildConfig, updateGuildConfig } from "../services/store.js";
import type { Command } from "../types.js";
import { embed, palette } from "../utils/ui.js";
import { env } from "../env.js";

export const aiCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Configure and use AI chat replies.")
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ask")
        .setDescription("Ask the AI a one-off question.")
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("What should the AI answer?")
            .setRequired(true)
            .setMaxLength(1500)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Set the only channel where AI auto-replies.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("AI chat channel.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("disable").setDescription("Disable AI auto-replies."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("prompt")
        .setDescription("Set the AI personality/style for this server.")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("Example: Be funny, concise, and helpful.")
            .setRequired(true)
            .setMaxLength(500)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("persona")
        .setDescription("Choose a built-in AI personality.")
        .addStringOption((option) =>
          option
            .setName("preset")
            .setDescription("Persona preset.")
            .setRequired(true)
            .addChoices(
              { name: "Default", value: "default" },
              { name: "Gen Z girl", value: "genz-girl" },
              { name: "Professional", value: "professional" },
              { name: "Sassy", value: "sassy" }
            )
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("status").setDescription("Show AI responder status.")),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "AI commands only work in servers.", flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "ask") {
      await interaction.deferReply();
      const config = await getGuildConfig(interaction.guildId);
      const guild = interaction.guild ?? await interaction.client.guilds.fetch(interaction.guildId).catch(() => null);
      const answer = await generateAiReply({
        guildName: guild?.name ?? "this server",
        channelName: interaction.channel && "name" in interaction.channel ? interaction.channel.name ?? "unknown" : "unknown",
        authorName: interaction.user.username,
        content: interaction.options.getString("message", true),
        customPrompt: config.aiResponderPrompt,
        persona: config.aiResponderPersona
      }).catch((error) => {
        console.error("AI request failed:", error);
        return env.aiProvider === "openrouter"
          ? "AI request failed. Check `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and OpenRouter usage limits."
          : "AI request failed. Check `OPENAI_API_KEY` and model.";
      });

      await interaction.editReply(answer);
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: "You need Manage Server to configure AI replies.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "setup") {
      const channel = interaction.options.getChannel("channel", true);

      await updateGuildConfig(interaction.guildId, {
        aiResponderEnabled: true,
        aiResponderChannelId: channel.id
      });

      const warning = !hasAiKey()
        ? env.aiProvider === "openrouter"
          ? "\n\nMissing `OPENROUTER_API_KEY` in `.env`. Add it and restart the bot before this can answer."
          : "\n\nMissing `OPENAI_API_KEY` in `.env`. Add it and restart the bot before this can answer."
        : "";

      await interaction.reply({
        content: `AI auto-replies are now enabled only in ${channel}.${warning}\n\nUsers can still use \`/ai ask\` in any channel.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === "disable") {
      await updateGuildConfig(interaction.guildId, { aiResponderEnabled: false });
      await interaction.reply({ content: "AI responder disabled.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "prompt") {
      await updateGuildConfig(interaction.guildId, {
        aiResponderPrompt: interaction.options.getString("text", true)
      });
      await interaction.reply({ content: "AI style prompt updated.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "persona") {
      const persona = interaction.options.getString("preset", true) as "default" | "genz-girl" | "professional" | "sassy";
      await updateGuildConfig(interaction.guildId, { aiResponderPersona: persona });
      await interaction.reply({
        content: persona === "genz-girl"
          ? "Persona set to `Gen Z girl`. Bestie is officially online."
          : `Persona set to \`${persona}\`.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const config = await getGuildConfig(interaction.guildId);
    await interaction.reply({
      embeds: [
        embed("AI Responder Status", "Current AI chat configuration.", palette.electric).addFields(
          { name: "Enabled", value: config.aiResponderEnabled ? "`Yes`" : "`No`", inline: true },
          { name: "Auto Reply Channel", value: config.aiResponderChannelId ? `<#${config.aiResponderChannelId}>` : "`Not set`", inline: true },
          { name: "Persona", value: `\`${config.aiResponderPersona ?? "default"}\``, inline: true },
          { name: "Provider", value: `\`${env.aiProvider}\``, inline: true },
          { name: "Model", value: `\`${env.aiProvider === "openrouter" ? env.openRouterModel : env.openAIModel}\``, inline: true },
          { name: "Reply Size", value: `\`${env.aiMaxTokens} tokens\``, inline: true },
          { name: "Timeout", value: `\`${env.aiTimeoutMs}ms\``, inline: true },
          { name: "AI Key", value: hasAiKey() ? "`Loaded`" : "`Missing`", inline: true }
        )
      ],
      flags: MessageFlags.Ephemeral
    });
  }
};
