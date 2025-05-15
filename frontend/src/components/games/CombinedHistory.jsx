import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { clearCombinedHistory, loadCombinedHistory } from '../../redux/actions/games/statsActions';
import { FaDice, FaChartLine, FaBomb, FaCircle } from 'react-icons/fa';

const CombinedHistory = ({ isDropdown = false }) => {
  const [showHistory, setShowHistory] = useState(!isDropdown);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const combinedHistory = useSelector((state) => state.games.combinedHistory);
  const dispatch = useDispatch();
  
  const itemsPerPage = 10;
  
  // Load combined history when component mounts
  useEffect(() => {
    dispatch(loadCombinedHistory());
  }, [dispatch]);
  
  // Handle clearing combined history
  const handleClearHistory = () => {
    setShowConfirmClear(true);
  };
  
  // Confirm clearing history
  const confirmClearHistory = () => {
    dispatch(clearCombinedHistory());
    setShowConfirmClear(false);
    toast.success('Combined history cleared successfully');
  };
  
  // Cancel clearing history
  const cancelClearHistory = () => {
    setShowConfirmClear(false);
  };
  
  // Calculate total pages
  const totalPages = Math.ceil((combinedHistory.history?.length || 0) / itemsPerPage);
  
  // Get current page of history
  const currentItems = combinedHistory.history
    ? combinedHistory.history.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : [];
  
  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  // Render game icon based on type
  const renderGameIcon = (gameType) => {
    switch (gameType) {
      case 'dice':
        return <FaDice className="text-green-400" />;
      case 'crash':
        return <FaChartLine className="text-red-400" />;
      case 'mines':
        return <FaBomb className="text-yellow-400" />;
      case 'plinko':
        return <FaCircle className="text-purple-400" />;
      default:
        return null;
    }
  };
  
  // Format game detail based on game type
  const formatGameDetail = (game) => {
    switch (game.gameType) {
      case 'dice':
        return `Roll: ${game.roll} ${game.rollType === 'over' ? '>' : '<'} ${game.target}`;
      case 'crash':
        return `${game.type === 'cashout' ? 'Cashed out at' : 'Crashed at'} ${(game.crashPoint || 0).toFixed(2)}x`;
      case 'mines':
        return `Revealed: ${game.revealCount || 0}/${25 - (game.mineCount || 5)}`;
      case 'plinko':
        return `Multiplier: ${(game.finalMultiplier || 0).toFixed(2)}x`;
      default:
        return '';
    }
  };
  
  // Render confirmation modal for clearing history
  const renderConfirmClearModal = () => {
    if (!showConfirmClear) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4">
          <h3 className="text-xl font-bold text-white mb-4">Clear All History</h3>
          <p className="text-gray-300 mb-6">
            Are you sure you want to clear your entire betting history? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={cancelClearHistory}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Cancel
            </button>
            <button
              onClick={confirmClearHistory}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Clear History
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const dropdownClass = isDropdown ? "bg-gray-800 rounded-lg overflow-hidden shadow-lg" : "bg-gray-700 rounded-lg overflow-hidden shadow-lg mb-8";
  
  return (
    <div className={dropdownClass}>
      <div 
        className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-600 transition-colors"
        onClick={() => setShowHistory(!showHistory)}
      >
        <h3 className="text-lg font-bold text-white">Betting History</h3>
        <div className="flex items-center">
          {showHistory && isAuthenticated && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleClearHistory(); 
              }}
              className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded mr-3 transition-colors"
            >
              Clear History
            </button>
          )}
          <div className="text-gray-300">
            {showHistory ? "▲ Hide" : "▼ Show"}
          </div>
        </div>
      </div>
      
      {showHistory && (
        <div className="p-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 p-3 rounded-lg shadow">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                <h5 className="text-xs text-gray-400">Total Wagered</h5>
              </div>
              <p className="text-white font-bold">${combinedHistory.totalWagered.toFixed(2)}</p>
            </div>
            
            <div className="bg-gray-800 p-3 rounded-lg shadow">
              <div className="flex items-center mb-1">
                <div className={`w-2 h-2 rounded-full ${combinedHistory.totalWon - combinedHistory.totalWagered >= 0 ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <h5 className="text-xs text-gray-400">Total Profit</h5>
              </div>
              <p className="text-white font-bold">${(combinedHistory.totalWon - combinedHistory.totalWagered).toFixed(2)}</p>
            </div>
            
            <div className="bg-gray-800 p-3 rounded-lg shadow">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                <h5 className="text-xs text-gray-400">Win Rate</h5>
              </div>
              <p className="text-white font-bold">
                {combinedHistory.winCount + combinedHistory.lossCount > 0
                  ? `${((combinedHistory.winCount / (combinedHistory.winCount + combinedHistory.lossCount)) * 100).toFixed(1)}%`
                  : '0.0%'}
              </p>
            </div>
            
            <div className="bg-gray-800 p-3 rounded-lg shadow">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 rounded-full bg-gray-500 mr-2"></div>
                <h5 className="text-xs text-gray-400">Games Played</h5>
              </div>
              <p className="text-white font-bold">{combinedHistory.winCount + combinedHistory.lossCount}</p>
            </div>
          </div>
          
          {/* History Table */}
          <div className="bg-gray-800 rounded-lg overflow-hidden mb-4">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900">
                  <th className="p-3 text-left text-xs font-medium text-gray-400">Game</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-400">Bet</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-400">Profit</th>
                  <th className="hidden md:table-cell p-3 text-left text-xs font-medium text-gray-400">Details</th>
                  <th className="hidden sm:table-cell p-3 text-left text-xs font-medium text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length > 0 ? (
                  currentItems.map((game, index) => {
                    const betAmount = game.betAmount || game.bet || 0;
                    const winAmount = game.winAmount || game.payout || 0;
                    const profit = winAmount - betAmount;
                    const isWin = game.isWin || profit >= 0;
                    
                    return (
                      <tr 
                        key={index} 
                        className={`border-t border-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} hover:bg-gray-700`}
                      >
                        <td className="p-3 flex items-center">
                          <span className="mr-2">{renderGameIcon(game.gameType)}</span>
                          <span className="capitalize">{game.gameType}</span>
                        </td>
                        <td className="p-3">${betAmount.toFixed(2)}</td>
                        <td className={`p-3 ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                          {isWin ? '+' : ''}{profit.toFixed(2)}
                        </td>
                        <td className="hidden md:table-cell p-3 text-gray-300 text-sm">
                          {formatGameDetail(game)}
                        </td>
                        <td className="hidden sm:table-cell p-3 text-gray-400 text-xs">
                          {game.timestamp ? format(new Date(game.timestamp), 'MM/dd/yyyy HH:mm') : 'N/A'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="border-t border-gray-700">
                    <td colSpan="5" className="p-4 text-center text-gray-400">
                      No betting history available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${
                    currentPage === 1 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-600 text-white hover:bg-gray-500'
                  }`}
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${
                    currentPage === 1 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-600 text-white hover:bg-gray-500'
                  }`}
                >
                  Prev
                </button>
                <span className="px-3 py-1 bg-gray-800 text-white rounded">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage === totalPages 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-600 text-white hover:bg-gray-500'
                  }`}
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage === totalPages 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-600 text-white hover:bg-gray-500'
                  }`}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Confirmation Modal */}
      {renderConfirmClearModal()}
    </div>
  );
};

export default CombinedHistory; 