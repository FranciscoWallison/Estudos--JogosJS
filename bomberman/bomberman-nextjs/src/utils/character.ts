export interface Sprite {
  x: number;
  y: number;
}

export interface CharacterConfig {
  imageSrc: string;
  down: Sprite[];
  right: Sprite[];
  up: Sprite[];
  left: Sprite[];
  death: Sprite[];
}

export class Character {
  image: HTMLImageElement;
  animations: {
    down: Sprite[];
    right: Sprite[];
    up: Sprite[];
    left: Sprite[];
    death: Sprite[];
  };

  constructor(config: CharacterConfig) {
    this.image = new Image();
    this.image.src = config.imageSrc;
    this.animations = {
      down: config.down,
      right: config.right,
      up: config.up,
      left: config.left,
      death: config.death,
    };
  }
}
