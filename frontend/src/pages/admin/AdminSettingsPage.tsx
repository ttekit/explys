import { useState } from "react";
import {
  Bell,
  Database,
  Globe,
  Mail,
  Palette,
  Save,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminCardContent,
  AdminCardDescription,
  AdminCardHeader,
  AdminCardTitle,
  AdminInput,
  AdminTabs,
  AdminTextarea,
  AdminSelectNative,
} from "../../components/admin/adminUi";

export default function AdminSettingsPage() {
  const [tab, setTab] = useState("general");
  const [emailOn, setEmailOn] = useState(true);
  const [weekly, setWeekly] = useState(true);
  const [maintenance, setMaintenance] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Platform knobs — UI only until backend endpoints land.
        </p>
      </div>

      <AdminTabs
        value={tab}
        onChange={setTab}
        tabs={[
          {
            id: "general",
            label: (
              <>
                <Settings className="h-4 w-4" /> General
              </>
            ),
          },
          {
            id: "notifications",
            label: (
              <>
                <Bell className="h-4 w-4" /> Notifications
              </>
            ),
          },
          {
            id: "security",
            label: (
              <>
                <Shield className="h-4 w-4" /> Security
              </>
            ),
          },
          {
            id: "appearance",
            label: (
              <>
                <Palette className="h-4 w-4" /> Appearance
              </>
            ),
          },
        ]}
      />

      {tab === "general" ? (
        <div className="space-y-6">
          <AdminCard>
            <AdminCardHeader className="border-border border-b">
              <AdminCardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Platform profile
              </AdminCardTitle>
              <AdminCardDescription>
                How Explys appears publicly in onboarding copy.
              </AdminCardDescription>
            </AdminCardHeader>
            <AdminCardContent className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Name</label>
                  <AdminInput defaultValue="Explys" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Support email
                  </label>
                  <AdminInput type="email" defaultValue="support@exply.dev" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <AdminTextarea
                  className="min-h-[104px]"
                  defaultValue="Video-first adaptive English labs for schools and creators."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Locale</label>
                  <AdminSelectNative defaultValue="en">
                    <option value="en">English</option>
                    <option value="uk">Українська</option>
                  </AdminSelectNative>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Timezone</label>
                  <AdminSelectNative defaultValue="utc">
                    <option value="utc">UTC</option>
                    <option value="est">America/New_York</option>
                  </AdminSelectNative>
                </div>
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardHeader className="border-border border-b">
              <AdminCardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Access gates
              </AdminCardTitle>
              <AdminCardDescription>High-level safeguards for rollout.</AdminCardDescription>
            </AdminCardHeader>
            <AdminCardContent className="space-y-4 p-6">
              <ToggleRow label="Maintenance mode (read-only learner app)" checked={maintenance} onChange={setMaintenance} />
              <ToggleRow label="Allow new registrations" checked readOnly disabled />
              <AdminButton variant="outline" className="gap-2 border-dashed text-primary">
                <Save className="h-4 w-4" />
                Save drafts locally
              </AdminButton>
            </AdminCardContent>
          </AdminCard>
        </div>
      ) : null}

      {tab === "notifications" ? (
        <AdminCard>
          <AdminCardHeader className="border-border border-b">
            <AdminCardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Delivery preferences
            </AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="space-y-4 p-6">
            <ToggleRow label="Email digests for admins" checked={emailOn} onChange={setEmailOn} />
            <ToggleRow label="Weekly health report" checked={weekly} onChange={setWeekly} />
          </AdminCardContent>
        </AdminCard>
      ) : null}

      {tab === "security" ? (
        <AdminCard>
          <AdminCardHeader className="border-border border-b">
            <AdminCardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Security posture
            </AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">API token fingerprint</label>
              <AdminInput readOnly placeholder="············" className="font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Session lifetime (hours)</label>
              <AdminInput type="number" defaultValue="12" />
            </div>
            <ToggleRow label="Require 2FA for admin accounts (future)" checked={false} readOnly />
          </AdminCardContent>
        </AdminCard>
      ) : null}

      {tab === "appearance" ? (
        <AdminCard>
          <AdminCardHeader className="border-border border-b">
            <AdminCardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" /> Visual system
            </AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sidebar density</label>
              <AdminSelectNative defaultValue="comfortable">
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </AdminSelectNative>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-6 text-muted-foreground">
              <Database className="h-5 w-5 text-primary" />
              Theme presets sync with learner app tokens (`index.css`).
            </div>
          </AdminCardContent>
        </AdminCard>
      ) : null}

      <AdminButton variant="outline" disabled className="w-full sm:w-auto">
        Persist changes (stub)
      </AdminButton>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
  readOnly,
}: {
  label: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm transition-colors hover:bg-muted/35 ${disabled ? "opacity-60" : ""}`}
    >
      <span className="text-foreground">{label}</span>
      <input
        type="checkbox"
        className="h-5 w-5 rounded accent-primary"
        checked={checked}
        readOnly={readOnly || !onChange}
        disabled={disabled}
        onChange={
          readOnly || !onChange
            ? undefined
            : (e) => {
                onChange(e.target.checked);
              }
        }
      />
    </label>
  );
}
