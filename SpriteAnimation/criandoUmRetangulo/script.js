const canvas = document.getElementById('canvas1');
// O contexto 2D é usado para realizar operações de desenho no canvas.
const ctx = canvas.getContext('2d');

// Essas linhas definem a largura e a altura do canvas como 600 pixels. 
const CANVAS_WIDTH = canvas.width = 600;
const CANVAS_HEIGHT = canvas.height = 600;

function animation() {
    // Ela recebe quatro argumentos: as coordenadas x e y do canto superior esquerdo do retângulo a ser limpo (0, 0)
    // e as dimensões do retângulo (CANVAS_WIDTH, CANVAS_HEIGHT)
    // Isso garante que o canvas seja limpo antes de cada quadro da animação ser desenhado.
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // fillRect(): É um método do contexto 2D que desenha um retângulo preenchido.
    const coordenada_x = 50;
    const coordenada_y = 50;
    const largura = 100;
    const altura = 100
    ctx.fillRect(
        coordenada_x,
        coordenada_y,
        largura,
        altura
    );
    
    requestAnimationFrame(animation)
}
animation();