import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { GAMES } from '../../config/constants';
import toast from 'react-hot-toast';
import { FaHistory } from 'react-icons/fa';
import { 
  placeBet, 
  cashOut, 
  getCrashHistory, 
  startCrashGame,
  resetCrashGame 
} from '../../redux/actions/games/crashActions';
import WalletDisplay from '../../components/wallet/WalletDisplay';
import GameStats from '../../components/games/GameStats';

// Animation helpers
const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);
const formatMultiplier = (multiplier) => multiplier.toFixed(2) + 'x';

const Crash = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.user);
  const { 
    status, 
    currentMultiplier, 
    crashPoint,
    history, 
    players,
    myBet, 
    betLoading, 
    betError, 
    cashoutLoading,
    cashoutError
  } = useSelector((state) => state.games.crash);

  const [betAmount, setBetAmount] = useState(GAMES.CRASH.MIN_BET);
  const [autoCashout, setAutoCashout] = useState(GAMES.CRASH.DEFAULT_AUTO_CASHOUT);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Start the game simulation on component mount
  useEffect(() => {
    // Load crash history
    dispatch(getCrashHistory());
    
    // Start the game if it's not already running
    if (status !== 'in_progress') {
      dispatch(startCrashGame());
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [dispatch, status]);

  // Canvas drawing and animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      draw(ctx, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    // Start animation loop
    const animate = () => {
      draw(ctx, canvas.width, canvas.height);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [status, currentMultiplier, crashPoint]);

  // Show error messages
  useEffect(() => {
    if (betError) toast.error(betError);
    if (cashoutError) toast.error(cashoutError);
  }, [betError, cashoutError]);

  const draw = (ctx, width, height) => {
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = height - (height / 5) * i;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    ctx.stroke();

    // Draw crash curve
    if (status === 'in_progress') {
      // Curve
      ctx.beginPath();
      ctx.moveTo(0, height);

      const maxMultiplier = Math.max(5, currentMultiplier);
      const points = 100;
      const maxX = width;
      const maxY = height;

      for (let i = 0; i <= points; i++) {
        const progress = i / points;
        const x = progress * maxX;
        
        // Calculate multiplier at this point
        const pointMultiplier = 1 + (currentMultiplier - 1) * easeOutQuart(progress);
        
        // Convert multiplier to Y coordinate (inverse, since higher multipliers are at the top)
        const y = maxY - ((pointMultiplier - 1) / (maxMultiplier - 1)) * maxY;
        
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw current multiplier label
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#EF4444';
      ctx.textAlign = 'right';
      ctx.fillText(formatMultiplier(currentMultiplier), width - 20, 40);
    } else if (status === 'crashed') {
      // Draw crash message
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = '#EF4444';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CRASHED AT ' + formatMultiplier(crashPoint || currentMultiplier), width / 2, height / 2);
    } else if (status === 'waiting') {
      // Draw waiting message
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#D1D5DB';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Waiting for next game...', width / 2, height / 2);
    }
  };

  // Game actions
  const handleBetAmountChange = (e) => {
    const value = parseFloat(e.target.value);
    setBetAmount(value);
  };

  const handleAutoCashoutChange = (e) => {
    const value = parseFloat(e.target.value);
    setAutoCashout(value);
  };

  const handleMaxBet = () => {
    if (profile && profile.balance) {
      setBetAmount(Math.min(profile.balance, GAMES.CRASH.MAX_BET));
    }
  };

  const handleHalfBet = () => {
    setBetAmount(Math.max(betAmount / 2, GAMES.CRASH.MIN_BET));
  };

  const handleDoubleBet = () => {
    if (profile && profile.balance) {
      setBetAmount(Math.min(betAmount * 2, profile.balance, GAMES.CRASH.MAX_BET));
    }
  };

  const handlePlaceBet = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to play');
      navigate('/login');
      return;
    }

    if (betAmount < GAMES.CRASH.MIN_BET) {
      toast.error(`Minimum bet amount is $${GAMES.CRASH.MIN_BET}`);
      return;
    }

    if (betAmount > GAMES.CRASH.MAX_BET) {
      toast.error(`Maximum bet amount is $${GAMES.CRASH.MAX_BET}`);
      return;
    }

    if (profile && profile.balance < betAmount) {
      toast.error('Insufficient balance');
      return;
    }

    if (status !== 'in_progress') {
      toast.error('Wait for the game to start');
      return;
    }

    try {
      const autoCashoutMultiplier = autoCashoutEnabled ? autoCashout : null;
      await dispatch(placeBet(betAmount, autoCashoutMultiplier));
    } catch (err) {
      // Error is already handled by the action creator
      console.error('Place bet error:', err);
    }
  };

  const handleCashout = async () => {
    if (!myBet || myBet.cashedOut) {
      return;
    }

    try {
      await dispatch(cashOut(myBet.id));
    } catch (err) {
      // Error is already handled by the action creator
      console.error('Cashout error:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="p-4 bg-gray-700 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Crash</h1>
          <WalletDisplay className="text-lg" />
        </div>
        
        <div className="p-6">
          <div className="mb-6 bg-gray-900 rounded-lg overflow-hidden" style={{ height: '300px' }}>
            <canvas ref={canvasRef} className="w-full h-full"></canvas>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Bet controls */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Place Bet</h3>
              
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
                    min={GAMES.CRASH.MIN_BET}
                    max={GAMES.CRASH.MAX_BET}
                    value={betAmount}
                    onChange={handleBetAmountChange}
                    className="block w-full pl-8 pr-12 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={betLoading || !!myBet}
                  />
                </div>
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={handleHalfBet}
                    disabled={betLoading || !!myBet}
                    className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 text-sm rounded disabled:opacity-50"
                  >
                    1/2
                  </button>
                  <button
                    onClick={handleDoubleBet}
                    disabled={betLoading || !!myBet}
                    className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 text-sm rounded disabled:opacity-50"
                  >
                    2x
                  </button>
                  <button
                    onClick={handleMaxBet}
                    disabled={betLoading || !!myBet}
                    className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 text-sm rounded disabled:opacity-50"
                  >
                    Max
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Auto Cashout
                  </label>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input
                      type="checkbox"
                      id="toggle"
                      checked={autoCashoutEnabled}
                      onChange={() => setAutoCashoutEnabled(!autoCashoutEnabled)}
                      disabled={betLoading || !!myBet}
                      className="sr-only"
                    />
                    <label
                      htmlFor="toggle"
                      className={`block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer ${
                        betLoading || !!myBet ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <span
                        className={`block h-6 w-6 rounded-full bg-white transform transition-transform duration-200 ease-in ${
                          autoCashoutEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      ></span>
                    </label>
                  </div>
                </div>
                
                {autoCashoutEnabled && (
                  <div className="mt-2">
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-400">Multiplier: {autoCashout}x</label>
                    </div>
                    <input
                      type="range"
                      min="1.1"
                      max="10"
                      step="0.1"
                      value={autoCashout}
                      onChange={handleAutoCashoutChange}
                      disabled={betLoading || !!myBet}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>1.1x</span>
                      <span>5x</span>
                      <span>10x</span>
                    </div>
                  </div>
                )}
              </div>
              
              {myBet ? (
                <button
                  onClick={handleCashout}
                  disabled={cashoutLoading || status !== 'in_progress' || myBet.cashedOut}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {cashoutLoading 
                    ? 'Cashing Out...' 
                    : myBet.cashedOut 
                      ? `Cashed Out ${myBet.cashedOutAt}x ($${myBet.profit.toFixed(2)})` 
                      : `Cashout (${currentMultiplier}x)`}
                </button>
              ) : (
                <button
                  onClick={handlePlaceBet}
                  disabled={betLoading || status !== 'in_progress'}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {betLoading ? 'Placing Bet...' : 'Place Bet'}
                </button>
              )}
            </div>
            
            {/* Current bets */}
            <div className="bg-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Game Stats</h3>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Status</p>
                    <p className="text-lg font-semibold text-white capitalize">{status}</p>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Current Multiplier</p>
                    <p className="text-lg font-semibold text-white">{currentMultiplier.toFixed(2)}x</p>
                  </div>
                </div>
                
                {myBet && (
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold text-white mb-2">Your Bet</h4>
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <p className="text-sm text-gray-400">Amount</p>
                        <p className="text-white">${myBet.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Auto Cashout</p>
                        <p className="text-white">{myBet.autoCashoutAt ? `${myBet.autoCashoutAt}x` : 'None'}</p>
                      </div>
                    </div>
                    {myBet.cashedOut && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-400">Cashed Out</p>
                            <p className="text-green-400">{myBet.cashedOutAt.toFixed(2)}x</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Profit</p>
                            <p className="text-green-400">${myBet.profit.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Game history */}
            <div className="bg-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <FaHistory className="text-gray-400 mr-2" />
                <h3 className="text-xl font-semibold text-white">Game History</h3>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {Array.isArray(history) && history.map((point, index) => (
                  <div 
                    key={index}
                    className={`p-2 rounded-md text-center ${
                      point < 2 ? 'bg-red-900' : 
                      point < 5 ? 'bg-yellow-900' : 'bg-green-900'
                    }`}
                  >
                    <span className="text-white font-medium">{typeof point === 'number' ? point.toFixed(2) : '0.00'}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <GameStats gameType="crash" />
      </div>
    </div>
  );
};

export default Crash; 