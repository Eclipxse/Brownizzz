# Lavalink Music Server

This bot uses Lavalink as the audio backend. The Discord bot connects to Lavalink over `127.0.0.1:2333`, then Lavalink does the actual searching, loading, and voice audio work.

## What Works

- Song names through YouTube Music search.
- YouTube links and playlists.
- SoundCloud, Bandcamp, Twitch, Vimeo, direct HTTP audio links if the source supports the link.
- Spotify/Apple/Deezer links only after you enable LavaSrc and add Spotify developer credentials. Spotify is used for metadata and matching, not ripping audio from Spotify.

## VPS Install

Run these on the Ubuntu VPS:

```bash
sudo apt update
sudo apt install -y openjdk-17-jre-headless ffmpeg curl
java -version
```

Create the Lavalink folder:

```bash
sudo mkdir -p /opt/lavalink
sudo chown -R $USER:$USER /opt/lavalink
cd /opt/lavalink
curl -L -o Lavalink.jar https://github.com/lavalink-devs/Lavalink/releases/latest/download/Lavalink.jar
```

Copy `lavalink/application.example.yml` from this project to `/opt/lavalink/application.yml`, then start it:

```bash
cd /opt/lavalink
java -Djava.net.preferIPv4Stack=true -Xms256M -Xmx1G -jar Lavalink.jar
```

If it says the server started on port `2333`, Lavalink is alive.

## Keep It Running With systemd

Create `/etc/systemd/system/lavalink.service`:

```ini
[Unit]
Description=Lavalink Music Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/lavalink
ExecStart=/usr/bin/java -Djava.net.preferIPv4Stack=true -Xms256M -Xmx1G -jar /opt/lavalink/Lavalink.jar
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
```

Enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lavalink
sudo systemctl status lavalink
```

Logs:

```bash
journalctl -u lavalink -f
```

## Bot `.env`

Use these values when Lavalink runs on the same VPS as the bot:

```env
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
MUSIC_SEARCH_SOURCE=ytsearch
MUSIC_DEFAULT_VOLUME=80
```

The `LAVALINK_PASSWORD` must match `lavalink.server.password` in `application.yml`.

## Spotify Links

For Spotify links:

1. Create a free app at `https://developer.spotify.com/dashboard`.
2. Copy the client ID and client secret.
3. Uncomment the LavaSrc plugin and `plugins.lavasrc` block in `application.yml`.
4. Paste the Spotify credentials.
5. Restart Lavalink.

Spotify links resolve metadata and then Lavalink searches playable sources for matching audio.
