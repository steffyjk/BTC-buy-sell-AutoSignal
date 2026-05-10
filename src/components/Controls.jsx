import { TIMEFRAMES, THRESHOLD_PRESETS } from '../utils/indicators';

function Controls({
  timeframe,
  setTimeframe,
  threshold,
  setThreshold,
  rsiPeriod,
  setRsiPeriod,
  emaPeriod,
  setEmaPeriod,
  rsi,
  ema,
  price,
  connected,
}) {
  return (
    <div className="controls">
      <div className="control-group">
        <label>Timeframe</label>
        <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
          {TIMEFRAMES.map((tf) => (
            <option key={tf.value} value={tf.value}>
              {tf.label}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label>Sensitivity</label>
        <select value={threshold} onChange={(e) => setThreshold(e.target.value)}>
          {Object.entries(THRESHOLD_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label>RSI Period</label>
        <input
          type="number"
          min="2"
          max="50"
          value={rsiPeriod}
          onChange={(e) => setRsiPeriod(Math.max(2, Math.min(50, parseInt(e.target.value) || 14)))}
        />
      </div>

      <div className="control-group">
        <label>EMA Period</label>
        <input
          type="number"
          min="2"
          max="100"
          value={emaPeriod}
          onChange={(e) => setEmaPeriod(Math.max(2, Math.min(100, parseInt(e.target.value) || 20)))}
        />
      </div>

      <div className="indicators">
        <div className="indicator">
          <span className="indicator-label">BTC/USDT</span>
          <span className="indicator-value price">
            ${price ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
          </span>
        </div>
        <div className="indicator">
          <span className="indicator-label">RSI ({rsiPeriod})</span>
          <span className={`indicator-value ${rsi !== null && rsi < THRESHOLD_PRESETS[threshold].oversold ? 'oversold' : rsi !== null && rsi > THRESHOLD_PRESETS[threshold].overbought ? 'overbought' : ''}`}>
            {rsi !== null ? rsi.toFixed(2) : '--'}
          </span>
        </div>
        <div className="indicator">
          <span className="indicator-label">EMA ({emaPeriod})</span>
          <span className="indicator-value">
            ${ema ? ema.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
          </span>
        </div>
        <div className="indicator">
          <span className="indicator-label">Status</span>
          <span className={`indicator-value ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Controls;
