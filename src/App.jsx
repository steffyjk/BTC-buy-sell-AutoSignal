import { useState, useEffect, useRef, useCallback } from 'react';
import Chart from './components/Chart';
import Controls from './components/Controls';
import SignalLog from './components/SignalLog';
import { fetchHistoricalCandles, createBinanceWs } from './utils/binanceWs';
import { calculateRSI, calculateEMA, generateSignal, THRESHOLD_PRESETS } from './utils/indicators';
import './App.css';

// Scan historical candles for past signals
function scanHistoricalSignals(candles, thresholdKey, rsiPeriod, emaPeriod) {
  const signals = [];
  const thresholdConfig = THRESHOLD_PRESETS[thresholdKey];
  const minCandles = Math.max(rsiPeriod, emaPeriod) + 1;

  if (candles.length < minCandles) return signals;

  let prevSignal = null;

  for (let i = minCandles - 1; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const closes = slice.map((c) => c.close);
    const rsi = calculateRSI(closes, rsiPeriod);
    const ema = calculateEMA(closes, emaPeriod);
    const candle = candles[i];

    if (rsi !== null && ema !== null) {
      const signal = generateSignal(rsi, candle.close, ema, thresholdConfig);

      // Only add if different from previous signal (avoid consecutive same signals)
      if (signal && signal !== prevSignal) {
        signals.push({
          type: signal,
          price: candle.close,
          rsi: rsi,
          ema: ema,
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
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [emaPeriod, setEmaPeriod] = useState(20);
  const [candles, setCandles] = useState([]);
  const [signals, setSignals] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [currentRSI, setCurrentRSI] = useState(null);
  const [currentEMA, setCurrentEMA] = useState(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef(null);
  const lastSignalTimeRef = useRef(null);
  const historicalScannedRef = useRef(false);

  const minCandles = Math.max(rsiPeriod, emaPeriod) + 1;

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
      const historicalSignals = scanHistoricalSignals(candles, threshold, rsiPeriod, emaPeriod);
      if (historicalSignals.length > 0) {
        setSignals(historicalSignals);
        const lastSig = historicalSignals[historicalSignals.length - 1];
        if (lastSig) {
          lastSignalTimeRef.current = lastSig.timestamp;
        }
      }
      historicalScannedRef.current = true;
    }
  }, [candles, threshold, rsiPeriod, emaPeriod, minCandles]);

  // Calculate indicators and check for NEW signals (real-time)
  useEffect(() => {
    if (candles.length < minCandles || !historicalScannedRef.current) return;

    const closes = candles.map((c) => c.close);
    const rsi = calculateRSI(closes, rsiPeriod);
    const ema = calculateEMA(closes, emaPeriod);

    setCurrentRSI(rsi);
    setCurrentEMA(ema);

    const lastCandle = candles[candles.length - 1];
    if (lastCandle && rsi !== null && ema !== null) {
      const thresholdConfig = THRESHOLD_PRESETS[threshold];
      const signal = generateSignal(rsi, lastCandle.close, ema, thresholdConfig);

      if (signal && lastSignalTimeRef.current !== lastCandle.time) {
        lastSignalTimeRef.current = lastCandle.time;

        const newSignal = {
          type: signal,
          price: lastCandle.close,
          rsi: rsi,
          ema: ema,
          timestamp: lastCandle.time,
          time: new Date(lastCandle.time * 1000).toLocaleTimeString(),
        };

        setSignals((prev) => [...prev.slice(-49), newSignal]);
      }
    }
  }, [candles, threshold, rsiPeriod, emaPeriod, minCandles]);

  // Connect to Binance WebSocket
  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      setCandles([]);
      setSignals([]);
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
    if (candles.length >= minCandles) {
      const historicalSignals = scanHistoricalSignals(candles, threshold, rsiPeriod, emaPeriod);
      setSignals(historicalSignals);
      if (historicalSignals.length > 0) {
        const lastSig = historicalSignals[historicalSignals.length - 1];
        lastSignalTimeRef.current = lastSig.timestamp;
      }
    }
  }, [threshold, rsiPeriod, emaPeriod]);

  return (
    <div className="app">
      <header className="header">
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
        emaPeriod={emaPeriod}
        setEmaPeriod={setEmaPeriod}
        rsi={currentRSI}
        ema={currentEMA}
        price={currentPrice}
        connected={connected}
      />

      <div className="main-content">
        <Chart candles={candles} signals={signals} emaPeriod={emaPeriod} />
        <SignalLog signals={signals} />
      </div>

      <footer className="footer">
        <p>Data from Binance | Indicators: RSI ({rsiPeriod}) + EMA ({emaPeriod})</p>
        <p className="disclaimer">For educational purposes only. Not financial advice. Trade at your own risk.</p>
      </footer>
    </div>
  );
}

export default App;
