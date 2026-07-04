import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type GuildMember
} from "discord.js";
import {
  LavalinkManager,
  type Player,
  type RepeatMode,
  type SearchPlatform,
  type Track,
  type UnresolvedTrack
} from "lavalink-client";
import { env } from "../env.js";
import { palette } from "../utils/ui.js";

let manager: LavalinkManager | null = null;

const lavalinkUnavailableMessage =
  "Lavalink is not ready right now. Start/restart Lavalink, wait until /v4/info responds, then restart the bot so it can attach to a usable node.";
const spotifyUnavailableMessage =
  "Spotify links are not enabled on Lavalink yet. Use a song name or YouTube link for now, or enable the LavaSrc Spotify plugin with Spotify client credentials.";

function isMissingLavalinkNodeError(error: unknown) {
  return error instanceof Error && /no lavalink node/i.test(error.message);
}

function isSpotifySourceError(error: unknown) {
  return error instanceof Error && /spotify/i.test(error.message) && /enabled|source|lavasrc/i.test(error.message);
}

function explainLavalinkError(error: unknown): never {
  if (isMissingLavalinkNodeError(error)) {
    throw new Error(lavalinkUnavailableMessage);
  }

  if (isSpotifySourceError(error)) {
    throw new Error(spotifyUnavailableMessage);
  }

  throw error;
}

export function initMusic(client: Client<true>) {
  manager = new LavalinkManager({
    nodes: [
      {
        id: "main",
        host: env.lavalinkHost,
        port: env.lavalinkPort,
        authorization: env.lavalinkPassword,
        secure: env.lavalinkSecure
      }
    ],
    sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
    client: {
      id: client.user.id,
      username: client.user.username
    },
    autoSkip: true,
    playerOptions: {
      defaultSearchPlatform: env.musicSearchSource as SearchPlatform,
      volumeDecrementer: 1,
      onDisconnect: {
        autoReconnect: true,
        destroyPlayer: false
      },
      onEmptyQueue: {
        destroyAfterMs: 60_000
      }
    },
    queueOptions: {
      maxPreviousTracks: 10
    }
  });

  manager.nodeManager.on("connect", (node) => {
    console.log(`Lavalink node "${node.id}" connected.`);
  });

  manager.nodeManager.on("error", (node, error) => {
    console.error(`Lavalink node "${node.id}" error:`, error.message);
  });

  manager.on("trackStart", async (player, track) => {
    const requestedAt = player.getData<number>("musicRequestStartedAt");
    if (Number.isFinite(requestedAt)) {
      console.info(
        `[music:track-start] guild=${player.guildId} node=${player.node.id} ready=${Math.round(performance.now() - requestedAt)}ms`
      );
      player.deleteData("musicRequestStartedAt");
    }

    const channel = player.textChannelId ? await client.channels.fetch(player.textChannelId).catch(() => null) : null;
    if (!channel?.isTextBased() || channel.isDMBased()) return;

    await channel.send({
      embeds: [nowPlayingEmbed(player, track)],
      components: musicControlRows(player)
    }).catch(() => null);
  });

  manager.on("queueEnd", async (player) => {
    const channel = player.textChannelId ? await client.channels.fetch(player.textChannelId).catch(() => null) : null;
    if (!channel?.isTextBased() || channel.isDMBased()) return;
    await channel.send({ embeds: [musicEmbed("Queue Finished", "No more tracks in the queue.")] }).catch(() => null);
  });

  void manager.init({
    id: client.user.id,
    username: client.user.username
  });

  return manager;
}

export function handleMusicRaw(data: unknown) {
  void manager?.sendRawData(data as never).catch(() => null);
}

export function getMusicManager() {
  return manager;
}

export function getMusicPlayer(guildId: string) {
  return manager?.getPlayer(guildId);
}

export function musicIsReady() {
  return Boolean(manager?.useable);
}

export async function createOrGetMusicPlayer(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.guildId) {
    throw new Error("Music commands only work in servers.");
  }

  if (!musicIsReady() || !manager) {
    throw new Error("Lavalink is offline. Start Lavalink on the VPS, then restart or wait for the bot to reconnect.");
  }

  const member = interaction.guild.members.cache.get(interaction.user.id)
    ?? await interaction.guild.members.fetch(interaction.user.id);
  const voiceChannelId = member.voice.channelId;
  if (!voiceChannelId) {
    throw new Error("Join a voice channel first.");
  }

  const me = interaction.guild.members.me ?? await interaction.guild.members.fetchMe().catch(() => null);
  if (me?.voice.channelId && me.voice.channelId !== voiceChannelId) {
    throw new Error("I am already playing in another voice channel.");
  }

  const player = manager.createPlayer({
    guildId: interaction.guildId,
    voiceChannelId,
    textChannelId: interaction.channelId,
    selfDeaf: true,
    selfMute: false,
    volume: env.musicDefaultVolume
  });

  return {
    player,
    shouldConnect: me?.voice.channelId !== voiceChannelId
  };
}

