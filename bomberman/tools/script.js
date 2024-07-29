const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const spriteSheet = new Image();
spriteSheet.src = 'assets/bomberman.png';

const SPRITE_SIZE = 16;
const SCALE = 2;
const SCALED_SIZE = SPRITE_SIZE * SCALE;
const MOVEMENT_SPEED = 2; // Velocidade de movimento em pixels por frame
const ANIMATION_SPEED = 100; // Tempo em milissegundos por frame de animação

let spriteX = canvas.width / 2 - SCALED_SIZE / 2;
let spriteY = canvas.height / 2 - SCALED_SIZE / 2;

const player = {
  x: spriteX,
  y: spriteY,
  direction: 'down',
  frameIndex: 0,
  isMoving: false,
  lastFrameTime: 0, // Armazena o tempo do último frame de animação
};

const directions = {
  down: [{ x: 4, y: 11 }, { x: 21, y: 11 }, { x: 38, y: 11 }],
  right: [{ x: 54, y: 11 }, { x: 70, y: 11 }, { x: 85, y: 11 }],
  up: [{ x: 100, y: 11 }, { x: 117, y: 11 }, { x: 133, y: 11 }],
  left: [{ x: 54, y: 11 }, { x: 70, y: 11 }, { x: 85, y: 11 }] // Mesmas coordenadas de 'right'
};

document.addEventListener('keydown', (event) => handleKey(event, true));
document.addEventListener('keyup', (event) => handleKey(event, false));

function handleKey(event, isKeyDown) {
  switch (event.key) {
    case 'ArrowDown':
    case 's':
      player.direction = 'down';
      player.isMoving = isKeyDown;
      break;
    case 'ArrowRight':
    case 'd':
      player.direction = 'right';
      player.isMoving = isKeyDown;
      break;
    case 'ArrowUp':
    case 'w':
      player.direction = 'up';
      player.isMoving = isKeyDown;
      break;
    case 'ArrowLeft':
    case 'a':
      player.direction = 'left';
      player.isMoving = isKeyDown;
      break;
  }
}

function update(timestamp) {
  if (player.isMoving) {
    // Atualiza a posição do jogador com base na direção
    switch (player.direction) {
      case 'down':
        player.y += MOVEMENT_SPEED;
        break;
      case 'right':
        player.x += MOVEMENT_SPEED;
        break;
      case 'up':
        player.y -= MOVEMENT_SPEED;
        break;
      case 'left':
        player.x -= MOVEMENT_SPEED;
        break;
    }

    // Atualiza o frame de animação com base no tempo
    if (timestamp - player.lastFrameTime > ANIMATION_SPEED) {
      player.frameIndex = (player.frameIndex + 1) % directions[player.direction].length;
      player.lastFrameTime = timestamp;
    }
  } else {
    player.frameIndex = 0;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sprite = directions[player.direction][player.frameIndex];
  
  if (player.direction === 'left') {
    ctx.save();
    ctx.scale(-1, 1); // Inverte a imagem horizontalmente
    ctx.drawImage(
      spriteSheet,
      sprite.x, sprite.y, SPRITE_SIZE, SPRITE_SIZE,
      -player.x - SCALED_SIZE, player.y, SCALED_SIZE, SCALED_SIZE
    );
    ctx.restore();
  } else {
    ctx.drawImage(
      spriteSheet,
      sprite.x, sprite.y, SPRITE_SIZE, SPRITE_SIZE,
      player.x, player.y, SCALED_SIZE, SCALED_SIZE
    );
  }
}

function gameLoop(timestamp) {
  update(timestamp);
  draw();
  requestAnimationFrame(gameLoop);
}

spriteSheet.onload = function() {
  requestAnimationFrame(gameLoop);
};
