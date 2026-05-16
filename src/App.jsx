import { useState, useEffect, useRef, useCallback } from 'react';
import Chart from './components/Chart';
import Controls from './components/Controls';
import SignalLog from './components/SignalLog';
import PaperTrading from './components/PaperTrading';
import { fetchHistoricalCandles, createBinanceWs } from './utils/binanceWs';
import { calculateRSI, calculateEMAs, generateSignal, getEmaTrend } from './utils/indicators';
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

const RSI_PERIOD = 14;

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

// Scan historical candles for past signals (EMA crossover based, optionally with RSI)
function scanHistoricalSignals(candles, emaPeriods, rsiEnabled, rsiOversold, rsiOverbought) {
  const signals = [];
  if (emaPeriods.length === 0) return signals;

  const minCandles = Math.max(...emaPeriods, RSI_PERIOD) + 1;

  if (candles.length < minCandles) return signals;

  for (let i = minCandles; i < candles.length; i++) {
    const prevSlice = candles.slice(0, i);
    const currentSlice = candles.slice(0, i + 1);

    const prevCloses = prevSlice.map((c) => c.close);
    const currentCloses = currentSlice.map((c) => c.close);

    const prevEmas = calculateEMAs(prevCloses, emaPeriods);
    const currentEmas = calculateEMAs(currentCloses, emaPeriods);

    const prevCandle = candles[i - 1];
    const currentCandle = candles[i];

    // Calculate RSI if enabled
    let rsiConfig = null;
    let currentRsi = null;
    if (rsiEnabled) {
      currentRsi = calculateRSI(currentCloses, RSI_PERIOD);
      if (currentRsi !== null) {
        rsiConfig = { rsi: currentRsi, oversold: rsiOversold, overbought: rsiOverbought };
      }
    }

    const signal = generateSignal(currentCandle.close, currentEmas, prevCandle.close, prevEmas, rsiConfig);

    if (signal) {
      signals.push({
        type: signal,
        price: currentCandle.close,
        emas: emaPeriods.map((period, index) => ({ period, value: currentEmas[index] })),
        rsi: currentRsi,
        timestamp: currentCandle.time,
        time: new Date(currentCandle.time * 1000).toLocaleTimeString(),
      });
    }
  }

  return signals;
}

