const socket = io();

const roomCode = window.location.pathname.split("/").filter(Boolean).pop()?.toUpperCase() || "";
const colors = ["#24120d", "#ff4e8a", "#62c7ff", "#8dffba", "#ffc83d", "#aa7cff", "#ff7a3d", "#ffffff"];

const elements = {
  roomCode: document.querySelector("#roomCode"),
  phaseText: document.querySelector("#phaseText"),
  timerText: document.querySelector("#timerText"),
  roundText: document.querySelector("#roundText"),
  playersCount: document.querySelector("#playersCount"),
  playersList: document.querySelector("#playersList"),
  guessList: document.querySelector("#guessList"),
  guessForm: document.querySelector("#guessForm"),
  guessInput: document.querySelector("#guessInput"),
  wordHint: document.querySelector("#wordHint"),
  drawerBadge: document.querySelector("#drawerBadge"),
  choices: document.querySelector("#choices"),
  overlay: document.querySelector("#overlay"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayBody: document.querySelector("#overlayBody"),
  startGameBtn: document.querySelector("#startGameBtn"),
  toolbar: document.querySelector("#toolbar"),
  colors: document.querySelector("#colors"),
  brushSize: document.querySelector("#brushSize"),
  brushBtn: document.querySelector("#brushBtn"),
  eraserBtn: document.querySelector("#eraserBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  joinGate: document.querySelector("#joinGate"),
  joinForm: document.querySelector("#joinForm"),
  playerName: document.querySelector("#playerName"),
  board: document.querySelector("#board")
};

const ctx = elements.board.getContext("2d");
let state = null;
let selectedColor = colors[0];
let selectedTool = "brush";
let drawing = false;
let lastPoint = null;
let history = [];

elements.roomCode.textContent = roomCode || "------";

setupCanvas();
renderSwatches();

elements.joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.playerName.value.trim();
  if (!name) return;
  localStorage.setItem("brownie_draw_name", name);
  socket.emit("join-room", {
    roomCode,
    name,
    avatarColor: randomAvatarColor(name)
  });
  elements.joinGate.classList.add("hidden");
});

const savedName = localStorage.getItem("brownie_draw_name");
if (savedName) elements.playerName.value = savedName;

elements.startGameBtn.addEventListener("click", () => {
  socket.emit("start-game");
});

elements.guessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = elements.guessInput.value.trim();
  if (!text) return;
  socket.emit("guess", { text });
  elements.guessInput.value = "";
});

elements.brushBtn.addEventListener("click", () => setTool("brush"));
elements.eraserBtn.addEventListener("click", () => setTool("eraser"));
elements.clearBtn.addEventListener("click", () => {
  if (!canDraw()) return;
  clearCanvas();
  socket.emit("clear-canvas");
});

socket.on("room-state", (nextState) => {
  state = nextState;
  renderState();
});

socket.on("draw-event", (event) => {
  history.push(event);
  applyDrawEvent(event);
});

socket.on("canvas-history", (events) => {
  history = Array.isArray(events) ? events : [];
  replayCanvas();
});

socket.on("canvas-clear", () => {
  history = [];
  clearCanvas();
});

socket.on("game-error", (message) => {
  elements.overlay.classList.remove("hidden");
  elements.overlayTitle.textContent = "Room issue";
  elements.overlayBody.textContent = message;
  elements.startGameBtn.classList.add("hidden");
});

setInterval(() => {
  if (!state?.deadline) {
    elements.timerText.textContent = "--";
    return;
  }
  const seconds = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
  elements.timerText.textContent = `${seconds}s`;
}, 250);

function renderState() {
  elements.phaseText.textContent = labelPhase(state.phase);
  elements.roundText.textContent = `${state.round}/${state.maxRounds}`;
  elements.playersCount.textContent = `${state.players.length}`;
  elements.wordHint.textContent = state.secretWord || state.wordHint || "Waiting...";
  elements.drawerBadge.textContent = state.drawerName ? `Drawing: ${state.drawerName}` : "No drawer yet";

  const isDrawer = state.me === state.drawerId;
  const isDrawing = state.phase === "drawing";
  elements.toolbar.classList.toggle("locked", !(isDrawer && isDrawing));
  elements.guessInput.disabled = isDrawer || !isDrawing;
  elements.guessInput.placeholder = isDrawer ? "You are drawing" : "Type a guess";

  renderPlayers();
  renderGuesses();
  renderChoices();
  renderOverlay();
}

function renderPlayers() {
  elements.playersList.innerHTML = "";
  const players = [...state.players].sort((a, b) => b.score - a.score);
  for (const player of players) {
    const card = document.createElement("div");
    card.className = "player-card";

    const avatar = document.createElement("div");
    avatar.className = "avatar-dot";
    avatar.style.background = player.avatarColor;
    avatar.textContent = player.name.slice(0, 1).toUpperCase();

    const main = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = player.name;
    const meta = document.createElement("div");
    meta.className = "player-meta";
    if (player.isDrawer) meta.append(tag("Drawer"));
    if (player.guessed) meta.append(tag("Guessed"));
    main.append(name, meta);

    const score = document.createElement("strong");
    score.textContent = `${player.score}`;

    card.append(avatar, main, score);
    elements.playersList.append(card);
  }
}

