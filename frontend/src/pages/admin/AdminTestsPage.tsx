import { useMemo, useState } from "react";
import {
  CheckCircle,
  Copy,
  Eye,
  FileQuestion,
  Plus,
  TrendingUp,
  Users,
  Edit,
  Trash2,
  BarChart3,
} from "lucide-react";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  AdminInput,
  AdminModal,
  AdminSelectNative,
  AdminTable,
} from "../../components/admin/adminUi";
import {
  AdminRowMenu,
  AdminRowMenuItem,
} from "../../components/admin/AdminRowMenu";
import { ADMIN_TEST_ROWS } from "./mockData";

const testTypeColors = {
  placement: "bg-blue-500/20 text-blue-400",
  video: "bg-primary/20 text-primary",
  practice: "bg-amber-500/20 text-amber-400",
} as const;

export default function AdminTestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    return ADMIN_TEST_ROWS.filter((t) => {
      const qs = searchQuery.toLowerCase();
      const matchesSearch = t.title.toLowerCase().includes(qs);
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesLevel = levelFilter === "all" || t.level === levelFilter;
      return matchesSearch && matchesType && matchesLevel;
    });
  }, [searchQuery, typeFilter, levelFilter]);

  const stats = useMemo(() => {
    const t = ADMIN_TEST_ROWS;
    return {
      total: t.length,
      totalAttempts: t.reduce((a, x) => a + x.attempts, 0),
      avgPass: Math.round(t.reduce((a, x) => a + x.passRate, 0) / t.length),
      active: t.filter((x) => x.status === "active").length,
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Tests &amp; quizzes
          </h1>
          <p className="text-muted-foreground">Placement and comprehension tests (demo).</p>
        </div>
        <AdminButton className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create test
        </AdminButton>
      </div>

      <AdminModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create test"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton>Create</AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <AdminInput placeholder="Test title" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <AdminSelectNative>
                <option value="placement">Placement</option>
                <option value="video">Video quiz</option>
                <option value="practice">Practice</option>
              </AdminSelectNative>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Level</label>
              <AdminSelectNative>
                {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </AdminSelectNative>
            </div>
          </div>
        </div>
      </AdminModal>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCard>
          <AdminCardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FileQuestion className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total tests</p>
            </div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalAttempts.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Attempts</p>
            </div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avgPass}%</p>
              <p className="text-sm text-muted-foreground">Avg pass rate</p>
            </div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </AdminCardContent>
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHeader className="flex flex-wrap gap-4 border-border border-b">
          <AdminInput
            placeholder="Search tests…"
            className="min-w-[200px] flex-1 bg-muted max-w-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <AdminSelectNative
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            <option value="placement">Placement</option>
            <option value="video">Video</option>
            <option value="practice">Practice</option>
          </AdminSelectNative>
          <AdminSelectNative
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="all">All levels</option>
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </AdminSelectNative>
        </AdminCardHeader>

        <AdminTable>
          <thead>
            <tr className="border-border border-b">
              <th className="p-4 text-left text-muted-foreground">Test</th>
              <th className="p-4 text-left text-muted-foreground">Type</th>
              <th className="p-4 text-left text-muted-foreground">Level</th>
              <th className="hidden p-4 text-left text-muted-foreground md:table-cell">Q&apos;s</th>
              <th className="hidden p-4 text-left text-muted-foreground md:table-cell">Time</th>
              <th className="hidden p-4 text-left text-muted-foreground lg:table-cell">Attempts</th>
              <th className="hidden p-4 text-left text-muted-foreground lg:table-cell">Avg</th>
              <th className="p-4 text-left text-muted-foreground">Pass %</th>
              <th className="p-4 text-left text-muted-foreground">Status</th>
              <th className="w-12 p-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((test) => (
              <tr key={test.id} className="border-border border-b hover:bg-muted/40">
                <td className="p-4 font-medium">{test.title}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${testTypeColors[test.type as keyof typeof testTypeColors]}`}
                  >
                    {test.type}
                  </span>
                </td>
                <td className="p-4">
                  <AdminBadge variant="secondary">{test.level}</AdminBadge>
                </td>
                <td className="hidden p-4 text-muted-foreground md:table-cell">
                  {test.questions}
                </td>
                <td className="hidden p-4 text-muted-foreground md:table-cell">
                  {test.duration}
                </td>
                <td className="hidden p-4 lg:table-cell">{test.attempts.toLocaleString()}</td>
                <td className="hidden p-4 lg:table-cell">{test.avgScore}%</td>
                <td className="p-4">
                  <span
                    className={
                      test.passRate >= 70
                        ? "font-medium text-accent"
                        : test.passRate >= 50
                          ? "font-medium text-amber-400"
                          : "font-medium text-destructive"
                    }
                  >
                    {test.passRate}%
                  </span>
                </td>
                <td className="p-4">
                  <AdminBadge variant={test.status === "active" ? "accent" : "secondary"}>
                    {test.status}
                  </AdminBadge>
                </td>
                <td className="p-4">
                  <AdminRowMenu>
                    <AdminRowMenuItem>
                      <Eye className="h-4 w-4" /> Preview
                    </AdminRowMenuItem>
                    <AdminRowMenuItem>
                      <Edit className="h-4 w-4" /> Edit
                    </AdminRowMenuItem>
                    <AdminRowMenuItem>
                      <BarChart3 className="h-4 w-4" /> Analytics
                    </AdminRowMenuItem>
                    <AdminRowMenuItem>
                      <Copy className="h-4 w-4" /> Duplicate
                    </AdminRowMenuItem>
                    <AdminRowMenuItem danger>
                      <Trash2 className="h-4 w-4" /> Delete
                    </AdminRowMenuItem>
                  </AdminRowMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>

        <div className="flex flex-col gap-4 border-border border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {ADMIN_TEST_ROWS.length}
          </p>
          <div className="flex gap-2">
            <AdminButton variant="outline" size="sm" disabled>
              Previous
            </AdminButton>
            <AdminButton variant="outline" size="sm">
              Next
            </AdminButton>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
