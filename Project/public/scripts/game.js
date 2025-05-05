const Game = (function() {
    let socket = null;
    let gameState = 'LOADING';
  
    const initialize = function() {
      // Initialize game canvas/phaser instance
      // Set up game controls/event listeners
      console.log("initialize")
      const panel = document.getElementById('game-panel');
        panel.innerHTML = ''; // Clear previous content if needed
        const canvas = document.createElement('canvas');
        canvas.id = 'game-canvas';
        canvas.width = 602;
        canvas.height = 600;
        panel.appendChild(canvas);
        const ctx = canvas.getContext('2d');

          
    };
  
    const connectToServer = function() {
      socket = io('/game'); // Connect to game namespace
      
      socket.on('gameStart', (players) => {
        gameState = 'PLAYING';
        startGameLoop();
      });
    };
  
    const startGameLoop = function() {
      // Main game loop logic
      function update() {
        if(gameState === 'PLAYING') {
          // Update game state
          requestAnimationFrame(update);
        }
      }
      update();
    };
  
    return {
      initialize,
      //connectToServer,
      showLoadingScreen: () => {
        document.getElementById('loading-screen').style.display = 'block';
      },
      showEndingScreen: () =>{
        document.getElementById('ending-screen').style.display = 'block';  
      }
    };
  })();
  