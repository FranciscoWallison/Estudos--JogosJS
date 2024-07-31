# Projeto com objetivo de treinar animação com javascript.

## Link's uteis 

[Top HTML5](https://itch.io/games/html5)



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

Dimensões do mapa é de (496x208) e assumindo que cada tile tem 16x16 pixels, você terá um grid de tiles para o mapa. Para calcular a quantidade de tiles, você pode usar a seguinte fórmula:

- Número de tiles na largura = Largura do mapa / Largura do tile
- Número de tiles na altura = Altura do mapa / Altura do tile

Vamos calcular:

1. **Largura do mapa em tiles:**
\[ \text{Número de tiles na largura} = \frac{496}{16} = 31 \]

2. **Altura do mapa em tiles:**
\[ \text{Número de tiles na altura} = \frac{208}{16} = 13 \]

Portanto, o seu mapa terá uma grade de 31 tiles de largura por 13 tiles de altura.

Se precisar de ajuda adicional com a implementação ou qualquer outro aspecto do seu projeto de desenvolvimento de jogos, sinta-se à vontade para me avisar!