import { useState, useEffect, useRef, useCallback } from 'react';
import Chart from './components/Chart';
import Controls from './components/Controls';
import SignalLog from './components/SignalLog';
import { fetchHistoricalCandles, createBinanceWs } from './utils/binanceWs';
import { calculateRSI, calculateEMA, generateSignal, THRESHOLD_PRESETS } from './utils/indicators';
import './App.css';

function App() {
  const [timeframe, setTimeframe] = useState('5m');
  const [threshold, setThreshold] = useState('standard');
  const [candles, setCandles] = useState([]);
  const [signals, setSignals] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [currentRSI, setCurrentRSI] = useState(null);
  const [currentEMA, setCurrentEMA] = useState(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef(null);
  const lastSignalTimeRef = useRef(null);

  // Handle incoming candle data
  const handleCandle = useCallback((candle) => {
    setCandles((prev) => {
      const newCandles = [...prev];
      const lastCandle = newCandles[newCandles.length - 1];

      if (lastCandle && lastCandle.time === candle.time) {
        // Update existing candle
        newCandles[newCandles.length - 1] = candle;
      } else {
        // Add new candle
        newCandles.push(candle);
        // Keep only last 200 candles
        if (newCandles.length > 200) {
          newCandles.shift();
        }
      }

      return newCandles;
    });

    setCurrentPrice(candle.close);
    setConnected(true);
  }, []);

  // Calculate indicators and check for signals
  useEffect(() => {
    if (candles.length < 21) return;

    const closes = candles.map((c) => c.close);
    const rsi = calculateRSI(closes, 14);
    const ema = calculateEMA(closes, 20);

    setCurrentRSI(rsi);
    setCurrentEMA(ema);

    // Check for signal on closed candles only
    const lastCandle = candles[candles.length - 1];
    if (lastCandle && rsi !== null && ema !== null) {
      const thresholdConfig = THRESHOLD_PRESETS[threshold];
      const signal = generateSignal(rsi, lastCandle.close, ema, thresholdConfig);

      // Prevent duplicate signals for same candle
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

        setSignals((prev) => [...prev.slice(-49), newSignal]); // Keep last 50 signals
      }
    }
  }, [candles, threshold]);

  // Connect to Binance WebSocket
  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Reset state
      setCandles([]);
      setSignals([]);
      setConnected(false);
      lastSignalTimeRef.current = null;

      try {
        // Fetch historical data first
        const historical = await fetchHistoricalCandles(timeframe, 200);
        if (isMounted) {
          setCandles(historical);
        }

        // Connect to WebSocket
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
        rsi={currentRSI}
        ema={currentEMA}
        price={currentPrice}
        connected={connected}
      />

      <div className="main-content">
        <Chart candles={candles} signals={signals} />
        <SignalLog signals={signals} />
      </div>

      <footer className="footer">
        <p>Data from Binance | Indicators: RSI (14) + EMA (20) | Not financial advice</p>
      </footer>
    </div>
  );
}

export default App;
