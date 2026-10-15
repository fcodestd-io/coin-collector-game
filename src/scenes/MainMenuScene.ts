import Phaser from "phaser";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    const { width, height } = this.scale;

    // Background.
    this.cameras.main.setBackgroundColor("#17251f");

    const background = this.add.graphics();

    background.fillStyle(0x203c2d, 1);
    background.fillRoundedRect(width / 2 - 250, height / 2 - 155, 500, 310, 20);

    background.lineStyle(2, 0x52735f, 1);
    background.strokeRoundedRect(
      width / 2 - 250,
      height / 2 - 155,
      500,
      310,
      20,
    );

    // Dekorasi koin.
    this.add.circle(width / 2 - 90, height / 2 - 75, 12, 0xfacc15);
    this.add.circle(width / 2 + 90, height / 2 - 75, 12, 0xfacc15);

    // Judul.
    this.add
      .text(width / 2, height / 2 - 90, "COIN COLLECTOR", {
        fontFamily: "Arial, sans-serif",
        fontSize: "34px",
        color: "#fde047",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Deskripsi.
    this.add
      .text(
        width / 2,
        height / 2 - 35,
        "Kumpulkan semua koin dan hindari enemy!",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#ffffff",
          align: "center",
        },
      )
      .setOrigin(0.5);

    // Tombol mulai.
    const startButton = this.add
      .text(width / 2, height / 2 + 35, "MULAI BERMAIN", {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        color: "#17251f",
        backgroundColor: "#86efac",
        padding: { x: 24, y: 14 },
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on("pointerover", () => {
      startButton.setStyle({ backgroundColor: "#bbf7d0" });
    });

    startButton.on("pointerout", () => {
      startButton.setStyle({ backgroundColor: "#86efac" });
    });

    startButton.on("pointerdown", () => {
      this.scene.start("GameScene");
    });

    // Petunjuk kontrol.
    this.add
      .text(
        width / 2,
        height / 2 + 100,
        "Kontrol: WASD / Tombol Panah / Joystick",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "#cbd5e1",
          align: "center",
        },
      )
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height / 2 + 135,
        "Game 01 • Dibuat dengan Phaser + TypeScript",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#94a3b8",
        },
      )
      .setOrigin(0.5);
  }
}
