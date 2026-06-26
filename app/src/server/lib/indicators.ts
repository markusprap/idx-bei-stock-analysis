type OHLCV = { close: number; high: number; low: number };

function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i] ?? 0;
  let prev = sum / period;
  result.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = (values[i] ?? 0) * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function rollingStd(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
  return Math.sqrt(variance);
}

export type Indicators = {
  tradeDate: string | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  ma20: number | null;
  ma50: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  atr14: number | null;
};

export type OHLCVRow = { tradeDate: string; close: number | null; high: number | null; low: number | null };

export function computeIndicators(rows: OHLCVRow[]): Indicators {
  const sorted = [...rows].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  const valid = sorted.filter(
    (r): r is OHLCVRow & OHLCV & { tradeDate: string } =>
      r.close !== null && r.high !== null && r.low !== null,
  );

  const empty: Indicators = {
    tradeDate: null, rsi14: null, macd: null, macdSignal: null,
    macdHistogram: null, ma20: null, ma50: null,
    bbUpper: null, bbMiddle: null, bbLower: null, atr14: null,
  };

  if (valid.length < 2) return empty;

  const closes = valid.map((r) => r.close);
  const highs = valid.map((r) => r.high);
  const lows = valid.map((r) => r.low);
  const lastDate = valid[valid.length - 1]?.tradeDate ?? null;

  // RSI(14)
  let rsi14: number | null = null;
  if (closes.length >= 15) {
    const changes = closes.slice(1).map((c, i) => c - (closes[i] ?? 0));
    const gains = changes.map((d) => (d > 0 ? d : 0));
    const losses = changes.map((d) => (d < 0 ? -d : 0));
    let avgGain = gains.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
    let avgLoss = losses.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
    for (let i = 14; i < changes.length; i++) {
      avgGain = (avgGain * 13 + (gains[i] ?? 0)) / 14;
      avgLoss = (avgLoss * 13 + (losses[i] ?? 0)) / 14;
    }
    rsi14 = avgLoss === 0 ? 100 : Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 100) / 100;
  }

  // MACD(12,26,9)
  let macd: number | null = null;
  let macdSignal: number | null = null;
  let macdHistogram: number | null = null;
  if (closes.length >= 26) {
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    const ema12offset = ema12.length - ema26.length;
    const macdLine = ema26.map((e26, i) => (ema12[i + ema12offset] ?? 0) - e26);
    if (macdLine.length >= 9) {
      const signalLine = ema(macdLine, 9);
      const last = macdLine[macdLine.length - 1] ?? 0;
      const sig = signalLine[signalLine.length - 1] ?? 0;
      macd = Math.round(last * 10000) / 10000;
      macdSignal = Math.round(sig * 10000) / 10000;
      macdHistogram = Math.round((last - sig) * 10000) / 10000;
    }
  }

  // MA20, MA50
  const ma20 = sma(closes, 20) !== null ? Math.round((sma(closes, 20) ?? 0) * 100) / 100 : null;
  const ma50 = sma(closes, 50) !== null ? Math.round((sma(closes, 50) ?? 0) * 100) / 100 : null;

  // Bollinger Bands(20, 2σ)
  let bbUpper: number | null = null;
  let bbMiddle: number | null = null;
  let bbLower: number | null = null;
  if (closes.length >= 20) {
    const mid = sma(closes, 20) ?? 0;
    const std = rollingStd(closes, 20) ?? 0;
    bbMiddle = Math.round(mid * 100) / 100;
    bbUpper = Math.round((mid + 2 * std) * 100) / 100;
    bbLower = Math.round((mid - 2 * std) * 100) / 100;
  }

  // ATR(14) — needs high/low/close
  let atr14: number | null = null;
  if (valid.length >= 15) {
    const trs: number[] = [];
    for (let i = 1; i < valid.length; i++) {
      const h = highs[i] ?? 0;
      const l = lows[i] ?? 0;
      const pc = closes[i - 1] ?? 0;
      trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    let atr = trs.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
    for (let i = 14; i < trs.length; i++) {
      atr = (atr * 13 + (trs[i] ?? 0)) / 14;
    }
    atr14 = Math.round(atr * 100) / 100;
  }

  return { tradeDate: lastDate, rsi14, macd, macdSignal, macdHistogram, ma20, ma50, bbUpper, bbMiddle, bbLower, atr14 };
}
