"use client";

/**
 * RestroNex Order & Kitchen Web Audio Chime Engine
 *
 * Uses pure Web Audio API synthesis for high-reliability, zero-network-dependency,
 * non-jarring acoustic notifications for new orders and kitchen updates.
 * Complies with modern browser autoplay policies with seamless gesture unlocking.
 */

class AudioNotificationEngine {
  private ctx: AudioContext | null = null;
  public isUnlocked = false;
  private notifiedOrderIds = new Set<string>();

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  public isSoundEnabled(): boolean {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("restronex_order_sound_enabled");
    return stored === null ? true : stored === "true";
  }

  public setSoundEnabled(enabled: boolean) {
    if (typeof window === "undefined") return;
    localStorage.setItem("restronex_order_sound_enabled", enabled ? "true" : "false");
  }

  public async unlock(): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (!ctx) return false;
    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      this.isUnlocked = ctx.state === "running";
      return this.isUnlocked;
    } catch {
      return false;
    }
  }

  /**
   * Dual-harmonic pleasant chime for newly arrived POS, QR, Online, or Aggregator orders.
   * Plays: D5 (587.33 Hz) -> A5 (880.00 Hz) -> D6 (1174.66 Hz)
   */
  public playNewOrderChime(orderId?: string) {
    if (!this.isSoundEnabled()) return;
    if (orderId) {
      if (this.notifiedOrderIds.has(orderId)) return;
      this.notifiedOrderIds.add(orderId);
      // Evict oldest if set gets excessively large
      if (this.notifiedOrderIds.size > 200) {
        const first = this.notifiedOrderIds.values().next().value;
        if (first) this.notifiedOrderIds.delete(first);
      }
    }

    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== "running") return;

    try {
      const now = ctx.currentTime;

      // Note 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: A5 (880.00 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.0, now + 0.12);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);

      // Note 3: D6 (1174.66 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "triangle";
      osc3.frequency.setValueAtTime(1174.66, now + 0.24);
      gain3.gain.setValueAtTime(0.2, now + 0.24);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.7);
    } catch (e) {
      console.warn("[AudioEngine] Error playing order chime:", e);
    }
  }

  /**
   * Action confirmation tone (e.g. order accepted, status updated)
   */
  public playActionTone() {
    if (!this.isSoundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx || ctx.state !== "running") return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }
}

export const orderAudio = new AudioNotificationEngine();
