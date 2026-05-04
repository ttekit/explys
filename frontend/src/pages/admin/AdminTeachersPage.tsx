import { useMemo, useState } from "react";
import {
  BookOpen,
  Edit,
  GraduationCap,
  Mail,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  CheckCircle,
} from "lucide-react";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminCardContent,
  AdminInput,
  AdminModal,
} from "../../components/admin/adminUi";
import {
  AdminRowMenu,
  AdminRowMenuItem,
} from "../../components/admin/AdminRowMenu";
import { ADMIN_TEACHERS } from "./mockData";

export default function AdminTeachersPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);

  const filtered = useMemo(() => {
    return ADMIN_TEACHERS.filter((t) => {
      const q = query.toLowerCase();
      const ms =
        t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q);
      const st = status === "all" || t.status === status;
      return ms && st;
    });
  }, [query, status]);

  const stats = useMemo(() => {
    const t = ADMIN_TEACHERS;
    return {
      total: t.length,
      active: t.filter((x) => x.status === "active").length,
      students: t.reduce((a, x) => a + x.students, 0),
      lessons: t.reduce((a, x) => a + x.lessonsCreated, 0),
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Teachers
          </h1>
          <p className="text-muted-foreground">
            Manage faculty and classroom settings (demo).
          </p>
        </div>
        <AdminButton className="gap-2" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4" />
          Add teacher
        </AdminButton>
      </div>

      <AdminModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite teacher"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton>Send invite</AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <AdminInput placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <AdminInput type="email" placeholder="email@" />
            </div>
          </div>
        </div>
      </AdminModal>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCard>
          <AdminCardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Teachers</p>
            </div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <CheckCircle className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {stats.students.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Students</p>
            </div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <BookOpen className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.lessons}</p>
              <p className="text-sm text-muted-foreground">Lessons</p>
            </div>
          </AdminCardContent>
        </AdminCard>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <AdminInput
            className="pl-9"
            placeholder="Search teachers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-border bg-muted px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((teacher) => (
          <AdminCard key={teacher.id}>
            <AdminCardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    {teacher.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="font-medium">{teacher.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {teacher.email}
                    </p>
                  </div>
                </div>
                <AdminRowMenu>
                  <AdminRowMenuItem>
                    <Edit className="h-4 w-4" /> Edit
                  </AdminRowMenuItem>
                  <AdminRowMenuItem>
                    <Mail className="h-4 w-4" /> Email
                  </AdminRowMenuItem>
                  <AdminRowMenuItem danger>
                    <Trash2 className="h-4 w-4" /> Remove
                  </AdminRowMenuItem>
                </AdminRowMenu>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {teacher.grades.map((g) => (
                  <AdminBadge key={g} variant="secondary">
                    {g}
                  </AdminBadge>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {teacher.topics.slice(0, 3).map((t) => (
                  <AdminBadge key={t} variant="outline">
                    {t}
                  </AdminBadge>
                ))}
                {teacher.topics.length > 3 ? (
                  <AdminBadge variant="outline">
                    +{teacher.topics.length - 3}
                  </AdminBadge>
                ) : null}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-4 border-border border-t pt-4 text-center">
                <div>
                  <p className="text-lg font-bold">{teacher.students}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{teacher.lessonsCreated}</p>
                  <p className="text-xs text-muted-foreground">Lessons</p>
                </div>
                <div>
                  <p className="flex items-center justify-center gap-1 text-lg font-bold">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {teacher.rating}
                  </p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-border border-t pt-4">
                <AdminBadge
                  variant={
                    teacher.status === "active"
                      ? "accent"
                      : teacher.status === "pending"
                        ? "default"
                        : "secondary"
                  }
                >
                  {teacher.status}
                </AdminBadge>
                <span className="text-xs text-muted-foreground">
                  Joined {new Date(teacher.joinedDate).toLocaleDateString()}
                </span>
              </div>
            </AdminCardContent>
          </AdminCard>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <GraduationCap className="mx-auto mb-2 h-10 w-10" />
          No teachers match your filters
        </div>
      ) : null}
    </div>
  );
}
