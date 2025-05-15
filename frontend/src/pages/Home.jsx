import React, { useEffect, useState, useRef, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, useAnimation, useScroll, useTransform } from 'framer-motion';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera, Environment, Float, Text3D } from '@react-three/drei';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import { FaDice, FaChartLine, FaBomb, FaCircle, FaCoins, FaUserShield, FaRocket, FaRegLightbulb } from 'react-icons/fa';
import { GiPokerHand, GiCardRandom, GiCrownCoin, GiTwoCoins, GiDiceSixFacesFive } from 'react-icons/gi';
import CombinedHistory from '../components/games/CombinedHistory';
import { useSelector } from 'react-redux';

// 3D Dice component
const Dice = () => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  // Slowly rotate the dice
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.3;
      meshRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <mesh
      ref={meshRef}
      scale={active ? 1.2 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? "#C4A1FF" : "#9D4EDD"} metalness={0.5} roughness={0.2} />
    </mesh>
  );
};

// 3D Coin component
const Coin = ({ position, rotation, delay }) => {
  const meshRef = useRef();
  const [rotationSpeed] = useState(() => 0.5 + Math.random() * 0.5);

  // Rotate the coin
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * rotationSpeed;
    }
  });

  return (
    <Float
      speed={2}
      rotationIntensity={0.2}
      floatIntensity={0.5}
      position={position}
    >
      <mesh
        ref={meshRef}
        rotation={rotation}
        scale={0.5}
      >
        <cylinderGeometry args={[1, 1, 0.2, 32]} />
        <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
      </mesh>
    </Float>
  );
};

// Scene with multiple coins
const CoinsScene = () => {
  const coins = [];
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 5;
    const y = (Math.random() - 0.5) * 5;
    const z = (Math.random() - 0.5) * 2;
    const rx = Math.random() * Math.PI;
    const ry = Math.random() * Math.PI;
    const rz = Math.random() * Math.PI;
    const delay = Math.random() * 2;

    coins.push(
      <Coin
        key={i}
        position={[x, y, z]}
        rotation={[rx, ry, rz]}
        delay={delay}
      />
    );
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      {coins}
      <Dice />
    </>
  );
};

// Animated Card component
const AnimatedCard = ({ suit, value, left, top, delay }) => {
  return (
    <motion.div
      className="absolute"
      style={{ left: `${left}%`, top: `${top}%` }}
      initial={{ opacity: 0, y: 50, rotateZ: Math.random() * 20 - 10 }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        y: [50, 0, -100, -200],
        rotateZ: [Math.random() * 20 - 10, Math.random() * 40 - 20]
      }}
      transition={{ 
        duration: 6,
        delay: delay,
        repeat: Infinity,
        times: [0, 0.1, 0.9, 1]
      }}
    >
      <div className="rounded-lg w-12 h-16 bg-white border-2 border-gray-300 flex flex-col justify-between p-1 shadow-lg">
        <div className={`text-${suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black'}-600 text-xs font-bold`}>{value}</div>
        <div className={`text-${suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black'}-600 text-xl font-bold`}>
          {suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : suit === 'clubs' ? '♣' : '♠'}
        </div>
      </div>
    </motion.div>
  );
};

