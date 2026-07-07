import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import { createServer, type Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { env } from "../env.js";

const DRAW_SECONDS = 80;
const CHOOSE_SECONDS = 16;
const ROUND_BREAK_SECONDS = 7;
const ROOM_TTL_MS = 1000 * 60 * 60 * 3;

type GamePhase = "lobby" | "choosing" | "drawing" | "roundEnd" | "finished";

type DrawTool = "brush" | "eraser";

type DrawPoint = {
  x: number;
  y: number;
};

type DrawEvent = {
  type: "begin" | "move" | "end";
  point?: DrawPoint;
  color?: string;
  size?: number;
  tool?: DrawTool;
};

type GamePlayer = {
  id: string;
  name: string;
  avatarColor: string;
  score: number;
  guessed: boolean;
  connected: boolean;
  joinedAt: number;
};

type GameGuess = {
  id: string;
  playerName: string;
  text: string;
  correct: boolean;
  system?: boolean;
  createdAt: number;
};

type DrawRoom = {
  code: string;
  guildId: string;
  channelId: string;
  hostId: string;
  createdAt: number;
  phase: GamePhase;
  round: number;
  maxRounds: number;
  turnIndex: number;
  drawerId?: string;
  word?: string;
  choices: string[];
  deadline?: number;
  players: Map<string, GamePlayer>;
  strokes: DrawEvent[];
  guesses: GameGuess[];
  timer?: NodeJS.Timeout;
};

type PublicPlayer = Omit<GamePlayer, "joinedAt"> & {
  isDrawer: boolean;
};

type RoomState = {
  code: string;
  phase: GamePhase;
  round: number;
  maxRounds: number;
  deadline?: number;
  players: PublicPlayer[];
  guesses: GameGuess[];
  wordHint: string;
  secretWord?: string;
  choices?: string[];
  drawerId?: string;
  drawerName?: string;
  me?: string;
};

const rooms = new Map<string, DrawRoom>();
let serverStarted = false;
let httpServer: HttpServer | null = null;

const words = [
  "brownie",
  "pancake",
  "headphones",
  "castle",
  "moonlight",
  "arcade",
  "rocket",
  "dragon",
  "bubble tea",
  "paint brush",
  "treasure",
  "snowman",
  "pizza",
  "guitar",
  "rainbow",
  "wizard",
  "sunglasses",
  "waterfall",
  "cupcake",
  "skateboard",
  "spaceship",
  "crown",
  "campfire",
  "robot",
  "camera",
  "flower field",
  "popcorn",
  "pirate ship",
  "thunder",
  "honey jar",
  "beach",
  "lantern",
  "ghost",
  "donut",
  "cloud city",
  "microphone"
];

export function startDrawGameServer() {
  if (serverStarted || !env.drawGameEnabled) return;

  const app = express();
  const publicRoot = path.join(process.cwd(), "public", "draw");
  const brandRoot = path.join(process.cwd(), "dashboard", "public", "brand");

  app.use("/draw", express.static(publicRoot));
  app.use("/brand", express.static(brandRoot));
  app.get("/draw/room/:roomCode", (_request, response) => {
    response.sendFile(path.join(publicRoot, "index.html"));
  });
  app.get("/draw/health", (_request, response) => {
    response.json({ ok: true, rooms: rooms.size });
  });

  httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: false
    }
  });

  io.on("connection", (socket) => {
    socket.on("join-room", (payload: { roomCode?: string; name?: string; avatarColor?: string }) => {
      const roomCode = normalizeRoomCode(payload.roomCode);
      const room = roomCode ? rooms.get(roomCode) : undefined;
      if (!room) {
        socket.emit("game-error", "That draw room does not exist or already expired.");
        return;
      }

      const player = getOrCreatePlayer(room, socket, payload.name, payload.avatarColor);
      socket.join(room.code);
      socket.data.roomCode = room.code;
      addSystemGuess(room, `${player.name} joined the studio.`);
      emitState(io, room);
      socket.emit("canvas-history", room.strokes);
    });

    socket.on("start-game", () => {
      const room = getSocketRoom(socket);
      if (!room || room.phase !== "lobby") return;
      if (activePlayers(room).length < 2) {
        socket.emit("game-error", "Need at least 2 players to start.");
        return;
      }
      startChoosing(io, room);
    });

    socket.on("choose-word", (payload: { word?: string }) => {
      const room = getSocketRoom(socket);
      if (!room || room.phase !== "choosing" || room.drawerId !== socket.id) return;
      const word = sanitizeWord(payload.word);
      if (!word || !room.choices.includes(word)) return;
      startDrawing(io, room, word);
    });

    socket.on("draw-event", (event: DrawEvent) => {
      const room = getSocketRoom(socket);
      if (!room || room.phase !== "drawing" || room.drawerId !== socket.id) return;
      const cleanEvent = sanitizeDrawEvent(event);
      if (!cleanEvent) return;
      room.strokes.push(cleanEvent);
      socket.to(room.code).emit("draw-event", cleanEvent);
    });

    socket.on("clear-canvas", () => {
      const room = getSocketRoom(socket);
      if (!room || room.phase !== "drawing" || room.drawerId !== socket.id) return;
      room.strokes = [];
      io.to(room.code).emit("canvas-clear");
    });

    socket.on("guess", (payload: { text?: string }) => {
      const room = getSocketRoom(socket);
      const player = room?.players.get(socket.id);
      if (!room || !player || room.phase !== "drawing" || room.drawerId === socket.id) return;

      const guess = sanitizeGuess(payload.text);
      if (!guess) return;

      const correct = Boolean(room.word && normalizeGuess(guess) === normalizeGuess(room.word));
      const entry: GameGuess = {
        id: crypto.randomUUID(),
        playerName: player.name,
        text: correct ? "guessed the word" : guess,
        correct,
        createdAt: Date.now()
      };
      room.guesses.push(entry);

      if (correct && !player.guessed) {
        player.guessed = true;
        const remaining = room.deadline ? Math.max(0, room.deadline - Date.now()) : 0;
        player.score += 140 + Math.ceil(remaining / 1000) * 5;

        const drawer = room.drawerId ? room.players.get(room.drawerId) : undefined;
        if (drawer) drawer.score += 45;
      }

      emitState(io, room);

      if (activePlayers(room).filter((candidate) => candidate.id !== room.drawerId).every((candidate) => candidate.guessed)) {
        endRound(io, room);
      }
    });

    socket.on("disconnect", () => {
      const room = getSocketRoom(socket);
      const player = room?.players.get(socket.id);
      if (!room || !player) return;
      player.connected = false;
      addSystemGuess(room, `${player.name} left the studio.`);
      emitState(io, room);
    });
  });

  httpServer.listen(env.drawGamePort, () => {
    serverStarted = true;
    console.log(`Draw game server listening on port ${env.drawGamePort}.`);
  });

  setInterval(cleanupRooms, 1000 * 60 * 15).unref();
}

