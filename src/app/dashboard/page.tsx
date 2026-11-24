"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ScannerTabs } from "@/components/ScannerTabs";
import { ThreatRadar, type ThreatEvent } from "@/components/ThreatRadar";
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

interface ScanRow {
  id: string;
  input: string;
  type: string;
  riskScore: number;
  classification: string;
  threatCategory: string | null;
  confidence: number;
  createdAt: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  totalScans: number;
  createdAt: string;
  lastLogin: string | null;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"scanner" | "history" | "analytics">("scanner");
  const [filterType, setFilterType] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      Promise.all([
        fetch("/api/user/me").then(r => r.ok ? r.json() : null),
        fetch("/api/user/scans").then(r => r.ok ? r.json() : []),
      ]).then(([u, s]) => {
        if (u) setUserData(u);
        setScans(Array.isArray(s) ? s : s?.scans || []);
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  const filteredScans = useMemo(() => scans.filter(s => {
    const q = searchQuery.toLowerCase();
    return (filterType === "all" || s.type === filterType) &&
           (filterClass === "all" || s.classification === filterClass) &&
           (s.input.toLowerCase().includes(q) || s.type.toLowerCase().includes(q));
  }), [scans, filterType, filterClass, searchQuery]);

  const [dailyStats, setDailyStats] = useState<{ date: string; scans: number; threats: number }[]>([]);

  // Compute daily stats whenever scans change
  useEffect(() => {
    const byDate = new Map<string, { scans: number; threats: number }>();
    const today = new Date().toISOString().split("T")[0];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      byDate.set(d.toISOString().split("T")[0], { scans: 0, threats: 0 });
    }
    scans.forEach(s => {
      const key = s.createdAt.split("T")[0];
      const entry = byDate.get(key) || { scans: 0, threats: 0 };
      entry.scans++;
      if (s.classification !== "SAFE") entry.threats++;
      byDate.set(key, entry);
    });
    const result = Array.from(byDate.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
    setDailyStats(result);
  }, [scans]);

  const stats = useMemo(() => {
    const total = scans.length;
    const safe = scans.filter(s => s.classification === "SAFE").length;
    const suspicious = scans.filter(s => s.classification === "SUSPICIOUS").length;
    const malicious = scans.filter(s => s.classification === "MALICIOUS").length;
    const byType = scans.reduce((acc: Record<string, number>, s) => { acc[s.type] = (acc[s.type] || 0) + 1; return acc; }, {});
    const categories = new Map<string, number>();
    scans.filter(s => s.threatCategory).forEach(s => categories.set(s.threatCategory!, (categories.get(s.threatCategory!) || 0) + 1));
    const threatCats = Array.from(categories.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
    return { total, safe, suspicious, malicious, byType, daily: dailyStats, threatCats };
  }, [scans, dailyStats]);

  const radarThreats: ThreatEvent[] = useMemo(() => {
    return scans.filter(s => s.classification !== "SAFE").slice(0, 12).map((s, i) => {
      const sev = s.classification === "MALICIOUS" ? (s.riskScore >= 80 ? "critical" : "high") : "medium";
      return {
        id: s.id,
        angle: (i * 30) % 360,
        distance: 0.2 + (s.riskScore / 100) * 0.7,
        severity: sev as ThreatEvent["severity"],
        type: s.type,
        source: s.threatCategory || "Scan",
        timestamp: new Date(s.createdAt).getTime(),
        label: s.input.slice(0, 20),
      };
    });
  }, [scans]);

  const classColors: Record<string, string> = { SAFE: "#10b981", SUSPICIOUS: "#f59e0b", MALICIOUS: "#ef4444" };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4 text-cyan-400">
        <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-sm tracking-wider uppercase text-cyan-300">Synchronizing Command Center Telemetry...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <div className="fixed inset-0 z-0 grid-bg" />
      <main className="relative z-10 px-4 md:px-8 lg:px-12 py-8 max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gradient tracking-tight">Welcome, {userData?.name || session?.user?.name || "Agent"}</h1>
            <p className="text-cyan-400/70 mt-1 font-mono text-sm">
              THREATLY Command Center | {userData?.email || session?.user?.email} {userData?.lastLogin ? `• Last login: ${new Date(userData.lastLogin).toLocaleDateString()}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-mono text-sm">PROTECTED</span>
            </div>
          </div>
        </header>

        <nav className="mb-8" role="tablist" aria-label="User sections">
          <div className="flex flex-wrap gap-2 glass rounded-xl p-2">
            {([
              { id: "scanner", label: "Scanner", icon: "🔍" },
              { id: "history", label: "Scan History", icon: "📜" },
              { id: "analytics", label: "Analytics & Telemetry", icon: "📊" },
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
          {activeTab === "scanner" && (
            <motion.div key="scanner" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="Total Scans" value={stats.total} icon="🔍" color="cyan" />
                <StatCard title="Safe" value={stats.safe} icon="✅" color="emerald" />
                <StatCard title="Suspicious" value={stats.suspicious} icon="⚠️" color="amber" />
                <StatCard title="Malicious" value={stats.malicious} icon="🚨" color="red" />
              </div>
              <ScannerTabs />
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <div className="glass-strong rounded-2xl p-4 flex flex-col sm:flex-row gap-4 mb-6">
                <input type="text" placeholder="Search scans..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-cyber flex-1" />
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-cyber w-auto">
                  <option value="all">All Types</option>
                  <option value="URL">URL</option>
                  <option value="QR">QR</option>
                  <option value="MESSAGE">Message</option>
                  <option value="EMAIL">Email</option>
                </select>
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="input-cyber w-auto">
                  <option value="all">All Classes</option>
                  <option value="SAFE">Safe</option>
                  <option value="SUSPICIOUS">Suspicious</option>
                  <option value="MALICIOUS">Malicious</option>
                </select>
              </div>
              <div className="chart-container overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>Timestamp</th><th>Type</th><th>Input</th><th>Risk Score</th><th>Classification</th><th>Category</th><th>Confidence</th></tr>
                  </thead>
                  <tbody>
                    {filteredScans.map(s => (
                      <tr key={s.id}>
                        <td className="font-mono text-gray-400 whitespace-nowrap">{new Date(s.createdAt).toLocaleString()}</td>
                        <td><span className="badge border-cyan-400/50 text-cyan-300 bg-cyan-500/10">{s.type}</span></td>
                        <td className="font-mono text-sm text-gray-300 max-w-md truncate block">{s.input}</td>
                        <td className="font-bold text-lg tabular-nums">{s.riskScore}</td>
                        <td><span className="badge" style={{ borderColor: classColors[s.classification] || "#10b981", color: classColors[s.classification] || "#10b981", backgroundColor: (classColors[s.classification] || "#10b981") + "20" }}>{s.classification}</span></td>
                        <td className="text-purple-300 font-mono text-sm">{s.threatCategory || "—"}</td>
                        <td className="text-gray-300">{(s.confidence * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                    {filteredScans.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-500">No scans found</td></tr>}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
              {/* Threat Radar Section - Clean Flexbox Layout with No Overlap */}
              <div className="chart-container flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-shrink-0 flex justify-center w-full lg:w-auto">
                  <ThreatRadar size={300} realThreats={radarThreats} title="ACTIVE THREAT RADAR" />
                </div>
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <h3 className="text-2xl font-bold text-white tracking-tight">Telemetry & Risk Landscape</h3>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Live visualization of threats detected across your scan telemetry. Multi-layer heuristic engines evaluate domain reputation, quishing vectors, smishing signals, and email authentication alignment.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="glass rounded-xl p-4 text-center">
                      <p className="text-3xl font-extrabold text-cyan-300 tabular-nums">{stats.total}</p>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wider mt-1 font-mono">Total Scans</p>
                    </div>
                    <div className="glass rounded-xl p-4 text-center">
                      <p className="text-3xl font-extrabold text-red-400 tabular-nums">{stats.malicious}</p>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wider mt-1 font-mono">Malicious</p>
                    </div>
                    <div className="glass rounded-xl p-4 text-center">
                      <p className="text-3xl font-extrabold text-amber-400 tabular-nums">{stats.suspicious}</p>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wider mt-1 font-mono">Suspicious</p>
                    </div>
                    <div className="glass rounded-xl p-4 text-center">
                      <p className="text-3xl font-extrabold text-emerald-400 tabular-nums">{stats.safe}</p>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wider mt-1 font-mono">Safe</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Scan Activity Area Chart */}
                <div className="chart-container">
                  <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
                    <span>📈</span>
                    <span>Scan Activity (30 Days)</span>
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.daily} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="u-scans" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00ffff" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#00ffff" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="u-threats" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(d: string | number) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          interval="preserveStartEnd"
                          tickCount={8}
                          stroke="#6b7280"
                          tick={{ fill: "#9ca3af", fontSize: 11 }}
                        />
                        <YAxis allowDecimals={false} stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                        <Tooltip
                          labelFormatter={(label) => label ? new Date(String(label)).toLocaleDateString() : ""}
                          contentStyle={{ background: "#0a0f1e", border: "1px solid rgba(0,255,255,0.2)", borderRadius: "8px" }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "10px" }} />
                        <Area type="monotone" dataKey="scans" name="Total Scans" stroke="#00ffff" strokeWidth={2} fillOpacity={1} fill="url(#u-scans)" />
                        <Area type="monotone" dataKey="threats" name="Threats" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#u-threats)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Doughnut Classification Breakdown - No Overlapping 0-Labels */}
                <div className="chart-container">
                  <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
                    <span>🎯</span>
                    <span>Classification Breakdown</span>
                  </h3>
                  <div className="h-80 relative flex items-center justify-center">
                    {stats.total === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center p-6">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl mb-3">
                          🎯
                        </div>
                        <p className="text-gray-300 font-bold text-sm">No Scans Recorded</p>
                        <p className="text-gray-500 text-xs mt-1">Execute a scan to generate threat classification metrics</p>
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Safe", value: stats.safe, color: "#10b981" },
                                { name: "Suspicious", value: stats.suspicious, color: "#f59e0b" },
                                { name: "Malicious", value: stats.malicious, color: "#ef4444" },
                              ].filter(d => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={68}
                              outerRadius={96}
                              paddingAngle={stats.total > (stats.safe || 0) && (stats.suspicious > 0 || stats.malicious > 0) ? 3 : 0}
                              dataKey="value"
                              nameKey="name"
                              label={(props: { name?: string; value?: number; percent?: number }) =>
                                (props.value || 0) > 0 ? `${props.name} ${props.value} (${(((props.percent || 0)) * 100).toFixed(0)}%)` : ""
                              }
                              labelLine={false}
                            >
                              {[
                                { name: "Safe", value: stats.safe, color: "#10b981" },
                                { name: "Suspicious", value: stats.suspicious, color: "#f59e0b" },
                                { name: "Malicious", value: stats.malicious, color: "#ef4444" },
                              ].filter(d => d.value > 0).map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: unknown) => [Number(value || 0).toLocaleString(), "Scans"]}
                              contentStyle={{ background: "#0a0f1e", border: "1px solid rgba(0,255,255,0.2)", borderRadius: "8px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center Doughnut Summary Label */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                          <p className="text-3xl font-extrabold text-white tabular-nums">{stats.total}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">TOTAL</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Second Chart Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Scan Type Distribution */}
                <div className="chart-container">
                  <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
                    <span>🔬</span>
                    <span>Scan Type Distribution</span>
                  </h3>
                  <div className="h-80">
                    {stats.total === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl mb-3">
                          🔬
                        </div>
                        <p className="text-gray-300 font-bold text-sm">No Scan Types Recorded</p>
                        <p className="text-gray-500 text-xs mt-1">Scan URLs, QR codes, messages, or emails</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(stats.byType).map(([name, value]) => ({ name, value }))}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                          <XAxis type="number" allowDecimals={false} stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" width={80} stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: unknown) => [Number(value || 0).toLocaleString(), "Scans"]}
                            contentStyle={{ background: "#0a0f1e", border: "1px solid rgba(0,255,255,0.2)", borderRadius: "8px" }}
                          />
                          <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} maxBarSize={36}>
                            {Object.entries(stats.byType).map((_, i) => (
                              <Cell key={`bar-${i}`} fill={["#00ffff", "#8b5cf6", "#ec4899", "#f59e0b"][i % 4]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Top Threat Categories */}
                <div className="chart-container">
                  <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
                    <span>🦠</span>
                    <span>Top Threat Categories</span>
                  </h3>
                  <div className="h-80 space-y-3 overflow-y-auto">
                    {stats.threatCats.slice(0, 10).map((cat: { category: string; count: number }, i: number) => (
                      <div key={cat.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300 truncate pr-2">{cat.category}</span>
                          <span className="font-bold text-cyan-300 tabular-nums">{cat.count}</span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(cat.count / (stats.threatCats[0]?.count || 1)) * 100}%` }}
                            transition={{ delay: i * 0.05, duration: 0.8 }}
                            className="h-full rounded-full"
                            style={{ background: "linear-gradient(90deg, #ef4444, #ec4899)" }}
                          />
                        </div>
                      </div>
                    ))}
                    {stats.threatCats.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl mb-3">
                          🛡️
                        </div>
                        <p className="text-emerald-400 font-bold text-sm">Clean Environment</p>
                        <p className="text-gray-500 text-xs mt-1">No malicious categories detected across your telemetry</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: string; color: string }) {
  const colors: Record<string, string> = { cyan: "#00ffff", red: "#ef4444", emerald: "#10b981", amber: "#f59e0b", purple: "#8b5cf6" };
  const c = colors[color] || colors.cyan;
  return (
    <div className="stat-card">
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-extrabold text-white mt-1 tabular-nums">{Number(value).toLocaleString()}</p>
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: `${c}20`, border: `1px solid ${c}40` }}>{icon}</div>
      </div>
      <div className="absolute bottom-0 right-0 w-24 h-24 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle, ${c} 0%, transparent 70%)` }} />
    </div>
  );
}
