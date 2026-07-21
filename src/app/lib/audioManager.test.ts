import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PlayBehavior = (audio: FakeAudio) => Promise<void>;

let playBehavior: PlayBehavior;

class FakeAudio {
  public static instances: FakeAudio[] = [];

  public currentTime = 0;
  public ended = false;
  public loop = false;
  public paused = true;
  public playbackRate = 1;
  public preload = "";
  public src = "";
  public volume = 1;

  public readonly attributes = new Map<string, string>();
  public readonly load = vi.fn();
  public readonly pause = vi.fn(() => {
    this.paused = true;
  });
  public readonly play = vi.fn(() => {
    this.paused = false;
    return playBehavior(this);
  });
  public readonly setAttribute = vi.fn((name: string, value: string) => {
    this.attributes.set(name, value);
  });

  constructor() {
    FakeAudio.instances.push(this);
  }
}

async function importAudioManager() {
  return (await import("./audioManager")).AudioManager;
}

describe("AudioManager Safari unlock flow", () => {
  beforeEach(() => {
    FakeAudio.instances = [];
    playBehavior = async () => undefined;
    vi.resetModules();
    vi.stubGlobal("Audio", FakeAudio);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("preloads every media element once and marks it for inline playback", async () => {
    const AudioManager = await importAudioManager();

    AudioManager.preload();
    AudioManager.preload();

    expect(FakeAudio.instances).toHaveLength(9);
    for (const audio of FakeAudio.instances) {
      expect(audio.load).toHaveBeenCalledTimes(1);
      expect(audio.attributes.get("playsinline")).toBe("true");
    }
    expect(FakeAudio.instances[0]).toMatchObject({
      loop: true,
      preload: "auto",
      src: "/audio/BGMM_Lofi1.mp3",
    });
  });

  it("calls play immediately but only marks audio unlocked after it succeeds", async () => {
    let resolvePlay!: () => void;
    playBehavior = () =>
      new Promise<void>((resolve) => {
        resolvePlay = resolve;
      });
    const AudioManager = await importAudioManager();

    AudioManager.preload();
    const attempt = AudioManager.unlockAudio();

    expect(FakeAudio.instances[0].play).toHaveBeenCalledTimes(1);
    expect(AudioManager.isUnlocked).toBe(false);

    resolvePlay();
    await expect(attempt).resolves.toBe(true);
    expect(AudioManager.isUnlocked).toBe(true);
  });

  it("keeps audio locked after a rejected play and retries on the next gesture", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let attemptCount = 0;
    playBehavior = async () => {
      attemptCount += 1;
      if (attemptCount === 1) throw new Error("NotAllowedError");
    };
    const AudioManager = await importAudioManager();

    await expect(AudioManager.unlockAudio()).resolves.toBe(false);
    expect(AudioManager.isUnlocked).toBe(false);

    await expect(AudioManager.unlockAudio()).resolves.toBe(true);
    expect(AudioManager.isUnlocked).toBe(true);
    expect(FakeAudio.instances[0].play).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it("unlocks silently when music is off and starts requested game music when enabled", async () => {
    const AudioManager = await importAudioManager();

    AudioManager.setMusicEnabled(false);
    await expect(AudioManager.unlockAudio()).resolves.toBe(true);

    const bgm = FakeAudio.instances[0];
    expect(bgm.volume).toBe(0);
    expect(bgm.pause).toHaveBeenCalledTimes(1);

    AudioManager.playBGM();
    AudioManager.setMusicEnabled(true);
    expect(bgm.play).toHaveBeenCalledTimes(2);
    expect(bgm.volume).toBe(0.16);
  });

  it("does not restart paused game music on later menu gestures", async () => {
    const AudioManager = await importAudioManager();

    await expect(AudioManager.unlockAudio()).resolves.toBe(true);
    const bgm = FakeAudio.instances[0];

    AudioManager.playBGM();
    expect(bgm.play).toHaveBeenCalledTimes(2);

    AudioManager.pauseBGM();
    await expect(AudioManager.unlockAudio()).resolves.toBe(true);
    expect(bgm.play).toHaveBeenCalledTimes(2);

    AudioManager.playBGM();
    expect(bgm.play).toHaveBeenCalledTimes(3);
  });

  it("stops button voices as soon as sound effects are disabled", async () => {
    const AudioManager = await importAudioManager();
    AudioManager.preload();

    const buttonVoices = FakeAudio.instances.filter(
      (audio) => audio.src === "/audio/Button3.mp3",
    );
    for (const voice of buttonVoices) {
      voice.paused = false;
      voice.currentTime = 3;
    }

    AudioManager.setSoundEnabled(false);

    for (const voice of buttonVoices) {
      expect(voice.pause).toHaveBeenCalledTimes(1);
      expect(voice.currentTime).toBe(0);
    }
  });
});
