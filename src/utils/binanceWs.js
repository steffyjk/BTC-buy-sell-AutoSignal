// Binance WebSocket Connection for Real-time BTC Data

const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';
const BINANCE_REST_BASE = 'https://api.binance.com/api/v3';

/**
 * Fetch historical klines (candlesticks) from Binance REST API
 * @param {string} interval - Timeframe interval (1m, 5m, 15m, 1h, 4h)
 * @param {number} limit - Number of candles to fetch (default 200)
 * @returns {Promise<Array>} - Array of candle objects
 */
export async function fetchHistoricalCandles(interval, limit = 200) {
  const url = `${BINANCE_REST_BASE}/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`;

  const response = await fetch(url);
  const data = await response.json();

  return data.map((kline) => ({
    time: Math.floor(kline[0] / 1000), // Convert ms to seconds
    open: parseFloat(kline[1]),
    high: parseFloat(kline[2]),
    low: parseFloat(kline[3]),
    close: parseFloat(kline[4]),
    volume: parseFloat(kline[5]),
  }));
}

/**
 * Create WebSocket connection to Binance kline stream
 * @param {string} interval - Timeframe interval
 * @param {function} onCandle - Callback for new/updated candle
 * @param {function} onError - Callback for errors
 * @returns {WebSocket} - WebSocket instance
 */
export function createBinanceWs(interval, onCandle, onError) {
  const wsUrl = `${BINANCE_WS_BASE}/btcusdt@kline_${interval}`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log(`Connected to Binance WS: ${interval}`);
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const kline = data.k;

    const candle = {
      time: Math.floor(kline.t / 1000),
      open: parseFloat(kline.o),
      high: parseFloat(kline.h),
      low: parseFloat(kline.l),
      close: parseFloat(kline.c),
      volume: parseFloat(kline.v),
      isClosed: kline.x, // Is this candle closed/final?
    };

    onCandle(candle);
  };

  ws.onerror = (error) => {
    console.error('Binance WS Error:', error);
    if (onError) onError(error);
  };

  ws.onclose = () => {
    console.log('Binance WS Disconnected');
  };

  return ws;
}
