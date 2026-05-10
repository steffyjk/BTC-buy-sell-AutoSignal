import { useState, useEffect, useRef, useCallback } from 'react';
import Chart from './components/Chart';
import Controls from './components/Controls';
import SignalLog from './components/SignalLog';
import PaperTrading from './components/PaperTrading';
import { fetchHistoricalCandles, createBinanceWs } from './utils/binanceWs';
import { calculateRSI, calculateEMAs, generateSignal, getRsiStatus, isBullishStack, isBearishStack, THRESHOLD_PRESETS } from './utils/indicators';
import './App.css';

const THEME_PRESETS = {
  white: {
    label: 'White',
    className: 'theme-white',
    chart: {
      background: '#f7f7fb',
      textColor: '#22263a',
      gridColor: '#d8dbe8',
      borderColor: '#c1c7dd',
      crosshairColor: '#8992b0',
    },
  },
  black: {
    label: 'Black',
    className: 'theme-black',
    chart: {
      background: '#1a1a2e',
      textColor: '#d1d4dc',
      gridColor: '#2a2a4a',
      borderColor: '#3a3a5a',
      crosshairColor: '#6a6a8a',
    },
  },
};

function parseEmaPeriods(value) {
  const parsed = value
    .split(',')
    .map((part) => parseInt(part.trim(), 10))
    .filter((period) => Number.isInteger(period) && period >= 2 && period <= 300);

  if (parsed.length === 0) {
    return [];
  }

  return [...new Set(parsed)].sort((a, b) => a - b);
}

function getEmaTrend(emas) {
  if (emas.length === 0 || emas.some((ema) => ema === null)) return 'WAIT';
  if (isBullishStack(emas)) return 'BULLISH';
  if (isBearishStack(emas)) return 'BEARISH';
  return 'MIXED';
}

// Scan historical candles for past signals
function scanHistoricalSignals(candles, thresholdKey, rsiPeriod, emaPeriods) {
  const signals = [];
  if (emaPeriods.length === 0) return signals;

  const thresholdConfig = THRESHOLD_PRESETS[thresholdKey];
  const minCandles = Math.max(rsiPeriod + 1, ...emaPeriods);

  if (candles.length < minCandles) return signals;

  let prevSignal = null;

  for (let i = minCandles - 1; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const closes = slice.map((c) => c.close);
    const rsi = calculateRSI(closes, rsiPeriod);
    const emas = calculateEMAs(closes, emaPeriods);
    const candle = candles[i];

    if (rsi !== null && emas.every((ema) => ema !== null)) {
      const signal = generateSignal(rsi, candle.close, emas, thresholdConfig);

      // Only add if different from previous signal (avoid consecutive same signals)
      if (signal && signal !== prevSignal) {
        signals.push({
          type: signal,
          price: candle.close,
          rsi: rsi,
          emas: emaPeriods.map((period, index) => ({ period, value: emas[index] })),
          timestamp: candle.time,
          time: new Date(candle.time * 1000).toLocaleTimeString(),
        });
        prevSignal = signal;
      } else if (!signal) {
        prevSignal = null;
      }
    }
  }

  return signals;
}

