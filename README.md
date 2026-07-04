<p align="center">
  <img src="dashboard/public/brand/brownie-cloud.png" alt="Browniezzz banner" width="100%" />
</p>

<p align="center">
  <img src="dashboard/public/brand/brownie-icon.png" alt="Browniezzz icon" width="96" />
</p>

<h1 align="center">Browniezzz Discord Bot</h1>

<p align="center">
  A premium, UI-first Discord bot with moderation, welcome systems, AI replies, tickets, leveling, giveaways, music, and a web dashboard.
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-38dff8?style=for-the-badge&labelColor=111827" />
  <img alt="discord.js" src="https://img.shields.io/badge/discord.js-v14-8d7aff?style=for-the-badge&labelColor=111827" />
  <img alt="Next.js" src="https://img.shields.io/badge/Dashboard-Next.js-a7f950?style=for-the-badge&labelColor=111827" />
  <img alt="Storage" src="https://img.shields.io/badge/Storage-Supabase-ffbf47?style=for-the-badge&labelColor=111827" />
  <img alt="Music" src="https://img.shields.io/badge/Music-Lavalink-ff5d7d?style=for-the-badge&labelColor=111827" />
</p>

<p align="center">
  <img src="dashboard/public/brand/brownie-welcome.png" alt="Welcome to Brownie" width="100%" />
</p>

## What Is Browniezzz?

Browniezzz is a full-service Discord bot made for community servers that need more than a few basic commands. It includes setup panels, button-driven flows, configurable server systems, AI replies, and Lavalink-powered music playback.

The project also ships with a separate web dashboard in `dashboard/`, so server admins can configure the bot from a browser instead of only using slash commands.

## Core Stack

| Layer | Tech | Why it exists |
| --- | --- | --- |
| Bot runtime | Node.js + TypeScript | Strong typing and fast development |
| Discord API | `discord.js` v14 | Slash commands, embeds, buttons, modals, channel/role selectors |
| AI providers | Groq, OpenRouter, OpenAI-compatible APIs | Fast AI replies and configurable personas |
| Music engine | Lavalink | Stable voice playback without overloading the bot process |
| Database | Supabase Postgres or local JSON | Production storage with quick local testing fallback |
| Dashboard | Next.js | Browser-based admin control panel |
| Process manager | PM2 | VPS uptime and restarts |

## Feature Map

| System | Included |
| --- | --- |
| Setup UI | Button-based `/setup` panel with channel selects, role selects, modals, and reset controls |
| Welcome | Custom welcome channel, welcome text, autorole, verified role, birthday channel |
| AI | `/ai ask`, channel-limited auto replies, custom prompt, personas, Groq/OpenRouter/OpenAI support |
| Music | Lavalink playback, queue, pause, resume, skip, stop, shuffle, volume, loop, now playing |
| Tickets | Ticket panel, category routing, ticket modal, claim, lock, transcript, close confirmation |
| Moderation | Warn, timeout, kick, ban, history, mod-case storage |
| Giveaways | Button entry, winner count, automatic ending, database-backed entrants |
| Polls | Multi-option polls with live vote buttons |
| Suggestions | Suggestion modal with approve, deny, and discuss actions |
| Leveling | XP, rank card, leaderboard, level-up channel |
| Temp Voice | Join-to-create voice channels and empty-channel cleanup |
| Roles | Admin give/remove role commands and dropdown self-role panels |
| Embeds | Modal-powered embed builder |
| Birthdays | Birthday storage and daily birthday announcements |
| Server Tools | Server info, user info, emoji manager, sticker manager |
| Mini Games | Coinflip, dice, Rock Paper Scissors buttons |
| Dashboard | Discord OAuth, server selector, live Discord roles/channels, Supabase config saves |

## Architecture

```mermaid
flowchart LR
  Admin["Discord Admin"] --> Dashboard["Next.js Dashboard"]
  Admin --> Discord["Discord Slash Commands"]
  Dashboard --> OAuth["Discord OAuth"]
  Dashboard --> BotAPI["Discord Bot API"]
  Dashboard --> DB["Supabase Postgres"]
  Discord --> Bot["Browniezzz Bot"]
  Bot --> DB
  Bot --> AI["Groq / OpenRouter / OpenAI"]
  Bot --> Lava["Lavalink"]
  Lava --> Voice["Discord Voice"]
```

