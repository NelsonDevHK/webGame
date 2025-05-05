const Game = (function() {
    let gameState = 'LOADING';
    let player = null;
    let canvas, ctx;
    let keys = {}; // Track keyboard state

    const initialize = function() {
        const panel = document.getElementById('game-panel');
        panel.innerHTML = '';
        
        canvas = document.createElement('canvas');
        canvas.id = 'game-canvas';
        canvas.width = 602;
        canvas.height = 600;
        panel.appendChild(canvas);
        
        ctx = canvas.getContext('2d');
        const gameArea = BoundingBox(ctx, 0, 0, 600, 602);

        player = Player(ctx, 300, 300, gameArea); // Center position
        setupInput();
        startGameLoop();
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

    const startGameLoop = function() {
        let lastTime = performance.now();
        
        function update(currentTime) {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (player) {
                player.update(deltaTime); // Pass deltaTime for smooth movement
                player.draw();
            }
            
            requestAnimationFrame(update);
        }
        
        requestAnimationFrame(update);
    };

    return {
        initialize,
        showLoadingScreen: () => {
            document.getElementById('loading-screen').style.display = 'block';
        },
        showEndingScreen: () => {
            document.getElementById('ending-screen').style.display = 'block';
        }
    };
})();
