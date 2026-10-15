import Phaser from "phaser";
import "./style.css";

import { MainMenuScene } from "./scenes/MainMenuScene";
import { GameScene } from "./scenes/GameScene";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error('Elemen "#app" tidak ditemukan.');
}

app.innerHTML = `
  <main class="game-container">
    <h1 class="game-heading">Coin Collector</h1>
    <div id="game"></div>
  </main>
`;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: "game",
  backgroundColor: "#17251f",
  scene: [MainMenuScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}