## Project Structure

```text
.
├── src/                         # Discord bot source
│   ├── commands/                # Slash commands
│   ├── interactions/            # Button/select/modal handlers
│   ├── services/                # Store, AI, music, giveaways, messages
│   └── utils/                   # Shared helpers
├── dashboard/                   # Next.js web dashboard
│   ├── public/brand/            # Browniezzz images used by README and site
│   └── src/app/api/             # OAuth, session, guild config API routes
├── lavalink/                    # Lavalink config example and setup notes
├── supabase/migrations/         # Postgres schema
├── .env.example                 # Bot env template
└── README.md
```

## Quick Start For Local Testing

```bash
npm install
copy .env.example .env
npm run dev
```

Put your bot token in `.env`:

```env
DISCORD_TOKEN=your_bot_token
```

For faster slash-command updates while testing, set:

```env
DISCORD_GUILD_ID=your_test_server_id
REGISTER_COMMANDS_ON_START=true
```

If `DISCORD_GUILD_ID` is empty, commands register globally and can take longer to appear.

## Discord Developer Portal Setup

Create or open your app in the Discord Developer Portal.

Recommended bot settings:

| Setting | Value |
| --- | --- |
| Public Bot | On |
| Requires OAuth2 Code Grant | Off |
| Presence Intent | Off unless needed |
| Server Members Intent | On |
| Message Content Intent | On only if AI auto-replies to normal messages |

Invite scopes:

```text
bot
applications.commands
```

For testing, invite with Administrator permission. For production, reduce permissions later based on which modules you enable.

## Storage Modes

### Local JSON

Good for quick testing:

```env
STORAGE_DRIVER=json
```

### Supabase Postgres

Recommended for production:

```env
STORAGE_DRIVER=postgres
DATABASE_URL=postgresql://postgres.project_ref:password@aws-1-region.pooler.supabase.com:5432/postgres
```

Apply the schema from:

```text
supabase/migrations/001_discord_bot_core_schema.sql
```

The bot stores guild config, mod cases, polls, role panels, giveaways, levels, birthdays, and temp voice channels.

## AI Setup

Browniezzz supports multiple OpenAI-compatible providers.

### Groq

Fastest recommended option for Discord replies:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
AI_MAX_TOKENS=140
AI_TIMEOUT_MS=15000
ENABLE_MESSAGE_CONTENT_INTENT=true
```

### OpenRouter

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openrouter/free
OPENROUTER_APP_NAME=Browniezzz
AI_MAX_TOKENS=140
AI_TIMEOUT_MS=15000
ENABLE_MESSAGE_CONTENT_INTENT=true
```

Use a chat model for replies. Rerank models are for sorting documents and will not generate normal Discord chat responses.

