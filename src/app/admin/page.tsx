"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  totalScans: number;
  createdAt: string;
  lastLogin: string | null;
}

interface ScanRow {
  id: string;
  input: string;
  type: string;
  riskScore: number;
  classification: string;
  threatCategory: string | null;
  confidence: number;
  createdAt: string;
  user?: { email: string; name: string };
}

interface StatData {
  totalUsers: number;
  totalScans: number;
  byClass: { classification: string; _count: number }[];
  byType: { type: string; _count: number }[];
  recentScans: ScanRow[];
}

interface DailyTrend {
  date: string;
  scans: number;
  threats: number;
  safe: number;
}

interface ThreatCategoryData {
  category: string;
  count: number;
}

const classColors: Record<string, string> = {
  SAFE: "#0ca30c",
  SUSPICIOUS: "#fab219",
  MALICIOUS: "#d03b3b",
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<StatData | null>(null);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [threatCategories, setThreatCategories] = useState<ThreatCategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "scans" | "threats" | "audit">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [scanTypeFilter, setScanTypeFilter] = useState("all");
  const [classificationFilter, setClassificationFilter] = useState("all");

  function processTrends(scans: ScanRow[]) {
    const byDate = new Map<string, { scans: number; threats: number; safe: number }>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      byDate.set(key, { scans: 0, threats: 0, safe: 0 });
    }
    scans.forEach(s => {
      const key = s.createdAt.split("T")[0];
      const entry = byDate.get(key) || { scans: 0, threats: 0, safe: 0 };
      entry.scans++;
      if (s.classification !== "SAFE") entry.threats++;
      else entry.safe++;
      byDate.set(key, entry);
    });
    setDailyTrends(Array.from(byDate.entries()).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)));
  }

  function processThreatCategories(scans: ScanRow[]) {
    const catMap = new Map<string, number>();
    scans.filter(s => s.classification !== "SAFE" && s.threatCategory).forEach(s => {
      catMap.set(s.threatCategory!, (catMap.get(s.threatCategory!) || 0) + 1);
    });
    setThreatCategories(Array.from(catMap.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count));
  }

  async function loadData() {
    try {
      const [uRes, sRes, tRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/stats"),
        fetch("/api/admin/audit"),
      ]);
      if (!uRes.ok || !sRes.ok) { setError("Access denied or server error"); return; }
      setUsers(await uRes.json());
      const sData = await sRes.json();
      setStats(sData);
      await tRes.json();
      processTrends(sData.recentScans);
      processThreatCategories(sData.recentScans);
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/stats"),
      fetch("/api/admin/audit"),
    ]).then(async ([uRes, sRes, tRes]) => {
      if (!active) return;
      if (!uRes.ok || !sRes.ok) { setError("Access denied or server error"); return; }
      setUsers(await uRes.json());
      const sData = await sRes.json();
      setStats(sData);
      await tRes.json();
      processTrends(sData.recentScans);
      processThreatCategories(sData.recentScans);
    }).catch(() => {
      if (active) setError("Failed to load data");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function toggleUser(userId: string, active: boolean) {
    await fetch("/api/admin/disable-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, active }) });
    loadData();
  }

  const filteredUsers = useMemo(() => users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  }), [users, searchQuery, statusFilter, roleFilter]);

  const filteredScans = useMemo(() => stats?.recentScans.filter(s => {
    const matchesType = scanTypeFilter === "all" || s.type === scanTypeFilter;
    const matchesClass = classificationFilter === "all" || s.classification === classificationFilter;
    return matchesType && matchesClass;
  }) || [], [stats?.recentScans, scanTypeFilter, classificationFilter]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-cyan-400">
        <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-lg">Initializing Neural Interface...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-400 font-mono">
      {error}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans">
      <div className="fixed inset-0 z-0 grid-bg" />
      <div className="fixed inset-0 z-0 scanline-overlay" />
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {[
          { left: "12%", top: "25%", delay: "0.2s", duration: "3.5s" },
          { left: "28%", top: "70%", delay: "1.1s", duration: "4.2s" },
          { left: "45%", top: "15%", delay: "0.5s", duration: "2.8s" },
          { left: "62%", top: "85%", delay: "1.8s", duration: "5.1s" },
          { left: "78%", top: "35%", delay: "0.9s", duration: "3.9s" },
          { left: "89%", top: "60%", delay: "1.4s", duration: "4.6s" },
          { left: "15%", top: "90%", delay: "2.1s", duration: "3.2s" },
          { left: "34%", top: "40%", delay: "0.7s", duration: "4.8s" },
          { left: "55%", top: "50%", delay: "1.6s", duration: "3.6s" },
          { left: "70%", top: "10%", delay: "0.3s", duration: "4.1s" },
          { left: "82%", top: "75%", delay: "2.0s", duration: "3.7s" },
          { left: "95%", top: "20%", delay: "1.3s", duration: "5.0s" },
        ].map((p, i) => (
          <div key={i} className="particle" style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.duration }} />
        ))}
      </div>

      <main className="relative z-10 px-4 md:px-8 lg:px-12 py-8 max-w-8xl mx-auto">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gradient tracking-tight">Admin Neural Interface</h1>
            <p className="text-cyan-400/70 mt-1 font-mono text-sm">THREATLY Command Center v2.0.0 | Real-time Threat Intelligence</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-mono text-sm">LIVE</span>
            </div>
            <span className="text-gray-500 font-mono text-sm hidden sm:block">Channel: Encrypted</span>
          </div>
        </motion.header>

        <nav className="mb-8" role="tablist" aria-label="Admin sections">
          <div className="flex flex-wrap gap-2 glass rounded-xl p-2">
            {([
              { id: "overview", label: "Overview", icon: "📊" },
              { id: "users", label: "Users", icon: "👥" },
              { id: "scans", label: "Scan History", icon: "🔍" },
              { id: "threats", label: "Threat Intel", icon: "⚠️" },
              { id: "audit", label: "Audit Log", icon: "📋" },
            ] as const).map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-btn ${activeTab === tab.id ? "tab-btn-active" : "tab-btn-inactive"}`}
              >
                <span className="flex items-center gap-2">{tab.icon} {tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && <OverviewTab stats={stats} dailyTrends={dailyTrends} threatCategories={threatCategories} users={users} />}
          {activeTab === "users" && <UsersTab users={filteredUsers} onToggle={toggleUser} searchQuery={searchQuery} setSearchQuery={setSearchQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} roleFilter={roleFilter} setRoleFilter={setRoleFilter} />}
          {activeTab === "scans" && <ScansTab scans={filteredScans} scanTypeFilter={scanTypeFilter} setScanTypeFilter={setScanTypeFilter} classificationFilter={classificationFilter} setClassificationFilter={setClassificationFilter} />}
          {activeTab === "threats" && <ThreatsTab threatCategories={threatCategories} stats={stats} />}
          {activeTab === "audit" && <AuditTab />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function OverviewTab({ stats, dailyTrends, threatCategories, users }: { stats: StatData | null; dailyTrends: DailyTrend[]; threatCategories: ThreatCategoryData[]; users: UserRow[] }) {
  const threatCount = stats?.byClass?.filter(c => c.classification !== "SAFE").reduce((a, b) => a + b._count, 0) ?? 0;
  const safeCount = stats?.byClass?.find(c => c.classification === "SAFE")?._count ?? 0;
  const activeUsers = users.filter(u => u.status === "ACTIVE").length;
  const recent24h = dailyTrends[dailyTrends.length - 1]?.scans ?? 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Scans" value={stats?.totalScans ?? 0} icon="🔍" color="cyan" trend={`+${recent24h} last 24h`} trendColor="emerald" />
        <StatCard title="Active Threats" value={threatCount} icon="⚠️" color="red" trend={`${((threatCount / (stats?.totalScans || 1)) * 100).toFixed(1)}% of total`} trendColor="red" />
        <StatCard title="Safe Scans" value={safeCount} icon="✅" color="emerald" trend={`${((safeCount / (stats?.totalScans || 1)) * 100).toFixed(1)}% clean`} trendColor="emerald" />
        <StatCard title="Active Agents" value={activeUsers} icon="👥" color="purple" trend={`${users.length} total registered`} trendColor="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="chart-container">
          <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">📈 <span className="text-gradient">Scan Activity (30 Days)</span></h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="scans-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ffff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00ffff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="threats-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d03b3b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d03b3b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="safe-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ca30c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ca30c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })} interval="preserveStartEnd" tickCount={8} />
                <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                <Tooltip
                  labelFormatter={(label) => label ? new Date(String(label)).toLocaleDateString() : ""}
                  contentStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                  formatter={(value: unknown, name: unknown) => [String(value ?? ""), String(name ?? "")]}
                />
                <Legend />
                <Area type="monotone" dataKey="scans" name="Total Scans" stroke="#00ffff" strokeWidth={2} fillOpacity={1} fill="url(#scans-gradient)" />
                <Area type="monotone" dataKey="threats" name="Threats Detected" stroke="#d03b3b" strokeWidth={2} fillOpacity={1} fill="url(#threats-gradient)" />
                <Area type="monotone" dataKey="safe" name="Safe Scans" stroke="#0ca30c" strokeWidth={2} fillOpacity={1} fill="url(#safe-gradient)" />
              </ComposedChart>
            </ResponsiveContainer>
            </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="chart-container">
          <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">🎯 <span className="text-gradient">Classification Breakdown</span></h3>
          <div className="h-80 flex flex-col">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.byClass || []}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    paddingAngle={3} dataKey="_count" nameKey="classification"
                    label={(props: { classification?: string; _count?: number; percent?: number }) => `${props.classification || ""} ${Number(props._count || 0).toLocaleString()} (${(((props.percent || 0)) * 100).toFixed(1)}%)`}
                    labelLine={false}
                  >
                    {stats?.byClass?.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.classification === "SAFE" ? "#0ca30c" : entry.classification === "SUSPICIOUS" ? "#fab219" : "#d03b3b"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: unknown) => [Number(value || 0).toLocaleString(), "Scans"]} contentStyle={{ background: 'transparent', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {stats?.byClass?.map(c => (
                <span key={c.classification} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: c.classification === "SAFE" ? "#0ca30c" : c.classification === "SUSPICIOUS" ? "#fab219" : "#d03b3b" }} />
                  <span className="text-sm text-gray-300">{c.classification}: <span className="font-bold text-white">{c._count.toLocaleString()}</span></span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="chart-container">
          <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">🔬 <span className="text-gradient">Scan Type Distribution</span></h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.byType || []} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                <YAxis dataKey="type" type="category" width={80} />
                <Tooltip formatter={(value: unknown) => [Number(value || 0).toLocaleString(), "Scans"]} contentStyle={{ background: 'transparent', border: 'none' }} />
                <Bar dataKey="_count" name="Count" radius={[0, 4, 4, 0]}>
                  {stats?.byType?.map((_, i) => (
                    <Cell key={`bar-${i}`} fill={`url(#type-gradient-${i})`} />
                  ))}
                </Bar>
                <defs>
                  {stats?.byType?.map((_, i) => (
                    <linearGradient key={i} id={`type-gradient-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={["#00ffff", "#8b5cf6", "#ec4899", "#f59e0b"][i % 4]} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={["#00ffff", "#8b5cf6", "#ec4899", "#f59e0b"][i % 4]} stopOpacity={0.2} />
                    </linearGradient>
                  ))}
                </defs>
              </BarChart>
            </ResponsiveContainer>
            </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="chart-container">
          <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">🦠 <span className="text-gradient">Top Threat Categories</span></h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={threatCategories.slice(0, 10)} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={160} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: unknown) => [Number(value || 0).toLocaleString(), "Detections"]} contentStyle={{ background: 'transparent', border: 'none' }} />
                <Bar dataKey="count" name="Detections" radius={[0, 4, 4, 0]} maxBarSize={40}>
                  {threatCategories.slice(0, 10).map((_, i) => (
                    <Cell key={`threat-${i}`} fill={`url(#threat-gradient-${i})`} />
                  ))}
                </Bar>
                <defs>
                  {threatCategories.slice(0, 10).map((_, i) => (
                    <linearGradient key={i} id={`threat-gradient-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#d03b3b" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity={0.3} />
                    </linearGradient>
                  ))}
                </defs>
              </BarChart>
            </ResponsiveContainer>
            </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="chart-container">
        <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">🚨 <span className="text-gradient">Recent Critical Scans</span></h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th><th>User</th><th>Type</th><th>Input</th><th>Score</th><th>Classification</th><th>Category</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentScans?.slice(0, 10).filter((s: ScanRow) => s.classification !== "SAFE").map((s: ScanRow) => (
                <tr key={s.id}>
                  <td className="font-mono text-gray-400">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="text-gray-300">{s.user?.email || "Unknown"}</td>
                  <td><span className="badge border-cyan-400/50 text-cyan-300 bg-cyan-500/10">{s.type}</span></td>
                  <td className="font-mono text-sm text-gray-300 max-w-xs truncate block">{s.input}</td>
                  <td className="font-bold text-lg">{s.riskScore}</td>
                  <td><span className="badge" style={{ borderColor: classColors[s.classification], color: classColors[s.classification], backgroundColor: classColors[s.classification] + "20" }}>{s.classification}</span></td>
                  <td className="text-purple-300 font-mono text-sm">{s.threatCategory || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ title, value, icon, color, trend, trendColor }: { title: string; value: number | string; icon: string; color: string; trend: string; trendColor: string }) {
  const colors: Record<string, string> = { cyan: "#00ffff", red: "#d03b3b", emerald: "#0ca30c", purple: "#8b5cf6" };
  const c = colors[color] || colors.cyan;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card" style={{ "--accent": c } as React.CSSProperties}>
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</p>
          <p className="text-4xl font-bold text-white mt-1 tabular-nums">{value.toLocaleString()}</p>
          <p className="text-xs mt-2 font-medium" style={{ color: colors[trendColor] || c }}>{trend}</p>
        </div>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${c}20`, border: `1px solid ${c}40` }}>{icon}</div>
      </div>
      <div className="absolute bottom-0 right-0 w-24 h-24 opacity-10" style={{ background: `radial-gradient(circle, ${c} 0%, transparent 70%)` }} />
    </motion.div>
  );
}

function UsersTab({
  users,
  onToggle,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  roleFilter,
  setRoleFilter
}: {
  users: UserRow[];
  onToggle: (id: string, active: boolean) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  roleFilter: string;
  setRoleFilter: (s: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="glass-strong rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
          <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-cyber pl-10" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-cyber w-auto">
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
          <option value="PENDING">Pending</option>
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-cyber w-auto">
          <option value="all">All Roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
        <span className="text-gray-400 text-sm self-center mt-2 sm:mt-0">{users.length} agents</span>
      </div>

      <div className="chart-container overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Agent</th><th>Email</th><th>Role</th><th>Status</th><th>Total Scans</th><th>Registered</th><th>Last Login</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: UserRow) => (
              <tr key={u.id}>
                <td className="font-medium text-white">{u.name}</td>
                <td className="text-gray-300">{u.email}</td>
                <td><span className={`badge ${u.role === "ADMIN" ? "border-purple-400/50 text-purple-300 bg-purple-500/10" : "border-gray-500/50 text-gray-300 bg-gray-500/10"}`}>{u.role}</span></td>
                <td><span className={`badge ${u.status === "ACTIVE" ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/10" : u.status === "DISABLED" ? "border-red-400/50 text-red-300 bg-red-500/10" : "border-amber-400/50 text-amber-300 bg-amber-500/10"}`}>{u.status}</span></td>
                <td className="font-mono tabular-nums text-cyan-300">{u.totalScans}</td>
                <td className="text-gray-400 font-mono text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="text-gray-400 font-mono text-sm">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never"}</td>
                <td>
                  <button onClick={() => onToggle(u.id, u.status !== "ACTIVE")} className={`btn-secondary ${u.status === "ACTIVE" ? "btn-danger" : "btn-primary"}`} style={{ padding: "6px 12px", fontSize: "12px" }}>
                    {u.status === "ACTIVE" ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-500">No agents found matching criteria</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScansTab({
  scans,
  scanTypeFilter,
  setScanTypeFilter,
  classificationFilter,
  setClassificationFilter
}: {
  scans: ScanRow[];
  scanTypeFilter: string;
  setScanTypeFilter: (s: string) => void;
  classificationFilter: string;
  setClassificationFilter: (s: string) => void;
}) {
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    scans.forEach((s: ScanRow) => { counts[s.type] = (counts[s.type] || 0) + 1; });
    return counts;
  }, [scans]);

  return (
    <div className="space-y-6">
      <div className="glass-strong rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setScanTypeFilter("all")} className={`tab-btn ${scanTypeFilter === "all" ? "tab-btn-active" : "tab-btn-inactive"}`}>All Types</button>
          {Object.entries(typeCounts).map(([type, count]) => (
            <button key={type} onClick={() => setScanTypeFilter(type)} className={`tab-btn ${scanTypeFilter === type ? "tab-btn-active" : "tab-btn-inactive"}`}>
              {type} <span className="bg-black/30 px-2 py-0.5 rounded text-xs">{count}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          <button onClick={() => setClassificationFilter("all")} className={`tab-btn ${classificationFilter === "all" ? "tab-btn-active" : "tab-btn-inactive"}`}>All Classes</button>
          {["SAFE", "SUSPICIOUS", "MALICIOUS"].map(c => (
            <button key={c} onClick={() => setClassificationFilter(c)} className={`tab-btn ${classificationFilter === c ? "tab-btn-active" : "tab-btn-inactive"}`} style={{ borderColor: classColors[c], color: classColors[c] }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-container overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th><th>User</th><th>Type</th><th>Input</th><th>Risk Score</th><th>Classification</th><th>Threat Category</th><th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((s: ScanRow) => (
              <tr key={s.id}>
                <td className="font-mono text-gray-400 whitespace-nowrap">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="text-gray-300">{s.user?.email || "Unknown"}</td>
                <td><span className="badge border-cyan-400/50 text-cyan-300 bg-cyan-500/10">{s.type}</span></td>
                <td className="font-mono text-sm text-gray-300 max-w-md truncate block">{s.input}</td>
                <td className="font-bold text-lg tabular-nums">{s.riskScore}</td>
                <td><span className="badge" style={{ borderColor: classColors[s.classification], color: classColors[s.classification], backgroundColor: classColors[s.classification] + "20" }}>{s.classification}</span></td>
                <td className="text-purple-300 font-mono text-sm">{s.threatCategory || "—"}</td>
                <td className="text-gray-300">{(s.confidence * 100).toFixed(0)}%</td>
              </tr>
            ))}
            {scans.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-500">No scans match the current filters</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ThreatsTab({ threatCategories, stats }: { threatCategories: ThreatCategoryData[]; stats: StatData | null }) {
  const totalThreats = threatCategories.reduce((a: number, b: ThreatCategoryData) => a + b.count, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Threat Categories" value={threatCategories.length} icon="🦠" color="red" trend={`${totalThreats} total detections`} trendColor="red" />
        <StatCard title="Top Category" value={threatCategories[0]?.count || 0} icon="🎯" color="purple" trend={threatCategories[0]?.category || "None"} trendColor="cyan" />
        <StatCard title="Threat Rate" value={`${((totalThreats / (stats?.totalScans || 1)) * 100).toFixed(1)}%`} icon="📊" color="amber" trend={`${stats?.totalScans || 0} total scans`} trendColor="gray" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="chart-container">
          <h3 className="text-xl font-bold text-cyan-300 mb-4">📊 Threat Category Distribution</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={threatCategories}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={110}
                  paddingAngle={2} dataKey="count" nameKey="category"
                  label={(props: { category?: string; percent?: number }) => `${props.category || ""} (${(((props.percent || 0)) * 100).toFixed(1)}%)`}
                  labelLine={false}
                >
                  {threatCategories.map((_, i: number) => (
                    <Cell key={`threat-pie-${i}`} fill={`hsl(${15 + i * 25}, 70%, 50%)`} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: unknown) => [Number(value || 0).toLocaleString(), "Detections"]} contentStyle={{ background: 'transparent', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="chart-container">
          <h3 className="text-xl font-bold text-cyan-300 mb-4">📈 Top Threat Categories</h3>
          <div className="h-96 space-y-3">
            {threatCategories.slice(0, 12).map((cat: ThreatCategoryData, i: number) => (
              <div key={cat.category} className="group">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300 truncate pr-2">{cat.category}</span>
                  <span className="font-bold text-cyan-300 tabular-nums">{cat.count}</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.count / (threatCategories[0]?.count || 1)) * 100}%` }}
                    transition={{ delay: i * 0.05, duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, #d03b3b, #ec4899)` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="chart-container">
        <h3 className="text-xl font-bold text-cyan-300 mb-4">🔬 Threat Intelligence Details</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Category</th><th>Detections</th><th>Percentage</th><th>Severity</th></tr>
            </thead>
            <tbody>
              {threatCategories.map((cat: ThreatCategoryData, i: number) => (
                <tr key={cat.category}>
                  <td className="font-mono text-purple-300">{cat.category}</td>
                  <td className="tabular-nums text-white">{cat.count}</td>
                  <td className="text-cyan-300 tabular-nums">{((cat.count / (totalThreats || 1)) * 100).toFixed(1)}%</td>
                  <td><span className={`badge ${i < 3 ? "border-red-400/50 text-red-300 bg-red-500/10" : i < 6 ? "border-amber-400/50 text-amber-300 bg-amber-500/10" : "border-cyan-400/50 text-cyan-300 bg-cyan-500/10"}`}>{i < 3 ? "Critical" : i < 6 ? "High" : "Medium"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

interface AuditLogEntry {
  createdAt: string;
  actorEmail?: string;
  action: string;
  targetEmail?: string;
  details?: string;
  ip?: string;
}

function AuditTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit").then(r => r.json()).then(d => { setLogs(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="chart-container h-64 flex items-center justify-center text-gray-500">Loading audit trail...</div>;

  return (
    <div className="chart-container overflow-x-auto">
      <h3 className="text-xl font-bold text-cyan-300 mb-4">📋 System Audit Log</h3>
      <table className="data-table">
        <thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th><th>IP</th></tr></thead>
        <tbody>
          {logs.slice(0, 100).map((log, i) => (
            <tr key={i}>
              <td className="font-mono text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
              <td className="text-gray-300">{log.actorEmail || "System"}</td>
              <td><span className="badge border-cyan-400/50 text-cyan-300 bg-cyan-500/10">{log.action}</span></td>
              <td className="text-gray-300">{log.targetEmail || "—"}</td>
              <td className="text-gray-400 font-mono text-sm max-w-xs truncate block">{log.details || "—"}</td>
              <td className="font-mono text-gray-500">{log.ip || "—"}</td>
            </tr>
          ))}
          {logs.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-500">No audit entries found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}