function App() {
  const [timeframe, setTimeframe] = useState('5m');
  const [threshold, setThreshold] = useState('standard');
  const [theme, setTheme] = useState('white');
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [emaInput, setEmaInput] = useState('8, 30');
  const [candles, setCandles] = useState([]);
  const [signals, setSignals] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [currentRSI, setCurrentRSI] = useState(null);
  const [currentEMAs, setCurrentEMAs] = useState([]);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef(null);
  const lastSignalTimeRef = useRef(null);
  const historicalScannedRef = useRef(false);

  const emaPeriods = parseEmaPeriods(emaInput);
  const emaPeriodsKey = emaPeriods.join(',');
  const minCandles = emaPeriods.length > 0 ? Math.max(rsiPeriod + 1, ...emaPeriods) : rsiPeriod + 1;
  const emaTrend = getEmaTrend(currentEMAs);
  const thresholdConfig = THRESHOLD_PRESETS[threshold];
  const currentRsiStatus = getRsiStatus(currentRSI, thresholdConfig);
  const themeConfig = THEME_PRESETS[theme] || THEME_PRESETS.white;

  useEffect(() => {
    setCurrentEMAs([]);
    setSignals([]);
    lastSignalTimeRef.current = null;
    historicalScannedRef.current = false;
  }, [emaPeriodsKey]);

  // Handle incoming candle data
  const handleCandle = useCallback((candle) => {
    setCandles((prev) => {
      const newCandles = [...prev];
      const lastCandle = newCandles[newCandles.length - 1];

      if (lastCandle && lastCandle.time === candle.time) {
        newCandles[newCandles.length - 1] = candle;
      } else {
        newCandles.push(candle);
        if (newCandles.length > 200) {
          newCandles.shift();
        }
      }

      return newCandles;
    });

    setCurrentPrice(candle.close);
    setConnected(true);
  }, []);

  // Scan historical signals when candles load
  useEffect(() => {
    if (candles.length >= minCandles && !historicalScannedRef.current) {
      if (emaPeriods.length === 0) {
        historicalScannedRef.current = true;
        return;
      }

      const historicalSignals = scanHistoricalSignals(candles, threshold, rsiPeriod, emaPeriods);
      if (historicalSignals.length > 0) {
        setSignals(historicalSignals);
        const lastSig = historicalSignals[historicalSignals.length - 1];
        if (lastSig) {
          lastSignalTimeRef.current = lastSig.timestamp;
        }
      }
      historicalScannedRef.current = true;
    }
  }, [candles, threshold, rsiPeriod, emaPeriodsKey, minCandles]);

  // Calculate indicators and check for NEW signals (real-time)
  useEffect(() => {
    if (candles.length < minCandles || !historicalScannedRef.current) return;

    const closes = candles.map((c) => c.close);
    const rsi = calculateRSI(closes, rsiPeriod);

    setCurrentRSI(rsi);

    if (emaPeriods.length === 0) {
      setCurrentEMAs([]);
      return;
    }

    const emas = calculateEMAs(closes, emaPeriods);
    setCurrentEMAs(emas);

    const lastCandle = candles[candles.length - 1];
    if (lastCandle && rsi !== null && emas.every((ema) => ema !== null)) {
      const signal = generateSignal(rsi, lastCandle.close, emas, thresholdConfig);

      if (signal && lastSignalTimeRef.current !== lastCandle.time) {
        lastSignalTimeRef.current = lastCandle.time;

        const newSignal = {
          type: signal,
          price: lastCandle.close,
          rsi: rsi,
          emas: emaPeriods.map((period, index) => ({ period, value: emas[index] })),
          timestamp: lastCandle.time,
          time: new Date(lastCandle.time * 1000).toLocaleTimeString(),
        };

        setSignals((prev) => [...prev.slice(-49), newSignal]);
      }
    }
  }, [candles, threshold, rsiPeriod, emaPeriodsKey, minCandles]);

  // Connect to Binance WebSocket
  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      setCandles([]);
      setSignals([]);
      setCurrentRSI(null);
      setCurrentEMAs([]);
      setConnected(false);
      lastSignalTimeRef.current = null;
      historicalScannedRef.current = false;

      try {
        const historical = await fetchHistoricalCandles(timeframe, 200);
        if (isMounted) {
          setCandles(historical);
        }

        wsRef.current = createBinanceWs(
          timeframe,
          (candle) => {
            if (isMounted) {
              handleCandle(candle);
            }
          },
          () => {
            if (isMounted) {
              setConnected(false);
            }
          }
        );
      } catch (error) {
        console.error('Failed to connect:', error);
        setConnected(false);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [timeframe, handleCandle]);

  // Re-scan when settings change
  useEffect(() => {
    if (emaPeriods.length === 0) {
      setSignals([]);
      return;
    }

    if (candles.length >= minCandles) {
      const historicalSignals = scanHistoricalSignals(candles, threshold, rsiPeriod, emaPeriods);
      setSignals(historicalSignals);
      if (historicalSignals.length > 0) {
        const lastSig = historicalSignals[historicalSignals.length - 1];
        lastSignalTimeRef.current = lastSig.timestamp;
      }
    }
  }, [threshold, rsiPeriod, emaPeriodsKey]);

  return (
    <div className={`app ${themeConfig.className}`}>
      <header className="header">
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((prev) => (prev === 'white' ? 'black' : 'white'))}
        >
          {theme === 'white' ? 'NIGHT' : 'DAY'}
        </button>
        <h1>BTC Signal Bot</h1>
        <span className="subtitle">Real-time BTC/USDT Trading Signals</span>
      </header>

      <Controls
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        threshold={threshold}
        setThreshold={setThreshold}
        rsiPeriod={rsiPeriod}
        setRsiPeriod={setRsiPeriod}
        emaInput={emaInput}
        setEmaInput={setEmaInput}
        emaPeriods={emaPeriods}
        rsi={currentRSI}
        rsiStatus={currentRsiStatus}
        emas={currentEMAs}
        emaTrend={emaTrend}
        price={currentPrice}
        connected={connected}
      />

      <div className="main-content">
        <Chart candles={candles} signals={signals} emaPeriods={emaPeriods} theme={themeConfig.chart} />
        <SignalLog signals={signals} />
        <PaperTrading signals={signals} currentPrice={currentPrice} />
      </div>

      <footer className="footer">
        <p>Data from Binance | Indicators: RSI ({rsiPeriod}) + EMA Stack ({emaPeriods.join(', ')})</p>
        <p className="disclaimer">For educational purposes only. Not financial advice. Trade at your own risk.</p>
      </footer>
    </div>
  );
}

export default App;