export function stopDrawGameServer() {
  if (!httpServer) return;
  httpServer.close();
  httpServer = null;
  serverStarted = false;
}

export function createDrawRoom(input: { guildId: string; channelId: string; hostId: string; maxRounds?: number }) {
  const code = createRoomCode();
  const maxRounds = Math.max(1, Math.min(8, input.maxRounds ?? 3));
  const room: DrawRoom = {
    code,
    guildId: input.guildId,
    channelId: input.channelId,
    hostId: input.hostId,
    createdAt: Date.now(),
    phase: "lobby",
    round: 0,
    maxRounds,
    turnIndex: -1,
    choices: [],
    players: new Map(),
    strokes: [],
    guesses: []
  };

  rooms.set(code, room);

  return {
    code,
    url: `${env.drawGamePublicUrl.replace(/\/$/, "")}/draw/room/${code}`
  };
}

function getOrCreatePlayer(room: DrawRoom, socket: Socket, name?: string, avatarColor?: string) {
  const existing = room.players.get(socket.id);
  if (existing) {
    existing.connected = true;
    return existing;
  }

  const cleanName = sanitizeName(name) || `Player ${room.players.size + 1}`;
  const player: GamePlayer = {
    id: socket.id,
    name: cleanName,
    avatarColor: sanitizeColor(avatarColor),
    score: 0,
    guessed: false,
    connected: true,
    joinedAt: Date.now()
  };
  room.players.set(socket.id, player);
  return player;
}

function startChoosing(io: Server, room: DrawRoom) {
  clearRoomTimer(room);
  const players = activePlayers(room);
  if (players.length < 2) {
    room.phase = "lobby";
    emitState(io, room);
    return;
  }

  room.phase = "choosing";
  room.round += 1;
  room.turnIndex = (room.turnIndex + 1) % players.length;
  room.drawerId = players[room.turnIndex]?.id;
  room.choices = randomWords(3);
  room.word = undefined;
  room.strokes = [];
  room.guesses = [];
  room.deadline = Date.now() + CHOOSE_SECONDS * 1000;
  for (const player of players) player.guessed = false;
  io.to(room.code).emit("canvas-clear");
  emitState(io, room);

  room.timer = setTimeout(() => {
    startDrawing(io, room, room.choices[0] ?? randomWords(1)[0] ?? "brownie");
  }, CHOOSE_SECONDS * 1000);
  room.timer.unref();
}

