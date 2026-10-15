import Phaser from "phaser";

type EnemyType = "slime" | "runner" | "tank";

export class GameScene extends Phaser.Scene {
  private enemyTypes = new Map<Phaser.GameObjects.Arc, EnemyType>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private player!: Phaser.GameObjects.Arc;
  private coins: Phaser.GameObjects.Arc[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private winText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Text;
  private audioContext?: AudioContext;

  private isPaused = false;
  private pauseButton!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Rectangle;
  private pauseTitle!: Phaser.GameObjects.Text;
  private resumeButton!: Phaser.GameObjects.Text;

  private highScoreText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;

  private readonly totalCoins = 10;
  private highScore = 0;

  private readonly playerSpeed = 220;
  private score = 0;
  private isWon = false;

  private enemies: Phaser.GameObjects.Arc[] = [];
  private isGameOver = false;
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickThumb!: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;
  private joystickVector = { x: 0, y: 0 };
  private readonly joystickRadius = 55;

  private playDeathAnimation(): void {
    this.tweens.killTweensOf(this.player);

    this.tweens.add({
      targets: this.player,
      scale: 0,
      alpha: 0,
      angle: 180,
      duration: 400,
      ease: "Cubic.easeIn",
    });
  }

  constructor() {
    super("GameScene");
  }

  private handleGameOver(): void {
    if (this.isGameOver || this.isWon) return;

    this.isGameOver = true;
    this.pauseButton.setVisible(false);

    this.playDeathAnimation();
    this.playGameOverSound();
    this.joystickPointerId = null;
    this.joystickVector.x = 0;
    this.joystickVector.y = 0;

    this.time.delayedCall(400, () => {
      this.winText.setText("GAME OVER");
      this.winText.setColor("#ef4444");
      this.winText.setVisible(true);
      this.restartButton.setVisible(true);
    });
  }

  private pauseGame(): void {
    if (this.isWon || this.isGameOver || this.isPaused) return;
    this.joystickPointerId = null;
    this.joystickVector.x = 0;
    this.joystickVector.y = 0;
    this.isPaused = true;
    this.pauseButton.setVisible(false);
    this.pauseOverlay.setVisible(true);
    this.pauseTitle.setVisible(true);
    this.resumeButton.setVisible(true);
  }

  private resumeGame(): void {
    if (!this.isPaused) return;

    this.isPaused = false;
    this.pauseButton.setVisible(true);
    this.pauseOverlay.setVisible(false);
    this.pauseTitle.setVisible(false);
    this.resumeButton.setVisible(false);
  }

  private spawnEnemy(): void {
    const margin = 55;
    const side = Phaser.Math.Between(0, 3);

    let x = 0;
    let y = 0;

    switch (side) {
      case 0:
        x = Phaser.Math.Between(55, 745);
        y = 55;
        break;
      case 1:
        x = 745;
        y = Phaser.Math.Between(55, 395);
        break;
      case 2:
        x = Phaser.Math.Between(55, 745);
        y = 395;
        break;
      default:
        x = 55;
        y = Phaser.Math.Between(55, 395);
        break;
    }

    if (
      Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <
      margin * 2
    ) {
      x = this.player.x < 400 ? 745 : 55;
      y = this.player.y < 225 ? 395 : 55;
    }
    const roll = Phaser.Math.Between(1, 100);

    const type: EnemyType =
      roll <= 50 ? "slime" : roll <= 80 ? "runner" : "tank";

    const radius = type === "tank" ? 19 : 13;

    const color =
      type === "slime" ? 0x4ade80 : type === "runner" ? 0xef4444 : 0xa855f7;

    const enemy = this.add.circle(x, y, radius, color);
    enemy.setStrokeStyle(3, 0x1f2937);

    this.enemies.push(enemy);
    this.enemyTypes.set(enemy, type);
  }
  private createJoystick(): void {
    const baseX = 100;
    const baseY = this.scale.height - 95;

    this.joystickBase = this.add
      .circle(baseX, baseY, this.joystickRadius, 0xffffff, 0.18)
      .setStrokeStyle(2, 0xffffff, 0.45)
      .setScrollFactor(0)
      .setDepth(50);

    this.joystickThumb = this.add
      .circle(baseX, baseY, 23, 0x86efac, 0.8)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setScrollFactor(0)
      .setDepth(51);

    this.joystickBase.setInteractive();
    this.joystickThumb.setInteractive();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isPaused || this.isWon || this.isGameOver) return;

      // Joystick hanya aktif di sisi kiri layar.
      if (pointer.x > this.scale.width * 0.45) return;

      // Hindari mengambil alih input dari pointer lain.
      if (this.joystickPointerId !== null) return;

      this.joystickPointerId = pointer.id;
      this.updateJoystick(pointer);
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.joystickPointerId) return;
      this.updateJoystick(pointer);
    });

    const releaseJoystick = (pointer: Phaser.Input.Pointer): void => {
      if (pointer.id !== this.joystickPointerId) return;

      this.joystickPointerId = null;
      this.joystickVector.x = 0;
      this.joystickVector.y = 0;

      this.joystickThumb.setPosition(baseX, baseY);
    };

    this.input.on("pointerup", releaseJoystick);
    this.input.on("pointerupoutside", releaseJoystick);
  }

  create(): void {
    this.score = 0;
    this.isWon = false;
    this.isGameOver = false;
    this.enemies = [];
    this.isPaused = false;
    const arena = this.add.graphics();
    this.enemyTypes.clear();
    this.createJoystick();

    // Lantai arena.
    arena.fillStyle(0x203c2d, 1);
    arena.fillRect(40, 40, 720, 370);

    // Pola lantai.
    arena.lineStyle(1, 0x2b4b38, 1);

    for (let x = 80; x < 760; x += 40) {
      arena.lineBetween(x, 40, x, 410);
    }

    for (let y = 80; y < 410; y += 40) {
      arena.lineBetween(40, y, 760, y);
    }

    // Batas arena.
    arena.lineStyle(4, 0x8fb89a, 1);
    arena.strokeRect(40, 40, 720, 370);

    // Judul.
    this.add
      .text(400, 8, "COIN COLLECTOR", {
        fontFamily: "Arial, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    // Skor awal.

    // Panel informasi di bagian atas arena.
    const hud = this.add.graphics();

    hud.fillStyle(0x14271c, 0.92);
    hud.fillRoundedRect(48, 46, 704, 45, 8);
    hud.lineStyle(1, 0x52735f, 1);
    hud.strokeRoundedRect(48, 46, 704, 45, 8);

    // Baca rekor dari browser.
    try {
      const savedScore = Number(
        localStorage.getItem("coin-collector-high-score") ?? "0",
      );

      this.highScore = Number.isFinite(savedScore)
        ? Phaser.Math.Clamp(Math.floor(savedScore), 0, this.totalCoins)
        : 0;
    } catch {
      this.highScore = 0;
    }

    // Skor saat ini.
    this.scoreText = this.add.text(60, 57, "Koin: 0/10", {
      fontFamily: "Arial, sans-serif",
      fontSize: "17px",
      color: "#ffffff",
      fontStyle: "bold",
    });

    // High score.
    this.highScoreText = this.add
      .text(740, 57, `Rekor: ${this.highScore}/${this.totalCoins}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        color: "#fde047",
        fontStyle: "bold",
      })
      .setOrigin(1, 0);

    // Progress bar.
    this.progressBar = this.add.graphics();
    this.updateProgressBar();

    // Posisi 10 koin: setiap pasangan adalah [X, Y].
    const coinPositions: Array<[number, number]> = [
      [120, 110],
      [250, 100],
      [390, 120],
      [540, 100],
      [680, 120],
      [150, 220],
      [300, 300],
      [500, 250],
      [650, 330],
      [400, 370],
    ];

    // Membuat semua koin.
    this.coins = coinPositions.map(([x, y]) => {
      const coin = this.add.circle(x, y, 10, 0xfacc15);
      coin.setStrokeStyle(2, 0xffffff);
      return coin;
    });

    // Animasi koin: membesar dan mengecil secara berulang.
    this.coins.forEach((coin, index) => {
      this.tweens.add({
        targets: coin,
        scale: 1.2,
        duration: 550,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: index * 70,
      });
    });

    // Karakter pemain.
    this.player = this.add
      .circle(400, 225, 14, 0x38bdf8)
      .setStrokeStyle(3, 0xffffff);

    // Pesan kemenangan, disembunyikan pada awal permainan.
    this.winText = this.add
      .text(400, 225, "KAMU MENANG!\nSemua koin terkumpul!", {
        fontFamily: "Arial, sans-serif",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "center",
        backgroundColor: "#14532d",
        padding: { x: 16, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);

    // Tombol restart, disembunyikan sampai pemain menang.
    this.restartButton = this.add
      .text(400, 290, "MAIN LAGI", {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "#2563eb",
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.pauseButton = this.add
      .text(740, 18, "PAUSE", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        color: "#ffffff",
        backgroundColor: "#365342",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setDepth(20);

    this.pauseButton.setInteractive({ useHandCursor: true });

    this.pauseButton.on("pointerdown", () => {
      this.pauseGame();
    });
    this.pauseOverlay = this.add
      .rectangle(400, 225, 360, 190, 0x101713, 0.96)
      .setStrokeStyle(2, 0x52735f)
      .setDepth(30)
      .setVisible(false);

    this.pauseTitle = this.add
      .text(400, 175, "GAME DIJEDA", {
        fontFamily: "Arial, sans-serif",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setVisible(false);

    this.resumeButton = this.add
      .text(400, 230, "LANJUTKAN", {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: "#17251f",
        backgroundColor: "#86efac",
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.resumeButton.on("pointerdown", () => {
      this.resumeGame();
    });

    // Efek visual saat pointer berada di atas tombol.
    this.restartButton.on("pointerover", () => {
      this.restartButton.setAlpha(0.8);
    });

    this.restartButton.on("pointerout", () => {
      this.restartButton.setAlpha(1);
    });

    // Jalankan ulang scene saat tombol diklik.
    this.restartButton.on("pointerdown", () => {
      this.scene.restart();
    });

    // Petunjuk kontrol.
    this.add
      .text(400, 420, "Gerak: WASD / Tombol Panah", {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        color: "#d1fae5",
      })
      .setOrigin(0.5, 0);

    // Input keyboard.
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error("Input keyboard tidak tersedia.");
    }

    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys("W,A,S,D") as typeof this.wasd;
  }

  update(_time: number, delta: number): void {
    // Berhenti setelah menang, kalah, atau pause.
    if (this.isWon || this.isGameOver || this.isPaused) return;

    let directionX = 0;
    let directionY = 0;

    // Input keyboard.
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      directionX -= 1;
    }

    if (this.cursors.right.isDown || this.wasd.D.isDown) {
      directionX += 1;
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      directionY -= 1;
    }

    if (this.cursors.down.isDown || this.wasd.S.isDown) {
      directionY += 1;
    }

    // Input joystick analog.
    directionX += this.joystickVector.x;
    directionY += this.joystickVector.y;

    // Batasi kecepatan diagonal tanpa menghilangkan
    // intensitas analog saat hanya joystick digunakan.
    const length = Math.hypot(directionX, directionY);

    if (length > 1) {
      directionX /= length;
      directionY /= length;
    }

    // Gerakkan pemain satu kali per frame.
    const distance = this.playerSpeed * (delta / 1000);

    this.player.x += directionX * distance;
    this.player.y += directionY * distance;

    // Batasi pemain di dalam arena.
    const playerRadius = 14;

    this.player.x = Phaser.Math.Clamp(
      this.player.x,
      40 + playerRadius,
      760 - playerRadius,
    );

    this.player.y = Phaser.Math.Clamp(
      this.player.y,
      40 + playerRadius,
      410 - playerRadius,
    );

    // Periksa tabrakan dengan koin.
    const coinRadius = 10;
    const collectionDistance = playerRadius + coinRadius;

    for (const coin of this.coins) {
      if (!coin.active || coin.getData("collected") === true) {
        continue;
      }

      const distanceToCoin = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        coin.x,
        coin.y,
      );

      if (distanceToCoin <= collectionDistance) {
        this.collectCoin(coin);
      }
    }

    // Gerakkan enemy dan periksa tabrakan.
    const deltaSeconds = delta / 1000;

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      const angle = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        this.player.x,
        this.player.y,
      );

      const type = this.enemyTypes.get(enemy) ?? "slime";

      const baseSpeed = type === "slime" ? 65 : type === "runner" ? 115 : 45;

      const enemySpeed = baseSpeed + this.score * 2;

      enemy.x += Math.cos(angle) * enemySpeed * deltaSeconds;
      enemy.y += Math.sin(angle) * enemySpeed * deltaSeconds;

      const distanceToEnemy = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y,
      );

      const enemyRadius = enemy.radius;

      if (distanceToEnemy <= playerRadius + enemyRadius) {
        this.handleGameOver();
        return;
      }
    }
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const baseX = this.joystickBase.x;
    const baseY = this.joystickBase.y;

    let dx = pointer.x - baseX;
    let dy = pointer.y - baseY;

    const distance = Math.hypot(dx, dy);
    const maxDistance = this.joystickRadius;

    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    this.joystickThumb.setPosition(baseX + dx, baseY + dy);

    // Nilai arah sekaligus intensitas kecepatan analog.
    this.joystickVector.x = dx / maxDistance;
    this.joystickVector.y = dy / maxDistance;
  }

  private updateProgressBar(): void {
    const x = 60;
    const y = 82;
    const width = 200;
    const height = 5;

    // Bersihkan gambar progress sebelumnya.
    this.progressBar.clear();

    // Latar progress bar.
    this.progressBar.fillStyle(0x365342, 1);
    this.progressBar.fillRoundedRect(x, y, width, height, 2);

    // Bagian yang menunjukkan progres.
    const progress = this.score / this.totalCoins;

    if (progress > 0) {
      this.progressBar.fillStyle(0xfacc15, 1);
      this.progressBar.fillRoundedRect(x, y, width * progress, height, 2);
    }
  }

  private createCoinParticles(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const particle = this.add.circle(
        x,
        y,
        Phaser.Math.Between(2, 4),
        0xfacc15,
      );

      particle.setDepth(6);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(20, 55);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(250, 450),
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private collectCoin(coin: Phaser.GameObjects.Arc): void {
    // Tandai segera agar skor tidak bertambah berkali-kali.
    coin.setData("collected", true);
    this.createCoinParticles(coin.x, coin.y);

    // Hentikan animasi denyut koin.
    this.tweens.killTweensOf(coin);

    // Efek visual: koin membesar lalu memudar.
    this.tweens.add({
      targets: coin,
      scale: 1.8,
      alpha: 0,
      duration: 180,
      ease: "Back.easeIn",
      onComplete: () => {
        coin.destroy();
      },
    });

    // Tampilkan feedback +1 di lokasi koin.
    const feedback = this.add
      .text(coin.x, coin.y - 18, "+1", {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: "#fde047",
        fontStyle: "bold",
        stroke: "#203c2d",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Teks bergerak ke atas dan memudar.
    this.tweens.add({
      targets: feedback,
      y: feedback.y - 35,
      alpha: 0,
      duration: 500,
      ease: "Cubic.easeOut",
      onComplete: () => {
        feedback.destroy();
      },
    });

    // Efek suara pengambilan koin.
    this.playCoinSound();

    this.score += 1;
    this.spawnEnemy();

    this.scoreText.setText(`Koin: ${this.score}/${this.totalCoins}`);

    // Perbarui progress bar.
    this.updateProgressBar();

    // Simpan rekor jika skor saat ini mengalahkan rekor lama.
    if (this.score > this.highScore) {
      this.highScore = this.score;

      this.highScoreText.setText(`Rekor: ${this.highScore}/${this.totalCoins}`);

      try {
        localStorage.setItem(
          "coin-collector-high-score",
          String(this.highScore),
        );
      } catch {
        // Game tetap dapat dimainkan jika penyimpanan tidak tersedia.
      }
    }

    // Periksa kemenangan.
    if (this.score === this.totalCoins) {
      this.isWon = true;
      this.winText.setText("KAMU MENANG!");
      this.winText.setColor("#fde047");
      this.winText.setVisible(true);
      this.restartButton.setVisible(true);
    }
  }
  private playGameOverSound(): void {
    try {
      const AudioContextClass =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) return;

      this.audioContext ??= new AudioContextClass();

      const context = this.audioContext;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(330, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        90,
        context.currentTime + 0.35,
      );

      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.4);
    } catch {
      // Game tetap berjalan jika audio tidak tersedia.
    }
  }

  private playCoinSound(): void {
    // AudioContext tersedia pada browser modern.
    const AudioContextClass = window.AudioContext;

    if (!AudioContextClass) {
      return;
    }

    // Buat konteks audio hanya saat dibutuhkan.
    if (!this.audioContext) {
      this.audioContext = new AudioContextClass();
    }

    const audio = this.audioContext;

    // Browser mungkin menangguhkan audio sampai ada interaksi pengguna.
    if (audio.state === "suspended") {
      void audio.resume();
    }

    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.17);
  }
}
