// Technical Indicators for BTC Signal Bot

/**
 * Calculate RSI (Relative Strength Index)
 * @param {number[]} closes - Array of closing prices
 * @param {number} period - RSI period (default 14)
 * @returns {number|null} - RSI value or null if not enough data
 */
export function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;

  const recentCloses = closes.slice(-(period + 1));
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < recentCloses.length; i++) {
    const change = recentCloses[i] - recentCloses[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Math.round(rsi * 100) / 100;
}

/**
 * Calculate EMA (Exponential Moving Average)
 * @param {number[]} closes - Array of closing prices
 * @param {number} period - EMA period (default 20)
 * @returns {number|null} - EMA value or null if not enough data
 */
export function calculateEMA(closes, period = 20) {
  if (closes.length < period) return null;

  const multiplier = 2 / (period + 1);

  // Start with SMA for the first EMA value
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Calculate EMA for remaining values
  for (let i = period; i < closes.length; i++) {
    ema = (closes[i] - ema) * multiplier + ema;
  }

  return Math.round(ema * 100) / 100;
}

/**
 * Generate trading signal based on RSI and EMA
 * @param {number} rsi - Current RSI value
 * @param {number} price - Current price
 * @param {number} ema - Current EMA value
 * @param {object} thresholds - RSI thresholds { oversold, overbought }
 * @returns {string|null} - 'BUY', 'SELL', or null
 */
export function generateSignal(rsi, price, ema, thresholds) {
  if (rsi === null || ema === null) return null;

  const { oversold, overbought } = thresholds;

  // BUY: RSI oversold AND price above EMA (momentum turning up)
  if (rsi < oversold && price > ema) {
    return 'BUY';
  }

  // SELL: RSI overbought AND price below EMA (momentum turning down)
  if (rsi > overbought && price < ema) {
    return 'SELL';
  }

  return null;
}

/**
 * Threshold presets
 */
export const THRESHOLD_PRESETS = {
  aggressive: { oversold: 40, overbought: 60, label: 'Aggressive (40/60)' },
  standard: { oversold: 35, overbought: 65, label: 'Standard (35/65)' },
  conservative: { oversold: 30, overbought: 70, label: 'Conservative (30/70)' },
};

/**
 * Timeframe options
 */
export const TIMEFRAMES = [
  { value: '1m', label: '1 Minute', wsInterval: '1m' },
  { value: '5m', label: '5 Minutes', wsInterval: '5m' },
  { value: '15m', label: '15 Minutes', wsInterval: '15m' },
  { value: '1h', label: '1 Hour', wsInterval: '1h' },
  { value: '4h', label: '4 Hours', wsInterval: '4h' },
];
