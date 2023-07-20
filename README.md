# Projeto com objetivo de trinar animação com html, css e javascript.

## O que é a tag's canvas
````
    HTML Canvas: O elemento <canvas> é uma área retangular em uma página HTML onde você pode desenhar 
gráficos, criar animações e manipular pixels. O canvas é renderizado usando JavaScript, que é
usado para acessar o contexto de renderização e executar operações de desenho.
````

## Iniciando com canvas
````
    Contexto 2D: O contexto de renderização mais comum para o canvas é o "2D".
Você pode obter o contexto 2D do canvas usando o método getContext('2d').
O contexto 2D oferece uma variedade de métodos para desenhar formas, linhas,
texto e imagens no canvas.
````
#### EXEMPLO
- Inicie no javascript a sua referencia da tag canvas no html.
````
const canvas = document.getElementById('canvas1');
````
- Iremos obter o contexto 2D, para iniciar as formas para as animações.
````
const ctx = canvas.getContext('2d');
````