import { AnimatedSprite, type Spritesheet, Texture } from "pixi.js";

export class SpriteAnimator {
  readonly sprite: AnimatedSprite;

  constructor(sheet: Spritesheet, animationKey: string, loop = true) {
    const frames = sheet.animations[animationKey];
    if (!frames?.length) {
      throw new Error(`Animation "${animationKey}" not found on spritesheet`);
    }
    this.sprite = new AnimatedSprite(frames);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.loop = loop;
    this.sprite.animationSpeed = 0.18;
  }

  play(animationKey: string, sheet: Spritesheet, loop = true): void {
    const frames = sheet.animations[animationKey];
    if (!frames?.length) return;
    this.sprite.textures = frames;
    this.sprite.loop = loop;
    this.sprite.gotoAndPlay(0);
  }

  playOnce(animationKey: string, sheet: Spritesheet): Promise<void> {
    return new Promise((resolve) => {
      this.play(animationKey, sheet, false);
      const onComplete = () => {
        this.sprite.off("complete", onComplete);
        resolve();
      };
      this.sprite.on("complete", onComplete);
    });
  }

  playIdle(sheet: Spritesheet): void {
    this.play("idle", sheet, true);
    this.sprite.animationSpeed = 0.12;
  }

  static texture(sheet: Spritesheet, frameName: string): Texture {
    const tex = sheet.textures[`${frameName}.png`];
    if (!tex) {
      throw new Error(`Frame "${frameName}" not found on spritesheet`);
    }
    return tex;
  }
}
