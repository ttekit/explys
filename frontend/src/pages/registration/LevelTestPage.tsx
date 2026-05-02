import { useState } from "react";
import { useNavigate } from "react-router";

const questions = [
    {
        text: "I ___ a student.",
        options: ["am", "is", "are", "be"],
        correctAnswer: "am"
    },
    {
        text: "She ___ to the gym every morning.",
        options: ["go", "goes", "going", "gone"],
        correctAnswer: "goes"
    },
    {
        text: "I have never ___ to New York.",
        options: ["be", "was", "been", "being"],
        correctAnswer: "been"
    },
    {
        text: "If I had more time, I ___ travel the world.",
        options: ["will", "would", "can", "shall"],
        correctAnswer: "would"
    },
    {
        text: "By this time next year, I ___ my university degree.",
        options: ["will finish", "will have finished", "finished", "finish"],
        correctAnswer: "will have finished"
    }
];

export default function LevelTestPage() {
    const navigate = useNavigate();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);

    const handleAnswer = (selectedOption: string) => {
        if (selectedOption === questions[currentQuestion].correctAnswer) {
            setScore(score + 1);
        }

        const nextQuestion = currentQuestion + 1;
        if (nextQuestion < questions.length) {
            setCurrentQuestion(nextQuestion);
        } else {
            setShowResult(true);
        }
    };

    const getEnglishLevel = () => {
        if (score === 0 || score === 1) return "A1 (Beginner)";
        if (score === 2) return "A2 (Elementary)";
        if (score === 3) return "B1 (Intermediate)";
        if (score === 4) return "B2 (Upper-Intermediate)";
        return "C1 (Advanced)";
    };

    return (
        <div className="min-h-screen bg-[#F2F3F7] flex flex-col items-center justify-center p-5 font-sans">
            <div className="max-w-2xl w-full bg-white rounded-3xl p-8 sm:p-10 shadow-lg">
                {!showResult ? (
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-center mb-2">
                            <h1 className="text-2xl font-bold text-gray-900">English Level Test</h1>
                            <span className="text-sm font-bold text-violet-500 bg-violet-100 px-3 py-1 rounded-full">
                                Question {currentQuestion + 1} of {questions.length}
                            </span>
                        </div>

                        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-6">
                            <div
                                className="bg-violet-500 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${(currentQuestion / questions.length) * 100}%` }}
                            ></div>
                        </div>

                        <h2 className="text-xl text-gray-800 font-medium mb-4">
                            {questions[currentQuestion].text}
                        </h2>

                        <div className="flex flex-col gap-3">
                            {questions[currentQuestion].options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleAnswer(option)}
                                    className="w-full text-left px-6 py-4 rounded-2xl border-2 border-gray-100 hover:border-violet-500 hover:bg-violet-50 transition-all font-medium text-gray-700 active:scale-[0.98]"
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center gap-6 py-8">
                        <div className="w-24 h-24 bg-violet-100 rounded-full flex items-center justify-center mb-2">
                            <svg className="w-12 h-12 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>

                        <h1 className="text-3xl font-bold text-gray-900">Test Completed!</h1>
                        <p className="text-gray-500 text-lg">
                            Based on your answers, your estimated English level is:
                        </p>

                        <div className="text-4xl font-extrabold text-violet-500 my-2">
                            {getEnglishLevel()}
                        </div>

                        <button
                            onClick={() => navigate("/catalog")}
                            className="mt-6 w-full sm:w-auto px-10 py-4 bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-purple-200 active:scale-95"
                        >
                            Continue to site
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}