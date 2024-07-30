import { Sprite } from './character';

export class Bomb {
  x: number;
  y: number;
  frameIndex: number;
  lastFrameTime: number;
  isExploding: boolean;
  explosionStartTime: number;
  scaledSize: number;
  animationSpeed: number;
  explosionDuration: number;
  bombSprites: Sprite[];
  explosionSprites: Sprite[];
  image: HTMLImageElement;
  explosionRadius: number; // Raio de explosão

  constructor(
    x: number,
    y: number,
    scaledSize: number,
    animationSpeed: number,
    explosionDuration: number,
    bombSprites: Sprite[],
    explosionSprites: Sprite[],
    imageSrc: string,
    explosionRadius: number
  ) {
    this.x = x;
    this.y = y;
    this.frameIndex = 0;
    this.lastFrameTime = 0;
    this.isExploding = false;
    this.explosionStartTime = 0;
    this.scaledSize = scaledSize;
    this.animationSpeed = animationSpeed;
    this.explosionDuration = explosionDuration;
    this.bombSprites = bombSprites;
    this.explosionSprites = explosionSprites;
    this.image = new Image();
    this.image.src = imageSrc;
    this.explosionRadius = explosionRadius;
  }

  startExplosion(timestamp: number): void {
    this.isExploding = true;
    this.explosionStartTime = timestamp;
    this.frameIndex = 0;
  }

  updateAnimation(timestamp: number): void {
    const sprites = this.isExploding ? this.explosionSprites : this.bombSprites;
    if (timestamp - this.lastFrameTime > this.animationSpeed) {
      this.frameIndex = (this.frameIndex + 1) % sprites.length;
      this.lastFrameTime = timestamp;
    }
  }

  isExplosionComplete(timestamp: number): boolean {
    return this.isExploding && timestamp - this.explosionStartTime > this.explosionDuration;
  }

  isWithinExplosion(x: number, y: number): boolean {
    const dx = Math.abs(this.x - x);
    const dy = Math.abs(this.y - y);
    return dx <= this.explosionRadius && dy <= this.explosionRadius;
  }
}
