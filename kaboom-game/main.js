// src/pages/index.tsx
import { useEffect, useState } from "react";
import { initKaboom } from "@/kaboom/kaboom";
import { player, PlayerDirection } from "@/config/player";

const Home = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const k = initKaboom();

      k.loadSpriteAtlas("/sprites/player_1.png", {
        "player1": {
          "x": 0,
          "y": 0,
          "width": 272,
          "height": 16,
          "sliceX": 17,
          "anims": {
            "idle": { "from": 13, "to": 13, "speed": 3, "loop": false },
            "run_down": { "from": 1, "to": 2, "speed": 10, "loop": true },
            "run_right": { "from": 1, "to": 2, "speed": 10, "loop": true },
            "run_up": { "from": 6, "to": 7, "speed": 10, "loop": true },
            "run_left": { "from": 1, "to": 2, "speed": 10, "loop": true },
            "hit": 8,
            "death": { "from": 9, "to": 16, "speed": 20, "loop": false },
          },
        },
      });

      k.scene("main", () => {
        const playerEntity = k.add([
          k.sprite("player1", { anim: "idle" }),
          k.pos(k.width() / 2, k.height() / 2),
          k.area(),
          k.body(),
          k.anchor("center"),
          { direction: player.initPositionDirection as PlayerDirection },
        ]);

        // Movimentação do jogador
        k.onKeyDown("left", () => {
          playerEntity.move(-100, 0);
          if (playerEntity.curAnim() !== "run_left") {
            playerEntity.play("run_left");
          }
          playerEntity.flipX = true;
          playerEntity.direction = "left";
        });

        k.onKeyDown("right", () => {
          playerEntity.move(100, 0);
          if (playerEntity.curAnim() !== "run_right") {
            playerEntity.play("run_right");
          }
          playerEntity.flipX = false;
          playerEntity.direction = "right";
        });

        k.onKeyDown("up", () => {
          playerEntity.move(0, -100);
          if (playerEntity.curAnim() !== "run_up") {
            playerEntity.play("run_up");
          }
          playerEntity.direction = "up";
        });

        k.onKeyDown("down", () => {
          playerEntity.move(0, 100);
          if (playerEntity.curAnim() !== "run_down") {
            playerEntity.play("run_down");
          }
          playerEntity.direction = "down";
        });

        // Idle quando solta a tecla
        ["left", "right", "up", "down"].forEach((key) => {
          k.onKeyRelease(key, () => {
            if (
              !k.isKeyDown("left") &&
              !k.isKeyDown("right") &&
              !k.isKeyDown("up") &&
              !k.isKeyDown("down")
            ) {
              playerEntity.play("idle");
            }
          });
        });
      });

      k.go("main");

      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div id="loading-screen">Carregando...</div>;
  }

  return <div id="game-container"></div>;
};

export default Home;
