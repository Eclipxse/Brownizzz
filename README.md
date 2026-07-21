<p align="center">
  <img src="dashboard/public/brand/blunt38-banner.jpg" alt="38 reasons, none explained" width="100%" />
</p>

<p align="center">
  <img src="dashboard/public/brand/blunt38-logo.jpg" alt="blunt38" width="132" />
</p>

<h1 align="center">blunt38</h1>

<p align="center">
  <code>38 reasons. none explained.</code><br />
  the discord bot that somehow became an entire operating system.
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TYPE-scripted-6f4b8b?style=for-the-badge&labelColor=211329" />
  <img alt="discord.js" src="https://img.shields.io/badge/SIGNAL-discord.js_v14-63d8d2?style=for-the-badge&labelColor=211329" />
  <img alt="Supabase" src="https://img.shields.io/badge/MEMORY-supabase-b7ef72?style=for-the-badge&labelColor=211329" />
  <img alt="Lavalink" src="https://img.shields.io/badge/AUDIO-lavalink-ffd166?style=for-the-badge&labelColor=211329" />
  <img alt="Status" src="https://img.shields.io/badge/STATUS-probably_online-c56bdf?style=for-the-badge&labelColor=211329" />
</p>

---

```text
[ transmission detected ]

subject: blunt38
class: discord multipurpose bot
commands: 26
memory: postgres
voice: lavalink
personality: configurable
normal behavior: not guaranteed
```

## // what is this thing

`blunt38` is a UI-first Discord bot for communities that are tired of stacking twelve random bots and praying they do not fight each other.

It handles moderation, AI replies, music, tickets, roles, leveling, giveaways, temporary voice channels, server setup, a browser dashboard, and a live multiplayer drawing game. lowkey excessive. exactly the point.

The bot runs on Node.js and TypeScript. Persistent data lives in Supabase Postgres, music runs through Lavalink, AI can route through Groq or other OpenAI-compatible providers, and the dashboard is built with Next.js.

## // observed abilities

| Signal | What blunt38 actually does |
| --- | --- |
| Control surface | `/setup` opens a button, menu, channel-select, role-select, and modal based configuration panel |
| AI brain | One-off `/ai ask`, one dedicated auto-reply channel, custom prompts, personas, Groq, OpenRouter, and OpenAI-compatible routing |
| Music deck | Search or link playback, queue, pause, resume, skip, stop, shuffle, loop, volume, removal, and now-playing controls |
| Draw Party | Real-time browser drawing rooms with word choices, brush, fill, eraser, colors, sounds, guesses, rounds, and scoring |
| Tickets | Modal intake, category routing, staff claims, locks, transcripts, and close confirmation |
| Moderation | Warnings, timeouts, kicks, bans, stored cases, history, and voice disconnect controls |
| Community | Welcome messages, autoroles, self-role menus, polls, suggestions, birthdays, and giveaways |
| Leveling | XP, rank cards, leaderboards, and configurable level-up announcements |
| Voice | Join-to-create temporary channels with automatic empty-room cleanup |
| Server builder | Preview, build, and clean complete server layouts with roles, categories, channels, panels, and bot wiring |
| Dashboard | Discord OAuth, guild selection, live roles/channels, and Supabase-backed configuration saves |

## // command index

```text
/help           /ai              /setup           /welcome
/role           /role-panel      /ticket-panel    /moderate
/server         /poll            /suggest-panel   /tempvc
/giveaway       /leveling        /rank             /leaderboard
/embed          /birthday        /serverinfo       /userinfo
/emoji          /sticker         /minigame         /music
/voice          /draw
```

The heavier command groups have subcommands. The important ones:

```text
/ai ask | setup | disable | prompt | persona | status
/music play | pause | resume | skip | stop | queue | nowplaying
       volume | loop | shuffle | remove
/role give | remove | autorole | clear-autorole
/birthday set | remove | list | channel
/server preview | build | cleanup
/voice disconnect
/draw start
```

## // signal path

```mermaid
flowchart LR
  Human["server admin"] --> Discord["Discord UI"]
  Human --> Dashboard["blunt38 dashboard"]
  Discord --> Bot["blunt38 core"]
  Dashboard --> OAuth["Discord OAuth"]
  Dashboard --> DB["Supabase Postgres"]
  Bot --> DB
  Bot --> AI["Groq / OpenRouter / OpenAI"]
  Bot --> Lava["Lavalink"]
  Bot --> Draw["Draw Party server"]
  Lava --> Voice["Discord voice"]
  Draw --> Browser["multiplayer browser rooms"]
```

## // files recovered

```text
.
|-- src/
|   |-- commands/          slash command definitions
|   |-- interactions/      buttons, menus, modals
|   |-- services/          AI, music, storage, games, schedulers
|   `-- utils/             shared UI and formatting
|-- dashboard/             Next.js control panel
|-- public/draw/           multiplayer Draw Party client
|-- lavalink/              music-node configuration
|-- supabase/migrations/   production database schema
|-- .env.example           runtime configuration template
`-- README.md              you are here. unfortunate.
```

## // summon it locally

Requirements:

- Node.js 24
- npm
- a Discord application and bot token

```bash
git clone https://github.com/Eclipxse/Blunt38.git blunt38
cd blunt38
npm install
copy .env.example .env
npm run dev
```

Linux and macOS use `cp .env.example .env` instead of `copy`.

