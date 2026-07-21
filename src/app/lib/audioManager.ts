import type { PowerupId } from "../components/game/itemRegistry";

const BGM_VOLUME = 0.16;
const HARVEST_VOLUME = 0.78;
const DAMAGE_VOLUME = 0.82;
const BUTTON_VOLUME = 0.7;
const HARVEST_SOUND_START_SECONDS = 0;

type SoundAlias = "harvest" | "damage" | "button";

interface VoiceBank {
  voices: HTMLAudioElement[];
  cursor: number;
}

const SOUND_SOURCES: Record<SoundAlias, { url: string; voices: number }> = {
  harvest: { url: "/audio/sfxgame3.mp3", voices: 4 },
  damage: { url: "/audio/damage.mp3", voices: 2 },
  button: { url: "/audio/Button3.mp3", voices: 2 },
};

export class AudioManager {
  private static initialized = false;
  private static preloadStarted = false;
  private static unlocked = false;
  private static unlockPromise: Promise<boolean> | null = null;
  private static bgmPlayPromise: Promise<void> | null = null;
  private static musicEnabled = true;
  private static soundEnabled = true;
  private static bgmRequested = false;
  private static bgm: HTMLAudioElement | null = null;
  private static voiceBanks = new Map<SoundAlias, VoiceBank>();

  public static init() {
    if (this.initialized || typeof Audio === "undefined") return;
    this.initialized = true;

    this.bgm = this.createAudio("/audio/BGMM_Lofi1.mp3", "auto");
    this.bgm.loop = true;
    this.bgm.volume = BGM_VOLUME;

    for (const [alias, source] of Object.entries(SOUND_SOURCES) as Array<
      [SoundAlias, { url: string; voices: number }]
    >) {
      this.voiceBanks.set(alias, {
        voices: Array.from({ length: source.voices }, (_, index) =>
          this.createAudio(source.url, index === 0 ? "auto" : "metadata"),
        ),
        cursor: 0,
      });
    }
  }

  private static createAudio(url: string, preload: "auto" | "metadata" | "none") {
    const audio = new Audio();
    audio.preload = preload;
    audio.src = url;
    audio.setAttribute("playsinline", "true");
    return audio;
  }

  public static preload() {
    this.init();
    if (!this.bgm || this.preloadStarted) return;
    this.preloadStarted = true;

    this.bgm.load();
    for (const bank of this.voiceBanks.values()) {
      for (const voice of bank.voices) voice.load();
    }
  }

  /**
   * Must be called directly from a trusted user gesture. In particular, do not
   * await before calling this method: Safari requires play() to happen in the
   * original event handler.
   */
  public static unlockAudio(): Promise<boolean> {
    this.preload();

    const bgm = this.bgm;
    if (!bgm) return Promise.resolve(false);

    if (this.unlocked) {
      if (this.musicEnabled && this.bgmRequested) this.resumeBGM();
      return Promise.resolve(true);
    }

    if (this.unlockPromise) return this.unlockPromise;

    // Playing the real BGM element here mirrors the iOS-safe flow used by the
    // 2048 game. A zero volume still unlocks this element when music is off.
    bgm.volume = this.musicEnabled && this.bgmRequested ? BGM_VOLUME : 0;

    let playResult: Promise<void> | undefined;
    try {
      playResult = bgm.play();
    } catch (error) {
      this.reportPlaybackError("unlock", error);
      return Promise.resolve(false);
    }

    const unlockPromise = Promise.resolve(playResult)
      .then(() => {
        this.unlocked = true;

        if (this.musicEnabled && this.bgmRequested) {
          bgm.volume = BGM_VOLUME;
        } else {
          bgm.pause();
        }

        return true;
      })
      .catch((error) => {
        this.unlocked = false;
        this.reportPlaybackError("unlock", error);
        return false;
      })
      .finally(() => {
        if (this.unlockPromise === unlockPromise) {
          this.unlockPromise = null;
        }
      });

    this.unlockPromise = unlockPromise;
    return unlockPromise;
  }

