import { TIMEFRAMES } from '../utils/indicators';

function Controls({
  timeframe,
  setTimeframe,
  emaInput,
  setEmaInput,
  emaPeriods,
  emas,
  emaTrend,
  price,
  connected,
  rsiEnabled,
  setRsiEnabled,
  rsiOversold,
  setRsiOversold,
  rsiOverbought,
  setRsiOverbought,
  currentRsi,
}) {
  const formatEmaValues = () => {
    if (!Array.isArray(emas) || emas.length === 0) return '--';
    if (emas.length !== emaPeriods.length) return '--';
    if (emas.some((ema) => ema === null || ema === undefined || Number.isNaN(ema))) return '--';

    return emaPeriods
      .map((period, index) => {
        const value = emas[index];
        return `${period}:${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      })
      .join(' | ');
  };

  const getSignalMode = () => {
    if (emaPeriods.length === 0) return 'NO EMA';
    const emaMode = emaPeriods.length === 1 ? 'PRICE CROSS' : 'EMA CROSS';
    return rsiEnabled ? `${emaMode} + RSI` : emaMode;
  };

  const getRsiStatus = () => {
    if (currentRsi === null) return '--';
    if (currentRsi <= rsiOversold) return 'OVERSOLD';
    if (currentRsi >= rsiOverbought) return 'OVERBOUGHT';
    return 'NEUTRAL';
  };

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
        <label>EMA Periods</label>
        <input
          type="text"
          value={emaInput}
          onChange={(e) => setEmaInput(e.target.value)}
          placeholder="8, 30"
        />
        <small className="control-help">1 EMA = Price cross | 2+ EMAs = EMA cross</small>
      </div>

      <div className="toggle-group">
        <span className="toggle-label">RSI Filter</span>
        <div
          className={`toggle-switch ${rsiEnabled ? 'active' : ''}`}
          onClick={() => setRsiEnabled(!rsiEnabled)}
        />
      </div>

      {rsiEnabled && (
        <div className="rsi-inputs">
          <div className="rsi-input-group">
            <label>Oversold</label>
            <input
              type="number"
              min="1"
              max="49"
              value={rsiOversold}
              onChange={(e) => setRsiOversold(Math.max(1, Math.min(49, parseInt(e.target.value) || 30)))}
            />
          </div>
          <div className="rsi-input-group">
            <label>Overbought</label>
            <input
              type="number"
              min="51"
              max="99"
              value={rsiOverbought}
              onChange={(e) => setRsiOverbought(Math.max(51, Math.min(99, parseInt(e.target.value) || 70)))}
            />
          </div>
        </div>
      )}

      <div className="indicators">
        <div className="indicator">
          <span className="indicator-label">BTC/USDT</span>
          <span className="indicator-value price">
            ${price ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
          </span>
        </div>
        <div className="indicator">
          <span className="indicator-label">Signal Mode</span>
          <span className="indicator-value">
            {getSignalMode()}
          </span>
        </div>
        {rsiEnabled && (
          <div className="indicator">
            <span className="indicator-label">RSI (14)</span>
            <span className={`indicator-value ${getRsiStatus() === 'OVERSOLD' ? 'connected' : getRsiStatus() === 'OVERBOUGHT' ? 'disconnected' : ''}`}>
              {currentRsi !== null ? currentRsi.toFixed(1) : '--'} ({getRsiStatus()})
            </span>
          </div>
        )}
        <div className="indicator">
          <span className="indicator-label">EMA Values</span>
          <span className="indicator-value indicator-stack">
            {formatEmaValues()}
          </span>
        </div>
        <div className="indicator">
          <span className="indicator-label">Trend</span>
          <span className={`indicator-value ${emaTrend === 'BULLISH' ? 'connected' : emaTrend === 'BEARISH' ? 'disconnected' : ''}`}>
            {emaPeriods.length === 0 ? 'NO EMA' : emaTrend}
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
