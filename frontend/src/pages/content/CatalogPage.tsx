import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Navigation from "../mainpage/Navigation";
import { apiFetch } from "../../lib/api";

export default function CatalogPage() {
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const response = await apiFetch("/content-video");
                if (response.ok) {
                    const data = await response.json();
                    setVideos(data);
                } else {
                    setError(`Ошибка сервера: ${response.status}`);
                }
            } catch (error) {
                setError("Бэкенд недоступен или ошибка сети");
            } finally {
                setLoading(false);
            }
        };
        fetchVideos();
    }, []);

    return (
        <div className="min-h-screen bg-black text-white">
            <Navigation />
            <main className="max-w-7xl mx-auto p-8">
                <h1 className="text-4xl font-bold mb-10">Video Library</h1>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 bg-red-900/20 border border-red-500/50 rounded-2xl">
                        <h2 className="text-xl font-bold text-red-500">{error}</h2>
                        <p className="text-zinc-400 mt-2">Открой F12 Console, чтобы увидеть детали.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {videos.length > 0 ? videos.map((video) => (
                            <div key={video.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col group">
                                <div className="aspect-video bg-zinc-800 flex items-center justify-center">
                                    <span className="text-zinc-600 text-xs uppercase font-bold">{video.content?.category?.name || "Video"}</span>
                                </div>
                                <div className="p-4 grow">
                                    <h3 className="font-bold mb-2 line-clamp-1">{video.videoName}</h3>
                                    <button
                                        onClick={() => navigate(`/content/${video.id}`)}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors"
                                    >
                                        Watch Now
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full text-center py-20 text-zinc-500">
                                No videos yet
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}