(async () => {

const loadImage = async src =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
})

// Escolher a posição
let playerState = 'idle';

const canvas = document.getElementById('canvas1');
// O contexto 2D é usado para realizar operações de desenho no canvas.
const ctx = canvas.getContext('2d');

// Essas linhas definem a largura e a altura do canvas como 600 pixels. 
const CANVAS_WIDTH = canvas.width = (600/4);
const CANVAS_HEIGHT = canvas.height = (600/4);

// Essas linhas criam um novo objeto Image() e atribuem o caminho da imagem 'shadow_dog.png' à
// propriedade src do objeto playerImage. Isso carrega a imagem do arquivo 'shadow_dog.png'.
const playerImage = await loadImage('./assets/imgs/character-sprite-sheet_2_teste.png').then(image => image);

console.log("playerImage: ", playerImage, playerImage.width , playerImage.height )
// 6876/12 = (573 + 2)
// Largura da imagem que é 6876 e quantidade de animação na horizontal que é 12
const spriteWidth = (playerImage.width/19);
// 5230/10 = 523
// Altura da imagem que é 5230 e a quantidade de animação da vertical que é 10
const spriteHeight = (playerImage.height/19);


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
        frames: 6,
    },
    {
        name: 'start_walking',
        frames: 16
    },
    {
        name: 'walking',
        frames: 16
    },
    {
        name: 'change_side_when_walk',
        frames: 10
    },
    {
        name: 'end_walking_(flat_floor)',
        frames: 18
    },
    {
        name: 'end_walking_(hills_edges_and_stairs)',
        frames: 18
    },
    {
        name: 'end_walking_(hills_edges_and_stairs)_reached_enough_speed',
        frames: 8
    },
    {
        name: 'hell_fire',
        frames: 10
    },
    {
        name: 'standing_attack_weapons',
        frames: 11
    },
    {
        name: 'duck',
        frames: 14
    },
    {
        name: 'ducking_attack',
        frames: 10
    },
    {
        name: 'ducking_attack_down',
        frames: 10
    },
    {
        name: 'jumping_in_the_same_place_(goin_up)',
        frames: 6
    },
    {
        name: 'landing_(hills_edges_and_stairs)',
        frames: 9
    },
    {
        name: 'landing_(flat_floor)',
        frames: 8
    },
    {
        name: 'super_jump_ceiling_collission_(if_the_collision_is_not_tha_strong_use_the_last_3_frames)',
        frames: 18
    },
    {
        name: 'jump_attack',
        frames: 4
    },
    {
        name: 'fall_with_fainting_(unspecified)',
        frames: 6
    },
    {
        name: 'gets_up_from_lying_down',
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

    ctx.drawImage(
        playerImage,
        animationHorizontal, animationVertical,
        spriteWidth, spriteHeight,
        0, 0,
        spriteWidth, spriteHeight
    )

    gameFrame++;
    
    requestAnimationFrame(animation)
}
animation();

const dropdown = document.getElementById("animations");

dropdown.addEventListener('change', function (e) {
    playerState = e.target.value;
})

animationStates.forEach((animation) => {
    const option = new Option(animation.name, animation.name.toLowerCase());
    dropdown.options[dropdown.options.length] = option;
});

})();