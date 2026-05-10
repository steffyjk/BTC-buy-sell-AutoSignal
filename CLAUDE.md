# CLAUDE.md - BTC Signal Bot

## Project Overview

Real-time BTC/USDT trading signal bot that generates BUY/SELL signals based on RSI and a configurable EMA stack. Pure frontend React app — no backend needed.

**Live URL:** https://btc.steffy.in
**Repo:** https://github.com/steffyjk/BTC-buy-sell-AutoSignal
**Deployed on:** Vercel (auto-deploys on push to main)

## Tech Stack

- **Framework:** React 18 + Vite
- **Charts:** lightweight-charts v5 (TradingView)
- **Data Source:** Binance WebSocket API (free, no auth)
- **Styling:** Plain CSS (dark theme)

## Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Deploy (push to GitHub, Vercel auto-deploys)
git add -A && git commit -m "message" && git push
```

## File Structure

```
src/
├── App.jsx              # Main app, state management, WebSocket connection
├── App.css              # All styles (dark theme)
├── components/
│   ├── Chart.jsx        # Lightweight Charts candlestick + multiple EMA lines + markers
│   ├── Controls.jsx     # Timeframe, sensitivity, RSI and EMA stack inputs
│   └── SignalLog.jsx    # Signal history list
└── utils/
    ├── indicators.js    # RSI, EMA calculations, signal logic, presets
    └── binanceWs.js     # Binance WebSocket + REST API for candles
```

## Signal Logic

**BUY Signal:** RSI < oversold threshold AND Price > fastest EMA AND all configured EMAs are bullishly stacked
**SELL Signal:** RSI > overbought threshold AND Price < fastest EMA AND all configured EMAs are bearishly stacked

### Exact Logic Used In Code
- Signal generation lives in `src/utils/indicators.js` inside `generateSignal(rsi, price, ema, thresholds)`.
- A signal is only evaluated when both indicators are available:
  - RSI needs at least `rsiPeriod + 1` closes
  - Every configured EMA needs at least its own period worth of closes
  - App-level minimum candles = `max(rsiPeriod + 1, ...emaPeriods)`
- BUY is returned when:
  - `rsi < oversold`
  - `price > fastestEma`
  - `EMA[0] > EMA[1] > EMA[2] > ...`
- SELL is returned when:
  - `rsi > overbought`
  - `price < fastestEma`
  - `EMA[0] < EMA[1] < EMA[2] < ...`
- If neither condition matches, the function returns `null`.
- EMA periods are user-configurable as a comma-separated list such as `9, 21, 50, 100`.
- The app parses, de-duplicates, and sorts EMA periods automatically from fastest to slowest.

### How Signals Are Added In Practice
- Historical scan:
  - `scanHistoricalSignals()` walks candle-by-candle through the loaded history.
  - It suppresses consecutive duplicate directions using `prevSignal`.
  - Example: `BUY, BUY, BUY` across several candles is stored as a single BUY until a candle produces `null` or an opposite signal.
- Real-time updates:
  - The latest candle is checked on every update once historical scanning is complete.
  - A live signal is added only once per candle timestamp using `lastSignalTimeRef`.
  - This prevents repeated inserts while the same candle is still updating.
- Settings changes:
  - Changing threshold mode, RSI period, or EMA period triggers a full historical re-scan using the same logic.

### Important Behavior Note
- This is a reversal-style filter with trend confirmation, not a simple EMA crossover system:
  - BUY requires RSI to already be in the oversold zone while price is above the fastest EMA and the full EMA stack is bullish.
  - SELL requires RSI to already be in the overbought zone while price is below the fastest EMA and the full EMA stack is bearish.
- There is no crossover check, no confirmation candle, and no volume filter in the current implementation.

### Threshold Presets (in `indicators.js`)
| Mode | Oversold (BUY) | Overbought (SELL) |
|------|----------------|-------------------|
| Aggressive | < 40 | > 60 |
| Standard | < 35 | > 65 |
| Conservative | < 30 | > 70 |

### Configurable Parameters
- **Timeframe:** 1m, 5m, 15m, 1h, 4h
- **RSI Period:** 2-50 (default: 14)
- **EMA Periods:** comma-separated list, 2-300 per EMA (default: `9, 21, 50`)
- **Sensitivity:** Aggressive, Standard, Conservative

## Key Implementation Details

### Binance WebSocket (`binanceWs.js`)
- REST endpoint for historical: `https://api.binance.com/api/v3/klines`
- WebSocket for real-time: `wss://stream.binance.com:9443/ws/btcusdt@kline_{interval}`
- Fetches 200 historical candles on load, then streams live updates

### Chart Component (`Chart.jsx`)
- Uses lightweight-charts v5 API:
  - `chart.addSeries(CandlestickSeries, options)` — NOT `addCandlestickSeries()`
  - `chart.addSeries(LineSeries, options)` — NOT `addLineSeries()`
  - `createSeriesMarkers(series, markers)` — NOT `series.setMarkers()`
- Multiple EMA lines overlaid on candlesticks
- BUY markers = green arrows below bar
- SELL markers = red arrows above bar

### Historical Signal Scanning (`App.jsx`)
- On page load, scans all 200 historical candles for past signals
- `scanHistoricalSignals()` function iterates through candles and applies signal logic
- Re-scans when user changes RSI/EMA periods or sensitivity

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Blank page | lightweight-charts API changed in v5 | Use `addSeries()` not `addCandlestickSeries()` |
| `setMarkers is not a function` | v5 removed setMarkers | Use `createSeriesMarkers()` |
| EMA label doesn't update | Title set only at init | Call `series.applyOptions({ title })` on change |
| No signals showing | Conditions not met | Check RSI + price vs EMA, or lower sensitivity |

## Future Enhancements (Not Implemented)

- [ ] Browser push notifications
- [ ] Telegram bot for 24/7 alerts
- [ ] Multiple pairs (ETH, SOL)
- [ ] Backtesting with historical data
- [ ] Custom indicator formulas
