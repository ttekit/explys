import { Link } from "react-router";
import Button from '../../components/Button';
import React from 'react';

const Navigation: React.FC = () => {
  return (
    <nav className="w-full bg-black border-b border-zinc-800 p-4 flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">

        <Link to="/" className="text-white font-bold text-2xl tracking-tighter">
          Cine<span className="text-blue-500">Lingo</span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <select className="bg-zinc-950 text-white border border-zinc-800 font-bold rounded-md px-3 py-1 text-sm outline-none focus:border-blue-500">
              <option>Genres</option>
              <option>All Genres</option>
              <option>Comedy</option>
              <option>Drama</option>
              <option>Sci-Fi</option>
              <option>Thriller</option>
            </select>

            <select className="bg-zinc-950 text-white border border-zinc-800 font-bold rounded-md px-3 py-1 text-sm outline-none focus:border-blue-500">
              <option>Language</option>
              <option>English</option>
              <option>Ukrainian</option>
              <option>German</option>
              <option>French</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/loginForm">
              <Button className="px-6 py-2.5 text-sm font-bold text-white border border-white/20 rounded-full hover:bg-white/10 hover:border-white/40 transition-all duration-300 mb-2.5">
                Login
              </Button>
            </Link>

            <Link to="/registrationMain">ы
              <Button className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-full hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all duration-300 active:scale-95 mb-2.5">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav >
  );
};

export default Navigation;