// Game Card component
const GameCard = ({ title, description, icon, linkTo, bgColor, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ 
        scale: 1.05,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)"
      }}
    >
      <Link 
        to={linkTo} 
        className={`block ${bgColor} rounded-lg shadow-lg overflow-hidden h-full backdrop-blur-sm bg-opacity-80`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center mb-4">
            <div className="mr-4 text-4xl">
              {icon}
            </div>
            <h3 className="text-2xl font-bold text-white">{title}</h3>
          </div>
          <p className="text-gray-200 mb-4 flex-grow">{description}</p>
          <motion.div 
            className="inline-block px-4 py-2 rounded-full bg-white bg-opacity-10 relative group overflow-hidden"
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10">Play Now</span>
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={{ x: "-100%" }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
};

// Feature Card component
const FeatureCard = ({ icon, title, description, delay, color }) => {
  return (
    <motion.div 
      className={`bg-gray-800 bg-opacity-70 backdrop-blur-md p-6 rounded-lg border-l-4 ${color}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ 
        y: -5,
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
      }}
    >
      <div className="text-3xl mb-4 text-indigo-400">{icon}</div>
      <h3 className="text-xl font-semibold mb-3 text-white">{title}</h3>
      <p className="text-gray-300">
        {description}
      </p>
    </motion.div>
  );
};

// Winner Card component
const WinnerCard = ({ username, game, amount, multiplier, timeAgo }) => {
  const getGameIcon = (game) => {
    switch (game) {
      case 'dice': return <FaDice className="text-green-400" />;
      case 'crash': return <FaChartLine className="text-red-400" />;
      case 'mines': return <FaBomb className="text-yellow-400" />;
      case 'plinko': return <FaCircle className="text-purple-400" />;
      default: return <GiPokerHand className="text-blue-400" />;
    }
  };

  return (
    <motion.div 
      className="bg-gray-800 bg-opacity-40 backdrop-blur-sm p-4 rounded-lg border border-gray-700 flex items-center"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
      }}
    >
      <div className="mr-4 p-2 bg-gray-700 rounded-full">
        {getGameIcon(game)}
      </div>
      <div className="flex-grow">
        <div className="flex justify-between">
          <span className="font-medium text-white">{username}</span>
          <span className="text-green-400 font-bold">${amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400 capitalize">{game} • {timeAgo}</span>
          <span className="text-indigo-400">x{multiplier.toFixed(2)}</span>
        </div>
      </div>
    </motion.div>
  );
};

// Jackpot Counter
const JackpotCounter = ({ value }) => {
  return (
    <div className="text-center mb-10">
      <div className="text-lg text-indigo-300 mb-2">Current Jackpot</div>
      <div className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 drop-shadow-lg">
        ${value.toLocaleString()}
      </div>
    </div>
  );
};

const Home = () => {
  const { isAuthenticated } = useSelector(state => state.auth);
  const [jackpot, setJackpot] = useState(345678);
  const { scrollYProgress } = useScroll();
  const controls = useAnimation();

  // Animate jackpot value
  useEffect(() => {
    const interval = setInterval(() => {
      setJackpot(prev => prev + Math.floor(Math.random() * 100));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Simulate recent winners
  const recentWinners = [
    { username: "LuckyPlayer83", game: "crash", amount: 1250.75, multiplier: 14.2, timeAgo: "2m ago" },
    { username: "VegasMaster", game: "dice", amount: 567.50, multiplier: 2.5, timeAgo: "5m ago" },
    { username: "JackpotHunter", game: "mines", amount: 890.25, multiplier: 8.7, timeAgo: "7m ago" },
    { username: "GoldenRoll", game: "plinko", amount: 1430.00, multiplier: 12.0, timeAgo: "12m ago" },
    { username: "RoyalFlush", game: "crash", amount: 2150.50, multiplier: 18.3, timeAgo: "15m ago" },
  ];

  // Generate card animations
  const cards = [];
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['A', 'K', 'Q', 'J', '10'];

  for (let i = 0; i < 8; i++) {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const value = values[Math.floor(Math.random() * values.length)];
    const left = Math.random() * 80 + 10;
    const top = Math.random() * 50;
    const delay = Math.random() * 5;

    cards.push(
      <AnimatedCard 
        key={i} 
        suit={suit} 
        value={value} 
        left={left} 
        top={top} 
        delay={delay} 
      />
    );
  }

  return (
    <div className="relative overflow-hidden bg-gray-900 min-h-screen">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-purple-800 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-800 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-red-800 rounded-full filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Floating cards */}
      <div className="hidden md:block absolute inset-0 pointer-events-none z-0">
        {cards}
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 md:pt-24 pb-12 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.h1 
                className="text-4xl md:text-6xl font-extrabold mb-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <span className="text-white">Experience the</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                  Ultimate Thrill
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-xl text-gray-300 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Experience the electrifying atmosphere of a real casino from the comfort of your home. Play our stunning collection of games with provably fair technology.
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <Link 
                  to="/games/dice" 
                  className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg shadow-lg hover:shadow-purple-500/30 transform transition hover:-translate-y-1 text-center"
                >
                  Try Your Luck Now
                </Link>
                <Link 
                  to="/register" 
                  className="inline-block px-8 py-4 bg-gray-800 border border-purple-500 text-white font-medium rounded-lg hover:bg-gray-700 transform transition hover:-translate-y-1 text-center"
                >
                  Create Free Account
                </Link>
              </motion.div>
            </div>
            
            <div className="h-96 relative">
              <Canvas className="rounded-xl overflow-hidden shadow-2xl border border-gray-800">
                <Suspense fallback={null}>
                  <OrbitControls enableZoom={false} enablePan={false} />
                  <CoinsScene />
                </Suspense>
              </Canvas>
            </div>
          </div>
        </div>
      </section>

      {/* Jackpot Section */}
      <section className="relative py-12 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <JackpotCounter value={jackpot} />
        </div>
      </section>

      {/* Games Section */}
      <section className="relative py-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Premium Games</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Choose from our selection of high-quality casino games and experience the thrill of winning big
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <GameCard 
              title="Dice" 
              description="Roll the dice and test your luck. Choose your odds and win up to 100x your bet!" 
              icon={<FaDice className="text-green-400" />}
              linkTo="/games/dice"
              bgColor="bg-gradient-to-br from-gray-800 to-gray-900"
              delay={0.1}
            />
            
            <GameCard 
              title="Crash" 
              description="Watch the multiplier rise and cash out before it crashes. The longer you wait, the higher the reward!" 
              icon={<FaChartLine className="text-red-400" />}
              linkTo="/games/crash"
              bgColor="bg-gradient-to-br from-gray-800 to-gray-900"
              delay={0.2}
            />
            
            <GameCard 
              title="Mines" 
              description="Navigate through a minefield to discover gems. Each successful step increases your multiplier!" 
              icon={<FaBomb className="text-yellow-400" />}
              linkTo="/games/mines"
              bgColor="bg-gradient-to-br from-gray-800 to-gray-900"
              delay={0.3}
            />
            
            <GameCard 
              title="Plinko" 
              description="Drop balls through a field of pins and watch them bounce into multipliers. Choose your risk level for bigger rewards!" 
              icon={<FaCircle className="text-purple-400" />}
              linkTo="/games/plinko"
              bgColor="bg-gradient-to-br from-gray-800 to-gray-900"
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why Choose Us</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Experience the ultimate online casino platform with cutting-edge features
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<FaUserShield />}
              title="Secure & Fair Play"
              description="All games use provably fair technology, ensuring complete transparency and fairness in every bet you place."
              delay={0.1}
              color="border-green-500"
            />
            
            <FeatureCard 
              icon={<FaRegLightbulb />}
              title="Instant Payouts"
              description="Withdraw your winnings instantly to your wallet with our lightning-fast payment processing system."
              delay={0.2}
              color="border-yellow-500"
            />
            
            <FeatureCard 
              icon={<FaRocket />}
              title="Massive Jackpots"
              description="Participate in progressive jackpots that grow with every bet, giving you the chance to win life-changing amounts."
              delay={0.3}
              color="border-purple-500"
            />
          </div>
        </div>
      </section>

      {/* Live Winners Section */}
      <section className="relative py-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Recent Big Wins</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              See who's winning big right now and join the action
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentWinners.map((winner, index) => (
              <WinnerCard 
                key={index}
                username={winner.username}
                game={winner.game}
                amount={winner.amount}
                multiplier={winner.multiplier}
                timeAgo={winner.timeAgo}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative py-16 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl overflow-hidden shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative px-6 py-10 sm:px-12 sm:py-16">
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute left-0 top-0 transform -translate-x-1/4 -translate-y-1/4 w-1/2 h-1/2 bg-purple-500 opacity-10 rounded-full"></div>
                <div className="absolute right-0 bottom-0 transform translate-x-1/4 translate-y-1/4 w-1/2 h-1/2 bg-indigo-500 opacity-10 rounded-full"></div>
              </div>
              
              <div className="relative text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Experience the Thrill?</h2>
                <p className="text-xl text-indigo-100 mb-8 max-w-3xl mx-auto">
                  Join thousands of players already winning big on our platform. Get started with free coins today!
                </p>
                <Link 
                  to="/register" 
                  className="inline-block px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-lg shadow-xl hover:shadow-purple-500/30 transform transition hover:-translate-y-1"
                >
                  Start Winning Now
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* History Section (only for authenticated users) */}
      {isAuthenticated && (
        <section className="relative py-16 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CombinedHistory />
          </div>
        </section>
      )}
    </div>
  );
};

export default Home; 