import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, createSeriesMarkers } from 'lightweight-charts';

const EMA_COLORS = ['#ffd700', '#ff8c42', '#60a5fa', '#34d399', '#f472b6', '#a78bfa'];

function Chart({ candles, signals, emaPeriods = [20], theme }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const emaSeriesRefs = useRef([]);
  const markersRef = useRef(null);
  const emaPeriodsKey = emaPeriods.join(',');

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.textColor,
      },
      grid: {
        vertLines: { color: theme.gridColor },
        horzLines: { color: theme.gridColor },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: theme.borderColor,
      },
      rightPriceScale: {
        borderColor: theme.borderColor,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: theme.crosshairColor,
          width: 1,
          style: 2,
        },
        horzLine: {
          color: theme.crosshairColor,
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

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

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
      markersRef.current = null;
      emaSeriesRefs.current = [];
      candlestickSeriesRef.current = null;
      chartRef.current = null;
      chart.remove();
    };
  }, [theme]);

  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.textColor,
      },
      grid: {
        vertLines: { color: theme.gridColor },
        horzLines: { color: theme.gridColor },
      },
      timeScale: {
        borderColor: theme.borderColor,
      },
      rightPriceScale: {
        borderColor: theme.borderColor,
      },
      crosshair: {
        vertLine: {
          color: theme.crosshairColor,
        },
        horzLine: {
          color: theme.crosshairColor,
        },
      },
    });
  }, [theme]);

  useEffect(() => {
    if (!chartRef.current) return;

    emaSeriesRefs.current.forEach((series) => {
      if (series) {
        chartRef.current.removeSeries(series);
      }
    });

    emaSeriesRefs.current = emaPeriods.map((period, index) =>
      chartRef.current.addSeries(LineSeries, {
        color: EMA_COLORS[index % EMA_COLORS.length],
        lineWidth: 2,
        title: `EMA ${period}`,
      })
    );
  }, [emaPeriodsKey]);

  // Update candlestick and EMA data
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;

    candlestickSeriesRef.current.setData(candles);

    if (emaSeriesRefs.current.length === 0) {
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
      return;
    }

    emaSeriesRefs.current.forEach((series, index) => {
      const period = emaPeriods[index];
      const emaData = calculateEMAForChart(candles, period);

      series.setData(emaData);
      series.applyOptions({ title: `EMA ${period}` });
    });

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles, emaPeriodsKey]);

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
