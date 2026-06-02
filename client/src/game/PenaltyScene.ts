import {
  Application,
  Assets,
  Circle,
  Container,
  Graphics,
  Sprite,
  type Spritesheet,
  Text,
  Texture,
} from "pixi.js";
import { SpriteAnimator } from "./SpriteAnimator";
import {
  BALL_FRAME_SIZE,
  GOAL_BURST_SIZE,
  SHOOTER_FRAME_SIZE,
  SPRITE_ASSETS,
} from "./sprites";

const GOAL_ASPECT = 472 / 184;

const TARGET_POSITIONS = [
  { x: 0.16, y: 0.3 },
  { x: 0.16, y: 0.72 },
  { x: 0.84, y: 0.3 },
  { x: 0.84, y: 0.72 },
];

export type KickHandler = (directionIndex: number) => void;

export class PenaltyScene {
  private app: Application | null = null;
  private root = new Container();
  private pitch: Sprite | null = null;
  private goalImage: Sprite | null = null;
  private goalFrame = new Graphics();
  private zones: Graphics[] = [];
  private ballAnimator: SpriteAnimator | null = null;
  private keeperAnimator: SpriteAnimator | null = null;
  private shooterAnimator: SpriteAnimator | null = null;
  private burstContainer = new Container();
  private keeperSheet: Spritesheet | null = null;
  private ballSheet: Spritesheet | null = null;
  private shooterSheet: Spritesheet | null = null;
  private burstSheet: Spritesheet | null = null;
  private enabled = false;
  private kicking = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly onKick: KickHandler,
  ) {}

  async init(): Promise<void> {
    this.app = new Application();
    await this.app.init({
      resizeTo: this.host,
      background: "#0f172a",
      antialias: true,
    });
    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.root);

    const base = import.meta.env.BASE_URL;
    const [pitchTex, goalTex, keeperSheet, ballSheet, shooterSheet, burstSheet] =
      await Promise.all([
        Assets.load<Texture>(`${base}${SPRITE_ASSETS.pitch}`),
        Assets.load<Texture>(`${base}${SPRITE_ASSETS.goal}`),
        Assets.load<Spritesheet>(`${base}${SPRITE_ASSETS.keeper}`),
        Assets.load<Spritesheet>(`${base}${SPRITE_ASSETS.ball}`),
        Assets.load<Spritesheet>(`${base}${SPRITE_ASSETS.shooter}`),
        Assets.load<Spritesheet>(`${base}${SPRITE_ASSETS.goalBurst}`),
      ]);

    this.keeperSheet = keeperSheet;
    this.ballSheet = ballSheet;
    this.shooterSheet = shooterSheet;
    this.burstSheet = burstSheet;

    this.pitch = new Sprite(pitchTex);
    this.pitch.anchor.set(0.5, 0);
    this.root.addChild(this.pitch);

    this.goalImage = new Sprite(goalTex);
    this.root.addChild(this.goalImage);
    this.root.addChild(this.goalFrame);

    this.buildZones();

    this.keeperAnimator = new SpriteAnimator(keeperSheet, "idle");
    this.keeperAnimator.sprite.animationSpeed = 0.12;
    this.root.addChild(this.keeperAnimator.sprite);

    this.ballAnimator = new SpriteAnimator(ballSheet, "idle");
    this.ballAnimator.sprite.animationSpeed = 0.35;
    this.root.addChild(this.ballAnimator.sprite);

    this.shooterAnimator = new SpriteAnimator(shooterSheet, "idle");
    this.shooterAnimator.sprite.animationSpeed = 0.1;
    this.root.addChild(this.shooterAnimator.sprite);

    this.burstContainer.visible = false;
    this.root.addChild(this.burstContainer);

    this.app.renderer.on("resize", () => this.layout());
    this.layout();
    this.startKeeperIdle();
  }

  setInteractive(enabled: boolean): void {
    this.enabled = enabled && !this.kicking;
    for (const zone of this.zones) {
      zone.alpha = this.enabled ? 1 : 0.8;
      zone.eventMode = this.enabled ? "static" : "none";
      zone.cursor = this.enabled ? "pointer" : "default";
    }
  }

  async playKick(directionIndex: number, won: boolean): Promise<void> {
    if (
      !this.app ||
      !this.ballAnimator ||
      !this.keeperAnimator ||
      !this.keeperSheet ||
      !this.ballSheet
    ) {
      return;
    }

    this.kicking = true;
    this.setInteractive(false);
    this.stopKeeperIdle();

    const SHOOT_SPEED = 0.4;
    const WINDUP_MS = 250;
    const TRAVEL_MS = 300;
    const DIVE_FRAMES = 8;

    if (this.shooterAnimator && this.shooterSheet) {
      this.shooterAnimator.play("shoot", this.shooterSheet, false);
      this.shooterAnimator.sprite.animationSpeed = SHOOT_SPEED;
    }

    const { width, height } = this.app.screen;
    const { x: goalX, y: goalY, w: goalW, h: goalH } = this.goalRect();
    const target = this.targetCenters(goalX, goalY, goalW, goalH)[directionIndex];
    const targetX = target.x;
    const targetY = target.y;
    const spotY = height * 0.78;
    const ball = this.ballAnimator.sprite;
    const keeper = this.keeperAnimator.sprite;

    const diveLeft = directionIndex < 2;
    const keeperAnim = won
      ? diveLeft
        ? "dive_right"
        : "dive_left"
      : diveLeft
        ? "dive_left"
        : "dive_right";

    const keeperTargetX = won ? targetX + (diveLeft ? 55 : -55) : targetX;


    await this.delay(WINDUP_MS);


    this.keeperAnimator.play(keeperAnim, this.keeperSheet, false);
    this.keeperAnimator.sprite.animationSpeed =
      DIVE_FRAMES / ((TRAVEL_MS / 1000) * 60);
    this.ballAnimator.play("spin", this.ballSheet, true);
    this.ballAnimator.sprite.animationSpeed = 0.45;

    await Promise.all([
      this.tween(keeper.position, { x: keeperTargetX }, TRAVEL_MS),
      this.tween(ball.position, { x: targetX, y: targetY }, TRAVEL_MS),
    ]);

    ball.scale.set(won ? 1.15 : 0.92);

    if (won) {
      await this.playGoalBurst(targetX, targetY);
      this.flashGoal();
    }

    await this.delay(400);

    ball.scale.set(1);
    this.ballAnimator.playIdle(this.ballSheet);
    ball.position.set(width / 2, spotY);
    keeper.position.set(width / 2, goalY + goalH + 8);
    this.keeperAnimator.playIdle(this.keeperSheet);
    this.startKeeperIdle();

    if (this.shooterAnimator && this.shooterSheet) {
      this.shooterAnimator.playIdle(this.shooterSheet);
      this.shooterAnimator.sprite.animationSpeed = 0.1;
    }

    this.kicking = false;
    this.setInteractive(true);
  }

  destroy(): void {
    this.stopKeeperIdle();
    this.app?.destroy(true, { children: true });
    this.app = null;
    this.host.innerHTML = "";
  }

  private buildZones(): void {
    const title = new Text({
      text: "Penalty Shootout",
      style: {
        fill: 0xffffff,
        fontSize: 22,
        fontWeight: "800",
        dropShadow: {
          alpha: 0.6,
          blur: 4,
          color: 0x000000,
          distance: 2,
        },
      },
    });
    title.position.set(16, 8);
    this.root.addChild(title);

    for (let i = 0; i < 4; i++) {
      const zone = new Graphics();
      zone.eventMode = "static";
      zone.cursor = "pointer";
      const idx = i;
      zone.on("pointertap", () => {
        if (!this.enabled || this.kicking) return;
        this.onKick(idx);
      });
      this.root.addChild(zone);
      this.zones.push(zone);
    }
  }


  private goalRect(): { x: number; y: number; w: number; h: number } {
    const { width, height } = this.app!.screen;

    let h = height * 0.34;
    let w = h * GOAL_ASPECT;
    const maxW = width * 0.78;
    if (w > maxW) {
      w = maxW;
      h = w / GOAL_ASPECT;
    }
    return { x: (width - w) / 2, y: height * 0.1, w, h };
  }

  private targetCenters(
    goalX: number,
    goalY: number,
    goalW: number,
    goalH: number,
  ): { x: number; y: number }[] {
    return TARGET_POSITIONS.map((p) => ({
      x: goalX + goalW * p.x,
      y: goalY + goalH * p.y,
    }));
  }

  private drawBullseye(g: Graphics, outerR: number): void {
    const rings: { f: number; color: number }[] = [
      { f: 1.0, color: 0xdc2626 },
      { f: 0.78, color: 0xf8fafc },
      { f: 0.56, color: 0xdc2626 },
      { f: 0.34, color: 0xf8fafc },
      { f: 0.16, color: 0xdc2626 },
    ];
    for (const ring of rings) {
      g.circle(0, 0, outerR * ring.f).fill({ color: ring.color });
    }
    g.circle(0, 0, outerR).stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
  }

  private layout(): void {
    if (!this.app) return;
    const { width, height } = this.app.screen;
    const { x: goalX, y: goalY, w: goalW, h: goalH } = this.goalRect();
    const zoneW = goalW / 4 - 6;
    const spotY = height * 0.78;

    if (this.pitch) {
      const scale = Math.max(width / 640, height / 360) * 1.05;
      this.pitch.scale.set(scale);
      this.pitch.position.set(width / 2, goalY - 20);
    }

    if (this.goalImage) {
      this.goalImage.position.set(goalX, goalY);
      this.goalImage.width = goalW;
      this.goalImage.height = goalH;
    }

    // Real net carries the goal now; keep only a faint outline of the box.
    this.goalFrame.clear();
    this.goalFrame
      .roundRect(0, 0, goalW, goalH, 8)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.25 });
    this.goalFrame.position.set(goalX, goalY);


    const targets = this.targetCenters(goalX, goalY, goalW, goalH);
    const targetR = Math.min(goalW * 0.09, goalH * 0.14);
    this.zones.forEach((zone, i) => {
      zone.clear();
      this.drawBullseye(zone, targetR);
      zone.position.set(targets[i].x, targets[i].y);
      zone.hitArea = new Circle(0, 0, targetR * 1.15);
    });

    const keeperScale = Math.min(1.6, (goalH * 0.7) / 200);
    if (this.keeperAnimator) {
      this.keeperAnimator.sprite.scale.set(keeperScale);
      this.keeperAnimator.sprite.position.set(width / 2, goalY + goalH + 8);
    }

    const ballScale = Math.min(1.2, zoneW / BALL_FRAME_SIZE);
    if (this.ballAnimator) {
      this.ballAnimator.sprite.scale.set(ballScale);
      if (!this.kicking) {
        this.ballAnimator.sprite.position.set(width / 2, spotY);
      }
    }

    const shooterScale = Math.min(1.1, (height * 0.4) / SHOOTER_FRAME_SIZE);
    if (this.shooterAnimator) {
      this.shooterAnimator.sprite.scale.set(shooterScale);
      this.shooterAnimator.sprite.position.set(width / 2, height * 0.99);
    }
  }

  private startKeeperIdle(): void {
    if (!this.app || !this.keeperAnimator || !this.keeperSheet) return;
    this.stopKeeperIdle();
    this.keeperAnimator.playIdle(this.keeperSheet);
  }

  private stopKeeperIdle(): void {
  }

  private async playGoalBurst(x: number, y: number): Promise<void> {
    if (!this.burstSheet || !this.app) return;

    this.burstContainer.removeChildren();
    this.burstContainer.visible = true;
    this.burstContainer.position.set(x, y);

    const burst = new SpriteAnimator(this.burstSheet, "burst", false);
    burst.sprite.animationSpeed = 0.35;
    burst.sprite.anchor.set(0.5);
    const scale = GOAL_BURST_SIZE / 64;
    burst.sprite.scale.set(scale * 1.4);
    this.burstContainer.addChild(burst.sprite);
    burst.sprite.play();

    await new Promise<void>((resolve) => {
      burst.sprite.onComplete = () => resolve();
      setTimeout(resolve, 450);
    });

    this.burstContainer.visible = false;
    this.burstContainer.removeChildren();
  }

  private flashGoal(): void {
    if (!this.app) return;
    const flash = new Graphics();
    flash.rect(0, 0, this.app.screen.width, this.app.screen.height).fill({
      color: 0xfef08a,
      alpha: 0.28,
    });
    this.app.stage.addChild(flash);
    setTimeout(() => flash.destroy(), 120);
  }

  private tween(
    target: { x: number; y?: number },
    to: { x: number; y?: number },
    ms: number,
  ): Promise<void> {
    const from = { x: target.x, y: target.y ?? 0 };
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        const eased = 1 - (1 - t) ** 3;
        target.x = from.x + (to.x - from.x) * eased;
        if (to.y !== undefined) {
          target.y = (from.y ?? 0) + (to.y - (from.y ?? 0)) * eased;
        }
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
