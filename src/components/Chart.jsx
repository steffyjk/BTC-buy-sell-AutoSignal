import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, createSeriesMarkers } from 'lightweight-charts';

function Chart({ candles, signals, emaPeriod = 20 }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const emaSeriesRef = useRef(null);
  const markersRef = useRef(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a2e' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2a2a4a' },
        horzLines: { color: '#2a2a4a' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#3a3a5a',
      },
      rightPriceScale: {
        borderColor: '#3a3a5a',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6a6a8a',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: '#6a6a8a',
          width: 1,
          style: 2,
        },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const emaSeries = chart.addSeries(LineSeries, {
      color: '#ffd700',
      lineWidth: 2,
      title: `EMA ${emaPeriod}`,
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    emaSeriesRef.current = emaSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (markersRef.current) {
        markersRef.current.detach();
      }
      chart.remove();
    };
  }, []);

  // Update candlestick and EMA data
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;

    candlestickSeriesRef.current.setData(candles);

    const emaData = calculateEMAForChart(candles, emaPeriod);
    if (emaSeriesRef.current && emaData.length > 0) {
      emaSeriesRef.current.setData(emaData);
      // Update EMA title dynamically
      emaSeriesRef.current.applyOptions({ title: `EMA ${emaPeriod}` });
    }

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles, emaPeriod]);

  // Add signal markers using v5 API
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;

    // Remove old markers
    if (markersRef.current) {
      markersRef.current.detach();
      markersRef.current = null;
    }

    if (signals.length === 0) return;

    const markers = signals.map((signal) => ({
      time: signal.timestamp,
      position: signal.type === 'BUY' ? 'belowBar' : 'aboveBar',
      color: signal.type === 'BUY' ? '#26a69a' : '#ef5350',
      shape: signal.type === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: signal.type,
    }));

    // v5 API: createSeriesMarkers
    markersRef.current = createSeriesMarkers(candlestickSeriesRef.current, markers);
  }, [signals]);

  return <div ref={chartContainerRef} className="chart-container" />;
}

function calculateEMAForChart(candles, period) {
  if (candles.length < period) return [];

  const closes = candles.map((c) => c.close);
  const multiplier = 2 / (period + 1);
  const emaData = [];

  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period - 1; i < candles.length; i++) {
    if (i >= period) {
      ema = (closes[i] - ema) * multiplier + ema;
    }
    emaData.push({
      time: candles[i].time,
      value: ema,
    });
  }

  return emaData;
}

export default Chart;