  public static setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!this.bgm) return;
    if (enabled && this.bgmRequested) {
      this.resumeBGM();
    } else {
      this.bgm.pause();
    }
  }

  public static setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (enabled) return;

    for (const bank of this.voiceBanks.values()) {
      for (const voice of bank.voices) {
        voice.pause();
        voice.currentTime = 0;
      }
    }
  }

  private static playLimited(
    alias: SoundAlias,
    options: { volume: number; speed: number; startAt?: number },
    maxVoices: number,
  ) {
    if (!this.soundEnabled) return;
    this.init();

    if (!this.unlocked) {
      const pendingUnlock = this.unlockPromise;
      if (pendingUnlock) {
        void pendingUnlock.then((didUnlock) => {
          if (didUnlock) this.playLimited(alias, options, maxVoices);
        });
      }
      return;
    }

    const bank = this.voiceBanks.get(alias);
    if (!bank) return;

    const availableVoices = bank.voices.slice(0, Math.max(1, maxVoices));
    let voice = availableVoices.find((candidate) => candidate.paused || candidate.ended);
    if (!voice) {
      voice = availableVoices[bank.cursor % availableVoices.length];
      bank.cursor = (bank.cursor + 1) % availableVoices.length;
      voice.pause();
    }

    try {
      voice.currentTime = options.startAt ?? 0;
    } catch {
      voice.currentTime = 0;
    }
    voice.volume = options.volume;
    voice.playbackRate = options.speed;
    void voice.play().catch((error) => {
      this.reportPlaybackError(`sfx:${alias}`, error);
    });
  }

  public static playHarvest(combo: number, milestone = false) {
    const comboLift = Math.min(0.18, Math.floor(Math.max(0, combo) / 5) * 0.06);
    this.playLimited(
      "harvest",
      {
        volume: milestone ? 0.9 : HARVEST_VOLUME,
        speed: 1 + comboLift + (Math.random() - 0.5) * 0.04,
        startAt: HARVEST_SOUND_START_SECONDS,
      },
      4,
    );
  }

  public static playWrong() {
    this.playLimited("damage", { volume: 0.55, speed: 1.08 }, 2);
  }

  public static playDamage() {
    this.playLimited("damage", { volume: DAMAGE_VOLUME, speed: 0.96 }, 2);
  }

  public static playPowerup(powerup: PowerupId) {
    const speed = powerup === "heart" ? 1.16 : powerup === "lightning" ? 0.92 : 1.08;
    this.playLimited(
      "harvest",
      { volume: 0.9, speed, startAt: HARVEST_SOUND_START_SECONDS },
      2,
    );
  }

  public static playOrderComplete() {
    this.playLimited(
      "harvest",
      { volume: 0.94, speed: 1.24, startAt: HARVEST_SOUND_START_SECONDS },
      2,
    );
  }

  public static playButton() {
    this.playLimited("button", { volume: BUTTON_VOLUME, speed: 1 }, 2);
  }

  public static playBGM() {
    this.bgmRequested = true;
    this.init();

    if (!this.unlocked) {
      void this.unlockAudio();
      return;
    }
    if (!this.musicEnabled) return;
    this.resumeBGM();
  }

  private static resumeBGM() {
    if (!this.musicEnabled || !this.unlocked || !this.bgm || !this.bgmRequested) return;
    this.bgm.volume = BGM_VOLUME;
    if (!this.bgm.paused || this.bgmPlayPromise) return;

    let playResult: Promise<void> | undefined;
    try {
      // Keep this call synchronous so setMusicEnabled(true) can be used from a
      // settings click handler on Safari.
      playResult = this.bgm.play();
    } catch (error) {
      this.unlocked = false;
      this.reportPlaybackError("bgm", error);
      return;
    }

    const playPromise = Promise.resolve(playResult)
      .catch((error) => {
        this.unlocked = false;
        this.reportPlaybackError("bgm", error);
      })
      .finally(() => {
        if (this.bgmPlayPromise === playPromise) {
          this.bgmPlayPromise = null;
        }
      });

    this.bgmPlayPromise = playPromise;
  }

  public static stopBGM() {
    this.bgmRequested = false;
    if (!this.bgm) return;
    this.bgm.pause();
    this.bgm.currentTime = 0;
  }

  public static pauseBGM() {
    this.bgmRequested = false;
    this.bgm?.pause();
  }

  public static get isMusicEnabled() {
    return this.musicEnabled;
  }

  public static get isUnlocked() {
    return this.unlocked;
  }

  private static reportPlaybackError(action: string, error: unknown) {
    if (!import.meta.env.DEV) return;
    console.warn(`[AudioManager] ${action} failed; waiting for the next user gesture.`, error);
  }
}
