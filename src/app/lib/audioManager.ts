import { sound } from '@pixi/sound';

const BGM_VOLUME = 0.16;
const POP_VOLUME = 0.86;
const SLASH_VOLUME = 0.82;
const BUTTON_VOLUME = 0.7;

export class AudioManager {
  private static initialized = false;
  private static unlocked = false;
  private static unlockPromise: Promise<void> | null = null;
  private static musicEnabled = true;
  private static soundEnabled = true;

  public static init() {
    if (this.initialized) return;
    this.initialized = true;

    if (!sound.exists('bgm')) sound.add('bgm', '/bgm.mp3');
    if (!sound.exists('pop')) sound.add('pop', '/pop.mp3');
    if (!sound.exists('slash')) sound.add('slash', '/slash.mp3');
  }

  public static unlockAudio() {
    this.init();
    const currentAudioContext = sound.context?.audioContext;

    if (
      this.unlocked &&
      (!currentAudioContext || currentAudioContext.state === 'running')
    ) {
      this.playBGM();
      return Promise.resolve();
    }

    this.unlocked = false;

    if (this.unlockPromise) return this.unlockPromise;

    this.unlockPromise = (async () => {
      const audioContext = sound.context?.audioContext;
      if (audioContext && audioContext.state !== 'running') {
        await audioContext.resume();
      }

      this.unlocked = !audioContext || audioContext.state === 'running';
      if (this.unlocked) this.playBGM();
    })()
      .catch((error) => {
        console.warn('Audio unlock was blocked by the browser', error);
      })
      .finally(() => {
        this.unlockPromise = null;
      });

    return this.unlockPromise;
  }

  public static setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!sound.exists('bgm')) return;

    if (!this.unlocked) return;

    if (enabled) {
      if (!sound.find('bgm').isPlaying) {
        sound.play('bgm', { loop: true, volume: BGM_VOLUME });
      } else {
        sound.volume('bgm', BGM_VOLUME);
      }
    } else {
      sound.volume('bgm', 0);
    }
  }

  public static setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (sound.exists('pop')) sound.volume('pop', enabled ? POP_VOLUME : 0);
    if (sound.exists('slash')) sound.volume('slash', enabled ? SLASH_VOLUME : 0);
  }

  public static playPop() {
    if (!this.soundEnabled) return;
    if (!sound.exists('pop')) return;

    // Play with a slight random pitch for variety
    const speed = 0.8 + Math.random() * 0.4;
    sound.play('pop', { volume: POP_VOLUME, speed });
  }

  public static playSlash() {
    if (!this.soundEnabled) return;
    if (!sound.exists('slash')) return;
    sound.play('slash', { volume: SLASH_VOLUME });
  }

  public static playButton() {
    if (!this.soundEnabled || !this.unlocked || !sound.exists('pop')) return;
    sound.play('pop', { volume: BUTTON_VOLUME, speed: 1.12 });
  }

  public static playBGM() {
    if (!this.musicEnabled || !this.unlocked) return;
    if (!sound.exists('bgm')) return;
    if (!sound.find('bgm').isPlaying) {
      sound.play('bgm', { loop: true, volume: BGM_VOLUME });
    } else {
      sound.volume('bgm', BGM_VOLUME);
    }
  }

  public static stopBGM() {
    if (!sound.exists('bgm')) return;
    sound.stop('bgm');
  }

  public static setBGMSpeed(speed: number) {
    if (!this.musicEnabled || !sound.exists('bgm')) return;
    sound.speed('bgm', speed);
  }

  public static get isMusicEnabled() {
    return this.musicEnabled;
  }
}
