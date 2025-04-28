import React from 'react';
import { Link } from 'react-router-dom';
import { FaDice, FaChartLine, FaBomb, FaCircle } from 'react-icons/fa';

const GameCard = ({ title, description, icon, linkTo, bgColor }) => {
  return (
    <Link 
      to={linkTo} 
      className={`block ${bgColor} rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden`}
    >
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="mr-4 text-4xl">
            {icon}
          </div>
          <h3 className="text-2xl font-bold text-white">{title}</h3>
        </div>
        <p className="text-gray-200">{description}</p>
        <div className="mt-4 inline-block px-4 py-2 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition-colors duration-200">
          Play Now
        </div>
      </div>
    </Link>
  );
};

const Home = () => {
  return (
    <div>
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 text-white">
            Welcome to <span className="text-indigo-500">Revello</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
            Experience the thrill of playing your favorite casino games with cutting-edge technology
            and transparent gameplay.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <GameCard 
              title="Dice" 
              description="Roll the dice and test your luck. Choose your odds and win up to 100x your bet!" 
              icon={<FaDice className="text-green-400" />}
              linkTo="/games/dice"
              bgColor="bg-gray-800"
            />
            
            <GameCard 
              title="Crash" 
              description="Watch the multiplier rise and cash out before it crashes. The longer you wait, the higher the reward!" 
              icon={<FaChartLine className="text-red-400" />}
              linkTo="/games/crash"
              bgColor="bg-gray-800"
            />
            
            <GameCard 
              title="Mines" 
              description="Navigate through a minefield to discover gems. Each successful step increases your multiplier!" 
              icon={<FaBomb className="text-yellow-400" />}
              linkTo="/games/mines"
              bgColor="bg-gray-800"
            />
            
            <GameCard 
              title="Plinko" 
              description="Drop balls through a field of pins and watch them bounce into multipliers. Choose your risk level for bigger rewards!" 
              icon={<FaCircle className="text-purple-400" />}
              linkTo="/games/plinko"
              bgColor="bg-gray-800"
            />
          </div>
        </div>
      </section>
      
      <section className="py-12 px-4 bg-gray-800 rounded-lg mt-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-white text-center">Why Play on Revello?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-700 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3 text-white">Provably Fair</h3>
              <p className="text-gray-300">
                All games use cryptographic technology to ensure fairness and transparency. 
                Verify each result yourself.
              </p>
            </div>
            
            <div className="bg-gray-700 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3 text-white">Instant Withdrawals</h3>
              <p className="text-gray-300">
                No waiting periods. Withdraw your winnings instantly to your preferred wallet.
              </p>
            </div>
            
            <div className="bg-gray-700 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3 text-white">Secure Platform</h3>
              <p className="text-gray-300">
                State-of-the-art security measures protect your funds and personal information.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 