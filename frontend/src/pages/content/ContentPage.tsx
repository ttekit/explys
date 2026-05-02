import { Link, useParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import ProgressbarContent from "../../components/ProgressbarContent";
import TestLabel from "../../components/TestLabel";
import VideoPlayer from "../../components/VideoPlayer";
import TestsArea from "../../components/TestsArea";

export default function ContentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filmView, setFilmView] = useState(true);
  const [videoData, setVideoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const lastId = localStorage.getItem("lastWatchedId");

    if (id) {
      fetch(`${import.meta.env.VITE_API_BASE_URL}/content-video/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch video");
          return res.json();
        })
        .then((data) => {
          setVideoData(data);
          localStorage.setItem("lastWatchedId", id);
          setLoading(false);
        })
        .catch(() => {
          setError("Не удалось загрузить видео. Проверь консоль (F12).");
          setLoading(false);
        });
    } else if (lastId) {
      navigate(`/content/${lastId}`, { replace: true });
    } else {
      navigate("/video-page");
    }
  }, [id, navigate]);

  const handleToTestsVideo = () => {
    setFilmView(!filmView);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F3F7] flex items-center justify-center font-bold">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F2F3F7] flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold text-red-500">{error}</h1>
        <Link to="/video-page" className="p-2 bg-violet-500 text-white rounded-xl">Вернуться к списку</Link>
      </div>
    );
  }

  if (!videoData) return null;

  return (
    <div className="min-h-screen bg-[#F2F3F7] p-5 font-sans">
      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-500 flex items-center justify-center shadow-sm shrink-0">
              <img src="/mainIcon.svg" alt="mainIcon" />
            </div>

            <div className="leading-tight">
              <h1 className="text-lg font-bold text-gray-900">
                {videoData.content.category.name}
              </h1>
              <p className="text-sm text-gray-400">
                Level: <span className="text-violet-500 font-medium">B1</span>
              </p>
            </div>
          </div>

          <Link to="/video-page">
            <img className="w-12 h-12" src="/backButton.svg" alt="backButton" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl shadow-sm p-5">
            <div>
              {filmView ? (
                <div>
                  <div className="flex flex-row justify-between pb-2">
                    <p className="text-[16px] font-bold text-gray-900 mb-3">
                      {videoData.videoName}
                    </p>
                    <button
                      onClick={handleToTestsVideo}
                      className="p-2 bg-violet-500 hover:bg-violet-600 text-white rounded-full font-bold text-[12px] shadow-lg shadow-purple-200 transition-all"
                    >
                      Continue to tests
                    </button>
                  </div>
                  <video
                    src={videoData.videoLink}
                    controls
                    className="w-full aspect-video bg-black rounded-xl object-contain"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex flex-row justify-between pb-2">
                    <p className="text-[16px] font-bold text-gray-900 mb-3">Tests</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleToTestsVideo}
                        className="p-2 bg-violet-500 hover:bg-violet-600 text-white rounded-full font-bold text-[12px] shadow-lg shadow-purple-200 transition-all"
                      >
                        Return to video
                      </button>
                      <button className="p-2 bg-violet-500 hover:bg-violet-600 text-white rounded-full font-bold text-[12px] shadow-lg shadow-purple-200 transition-all">
                        Next test
                      </button>
                    </div>
                  </div>
                  <TestsArea />
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
          <p className="text-sm font-bold text-gray-900 mb-3">Progress</p>
          <div className="w-full flex flex-row gap-2">
            <ProgressbarContent isDone={true}>Video</ProgressbarContent>
            <ProgressbarContent isDone={false}>Tests</ProgressbarContent>
            <ProgressbarContent isDone={false}>Summary</ProgressbarContent>
          </div>
        </div>
      </div>
    </div>
  );
}