export interface Sprite {
    x: number;
    y: number;
  }
  
  export interface CharacterSprites {
    imageSrc: string;
    down: Sprite[];
    right: Sprite[];
    up: Sprite[];
    left: Sprite[];
    death: Sprite[];
  }
  
  export const playerSprites: CharacterSprites[] = [
    {
      imageSrc: "/assets/bomberman.png",
      down: [
        { x: 4, y: 11 },
        { x: 21, y: 11 },
        { x: 38, y: 11 }
      ],
      right: [
        { x: 54, y: 11 },
        { x: 70, y: 11 },
        { x: 85, y: 11 }
      ],
      up: [
        { x: 100, y: 11 },
        { x: 117, y: 11 },
        { x: 133, y: 11 }
      ],
      left: [
        { x: 54, y: 11 },
        { x: 70, y: 11 },
        { x: 85, y: 11 }
      ],
      death: [
        { x: 4, y: 28 },
        { x: 21, y: 28 },
        { x: 38, y: 28 },
        { x: 55, y: 28 },
        { x: 72, y: 28 },
        { x: 89, y: 28 },
        { x: 106, y: 28 },
        { x: 123, y: 28 }
      ]
    }
  ];
  
  export const enemySprites: CharacterSprites[] = [
    {
      imageSrc: "/assets/52695.png",
      down: [
        { x: 4, y: 4 },
        { x: 21, y: 4 },
        { x: 38, y: 4 }
      ],
      up: [
        { x: 4, y: 4 },
        { x: 21, y: 4 },
        { x: 38, y: 4 }
      ],
      right: [
        { x: 4, y: 4 },
        { x: 21, y: 4 },
        { x: 38, y: 4 }
      ],
      left: [
        { x: 4, y: 4 },
        { x: 21, y: 4 },
        { x: 38, y: 4 }
      ],
      death: [
        { x: 55, y: 4 },
        { x: 72, y: 4 }
      ]
    }
  ];
  
  export interface BombSprites {
    bomb: Sprite[];
    explosion: Sprite[];
    imageSrc: string;
  }
  
  export const bombSprites: BombSprites[] = [
    {
      bomb: [
        { x: 356, y: 151 },
        { x: 373, y: 151 },
        { x: 390, y: 151 }
      ],
      explosion: [
        { x: 254, y: 151 },
        { x: 271, y: 151 },
        { x: 288, y: 151 },
        { x: 305, y: 151 },
        { x: 322, y: 151 },
        { x: 339, y: 151 }
      ],
      imageSrc: "/assets/60462.png"
    }
  ];
  