# 🎵 Zorin Music

A premium, feature-rich Discord Music Bot powered by **Lavalink** and built with **discord.js v14** and **TypeScript**.

---

## ✨ Features

- 🎶 **Play** from YouTube, SoundCloud, Spotify, and direct URLs
- 🔍 **Search** with interactive result selection
- 📋 **Queue** management with pagination
- 🔁 **Loop** modes (Off / Track / Queue)
- 🔀 **Shuffle** upcoming tracks
- 🔊 **Volume** control with visual indicators
- 🎛️ **Audio Filters** — Bassboost, Nightcore, 8D, Vaporwave, Tremolo, Karaoke, and more
- ⏮️ **Previous** track support with play history
- 🛠️ **Fix** command to repair broken voice connections
- 🎨 **Beautiful embeds** with artwork, progress bars, and branding
- ⌨️ **Dual command support** — both Slash Commands (`/play`) and Prefix Commands (`!play`)

---

## 📦 Prerequisites

- **Node.js** 18+ (LTS recommended)
- **A Lavalink Server** v3 or v4 ([Lavalink GitHub](https://github.com/lavalink-devs/Lavalink))
- **A Discord Bot** with the following:
  - Bot Token
  - Application/Client ID
  - Privileged intents enabled: **Message Content Intent**, **Server Members Intent**

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
cd cli
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_test_guild_id   # Optional — for fast slash command testing
DEFAULT_PREFIX=!

LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
LAVALINK_NAME=Main
```

### 3. Register Slash Commands

```bash
npm run deploy
```

> **Note:** If `GUILD_ID` is set, commands register instantly for that guild. Otherwise, they register globally (may take up to 1 hour to propagate).

### 4. Start the Bot

```bash
# Development (with ts-node)
npm run dev

# Production
npm run build
npm start
```

---

## 🎹 Commands

### Music

| Command | Aliases | Description |
|---------|---------|-------------|
| `/play <query>` | `!p` | Play a song or playlist |
| `/search <query>` | `!sr` | Search and select from top results |
| `/pause` | `!pa` | Pause current playback |
| `/resume` | `!rs`, `!unpause` | Resume paused playback |
| `/skip` | `!s`, `!sk`, `!next` | Skip current track |
| `/previous` | `!prev`, `!back` | Play the previous track |
| `/stop` | `!st`, `!dc` | Stop playback and disconnect |
| `/leave` | `!l`, `!bye` | Leave the voice channel |
| `/nowplaying` | `!np`, `!now` | Show current track info |
| `/queue [page]` | `!q` | Display the queue |
| `/remove <position>` | `!rm` | Remove a track from queue |
| `/loop [mode]` | `!lp` | Toggle loop (Off/Track/Queue) |
| `/shuffle` | `!sh`, `!mix` | Shuffle the queue |
| `/volume <0-150>` | `!v`, `!vol` | Set volume level |
| `/filter <preset>` | `!f`, `!fx`, `!eq` | Apply audio filter |
| `/fix` | `!repair` | Repair voice connection |

### Utility

| Command | Aliases | Description |
|---------|---------|-------------|
| `/help` | `!h`, `!commands` | Show all commands |

---

## 🎛️ Audio Filters

| Filter | Effect |
|--------|--------|
| `none` | Remove all filters |
| `bassboost` | Enhanced bass frequencies |
| `nightcore` | Sped-up anime-style audio |
| `8d` | Rotating spatial audio |
| `vaporwave` | Slowed, dreamy aesthetic |
| `tremolo` | Wobbling volume effect |
| `karaoke` | Vocal reduction |
| `pop` | Pop EQ curve |
| `soft` | Gentle, relaxed playback |

---

## 🏗️ Project Structure

```
cli/
├── src/
│   ├── index.ts                  # Entry point
│   ├── config.ts                 # Environment config
│   ├── deploy-commands.ts        # Slash command registration
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── structures/
│   │   ├── ZorinClient.ts        # Extended Discord client
│   │   └── MusicQueue.ts         # Per-guild queue manager
│   ├── utils/
│   │   └── embeds.ts             # Embed factory & styling
│   ├── events/
│   │   └── discord/
│   │       ├── ready.ts
│   │       ├── interactionCreate.ts
│   │       └── messageCreate.ts
│   └── commands/
│       ├── music/
│       │   ├── play.ts
│       │   ├── search.ts
│       │   ├── pause.ts
│       │   ├── resume.ts
│       │   ├── skip.ts
│       │   ├── previous.ts
│       │   ├── stop.ts
│       │   ├── leave.ts
│       │   ├── nowplaying.ts
│       │   ├── queue.ts
│       │   ├── remove.ts
│       │   ├── loop.ts
│       │   ├── shuffle.ts
│       │   ├── volume.ts
│       │   ├── filter.ts
│       │   └── fix.ts
│       └── utility/
│           └── help.ts
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

---

## 📝 License

MIT © Zorin Music
