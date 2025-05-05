const Game = (function() {

    let gameState = 'LOADING';
    let player = null;
    let canvas, ctx;
    let keys = {}; // Track keyboard state
    
    const PLAYER1_START = { x: 50, y: 550 };
    const PLAYER2_START = { x: 550, y: 50 };
    
    const waterAreas = [
        // Main center
        { x: 208, y: 120, width: 210, height: 360 },
        // Left notch
        { x: 170, y: 270, width: 38, height: 195 },
        // Right notch
        { x: 394, y: 270, width: 38, height: 195 }
    ];
    
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
    
        // Pass isInWater to Player for collision checking
        player = Player(ctx, PLAYER1_START.x, PLAYER1_START.y, gameArea, isInWater);
    
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
    
    // Water collision function
    function isInWater(x, y, width, height) {
        return waterAreas.some(area =>
            x + width > area.x &&
            x < area.x + area.width &&
            y + height > area.y &&
            y < area.y + area.height
        );
    }
    
    const startGameLoop = function() {
        let lastTime = performance.now();
        function update(currentTime) {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
    
            if (player) {
                player.update(deltaTime);
                player.draw();
    
                // Draw water bounds for debug
                ctx.save();
                ctx.strokeStyle = 'rgba(0,0,255,0.5)';
                ctx.lineWidth = 2;
                waterAreas.forEach(area => {
                    ctx.strokeRect(area.x, area.y, area.width, area.height);
                });
                ctx.restore();
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
    