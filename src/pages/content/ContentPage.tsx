import { Link } from "react-router";
import { useState } from "react";
import ProgressbarContent from "../../components/ProgressbarContent";
import TestLabel from "../../components/TestLabel";
import VideoPlayer from "../../components/VideoPlayer";
import TestArea from "../../components/TestsArea";

export default function FilmPage() {
  const [filmView, setFilmView] = useState(true);

  const handleToTestsVideo = () => {
    if (filmView) {
      setFilmView(false);
    } else {
      setFilmView(true);
    }
  };

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
            <div className="">
              {filmView ? (
                <div>
                  <div className="flex flex-row justify-between pb-2">
                    <p className="text-[16px] font-bold text-gray-900 mb-3">
                      Video
                    </p>
                    <button
                      onClick={handleToTestsVideo}
                      className="p-2 bg-(--purple-default) hover:bg-(--purple-hover) hover:cursor-pointer text-white rounded-full font-bold text-[12px] shadow-lg shadow-purple-200 transition-all"
                    >
                      Continue to tests
                    </button>
                  </div>

                  <VideoPlayer src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" />
                </div>
              ) : (
                <div>
                  <div>
                    <div className="flex flex-row justify-between pb-2">
                      <p className="text-[16px] font-bold text-gray-900 mb-3">
                        Tests
                      </p>
                      <div>
                        <button
                          onClick={handleToTestsVideo}
                          className="p-2 m-1 bg-(--purple-default) hover:bg-(--purple-hover) hover:cursor-pointer text-white rounded-full font-bold text-[12px] shadow-lg shadow-purple-200 transition-all"
                        >
                          Return to video
                        </button>
                        <button className="p-2 bg-(--purple-default) hover:bg-(--purple-hover) hover:cursor-pointer text-white rounded-full font-bold text-[12px] shadow-lg shadow-purple-200 transition-all">
                          Next test
                        </button>
                      </div>
                    </div>

                    <TestArea />
                  </div>
                </div>
              )}
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
