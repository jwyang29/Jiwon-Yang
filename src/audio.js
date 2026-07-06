export class AudioAnalyser {
  constructor() {
    this.level = 0;
    this.active = false;
    this._analyser = null;
    this._dataArray = null;
    this._smoothed = 0;
    this._stream = null;
    this._ctx = null;
  }

  async start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      this._analyser = ctx.createAnalyser();
      this._analyser.fftSize = 256;
      this._analyser.smoothingTimeConstant = 0.5; // less internal smoothing → faster response
      source.connect(this._analyser);
      this._dataArray = new Uint8Array(this._analyser.frequencyBinCount);
      this._stream = stream;
      this._ctx = ctx;
      this.active = true;
    } catch {
      this.active = false;
    }
  }

  stop() {
    if (this._stream) this._stream.getTracks().forEach((t) => t.stop());
    if (this._ctx) this._ctx.close();
    this._stream = null;
    this._ctx = null;
    this._analyser = null;
    this.active = false;
    this.level = 0;
    this._smoothed = 0;
  }

  // Returns 0–1. Focuses on low-mid frequencies (speech/music energy bands)
  // and normalises to a range where normal speaking reaches 0.5–1.0
  update() {
    if (!this.active || !this._analyser) return 0;
    this._analyser.getByteFrequencyData(this._dataArray);

    // Bins 0-30 cover ~0-4 kHz — where voice and most instruments live
    let sum = 0;
    const limit = Math.min(30, this._dataArray.length);
    for (let i = 0; i < limit; i++) sum += this._dataArray[i];
    const avg = sum / limit;

    // 55 is a conservative "loud speech" threshold on a 0-255 scale
    const normalized = Math.min(avg / 55, 1.0);

    // Fast attack (0.30), slow release (0.08) — visually punchy but smooth decay
    const coeff = normalized > this._smoothed ? 0.30 : 0.08;
    this._smoothed += (normalized - this._smoothed) * coeff;
    this.level = this._smoothed;
    return this.level;
  }
}