export async function playQuery(interaction: ChatInputCommandInteraction, query: string) {
  const startedAt = performance.now();
  const { player, shouldConnect } = await createOrGetMusicPlayer(interaction);
  const searchQuery = isUrl(query)
    ? query
    : { query, source: env.musicSearchSource as SearchPlatform };

  const searchStartedAt = performance.now();
  let searchMs = 0;
  let connectMs = 0;

  const searchPromise = player.search(searchQuery, interaction.user)
    .then((result) => {
      searchMs = performance.now() - searchStartedAt;
      return result;
    })
    .catch((error: unknown) => {
      console.error(
        `[music:search-error] guild=${interaction.guildId} node=${player.node.id} after=${Math.round(performance.now() - searchStartedAt)}ms`,
        error
      );
      explainLavalinkError(error);
    });

  const connectPromise = shouldConnect
    ? player.connect()
      .then(() => {
        connectMs = performance.now() - searchStartedAt;
      })
      .catch((error: unknown) => {
        console.error(
          `[music:connect-error] guild=${interaction.guildId} node=${player.node.id} after=${Math.round(performance.now() - searchStartedAt)}ms`,
          error
        );
        explainLavalinkError(error);
      })
    : Promise.resolve();

  const [result] = await Promise.all([searchPromise, connectPromise]);

  if (!result.tracks.length) {
    throw new Error("No tracks found.");
  }

  const tracks = result.loadType === "playlist" ? result.tracks : [result.tracks[0]!];
  player.queue.add(tracks);

  if (!player.playing && !player.paused) {
    player.setData("musicRequestStartedAt", startedAt);
    await player.play().catch((error: unknown) => {
      explainLavalinkError(error);
    });
  }

  console.info(
    `[music:play] guild=${interaction.guildId} node=${player.node.id} source=${isUrl(query) ? "url" : env.musicSearchSource} `
    + `connect=${Math.round(connectMs)}ms search=${Math.round(searchMs)}ms command=${Math.round(performance.now() - startedAt)}ms`
  );

  return { player, result, added: tracks };
}

export function getRequesterName(track?: Track | UnresolvedTrack | null) {
  const requester = track?.requester as GuildMember | { username?: string; tag?: string } | undefined;
  if (!requester) return "Unknown";
  if ("displayName" in requester) return requester.displayName;
  return requester.username ?? requester.tag ?? "Unknown";
}

export function trackLabel(track?: Track | UnresolvedTrack | null) {
  if (!track) return "Nothing playing";
  const info = track.info;
  const title = info.uri ? `[${info.title}](${info.uri})` : info.title;
  return `${title}\nby **${info.author ?? "Unknown"}**`;
}

export function formatTrackDuration(track?: Track | UnresolvedTrack | null) {
  if (!track) return "0:00";
  if (track.info.isStream) return "Live";
  return formatMs(track.info.duration ?? 0);
}

export function formatMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function musicEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setColor(palette.electric)
    .setAuthor({ name: `${env.brandName} Music Deck` })
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

export function nowPlayingEmbed(player: Player, track = player.queue.current) {
  const built = musicEmbed("Now Playing", trackLabel(track))
    .addFields(
      { name: "Duration", value: `\`${formatTrackDuration(track)}\``, inline: true },
      { name: "Volume", value: `\`${player.volume}%\``, inline: true },
      { name: "Loop", value: `\`${player.repeatMode}\``, inline: true },
      { name: "Requested By", value: getRequesterName(track), inline: true },
      { name: "Queue", value: `\`${player.queue.tracks.length} track(s)\``, inline: true }
    );

  const artwork = track?.info.artworkUrl;
  if (artwork) built.setThumbnail(artwork);
  return built;
}

export function queueEmbed(player: Player) {
  const current = player.queue.current ? `**Now:** ${player.queue.current.info.title}` : "**Now:** Nothing playing";
  const upcoming = player.queue.tracks.slice(0, 10).map((track, index) => {
    return `\`${index + 1}.\` ${track.info.title} - ${formatTrackDuration(track)}`;
  });

  return musicEmbed("Music Queue", [current, "", upcoming.length ? upcoming.join("\n") : "No upcoming tracks."].join("\n"))
    .addFields({ name: "Total Upcoming", value: `\`${player.queue.tracks.length}\``, inline: true });
}

export function musicControlRows(player?: Player) {
  const paused = Boolean(player?.paused);
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(paused ? "music:resume" : "music:pause")
        .setEmoji(paused ? "▶️" : "⏸️")
        .setLabel(paused ? "Resume" : "Pause")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("music:skip").setEmoji("⏭️").setLabel("Skip").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music:stop").setEmoji("🛑").setLabel("Stop").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("music:loop").setEmoji("🔁").setLabel("Loop").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("music:queue").setEmoji("🧺").setLabel("Queue").setStyle(ButtonStyle.Secondary)
    )
  ];
}

export async function ensureSameVoice(interaction: { guildId: string | null; guild?: { members: { fetch(userId: string): Promise<GuildMember> } } | null; user: { id: string } }, player: Player) {
  if (!interaction.guild || !interaction.guildId) throw new Error("Music controls only work in servers.");
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.voice.channelId || member.voice.channelId !== player.voiceChannelId) {
    throw new Error("Join my voice channel first.");
  }
}

function isUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeLoopMode(mode: string): RepeatMode {
  if (mode === "track" || mode === "queue") return mode;
  return "off";
}
