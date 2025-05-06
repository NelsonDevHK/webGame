const Game = (function() {
    let socket;
    
    let gameState = 'LOADING';
    let player = null;
    let opponent = null;
    let myId = null;
    let myPlayerIndex = null;
    let bombs = [];

    let canvas, ctx;
    let fogCanvas, fogCtx;
    let gem = null;
    let keys = {}; // Track keyboard state
    let startTime;
    let timerActive = true;
    const PLAYER1_START = { x: 50, y: 550 };
    const PLAYER2_START = { x: 550, y: 50 };

    const backgroundSound = new Audio("./assets/LavenderTown.mp3");
    const winningSound = new Audio("./assets/win.mp3");
    const losingSound = new Audio("./assets/gameover.mp3");

    const waterAreas = [
        // Main center
        { x: 208, y: 120, width: 210, height: 360 },
        // Left notch
        { x: 170, y: 270, width: 38, height: 195 },
        // Right notch
        { x: 394, y: 270, width: 38, height: 195 }
    ];
    
    // Fog settings
    const FOG_COLOR = 'rgba(0,0,0,1)'; // adjust 0 for develop
    const VISION_RADIUS = 50; // Adjust as needed
    
    const initialize = function() {


        socket = io();
        socket.on('connect', () => {
          console.log("Socket.IO connected! My ID is", socket.id);
          socket.emit("join");
          document.getElementById('loading-screen').style.display = 'block';
        });
        socket.on("waiting", () => {
          console.log("Entered waiting state");
          document.getElementById('loading-screen').style.display = 'block';
        });
    
        socket.on("gameStart", (data) => {
          console.log("Game starting with players:", data.players);
          document.getElementById('loading-screen').style.display = 'none';


        const panel = document.getElementById('game-panel');
        panel.innerHTML = '';
    
        // backgroundSound.loop = true;
        // backgroundSound.play().catch(e => console.log("Sound play failed:", e));

        // Main game canvas
        canvas = document.createElement('canvas');
        canvas.id = 'game-canvas';
        canvas.width = 602;
        canvas.height = 600;
        panel.appendChild(canvas);
        ctx = canvas.getContext('2d');
        
        // Fog canvas overlay (same size, positioned absolutely)
        fogCanvas = document.createElement('canvas');
        fogCanvas.id = 'fog-canvas';
        fogCanvas.width = canvas.width;
        fogCanvas.height = canvas.height;
        fogCanvas.style.position = 'absolute';
        fogCanvas.style.left = canvas.offsetLeft + 'px';
        fogCanvas.style.top = canvas.offsetTop + 'px';
        fogCanvas.style.pointerEvents = 'none'; // allow mouse events to pass through
        panel.appendChild(fogCanvas);
        fogCtx = fogCanvas.getContext('2d');
    
        const gameArea = BoundingBox(ctx, 0, 0, 600, 602);
    

        const safeArea = {
            randomPoint: () => {
                let point;
                do {
                    point = {
                        x: Math.random() * (canvas.width - 32),
                        y: Math.random() * (canvas.height - 32)
                    };
                } while(isInWater(point.x, point.y, 32, 32));
                return point;
            }
        };

        // Initialize gem
        gem = Gem(ctx, 0, 0, 'green');
        gem.randomize(safeArea);
        
        bombs = [];
        for (let i = 0; i < 5; i++) { // 5 bombs, adjust as needed
          const bomb = Bomb(ctx, 0, 0);
          bomb.randomize(safeArea);
          bombs.push(bomb);
        }

        
        startTime = performance.now();
        // Pass isInWater to Player for collision checking
        myId = socket.id;
        const myPlayerIndex = data.players.findIndex(p => p.id === socket.id);

        // Assign starting positions based on index
        let myStart, oppStart;
        if (myPlayerIndex === 0) {
          // You are the first player
          myStart = PLAYER1_START;
          oppStart = PLAYER2_START;
        } else {
          // You are the second player
          myStart = PLAYER2_START;
          oppStart = PLAYER1_START;
        }
        player = Player(ctx, myStart.x, myStart.y, gameArea, isInWater);
        opponent = Player(ctx, oppStart.x, oppStart.y, gameArea, isInWater);



        socket.on("opponentPosition", (data) => {
            if (opponent) 
              opponent.setXY(data.x, data.y);
          });

          socket.on("gameEnd", (data) => {
            // data.winnerId is the socket.id of the winner
            // data.time is the winning time
            // Optionally: data.records for leaderboard
            if (data.winnerId === socket.id) {
                Game.showEndingScreen("win", data.time, data.records);
            } else {
                Game.showEndingScreen("lose", data.time, data.records);
            }
        });

        setupInput();
        startGameLoop();
    });
    };
    
    const setupInput = function() {
        window.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            handleMovement();
        });
        window.addEventListener('keyup', (e) => {
            keys[e.key] = false;
            handleStop();
        });
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
    
    // Water collision function
    function isInWater(x, y, width, height) {
        return waterAreas.some(area =>
            x + width > area.x &&
            x < area.x + area.width &&
            y + height > area.y &&
            y < area.y + area.height
        );
    }
    function checkGemCollision() {
        // Get player and gem positions with dimensions
        const playerBound = player.getBoundingBox();
        const gemBound = gem.getXY();
        return (playerBound.isPointInBox(gemBound.x, gemBound.y)) 
    }
    function checkBombCollision(bomb) {
        const playerBound = player.getBoundingBox();
        const bombBound = bomb.getXY();
        return playerBound.isPointInBox(bombBound.x, bombBound.y);
      }

    const startGameLoop = function() {
        
        let lastTime = performance.now();
        function update(currentTime) {
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
                backgroundSound.pause();
                winningSound.play();
                const timeTaken = ((currentTime - startTime)/1000).toFixed(2);
                socket.emit("collectGem", { time: timeTaken });
            }


            if (player) {
                player.update(deltaTime);
                player.draw();
                if (socket && player && typeof player.getXY === 'function') {
                    const pos = player.getXY();
                    socket.emit("position", {
                        x: pos.x,
                        y: pos.y,
                      });
                }
            if (opponent) {
                opponent.update(deltaTime);
                opponent.draw();
            }
            
                // Draw water bounds for debug
                // ctx.save();
                // ctx.strokeStyle = 'rgba(0,0,255,0.5)';
                // ctx.lineWidth = 2;
                // waterAreas.forEach(area => {
                //     ctx.strokeRect(area.x, area.y, area.width, area.height);
                // });
                // ctx.restore();
            }
            gem.update(currentTime);
            gem.draw();
            
            bombs.forEach(bomb => {
                bomb.update(currentTime);
                bomb.draw();
              });
            // FOG OF WAR DRAWING
            fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
            fogCtx.save();
            // Fill the whole canvas with black
            fogCtx.globalCompositeOperation = 'source-over';
            fogCtx.fillStyle = FOG_COLOR;
            fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
    
            // Clear a circle around each player (for now, just one)
            
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
    
            requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    };
    
    return {
        initialize,
        showLoadingScreen: () => {
            document.getElementById('loading-screen').style.display = 'block';
        },
        showEndingScreen: (result, time, records) => {
            document.getElementById('game-panel').style.display = 'none';
            document.getElementById('ending-screen').style.display = 'block';
            document.getElementById('ending-message').textContent =
                result === "win" ? "You win!" : "You lose!";
            document.getElementById('ending-time').textContent = `Time: ${time}s`;

            // Show leaderboard
            const list = document.getElementById('records-list');
            if (records && records.length > 0) {
              list.innerHTML = records.map((rec, i) =>
                `<li>${i+1}. ${rec.name} - ${rec.time.toFixed(2)}s</li>`
              ).join('');
            } else {
              list.innerHTML = "<li>No records yet.</li>";
            }
        }
    };
    
    })();
