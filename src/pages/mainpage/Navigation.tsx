import { Link } from "react-router"; 
import Button from '../../components/Button';
import React from 'react';

const Navigation: React.FC = () => {
  return (
    <nav className="w-full bg-black border-b border-zinc-800 p-4 flex flex-col items-center">
      <div className="flex items-center justify-center w-full max-w-7xl mx-auto mb-4">

        <Link to="/" className="text-white font-bold text-2xl tracking-tighter">
        <span className="text-blue-500"></span>
        </Link>

       <div className="flex items-center gap-2.5">
        <Link to="/loginForm">
        <Button className="bg-transparent border border-white text-white hover:bg-white hover:text-black">
          Увійти
        </Button>
        </Link>

        <Link to="/registrationMain">
        <Button className="bg-blue-500 text-white hover:bg-blue-600">
          Реєстрація
        </Button>
        </Link>

       <Link to="/MovieMain">
        <Button className="bg-blue-500 text-white hover:bg-blue-600">
          Фільми
        </Button>
        </Link>
       </div>
  

       <div className="flex items-center gap-10">
        <select className="ml-10 bg-zinc-950 text-white border border-zinc-800 font-bold rounded-md px-3 py-1 text-sm">
          <option>Жанри</option>
          <option>Всі жанри</option>
          <option>Комедія</option>
          <option>Драма</option>
          <option>Фантастика</option>
          <option>Триллер</option>
        </select>
       </div>

        <div className="flex items-center gap-10">
          <select className="ml-10 bg-zinc-950 text-white border border-zinc-800 font-bold rounded-md px-3 py-1 text-sm">
          <option>Мова</option>
          <option>English</option>
          <option>Українська</option>
          <option>Deutsch</option>
          <option>Francais</option>
          </select>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;