function renderGuesses() {
  elements.guessList.innerHTML = "";
  for (const guess of state.guesses) {
    const row = document.createElement("div");
    row.className = `guess${guess.correct ? " correct" : ""}${guess.system ? " system" : ""}`;
    const name = document.createElement("div");
    name.className = "guess-name";
    name.textContent = guess.playerName;
    const text = document.createElement("div");
    text.className = "guess-text";
    text.textContent = guess.text;
    row.append(name, text);
    elements.guessList.append(row);
  }
  elements.guessList.scrollTop = elements.guessList.scrollHeight;
}

function renderChoices() {
  elements.choices.innerHTML = "";
  if (!Array.isArray(state.choices) || state.phase !== "choosing") return;

  for (const word of state.choices) {
    const button = document.createElement("button");
    button.className = "choice-btn";
    button.type = "button";
    button.textContent = word;
    button.addEventListener("click", () => socket.emit("choose-word", { word }));
    elements.choices.append(button);
  }
}

function renderOverlay() {
  elements.startGameBtn.classList.add("hidden");

  if (state.phase === "drawing") {
    elements.overlay.classList.add("hidden");
    return;
  }

  elements.overlay.classList.remove("hidden");

  if (state.phase === "lobby") {
    elements.overlayTitle.textContent = "Studio lobby";
    elements.overlayBody.textContent = state.players.length < 2 ? "Waiting for one more player." : "The room is ready.";
    elements.startGameBtn.classList.toggle("hidden", state.players.length < 2);
    return;
  }

  if (state.phase === "choosing") {
    elements.overlayTitle.textContent = state.choices ? "Pick a word" : "Choosing word";
    elements.overlayBody.textContent = state.choices ? "Your brush, your chaos." : `${state.drawerName || "The drawer"} is choosing.`;
    return;
  }

  if (state.phase === "roundEnd") {
    elements.overlayTitle.textContent = "Round over";
    elements.overlayBody.textContent = state.wordHint ? `Word was: ${state.wordHint}` : "Next round soon.";
    return;
  }

  const winner = [...state.players].sort((a, b) => b.score - a.score)[0];
  elements.overlayTitle.textContent = "Game finished";
  elements.overlayBody.textContent = winner ? `${winner.name} wins with ${winner.score} points.` : "Match complete.";
}

function tag(text) {
  const item = document.createElement("span");
  item.className = "tag";
  item.textContent = text;
  return item;
}

function labelPhase(phase) {
  return {
    lobby: "Lobby",
    choosing: "Word pick",
    drawing: "Drawing",
    roundEnd: "Round end",
    finished: "Finished"
  }[phase] || "Live";
}

function renderSwatches() {
  for (const color of colors) {
    const button = document.createElement("button");
    button.className = `swatch${color === selectedColor ? " active" : ""}`;
    button.type = "button";
    button.style.background = color;
    button.addEventListener("click", () => {
      selectedColor = color;
      document.querySelectorAll(".swatch").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      setTool("brush");
    });
    elements.colors.append(button);
  }
}

function setTool(tool) {
  selectedTool = tool;
  elements.brushBtn.classList.toggle("active", tool === "brush");
  elements.eraserBtn.classList.toggle("active", tool === "eraser");
}

function canDraw() {
  return state?.phase === "drawing" && state.me === state.drawerId;
}

function setupCanvas() {
  clearCanvas();
  elements.board.addEventListener("pointerdown", (event) => {
    if (!canDraw()) return;
    elements.board.setPointerCapture(event.pointerId);
    drawing = true;
    lastPoint = pointerToPoint(event);
    const drawEvent = makeDrawEvent("begin", lastPoint);
    history.push(drawEvent);
    applyDrawEvent(drawEvent);
    socket.emit("draw-event", drawEvent);
  });

  elements.board.addEventListener("pointermove", (event) => {
    if (!drawing || !canDraw()) return;
    const point = pointerToPoint(event);
    lastPoint = point;
    const drawEvent = makeDrawEvent("move", point);
    history.push(drawEvent);
    applyDrawEvent(drawEvent);
    socket.emit("draw-event", drawEvent);
  });

  for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
    elements.board.addEventListener(eventName, () => {
      if (!drawing) return;
      drawing = false;
      lastPoint = null;
      const drawEvent = { type: "end" };
      history.push(drawEvent);
      applyDrawEvent(drawEvent);
      socket.emit("draw-event", drawEvent);
    });
  }
}

function makeDrawEvent(type, point) {
  return {
    type,
    point,
    color: selectedColor,
    size: Number(elements.brushSize.value),
    tool: selectedTool
  };
}

function pointerToPoint(event) {
  const rect = elements.board.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1)
  };
}

function applyDrawEvent(event) {
  if (event.type === "end") {
    ctx.closePath();
    ctx.globalCompositeOperation = "source-over";
    return;
  }

  if (!event.point) return;
  const x = event.point.x * elements.board.width;
  const y = event.point.y * elements.board.height;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = event.size || 12;
  ctx.strokeStyle = event.color || "#24120d";
  ctx.globalCompositeOperation = event.tool === "eraser" ? "destination-out" : "source-over";

  if (event.type === "begin") {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    return;
  }

  ctx.lineTo(x, y);
  ctx.stroke();
}

function replayCanvas() {
  clearCanvas();
  for (const event of history) applyDrawEvent(event);
}

function clearCanvas() {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, elements.board.width, elements.board.height);
  ctx.fillStyle = "#fffaf2";
  ctx.fillRect(0, 0, elements.board.width, elements.board.height);
}

function randomAvatarColor(name) {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const palette = ["#ff8fb4", "#5ed7ff", "#ffe66d", "#9cff8f", "#c9a6ff", "#ffb86b"];
  return palette[hash % palette.length];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