### OpenAI-Compatible

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.4-mini
ENABLE_MESSAGE_CONTENT_INTENT=true
```

Useful AI commands:

```text
/ai ask
/ai setup
/ai persona
/ai prompt
/ai disable
```

Auto replies only happen in the channel configured by an admin. Users can still use `/ai ask` anywhere.

## Music Setup

Music uses Lavalink as a separate Java process.

Bot env:

```env
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
MUSIC_SEARCH_SOURCE=ytsearch
MUSIC_DEFAULT_VOLUME=80
```

Start Lavalink first, then start the bot.

```bash
java -Xmx1G -jar Lavalink.jar
```

For VPS service setup, see:

```text
lavalink/README.md
```

Music commands:

```text
/music play
/music pause
/music resume
/music skip
/music stop
/music queue
/music nowplaying
/music volume
/music loop
/music shuffle
/music remove
```

YouTube and YouTube Music search work through the Lavalink YouTube plugin. Spotify, Apple Music, and Deezer links require extra Lavalink plugins and credentials.

## Web Dashboard

The dashboard is in:

```text
dashboard/
```

It provides:

| Dashboard Area | What it controls |
| --- | --- |
| Overview | Server config health, quick switches, logs |
| AI | AI channel, auto-reply toggle, persona, custom prompt |
| Welcome | Welcome channel, message, autorole, verified role, birthday channel |
| Support | Ticket category, support role, temp voice settings, log channel |
| Levels | Leveling toggle and level-up channel |
| Music | Lavalink music defaults and DJ-role mapping |

Dashboard env:

```env
DISCORD_CLIENT_ID=your_discord_application_client_id
DISCORD_CLIENT_SECRET=your_discord_oauth_client_secret
DISCORD_TOKEN=your_bot_token
DASHBOARD_BASE_URL=http://your_server_ip_or_domain:3000
DASHBOARD_SESSION_SECRET=replace_with_a_long_random_secret
DATABASE_URL=postgresql://postgres.project_ref:password@aws-1-region.pooler.supabase.com:5432/postgres
```

Discord OAuth redirect URI:

```text
http://your_server_ip_or_domain:3000/api/auth/callback
```

Local dashboard:

```bash
cd dashboard
npm install
copy .env.example .env
npm run dev
```

Production dashboard:

```bash
cd dashboard
npm ci
npm run build
pm2 start npm --name browniezzz-dashboard -- start -- -p 3000
pm2 save
```

## VPS Deployment Flow

Recommended layout:

```text
/opt/browniezzz       # bot + dashboard
/opt/lavalink         # Lavalink jar + application.yml
```

Install runtime:

```bash
apt update
apt install -y git curl unzip openjdk-17-jre
```

Install Node with `nvm`, then use Node 24:

```bash
nvm install 24
nvm use 24
node -v
npm -v
```

Clone and build:

```bash
cd /opt
git clone https://github.com/Eclipxse/Brownizzz.git browniezzz
cd /opt/browniezzz
npm ci
npm run build
```

Start bot:

```bash
pm2 start dist/index.js --name browniezzz-bot
pm2 save
```

Start dashboard:

```bash
cd /opt/browniezzz/dashboard
npm ci
npm run build
pm2 start npm --name browniezzz-dashboard -- start -- -p 3000
pm2 save
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs browniezzz-bot
pm2 logs browniezzz-dashboard
pm2 restart browniezzz-bot --update-env
pm2 restart browniezzz-dashboard --update-env
```

## Main Commands

| Category | Commands |
| --- | --- |
| Setup | `/setup`, `/welcome`, `/role`, `/role-panel` |
| AI | `/ai ask`, `/ai setup`, `/ai persona`, `/ai prompt`, `/ai disable` |
| Moderation | `/moderate`, `/userinfo`, `/serverinfo` |
| Tickets | `/ticket-panel` |
| Events | `/giveaway`, `/poll`, `/suggest-panel`, `/birthday` |
| Levels | `/leveling`, `/rank`, `/leaderboard` |
| Utility | `/embed create`, `/emoji`, `/sticker` |
| Fun | `/minigame` |
| Music | `/music play`, `/music queue`, `/music nowplaying`, `/music skip`, `/music stop` |

## Hosting Size

| Use case | VPS size |
| --- | --- |
| Bot without music | 1 vCPU, 1 GB RAM |
| Bot with music | 1 vCPU, 2 GB RAM |
| Bot + dashboard + Lavalink | 2 vCPU, 4 GB RAM |

Your existing 4 GB RAM VPS is enough for the bot, dashboard, Lavalink, and a small website if traffic is normal.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Slash command says application did not respond | Check bot logs with `pm2 logs browniezzz-bot` |
| AI command fails | Check `AI_PROVIDER`, API key, model name, and rate limits |
| AI auto reply does nothing | Enable Message Content Intent and configure `/ai setup` |
| Lavalink offline | Start Lavalink and verify `curl -H "Authorization: youshallnotpass" http://127.0.0.1:2333/v4/info` |
| Supabase auth failed | Use the exact pooler connection string and URL-encode special password characters |
| Dashboard login fails | Check Discord OAuth redirect URI and `DASHBOARD_BASE_URL` |
| Dashboard shows no servers | Bot must be in the server and your Discord account needs Manage Server or Administrator |

## Safety Notes

- Never commit `.env`.
- Rotate leaked Discord tokens immediately.
- Keep the bot token server-side only.
- Use Supabase Postgres for client/server production use.
- Do not run multiple bot processes with the same token unless you know why.

## Brand Assets

The Browniezzz assets used by the README and dashboard live here:

```text
dashboard/public/brand/brownie-cloud.png
dashboard/public/brand/brownie-icon.png
dashboard/public/brand/brownie-welcome.png
```

These images are loaded by the website and rendered directly in this README.
