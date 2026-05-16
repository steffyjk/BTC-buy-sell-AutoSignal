function SignalLog({ signals, rsiEnabled }) {
  const formatEmaStack = (signal) => {
    if (!signal.emas || signal.emas.length === 0) return '';
    return signal.emas.map((ema) => `${ema.period}:${ema.value.toFixed(0)}`).join(' / ');
  };

  if (signals.length === 0) {
    return (
      <div className="signal-log">
        <h3>Signal Log</h3>
        <div className="signal-empty">
          Waiting for signals...
        </div>
      </div>
    );
  }

  return (
    <div className="signal-log">
      <h3>Signal Log ({signals.length})</h3>
      <div className="signal-list">
        {signals.slice().reverse().map((signal, index) => (
          <div key={index} className={`signal-item ${signal.type.toLowerCase()}`}>
            <span className="signal-type">{signal.type}</span>
            <span className="signal-price">
              ${signal.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {rsiEnabled && signal.rsi !== null && (
              <span className="signal-rsi">RSI: {signal.rsi.toFixed(1)}</span>
            )}
            <span className="signal-ema">EMA: {formatEmaStack(signal)}</span>
            <span className="signal-time">{signal.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SignalLog;
