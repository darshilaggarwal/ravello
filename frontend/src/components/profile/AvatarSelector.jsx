import React, { useState } from 'react';
import { motion } from 'framer-motion';

// SVG Avatar component that renders different designs based on props
const AvatarSVG = ({ colors, pattern, size = 100 }) => {
  // Generate a simple pattern based on the pattern prop
  const renderPattern = () => {
    switch (pattern) {
      case 'circles':
        return (
          <>
            <circle cx="30%" cy="30%" r="15%" fill={colors.accent} opacity="0.6" />
            <circle cx="70%" cy="70%" r="20%" fill={colors.accent} opacity="0.5" />
            <circle cx="80%" cy="20%" r="10%" fill={colors.accent} opacity="0.7" />
          </>
        );
      case 'squares':
        return (
          <>
            <rect x="20%" y="20%" width="25%" height="25%" fill={colors.accent} opacity="0.6" rx="8%" />
            <rect x="60%" y="55%" width="30%" height="30%" fill={colors.accent} opacity="0.5" rx="8%" />
            <rect x="65%" y="15%" width="20%" height="20%" fill={colors.accent} opacity="0.7" rx="8%" />
          </>
        );
      case 'triangles':
        return (
          <>
            <polygon points="30,25 10,60 50,60" fill={colors.accent} opacity="0.6" />
            <polygon points="70,30 50,70 90,70" fill={colors.accent} opacity="0.5" />
            <polygon points="80,10 60,40 100,40" fill={colors.accent} opacity="0.7" />
          </>
        );
      case 'hexagons':
        return (
          <>
            <polygon points="30,15 15,35 30,55 55,55 70,35 55,15" fill={colors.accent} opacity="0.6" />
            <polygon points="70,45 55,65 70,85 95,85 110,65 95,45" fill={colors.accent} opacity="0.5" />
          </>
        );
      case 'stars':
        return (
          <>
            <polygon points="50,5 61,40 100,40 68,62 79,95 50,75 21,95 32,62 0,40 39,40" fill={colors.accent} opacity="0.5" transform="scale(0.4) translate(75, 50)" />
            <polygon points="50,5 61,40 100,40 68,62 79,95 50,75 21,95 32,62 0,40 39,40" fill={colors.accent} opacity="0.3" transform="scale(0.25) translate(140, 200)" />
          </>
        );
      case 'waves':
        return (
          <>
            <path d="M0,50 Q25,30 50,50 T100,50 T150,50 T200,50" strokeWidth="10" stroke={colors.accent} fill="none" opacity="0.5" />
            <path d="M0,70 Q25,50 50,70 T100,70 T150,70 T200,70" strokeWidth="8" stroke={colors.accent} fill="none" opacity="0.3" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {/* Main gradient background */}
      <defs>
        <linearGradient id={`gradient-${colors.primary}-${colors.secondary}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.secondary} />
        </linearGradient>
      </defs>
      <rect 
        width="100" 
        height="100" 
        fill={`url(#gradient-${colors.primary}-${colors.secondary})`}
        rx="15"
      />
      
      {/* Render the specific pattern */}
      {renderPattern()}
    </svg>
  );
};

// Define 6 cool avatar options with custom styling
const avatarOptions = [
  {
    id: 1,
    colors: { primary: '#9333EA', secondary: '#EC4899', accent: '#F0ABFC' },
    pattern: 'circles',
    name: 'Purple Haze'
  },
  {
    id: 2,
    colors: { primary: '#10B981', secondary: '#3B82F6', accent: '#93C5FD' },
    pattern: 'squares',
    name: 'Ocean Breeze'
  },
  {
    id: 3,
    colors: { primary: '#F59E0B', secondary: '#EF4444', accent: '#FCA5A5' },
    pattern: 'triangles',
    name: 'Sunset Glow'
  },
  {
    id: 4,
    colors: { primary: '#4F46E5', secondary: '#7C3AED', accent: '#C4B5FD' },
    pattern: 'hexagons',
    name: 'Cosmic Violet'
  },
  {
    id: 5,
    colors: { primary: '#0EA5E9', secondary: '#10B981', accent: '#6EE7B7' },
    pattern: 'stars',
    name: 'Emerald Sea'
  },
  {
    id: 6,
    colors: { primary: '#EF4444', secondary: '#F59E0B', accent: '#FDE68A' },
    pattern: 'waves',
    name: 'Phoenix Fire'
  }
];

const AvatarSelector = ({ currentAvatar, onSelectAvatar }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(
    currentAvatar ? 
      avatarOptions.find(a => a.name === currentAvatar.name) || avatarOptions[0] : 
      null
  );

  const handleSelectAvatar = (avatar) => {
    setSelectedAvatar(avatar);
    if (onSelectAvatar) {
      onSelectAvatar(avatar);
    }
  };

  return (
    <div className="pt-4">
      <h3 className="text-lg font-medium text-white mb-4">Choose Your Avatar</h3>
      
      <div className="grid grid-cols-3 gap-4">
        {avatarOptions.map((avatar) => (
          <motion.div
            key={avatar.id}
            className={`relative rounded-lg p-1 cursor-pointer ${
              selectedAvatar && selectedAvatar.id === avatar.id
                ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-800'
                : 'hover:ring-1 hover:ring-indigo-400 hover:ring-offset-1 hover:ring-offset-gray-800'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectAvatar(avatar)}
          >
            <div className="w-full pb-[100%] rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <AvatarSVG 
                  colors={avatar.colors}
                  pattern={avatar.pattern}
                  size={100}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-center text-gray-300">{avatar.name}</p>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-6 flex justify-center">
        {selectedAvatar && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-indigo-500">
              <AvatarSVG 
                colors={selectedAvatar.colors}
                pattern={selectedAvatar.pattern}
                size={80}
              />
            </div>
            <p className="mt-2 text-sm text-indigo-300">{selectedAvatar.name}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarSelector; 