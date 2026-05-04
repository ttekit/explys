import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Edit,
  FileQuestion,
  FolderOpen,
  Layers,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminCardContent,
  AdminModal,
  AdminCardTitle,
  AdminProgress,
} from "../../components/admin/adminUi";
import {
  AdminRowMenu,
  AdminRowMenuItem,
} from "../../components/admin/AdminRowMenu";
import { ADMIN_TOPIC_GROUPS } from "./mockData";

export default function AdminTopicsPage() {
  const [openId, setOpenId] = useState<number>(ADMIN_TOPIC_GROUPS[0]?.id ?? 1);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Topics</h1>
          <p className="text-muted-foreground">
            Organize learning paths by category (demo tree).
          </p>
        </div>
        <AdminButton className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          New topic
        </AdminButton>
      </div>

      <AdminModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add topic"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton>Create</AdminButton>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Connect this modal to your content API when you wire the admin backend.
        </p>
      </AdminModal>

      <div className="space-y-4">
        {ADMIN_TOPIC_GROUPS.map((cat) => {
          const isOpen = openId === cat.id;
          return (
            <AdminCard key={cat.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? -1 : cat.id)}
                className="flex w-full items-start gap-4 p-6 text-left transition-colors hover:bg-muted/30"
              >
                <span className="text-3xl">{cat.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <AdminCardTitle className="flex items-center gap-2 text-xl">
                      <Layers className="h-5 w-5 shrink-0 text-primary" />
                      {cat.name}
                    </AdminCardTitle>
                    <AdminBadge variant="secondary">
                      {cat.topics.reduce((a, x) => a + x.videos, 0)} videos
                    </AdminBadge>
                  </div>
                  <p className="mt-2 text-muted-foreground">{cat.description}</p>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
              </button>

              {isOpen ? (
                <AdminCardContent className="space-y-2 border-border border-t p-4">
                  <div className="grid gap-2">
                    {cat.topics.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex flex-1 flex-wrap items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-card ring-1 ring-border">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-foreground">{t.name}</p>
                              <AdminBadge variant="outline">{t.level}</AdminBadge>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                {t.videos}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileQuestion className="h-3 w-3" />
                                {t.tests}
                              </span>
                              <span className="hidden sm:inline">Topic #{t.id}</span>
                            </div>
                          </div>
                        </div>
                        <AdminRowMenu>
                          <AdminRowMenuItem>
                            <Edit className="h-4 w-4" /> Edit
                          </AdminRowMenuItem>
                          <AdminRowMenuItem danger>
                            <Trash2 className="h-4 w-4" /> Remove
                          </AdminRowMenuItem>
                        </AdminRowMenu>
                      </div>
                    ))}
                  </div>
                  <AdminButton variant="outline" className="mt-4 w-full gap-2 border-dashed sm:w-auto">
                    <FolderOpen className="h-4 w-4" />
                    Add bundle in category
                  </AdminButton>
                </AdminCardContent>
              ) : null}
            </AdminCard>
          );
        })}
      </div>

      <AdminCard className="border-accent/25 bg-accent/5">
        <AdminCardContent className="flex items-start gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Layers className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Topic tips</h3>
            <p className="text-sm text-muted-foreground">
              Keep each lane focused on one outcome — fewer, clearer topics convert better than
              long catch-all playlists.
            </p>
          </div>
        </AdminCardContent>
      </AdminCard>

      <AdminCard role="presentation" aria-hidden>
        <AdminCardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Coverage mix (readiness heuristic)
          </p>
          <div className="mt-4 space-y-4">
            {[
              { label: "Beginner uptake", pct: 88 },
              { label: "Business depth", pct: 64 },
              { label: "Video/test balance", pct: 71 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{item.label}</span>
                  <span className="text-muted-foreground">{item.pct}%</span>
                </div>
                <AdminProgress value={item.pct} className="mt-2" />
              </div>
            ))}
          </div>
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}
