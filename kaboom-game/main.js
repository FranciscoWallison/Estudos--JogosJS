// Inicializa o jogo Kaboom.js com configuração básica
kaboom({
    scale: 4,
    background: [0, 0, 0],
});

// Carrega o atlas de sprites do jogo
loadSpriteAtlas("/sprites/playes.png", {
    "hero": {
        "x": 0,
        "y": 0,
        "width": 281,  // Largura total considerando os espaços
        "height": 16,  // Altura dos frames
        "sliceX": 18,  // Número de frames na horizontal
        "anims": {
            "idle": { "from": 0, "to": 0, "speed": 3, "loop": false },
            "run": { "from": 1, "to": 2, "speed": 10, "loop": true },
            "hit": 8,
            "death": { "from": 9, "to": 17, "speed": 20, "loop": false },
        },
    },
    // outros sprites ...
});
// Define a velocidade de movimento
const SPEED = 120;

// Cria o jogador com o sprite "hero" na posição inicial centralizada
const player = add([
    sprite("hero"),
    pos(width() / 2, height() / 2),
    area(),
    body(),
    anchor("center"),
]);

// Centraliza a câmera no jogador
player.onUpdate(() => {
    camPos(player.pos);
});

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
    sprite.flipX(false);
    sprite.play("run");
}

// Função para continuar o movimento para cima
function moveUp(sprite) {
    sprite.move(0, -SPEED);
    sprite.play("run");
}

// Função para continuar o movimento para a esquerda e inverter a imagem
function moveLeft(sprite) {
    sprite.move(-SPEED, 0);
    sprite.flipX(true);
    sprite.play("run");
}

// Controle de Teclas
onKeyDown("down", () => {
    moveDown(player);
});

onKeyRelease("down", () => {
    stopMovement(player);
});

onKeyDown("right", () => {
    moveRight(player);
});

onKeyRelease("right", () => {
    stopMovement(player);
});

onKeyDown("up", () => {
    moveUp(player);
});

onKeyRelease("up", () => {
    stopMovement(player);
});

onKeyDown("left", () => {
    moveLeft(player);
});

onKeyRelease("left", () => {
    stopMovement(player);
});

// Animação de morte (por exemplo, ao pressionar a tecla 'd')
onKeyPress("d", () => {
    player.play("death");
});