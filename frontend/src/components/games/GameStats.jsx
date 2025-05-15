import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { clearGameHistory } from '../../redux/actions/games/statsActions';

/**
 * GameStats component displays statistics and a graph of wagering history
 * This can be used across all game types to show consistent stats
 */
const GameStats = ({ gameType }) => {
  const dispatch = useDispatch();
  const [showStats, setShowStats] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const { profile } = useSelector((state) => state.user);
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  // Get game history based on game type
  const gameHistory = useSelector((state) => {
    switch (gameType) {
      case 'dice':
        return state.games.dice.history || [];
      case 'crash':
        return state.games.crash.history || [];
      case 'mines':
        return state.games.mines.history || [];
      case 'plinko':
        return state.games.plinko.history || [];
      default:
        return [];
    }
  });
  
  // When component mounts, ensure localStorage and Redux state are in sync
  useEffect(() => {
    const storageKey = `${gameType}History`;
    const savedHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Log the sync operation in debug mode
    if (debugMode) {
      console.log(`Syncing ${gameType} history:`, {
        redux: gameHistory.length,
        localStorage: savedHistory.length
      });
    }
    
    // If there's a significant difference, rehydrate from localStorage
    if (savedHistory.length > gameHistory.length + 5) {
      console.log(`Restoring ${savedHistory.length} entries from localStorage`);
      
      // This would ideally dispatch an action to update Redux
      // For now, we'll just update localStorage to match Redux if it has more entries
      if (gameHistory.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(gameHistory));
      }
    }
  }, [gameType, debugMode]);
  
  // Save stats to localStorage periodically
  useEffect(() => {
    if (gameHistory.length > 0) {
      const storageKey = `${gameType}History`;
      localStorage.setItem(storageKey, JSON.stringify(gameHistory));
      
      if (debugMode) {
        console.log(`Saved ${gameHistory.length} ${gameType} history entries to localStorage`);
      }
    }
  }, [gameHistory, gameType, debugMode]);
  
  // Toggle debug mode to see raw history data
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };
  
  // Handle clearing game history
  const handleClearStats = () => {
    setShowConfirmClear(true);
  };
  
  // Confirm clearing stats
  const confirmClearStats = () => {
    dispatch(clearGameHistory(gameType))
      .then((result) => {
        if (result.success) {
          toast.success(`${gameType.charAt(0).toUpperCase() + gameType.slice(1)} stats cleared successfully`);
        } else {
          toast.error(result.message);
        }
      })
      .catch((error) => {
        toast.error(`Error clearing stats: ${error.message}`);
      })
      .finally(() => {
        setShowConfirmClear(false);
      });
  };
  
  // Cancel clearing stats
  const cancelClearStats = () => {
    setShowConfirmClear(false);
  };
  
  // Force restore from localStorage
  const handleRestoreFromLocalStorage = () => {
    const storageKey = `${gameType}History`;
    const savedHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    if (savedHistory.length > 0) {
      console.log(`Manually restoring ${savedHistory.length} entries from localStorage`);
      
      // For now, just log the restore operation
      // In a real implementation, this would dispatch an action to update Redux
      alert(`Found ${savedHistory.length} history entries in localStorage that could be restored.`);
    } else {
      alert('No history found in localStorage to restore.');
    }
  };
  
  // Calculate stats from game history
  const stats = useMemo(() => {
    if (!gameHistory || gameHistory.length === 0) {
      return {
        totalWagered: 0,
        totalWon: 0,
        totalProfit: 0,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
        highestWin: 0,
        bestMultiplier: 0,
        lastResults: [],
        consecutiveWins: 0,
        consecutiveLosses: 0,
        avgMultiplier: 0
      };
    }
    
    let totalWagered = 0;
    let totalWon = 0;
    let winCount = 0;
    let lossCount = 0;
    let highestWin = 0;
    let bestMultiplier = 0;
    let currentConsecutiveWins = 0;
    let currentConsecutiveLosses = 0;
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let totalWinMultiplier = 0;
    
    // Last 10 results for the graph (most recent first)
    const lastResults = gameHistory.slice(0, 10);
    
    // Track current streaks
    let lastWasWin = null;
    
    gameHistory.forEach((game, index) => {
      // Different game types might have slightly different data structures
      const betAmount = game.betAmount || game.bet || 0;
      const winAmount = game.winAmount || game.payout || 0;
      const isWin = game.isWin || winAmount > betAmount;
      
      totalWagered += betAmount;
      totalWon += winAmount;
      
      if (isWin) {
        winCount++;
        highestWin = Math.max(highestWin, winAmount);
        
        // Calculate multiplier
        if (betAmount > 0) {
          const multiplier = winAmount / betAmount;
          bestMultiplier = Math.max(bestMultiplier, multiplier);
          totalWinMultiplier += multiplier;
        }
        
        // Track consecutive wins
        if (lastWasWin === true) {
          currentConsecutiveWins++;
        } else {
          currentConsecutiveWins = 1;
          currentConsecutiveLosses = 0;
        }
        lastWasWin = true;
      } else {
        lossCount++;
        
        // Track consecutive losses
        if (lastWasWin === false) {
          currentConsecutiveLosses++;
        } else {
          currentConsecutiveLosses = 1;
          currentConsecutiveWins = 0;
        }
        lastWasWin = false;
      }
      
      // Update max streaks
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentConsecutiveWins);
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
    });
    
    const totalProfit = totalWon - totalWagered;
    const winRate = gameHistory.length > 0 ? (winCount / gameHistory.length) * 100 : 0;
    const avgMultiplier = winCount > 0 ? totalWinMultiplier / winCount : 0;
    
    return {
      totalWagered,
      totalWon,
      totalProfit,
      winCount,
      lossCount,
      winRate,
      highestWin,
      bestMultiplier,
      lastResults,
      consecutiveWins: maxConsecutiveWins,
      consecutiveLosses: maxConsecutiveLosses,
      avgMultiplier
    };
  }, [gameHistory]);
  
  const renderGraph = () => {
    if (stats.lastResults.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 bg-gray-800 rounded-lg">
          <p className="text-gray-400">No game history to display</p>
        </div>
      );
    }
    
    // Calculate max value for scaling
    const maxValue = Math.max(
      ...stats.lastResults.map(game => {
        const betAmount = game.betAmount || game.bet || 0;
        const winAmount = game.winAmount || game.payout || 0;
        return Math.max(betAmount, winAmount);
      }),
      1 // Ensure we don't divide by zero
    );
    
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Last {stats.lastResults.length} Games</h4>
        
        {/* Graph labels */}
        <div className="flex justify-between mb-1 text-xs text-gray-400">
          <div>Bet Amount / Win</div>
          <div>${maxValue.toFixed(2)} max</div>
        </div>
        
        <div className="flex items-end justify-between h-32 gap-1 border-b border-gray-700 mb-2 pb-1">
          {stats.lastResults.map((game, index) => {
            const betAmount = game.betAmount || game.bet || 0;
            const winAmount = game.winAmount || game.payout || 0;
            const profit = winAmount - betAmount;
            const isWin = game.isWin || profit >= 0;
            
            // Minimum height for visibility
            const minHeight = 5; 
            
            // Calculate height percentage based on bet amount - ensure minimum visibility
            const betHeight = Math.max(minHeight, (betAmount / maxValue) * 100);
            
            // Calculate height percentage based on win amount or loss amount
            const resultHeight = Math.max(minHeight, (Math.abs(profit) / maxValue) * 100);
            
            // Format timestamp if available
            const timestamp = game.timestamp 
              ? format(new Date(game.timestamp), 'MM/dd HH:mm')
              : `Game ${index + 1}`;
            
            return (
              <div key={index} className="flex flex-col items-center w-full group relative">
                <div className="w-full flex flex-col items-center relative h-full">
                  {/* Bet Amount Bar */}
                  <div 
                    className="w-full bg-gray-600 absolute bottom-0"
                    style={{ height: `${betHeight}%` }}
                  ></div>
                  
                  {/* Win/Loss Bar - on top of bet bar */}
                  {isWin ? (
                    <div 
                      className="w-full bg-green-500 absolute bottom-0"
                      style={{ 
                        height: `${resultHeight}%`,
                        opacity: '0.8'
                      }}
                    ></div>
                  ) : (
                    <div 
                      className="w-full bg-red-500 absolute bottom-0"
                      style={{ 
                        height: `${resultHeight}%`,
                        opacity: '0.8'
                      }}
                    ></div>
                  )}
                </div>
                
                {/* Game number at bottom */}
                <div className="text-xs text-gray-400 mt-1 truncate w-full text-center">{index + 1}</div>
                
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  <div>Game #{gameHistory.length - index}</div>
                  <div>Bet: ${betAmount.toFixed(2)}</div>
                  <div>Profit: ${profit.toFixed(2)}</div>
                  {timestamp && <div>{timestamp}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  const renderAdvancedStats = () => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <StatCard 
          title="Best Win" 
          value={`$${stats.highestWin.toFixed(2)}`} 
          iconColor="bg-purple-500" 
        />
        <StatCard 
          title="Best Multiplier" 
          value={`${stats.bestMultiplier.toFixed(2)}x`} 
          iconColor="bg-indigo-500" 
        />
        <StatCard 
          title="Win Streak" 
          value={stats.consecutiveWins} 
          iconColor="bg-green-500" 
        />
        <StatCard 
          title="Avg Multiplier" 
          value={`${stats.avgMultiplier.toFixed(2)}x`} 
          iconColor="bg-yellow-500" 
        />
      </div>
    );
  };
  
  // Render confirmation modal for clearing stats
  const renderConfirmClearModal = () => {
    if (!showConfirmClear) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4">
          <h3 className="text-xl font-bold text-white mb-4">Clear Statistics</h3>
          <p className="text-gray-300 mb-6">
            Are you sure you want to clear all your {gameType} statistics? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={cancelClearStats}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Cancel
            </button>
            <button
              onClick={confirmClearStats}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Clear Stats
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-gray-700 rounded-lg overflow-hidden shadow-lg">
      <div 
        className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-600 transition-colors"
        onClick={() => setShowStats(!showStats)}
      >
        <h3 className="text-lg font-bold text-white">Game Statistics</h3>
        <div className="flex items-center">
          {showStats && isAuthenticated && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleClearStats(); 
              }}
              className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded mr-3 transition-colors"
            >
              Clear Stats
            </button>
          )}
          {process.env.NODE_ENV === 'development' && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                toggleDebugMode(); 
              }}
              className="text-xs bg-gray-800 hover:bg-gray-900 text-gray-300 px-2 py-1 rounded mr-3"
            >
              {debugMode ? 'Hide Debug' : 'Debug'}
            </button>
          )}
          <div className="text-gray-300">
            {showStats ? "▲ Hide" : "▼ Show"}
          </div>
        </div>
      </div>
      
      {showStats && (
        <div className="p-4">
          {debugMode && (
            <div className="mb-6 bg-gray-900 p-3 rounded overflow-auto max-h-60">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-300">Raw History Data ({gameHistory.length} entries)</h4>
                <button 
                  onClick={handleRestoreFromLocalStorage}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                >
                  Restore Backup
                </button>
              </div>
              <pre className="text-xs text-gray-400">
                {JSON.stringify(gameHistory, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard 
              title="Total Wagered" 
              value={`$${stats.totalWagered.toFixed(2)}`} 
              iconColor="bg-blue-500" 
            />
            <StatCard 
              title="Total Profit" 
              value={`$${stats.totalProfit.toFixed(2)}`} 
              iconColor={stats.totalProfit >= 0 ? "bg-green-500" : "bg-red-500"} 
            />
            <StatCard 
              title="Win Rate" 
              value={`${stats.winRate.toFixed(1)}%`} 
              iconColor="bg-yellow-500" 
            />
            <StatCard 
              title="Games Played" 
              value={stats.winCount + stats.lossCount} 
              iconColor="bg-gray-500" 
            />
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Win/Loss Distribution</h4>
            <div className="flex h-4 rounded-full overflow-hidden">
              <div 
                className="bg-green-500" 
                style={{ width: `${stats.winRate}%` }}
              ></div>
              <div 
                className="bg-red-500" 
                style={{ width: `${100 - stats.winRate}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <div>Wins: {stats.winCount}</div>
              <div>Losses: {stats.lossCount}</div>
            </div>
          </div>
          
          {/* Results Graph */}
          {renderGraph()}
          
          {/* Advanced Stats */}
          {renderAdvancedStats()}
        </div>
      )}
      
      {/* Confirmation Modal */}
      {renderConfirmClearModal()}
    </div>
  );
};

// Helper component for stat cards
const StatCard = ({ title, value, iconColor }) => (
  <div className="bg-gray-800 p-3 rounded-lg shadow hover:shadow-lg transition-shadow">
    <div className="flex items-center mb-1">
      <div className={`w-2 h-2 rounded-full ${iconColor} mr-2`}></div>
      <h5 className="text-xs text-gray-400">{title}</h5>
    </div>
    <p className="text-white font-bold">{value}</p>
  </div>
);

export default GameStats; 