function startDrawing(io: Server, room: DrawRoom, word: string) {
  clearRoomTimer(room);
  room.phase = "drawing";
  room.word = word;
  room.deadline = Date.now() + DRAW_SECONDS * 1000;
  room.guesses = [];
  emitState(io, room);

  room.timer = setTimeout(() => endRound(io, room), DRAW_SECONDS * 1000);
  room.timer.unref();
}

function endRound(io: Server, room: DrawRoom) {
  if (room.phase !== "drawing" && room.phase !== "choosing") return;
  clearRoomTimer(room);
  room.phase = room.round >= room.maxRounds ? "finished" : "roundEnd";
  room.deadline = Date.now() + ROUND_BREAK_SECONDS * 1000;
  emitState(io, room);

  if (room.phase === "roundEnd") {
    room.timer = setTimeout(() => startChoosing(io, room), ROUND_BREAK_SECONDS * 1000);
    room.timer.unref();
  }
}

function emitState(io: Server, room: DrawRoom) {
  for (const socketId of room.players.keys()) {
    const playerSocket = io.sockets.sockets.get(socketId);
    if (!playerSocket) continue;
    playerSocket.emit("room-state", buildState(room, socketId));
  }
}

function buildState(room: DrawRoom, socketId: string): RoomState {
  const drawer = room.drawerId ? room.players.get(room.drawerId) : undefined;
  const isDrawer = room.drawerId === socketId;

  return {
    code: room.code,
    phase: room.phase,
    round: room.round,
    maxRounds: room.maxRounds,
    deadline: room.deadline,
    players: activePlayers(room).map((player) => ({
      id: player.id,
      name: player.name,
      avatarColor: player.avatarColor,
      score: player.score,
      guessed: player.guessed,
      connected: player.connected,
      isDrawer: player.id === room.drawerId
    })),
    guesses: room.guesses.slice(-32),
    wordHint: room.word ? maskWord(room.word, isDrawer || room.phase === "roundEnd" || room.phase === "finished") : "",
    secretWord: isDrawer ? room.word : undefined,
    choices: isDrawer && room.phase === "choosing" ? room.choices : undefined,
    drawerId: room.drawerId,
    drawerName: drawer?.name,
    me: socketId
  };
}

function getSocketRoom(socket: Socket) {
  const roomCode = typeof socket.data.roomCode === "string" ? socket.data.roomCode : "";
  return rooms.get(roomCode);
}

function activePlayers(room: DrawRoom) {
  return [...room.players.values()].filter((player) => player.connected);
}

function addSystemGuess(room: DrawRoom, text: string) {
  room.guesses.push({
    id: crypto.randomUUID(),
    playerName: "Studio",
    text,
    correct: false,
    system: true,
    createdAt: Date.now()
  });
}

function createRoomCode() {
  for (let index = 0; index < 20; index += 1) {
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    if (!rooms.has(code)) return code;
  }
  return crypto.randomUUID().slice(0, 6).toUpperCase();
}

function randomWords(count: number) {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function clearRoomTimer(room: DrawRoom) {
  if (!room.timer) return;
  clearTimeout(room.timer);
  room.timer = undefined;
}

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt < ROOM_TTL_MS) continue;
    clearRoomTimer(room);
    rooms.delete(code);
  }
}

function normalizeRoomCode(value?: string) {
  return value?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

function sanitizeName(value?: string) {
  return value?.trim().replace(/\s+/g, " ").slice(0, 20);
}

function sanitizeColor(value?: string) {
  if (value && /^#[0-9a-f]{6}$/i.test(value)) return value;
  const palette = ["#ff8fb4", "#5ed7ff", "#ffe66d", "#9cff8f", "#c9a6ff", "#ffb86b"];
  return palette[Math.floor(Math.random() * palette.length)] ?? "#ff8fb4";
}

function sanitizeWord(value?: string) {
  return value?.trim().toLowerCase();
}

function sanitizeGuess(value?: string) {
  return value?.trim().replace(/\s+/g, " ").slice(0, 80);
}

function normalizeGuess(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sanitizeDrawEvent(event: DrawEvent) {
  if (!event || (event.type !== "begin" && event.type !== "move" && event.type !== "end")) return null;

  const clean: DrawEvent = { type: event.type };
  if (event.point) {
    clean.point = {
      x: clampNumber(event.point.x, 0, 1),
      y: clampNumber(event.point.y, 0, 1)
    };
  }

  if (event.color && /^#[0-9a-f]{6}$/i.test(event.color)) clean.color = event.color;
  if (typeof event.size === "number") clean.size = clampNumber(event.size, 2, 42);
  if (event.tool === "eraser" || event.tool === "brush") clean.tool = event.tool;

  return clean;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function maskWord(word: string, reveal: boolean) {
  if (reveal) return word;
  return word
    .split("")
    .map((character) => (character === " " ? " / " : "_"))
    .join(" ");
}
