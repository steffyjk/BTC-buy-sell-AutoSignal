import { TIMEFRAMES, THRESHOLD_PRESETS } from '../utils/indicators';

function Controls({ timeframe, setTimeframe, threshold, setThreshold, rsi, ema, price, connected }) {
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
        <label>Signal Sensitivity</label>
        <select value={threshold} onChange={(e) => setThreshold(e.target.value)}>
          {Object.entries(THRESHOLD_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <div className="indicators">
        <div className="indicator">
          <span className="indicator-label">BTC/USDT</span>
          <span className="indicator-value price">
            ${price ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
          </span>
        </div>
        <div className="indicator">
          <span className="indicator-label">RSI (14)</span>
          <span className={`indicator-value ${rsi < THRESHOLD_PRESETS[threshold].oversold ? 'oversold' : rsi > THRESHOLD_PRESETS[threshold].overbought ? 'overbought' : ''}`}>
            {rsi !== null ? rsi.toFixed(2) : '--'}
          </span>
        </div>
        <div className="indicator">
          <span className="indicator-label">EMA (20)</span>
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
