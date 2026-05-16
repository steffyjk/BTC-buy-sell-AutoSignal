# CLAUDE.md - BTC Signal Bot

## Project Overview

Real-time BTC/USDT trading signal bot that generates BUY/SELL signals based on EMA crossover strategy with optional RSI filter. Pure frontend React app — no backend needed.

**Live URL:** https://btc.steffy.in
**Repo:** https://github.com/steffyjk/BTC-buy-sell-AutoSignal
**Deployed on:** Vercel (auto-deploys on push to main)

## Tech Stack

- **Framework:** React 18 + Vite
- **Charts:** lightweight-charts v5 (TradingView)
- **Data Source:** Binance WebSocket API (free, no auth)
- **Styling:** Plain CSS (light/dark theme)

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
├── App.css              # All styles (light/dark theme)
├── components/
│   ├── Chart.jsx        # Lightweight Charts candlestick + multiple EMA lines + markers
│   ├── Controls.jsx     # Timeframe, EMA periods, RSI toggle and inputs
│   ├── SignalLog.jsx    # Signal history list
│   └── PaperTrading.jsx # Paper trading simulator
└── utils/
    ├── indicators.js    # RSI, EMA calculations, signal logic
    └── binanceWs.js     # Binance WebSocket + REST API for candles
```

## Signal Logic (EMA Crossover + Optional RSI)

### Two EMA Modes Based on EMA Count

**Single EMA Mode (Price Crossover):**
- **BUY Signal:** Price crosses ABOVE the EMA
- **SELL Signal:** Price crosses BELOW the EMA

**Multiple EMA Mode (Fast/Slow Crossover):**
- **BUY Signal:** Fastest EMA crosses ABOVE slowest EMA
- **SELL Signal:** Fastest EMA crosses BELOW slowest EMA

### RSI Filter (Toggle ON/OFF)

When RSI Filter is **OFF**: Pure EMA crossover signals

When RSI Filter is **ON**: EMA crossover + RSI condition must be met
- **BUY:** EMA crossover happens AND RSI <= Oversold threshold
- **SELL:** EMA crossover happens AND RSI >= Overbought threshold

### Configurable Parameters
- **Timeframe:** 1m, 5m, 15m, 1h, 4h (default: 1h)
- **EMA Periods:** comma-separated list, 2-300 per EMA (default: `8, 30`)
- **RSI Filter:** Toggle ON/OFF (default: OFF)
- **RSI Oversold:** 1-49 (default: 30)
- **RSI Overbought:** 51-99 (default: 80)

### Exact Logic Used In Code
- Signal generation lives in `src/utils/indicators.js` inside `generateSignal(price, emas, prevPrice, prevEmas, rsiConfig)`.
- A crossover is detected by comparing current vs previous candle:
  - **Single EMA BUY:** `prevPrice <= prevEMA && price > currentEMA`
  - **Single EMA SELL:** `prevPrice >= prevEMA && price < currentEMA`
  - **Multi EMA BUY:** `prevFastEMA <= prevSlowEMA && fastEMA > slowEMA`
  - **Multi EMA SELL:** `prevFastEMA >= prevSlowEMA && fastEMA < slowEMA`
- When RSI is enabled, signals also require:
  - **BUY:** `rsi <= oversold`
  - **SELL:** `rsi >= overbought`
- RSI uses a fixed 14-period calculation

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
- Multiple EMA lines overlaid on candlesticks (different colors)
- BUY markers = green arrows below bar
- SELL markers = red arrows above bar

### Historical Signal Scanning (`App.jsx`)
- On page load, scans all 200 historical candles for past crossovers
- `scanHistoricalSignals()` function iterates through candles comparing each with previous
- Re-scans when user changes EMA periods or RSI settings

### Paper Trading (`PaperTrading.jsx`)
- Simulated trading with configurable starting balance
- 25% position size per trade
- Supports Long and Short trades
- Win rate stats and CSV export

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Blank page | lightweight-charts API changed in v5 | Use `addSeries()` not `addCandlestickSeries()` |
| `setMarkers is not a function` | v5 removed setMarkers | Use `createSeriesMarkers()` |
| EMA label doesn't update | Title set only at init | Call `series.applyOptions({ title })` on change |
| No signals showing | Not enough data for crossover | Wait for enough candles or adjust settings |
| Signal log text vertical | CSS grid mismatch | Use flexbox layout for signal items |

## Future Enhancements (Not Implemented)

- [ ] Browser push notifications
- [ ] Telegram bot for 24/7 alerts
- [ ] Multiple pairs (ETH, SOL)
- [ ] Backtesting with historical data
- [ ] Custom indicator formulas
