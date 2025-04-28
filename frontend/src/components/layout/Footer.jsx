import { Link } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 py-6">
      <div className="container mx-auto px-4">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex justify-center md:order-2">
            <Link to="/about" className="text-gray-400 hover:text-gray-300 mx-2">
              About
            </Link>
            <Link to="/terms" className="text-gray-400 hover:text-gray-300 mx-2">
              Terms of Service
            </Link>
            <Link to="/privacy" className="text-gray-400 hover:text-gray-300 mx-2">
              Privacy Policy
            </Link>
            <Link to="/responsible-gaming" className="text-gray-400 hover:text-gray-300 mx-2">
              Responsible Gaming
            </Link>
            <Link to="/contact" className="text-gray-400 hover:text-gray-300 mx-2">
              Contact
            </Link>
          </div>
          <div className="mt-8 md:mt-0 md:order-1 text-center">
            <p className="text-base text-gray-400">
              &copy; {year} Revello. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 