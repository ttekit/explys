import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiFetch } from "../../lib/api";
import { useUser } from "../../context/UserContext";
import { CatalogSidebar } from "../../components/catalog/CatalogSidebar";
import { cn } from "../../lib/utils";
import { GraduationCap, Play, Lock, Clock, Info } from "lucide-react";
import { useAppMessages } from "../../hooks/useAppMessages";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { useLandingLocale } from "../../context/LandingLocaleContext";

type ClassroomVideo = {
  id: number;
  title: string;
  categoryLabel: string;
  thumbnailUrl: string | null;
  videoLink: string | null;
  availableFrom: string | null;
  deadline: string | null;
};

type ClassroomApiRow = {
  contentVideoId?: number;
  contentId?: number;
  name?: string;
  thumbnailUrl?: string | null;
  videoLink?: string | null;
  availableFrom?: string | null;
  deadline?: string | null;
};

function parse_classroom_row(
  raw: unknown,
  isTeacher: boolean,
  myLessonLabel: string,
  teacherLessonLabel: string,
): ClassroomVideo | null {
  if (typeof raw !== "object" || raw === null) return null;
  const d = raw as ClassroomApiRow;
  const id = d.contentVideoId ?? d.contentId;
  if (id == null || !Number.isFinite(Number(id))) return null;
  return {
    id: Number(id),
    title: typeof d.name === "string" ? d.name : "",
    categoryLabel: isTeacher ? myLessonLabel : teacherLessonLabel,
    thumbnailUrl: typeof d.thumbnailUrl === "string" ? d.thumbnailUrl : null,
    videoLink: typeof d.videoLink === "string" ? d.videoLink : null,
    availableFrom:
      typeof d.availableFrom === "string" ? d.availableFrom : null,
    deadline: typeof d.deadline === "string" ? d.deadline : null,
  };
}

export default function ClassroomPage() {
  const [videos, setVideos] = useState<ClassroomVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { user } = useUser();
  const { locale } = useLandingLocale();
  const classroom = useAppMessages().classroomPage;
  const isTeacher = user?.role?.toLowerCase() === "teacher";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadClassroom() {
      try {
        const role = user?.role?.toLowerCase();
        const endpoint =
          role === "teacher"
            ? "/contents/teacher/my-series"
            : "/contents/student/teacher-videos";

        const res = await apiFetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data)) {
            setVideos(
              data
                .map((d: unknown) =>
                  parse_classroom_row(
                    d,
                    isTeacher,
                    classroom.myLesson,
                    classroom.teacherLesson,
                  ),
                )
                .filter((v): v is ClassroomVideo => v != null),
            );
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadClassroom();
    return () => {
      cancelled = true;
    };
  }, [user, classroom.myLesson, classroom.teacherLesson, isTeacher]);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground antialiased flex">
      <SEO
        title={classroom.seoTitle}
        description={classroom.seoDescription}
        canonicalUrl={resolveCanonicalUrl("/classroom")}
        ogLocale={locale === "uk" ? "uk_UA" : "en_US"}
        ogLocaleAlternate={locale === "uk" ? "en_US" : "uk_UA"}
        noindex
      />
      <CatalogSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        reserveTopNavSpace={false}
      />
      
      <main
        className={cn(
          "flex-1 w-full pb-24 transition-all duration-300 font-display lg:pb-8",
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64",
        )}
      >
        <div className="px-4 sm:px-6 lg:px-8 pt-10">
          <div className="mb-8 border-b border-border/60 pb-6 flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <GraduationCap className="size-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {isTeacher ? classroom.teacherTitle : classroom.studentTitle}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isTeacher ? classroom.teacherLead : classroom.studentLead}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="size-10 animate-spin rounded-full border-4 border-primary border-r-transparent border-b-transparent" />
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl bg-card/30 py-20 text-center border border-border">
              <img src={`${import.meta.env.BASE_URL}SadIcon.svg`} className="w-24 mb-4 opacity-80" alt="" />
              <h2 className="text-xl font-bold">{classroom.emptyTitle}</h2>
              <p className="text-muted-foreground mt-2 max-w-md">
                {isTeacher ? classroom.emptyTeacher : classroom.emptyStudent}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => {
                const now = new Date();
                const openDate = video.availableFrom
                  ? new Date(video.availableFrom)
                  : null;
                const closeDate = video.deadline
                  ? new Date(video.deadline)
                  : null;

                // Если это учитель, видео всегда доступно для предпросмотра
                const isLocked = !isTeacher && openDate && openDate > now;
                const isClosed = !isTeacher && closeDate && closeDate < now;
                const isPlayable = !isLocked && !isClosed;

                let daysToDeletion = 0;
                if (isClosed && closeDate) {
                  const deleteTime =
                    closeDate.getTime() + 7 * 24 * 60 * 60 * 1000;
                  daysToDeletion = Math.max(
                    1,
                    Math.ceil(
                      (deleteTime - now.getTime()) / (1000 * 60 * 60 * 24),
                    ),
                  );
                }

                return (
                  <div key={video.id} className="flex flex-col gap-3 group">
                    <div
                      className={cn(
                        "relative aspect-video rounded-xl overflow-hidden bg-muted border border-border/50",
                        (isLocked || isClosed) && "opacity-70 grayscale-[50%]",
                      )}
                    >
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-muted to-accent/10" />
                      )}

                      <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md backdrop-blur-sm shadow-sm">
                        {video.categoryLabel}
                      </div>

                      {isPlayable ? (
                        <Link
                          to={`/content/${video.id}`}
                          className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                        >
                          <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg transform transition-transform scale-90 group-hover:scale-100">
                            <Play className="size-6 fill-current ml-1" />
                          </div>
                        </Link>
                      ) : (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                          <Lock className="size-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="px-1">
                      <h3
                        className={cn(
                          "font-bold text-foreground line-clamp-2",
                          (isLocked || isClosed) && "text-muted-foreground",
                        )}
                      >
                        {video.title}
                      </h3>

                      {(openDate || closeDate) && !isTeacher && (
                        <div className="mt-2 flex flex-col gap-1.5 text-xs font-semibold">
                          {isLocked && openDate && (
                            <div className="text-blue-500 flex items-center gap-1.5">
                              <Clock className="size-3.5" />
                              Opens:{" "}
                              {openDate.toLocaleString([], {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </div>
                          )}
                          {closeDate && !isLocked && (
                            <div
                              className={cn(
                                "flex items-center gap-1.5",
                                isClosed
                                  ? "text-destructive"
                                  : "text-amber-500",
                              )}
                            >
                              <Clock className="size-3.5" />
                              {isClosed
                                ? "Time expired"
                                : `Closes: ${closeDate.toLocaleString([], {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}`}

                              {isClosed && (
                                <div className="group/tooltip relative flex items-center ml-0.5">
                                  <Info className="size-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
                                  <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[200px] whitespace-normal text-center -translate-x-1/2 scale-95 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground opacity-0 shadow-xl transition-all group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100">
                                    This lesson will be removed in{" "}
                                    {daysToDeletion} day
                                    {daysToDeletion !== 1 ? "s" : ""}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
