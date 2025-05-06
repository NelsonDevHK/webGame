const express = require("express");
const bcrypt = require("bcrypt");
const fs = require("fs");
const session = require("express-session");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();

const server = createServer(app); // <-- create HTTP server from Express app
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

  if (!username|| !name || !password) {
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
  } catch (e) {
    // file might not exist yet
  }

  if (username in users) {
    return res.json({ status: "error", error: "Username already exists." });
  }

  const hashpw = bcrypt.hashSync(password, 10);
  users[username] = {name, password: hashpw };

  fs.writeFileSync("./data/users.json", JSON.stringify(users, null, 2));

  res.json({ status: "success", user: { username,name } });
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

  req.session.user = { username,name: user.name };

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
let players = {};         // Map socket.id -> player info

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
      players[socket.id] = { name: playerName };
      const opponent = waitingPlayer;
      const opponentId = opponent.id;
      waitingPlayer = null;

      // Notify both players to start, send both players' info
      io.to(socket.id).emit("gameStart", {
        players: [
          { id: socket.id, name: playerName },
          { id: opponentId, name: players[opponentId].name }
        ]
      });
      io.to(opponentId).emit("gameStart", {
        players: [
          { id: opponentId, name: players[opponentId].name },
          { id: socket.id, name: playerName }
        ]
      });
    }
})
});


server.listen(PORT, () => {
  console.log(`Game server running on http://localhost:${PORT}`);
});