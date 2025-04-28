import { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { GAMES } from '../../config/constants';
import toast from 'react-hot-toast';
import { FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { dropBall, setRiskLevel, resetPlinkoGame } from '../../redux/actions/games/plinkoActions';
import WalletDisplay from '../../components/wallet/WalletDisplay';
import soundManager from '../../utils/SoundManager';
import GameStats from '../../components/games/GameStats';

const Plinko = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.user);
  const { 
    currentRisk, 
    multipliers, 
    activeBalls, 
    history, 
    loading, 
    error 
  } = useSelector((state) => state.games.plinko);
  
  const [betAmount, setBetAmount] = useState(GAMES.PLINKO.MIN_BET);
  const [soundsMuted, setSoundsMuted] = useState(soundManager.muted);
  const boardRef = useRef(null);
  
  // Calculate board dimensions
  const boardWidth = GAMES.PLINKO.PINS_PER_ROW * 40;
  const boardHeight = GAMES.PLINKO.ROWS * 40 + 80; // Extra space for ball landing area
  
  // Calculate pin positions in memoized way
  const pinPositions = useMemo(() => {
    const positions = [];
    
    for (let row = 0; row < GAMES.PLINKO.ROWS; row++) {
      const pinsInRow = row + 1;
      const startOffset = (GAMES.PLINKO.PINS_PER_ROW - pinsInRow) / 2 * 40;
      
      for (let pin = 0; pin < pinsInRow; pin++) {
        positions.push({
          x: startOffset + pin * 40,
          y: row * 40 + 40, // Start 40px from top for padding
          row,
          column: pin
        });
      }
    }
    
    return positions;
  }, []);
  
  // Calculate landing slots
  const landingSlots = useMemo(() => {
    return multipliers.map((multiplier, index) => ({
      position: index,
      multiplier,
      x: index * (boardWidth / multipliers.length),
      width: boardWidth / multipliers.length
    }));
  }, [multipliers, boardWidth]);
  
  // State for tracking pin impacts
  const [impactedPins, setImpactedPins] = useState({});
  
  // Show error messages
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
  
  // Show impact effect on pins
  useEffect(() => {
    // Reset impacts when no active balls
    if (activeBalls.length === 0) {
      setImpactedPins({});
      return;
    }

    // Check for new ball positions and update impacted pins
    activeBalls.forEach(ball => {
      if (ball.row > 0 && ball.row <= GAMES.PLINKO.ROWS) {
        // Create a unique identifier for the pin that was hit
        const pinId = `pin-${ball.row-1}-${ball.column}`;
        
        // Mark this pin as impacted
        setImpactedPins(prev => ({
          ...prev,
          [pinId]: Date.now() // Use timestamp to track when impact occurred
        }));
        
        // Clear impact effect after animation completes
        setTimeout(() => {
          setImpactedPins(prev => {
            const updated = { ...prev };
            delete updated[pinId];
            return updated;
          });
        }, 300);
      }
    });
  }, [activeBalls]);
  
  const handleBetAmountChange = (e) => {
    const value = parseFloat(e.target.value);
    setBetAmount(value);
  };
  
  const handleMaxBet = () => {
    if (profile && profile.balance) {
      setBetAmount(Math.min(profile.balance, GAMES.PLINKO.MAX_BET));
    }
  };

  const handleHalfBet = () => {
    setBetAmount(Math.max(betAmount / 2, GAMES.PLINKO.MIN_BET));
  };

  const handleDoubleBet = () => {
    if (profile && profile.balance) {
      setBetAmount(Math.min(betAmount * 2, profile.balance, GAMES.PLINKO.MAX_BET));
    }
  };
  
  const handleToggleSound = () => {
    const newMuted = soundManager.toggleMute();
    setSoundsMuted(newMuted);
  };
  
  const handleRiskChange = (risk) => {
    dispatch(setRiskLevel(risk));
  };
  
  const handleDropBall = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to play');
      navigate('/login');
      return;
    }

    if (betAmount < GAMES.PLINKO.MIN_BET) {
      toast.error(`Minimum bet amount is $${GAMES.PLINKO.MIN_BET}`);
      return;
    }

    if (betAmount > GAMES.PLINKO.MAX_BET) {
      toast.error(`Maximum bet amount is $${GAMES.PLINKO.MAX_BET}`);
      return;
    }

    if (profile && profile.balance < betAmount) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      await dispatch(dropBall(betAmount, currentRisk));
    } catch (err) {
      // Error is already handled in the action creator
    }
  };
  
  // Function to determine color based on multiplier
  const getMultiplierColor = (multiplier) => {
    if (multiplier >= 5) return 'bg-purple-600';
    if (multiplier >= 3) return 'bg-blue-600';
    if (multiplier >= 1.5) return 'bg-green-600';
    if (multiplier >= 0.5) return 'bg-yellow-600';
    if (multiplier > 0) return 'bg-red-600';
    return 'bg-gray-700';
  };
  
  // Calculate ball position for animation
  const getBallPosition = (ball) => {
    if (!ball) return { left: 0, top: 0 };
    
    const centerX = boardWidth / 2;
    const startX = centerX;
    let currentX = startX;
    
    // If the ball has a path, follow it
    if (ball.path && ball.path.length > 0) {
      // Calculate position based on path through pins
      let pathX = startX;
      for (let i = 0; i < ball.path.length; i++) {
        // Move left or right based on path
        pathX += (ball.path[i] === 0 ? -20 : 20);
      }
      currentX = pathX;
    }
    
    // Calculate position based on row and column
    return {
      left: ball.column * (boardWidth / GAMES.PLINKO.PINS_PER_ROW),
      top: ball.row * 40 + 20 // 20px is half the distance between rows
    };
  };
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="p-4 bg-gray-700 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Plinko</h1>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* Plinko Board */}
              <div 
                ref={boardRef}
                className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg overflow-hidden mb-6"
                style={{ 
                  width: `${boardWidth}px`, 
                  height: `${boardHeight}px`,
                  margin: '0 auto',
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6), 0 0 15px rgba(0,0,0,0.5)'
                }}
              >
                {/* Board background patterns */}
                <div className="absolute inset-0 overflow-hidden opacity-10">
                  <div className="absolute inset-0 bg-grid-pattern"></div>
                </div>
                
                {/* Light effect at the top */}
                <div 
                  className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-blue-500/10 to-transparent"
                ></div>
                
                {/* Pins */}
                {pinPositions.map((pin, index) => {
                  const pinId = `pin-${pin.row}-${pin.column}`;
                  const isImpacted = impactedPins[pinId];
                  
                  return (
                    <div
                      key={`pin-${index}`}
                      className={`absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300`}
                      style={{ 
                        left: `${pin.x}px`, 
                        top: `${pin.y}px`,
                        width: isImpacted ? '8px' : '6px',
                        height: isImpacted ? '8px' : '6px',
                        background: isImpacted 
                          ? 'radial-gradient(circle, #ffffff 0%, #b0b0b0 70%)' 
                          : 'radial-gradient(circle, #ffffff 0%, #909090 100%)',
                        boxShadow: isImpacted 
                          ? '0 0 8px 2px rgba(255, 255, 255, 0.8)' 
                          : '0 0 2px 1px rgba(255, 255, 255, 0.3)'
                      }}
                    />
                  );
                })}
                
                {/* Landing slots */}
                <div className="absolute bottom-0 left-0 right-0 flex">
                  {landingSlots.map((slot, index) => (
                    <div 
                      key={`slot-${index}`}
                      className={`${getMultiplierColor(slot.multiplier)} text-center py-2 text-white text-sm font-bold transition-all duration-300 border-t border-gray-700`}
                      style={{ 
                        width: `${slot.width}px`,
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    >
                      {slot.multiplier}x
                    </div>
                  ))}
                </div>
                
                {/* Active balls */}
                {activeBalls.map(ball => {
                  const { left, top } = getBallPosition(ball);
                  return (
                    <div
                      key={ball.id}
                      className="absolute w-4 h-4 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{ 
                        left: `${left}px`, 
                        top: `${top}px`,
                        transition: `all ${ball.status === 'landed' ? '0.5s' : '0.3s'} cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
                        boxShadow: '0 0 8px rgba(255, 215, 0, 0.6), 0 3px 4px rgba(0, 0, 0, 0.3)',
                        animation: ball.status === 'landed' ? 'plinko-land 0.5s ease-out' : 'plinko-pulse 1s infinite alternate'
                      }}
                    >
                      {/* Inner glow effect - sized down */}
                      <div className="absolute inset-0.5 bg-yellow-200 rounded-full opacity-60 blur-[1px]"></div>
                    </div>
                  );
                })}
              </div>
              
              {/* History */}
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Recent Results</h3>
                <div className="flex flex-wrap gap-2">
                  {history.length === 0 ? (
                    <p className="text-gray-400">No history yet</p>
                  ) : (
                    history.map((result, index) => (
                      <div 
                        key={`history-${index}`} 
                        className={`${getMultiplierColor(result.finalMultiplier)} px-3 py-1 rounded text-white font-bold text-sm`}
                      >
                        {result.finalMultiplier}x
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Game Statistics */}
              <GameStats gameType="plinko" />
            </div>
            
            <div>
              {/* Game Controls */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Play Plinko</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Risk Level
                  </label>
                  <div className="flex space-x-2">
                    {GAMES.PLINKO.RISK_LEVELS.map((risk) => (
                      <button
                        key={risk}
                        className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
                          currentRisk === risk ? 'bg-indigo-600' : 'bg-gray-600 hover:bg-gray-500'
                        }`}
                        onClick={() => handleRiskChange(risk)}
                      >
                        {risk}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bet Amount
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      min={GAMES.PLINKO.MIN_BET}
                      max={GAMES.PLINKO.MAX_BET}
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
                
                <button
                  onClick={handleDropBall}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? 'Dropping...' : 'Drop Ball'}
                </button>
                
                <div className="mt-6 bg-gray-800 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">How to Play</h4>
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li>Choose a risk level</li>
                    <li>Set your bet amount</li>
                    <li>Drop the ball and watch it bounce</li>
                    <li>Win based on where the ball lands</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add animation keyframes */}
      <style jsx="true">{`
        @keyframes plinko-pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          100% { transform: translate(-50%, -50%) scale(1.08); }
        }
        
        @keyframes plinko-land {
          0% { transform: translate(-50%, -50%) scale(1.2); }
          50% { transform: translate(-50%, -50%) scale(0.8); }
          75% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
};

export default Plinko; 