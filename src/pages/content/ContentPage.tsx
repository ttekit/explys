import { Link } from "react-router";
import ProgressbarContent from "../../components/ProgressbarContent";
import TestLabel from "../../components/TestLabel";

export default function FilmPage() {
  return (
    <div className="min-h-screen bg-[#F2F3F7] p-5 font-sans">
      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-500 flex items-center justify-center shadow-sm shrink-0">
              <img src="./mainIcon.svg" alt="mainIcon" />
            </div>

            <div className="leading-tight">
              <h1 className="text-lg font-bold text-gray-900">Film</h1>
              <p className="text-sm text-gray-400">
                Level:{" "}
                <span className="text-violet-500 font-medium">level</span>
              </p>
            </div>
          </div>

          <Link to="/">
            <img className="w-12 h-12" src="backButton.svg" alt="backButton" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm font-bold text-gray-900 mb-3">Video</p>
            <div className="w-full aspect-video bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center group cursor-pointer relative">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-white/60"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="col-span-1 bg-white rounded-2xl shadow-sm p-5 flex flex-col">
            <p className="text-sm font-bold text-gray-900 mb-3">Tests</p>
            <TestLabel isDone={true}>Quiz 1</TestLabel>
            <TestLabel isDone={false}>Quiz 2</TestLabel>
            <TestLabel isDone={false}>Quiz 3</TestLabel>
            <TestLabel isDone={false}>Summary</TestLabel>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-900">Progress</p>
            <span className="text-xs font-semibold text-violet-500">100%</span>
          </div>
          <div className="w-full flex flex-row gap-2">
            <ProgressbarContent isDone={true}>Video</ProgressbarContent>
            <ProgressbarContent isDone={false}>Tests</ProgressbarContent>
            <ProgressbarContent isDone={false}>Summary</ProgressbarContent>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
