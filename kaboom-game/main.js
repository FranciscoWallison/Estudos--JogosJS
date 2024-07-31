// Inicializa o jogo Kaboom.js com configuração básica
kaboom({
    scale: 4,
    background: [0, 0, 0],
});

// Carrega o atlas de sprites do jogo
loadSpriteAtlas("/sprites/player.png", {
    "hero": {
        "x": 128,
        "y": 196,
        "width": 144,
        "height": 28,
        "sliceX": 9,
        "anims": {
            "idle": { "from": 0, "to": 3, "speed": 3, "loop": true },
            "run": { "from": 4, "to": 7, "speed": 10, "loop": true },
            "hit": 8,
            "death": { "from": 0, "to": 7, "speed": 10, "loop": false }
        },
    },
    // outros sprites ...
});

// Define a velocidade de movimento
const SPEED = 120;

// Cria o jogador com o sprite "hero" na posição inicial
const player = add([
    sprite("hero", { anim: "idle" }),
    pos(4, 11),
    area(),
    body(),
    anchor("center"),
]);

// Função para parar o movimento do sprite e mudar para a animação 'idle'
function stopMovement(sprite, anim = "idle") {
    sprite.move(0, 0);
    sprite.play(anim);
}

// Função para continuar o movimento para baixo
function moveDown(sprite) {
    sprite.move(0, SPEED);
    sprite.play("run");
}

// Função para continuar o movimento para a direita e inverter a imagem
function moveRight(sprite) {
    sprite.move(SPEED, 0);
    sprite.flipX = true;
    sprite.play("run");
}

// Função para continuar o movimento para cima
function moveUp(sprite) {
    sprite.move(0, -SPEED);
    sprite.play("run");
}

// Função para realizar a animação de morte
function deathAnimation(sprite) {
    const deathCoords = [
        [4, 28], [21, 28], [38, 28], [55, 28], [72, 28], 
        [89, 28], [106, 28], [123, 28]
    ];
    let frameIndex = 0;
    sprite.play("death", true);
    sprite.onUpdate(() => {
        if (sprite.frame === frameIndex) {
            if (frameIndex < deathCoords.length) {
                sprite.pos = vec2(deathCoords[frameIndex][0], deathCoords[frameIndex][1]);
                frameIndex++;
            }
        }
    });
}

// Controle de Teclas
onKeyDown("down", () => {
    if (player.pos.x === 21 || player.pos.x === 38) {
        moveDown(player);
    }
});

onKeyRelease("down", () => {
    if (player.pos.x === 4 || player.pos.x === 11) {
        stopMovement(player);
    }
});

onKeyDown("right", () => {
    if (player.pos.x === 70 || player.pos.x === 85) {
        moveRight(player);
    }
});

onKeyRelease("right", () => {
    if (player.pos.x === 54) {
        player.move(SPEED, 0);
        player.flipX = true;
        player.play("idle");
    }
});

onKeyDown("up", () => {
    if (player.pos.x === 117 || player.pos.x === 133) {
        moveUp(player);
    }
});

onKeyRelease("up", () => {
    if (player.pos.x === 100) {
        stopMovement(player);
    }
});

// Animação de morte (por exemplo, ao pressionar a tecla 'd')
onKeyPress("d", () => {
    deathAnimation(player);
});
