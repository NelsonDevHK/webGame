const Game = (function() {

    let socket = null;
    let gameState = 'LOADING';
    let player = null; // Declare player in module scope so it’s accessible in the game loop
    

    const initialize = function() {
        // Initialize game canvas
        console.log("initialize");
        const panel = document.getElementById('game-panel');
        panel.innerHTML = ''; // Clear previous content if needed

        const canvas = document.createElement('canvas');
        canvas.id = 'game-canvas';
        canvas.width = 602;
        canvas.height = 600;
        panel.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const gameArea = BoundingBox(ctx, 0, 0, 600, 602); // Full canvas area

        // Create the player (pass ctx, not 'context')
        player = Player(ctx, 50, 550, gameArea);

        requestAnimationFrame(startGameLoop);
    };

    // If you want to connect to server, you can re-enable this
    /*
    const connectToServer = function() {
        socket = io('/game'); // Connect to game namespace
        socket.on('gameStart', (players) => {
            gameState = 'PLAYING';
            requestAnimationFrame(startGameLoop);
        });
    };
    */

    // The main game loop, using requestAnimationFrame and time argument
    let lastTime = null;
    function startGameLoop(time) {
        if (gameState !== 'PLAYING') {
            // Only start playing after you set gameState = 'PLAYING'
            // For now, let's set it to PLAYING after initialize
            gameState = 'PLAYING';
        }

        // Calculate deltaTime (in ms) for smooth animation (optional)
        if (lastTime === null) lastTime = time;
        const deltaTime = time - lastTime;
        lastTime = time;

        // Update and draw player with time
        // (You can add background drawing here if you want)
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (player) {
            player.update(time); // Pass current time for animation
            player.draw();
        }

        // Continue the game loop
        requestAnimationFrame(startGameLoop);
    }

    return {
        initialize,
        //connectToServer,
        showLoadingScreen: () => {
            document.getElementById('loading-screen').style.display = 'block';
        },
        showEndingScreen: () => {
            document.getElementById('ending-screen').style.display = 'block';
        }
    };
})();
