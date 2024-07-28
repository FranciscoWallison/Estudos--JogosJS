const canvas = document.getElementById('spriteCanvas');
const ctx = canvas.getContext('2d');
const characterSelect = document.getElementById('characterSelect');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

let spriteSheet;
let frameIndex = 0;
let animationSpeed = 100; // ms per frame
let animationInterval;
let frames = [];
let currentCharacter = 0;
let characterX = 285; // Posição inicial do personagem
let characterY = 1;
let moving = false;
let direction = 'down'; // down, up, left, right

const characters = [
    [
        { x: 4, y: 11, width: 16, height: 16 }, { x: 21, y: 11, width: 16, height: 16 }, { x: 38, y: 11, width: 16, height: 16 },
        { x: 54, y: 11, width: 16, height: 16, flip: true }, { x: 70, y: 11, width: 16, height: 16, flip: true }, { x: 85, y: 11, width: 16, height: 16, flip: true },
        { x: 100, y: 11, width: 16, height: 16 }, { x: 117, y: 11, width: 16, height: 16 }, { x: 133, y: 11, width: 16, height: 16 }
    ],
    [
        { x: 4, y: 62, width: 16, height: 16 }, { x: 21, y: 62, width: 16, height: 16 }, { x: 38, y: 62, width: 16, height: 16 },
        { x: 54, y: 62, width: 16, height: 16, flip: true }, { x: 70, y: 62, width: 16, height: 16, flip: true }, { x: 85, y: 62, width: 16, height: 16, flip: true },
        { x: 100, y: 62, width: 16, height: 16 }, { x: 117, y: 62, width: 16, height: 16 }, { x: 133, y: 62, width: 16, height: 16 }
    ],
    [
        { x: 4, y: 184, width: 16, height: 16 }, { x: 21, y: 184, width: 16, height: 16 }, { x: 38, y: 184, width: 16, height: 16 },
        { x: 54, y: 184, width: 16, height: 16, flip: true }, { x: 70, y: 184, width: 16, height: 16, flip: true }, { x: 85, y: 184, width: 16, height: 16, flip: true },
        { x: 100, y: 184, width: 16, height: 16 }, { x: 117, y: 184, width: 16, height: 16 }, { x: 133, y: 184, width: 16, height: 16 }
    ],
    [
        { x: 4, y: 238, width: 16, height: 16 }, { x: 21, y: 238, width: 16, height: 16 }, { x: 38, y: 238, width: 16, height: 16 },
        { x: 54, y: 238, width: 16, height: 16, flip: true }, { x: 70, y: 238, width: 16, height: 16, flip: true }, { x: 85, y: 238, width: 16, height: 16, flip: true },
        { x: 100, y: 238, width: 16, height: 16 }, { x: 117, y: 238, width: 16, height: 16 }, { x: 133, y: 238, width: 16, height: 16 }
    ],
    [
        { x: 4, y: 292, width: 16, height: 16 }, { x: 21, y: 292, width: 16, height: 16 }, { x: 38, y: 292, width: 16, height: 16 },
        { x: 54, y: 292, width: 16, height: 16, flip: true }, { x: 70, y: 292, width: 16, height: 16, flip: true }, { x: 85, y: 292, width: 16, height: 16, flip: true },
        { x: 100, y: 292, width: 16, height: 16 }, { x: 117, y: 292, width: 16, height: 16 }, { x: 133, y: 292, width: 16, height: 16 }
    ],
    [
        { x: 4, y: 345, width: 16, height: 16 }, { x: 21, y: 345, width: 16, height: 16 }, { x: 38, y: 345, width: 16, height: 16 },
        { x: 54, y: 345, width: 16, height: 16, flip: true }, { x: 70, y: 345, width: 16, height: 16, flip: true }, { x: 85, y: 345, width: 16, height: 16, flip: true },
        { x: 100, y: 345, width: 16, height: 16 }, { x: 117, y: 345, width: 16, height: 16 }, { x: 133, y: 345, width: 16, height: 16 }
    ],
    [
        { x: 4, y: 399, width: 16, height: 16 }, { x: 21, y: 399, width: 16, height: 16 }, { x: 38, y: 399, width: 16, height: 16 },
        { x: 54, y: 399, width: 16, height: 16, flip: true }, { x: 70, y: 399, width: 16, height: 16, flip: true }, { x: 85, y: 399, width: 16, height: 16, flip: true },
        { x: 100, y: 399, width: 16, height: 16 }, { x: 117, y: 399, width: 16, height: 16 }, { x: 133, y: 399, width: 16, height: 16 }
    ]
];

window.onload = function() {
    spriteSheet = new Image();
    spriteSheet.src = 'bomberman.png';

    spriteSheet.onload = () => {
        loadFrames();
        drawFrame();  // Desenhar a primeira imagem no início
    };
};

function loadFrames() {
    frames = characters[currentCharacter];
}

function startAnimation() {
    if (!frames.length) return;

    animationInterval = setInterval(() => {
        frameIndex = (frameIndex + 1) % frames.length;
        drawFrame();
    }, animationSpeed);
}

function stopAnimation() {
    clearInterval(animationInterval);
}

function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(spriteSheet, 0, 0, canvas.width, canvas.height); // Desenha a sprite sheet completa no fundo

    const frame = frames[frameIndex];
    const frameImage = getFrameImage(frame);

    ctx.drawImage(
        frameImage,
        0, 0,
        frame.width, frame.height,
        characterX,
        characterY,
        frame.width,
        frame.height
    );
}

function getFrameImage(frame) {
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = frame.width;
    offscreenCanvas.height = frame.height;
    const offscreenCtx = offscreenCanvas.getContext('2d');

    if (frame.flip) {
        offscreenCtx.translate(frame.width, 0);
        offscreenCtx.scale(-1, 1); // Inverte a imagem horizontalmente
    }

    offscreenCtx.drawImage(spriteSheet, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);

    if (frame.width > 0 && frame.height > 0) {
        const imageData = offscreenCtx.getImageData(0, 0, frame.width, frame.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i] === 240 && data[i + 1] === 0 && data[i + 2] === 240) {
                data[i + 3] = 0; // Define alpha para 0
            }
        }

        offscreenCtx.putImageData(imageData, 0, 0);
    }

    return offscreenCanvas;
}

function moveCharacter() {
    drawFrame();
    requestAnimationFrame(moveCharacter);
}

characterSelect.addEventListener('change', () => {
    currentCharacter = parseInt(characterSelect.value);
    loadFrames();
    frameIndex = 0;
    drawFrame();
});

startButton.addEventListener('click', startAnimation);
stopButton.addEventListener('click', stopAnimation);

window.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowDown':
        case 's':
        case 'S':
            if (!moving) {
                direction = 'down';
                frameIndex = 0; // Parado para baixo
                drawFrame();
                moving = true;
            }
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (!moving) {
                direction = 'up';
                frameIndex = 6; // Parado para cima
                drawFrame();
                moving = true;
            }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (!moving) {
                direction = 'left';
                frameIndex = 3; // Parado para a esquerda (inverter a imagem)
                drawFrame();
                moving = true;
            }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (!moving) {
                direction = 'right';
                frameIndex = 3; // Parado para a direita (inverter a imagem)
                drawFrame();
                moving = true;
            }
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowDown':
        case 's':
        case 'S':
            moving = false;
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            moving = false;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            moving = false;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            moving = false;
            break;
    }
});

moveCharacter();
