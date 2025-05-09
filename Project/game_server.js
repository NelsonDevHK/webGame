const express = require("express");
const bcrypt = require("bcrypt");
const fs = require("fs");
const session = require("express-session");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const server = createServer(app);
const io = new Server(server);

app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use(express.static("public"));
app.use(express.json());

const gameSession = session({
  secret: "game_secret_key",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { maxAge: 300000 },
});

app.use(gameSession);
io.engine.use(gameSession);

function containWordCharsOnly(text) {
  return /^\w+$/.test(text);
}

// --- User Authentication ---
app.post("/register", (req, res) => {
  const { username, name, password } = req.body;
  if (!username || !name || !password) {
    return res.json({ status: "error", error: "All fields are required." });
  }
  if (!containWordCharsOnly(username)) {
    return res.json({
      status: "error",
      error: "Username can only contain letters, numbers, and underscores.",
    });
  }
  let users = {};
  try {
    users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));
  } catch (e) {}
  if (username in users) {
    return res.json({ status: "error", error: "Username already exists." });
  }
  const hashpw = bcrypt.hashSync(password, 10);
  users[username] = { name, password: hashpw };
  fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));
  res.json({ status: "success", user: { username, name } });
});

app.post("/signin", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({
      status: "error",
      error: "Username and password are required.",
    });
  }
  let users = {};
  try {
    users = JSON.parse(fs.readFileSync("./data/users.json", "utf8"));
  } catch (e) {
    return res.json({ status: "error", error: "User database not found." });
  }
  if (!(username in users)) {
    return res.json({
      status: "error",
      error: "Invalid username or password.",
    });
  }
  const user = users[username];
  if (!bcrypt.compareSync(password, user.password)) {
    return res.json({
      status: "error",
      error: "Invalid username or password.",
    });
  }
  req.session.user = { username, name: user.name };
  res.json({ status: "success", user: req.session.user });
});

app.get("/validate", (req, res) => {
  if (req.session.user) {
    res.json({ status: "success", user: req.session.user });
  } else {
    res.json({ status: "error", error: "No user signed in." });
  }
});

app.get("/signout", (req, res) => {
  req.session.destroy();
  res.json({ status: "success" });
});

const PORT = 8000;
let waitingPlayer = null; // Only one can wait at a time
let players = {}; // Map socket.id -> player info
let gemCollected = false;
let lastWinnerId = null;
let restartRequests = {};
const recordsPath = './data/records.json';

function getRecords() {
  try {
    const data = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function updateRecords(time, playerName) {
  let records = getRecords();
  if (!Array.isArray(records)) records = [];
  records.push({
    name: playerName,
    time: parseFloat(time)
  });
  records.sort((a, b) => a.time - b.time);
  fs.writeFileSync(recordsPath, JSON.stringify(records.slice(0, 10), null, 2));
}

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);
  let playerName = socket.request.session.user?.name || "Anonymous";

  socket.on("join", () => {
    console.log("Join event received from:", socket.id);
    if (!waitingPlayer) {
      waitingPlayer = socket;
      players[socket.id] = { name: playerName };
      socket.emit("waiting");
    } else {
      // Start game for both
      players[socket.id] = { name: playerName, opponentId: waitingPlayer.id };
      players[waitingPlayer.id].opponentId = socket.id; // <-- crucial for restart

      const opponent = waitingPlayer;
      const opponentId = opponent.id;
      waitingPlayer = null;

      io.to(socket.id).emit("gameStart", {
        players: [
          { id: opponentId, name: players[opponentId].name },
          { id: socket.id, name: playerName }
        ]
      });
      io.to(opponentId).emit("gameStart", {
        players: [
          { id: opponentId, name: players[opponentId].name },
          { id: socket.id, name: playerName }
        ]
      });
    }
  });

  socket.on("position", (pos) => {
    // Relay position to the other player
    const opponentId = players[socket.id]?.opponentId;
    if (opponentId) {
      io.to(opponentId).emit("opponentPosition", pos);
    }
  });

  socket.on("collectGem", (data) => {
    if (!gemCollected) {
      gemCollected = true;
      lastWinnerId = socket.id;
      const playerName = players[socket.id]?.name || "Anonymous";
      updateRecords(data.time, playerName);
      const records = getRecords();
      for (let id in players) {
        io.to(id).emit("gameEnd", {
          winnerId: socket.id,
          time: data.time,
          records
        });
      }
      setTimeout(() => { gemCollected = false; lastWinnerId = null; }, 3000);
    }
  });

  socket.on("playerLose", () => {
    if (!gemCollected) {
      gemCollected = true;
      lastWinnerId = null;
      const records = getRecords();
      for (let id in players) {
        io.to(id).emit("gameEnd", {
          winnerId: (id === socket.id) ? null : id,
          time: null,
          records
        });
      }
      setTimeout(() => { gemCollected = false; lastWinnerId = null; }, 3000);
    }
  });

  socket.on("restart", () => {
    const opponentId = players[socket.id]?.opponentId;
    if (!opponentId) return;
    restartRequests[socket.id] = true;
    if (restartRequests[opponentId]) {
      // Both players requested restart
      restartRequests[socket.id] = false;
      restartRequests[opponentId] = false;
      io.to(socket.id).emit("gameStart", {
        players: [
          { id: opponentId, name: players[opponentId].name },
          { id: socket.id, name: players[socket.id].name }
        ]
      });
      io.to(opponentId).emit("gameStart", {
        players: [
          { id: opponentId, name: players[opponentId].name },
          { id: socket.id, name: players[socket.id].name }
        ]
      });
    }
  });

  socket.on("disconnect", () => {
    const opponentId = players[socket.id]?.opponentId;
    if (opponentId && players[opponentId]) {
      io.to(opponentId).emit("waiting");
      delete players[opponentId].opponentId;
    }
    delete players[socket.id];
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`Game server running on http://localhost:${PORT}`);
});
