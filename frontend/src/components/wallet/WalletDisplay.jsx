import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const WalletDisplay = ({ className = '', showIcon = true, linkToWallet = true }) => {
  const { profile } = useSelector(state => state.user);
  
  if (!profile) return null;
  
  const BalanceDisplay = () => (
    <div className={`flex items-center ${className}`}>
      {showIcon && (
        <svg className="w-5 h-5 mr-1 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span className="font-medium">${profile.balance?.toFixed(2) || '0.00'}</span>
    </div>
  );
  
  if (linkToWallet) {
    return (
      <Link to="/wallet" className="hover:text-green-400 transition-colors">
        <BalanceDisplay />
      </Link>
    );
  }
  
  return <BalanceDisplay />;
};

export default WalletDisplay; 