function App() {
  const [timeframe, setTimeframe] = useState('1h');
  const [theme, setTheme] = useState('white');
  const [emaInput, setEmaInput] = useState('8, 30');
  const [candles, setCandles] = useState([]);
  const [signals, setSignals] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [currentEMAs, setCurrentEMAs] = useState([]);
  const [currentRSI, setCurrentRSI] = useState(null);
  const [connected, setConnected] = useState(false);

  // RSI settings
  const [rsiEnabled, setRsiEnabled] = useState(false);
  const [rsiOversold, setRsiOversold] = useState(30);
  const [rsiOverbought, setRsiOverbought] = useState(80);

  const wsRef = useRef(null);
  const lastSignalTimeRef = useRef(null);
  const historicalScannedRef = useRef(false);
  const prevEmasRef = useRef([]);
  const prevPriceRef = useRef(null);

  const emaPeriods = parseEmaPeriods(emaInput);
  const emaPeriodsKey = emaPeriods.join(',');
  const minCandles = emaPeriods.length > 0 ? Math.max(...emaPeriods, RSI_PERIOD) + 1 : RSI_PERIOD + 1;
  const emaTrend = getEmaTrend(currentEMAs, currentPrice);
  const themeConfig = THEME_PRESETS[theme] || THEME_PRESETS.white;

  useEffect(() => {
    setCurrentEMAs([]);
    setSignals([]);
    lastSignalTimeRef.current = null;
    historicalScannedRef.current = false;
    prevEmasRef.current = [];
    prevPriceRef.current = null;
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

      const historicalSignals = scanHistoricalSignals(candles, emaPeriods, rsiEnabled, rsiOversold, rsiOverbought);
      if (historicalSignals.length > 0) {
        setSignals(historicalSignals);
        const lastSig = historicalSignals[historicalSignals.length - 1];
        if (lastSig) {
          lastSignalTimeRef.current = lastSig.timestamp;
        }
      }

      // Initialize prev values for real-time signal detection
      if (candles.length >= 2) {
        const prevSlice = candles.slice(0, -1);
        const prevCloses = prevSlice.map((c) => c.close);
        prevEmasRef.current = calculateEMAs(prevCloses, emaPeriods);
        prevPriceRef.current = candles[candles.length - 2].close;
      }

      historicalScannedRef.current = true;
    }
  }, [candles, emaPeriodsKey, minCandles, rsiEnabled, rsiOversold, rsiOverbought]);

  // Calculate indicators and check for NEW signals (real-time)
  useEffect(() => {
    if (candles.length < minCandles || !historicalScannedRef.current) return;

    const closes = candles.map((c) => c.close);

    // Calculate RSI
    const rsi = calculateRSI(closes, RSI_PERIOD);
    setCurrentRSI(rsi);

    if (emaPeriods.length === 0) {
      setCurrentEMAs([]);
      return;
    }

    const emas = calculateEMAs(closes, emaPeriods);
    setCurrentEMAs(emas);

    const lastCandle = candles[candles.length - 1];
    const prevEmas = prevEmasRef.current;
    const prevPrice = prevPriceRef.current;

    if (lastCandle && emas.every((ema) => ema !== null) && prevEmas.length > 0) {
      // Build RSI config if enabled
      let rsiConfig = null;
      if (rsiEnabled && rsi !== null) {
        rsiConfig = { rsi, oversold: rsiOversold, overbought: rsiOverbought };
      }

      const signal = generateSignal(lastCandle.close, emas, prevPrice, prevEmas, rsiConfig);

      if (signal && lastSignalTimeRef.current !== lastCandle.time) {
        lastSignalTimeRef.current = lastCandle.time;

        const newSignal = {
          type: signal,
          price: lastCandle.close,
          emas: emaPeriods.map((period, index) => ({ period, value: emas[index] })),
          rsi: rsi,
          timestamp: lastCandle.time,
          time: new Date(lastCandle.time * 1000).toLocaleTimeString(),
        };

        setSignals((prev) => [...prev.slice(-49), newSignal]);
      }
    }

    // Update prev values when new candle appears
    if (candles.length >= 2) {
      const secondLastCandle = candles[candles.length - 2];
      if (prevPriceRef.current !== secondLastCandle.close) {
        const prevSlice = candles.slice(0, -1);
        const prevCloses = prevSlice.map((c) => c.close);
        prevEmasRef.current = calculateEMAs(prevCloses, emaPeriods);
        prevPriceRef.current = secondLastCandle.close;
      }
    }
  }, [candles, emaPeriodsKey, minCandles, rsiEnabled, rsiOversold, rsiOverbought]);

  // Connect to Binance WebSocket
  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      setCandles([]);
      setSignals([]);
      setCurrentEMAs([]);
      setCurrentRSI(null);
      setConnected(false);
      lastSignalTimeRef.current = null;
      historicalScannedRef.current = false;
      prevEmasRef.current = [];
      prevPriceRef.current = null;

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

  // Re-scan when EMA or RSI settings change
  useEffect(() => {
    if (emaPeriods.length === 0) {
      setSignals([]);
      return;
    }

    if (candles.length >= minCandles) {
      const historicalSignals = scanHistoricalSignals(candles, emaPeriods, rsiEnabled, rsiOversold, rsiOverbought);
      setSignals(historicalSignals);
      if (historicalSignals.length > 0) {
        const lastSig = historicalSignals[historicalSignals.length - 1];
        lastSignalTimeRef.current = lastSig.timestamp;
      }

      // Update prev values
      if (candles.length >= 2) {
        const prevSlice = candles.slice(0, -1);
        const prevCloses = prevSlice.map((c) => c.close);
        prevEmasRef.current = calculateEMAs(prevCloses, emaPeriods);
        prevPriceRef.current = candles[candles.length - 2].close;
      }
    }
  }, [emaPeriodsKey, rsiEnabled, rsiOversold, rsiOverbought]);

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
        emaInput={emaInput}
        setEmaInput={setEmaInput}
        emaPeriods={emaPeriods}
        emas={currentEMAs}
        emaTrend={emaTrend}
        price={currentPrice}
        connected={connected}
        rsiEnabled={rsiEnabled}
        setRsiEnabled={setRsiEnabled}
        rsiOversold={rsiOversold}
        setRsiOversold={setRsiOversold}
        rsiOverbought={rsiOverbought}
        setRsiOverbought={setRsiOverbought}
        currentRsi={currentRSI}
      />

      <div className="main-content">
        <Chart
          candles={candles}
          signals={signals}
          emaPeriods={emaPeriods}
          theme={themeConfig.chart}
          rsiEnabled={rsiEnabled}
          rsiOversold={rsiOversold}
          rsiOverbought={rsiOverbought}
        />
        <SignalLog signals={signals} rsiEnabled={rsiEnabled} />
        <PaperTrading signals={signals} currentPrice={currentPrice} />
      </div>

      <footer className="footer">
        <p>Data from Binance | {emaPeriods.length === 1 ? 'Price Cross' : 'EMA Cross'}{rsiEnabled ? ' + RSI Filter' : ''}</p>
        <p className="disclaimer">For educational purposes only. Not financial advice. Trade at your own risk.</p>
      </footer>
    </div>
  );
}

export default App;
