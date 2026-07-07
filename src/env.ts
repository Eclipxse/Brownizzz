import "dotenv/config";

const token = process.env.DISCORD_TOKEN?.trim();
const aiProviderRaw = process.env.AI_PROVIDER?.trim().toLowerCase();
const openAIKey = process.env.OPENAI_API_KEY?.trim();
const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
const groqKey = process.env.GROQ_API_KEY?.trim();
const hasOpenAIKey = Boolean(openAIKey && openAIKey !== "put_your_openai_api_key_here");
const hasOpenRouterKey = Boolean(openRouterKey && openRouterKey !== "put_your_openrouter_api_key_here");
const hasGroqKey = Boolean(groqKey && groqKey !== "put_your_groq_api_key_here");
const aiProvider = aiProviderRaw === "groq" || (!aiProviderRaw && hasGroqKey && !hasOpenAIKey && !hasOpenRouterKey)
  ? "groq"
  : aiProviderRaw === "openrouter" || (!aiProviderRaw && hasOpenRouterKey && !hasOpenAIKey)
    ? "openrouter"
    : "openai";
const aiMaxTokens = Number.parseInt(process.env.AI_MAX_TOKENS ?? "140", 10);
const aiTimeoutMs = Number.parseInt(process.env.AI_TIMEOUT_MS ?? "15000", 10);
const lavalinkPort = Number.parseInt(process.env.LAVALINK_PORT ?? "2333", 10);
const drawGamePort = Number.parseInt(process.env.DRAW_GAME_PORT ?? "8787", 10);
const musicDefaultVolume = Number.parseInt(process.env.MUSIC_DEFAULT_VOLUME ?? "80", 10);
const storageDriverRaw = process.env.STORAGE_DRIVER?.trim().toLowerCase();
const voiceControlUserIds = (process.env.VOICE_CONTROL_USER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

if (!token || token === "put_your_bot_token_here") {
  throw new Error("Missing DISCORD_TOKEN. Create .env from .env.example and add your bot token.");
}

export const env = {
  token,
  clientId: process.env.DISCORD_CLIENT_ID?.trim(),
  guildId: process.env.DISCORD_GUILD_ID?.trim(),
  registerCommandsOnStart: process.env.REGISTER_COMMANDS_ON_START !== "false",
  enableMessageContentIntent: process.env.ENABLE_MESSAGE_CONTENT_INTENT === "true",
  aiProvider,
  openAIKey,
  openAIModel: process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini",
  openRouterKey,
  openRouterModel: process.env.OPENROUTER_MODEL?.trim() || "openrouter/free",
  openRouterSiteUrl: process.env.OPENROUTER_SITE_URL?.trim(),
  openRouterAppName: process.env.OPENROUTER_APP_NAME?.trim() || "Nexus Discord Bot",
  groqKey,
  groqModel: process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant",
  aiMaxTokens: Number.isFinite(aiMaxTokens) ? Math.max(60, Math.min(400, aiMaxTokens)) : 140,
  aiTimeoutMs: Number.isFinite(aiTimeoutMs) ? Math.max(3000, Math.min(60000, aiTimeoutMs)) : 15000,
  lavalinkHost: process.env.LAVALINK_HOST?.trim() || "127.0.0.1",
  lavalinkPort: Number.isFinite(lavalinkPort) ? lavalinkPort : 2333,
  lavalinkPassword: process.env.LAVALINK_PASSWORD?.trim() || "youshallnotpass",
  lavalinkSecure: process.env.LAVALINK_SECURE === "true",
  musicSearchSource: process.env.MUSIC_SEARCH_SOURCE?.trim() || "ytsearch",
  musicDefaultVolume: Number.isFinite(musicDefaultVolume) ? Math.max(1, Math.min(100, musicDefaultVolume)) : 80,
  drawGameEnabled: process.env.DRAW_GAME_ENABLED !== "false",
  drawGamePort: Number.isFinite(drawGamePort) ? drawGamePort : 8787,
  drawGamePublicUrl: process.env.DRAW_GAME_PUBLIC_URL?.trim() || `http://localhost:${Number.isFinite(drawGamePort) ? drawGamePort : 8787}`,
  storageDriver: storageDriverRaw === "postgres" ? "postgres" : "json",
  databaseUrl: process.env.DATABASE_URL?.trim(),
  brandName: process.env.BOT_BRAND_NAME?.trim() || "Nexus",
  voiceControlUserIds
};
