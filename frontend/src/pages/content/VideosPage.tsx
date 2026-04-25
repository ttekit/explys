import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { apiFetch } from "../../lib/api";
import Navigation from "../mainpage/Navigation";

interface ContentVideo {
    id: number;
    videoName: string;
    videoDescription: string | null;
    videoLink: string;
    content: {
        category: {
            name: string;
            description: string;
        };
    };
}

export default function VideoPage() {
    const [videos, setVideos] = useState<ContentVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const response = await apiFetch("/content-video", {
                    method: "GET",
                });
                if (response.ok) {
                    const data = await response.json();
                    setVideos(data);
                }
            } catch (error) {
                console.error("Error fetching video library:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <Navigation />

            <main className="max-w-7xl mx-auto p-8">
                <header className="mb-12">
                    <h1 className="text-5xl font-extrabold tracking-tight">Video Library</h1>
                    <p className="text-zinc-500 mt-3 text-lg">
                        Master English by watching your favorite movies and series.
                    </p>
                </header>

                {loading ? (
                    <div className="flex flex-col justify-center items-center h-80 space-y-4">
                        <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-blue-600 border-solid"></div>
                        <p className="text-zinc-400 animate-pulse">Loading content...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {videos.map((video) => (
                            <div
                                key={video.id}
                                className="group bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden hover:border-blue-500/50 hover:bg-zinc-900 transition-all duration-300 flex flex-col shadow-lg"
                            >
                                {/* Preview Area */}
                                <div className="relative aspect-video bg-zinc-800 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>

                                    {/* Category Name from DB */}
                                    <div className="absolute top-4 left-4 z-10">
                                        <span className="bg-blue-600/20 text-blue-400 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md border border-blue-500/20">
                                            {video.content.category.name}
                                        </span>
                                    </div>

                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl">
                                            <svg className="w-6 h-6 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Info */}
                                <div className="p-6 flex-grow flex flex-col">
                                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors duration-300 line-clamp-1 mb-2">
                                        {video.videoName}
                                    </h3>

                                    <p className="text-zinc-500 text-sm line-clamp-2 leading-relaxed flex-grow">
                                        {video.videoDescription || video.content.category.description}
                                    </p>

                                    <button
                                        onClick={() => navigate(`/content/${video.id}`)}
                                        className="mt-6 w-full py-3 bg-white/5 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm transition-all duration-300 border border-white/5 hover:border-blue-500 shadow-sm active:scale-95"
                                    >
                                        Watch Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && videos.length === 0 && (
                    <div className="text-center py-32 bg-zinc-900/30 rounded-[40px] border-2 border-dashed border-zinc-800/50">
                        <div className="text-6xl mb-4">🎬</div>
                        <h2 className="text-2xl font-bold text-white">No videos yet</h2>
                        <p className="text-zinc-500 mt-2">Check back later for new content.</p>
                    </div>
                )}
            </main>
        </div>
    );
}