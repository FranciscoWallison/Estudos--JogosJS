import { Character, CharacterConfig } from "./character";
import { Player } from "./player";

/**
 * Class representing the game.
 */
export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  SPRITE_SIZE: number;
  SCALE: number;
  SCALED_SIZE: number;
  MOVEMENT_SPEED: number;
  ANIMATION_SPEED: number;
  characters: Character[];
  currentCharacterIndex: number;
  player: Player;

  /**
   * Creates a game instance.
   * @param canvasId - The ID of the canvas element.
   * @param charactersConfig - The configurations for the characters.
   */
  constructor(canvas: HTMLCanvasElement, charactersConfig: CharacterConfig[]) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.SPRITE_SIZE = 16;
    this.SCALE = 2;
    this.SCALED_SIZE = this.SPRITE_SIZE * this.SCALE;
    this.MOVEMENT_SPEED = 2;
    this.ANIMATION_SPEED = 100;

    this.characters = charactersConfig.map((config) => new Character(config));
    this.currentCharacterIndex = 0;
    this.player = new Player(
      this.canvas.width / 2 - this.SCALED_SIZE / 2,
      this.canvas.height / 2 - this.SCALED_SIZE / 2,
      this.SCALED_SIZE
    );

    document.addEventListener("keydown", (event) =>
      this.handleKey(event, true)
    );
    document.addEventListener("keyup", (event) => this.handleKey(event, false));

    this.characters[0].image.onload = () => {
      this.gameLoop();
    };
  }

  /**
   * Selects the current character based on user input.
   * @param index - The index of the character.
   */
  selectCharacter(index: number): void {
    this.currentCharacterIndex = index;
  }

  /**
   * Handles keyboard input to set the player direction.
   * @param event - The keyboard event.
   * @param isKeyDown - Whether the key is pressed down.
   */
  handleKey(event: KeyboardEvent, isKeyDown: boolean): void {
    this.player.setDirection(event.key, isKeyDown);
  }

  /**
   * Tests the death animation of the player.
   */
  testDeath(): void {
    this.player.setDeathState(true);
  }

  /**
   * Updates the game state.
   * @param timestamp - The current timestamp.
   */
  update(timestamp: number): void {
    this.player.updatePosition(this.MOVEMENT_SPEED);
    const currentAnimations = this.player.isDead
      ? this.characters[this.currentCharacterIndex].animations.death
      : this.characters[this.currentCharacterIndex].animations[
          this.player.direction
        ];
    this.player.updateAnimation(
      currentAnimations,
      this.ANIMATION_SPEED,
      timestamp
    );
  }

  /**
   * Draws the current frame.
   */
  draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const character = this.characters[this.currentCharacterIndex];
    const currentAnimations = this.player.isDead
      ? character.animations.death
      : character.animations[this.player.direction];
    const sprite = currentAnimations[this.player.frameIndex];

    if (sprite) {
      if (this.player.direction === "left" && !this.player.isDead) {
        this.ctx.save();
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(
          character.image,
          sprite.x,
          sprite.y,
          this.SPRITE_SIZE,
          this.SPRITE_SIZE,
          -this.player.x - this.SCALED_SIZE,
          this.player.y,
          this.SCALED_SIZE,
          this.SCALED_SIZE
        );
        this.ctx.restore();
      } else {
        this.ctx.drawImage(
          character.image,
          sprite.x,
          sprite.y,
          this.SPRITE_SIZE,
          this.SPRITE_SIZE,
          this.player.x,
          this.player.y,
          this.SCALED_SIZE,
          this.SCALED_SIZE
        );
      }
    }
  }

  /**
   * The main game loop.
   * @param timestamp - The current timestamp.
   */
  gameLoop(timestamp: number = 0): void {
    this.update(timestamp);
    this.draw();
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }
}
