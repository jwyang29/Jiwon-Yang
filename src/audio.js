export class AudioAnalyser {
  constructor() {
    this.level = 0;
    this.active = false;
    this._analyser = null;
    this._dataArray = null;
    this._smoothed = 0;
  }

  async start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      this._analyser = ctx.createAnalyser();
      this._analyser.fftSize = 256;
      this._analyser.smoothingTimeConstant = 0.75;
      source.connect(this._analyser);
      this._dataArray = new Uint8Array(this._analyser.frequencyBinCount);
      this.active = true;
    } catch {
      // Mic not granted; fall through gracefully
      this.active = false;
    }
  }

  // Call once per frame; returns 0–1
  update() {
    if (!this.active || !this._analyser) return 0;
    this._analyser.getByteFrequencyData(this._dataArray);
    const avg = this._dataArray.reduce((s, v) => s + v, 0) / this._dataArray.length;
    this._smoothed += (avg / 255 - this._smoothed) * 0.12;
    this.level = this._smoothed;
    return this.level;
  }
}
