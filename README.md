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




---

### **1. Introdução (10 minutos)**

**Explicação sobre Lógica de Programação:**
- Lógica de programação é a base de todo código. Ela envolve a construção de soluções para problemas de forma sequencial e lógica.
- JavaScript é uma linguagem popular para desenvolvimento web e é ótimo para aprender lógica de programação.

**Conceitos chave:**
- Variáveis
- Tipos de dados
- Operadores
- Estruturas de controle (condicionais e loops)

---

### **2. Variáveis e Tipos de Dados (15 minutos)**

**Explicação:**
- Variáveis são usadas para armazenar dados.
- Em JavaScript, podemos declarar variáveis usando `let`, `const` e `var` (porém, `let` e `const` são os mais usados atualmente).

**Exemplo de Código:**
```javascript
let nome = "João";  // String
let idade = 25;     // Number
let ehEstudante = true; // Booleano
```

**Exercício:**
- Crie uma variável chamada `cidade` e atribua o nome da sua cidade favorita a ela.
- Crie uma variável chamada `idade` e atribua sua idade a ela.

---

### **3. Operadores (10 minutos)**

**Explicação:**
- Operadores aritméticos: `+`, `-`, `*`, `/`, `%`
- Operadores de comparação: `==`, `===`, `!=`, `>`, `<`, `>=`, `<=`
- Operadores lógicos: `&&` (AND), `||` (OR), `!` (NOT)

**Exemplo de Código:**
```javascript
let a = 10;
let b = 5;
let soma = a + b; // 15
let maiorQue = a > b; // true
let resultado = (a > b) && (b > 0); // true
```

**Exercício:**
- Crie duas variáveis numéricas e calcule a soma, subtração, multiplicação e divisão.
- Verifique se a soma dessas variáveis é maior que 20.

---

### **4. Estruturas de Controle (20 minutos)**

**Condicionais:**
- Explicação de `if`, `else if`, `else`.

**Exemplo de Código:**
```javascript
let idade = 18;

if (idade >= 18) {
  console.log("Você é maior de idade.");
} else {
  console.log("Você é menor de idade.");
}
```

**Exercício:**
- Crie uma variável chamada `numero` e verifique se ela é positiva, negativa ou zero, usando `if` e `else`.

**Loops (Laços de Repetição):**
- Explicação de `for` e `while`.

**Exemplo de Código (For):**
```javascript
for (let i = 0; i < 5; i++) {
  console.log(i);  // Exibe números de 0 a 4
}
```

**Exemplo de Código (While):**
```javascript
let contador = 0;
while (contador < 5) {
  console.log(contador);  // Exibe números de 0 a 4
  contador++;
}
```

**Exercício:**
- Crie um loop que exiba os números de 1 a 10.

---

### **5. Funções (15 minutos)**

**Explicação:**
- Funções são blocos de código que podem ser reutilizados.
- Funções podem receber parâmetros e retornar valores.

**Exemplo de Código:**
```javascript
function saudacao(nome) {
  console.log("Olá, " + nome + "!");
}

saudacao("Maria");  // Saída: Olá, Maria!
```

**Exercício:**
- Crie uma função que receba dois números e retorne a soma deles.

---

### **6. Desafios (15 minutos)**

**Exercício Prático:**
1. **Número Par ou Ímpar:** Crie um programa que leia um número e informe se ele é par ou ímpar.
2. **Contagem Regressiva:** Crie um programa que faça uma contagem regressiva de 10 até 1.

---

### **7. Conclusão (5 minutos)**

- **Revisão:** Reforce os conceitos abordados: variáveis, operadores, condicionais, loops e funções.
- **Desafio:** Proponha aos alunos tentarem resolver mais problemas em JavaScript, como a criação de uma calculadora simples ou um programa de adivinhação de números.

---