Minimum `.env`:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
DISCORD_GUILD_ID=your_test_server_id
REGISTER_COMMANDS_ON_START=true
BOT_BRAND_NAME=blunt38
```

`DISCORD_GUILD_ID` makes command updates appear quickly in one test server. Remove it when you want global commands everywhere. Global registration can take longer to propagate because Discord likes suspense.

## // developer portal ritual

Create the application in the [Discord Developer Portal](https://discord.com/developers/applications), add a bot, then configure:

| Setting | Recommended value |
| --- | --- |
| Public Bot | On if other people should invite it |
| Requires OAuth2 Code Grant | Off |
| Server Members Intent | On |
| Message Content Intent | On when AI auto-replies are enabled |
| Presence Intent | Off unless a feature needs it |

Invite scopes:

```text
bot
applications.commands
```

Administrator is convenient while testing. Production servers should eventually use only the permissions their enabled modules need.

## // memory implant

Quick local testing can use JSON:

```env
STORAGE_DRIVER=json
```

Production should use Supabase Postgres:

```env
STORAGE_DRIVER=postgres
DATABASE_URL=postgresql://postgres.project_ref:password@pooler.supabase.com:5432/postgres
```

Apply:

```text
supabase/migrations/001_discord_bot_core_schema.sql
```

That database stores guild configuration, moderation cases, polls, role panels, giveaways, XP, birthdays, and temporary voice state. It remembers the lore so the process does not have to.

## // give it a brain

Groq is the recommended fast route:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
AI_MAX_TOKENS=140
AI_TIMEOUT_MS=15000
ENABLE_MESSAGE_CONTENT_INTENT=true
```

OpenRouter also works:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openrouter/free
OPENROUTER_APP_NAME=blunt38
ENABLE_MESSAGE_CONTENT_INTENT=true
```

Use a chat model. Rerank models sort documents; they do not know how to yap back.

AI auto-replies happen only inside the channel selected with `/ai setup`. `/ai ask` still works anywhere the bot can answer.

## // make it sing

Music runs through a separate Lavalink process:

```env
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
MUSIC_SEARCH_SOURCE=ytsearch
MUSIC_DEFAULT_VOLUME=80
```

Start Lavalink before the bot:

```bash
java -Xms256M -Xmx1G -jar Lavalink.jar
```

YouTube and YouTube Music search use the Lavalink YouTube plugin. Spotify, Apple Music, and Deezer links need the matching plugins and credentials. A link existing does not magically make the source enabled. tragic but real.

More node setup lives in [`lavalink/README.md`](lavalink/README.md).

## // side quest: Draw Party

```env
DRAW_GAME_ENABLED=true
DRAW_GAME_PORT=8787
DRAW_GAME_PUBLIC_URL=https://draw.your-domain.com
```

Run `/draw start`, hit the Join Game button, choose a name, and begin ruining friendships with questionable drawings.

For production, reverse proxy the public domain to `127.0.0.1:8787` and include WebSocket upgrade headers. Health check:

```bash
curl http://127.0.0.1:8787/draw/health
```

## // control room

The dashboard lives in `dashboard/` and provides Discord login, admin-only guild access, real channel and role selectors, configuration previews, and database-backed saves.

```env
DISCORD_CLIENT_ID=your_application_id
DISCORD_CLIENT_SECRET=your_oauth_secret
DISCORD_TOKEN=your_bot_token
DASHBOARD_BASE_URL=https://bot.your-domain.com
DASHBOARD_SESSION_SECRET=replace_with_a_long_random_secret
DATABASE_URL=your_supabase_pooler_url
```

OAuth callback:

```text
https://bot.your-domain.com/api/auth/callback
```

Local dashboard:

```bash
cd dashboard
npm install
copy .env.example .env
npm run dev
```

## // keep the signal alive

Recommended VPS for the complete stack: **2 vCPU, 4 GB RAM, 40+ GB storage**.

```bash
apt update
apt install -y git curl unzip openjdk-17-jre

cd /opt
git clone https://github.com/Eclipxse/Blunt38.git blunt38
cd /opt/blunt38
npm ci
npm run build
npm run deploy:commands

pm2 start dist/index.js --name blunt38-bot
pm2 save
```

Dashboard:

```bash
cd /opt/blunt38/dashboard
npm ci
npm run build
pm2 start npm --name blunt38-dashboard -- start -- -p 3000
pm2 save
```

Useful checks:

```bash
pm2 status
pm2 logs blunt38-bot
systemctl status lavalink --no-pager -l
curl -H "Authorization: youshallnotpass" http://127.0.0.1:2333/v4/info
```

## // when the signal dies

| Symptom | Usually means |
| --- | --- |
| `The application did not respond` | The bot is offline, blocked on network/database work, or did not defer the interaction in time |
| AI command fails | Wrong provider, key, model, timeout, or rate limit |
| Auto replies stay silent | Message Content Intent is off or `/ai setup` points somewhere else |
| Lavalink offline | The Java service is stopped, still starting, or its host/password does not match |
| Music link source not enabled | The required Lavalink source plugin is missing |
| Draw room uses the wrong URL | `DRAW_GAME_PUBLIC_URL` is stale in the active process environment |
| Supabase authentication fails | Wrong pooler string, password, username, SSL mode, or URL encoding |
| Dashboard OAuth fails | Redirect URI and `DASHBOARD_BASE_URL` do not match exactly |
| Commands are missing | Deploy commands again and verify `DISCORD_CLIENT_ID` |

## // opsec, because apparently we need to say it

- Never commit `.env`.
- Never paste live tokens into screenshots, chat, commits, or issue reports.
- Rotate a Discord token immediately after it leaks.
- Keep database credentials and OAuth secrets on the server.
- Do not run multiple bot processes with one token unless sharding is intentional.
- Back up Supabase before destructive schema changes.

## // visual identity

```text
dashboard/public/brand/blunt38-banner.jpg
dashboard/public/brand/blunt38-logo.jpg
```

The code is documented. The 38 reasons are not.

<p align="center">
  <sub>always watching // still not explaining</sub>
</p>
