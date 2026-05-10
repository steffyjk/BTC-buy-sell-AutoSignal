# CLAUDE.md - BTC Signal Bot

## Project Overview

Real-time BTC/USDT trading signal bot that generates BUY/SELL signals based on RSI and EMA indicators. Pure frontend React app — no backend needed.

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
│   ├── Chart.jsx        # Lightweight Charts candlestick + EMA line + markers
│   ├── Controls.jsx     # Timeframe, sensitivity, RSI/EMA period inputs
│   └── SignalLog.jsx    # Signal history list
└── utils/
    ├── indicators.js    # RSI, EMA calculations, signal logic, presets
    └── binanceWs.js     # Binance WebSocket + REST API for candles
```

## Signal Logic

**BUY Signal:** RSI < oversold threshold AND Price > EMA
**SELL Signal:** RSI > overbought threshold AND Price < EMA

### Exact Logic Used In Code
- Signal generation lives in `src/utils/indicators.js` inside `generateSignal(rsi, price, ema, thresholds)`.
- A signal is only evaluated when both indicators are available:
  - RSI needs at least `rsiPeriod + 1` closes
  - EMA needs at least `emaPeriod` closes
  - App-level minimum candles = `max(rsiPeriod, emaPeriod) + 1`
- BUY is returned when:
  - `rsi < oversold`
  - `price > ema`
- SELL is returned when:
  - `rsi > overbought`
  - `price < ema`
- If neither condition matches, the function returns `null`.

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
- This is a reversal-style filter, not a simple trend-following EMA cross:
  - BUY requires RSI to already be in the oversold zone while price is back above EMA.
  - SELL requires RSI to already be in the overbought zone while price is back below EMA.
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
- **EMA Period:** 2-100 (default: 20)
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
- EMA line (yellow) overlaid on candlesticks
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
