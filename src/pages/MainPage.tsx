import Button from "../components/Button";
import { Link } from "react-router";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import Navigation from "./mainpage/Navigation";
import { useState } from "react";

export default function MainPage() {
  return (
    <div className="min-h-screen bg-white from-violet-100 to-violet-200">
    <Navigation />
    

    <main className="flex flex-col items-end text-right px-6 py-20 justify-right">
      <div className="relative bg-violet-300 rounded-[50px] p-24 text-left w-[900px]">
        <h1 className="text-6xl md:text-4xl font-bold text-zinc-700 leading-tight max-w-4xl">Ласкаво просимо до EngCurses!</h1>
        <p className="mt-8 text-lg text-zinc-600 max-w-2xl">Вчи мови за допомогою фільмів</p>
      </div>
      </main>

      <main className="flex flex-col items-left text-left px-8 py-20 justify-left">
      <div className="relative bg-violet-300 rounded-[50px] p-24 text-left w-[900px]">
        <h1 className="text-6xl md:text-4xl font-bold text-zinc-700 leading-tight max-w-4xl">Розвивай свої навички!</h1>
        <p className="mt-8 text-lg text-zinc-600 max-w-2xl">Практикуйся кожного дня</p>
      </div>
    </main>

    <main className="flex flex-center items-start text-center px-6 py-20 justify-center">
      <h1 className="text-6xl md:text-4xl font-bold text-zinc-700 leading-tight max-w-4xl">Обирай свій рівень</h1>
      
      </main>
      <LevelsSlider />
      <CategoriesSlider />
      </div>
      );
      }
    


     function LevelsSlider () {
        const [currentIndex, setCurrentIndex] = useState(0);
        const levels = [
          { title: "Початковий", description: ["Для тих, хто тільки починає вивчати мову. ", "Дивись короткі мультфільми, прості відео із субтитрами."], color: "bg-[#8BE3B9]"},
          { title: "Середній", description: ["Для тих, хто вже має базові знання мови.", "Дивись більш складні відео та серали.", "Вчи популярні фрази та звикай до акценту."], color: "bg-[#F9C74F]" },
          { title: "Просунутий", description: ["Для тих, хто хоче вдосконалити свої навички.", "Вчи сленг та розумій жарти."], color: "bg-[#F95738]" },
        ];

        const nextSlide = () => {
        if (currentIndex < levels.length - 1) setCurrentIndex(currentIndex + 1)
        };

        const prevSlide = () => {
          if (currentIndex > 0 ) setCurrentIndex(currentIndex - 1);
        };
        return (
          <div className={`${levels[currentIndex].color} rounded-[80px] flex flex-col p-20 text-center  items-center justify-center mx-auto max-w-2xl`}>
            <div className="flex flex-col items-center justify-center w-full py-10">
              <h2 className="text-3xl font-black flex-col text-zinc-900 mb-6">{levels[currentIndex].title}</h2>

              <ul className="space-y-4">
                {levels[currentIndex].description.map((item, index) => (
                  <li key={index} className="flex-center text-2xl font-medium text-zinc-800">
                    <span className="w-2 h-2 bg-black rounded-full mr-4 flex-shrink-0"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 mt-12 w-full justify-center">
              <Button onClick={prevSlide} disabled={currentIndex === 0} className={`px-8 py-3 rounded-full text-lg font-semibold transition-all ${currentIndex === 0 ? 'bg-zinc-200 text-zinc-400' : 'bg-zinc-900 text-white hover: scale-105'}`}>Назад</Button>
              <Button onClick={nextSlide} disabled={currentIndex === levels.length - 1} className={`px-8 py-3 rounded-full text-lg font-semibold transition-all ${currentIndex === levels.length - 1 ? 'bg-zinc-200 text-zinc-400' : 'bg-zinc-900 text-white hover: scale-125'}`}>Вперед</Button>
            </div>
          </div>

  );
}

interface Category {
  title: string;
  image: string;
}const categories: Category[] = [
  { title: "ТВ Шоу", image: "https://images.weserv.nl/?url=https://images.unsplash.com/photo-1598387181032-a3103a2db5b3?q=80&w=800" },
  { title: "Мільтфільми", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000&auto=format&fit=crop" },
  { title: "Серіали", image: "https://images.unsplash.com/photo-1586899028174-e7098604235b?q=80&w=1000&auto=format&fit=crop" },
  { title: "Фільми", image: "https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=1974&auto=format&fit=crop" },
]; 
export function CategoriesSlider() {
  return (
    <section className="bg-[#D1B3FF] mt-20 mx-auto py-20 px-10 rounded-[100px] w-full min-h-screen flex flex-col items-center">
    
      <div className="text-center mb-16">
        <h2 className="text-5xl font-black text-black mb-6 tracking-tighter">
          Контент для будь-якого рівня
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
        {categories.map((item, idx) => (
          <div
            key={idx} 
            className="bg-white rounded-[40px] p-6 h-[400px] flex flex-col relative overflow-hidden flex flex-col shadow-sm hover:-translate-y-2 transition-transform duration-300"
>
            <h3 className="text-2xl font-bold text-black leading-tight mb-4 pr-10">
              {item.title}
            </h3>

          
            <div className="absolute bottom-0 left-0 right-0 h-[70%] overflow-hidden">
              <img 
                src={item.image} 
                alt={item.title}
                className="w-full h-full object-cover rounded-t-[60px]" 
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}