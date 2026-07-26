# 🎵 Zorin Music

A state-of-the-art, premium Discord Music Bot powered by **Lavalink v4** and built with **discord.js v14** and **TypeScript**.

---

## ✨ Features

- 🎧 **Smart Multi-Platform Search & Resolution**:
  - Automatically searches across **YouTube Music**, **Spotify**, **YouTube**, and **SoundCloud** with seamless fallback to guarantee the best audio quality.
  - Full support for Spotify tracks, albums, playlists, and developer API keys (`SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`).

- 🎛️ **Interactive Queue Control Panel**:
  - Detailed track cards with title, artist (`👤`), duration (`⏱️`), and requester (`👤 <@user>`).
  - Interactive Action Row buttons: `◀️ Prev`, `🔀 Shuffle`, `🗑️ Clear Queue`, `▶️ Next`.
  - Dropdown **Remove Track Select Menu** to delete any track from the queue in 1 click.

- 📻 **Multi-Node Lavalink Failover Pool**:
  - Built-in multi-node connection pool. If a primary Lavalink node closes or rate-limits (code `4000`), the bot automatically fails over to active backup nodes in milliseconds.

- ⏱️ **Live Now Playing Progress Bar**:
  - Live 5-second progress bar updates (`[▬▬▬▬▬▬▬▬🔘────────] 01:24 / 03:45`).
  - Automatically cleans up previous track embeds upon song skip or change.

- ⏳ **15-Minute Idle Voice Channel Saver**:
  - Stays in the voice channel after queue finishes. If no tracks are played for 15 minutes, it automatically leaves to conserve server resources and posts a clean notification.

- 🛠️ **Interactive Repair Menu (`/fix`)**:
  - Dropdown repair menu with 3 options: **Reconnect Bot**, **Recreate Player**, or **Change Voice Region**.

- 🧹 **Auto-Cleaning Messages**:
  - All status response embeds and their triggering prefix messages (`?play`, `?pause`, etc.) auto-delete after 5 seconds (or 3 seconds for `?volume`).
  - Help menu persists with an interactive `🗑️ Delete Menu` button.

- ⌨️ **Dual Command System**:
  - Full support for both Slash Commands (`/play`) and Prefix Commands (`?play`).

---

## 📦 Prerequisites

- **Node.js**: v20+ (v20.20.0+ recommended)
- **Lavalink Server**: v4 ([Lavalink GitHub](https://github.com/lavalink-devs/Lavalink))
- **Discord Bot**:
  - Bot Token
  - Client / Application ID
  - Privileged Intents enabled: **Message Content Intent**, **Server Members Intent**

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/zorin-music.git
cd zorin-music
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your `.env` configuration:

```env
# Discord Bot Credentials
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here           # Optional — for fast single-guild slash testing
DEFAULT_PREFIX=?

# Spotify Credentials (Optional — for Spotify search/tracks)
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# Lavalink Node Credentials
LAVALINK_NAME=MainNode
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
```

### 3. Launch the Bot

Zorin Music includes an automated bootstrapper (`index.js`) that performs pre-checks (Node version v20+, `.env` validation, TypeScript build verification) and auto-compiles if needed:

```bash
# Production / Pterodactyl / VPS
node index.js

# Or via npm
npm start
```

> **Slash Commands**: Automatically registered to Discord on bot startup!

---

## 🎹 Commands

### Music Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `/play <query>` | `?p` | Search & play across YouTube Music, Spotify, YouTube & SoundCloud |
| `/search <query>` | `?sr` | Search multi-platform and select from top 5 results |
| `/pause` | `?pa` | Pause current playback |
| `/resume` | `?rs`, `?unpause` | Resume paused playback |
| `/skip` | `?s`, `?sk`, `?next` | Skip current track |
| `/previous` | `?prev`, `?back` | Play the previous track |
| `/stop` | `?st`, `?dc` | Stop playback and disconnect |
| `/leave` | `?l`, `?bye` | Leave the voice channel |
| `/nowplaying` | `?np`, `?now` | Display live track info with progress bar |
| `/queue [page]` | `?q` | Interactive queue menu with pagination & remove track dropdown |
| `/remove <position>` | `?rm` | Remove a track from queue |
| `/loop [mode]` | `?lp` | Toggle loop (Off / Track / Queue) |
| `/shuffle` | `?sh`, `?mix` | Shuffle the queue |
| `/volume <0-150>` | `?v`, `?vol` | Adjust volume level (auto-deletes in 3s) |
| `/filter <preset>` | `?f`, `?fx`, `?eq` | Apply audio filter |
| `/fix` | `?repair` | Open interactive repair menu |

### Utility Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `/help` | `?h`, `?commands` | Show interactive help menu with Delete button |

---

## 🎛️ Audio Filters

| Filter | Effect |
|--------|--------|
| `none` | Remove all filters |
| `bassboost` | Enhanced bass frequencies |
| `nightcore` | Sped-up anime-style audio |
| `8d` | Rotating spatial 3D audio |
| `vaporwave` | Slowed, dreamy aesthetic |
| `tremolo` | Wobbling volume effect |
| `karaoke` | Vocal reduction |
| `pop` | Pop equalizer curve |
| `soft` | Gentle, relaxed playback |

---

## 🏗️ Project Structure

```text
zorin-music/
├── index.js                    # Automated pre-check & headless bootstrapper
├── src/
│   ├── index.ts                # TypeScript entry point
│   ├── config.ts               # Environment configuration
│   ├── deploy-commands.ts      # Slash command deployment utility
│   ├── types/
│   │   └── index.ts            # TypeScript definitions & interfaces
│   ├── structures/
│   │   ├── ZorinClient.ts      # Extended Discord Client with Shoukaku & node pool
│   │   └── MusicQueue.ts       # Guild queue manager with live updater & idle timer
│   ├── utils/
│   │   ├── embeds.ts           # Visual design system & embed factory
│   │   └── resolver.ts         # Multi-platform audio resolver (ytm, sp, yt, sc)
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
└── README.md
```

---

## 📝 License

MIT © **Zorin Music**
