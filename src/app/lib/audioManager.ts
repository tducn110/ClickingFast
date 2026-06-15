import { sound } from '@pixi/sound';

export class AudioManager {
  private static initialized = false;
  private static musicEnabled = true;
  private static soundEnabled = true;

  public static init() {
    if (this.initialized) return;
    this.initialized = true;

    sound.add('bgm', '/bgm.mp3');
    sound.add('pop', '/pop.mp3');
  }

  public static setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!sound.exists('bgm')) return;
    
    if (enabled) {
      if (!sound.find('bgm').isPlaying) {
        sound.play('bgm', { loop: true, volume: 0.5 });
      } else {
        sound.volume('bgm', 0.5);
      }
    } else {
      sound.volume('bgm', 0);
    }
  }

  public static setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (!sound.exists('pop')) return;
    sound.volume('pop', enabled ? 0.8 : 0);
  }

  public static playPop() {
    if (!this.soundEnabled) return;
    if (!sound.exists('pop')) return;
    
    // Play with a slight random pitch for variety
    const speed = 0.8 + Math.random() * 0.4;
    sound.play('pop', { volume: 0.8, speed });
  }

  public static playBGM() {
    if (!this.musicEnabled) return;
    if (!sound.exists('bgm')) return;
    if (!sound.find('bgm').isPlaying) {
      sound.play('bgm', { loop: true, volume: 0.5 });
    }
  }

  public static stopBGM() {
    if (!sound.exists('bgm')) return;
    sound.stop('bgm');
  }

  public static get isMusicEnabled() {
    return this.musicEnabled;
  }
}
