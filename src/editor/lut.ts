import { classRegistry, filters } from 'fabric';

const { BaseFilter } = filters;
import { LUTS, LUT_SIZE } from '../data/luts';

const cache = new Map<string, Uint8Array>();

export function lutBytes(id: string): Uint8Array | null {
  if (cache.has(id)) return cache.get(id)!;
  const preset = LUTS.find((l) => l.id === id);
  if (!preset) return null;
  const bin = atob(preset.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  cache.set(id, bytes);
  return bytes;
}

/** Aplica um LUT 3D (interpolação trilinear) a um buffer RGBA. */
export function applyLut(data: Uint8ClampedArray, lut: Uint8Array, amount = 1) {
  const n = LUT_SIZE;
  const s = (n - 1) / 255;
  const n2 = n * n;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] * s, g = data[i + 1] * s, b = data[i + 2] * s;
    const r0 = r | 0, g0 = g | 0, b0 = b | 0;
    const r1 = r0 < n - 1 ? r0 + 1 : r0, g1 = g0 < n - 1 ? g0 + 1 : g0, b1 = b0 < n - 1 ? b0 + 1 : b0;
    const fr = r - r0, fg = g - g0, fb = b - b0;
    for (let c = 0; c < 3; c++) {
      const at = (bb: number, gg: number, rr: number) => lut[(bb * n2 + gg * n + rr) * 3 + c];
      const c00 = at(b0, g0, r0) + (at(b0, g0, r1) - at(b0, g0, r0)) * fr;
      const c01 = at(b0, g1, r0) + (at(b0, g1, r1) - at(b0, g1, r0)) * fr;
      const c10 = at(b1, g0, r0) + (at(b1, g0, r1) - at(b1, g0, r0)) * fr;
      const c11 = at(b1, g1, r0) + (at(b1, g1, r1) - at(b1, g1, r0)) * fr;
      const c0 = c00 + (c01 - c00) * fg;
      const c1 = c10 + (c11 - c10) * fg;
      const v = c0 + (c1 - c0) * fb;
      data[i + c] = data[i + c] + (v - data[i + c]) * amount;
    }
  }
}

type LutProps = { lut: string; amount: number };

/** Filtro Fabric de "Look" de cor (LUT). Roda no backend Canvas 2D. */
export class LutFilter extends BaseFilter<'Lut', LutProps> {
  declare lut: string;
  declare amount: number;
  static type = 'Lut';
  static defaults: LutProps = { lut: '', amount: 1 };
  static uniformLocations: string[] = [];

  applyTo2d({ imageData }: { imageData: ImageData }) {
    const bytes = lutBytes(this.lut);
    if (bytes) applyLut(imageData.data, bytes, this.amount);
  }
  isNeutralState() {
    return !this.lut || this.amount === 0;
  }
}

/** Vinheta: escurece as bordas. */
export class VignetteFilter extends BaseFilter<'Vignette', { amount: number }> {
  declare amount: number;
  static type = 'Vignette';
  static defaults = { amount: 0 };
  static uniformLocations: string[] = [];
  applyTo2d({ imageData }: { imageData: ImageData }) {
    const { data, width, height } = imageData;
    const cx = width / 2, cy = height / 2;
    const max = Math.sqrt(cx * cx + cy * cy);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / max;
        const k = 1 - this.amount * Math.pow(Math.max(0, d - 0.25) / 0.75, 1.6);
        const i = (y * width + x) * 4;
        data[i] *= k; data[i + 1] *= k; data[i + 2] *= k;
      }
    }
  }
  isNeutralState() { return !this.amount; }
}

/** Temperatura: positivo esquenta, negativo esfria. */
export class TemperatureFilter extends BaseFilter<'Temperature', { amount: number }> {
  declare amount: number;
  static type = 'Temperature';
  static defaults = { amount: 0 };
  static uniformLocations: string[] = [];
  applyTo2d({ imageData }: { imageData: ImageData }) {
    const d = imageData.data, a = this.amount * 40;
    for (let i = 0; i < d.length; i += 4) { d[i] += a; d[i + 2] -= a; }
  }
  isNeutralState() { return !this.amount; }
}

classRegistry.setClass(LutFilter);
classRegistry.setClass(VignetteFilter);
classRegistry.setClass(TemperatureFilter);
