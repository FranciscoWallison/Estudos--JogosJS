import { Sprite } from './character';

export class Enemy {
  x: number;
  y: number;
  direction: 'down' | 'right' | 'up' | 'left';
  frameIndex: number;
  isMoving: boolean;
  lastFrameTime: number;
  scaledSize: number;
  isDead: boolean;
  deathCompleted: boolean;
  movementSpeed: number;
  animationSpeed: number;

  constructor(x: number, y: number, scaledSize: number, movementSpeed: number, animationSpeed: number) {
    this.x = x;
    this.y = y;
    this.direction = 'down';
    this.frameIndex = 0;
    this.isMoving = true;
    this.lastFrameTime = 0;
    this.scaledSize = scaledSize;
    this.isDead = false;
    this.deathCompleted = false;
    this.movementSpeed = movementSpeed;
    this.animationSpeed = animationSpeed;
  }

  setDeathState(isDead: boolean): void {
    this.isDead = isDead;
    this.deathCompleted = false;
    this.frameIndex = 0;
  }

  updatePosition(): void {
    if (this.isMoving && !this.isDead) {
      switch (this.direction) {
        case 'down':
          this.y += this.movementSpeed;
          break;
        case 'right':
          this.x += this.movementSpeed;
          break;
        case 'up':
          this.y -= this.movementSpeed;
          break;
        case 'left':
          this.x -= this.movementSpeed;
          break;
      }

      // Change direction randomly for simple AI
      if (Math.random() < 0.01) {
        const directions = ['down', 'right', 'up', 'left'];
        this.direction = directions[Math.floor(Math.random() * directions.length)] as 'down' | 'right' | 'up' | 'left';
      }
    }
  }

  updateAnimation(animations: Sprite[], timestamp: number): void {
    if ((this.isMoving || this.isDead) && !this.deathCompleted) {
      if (timestamp - this.lastFrameTime > this.animationSpeed) {
        this.frameIndex = (this.frameIndex + 1) % animations.length;
        this.lastFrameTime = timestamp;

        if (this.isDead && this.frameIndex === animations.length - 1) {
          this.deathCompleted = true;
          this.frameIndex = animations.length - 1;
        }
      }
    } else {
      this.frameIndex = 0;
    }
  }
}
