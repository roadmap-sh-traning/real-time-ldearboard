import { Application, Container, Graphics, Text } from "pixi.js";

const ZONE_LABELS = ["Left", "Left-mid", "Right-mid", "Right"];
const ZONE_COLORS = [0x22c55e, 0x16a34a, 0x15803d, 0x22c55e];

export type KickHandler = (directionIndex: number) => void;

export class PenaltyScene {
  private app: Application | null = null;
  private root = new Container();
  private goalFrame = new Graphics();
  private zones: Graphics[] = [];
  private ball: Graphics | null = null;
  private keeper: Graphics | null = null;
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
      background: "#14532d",
      antialias: true,
    });
    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.root);
    this.buildScene();
    this.app.renderer.on("resize", () => this.layout());
    this.layout();
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
    if (!this.app || !this.ball || !this.keeper) return;
    this.kicking = true;
    this.setInteractive(false);

    const { width, height } = this.app.screen;
    const goalY = height * 0.14;
    const goalH = height * 0.2;
    const goalW = width * 0.72;
    const goalX = width * 0.14;
    const zoneW = goalW / 4;
    const targetX = goalX + zoneW * directionIndex + zoneW / 2;
    const targetY = goalY + goalH * 0.55;
    const spotY = height * 0.78;

    const keeperX = won ? targetX + (directionIndex < 2 ? 70 : -70) : targetX;
    await this.tween(this.keeper.position, { x: keeperX }, 260);
    await this.tween(this.ball.position, { x: targetX, y: targetY }, 300);

    if (won) this.flashGoal();

    await this.delay(450);
    this.ball.position.set(width / 2, spotY);
    this.keeper.position.set(width / 2, goalY + goalH + 12);
    this.kicking = false;
    this.setInteractive(true);
  }

  destroy(): void {
    this.app?.destroy(true, { children: true });
    this.app = null;
    this.host.innerHTML = "";
  }

  private buildScene(): void {
    const title = new Text({
      text: "Penalty Shootout",
      style: { fill: 0xffffff, fontSize: 22, fontWeight: "800" },
    });
    title.position.set(16, 8);
    this.root.addChild(title);

    this.root.addChild(this.goalFrame);

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
        text: `${i}\n${ZONE_LABELS[i]}`,
        style: {
          fill: 0xffffff,
          fontSize: 13,
          fontWeight: "700",
          align: "center",
        },
      });
      label.anchor.set(0.5);
      zone.addChild(label);
      this.root.addChild(zone);
      this.zones.push(zone);
    }

    this.keeper = new Graphics();
    this.keeper.roundRect(-36, -18, 72, 36, 6).fill(0xfbbf24);
    this.root.addChild(this.keeper);

    this.ball = new Graphics();
    this.ball.circle(0, 0, 14).fill(0xffffff);
    this.ball.stroke({ width: 2, color: 0x1f2937 });
    this.root.addChild(this.ball);
  }

  private layout(): void {
    if (!this.app) return;
    const { width, height } = this.app.screen;
    const goalW = width * 0.72;
    const goalH = height * 0.2;
    const goalX = width * 0.14;
    const goalY = height * 0.14;
    const zoneW = goalW / 4 - 6;

    this.goalFrame.clear();
    this.goalFrame
      .roundRect(0, 0, goalW, goalH, 8)
      .stroke({ width: 5, color: 0xffffff });
    this.goalFrame.position.set(goalX, goalY);

    this.zones.forEach((zone, i) => {
      zone.clear();
      zone
        .roundRect(0, 0, zoneW, goalH - 14, 6)
        .fill({ color: ZONE_COLORS[i], alpha: 0.6 });
      zone.stroke({ width: 2, color: 0xffffff, alpha: 0.85 });
      zone.position.set(goalX + 3 + i * (zoneW + 3), goalY + 7);
      const label = zone.children[0] as Text;
      label.position.set(zoneW / 2, (goalH - 14) / 2);
    });

    if (this.keeper) {
      this.keeper.position.set(width / 2, goalY + goalH + 12);
    }
    if (this.ball) {
      this.ball.position.set(width / 2, height * 0.78);
    }
  }

  private flashGoal(): void {
    if (!this.app) return;
    const flash = new Graphics();
    flash.rect(0, 0, this.app.screen.width, this.app.screen.height).fill({
      color: 0xffffff,
      alpha: 0.22,
    });
    this.app.stage.addChild(flash);
    setTimeout(() => flash.destroy(), 100);
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
