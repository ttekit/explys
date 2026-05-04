import { Link } from "react-router";
import Button from '../../components/Button';
import React from 'react';

const Navigation: React.FC = () => {
  return (
    <nav className="w-full bg-black border-b border-zinc-800 p-4 flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">

        <Link
          to="/catalog"
          className="text-white font-bold text-2xl tracking-tighter"
        >
          Ex<span className="text-blue-500">ply</span>
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
              <Button className="bg-transparent border border-white text-white hover:bg-white hover:text-black">
                Login
              </Button>
            </Link>

            <Link to="/registrationMain">
              <Button className="bg-blue-500 text-white hover:bg-blue-600">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;