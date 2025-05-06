// This function defines the Player module.
// - `ctx` - A canvas context for drawing
// - `x` - The initial x position of the player
// - `y` - The initial y position of the player
// - `gameArea` - The bounding box of the game area
// - `collisionCheck` - (NEW) function to check for collision with water

const Player = function(ctx, x, y, gameArea, collisionCheck) {

    // Sprite sequences for the player
    const sequences = {
        idleLeft:  { x: 0, y: 64,  width: 32, height: 32, count: 4, timing: 500, loop: true },
        idleUp:    { x: 0, y: 96,  width: 32, height: 32, count: 4, timing: 500, loop: true },
        idleRight: { x: 0, y: 32,  width: 32, height: 32, count: 4, timing: 500, loop: true },
        idleDown:  { x: 0, y: 0,   width: 32, height: 32, count: 4, timing: 500, loop: true },
        moveLeft:  { x: 0, y: 224, width: 32, height: 32, count: 4, timing: 50,  loop: true },
        moveUp:    { x: 0, y: 352, width: 32, height: 32, count: 4, timing: 50,  loop: true },
        moveRight: { x: 0, y: 288, width: 32, height: 32, count: 4, timing: 50,  loop: true },
        moveDown:  { x: 0, y: 160, width: 32, height: 32, count: 4, timing: 50,  loop: true }
    };

    const sprite = Sprite(ctx, x, y);
    sprite.setSequence(sequences.idleDown)
          .setScale(2)
          .setShadowScale({ x: 0.75, y: 0.20 })
          .useSheet("/images/BIRDSPRITESHEET_Blue.png");

    let direction = 0;
    let speed = 150;

    // Player's width and height (scaled)
    const width = 32;
    const height = 32;

    const move = function(dir) {
        if (dir >= 1 && dir <= 4 && dir != direction) {
            switch (dir) {
                case 1: sprite.setSequence(sequences.moveLeft); break;
                case 2: sprite.setSequence(sequences.moveUp); break;
                case 3: sprite.setSequence(sequences.moveRight); break;
                case 4: sprite.setSequence(sequences.moveDown); break;
            }
            direction = dir;
        }
    };

    const stop = function(dir) {
        if (direction == dir) {
            switch (dir) {
                case 1: sprite.setSequence(sequences.idleLeft); break;
                case 2: sprite.setSequence(sequences.idleUp); break;
                case 3: sprite.setSequence(sequences.idleRight); break;
                case 4: sprite.setSequence(sequences.idleDown); break;
            }
            direction = 0;
        }
    };
    const getCenter = function() {
        // Return the center of the player's sprite for fog clearing
        return {
            x: sprite.getXY().x + width / 2,
            y: sprite.getXY().y + height / 2
        };
    }

    const speedUp = function() { speed = 250; };
    const slowDown = function() { speed = 150; };

    // Update method with water collision check
    const update = function(time) {
        if (direction != 0) {
            let { x, y } = sprite.getXY();
            let newX = x;
            let newY = y;

            switch (direction) {
                case 1: newX -= speed / 60; break; // Left
                case 2: newY -= speed / 60; break; // Up
                case 3: newX += speed / 60; break; // Right
                case 4: newY += speed / 60; break; // Down
            }

            // Check both game area and water collision before moving
            if (
                gameArea.isPointInBox(newX, newY) &&
                !(collisionCheck && collisionCheck(newX, newY, width, height))
            ) {
                sprite.setXY(newX, newY);
            }

            sprite.update(time);
        }
    };

    return {
        move: move,
        stop: stop,
        speedUp: speedUp,
        slowDown: slowDown,
        getBoundingBox: sprite.getBoundingBox,
        draw: sprite.draw,
        update: update,
        getCenter,getCenter
    };
};
