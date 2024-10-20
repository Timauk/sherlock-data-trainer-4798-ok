import React from 'react';
import { Link } from 'react-router-dom';
import { ModeToggle } from './ModeToggle';

const Header: React.FC = () => {
  return (
    <header className="bg-background text-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto mr-2" />
          <h1 className="text-2xl font-bold">SHERLOK</h1>
        </div>
        <nav>
          <ul className="flex space-x-4">
            <li><Link to="/" className="hover:text-primary">Home</Link></li>
            <li><Link to="/training" className="hover:text-primary">Treinamento</Link></li>
            <li><Link to="/play" className="hover:text-primary">Jogar</Link></li>
          </ul>
        </nav>
        <ModeToggle />
      </div>
    </header>
  );
};

export default Header;