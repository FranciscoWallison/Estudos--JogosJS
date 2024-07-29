import { Sprite } from "./character";

/**
 * Class representing a player in the game.
 */
export class Player {
  x: number;
  y: number;
  direction: "down" | "right" | "up" | "left";
  frameIndex: number;
  isMoving: boolean;
  lastFrameTime: number;
  scaledSize: number;
  isDead: boolean;

  /**
   * Creates a player instance.
   * @param x - The initial x-coordinate of the player.
   * @param y - The initial y-coordinate of the player.
   * @param scaledSize - The scaled size of the player sprite.
   */
  constructor(x: number, y: number, scaledSize: number) {
    this.x = x;
    this.y = y;
    this.direction = "down";
    this.frameIndex = 0;
    this.isMoving = false;
    this.lastFrameTime = 0;
    this.scaledSize = scaledSize;
    this.isDead = false;
  }

  /**
   * Sets the direction of the player based on keyboard input.
   * @param key - The key pressed.
   * @param isKeyDown - Whether the key is pressed down.
   */
  setDirection(key: string, isKeyDown: boolean): void {
    if (this.isDead) return;

    switch (key) {
      case "ArrowDown":
      case "s":
        this.direction = "down";
        this.isMoving = isKeyDown;
        break;
      case "ArrowRight":
      case "d":
        this.direction = "right";
        this.isMoving = isKeyDown;
        break;
      case "ArrowUp":
      case "w":
        this.direction = "up";
        this.isMoving = isKeyDown;
        break;
      case "ArrowLeft":
      case "a":
        this.direction = "left";
        this.isMoving = isKeyDown;
        break;
    }
  }

  /**
   * Sets the death state of the player.
   * @param isDead - The death state of the player.
   */
  setDeathState(isDead: boolean): void {
    this.isDead = isDead;
    this.frameIndex = 0;
  }

  /**
   * Updates the position of the player.
   * @param movementSpeed - The speed of movement.
   */
  updatePosition(movementSpeed: number): void {
    if (this.isMoving && !this.isDead) {
      switch (this.direction) {
        case "down":
          this.y += movementSpeed;
          break;
        case "right":
          this.x += movementSpeed;
          break;
        case "up":
          this.y -= movementSpeed;
          break;
        case "left":
          this.x -= movementSpeed;
          break;
      }
    }
  }

  /**
   * Updates the animation frame of the player.
   * @param animations - The animations for the current state.
   * @param animationSpeed - The speed of the animation.
   * @param timestamp - The current timestamp.
   */
  updateAnimation(
    animations: Sprite[],
    animationSpeed: number,
    timestamp: number
  ): void {
    if (this.isMoving || this.isDead) {
      if (timestamp - this.lastFrameTime > animationSpeed) {
        this.frameIndex = (this.frameIndex + 1) % animations.length;
        this.lastFrameTime = timestamp;

        if (this.isDead && this.frameIndex === animations.length - 1) {
          this.isDead = false;
          this.frameIndex = 0;
        }
      }
    } else {
      this.frameIndex = 0;
    }
  }
}
