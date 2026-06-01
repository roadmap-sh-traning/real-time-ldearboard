import {
  Application,
  Assets,
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
  KEEPER_FRAME_SIZE,
  SPRITE_ASSETS,
} from "./sprites";

const ZONE_COLORS = [0x22c55e, 0x16a34a, 0x15803d, 0x22c55e];

export type KickHandler = (directionIndex: number) => void;

export class PenaltyScene {
  private app: Application | null = null;
  private root = new Container();
  private pitch: Sprite | null = null;
  private goalFrame = new Graphics();
  private zones: Graphics[] = [];
  private ballAnimator: SpriteAnimator | null = null;
  private keeperAnimator: SpriteAnimator | null = null;
  private burstContainer = new Container();
  private keeperSheet: Spritesheet | null = null;
  private ballSheet: Spritesheet | null = null;
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
    const [pitchTex, keeperSheet, ballSheet, burstSheet] = await Promise.all([
      Assets.load<Texture>(`${base}${SPRITE_ASSETS.pitch}`),
      Assets.load<Spritesheet>(`${base}${SPRITE_ASSETS.keeper}`),
      Assets.load<Spritesheet>(`${base}${SPRITE_ASSETS.ball}`),
      Assets.load<Spritesheet>(`${base}${SPRITE_ASSETS.goalBurst}`),
    ]);

    this.keeperSheet = keeperSheet;
    this.ballSheet = ballSheet;
    this.burstSheet = burstSheet;

    this.pitch = new Sprite(pitchTex);
    this.pitch.anchor.set(0.5, 0);
    this.root.addChild(this.pitch);
    this.root.addChild(this.goalFrame);

    this.buildZones();

    this.keeperAnimator = new SpriteAnimator(keeperSheet, "idle");
    this.keeperAnimator.sprite.animationSpeed = 0.12;
    this.root.addChild(this.keeperAnimator.sprite);

    this.ballAnimator = new SpriteAnimator(ballSheet, "idle");
    this.ballAnimator.sprite.animationSpeed = 0.35;
    this.root.addChild(this.ballAnimator.sprite);

    this.burstContainer.visible = false;
    this.root.addChild(this.burstContainer);

    this.app.renderer.on("resize", () => this.layout());
    this.layout();
    this.startKeeperIdle();
  }

  setInteractive(enabled: boolean): void {
    this.enabled = enabled && !this.kicking;
    for (const zone of this.zones) {
      zone.alpha = this.enabled ? 1 : 0.45;
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

    const { width, height } = this.app.screen;
    const goalY = height * 0.14;
    const goalH = height * 0.2;
    const goalW = width * 0.72;
    const goalX = width * 0.14;
    const zoneW = goalW / 4;
    const targetX = goalX + zoneW * directionIndex + zoneW / 2;
    const targetY = goalY + goalH * 0.55;
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

    this.keeperAnimator.play(keeperAnim, this.keeperSheet, false);
    this.keeperAnimator.sprite.animationSpeed = 0.28;
    this.ballAnimator.play("spin", this.ballSheet, true);
    this.ballAnimator.sprite.animationSpeed = 0.45;

    const keeperTargetX = won
      ? targetX + (diveLeft ? 55 : -55)
      : targetX;

    await Promise.all([
      this.tween(keeper.position, { x: keeperTargetX }, 280),
      this.tween(ball.position, { x: targetX, y: targetY }, 320),
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
      const label = new Text({
        text: `${i}`,
        style: {
          fill: 0xffffff,
          fontSize: 18,
          fontWeight: "800",
          align: "center",
        },
      });
      label.anchor.set(0.5);
      zone.addChild(label);
      this.root.addChild(zone);
      this.zones.push(zone);
    }
  }

  private layout(): void {
    if (!this.app) return;
    const { width, height } = this.app.screen;
    const goalW = width * 0.72;
    const goalH = height * 0.2;
    const goalX = width * 0.14;
    const goalY = height * 0.14;
    const zoneW = goalW / 4 - 6;
    const spotY = height * 0.78;

    if (this.pitch) {
      const scale = Math.max(width / 640, height / 360) * 1.05;
      this.pitch.scale.set(scale);
      this.pitch.position.set(width / 2, goalY - 20);
    }

    this.goalFrame.clear();
    this.goalFrame
      .roundRect(0, 0, goalW, goalH, 8)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.9 });
    this.goalFrame
      .roundRect(4, 4, goalW - 8, goalH - 8, 6)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.35 });
    this.goalFrame.position.set(goalX, goalY);

    this.zones.forEach((zone, i) => {
      zone.clear();
      zone
        .roundRect(0, 0, zoneW, goalH - 14, 6)
        .fill({ color: ZONE_COLORS[i], alpha: 0.55 });
      zone.stroke({ width: 2, color: 0xffffff, alpha: 0.85 });
      zone.position.set(goalX + 3 + i * (zoneW + 3), goalY + 7);
      const label = zone.children[0] as Text;
      label.position.set(zoneW / 2, (goalH - 14) / 2);
    });

    const keeperScale = Math.min(1.4, (goalW / 4) / (KEEPER_FRAME_SIZE * 0.9));
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
  }

  private startKeeperIdle(): void {
    if (!this.app || !this.keeperAnimator || !this.keeperSheet) return;
    this.stopKeeperIdle();
    this.keeperAnimator.playIdle(this.keeperSheet);
  }

  private stopKeeperIdle(): void {
    /* idle loop is AnimatedSprite.loop on keeper */
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
