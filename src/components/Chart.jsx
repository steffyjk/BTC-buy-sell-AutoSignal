import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, createSeriesMarkers } from 'lightweight-charts';

const EMA_COLORS = ['#ffd700', '#ff8c42', '#60a5fa', '#34d399', '#f472b6', '#a78bfa'];
const RSI_PERIOD = 14;

function Chart({ candles, signals, emaPeriods = [20], theme, rsiEnabled, rsiOversold = 30, rsiOverbought = 80 }) {
  const chartContainerRef = useRef(null);
  const rsiContainerRef = useRef(null);
  const chartRef = useRef(null);
  const rsiChartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const emaSeriesRefs = useRef([]);
  const rsiSeriesRef = useRef(null);
  const oversoldLineRef = useRef(null);
  const overboughtLineRef = useRef(null);
  const markersRef = useRef(null);
  const emaPeriodsKey = emaPeriods.join(',');

  const getChartHeight = () => {
    if (typeof window === 'undefined') return 400;
    if (window.innerWidth <= 480) return 250;
    if (window.innerWidth <= 768) return 300;
    return 400;
  };

  const getRsiHeight = () => {
    if (typeof window === 'undefined') return 150;
    if (window.innerWidth <= 480) return 100;
    if (window.innerWidth <= 768) return 120;
    return 150;
  };

  // Initialize main chart
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
      height: getChartHeight(),
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
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: getChartHeight(),
        });
      }
      if (rsiContainerRef.current && rsiChartRef.current) {
        rsiChartRef.current.applyOptions({
          width: rsiContainerRef.current.clientWidth,
          height: getRsiHeight(),
        });
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

  // Initialize RSI chart
  useEffect(() => {
    if (!rsiEnabled || !rsiContainerRef.current) {
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiSeriesRef.current = null;
        oversoldLineRef.current = null;
        overboughtLineRef.current = null;
      }
      return;
    }

    const rsiChart = createChart(rsiContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.textColor,
      },
      grid: {
        vertLines: { color: theme.gridColor },
        horzLines: { color: theme.gridColor },
      },
      width: rsiContainerRef.current.clientWidth,
      height: getRsiHeight(),
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: theme.borderColor,
      },
      rightPriceScale: {
        borderColor: theme.borderColor,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
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

    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: '#a855f7',
      lineWidth: 2,
      title: 'RSI (14)',
      priceFormat: {
        type: 'custom',
        formatter: (price) => price.toFixed(1),
      },
    });

    // Oversold line
    const oversoldLine = rsiChart.addSeries(LineSeries, {
      color: '#26a69a',
      lineWidth: 1,
      lineStyle: 2,
      title: `Oversold (${rsiOversold})`,
      crosshairMarkerVisible: false,
    });

    // Overbought line
    const overboughtLine = rsiChart.addSeries(LineSeries, {
      color: '#ef5350',
      lineWidth: 1,
      lineStyle: 2,
      title: `Overbought (${rsiOverbought})`,
      crosshairMarkerVisible: false,
    });

    rsiChartRef.current = rsiChart;
    rsiSeriesRef.current = rsiSeries;
    oversoldLineRef.current = oversoldLine;
    overboughtLineRef.current = overboughtLine;

    // Sync time scales
    if (chartRef.current) {
      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (rsiChartRef.current && range) {
          rsiChartRef.current.timeScale().setVisibleLogicalRange(range);
        }
      });

      rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (chartRef.current && range) {
          chartRef.current.timeScale().setVisibleLogicalRange(range);
        }
      });
    }

    return () => {
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiSeriesRef.current = null;
        oversoldLineRef.current = null;
        overboughtLineRef.current = null;
      }
    };
  }, [rsiEnabled, theme]);

  // Update theme
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

    if (rsiChartRef.current) {
      rsiChartRef.current.applyOptions({
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
    }
  }, [theme]);

  // Update EMA series
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

  // Update candlestick, EMA, and RSI data
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;

    candlestickSeriesRef.current.setData(candles);

    // Update EMA data
    emaSeriesRefs.current.forEach((series, index) => {
      const period = emaPeriods[index];
      const emaData = calculateEMAForChart(candles, period);
      series.setData(emaData);
      series.applyOptions({ title: `EMA ${period}` });
    });

    // Update RSI data
    if (rsiEnabled && rsiSeriesRef.current && candles.length >= RSI_PERIOD + 1) {
      const rsiData = calculateRSIForChart(candles, RSI_PERIOD);
      rsiSeriesRef.current.setData(rsiData);

      // Update threshold lines
      if (oversoldLineRef.current && overboughtLineRef.current && rsiData.length > 0) {
        const firstTime = rsiData[0].time;
        const lastTime = rsiData[rsiData.length - 1].time;

        oversoldLineRef.current.setData([
          { time: firstTime, value: rsiOversold },
          { time: lastTime, value: rsiOversold },
        ]);
        oversoldLineRef.current.applyOptions({ title: `Oversold (${rsiOversold})` });

        overboughtLineRef.current.setData([
          { time: firstTime, value: rsiOverbought },
          { time: lastTime, value: rsiOverbought },
        ]);
        overboughtLineRef.current.applyOptions({ title: `Overbought (${rsiOverbought})` });
      }

      if (rsiChartRef.current) {
        rsiChartRef.current.timeScale().fitContent();
      }
    }

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles, emaPeriodsKey, rsiEnabled, rsiOversold, rsiOverbought]);

  // Add signal markers
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;

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

    markersRef.current = createSeriesMarkers(candlestickSeriesRef.current, markers);
  }, [signals]);

  return (
    <div className="charts-wrapper">
      <div ref={chartContainerRef} className="chart-container" />
      {rsiEnabled && (
        <div ref={rsiContainerRef} className="rsi-chart-container" />
      )}
    </div>
  );
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

function calculateRSIForChart(candles, period) {
  if (candles.length < period + 1) return [];

  const closes = candles.map((c) => c.close);
  const rsiData = [];

  for (let i = period; i < closes.length; i++) {
    const slice = closes.slice(i - period, i + 1);
    let gains = 0;
    let losses = 0;

    for (let j = 1; j < slice.length; j++) {
      const change = slice[j] - slice[j - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    let rsi;
    if (avgLoss === 0) {
      rsi = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
    }

    rsiData.push({
      time: candles[i].time,
      value: rsi,
    });
  }

  return rsiData;
}

export default Chart;
