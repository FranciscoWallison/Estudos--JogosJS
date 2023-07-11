// Escolher a posição
let playerState = 'idle';

const canvas = document.getElementById('canvas1');
// O contexto 2D é usado para realizar operações de desenho no canvas.
const ctx = canvas.getContext('2d');

// Essas linhas definem a largura e a altura do canvas como 600 pixels. 
const CANVAS_WIDTH = canvas.width = 600;
const CANVAS_HEIGHT = canvas.height = 600;

// Essas linhas criam um novo objeto Image() e atribuem o caminho da imagem 'shadow_dog.png' à
// propriedade src do objeto playerImage. Isso carrega a imagem do arquivo 'shadow_dog.png'.
const playerImage = new Image();
playerImage.src = './assets/imgs/shadow_dog.png';

// 6876/12 = (573 + 2)
// Largura da imagem que é 6876 e quantidade de animação na horizontal que é 12
const spriteWidth = 575;
// 5230/10 = 523
// Altura da imagem que é 5230 e a quantidade de animação da vertical que é 10
const spriteHeight = 523;


// Será usada para controlar a animação
let gameFrame = 0;
// Define a taxa de atualização dos quadros da animação.
const staggerFrames = 5;

// É usado para armazenar as informações dos quadros da animação.
const spriteAnimations = [];
// Define as posições de cada posição
const animationStates = [
    {
        name: 'idle',
        frames: 7,
    },
    {
        name: 'jump',
        frames: 7
    },
    {
        name: 'fall',
        frames: 7
    },
    {
        name: 'run',
        frames: 9
    },
    {
        name: 'dizzy',
        frames: 11
    },
    {
        name: 'sit',
        frames: 5
    },
    {
        name: 'roll',
        frames: 7
    },
    {
        name: 'bite',
        frames: 7
    },
    {
        name: 'ko',
        frames: 12
    },
    {
        name: 'gethit',
        frames: 4
    },
];

// 
animationStates.forEach((state, index) => {
    let frames = {
        loc: []
    }

    for (let j = 0; j < state.frames; j++) {
        let positionX = j * spriteWidth;
        let positionY = index * spriteHeight;
        frames.loc.push({x: positionX, y: positionY});        
    }

    spriteAnimations[state.name] = frames;
})


function animation() {
    // Ela recebe quatro argumentos: as coordenadas x e y do canto superior esquerdo do retângulo a ser limpo (0, 0)
    // e as dimensões do retângulo (CANVAS_WIDTH, CANVAS_HEIGHT)
    // Isso garante que o canvas seja limpo antes de cada quadro da animação ser desenhado.
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    let position = Math.floor(gameFrame/staggerFrames) % spriteAnimations[playerState].loc.length;
    let frameX = spriteWidth * position;

    let frameY = spriteAnimations[playerState].loc[position].y;

    // Irar percorrer a folha de sprite no horizontal
    const animationHorizontal = frameX;
    // Irar percorrer a folha de sprite no vertical
    const animationVertical = frameY;

    ctx.drawImage(playerImage,
        animationHorizontal, animationVertical,
        spriteWidth, spriteHeight,
        0, 0,
        spriteWidth, spriteHeight
    )

    gameFrame++;
    
    requestAnimationFrame(animation)
}
animation();