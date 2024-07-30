export class Block {
    x: number;
    y: number;
    width: number;
    height: number;
    image: HTMLImageElement;
  
    constructor(x: number, y: number, width: number, height: number, imageSrc: string) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.image = new Image();
      this.image.src = imageSrc;
    }
  }
  