const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const tileSize = 40;
const rows = canvas.height / tileSize;
const cols = canvas.width / tileSize;

let player = {
    x: 1,
    y: 1,
    bombs: [],
};

const tiles = [];
const bombs = [];

function initTiles() {
    for (let row = 0; row < rows; row++) {
        tiles[row] = [];
        for (let col = 0; col < cols; col++) {
            if (row === 0 || col === 0 || row === rows - 1 || col === cols - 1 || (row % 2 === 0 && col % 2 === 0)) {
                tiles[row][col] = 'solid';
            } else {
                tiles[row][col] = 'empty';
            }
        }
    }
}

function drawTiles() {
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (tiles[row][col] === 'solid') {
                ctx.fillStyle = '#555';
                ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
            } else if (tiles[row][col] === 'empty') {
                ctx.clearRect(col * tileSize, row * tileSize, tileSize, tileSize);
            }
        }
    }
}

function drawPlayer() {
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x * tileSize, player.y * tileSize, tileSize, tileSize);
}

function placeBomb() {
    const bomb = {
        x: player.x,
        y: player.y,
        timer: 3,
    };
    bombs.push(bomb);
}

function drawBombs() {
    bombs.forEach(bomb => {
        ctx.fillStyle = 'red';
        ctx.fillRect(bomb.x * tileSize, bomb.y * tileSize, tileSize, tileSize);
    });
}

function updateBombs() {
    bombs.forEach(bomb => {
        bomb.timer -= 0.1;
        if (bomb.timer <= 0) {
            explodeBomb(bomb);
            bombs.splice(bombs.indexOf(bomb), 1);
        }
    });
}

function explodeBomb(bomb) {
    const explosionRadius = 1;
    for (let i = -explosionRadius; i <= explosionRadius; i++) {
        for (let j = -explosionRadius; j <= explosionRadius; j++) {
            const x = bomb.x + i;
            const y = bomb.y + j;
            if (tiles[y] && tiles[y][x] && tiles[y][x] !== 'solid') {
                tiles[y][x] = 'empty';
            }
        }
    }
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' && tiles[player.y - 1][player.x] !== 'solid') {
        player.y--;
    } else if (event.key === 'ArrowDown' && tiles[player.y + 1][player.x] !== 'solid') {
        player.y++;
    } else if (event.key === 'ArrowLeft' && tiles[player.y][player.x - 1] !== 'solid') {
        player.x--;
    } else if (event.key === 'ArrowRight' && tiles[player.y][player.x + 1] !== 'solid') {
        player.x++;
    } else if (event.key === ' ') {
        placeBomb();
    }
});

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTiles();
    drawPlayer();
    drawBombs();
    updateBombs();
    requestAnimationFrame(gameLoop);
}

initTiles();
gameLoop();
