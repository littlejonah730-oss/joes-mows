import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PageHeader, LoadingState, EmptyState, Badge } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/lib/ThemeContext";
import { COLOR_THEMES } from "@/lib/colorThemes";
import { formatDateTime } from "@/lib/lawnCare";
import { Building2, Upload, Sun, Moon, Save, Users, Mail, Phone, MapPin, DollarSign, Leaf, Trash2, AlertTriangle, Loader2, Bell, Star, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function Settings() {
  const { theme, toggleTheme, colorScheme, setColorScheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [sheets, setSheets] = useState(null);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const existing = await base44.entities.BusinessSettings.list("-created_date", 1);
      if (existing && existing.length > 0) {
        setSettings(existing[0]);
      } else {
        const created = await base44.entities.BusinessSettings.create({ business_name: "GreenPro Lawn Care", default_price: 40, theme: "dark" });
        setSettings(created);
      }
      try {
        const u = await base44.entities.User.list("-created_date", 50);
        setUsers(u || []);
      } catch (e) { console.error(e); }
      try {
        const res = await base44.functions.invoke("exportExpensesToSheets", { mode: "status" });
        setSheets(res?.data || { connected: false });
      } catch (e) { setSheets({ connected: false }); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await base44.entities.BusinessSettings.update(settings.id, { ...settings, timezone_offset: new Date().getTimezoneOffset() });
      queryClient.invalidateQueries({ queryKey: ["BusinessSettings"] });
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSettings((p) => ({ ...p, logo_url: file_url }));
    } catch (err) { console.error(err); }
  }

  async function inviteUser() {
    if (!inviteEmail.trim()) return;
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      setInviteEmail("");
      const u = await base44.entities.User.list("-created_date", 50);
      setUsers(u || []);
    } catch (e) { console.error(e); }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const me = await base44.auth.me();
      if (me?.id) {
        await base44.entities.User.delete(me.id);
      }
      await base44.auth.logout();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!settings) return <EmptyState icon={Building2} title="Settings not available" />;

  const update = (k, v) => setSettings((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
      <PageHeader title="Settings" subtitle="Manage your business and branding" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Branding */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Business Info & Branding</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden neon-glow">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Leaf className="w-8 h-8 text-primary" />
                )}
              </div>
              <div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:border-primary/40 transition-colors no-select">
                    <Upload className="w-4 h-4" /> Upload Logo
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                <p className="text-xs text-muted-foreground mt-1">PNG or JPG, max 2MB</p>
              </div>
            </div>
            <div>
              <Label htmlFor="business_name">Business Name</Label>
              <Input id="business_name" value={settings.business_name} onChange={(e) => update("business_name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="phone"><Phone className="w-3 h-3 inline mr-1" /> Phone</Label>
                <Input id="phone" value={settings.phone || ""} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div>
                <Label htmlFor="email"><Mail className="w-3 h-3 inline mr-1" /> Email</Label>
                <Input id="email" value={settings.email || ""} onChange={(e) => update("email", e.target.value)} placeholder="info@greenpro.com" />
              </div>
            </div>
            <div>
              <Label htmlFor="address"><MapPin className="w-3 h-3 inline mr-1" /> Address</Label>
              <Input id="address" value={settings.address || ""} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St, City, ST" />
            </div>
            <div>
              <Label htmlFor="google_review_link"><Star className="w-3 h-3 inline mr-1" /> Google Review Link</Label>
              <Input id="google_review_link" value={settings.google_review_link || ""} onChange={(e) => update("google_review_link", e.target.value)} placeholder="https://g.page/r/your-review-link" />
              <p className="text-xs text-muted-foreground mt-1">One-time customers automatically get a review-request text with this link when their job is completed.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="default_price"><DollarSign className="w-3 h-3 inline mr-1" /> Default Price</Label>
                <Input id="default_price" type="number" step="0.01" value={settings.default_price || 0} onChange={(e) => update("default_price", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label htmlFor="late_fee">Late Fee ($)</Label>
                <Input id="late_fee" type="number" step="0.01" value={settings.late_fee || 0} onChange={(e) => update("late_fee", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <Button onClick={saveSettings} disabled={saving} className="bg-primary text-black hover:bg-primary/90 w-full">
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        {/* Theme + Employees */}
        <div className="space-y-4">
          {/* Theme */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
              Appearance
            </h2>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">Theme Mode</p>
                <p className="text-xs text-muted-foreground">{theme === "dark" ? "Black + neon green" : "Light + neon green"}</p>
              </div>
              <Button variant="outline" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                Switch to {theme === "dark" ? "Light" : "Dark"}
              </Button>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">Brand colors</p>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setColorScheme(t.id)}
                    className={`flex items-center gap-2 px-2 py-2 rounded-lg border text-xs transition-all select-none ${
                      colorScheme === t.id ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full shrink-0 border border-border" style={{ backgroundColor: `hsl(${t.hue} ${t.sat}% ${t.light}%)` }} />
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Employees */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Employee Accounts</h2>
            <div className="space-y-2 mb-4">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-xs">{u.email?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.email}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDateTime(u.created_date)}</p>
                    </div>
                    <Badge color={u.role === "admin" ? "text-primary" : "text-muted-foreground"} bg={u.role === "admin" ? "bg-primary/10" : "bg-muted"}>
                      {u.role || "user"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2 pt-3 border-t border-border">
              <Label htmlFor="invite_email">Invite New Employee</Label>
              <div className="flex gap-2">
                <Input id="invite_email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="employee@email.com" />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="px-3 rounded-lg border border-border bg-card text-sm no-select">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button onClick={inviteUser} variant="outline" className="w-full"><Mail className="w-4 h-4 mr-2" /> Send Invite</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl border border-border bg-card p-5 mt-4">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Job Notifications</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="notification_email">Notification Email</Label>
            <Input id="notification_email" type="email" value={settings.notification_email || ""} onChange={(e) => update("notification_email", e.target.value)} placeholder={settings.email || "your@email.com"} />
          </div>
          <div>
            <Label htmlFor="today_notification_time">Today's Jobs Alert</Label>
            <Input id="today_notification_time" type="time" value={settings.today_notification_time || "07:00"} onChange={(e) => update("today_notification_time", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Daily email of today's schedule</p>
          </div>
          <div>
            <Label htmlFor="tomorrow_notification_time">Tomorrow's Jobs Alert</Label>
            <Input id="tomorrow_notification_time" type="time" value={settings.tomorrow_notification_time || "18:00"} onChange={(e) => update("tomorrow_notification_time", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Daily email of tomorrow's schedule</p>
          </div>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="mt-4 bg-primary text-black hover:bg-primary/90">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Notification Settings"}
        </Button>
      </div>

      {/* Google Sheets Expense Export */}
      <div className="rounded-2xl border border-border bg-card p-5 mt-4">
        <h2 className="font-semibold mb-1 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-primary" /> Google Sheets Expense Export</h2>
        <p className="text-sm text-muted-foreground mb-3">Every month on the 1st, last month's expenses are exported to a new spreadsheet ("LawnFlow Expenses - Month Year").</p>
        {sheets === null ? (
          <p className="text-sm text-muted-foreground">Checking Google Sheets connection…</p>
        ) : sheets.connected ? (
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/30">
            <p className="text-sm font-medium text-emerald-400">Google Sheets connected</p>
            {sheets.last_export_month ? (
              <p className="text-xs text-muted-foreground mt-1">
                Last export: {sheets.last_export_month} ({sheets.last_export_date})
                {sheets.last_export_url && (
                  <> · <a href={sheets.last_export_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Open sheet</a></>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">First export runs on the 1st of next month.</p>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/30">
            <p className="text-sm font-semibold text-amber-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Connect Google Sheets</p>
            <p className="text-xs text-muted-foreground mt-1">
              Google Sheets isn't connected yet — the monthly expense export will be skipped until you connect it.
              Open your app builder chat and say <span className="text-primary font-medium">"Connect Google Sheets"</span> to authorize the connection.
            </p>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 mt-4">
        <h2 className="font-semibold mb-2 flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /> Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)} className="w-full sm:w-auto">
          <Trash2 className="w-4 h-4 mr-2" /> Delete Account
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-5 h-5" /> Delete Account?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data. This action is <strong>irreversible</strong> and cannot be undone. Are you absolutely sure?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Yes, Delete My Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}