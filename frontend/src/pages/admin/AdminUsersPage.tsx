import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Ban,
  Briefcase,
  CheckCircle2,
  Download,
  Edit,
  GraduationCap,
  Mail,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminCardContent,
  AdminInput,
  AdminModal,
  AdminSelectNative,
  AdminTable,
} from "../../components/admin/adminUi";
import {
  AdminRowMenu,
  AdminRowMenuItem,
} from "../../components/admin/AdminRowMenu";
import type { AdminUserRow } from "../../lib/adminUsersApi";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  matchesLevelFilter,
  patchAdminUser,
  userLevelBadge,
} from "../../lib/adminUsersApi";

type KnownRole = "adult" | "student" | "teacher";

const roleIcons: Record<KnownRole, typeof Briefcase> = {
  adult: Briefcase,
  student: Users,
  teacher: GraduationCap,
};

const roleBadge: Record<KnownRole, string> = {
  adult: "bg-blue-500/20 text-blue-400",
  student: "bg-green-500/20 text-green-400",
  teacher: "bg-amber-500/20 text-amber-400",
};

function roleKey(r: string): KnownRole | null {
  if (r === "adult" || r === "student" || r === "teacher") return r;
  return null;
}

function mailtoHref(email: string, name: string): string {
  const subject = encodeURIComponent("Exply");
  const body = encodeURIComponent(`Hello ${name},\n\n`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

function optionalPasswordOk(pwd: string): boolean {
  if (!pwd.trim()) return true;
  return (
    pwd.length >= 8 &&
    /[a-z]/.test(pwd) &&
    /[A-Z]/.test(pwd) &&
    /\d/.test(pwd)
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<KnownRole>("adult");
  const [addLevel, setAddLevel] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<KnownRole>("adult");
  const [editLevel, setEditLevel] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [deleteCandidate, setDeleteCandidate] = useState<AdminUserRow | null>(
    null,
  );
  const [deleteSaving, setDeleteSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadError(null);
    try {
      setLoading(true);
      const rows = await fetchAdminUsers();
      setUsers(rows);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole =
        roleFilter === "all" || user.role === roleFilter;
      const matchesLevel = matchesLevelFilter(user, levelFilter);
      return matchesSearch && matchesRole && matchesLevel;
    });
  }, [users, searchQuery, roleFilter, levelFilter]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      adults: users.filter((u) => u.role === "adult").length,
      students: users.filter((u) => u.role === "student").length,
      teachers: users.filter((u) => u.role === "teacher").length,
    };
  }, [users]);

  const openEditModal = useCallback((u: AdminUserRow) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPassword("");
    setEditRole((roleKey(u.role) ?? "adult") as KnownRole);
    setEditLevel(u.englishLevel?.trim() ?? "");
  }, []);

  const exportCsv = useCallback(() => {
    const header = [
      "id",
      "name",
      "email",
      "role",
      "english_level",
      "created_at",
      "is_suspended",
      "videos_watched",
      "tests_completed",
      "placement_completed",
    ];
    const lines = filtered.map((u) =>
      [
        u.id,
        JSON.stringify(u.name),
        JSON.stringify(u.email),
        u.role,
        JSON.stringify(userLevelBadge(u)),
        u.createdAt,
        u.isSuspended ? "yes" : "no",
        u.videosWatched,
        u.testsCompleted,
        u.hasCompletedPlacement ? "yes" : "no",
      ].join(","),
    );
    const blob = new Blob([header.join(",") + "\n" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const handleCreateUser = async () => {
    const name = addName.trim();
    const email = addEmail.trim();
    const password = addPassword.trim();
    if (!name || !email || password.length < 8) {
      toast.error(
        "Name and email required. Password ≥ 8 chars with upper, lower, and digit.",
      );
      return;
    }
    setAddSaving(true);
    try {
      await createAdminUser({
        email,
        password,
        name,
        role: addRole,
        ...(addLevel.trim() ? { englishLevel: addLevel.trim() } : {}),
      });
      toast.success(`User ${email} created`);
      setAddOpen(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddRole("adult");
      setAddLevel("");
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setAddSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    const name = editName.trim();
    const email = editEmail.trim();
    if (!name || !email) {
      toast.error("Name and email are required");
      return;
    }
    const pwd = editPassword.trim();
    if (!optionalPasswordOk(pwd)) {
      toast.error(
        "New password must be ≥ 8 chars and include uppercase, lowercase, and a digit.",
      );
      return;
    }
    setEditSaving(true);
    try {
      await patchAdminUser(editingUser.id, {
        name,
        email,
        role: editRole,
        ...(pwd ? { password: pwd } : {}),
        ...(editLevel.trim() ? { englishLevel: editLevel.trim() } : {}),
      });
      toast.success("User updated");
      setEditingUser(null);
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setEditSaving(false);
    }
  };

  const applySuspended = async (row: AdminUserRow, suspended: boolean) => {
    try {
      await patchAdminUser(row.id, { isSuspended: suspended });
      toast.success(suspended ? "User suspended" : "Account reactivated");
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setDeleteSaving(true);
    try {
      await deleteAdminUser(deleteCandidate.id);
      toast.success(`${deleteCandidate.email} deleted`);
      setDeleteCandidate(null);
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Users
          </h1>
          <p className="text-muted-foreground">
            Learners and staff from the database (<code>/admin/users</code>,{" "}
            <code>PATCH /users/:id</code>).
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AdminButton variant="outline" className="gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export
          </AdminButton>
          <AdminButton className="gap-2" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add user
          </AdminButton>
        </div>
      </div>

      <AdminModal
        open={addOpen}
        onClose={() => !addSaving && setAddOpen(false)}
        title="Add new user"
        footer={
          <>
            <AdminButton
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={addSaving}
            >
              Cancel
            </AdminButton>
            <AdminButton onClick={() => void handleCreateUser()} disabled={addSaving}>
              {addSaving ? "Creating…" : "Create"}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-add-name">
                Full name
              </label>
              <AdminInput
                id="admin-add-name"
                placeholder="Name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-add-email">
                Email
              </label>
              <AdminInput
                id="admin-add-email"
                type="email"
                placeholder="email@…"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="admin-add-password"
              >
                Temporary password
              </label>
              <AdminInput
                id="admin-add-password"
                type="password"
                placeholder="8+ chars, A–Z, a–z, digit"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <AdminSelectNative
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as KnownRole)}
              >
                <option value="adult">Adult</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </AdminSelectNative>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              English level (optional)
            </label>
            <AdminSelectNative
              value={addLevel}
              onChange={(e) => setAddLevel(e.target.value)}
            >
              <option value="">— Skip —</option>
              {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </AdminSelectNative>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={editingUser != null}
        onClose={() => !editSaving && setEditingUser(null)}
        title={`Edit · ${editingUser?.name ?? ""}`}
        footer={
          <>
            <AdminButton
              variant="outline"
              onClick={() => setEditingUser(null)}
              disabled={editSaving}
            >
              Cancel
            </AdminButton>
            <AdminButton onClick={() => void handleSaveEdit()} disabled={editSaving}>
              {editSaving ? "Saving…" : "Save changes"}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-edit-name">
                Full name
              </label>
              <AdminInput
                id="admin-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="admin-edit-email"
              >
                Email
              </label>
              <AdminInput
                id="admin-edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="admin-edit-password"
              >
                New password (optional)
              </label>
              <AdminInput
                id="admin-edit-password"
                type="password"
                placeholder="Leave blank to keep current"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <AdminSelectNative
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as KnownRole)}
              >
                <option value="adult">Adult</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </AdminSelectNative>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              English level (CEFR hint)
            </label>
            <AdminSelectNative
              value={
                editLevel && ["A1", "A2", "B1", "B2", "C1", "C2"].includes(editLevel)
                  ? editLevel
                  : ""
              }
              onChange={(e) => setEditLevel(e.target.value)}
            >
              <option value="">— Not set —</option>
              {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </AdminSelectNative>
            {editLevel.trim() &&
            !["A1", "A2", "B1", "B2", "C1", "C2"].includes(editLevel) ? (
              <p className="text-xs text-muted-foreground">
                Profile currently <code>{editLevel}</code> — pick a level above to
                replace it, or save without selecting to leave it unchanged.
              </p>
            ) : null}
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={deleteCandidate != null}
        onClose={() => !deleteSaving && setDeleteCandidate(null)}
        title="Delete user"
        footer={
          <>
            <AdminButton
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
              disabled={deleteSaving}
            >
              Cancel
            </AdminButton>
            <AdminButton
              variant="danger"
              disabled={deleteSaving}
              onClick={() => void handleConfirmDelete()}
            >
              {deleteSaving ? "Deleting…" : "Delete permanently"}
            </AdminButton>
          </>
        }
      >
        <p className="text-sm text-foreground">
          Permanently remove{" "}
          <strong>{deleteCandidate?.name}</strong> (
          <code>{deleteCandidate?.email}</code>)? Related profile data may be
          removed per database cascade rules.
        </p>
      </AdminModal>

      {loadError ? (
        <AdminCard className="border-destructive/40">
          <AdminCardContent className="p-6 text-sm text-destructive">
            {loadError}
          </AdminCardContent>
        </AdminCard>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total",
            value: loading ? "…" : stats.total,
            icon: Users,
            box: "bg-primary/10",
          },
          {
            label: "Adults",
            value: loading ? "…" : stats.adults,
            icon: Briefcase,
            box: "bg-blue-500/10",
            icolor: "text-blue-400",
          },
          {
            label: "Students",
            value: loading ? "…" : stats.students,
            icon: Users,
            box: "bg-green-500/10",
            icolor: "text-green-400",
          },
          {
            label: "Teachers",
            value: loading ? "…" : stats.teachers,
            icon: GraduationCap,
            box: "bg-amber-500/10",
            icolor: "text-amber-400",
          },
        ].map((s) => (
          <AdminCard key={s.label}>
            <AdminCardContent className="flex items-center gap-4 p-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${s.box}`}
              >
                <s.icon
                  className={`h-6 w-6 ${"icolor" in s ? s.icolor : "text-primary"}`}
                />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </AdminCardContent>
          </AdminCard>
        ))}
      </div>

      <AdminCard>
        <AdminCardContent className="space-y-4 border-border border-b p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <AdminInput
                className="pl-9"
                placeholder="Search users…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <AdminSelectNative
                className="min-w-[140px]"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All roles</option>
                <option value="adult">Adult</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </AdminSelectNative>
              <AdminSelectNative
                className="min-w-[120px]"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="all">All levels</option>
                {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </AdminSelectNative>
            </div>
          </div>
        </AdminCardContent>

        <AdminTable>
          <thead>
            <tr className="border-border border-b">
              <th className="p-4 text-left text-muted-foreground">User</th>
              <th className="hidden p-4 text-left text-muted-foreground sm:table-cell">
                Role
              </th>
              <th className="p-4 text-left text-muted-foreground">Level</th>
              <th className="hidden p-4 text-left text-muted-foreground md:table-cell">
                Joined
              </th>
              <th className="hidden p-4 text-left text-muted-foreground lg:table-cell">
                Videos
              </th>
              <th className="hidden p-4 text-left text-muted-foreground lg:table-cell">
                Tests
              </th>
              <th className="p-4 text-left text-muted-foreground">Status</th>
              <th className="w-14 p-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-muted-foreground"
                >
                  Loading users…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-muted-foreground"
                >
                  No users match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((user) => {
                const rk = roleKey(user.role);
                const RI = rk ? roleIcons[rk] : Briefcase;
                const rb = rk ? roleBadge[rk] : roleBadge.adult;
                const parts = user.name.trim().split(/\s+/).filter(Boolean);
                const initials =
                  parts.length >= 2
                    ? `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`
                    : (parts[0]?.slice(0, 2) ?? "?");

                let statusVariant: "accent" | "secondary" | "danger" =
                  "secondary";
                let statusLabel = "pending";
                if (user.isSuspended) {
                  statusVariant = "danger";
                  statusLabel = "suspended";
                } else if (user.hasCompletedPlacement) {
                  statusVariant = "accent";
                  statusLabel = "active";
                }

                return (
                  <tr
                    key={user.id}
                    className="border-border border-b hover:bg-muted/40"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary uppercase">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden p-4 sm:table-cell">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${rb}`}
                      >
                        <RI className="h-3 w-3" />
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <AdminBadge variant="secondary">
                        {userLevelBadge(user)}
                      </AdminBadge>
                    </td>
                    <td className="hidden p-4 text-muted-foreground md:table-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="hidden p-4 lg:table-cell">
                      {user.videosWatched}
                    </td>
                    <td className="hidden p-4 lg:table-cell">
                      {user.testsCompleted}
                    </td>
                    <td className="p-4">
                      <AdminBadge variant={statusVariant}>
                        {statusLabel}
                      </AdminBadge>
                    </td>
                    <td className="p-4">
                      <AdminRowMenu>
                        <AdminRowMenuItem onClick={() => openEditModal(user)}>
                          <Edit className="h-4 w-4" /> Edit
                        </AdminRowMenuItem>
                        <AdminRowMenuItem
                          onClick={() => {
                            window.location.href = mailtoHref(
                              user.email,
                              user.name,
                            );
                          }}
                        >
                          <Mail className="h-4 w-4" /> Email
                        </AdminRowMenuItem>
                        {user.isSuspended ? (
                          <AdminRowMenuItem
                            onClick={() => void applySuspended(user, false)}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Reactivate
                          </AdminRowMenuItem>
                        ) : (
                          <AdminRowMenuItem
                            onClick={() => void applySuspended(user, true)}
                          >
                            <Ban className="h-4 w-4" /> Suspend
                          </AdminRowMenuItem>
                        )}
                        <AdminRowMenuItem
                          danger
                          onClick={() => setDeleteCandidate(user)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </AdminRowMenuItem>
                      </AdminRowMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </AdminTable>

        <div className="flex flex-col gap-4 border-border border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length}
            {!loading ? ` of ${users.length}` : ""}{" "}
            users in this view.
          </p>
          <div className="flex gap-2">
            <AdminButton
              variant="outline"
              size="sm"
              onClick={() => void loadUsers()}
            >
              Refresh
            </AdminButton>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
