const Game = (function() {
  let socket;
  let player = null;
  let opponent = null;
  let myId = null;
  let myPlayerIndex = null;
  let bombs = [];
  let canvas, ctx;
  let fogCanvas, fogCtx;
  let gem = null;
  let keys = {};
  let startTime;
  let timerActive = true;
  let fogEnabled = true;
  let animationFrameId = null; // <-- Track game loop

  const PLAYER1_START = { x: 50, y: 550 };
  const PLAYER2_START = { x: 550, y: 50 };
  const backgroundSound = new Audio("./assets/LavenderTown.mp3");
  const winningSound = new Audio("./assets/win.mp3");
  const losingSound = new Audio("./assets/gameover.mp3");
  const waterAreas = [
    { x: 208, y: 120, width: 210, height: 360 },
    { x: 170, y: 270, width: 38, height: 195 },
    { x: 394, y: 270, width: 38, height: 195 }
  ];
  const FOG_COLOR = 'rgba(0,0,0,1)';
  const VISION_RADIUS = 50;

  const initialize = function() {
    socket = io();

    socket.on('connect', () => {
      socket.emit("join");
      document.getElementById('loading-screen').style.display = 'block';
    });

    socket.on("waiting", () => {
      document.getElementById('loading-screen').style.display = 'block';
    });

    socket.on("gameStart", (data) => {
      // --- CLEANUP: Cancel previous game state ---
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      // Remove previous event listeners to prevent stacking
      socket.off("opponentPosition");
      socket.off("gameEnd");
      window.onkeydown = null;
      window.onkeyup = null;

      // Reset variables
      player = null;
      opponent = null;
      myId = null;
      myPlayerIndex = null;
      bombs = [];
      gem = null;
      keys = {};
      startTime = null;
      timerActive = true;
      fogEnabled = true;

      // Clear and re-create canvases
      const panel = document.getElementById('game-panel');
      panel.style.display = 'block';
      panel.innerHTML = '';

      // Hide ending screen if visible
      document.getElementById('ending-screen').style.display = 'none';

      backgroundSound.loop = true;
      backgroundSound.currentTime = 0;
      backgroundSound.play().catch(e => {});

      // Main game canvas
      canvas = document.createElement('canvas');
      canvas.id = 'game-canvas';
      canvas.width = 602;
      canvas.height = 600;
      panel.appendChild(canvas);
      ctx = canvas.getContext('2d');

      // Fog canvas overlay
      fogCanvas = document.createElement('canvas');
      fogCanvas.id = 'fog-canvas';
      fogCanvas.width = canvas.width;
      fogCanvas.height = canvas.height;
      fogCanvas.style.position = 'absolute';
      fogCanvas.style.left = canvas.offsetLeft + 'px';
      fogCanvas.style.top = canvas.offsetTop + 'px';
      fogCanvas.style.pointerEvents = 'none';
      panel.appendChild(fogCanvas);
      fogCtx = fogCanvas.getContext('2d');

      const gameArea = BoundingBox(ctx, 0, 0, 600, 602);
      const safeArea = {
        randomPoint: () => {
          let point;
          do {
            point = { x: Math.random() * (canvas.width - 32), y: Math.random() * (canvas.height - 32) };
          } while(isInWater(point.x, point.y, 32, 32));
          return point;
        }
      };

      // Initialize gem
      gem = Gem(ctx, 0, 0, 'green');
      gem.randomize(safeArea);

      // Initialize bombs
      bombs = [];
      for (let i = 0; i < 5; i++) {
        const bomb = Bomb(ctx, 0, 0);
        bomb.randomize(safeArea);
        bombs.push(bomb);
      }

      startTime = performance.now();
      myId = socket.id;
      myPlayerIndex = data.players.findIndex(p => p.id === socket.id);

      let myStart, oppStart;
      if (myPlayerIndex === 0) {
        myStart = PLAYER1_START;
        oppStart = PLAYER2_START;
      } else {
        myStart = PLAYER2_START;
        oppStart = PLAYER1_START;
      }
      player = Player(ctx, myStart.x, myStart.y, gameArea, isInWater);
      opponent = Player(ctx, oppStart.x, oppStart.y, gameArea, isInWater);

      // Re-add event listeners
      socket.on("opponentPosition", (data) => {
        if (opponent) opponent.setXY(data.x, data.y);
      });
      socket.on("gameEnd", (data) => {
        backgroundSound.pause();
        if (data.winnerId === socket.id) {
          winningSound.play();
          Game.showEndingScreen("win", data.time, data.records);
        } else {
          losingSound.play();
          Game.showEndingScreen("lose", data.time, data.records);
        }
      });

      setupInput();
      startGameLoop();
    });
  };

  const setupInput = function() {
    window.onkeydown = (e) => {
      keys[e.key] = true;
      handleMovement();
      if (e.code === 'Space' && fogEnabled) fogEnabled = false;
    };
    window.onkeyup = (e) => {
      keys[e.key] = false;
      handleStop();
      if (e.code === 'Space' && !fogEnabled) fogEnabled = true;
    };
  };

  const handleMovement = function() {
    if (keys['ArrowLeft']) player.move(1);
    if (keys['ArrowUp']) player.move(2);
    if (keys['ArrowRight']) player.move(3);
    if (keys['ArrowDown']) player.move(4);
  };
  const handleStop = function() {
    if (!keys['ArrowLeft']) player.stop(1);
    if (!keys['ArrowUp']) player.stop(2);
    if (!keys['ArrowRight']) player.stop(3);
    if (!keys['ArrowDown']) player.stop(4);
  };
  function isInWater(x, y, width, height) {
    return waterAreas.some(area =>
      x + width > area.x && x < area.x + area.width &&
      y + height > area.y && y < area.y + area.height
    );
  }
  function checkGemCollision() {
    const playerBound = player.getBoundingBox();
    const gemBound = gem.getXY();
    return (playerBound.isPointInBox(gemBound.x, gemBound.y));
  }
  function checkBombCollision(bomb) {
    const playerBound = player.getBoundingBox();
    const bombBound = bomb.getXY();
    return playerBound.isPointInBox(bombBound.x, bombBound.y);
  }

  const startGameLoop = function() {
    let lastTime = performance.now();
    function update(currentTime) {
      animationFrameId = requestAnimationFrame(update);
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (timerActive) {
        for (let i = 0; i < bombs.length; i++) {
          if (checkBombCollision(bombs[i])) {
            timerActive = false;
            backgroundSound.pause();
            losingSound.play();
            socket.emit("playerLose");
            break;
          }
        }
      }
      if (timerActive && checkGemCollision()) {
        timerActive = false;
        const timeTaken = ((currentTime - startTime)/1000).toFixed(2);
        socket.emit("collectGem", { time: timeTaken });
      }
      if (player) {
        player.update(deltaTime);
        player.draw();
        if (socket && player && typeof player.getXY === 'function') {
          const pos = player.getXY();
          socket.emit("position", { x: pos.x, y: pos.y });
        }
        if (opponent) {
          opponent.update(deltaTime);
          opponent.draw();
        }
      }
      gem.update(currentTime);
      gem.draw();
      bombs.forEach(bomb => {
        bomb.update(currentTime);
        bomb.draw();
      });

      // Fog of war
      fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
      if (fogEnabled) {
        fogCtx.save();
        fogCtx.globalCompositeOperation = 'source-over';
        fogCtx.fillStyle = FOG_COLOR;
        fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
        fogCtx.globalCompositeOperation = 'destination-out';
        const p1 = player.getCenter ? player.getCenter() : {x: player.x, y: player.y};
        fogCtx.beginPath();
        fogCtx.arc(p1.x - 15, p1.y - 5, VISION_RADIUS, 0, Math.PI * 2);
        fogCtx.closePath();
        fogCtx.fill();
        if (opponent) {
          const p2 = opponent.getCenter ? opponent.getCenter() : {x: opponent.x, y: opponent.y};
          fogCtx.beginPath();
          fogCtx.arc(p2.x - 15, p2.y - 5, VISION_RADIUS, 0, Math.PI * 2);
          fogCtx.closePath();
          fogCtx.fill();
        }
        fogCtx.restore();
      }
    }
    animationFrameId = requestAnimationFrame(update);
  };

  return {
    initialize,
    showLoadingScreen: () => {
      document.getElementById('loading-screen').style.display = 'block';
    },
    showEndingScreen: (result, time, records) => {
      document.getElementById('game-panel').style.display = 'none';
      document.getElementById('loading-screen').style.display = 'none';
      document.getElementById('ending-screen').style.display = 'block';
      document.getElementById('ending-message').textContent = result === "win" ? "You win!" : "You lose!";
      document.getElementById('ending-time').textContent = `Time: ${time}s`;
      // Show leaderboard
      const list = document.getElementById('records-list');
      if (records && records.length > 0) {
        list.innerHTML = records.map((rec, i) => `<li>${i+1}. ${rec.name} - ${rec.time}s</li>`).join('');
      } else {
        list.innerHTML = '';
      }
      // Add restart button if not present
      let restartBtn = document.getElementById('restart-btn');
      if (!restartBtn) {
        restartBtn = document.createElement('button');
        restartBtn.id = 'restart-btn';
        restartBtn.textContent = "Restart";
        document.getElementById('ending-screen').appendChild(restartBtn);
      }
      restartBtn.onclick = () => {
        socket.emit("restart");
        document.getElementById('ending-screen').style.display = 'none';
        Game.showLoadingScreen();
      };
    }
  };
})();
