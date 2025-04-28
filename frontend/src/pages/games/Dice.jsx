import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { playDice } from '../../redux/actions/games/diceActions';
import { GAMES } from '../../config/constants';
import WalletDisplay from '../../components/wallet/WalletDisplay';
import toast from 'react-hot-toast';
import GameStats from '../../components/games/GameStats';

const Dice = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.user);
  const { loading, lastResult, error } = useSelector((state) => state.games.dice);

  const [betAmount, setBetAmount] = useState(1);
  const [chance, setChance] = useState(GAMES.DICE.DEFAULT_CHANCE);
  const [isOver, setIsOver] = useState(true);
  const [payout, setPayout] = useState(2);
  const [rollValue, setRollValue] = useState(null);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    updatePayout();
  }, [chance, isOver]);

  useEffect(() => {
    if (lastResult) {
      setRollValue(lastResult.roll);
    }
  }, [lastResult]);

  const updatePayout = () => {
    // Calculate payout based on chance (win probability)
    const winProbability = isOver ? (100 - chance) / 100 : chance / 100;
    const houseFee = 0.01; // 1% house edge
    const calculatedPayout = (1 / winProbability) * (1 - houseFee);
    setPayout(parseFloat(calculatedPayout.toFixed(2)));
  };

  const handleChanceChange = (e) => {
    const value = parseFloat(e.target.value);
    setChance(value);
  };

  const handleBetAmountChange = (e) => {
    const value = parseFloat(e.target.value);
    setBetAmount(value);
  };

  const toggleBetType = () => {
    setIsOver(!isOver);
  };

  const handleMaxBet = () => {
    if (profile && profile.balance) {
      setBetAmount(Math.min(profile.balance, GAMES.DICE.MAX_BET));
    }
  };

  const handleHalfBet = () => {
    setBetAmount(Math.max(betAmount / 2, GAMES.DICE.MIN_BET));
  };

  const handleDoubleBet = () => {
    if (profile && profile.balance) {
      setBetAmount(Math.min(betAmount * 2, profile.balance, GAMES.DICE.MAX_BET));
    }
  };

  const handleRoll = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to play');
      navigate('/login');
      return;
    }

    if (betAmount < GAMES.DICE.MIN_BET) {
      toast.error(`Minimum bet amount is $${GAMES.DICE.MIN_BET}`);
      return;
    }

    if (betAmount > GAMES.DICE.MAX_BET) {
      toast.error(`Maximum bet amount is $${GAMES.DICE.MAX_BET}`);
      return;
    }

    if (profile && profile.balance < betAmount) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      // Dispatch play dice action
      await dispatch(playDice(betAmount, chance, isOver));
    } catch (err) {
      // Error is already handled in the action
    }
  };

  const getResultClass = () => {
    if (!lastResult) return '';
    
    const win = isOver 
      ? lastResult.roll > lastResult.target 
      : lastResult.roll < lastResult.target;
    
    return win ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Dice</h1>
            <WalletDisplay className="text-lg" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
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
                    min={GAMES.DICE.MIN_BET}
                    max={GAMES.DICE.MAX_BET}
                    value={betAmount}
                    onChange={handleBetAmountChange}
                    className="block w-full pl-8 pr-12 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={handleHalfBet}
                    className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded"
                  >
                    1/2
                  </button>
                  <button
                    onClick={handleDoubleBet}
                    className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded"
                  >
                    2x
                  </button>
                  <button
                    onClick={handleMaxBet}
                    className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Win Chance: {chance}%
                  </label>
                  <div className="text-sm text-gray-400">
                    Payout: {payout}x
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="98"
                  value={chance}
                  onChange={handleChanceChange}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1%</span>
                  <span>50%</span>
                  <span>98%</span>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bet Type
                </label>
                <div className="flex">
                  <button
                    onClick={() => setIsOver(true)}
                    className={`flex-1 py-2 px-4 rounded-l-md focus:outline-none ${
                      isOver
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    Roll Over {chance}
                  </button>
                  <button
                    onClick={() => setIsOver(false)}
                    className={`flex-1 py-2 px-4 rounded-r-md focus:outline-none ${
                      !isOver
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    Roll Under {chance}
                  </button>
                </div>
              </div>

              <button
                onClick={handleRoll}
                disabled={loading}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? 'Rolling...' : 'Roll Dice'}
              </button>
            </div>

            <div className="flex flex-col">
              <div className="bg-gray-700 rounded-lg p-6 mb-6 flex-grow">
                <h3 className="text-xl font-semibold text-white mb-4">Result</h3>
                
                {rollValue !== null ? (
                  <div className="text-center py-4">
                    <div className="text-6xl font-bold mb-4 transition-all duration-500 ease-in-out transform">
                      <span className={getResultClass()}>{rollValue}</span>
                    </div>
                    <div className={`text-xl ${getResultClass()}`}>
                      {lastResult && (
                        lastResult.win ? 
                          `Win: +$${lastResult.payout.toFixed(2)}` : 
                          `Loss: -$${lastResult.betAmount.toFixed(2)}`
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    Roll the dice to see the result
                  </div>
                )}
              </div>

              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Game Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Chance:</span>
                    <span className="text-white">{chance}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bet Type:</span>
                    <span className="text-white">Roll {isOver ? 'Over' : 'Under'} {chance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Multiplier:</span>
                    <span className="text-white">{payout}x</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <GameStats gameType="dice" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dice; 