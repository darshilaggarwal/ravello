import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { GAMES } from '../../config/constants';
import toast from 'react-hot-toast';
import { FaBomb, FaGem, FaQuestionCircle, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { startMinesGame, revealTile, cashoutMines, resetMinesGame } from '../../redux/actions/games/minesActions';
import WalletDisplay from '../../components/wallet/WalletDisplay';
import soundManager from '../../utils/SoundManager';
import GameStats from '../../components/games/GameStats';

const Mines = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.user);
  const { 
    activeGame, 
    revealedTiles, 
    minePositions,
    loading, 
    error, 
    revealLoading,
    revealError,
    cashoutLoading,
    cashoutError,
    gameOver,
    winAmount
  } = useSelector((state) => state.games.mines);

  const [betAmount, setBetAmount] = useState(GAMES.MINES.MIN_BET);
  const [minesCount, setMinesCount] = useState(GAMES.MINES.DEFAULT_MINES);
  const [grid, setGrid] = useState(Array(GAMES.MINES.GRID_SIZE).fill('hidden'));
  const [soundsMuted, setSoundsMuted] = useState(soundManager.muted);

  // Update grid when game state changes
  useEffect(() => {
    if (!activeGame) {
      setGrid(Array(GAMES.MINES.GRID_SIZE).fill('hidden'));
      return;
    }

    const newGrid = Array(GAMES.MINES.GRID_SIZE).fill('hidden');
    
    // Mark revealed tiles
    if (revealedTiles.length > 0) {
      revealedTiles.forEach(pos => {
        newGrid[pos] = 'gem';
      });
    }
    
    // Show mines when game is over
    if (gameOver && minePositions) {
      minePositions.forEach(pos => {
        newGrid[pos] = 'mine';
      });
    }
    
    setGrid(newGrid);
  }, [activeGame, revealedTiles, minePositions, gameOver]);

  // Show error messages
  useEffect(() => {
    if (error) toast.error(error);
    if (revealError) toast.error(revealError);
    if (cashoutError) toast.error(cashoutError);
  }, [error, revealError, cashoutError]);

  // Calculate potential profit based on current state
  const calculateCurrentMultiplier = () => {
    if (!activeGame) return 1;
    
    // If game is over and won, use the final multiplier
    if (gameOver && winAmount > 0) {
      return winAmount / activeGame.betAmount;
    }
    
    // Otherwise calculate based on revealed gems
    const safeRevealedCount = revealedTiles.length;
    const totalTiles = GAMES.MINES.GRID_SIZE;
    const safeTiles = totalTiles - minesCount;
    
    // Calculate using formula similar to the backend
    if (safeRevealedCount === 0) return 1;
    
    let multiplier = 1;
    for (let i = 0; i < safeRevealedCount; i++) {
      multiplier *= (totalTiles - i) / (totalTiles - minesCount - i);
    }
    
    // Apply house edge (3%)
    multiplier *= 0.97;
    
    return Math.round(multiplier * 100) / 100;
  };

  const handleBetAmountChange = (e) => {
    const value = parseFloat(e.target.value);
    setBetAmount(value);
  };

  const handleMinesCountChange = (e) => {
    const value = parseInt(e.target.value);
    setMinesCount(value);
  };

  const handleMaxBet = () => {
    if (profile && profile.balance) {
      setBetAmount(Math.min(profile.balance, GAMES.MINES.MAX_BET));
    }
  };

  const handleHalfBet = () => {
    setBetAmount(Math.max(betAmount / 2, GAMES.MINES.MIN_BET));
  };

  const handleDoubleBet = () => {
    if (profile && profile.balance) {
      setBetAmount(Math.min(betAmount * 2, profile.balance, GAMES.MINES.MAX_BET));
    }
  };

  const handleToggleSound = () => {
    const newMuted = soundManager.toggleMute();
    setSoundsMuted(newMuted);
  };

  const handleStartGame = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to play');
      navigate('/login');
      return;
    }

    if (betAmount < GAMES.MINES.MIN_BET) {
      toast.error(`Minimum bet amount is $${GAMES.MINES.MIN_BET}`);
      return;
    }

    if (betAmount > GAMES.MINES.MAX_BET) {
      toast.error(`Maximum bet amount is $${GAMES.MINES.MAX_BET}`);
      return;
    }

    if (profile && profile.balance < betAmount) {
      toast.error('Insufficient balance');
      return;
    }

    if (minesCount < GAMES.MINES.MIN_MINES || minesCount > GAMES.MINES.MAX_MINES) {
      toast.error(`Mines count must be between ${GAMES.MINES.MIN_MINES} and ${GAMES.MINES.MAX_MINES}`);
      return;
    }

    try {
      // Play start sound
      soundManager.play('gameStart');
      await dispatch(startMinesGame(betAmount, minesCount));
    } catch (err) {
      // Error is already handled in the action creator
    }
  };

  const handleRevealTile = async (position) => {
    if (!activeGame || gameOver) return;
    
    if (revealedTiles.includes(position)) {
      toast.error('Tile already revealed');
      return;
    }
    
    try {
      const result = await dispatch(revealTile(position));
      
      // Play appropriate sound based on result
      if (result.data.isMine) {
        // Play explosion sound
        soundManager.play('explosion');
      } else {
        // Play a random gem sound (cycle through the sounds)
        const gemSoundIndex = (revealedTiles.length % 5) + 1;
        soundManager.play(`gem${gemSoundIndex}`);
      }
    } catch (err) {
      // Error is already handled in the action creator
    }
  };

  const handleCashout = async () => {
    if (!activeGame || gameOver) return;
    
    try {
      // Play cashout sound
      soundManager.play('cashout');
      await dispatch(cashoutMines());
    } catch (err) {
      // Error is already handled in the action creator
    }
  };

  const handleNewGame = () => {
    dispatch(resetMinesGame());
  };

  const renderTile = (status, position) => {
    let content;
    let bgClass = 'bg-gray-700 hover:bg-gray-600';
    let isClickable = activeGame && !gameOver && !revealedTiles.includes(position);
    
    switch (status) {
      case 'gem':
        content = <FaGem className="text-blue-400 text-2xl" />;
        bgClass = 'bg-blue-900';
        isClickable = false;
        break;
      case 'mine':
        content = <FaBomb className="text-red-500 text-2xl" />;
        bgClass = 'bg-red-900';
        isClickable = false;
        break;
      default:
        content = <FaQuestionCircle className="text-gray-500 text-2xl" />;
    }
    
    return (
      <button
        key={position}
        onClick={() => isClickable && handleRevealTile(position)}
        disabled={!isClickable || revealLoading}
        className={`${bgClass} rounded-md flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 transition-colors duration-200 ${
          isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
        }`}
      >
        {content}
      </button>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="p-4 bg-gray-700 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Mines</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleToggleSound}
              className="text-gray-300 hover:text-white focus:outline-none"
              title={soundsMuted ? "Unmute sounds" : "Mute sounds"}
            >
              {soundsMuted ? (
                <FaVolumeMute className="h-5 w-5" />
              ) : (
                <FaVolumeUp className="h-5 w-5" />
              )}
            </button>
            <WalletDisplay className="text-lg" />
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              {/* Game Grid */}
              <div className="grid grid-cols-5 gap-2 mb-6">
                {grid.map((status, index) => renderTile(status, index))}
              </div>
              
              {/* Game State Information */}
              {activeGame && (
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Bet Amount</p>
                      <p className="text-white font-semibold">${activeGame.betAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Mines</p>
                      <p className="text-white font-semibold">{activeGame.mineCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Revealed</p>
                      <p className="text-white font-semibold">{revealedTiles.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Current Multiplier</p>
                      <p className="text-white font-semibold">{calculateCurrentMultiplier()}x</p>
                    </div>
                  </div>
                  
                  {gameOver ? (
                    <button
                      onClick={handleNewGame}
                      className="w-full mt-4 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
                    >
                      New Game
                    </button>
                  ) : (
                    <button
                      onClick={handleCashout}
                      disabled={cashoutLoading || revealLoading}
                      className="w-full mt-4 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md disabled:opacity-50"
                    >
                      {cashoutLoading ? 'Cashing Out...' : `Cashout $${(activeGame.betAmount * calculateCurrentMultiplier()).toFixed(2)}`}
                    </button>
                  )}
                </div>
              )}
              
              {gameOver && winAmount > 0 && (
                <div className="bg-green-800 rounded-lg p-4 mb-6 text-center">
                  <p className="text-lg text-white">You won</p>
                  <p className="text-2xl font-bold text-white">${winAmount.toFixed(2)}</p>
                </div>
              )}
              
              {gameOver && winAmount === 0 && (
                <div className="bg-red-800 rounded-lg p-4 mb-6 text-center">
                  <p className="text-lg text-white">You lost</p>
                  <p className="text-2xl font-bold text-white">${activeGame?.betAmount.toFixed(2)}</p>
                </div>
              )}
            </div>
            
            <div>
              {!activeGame ? (
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Start New Game</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Bet Amount
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        $
                      </span>
                      <input
                        type="number"
                        min={GAMES.MINES.MIN_BET}
                        max={GAMES.MINES.MAX_BET}
                        value={betAmount}
                        onChange={handleBetAmountChange}
                        className="block w-full pl-8 pr-12 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={handleHalfBet}
                        className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 text-sm rounded"
                      >
                        1/2
                      </button>
                      <button
                        onClick={handleDoubleBet}
                        className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 text-sm rounded"
                      >
                        2x
                      </button>
                      <button
                        onClick={handleMaxBet}
                        className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 text-sm rounded"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Number of Mines: {minesCount}
                    </label>
                    <input
                      type="range"
                      min={GAMES.MINES.MIN_MINES}
                      max={GAMES.MINES.MAX_MINES}
                      value={minesCount}
                      onChange={handleMinesCountChange}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{GAMES.MINES.MIN_MINES}</span>
                      <span>{Math.floor((GAMES.MINES.MAX_MINES + GAMES.MINES.MIN_MINES) / 2)}</span>
                      <span>{GAMES.MINES.MAX_MINES}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleStartGame}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {loading ? 'Starting Game...' : 'Start Game'}
                  </button>
                </div>
              ) : (
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Game Instructions</h3>
                  <p className="text-gray-300 mb-3">
                    Click on tiles to reveal them. Avoid mines to win!
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
                    <li>The grid contains {activeGame.mineCount} hidden mines.</li>
                    <li>Each revealed safe tile increases your multiplier.</li>
                    <li>If you hit a mine, you lose your bet.</li>
                    <li>Cash out anytime to secure your winnings.</li>
                  </ul>
                  
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 mb-2">Potential Cashout</p>
                    <p className="text-2xl font-bold text-white">
                      ${(activeGame.betAmount * calculateCurrentMultiplier()).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400">
                      ({calculateCurrentMultiplier()}x multiplier)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <GameStats gameType="mines" />
      </div>
    </div>
  );
};

export default Mines; 