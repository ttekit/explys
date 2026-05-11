import React from 'react';

export default function EmailConfirmedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f111a] text-white">
      <div className="text-center p-8 bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl max-w-md mx-auto">
        <div className="bg-green-500/20 text-green-400 inline-flex size-16 items-center justify-center rounded-full text-3xl font-bold mb-6">
          ✓
        </div>
        <h1 className="text-3xl font-bold mb-4">Пошту підтверджено!</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Ви можете сміливо закрити цю вкладку і повернутися до попередньої сторінки. <br/><br/>
          Там усе вже оновилося автоматично!
        </p>
        <button 
          onClick={() => window.close()} 
          className="px-8 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-semibold transition-colors w-full"
        >
          Закрити вкладку
        </button>
      </div>
    </div>
  );
}