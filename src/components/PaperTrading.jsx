import { useState, useEffect, useRef } from 'react';

function PaperTrading({ signals, currentPrice }) {
  const [isActive, setIsActive] = useState(false);
  const [startingBalance, setStartingBalance] = useState(10000);
  const [balance, setBalance] = useState(10000);
  const [trades, setTrades] = useState([]);
  const [openPosition, setOpenPosition] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [inputBalance, setInputBalance] = useState('10000');

  const processedSignalsRef = useRef(new Set());

  // Process new signals when paper trading is active
  useEffect(() => {
    if (!isActive || signals.length === 0 || !currentPrice) return;

    const latestSignal = signals[signals.length - 1];
    const signalKey = `${latestSignal.timestamp}-${latestSignal.type}`;

    // Skip if already processed
    if (processedSignalsRef.current.has(signalKey)) return;
    processedSignalsRef.current.add(signalKey);

    const positionSize = balance * 0.25; // 25% of balance
    const btcAmount = positionSize / latestSignal.price;

    if (latestSignal.type === 'BUY') {
      // Close short if open
      if (openPosition && openPosition.type === 'SHORT') {
        closeTrade(latestSignal, 'SHORT');
      }
      // Open long
      if (!openPosition || openPosition.type === 'SHORT') {
        openTrade(latestSignal, 'LONG', btcAmount, positionSize);
      }
    } else if (latestSignal.type === 'SELL') {
      // Close long if open
      if (openPosition && openPosition.type === 'LONG') {
        closeTrade(latestSignal, 'LONG');
      }
      // Open short
      if (!openPosition || openPosition.type === 'LONG') {
        openTrade(latestSignal, 'SHORT', btcAmount, positionSize);
      }
    }
  }, [signals, isActive, currentPrice]);

  const openTrade = (signal, type, btcAmount, positionSize) => {
    setOpenPosition({
      type,
      entryPrice: signal.price,
      entryTime: signal.timestamp,
      btcAmount,
      positionSize,
    });
  };

  const closeTrade = (signal, positionType) => {
    if (!openPosition) return;

    const exitPrice = signal.price;
    const entryPrice = openPosition.entryPrice;

    let pnl;
    let points;

    if (positionType === 'LONG') {
      points = exitPrice - entryPrice;
      pnl = (points / entryPrice) * openPosition.positionSize;
    } else {
      points = entryPrice - exitPrice;
      pnl = (points / entryPrice) * openPosition.positionSize;
    }

    const newBalance = balance + pnl;
    const pnlPercent = (pnl / openPosition.positionSize) * 100;

    const trade = {
      id: trades.length + 1,
      type: positionType,
      entryPrice: entryPrice,
      exitPrice: exitPrice,
      entryTime: openPosition.entryTime,
      exitTime: signal.timestamp,
      btcAmount: openPosition.btcAmount,
      positionSize: openPosition.positionSize,
      pnl: pnl,
      pnlPercent: pnlPercent,
      points: points,
      balanceAfter: newBalance,
    };

    setTrades(prev => [...prev, trade]);
    setBalance(newBalance);
    setOpenPosition(null);
  };

  const startTrading = () => {
    const bal = parseFloat(inputBalance) || 10000;
    setStartingBalance(bal);
    setBalance(bal);
    setTrades([]);
    setOpenPosition(null);
    processedSignalsRef.current.clear();
    setIsActive(true);
  };

  const stopTrading = () => {
    setIsActive(false);
  };

  const resetTrading = () => {
    setIsActive(false);
    setBalance(startingBalance);
    setTrades([]);
    setOpenPosition(null);
    processedSignalsRef.current.clear();
  };

  // Filter trades by time range
  const getFilteredTrades = () => {
    const now = Date.now() / 1000;
    const ranges = {
      '1h': 3600,
      '4h': 14400,
      '24h': 86400,
      '7d': 604800,
    };
    const cutoff = now - ranges[timeRange];
    return trades.filter(t => t.exitTime >= cutoff);
  };

  const filteredTrades = getFilteredTrades();

  // Calculate stats
  const stats = calculateStats(filteredTrades, startingBalance, balance);

  // Export to CSV
  const exportToExcel = () => {
    const headers = ['Trade #', 'Type', 'Entry Price', 'Exit Price', 'Points', 'P&L ($)', 'P&L (%)', 'Balance', 'Entry Time', 'Exit Time'];
    const rows = filteredTrades.map(t => [
      t.id,
      t.type,
      t.entryPrice.toFixed(2),
      t.exitPrice.toFixed(2),
      t.points.toFixed(2),
      t.pnl.toFixed(2),
      t.pnlPercent.toFixed(2) + '%',
      t.balanceAfter.toFixed(2),
      new Date(t.entryTime * 1000).toLocaleString(),
      new Date(t.exitTime * 1000).toLocaleString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `btc-paper-trades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="paper-trading">
      <div className="paper-header">
        <h3>PAPER TRADING</h3>
        <div className="paper-status">
          <span className={`status-dot ${isActive ? 'active' : ''}`}></span>
          {isActive ? 'LIVE' : 'STOPPED'}
        </div>
      </div>

      <div className="paper-controls">
        {!isActive ? (
          <>
            <div className="balance-input">
              <label>Starting Balance ($)</label>
              <input
                type="number"
                value={inputBalance}
                onChange={(e) => setInputBalance(e.target.value)}
                placeholder="10000"
              />
            </div>
            <button className="btn-start" onClick={startTrading}>
              START TRADING
            </button>
          </>
        ) : (
          <>
            <button className="btn-stop" onClick={stopTrading}>
              STOP
            </button>
            <button className="btn-reset" onClick={resetTrading}>
              RESET
            </button>
          </>
        )}
      </div>

      <div className="paper-stats">
        <div className="stat-row">
          <div className="stat-item">
            <span className="stat-label">Balance</span>
            <span className={`stat-value ${balance >= startingBalance ? 'profit' : 'loss'}`}>
              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total P&L</span>
            <span className={`stat-value ${stats.totalPnl >= 0 ? 'profit' : 'loss'}`}>
              {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)} ({stats.totalPnlPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-item">
            <span className="stat-label">Win Rate</span>
            <span className={`stat-value ${stats.winRate >= 50 ? 'profit' : 'loss'}`}>
              {stats.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Trades</span>
            <span className="stat-value">{stats.totalTrades}</span>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-item">
            <span className="stat-label">Best Trade</span>
            <span className="stat-value profit">
              {stats.bestTrade ? `+$${stats.bestTrade.toFixed(2)}` : '--'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Worst Trade</span>
            <span className="stat-value loss">
              {stats.worstTrade ? `$${stats.worstTrade.toFixed(2)}` : '--'}
            </span>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-item">
            <span className="stat-label">Max Drawdown</span>
            <span className="stat-value loss">{stats.maxDrawdown.toFixed(2)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Trade</span>
            <span className={`stat-value ${stats.avgTrade >= 0 ? 'profit' : 'loss'}`}>
              {stats.avgTrade >= 0 ? '+' : ''}${stats.avgTrade.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {openPosition && (
        <div className={`open-position ${openPosition.type.toLowerCase()}`}>
          <span className="position-label">OPEN {openPosition.type}</span>
          <span className="position-entry">Entry: ${openPosition.entryPrice.toLocaleString()}</span>
          <span className="position-pnl">
            P&L: {calculateOpenPnl(openPosition, currentPrice)}
          </span>
        </div>
      )}

      <div className="trade-history">
        <div className="history-header">
          <h4>Trade History</h4>
          <div className="history-controls">
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="1h">Last 1 Hour</option>
              <option value="4h">Last 4 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
            <button className="btn-export" onClick={exportToExcel} disabled={filteredTrades.length === 0}>
              EXPORT CSV
            </button>
          </div>
        </div>

        <div className="trade-list">
          {filteredTrades.length === 0 ? (
            <div className="no-trades">No trades yet</div>
          ) : (
            filteredTrades.slice().reverse().map((trade) => (
              <div key={trade.id} className={`trade-item ${trade.pnl >= 0 ? 'win' : 'lose'}`}>
                <div className="trade-main">
                  <span className={`trade-type ${trade.type.toLowerCase()}`}>{trade.type}</span>
                  <span className="trade-prices">
                    ${trade.entryPrice.toFixed(2)} → ${trade.exitPrice.toFixed(2)}
                  </span>
                  <span className={`trade-pnl ${trade.pnl >= 0 ? 'profit' : 'loss'}`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="trade-details">
                  <span className="trade-points">{trade.points >= 0 ? '+' : ''}{trade.points.toFixed(2)} pts</span>
                  <span className="trade-percent">{trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%</span>
                  <span className="trade-time">{new Date(trade.exitTime * 1000).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function calculateStats(trades, startingBalance, currentBalance) {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      bestTrade: null,
      worstTrade: null,
      maxDrawdown: 0,
      avgTrade: 0,
    };
  }

  const wins = trades.filter(t => t.pnl > 0).length;
  const totalPnl = currentBalance - startingBalance;
  const pnls = trades.map(t => t.pnl);

  // Calculate max drawdown
  let peak = startingBalance;
  let maxDrawdown = 0;
  let runningBalance = startingBalance;

  for (const trade of trades) {
    runningBalance = trade.balanceAfter;
    if (runningBalance > peak) {
      peak = runningBalance;
    }
    const drawdown = ((peak - runningBalance) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return {
    totalTrades: trades.length,
    winRate: (wins / trades.length) * 100,
    totalPnl: totalPnl,
    totalPnlPercent: (totalPnl / startingBalance) * 100,
    bestTrade: Math.max(...pnls),
    worstTrade: Math.min(...pnls),
    maxDrawdown: maxDrawdown,
    avgTrade: totalPnl / trades.length,
  };
}

function calculateOpenPnl(position, currentPrice) {
  if (!position || !currentPrice) return '--';

  let pnl;
  if (position.type === 'LONG') {
    pnl = ((currentPrice - position.entryPrice) / position.entryPrice) * position.positionSize;
  } else {
    pnl = ((position.entryPrice - currentPrice) / position.entryPrice) * position.positionSize;
  }

  const sign = pnl >= 0 ? '+' : '';
  const className = pnl >= 0 ? 'profit' : 'loss';
  return <span className={className}>{sign}${pnl.toFixed(2)}</span>;
}

export default PaperTrading;
