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
 * Calculate multiple EMAs for the same close series
 * @param {number[]} closes - Array of closing prices
 * @param {number[]} periods - Ordered EMA periods
 * @returns {Array<number|null>} - EMA values in the same order as periods
 */
export function calculateEMAs(closes, periods) {
  return periods.map((period) => calculateEMA(closes, period));
}

/**
 * Generate trading signal based on EMA crossover (no RSI)
 *
 * Single EMA mode: Price crossover
 * - BUY: Price crosses above EMA (prev price <= prev EMA, current price > current EMA)
 * - SELL: Price crosses below EMA (prev price >= prev EMA, current price < current EMA)
 *
 * Multiple EMA mode: Fast/Slow EMA crossover
 * - BUY: Fastest EMA crosses above slowest EMA
 * - SELL: Fastest EMA crosses below slowest EMA
 *
 * @param {number} price - Current price
 * @param {number[]} emas - Current EMA values ordered from fastest to slowest
 * @param {number} prevPrice - Previous candle's price
 * @param {number[]} prevEmas - Previous candle's EMA values
 * @param {object|null} rsiConfig - Optional RSI config { rsi, oversold, overbought }
 * @returns {string|null} - 'BUY', 'SELL', or null
 */
export function generateSignal(price, emas, prevPrice, prevEmas, rsiConfig = null) {
  if (!Array.isArray(emas) || emas.length === 0 || emas.some((ema) => ema === null)) {
    return null;
  }

  if (!Array.isArray(prevEmas) || prevEmas.length === 0 || prevEmas.some((ema) => ema === null)) {
    return null;
  }

  if (prevPrice === null || prevPrice === undefined) {
    return null;
  }

  // Check RSI filter if enabled
  let rsiBuyOk = true;
  let rsiSellOk = true;

  if (rsiConfig && rsiConfig.rsi !== null) {
    const { rsi, oversold, overbought } = rsiConfig;
    rsiBuyOk = rsi <= oversold;
    rsiSellOk = rsi >= overbought;
  }

  // Single EMA mode: Price crossover
  if (emas.length === 1) {
    const currentEma = emas[0];
    const prevEma = prevEmas[0];

    // BUY: Price crosses above EMA (and RSI filter passes if enabled)
    if (prevPrice <= prevEma && price > currentEma && rsiBuyOk) {
      return 'BUY';
    }

    // SELL: Price crosses below EMA (and RSI filter passes if enabled)
    if (prevPrice >= prevEma && price < currentEma && rsiSellOk) {
      return 'SELL';
    }

    return null;
  }

  // Multiple EMA mode: Fast EMA crosses Slow EMA
  const fastEma = emas[0];
  const slowEma = emas[emas.length - 1];
  const prevFastEma = prevEmas[0];
  const prevSlowEma = prevEmas[prevEmas.length - 1];

  // BUY: Fast EMA crosses above Slow EMA (and RSI filter passes if enabled)
  if (prevFastEma <= prevSlowEma && fastEma > slowEma && rsiBuyOk) {
    return 'BUY';
  }

  // SELL: Fast EMA crosses below Slow EMA (and RSI filter passes if enabled)
  if (prevFastEma >= prevSlowEma && fastEma < slowEma && rsiSellOk) {
    return 'SELL';
  }

  return null;
}

/**
 * Get current trend based on EMA positions
 * @param {number[]} emas - EMA values ordered from fastest to slowest
 * @param {number} price - Current price
 * @returns {string} - BULLISH, BEARISH, or NEUTRAL
 */
export function getEmaTrend(emas, price) {
  if (!Array.isArray(emas) || emas.length === 0 || emas.some((ema) => ema === null)) {
    return 'WAIT';
  }

  // Single EMA: compare price to EMA
  if (emas.length === 1) {
    if (price > emas[0]) return 'BULLISH';
    if (price < emas[0]) return 'BEARISH';
    return 'NEUTRAL';
  }

  // Multiple EMAs: check fast vs slow
  const fastEma = emas[0];
  const slowEma = emas[emas.length - 1];

  if (fastEma > slowEma) return 'BULLISH';
  if (fastEma < slowEma) return 'BEARISH';
  return 'NEUTRAL';
}

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
