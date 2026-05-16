"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { insightsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    insightsApi.get()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
      <p style={{ color: "#a08570" }}>Loading insights...</p>
    </div>
  );

  const maxActivity = Math.max(...(data?.weekly_activity?.map((d: any) => d.count) || [1]));

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)" }}>
      {/* Header */}
      <div className="border-b px-8 py-4 flex items-center justify-between"
        style={{ borderColor: "#d4c3b0", background: "var(--parchment)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/notes")}
            className="text-sm" style={{ color: "var(--ink-mid)" }}>← Back</button>
          <h1 className="font-display text-xl" style={{ color: "var(--ink-dark)" }}>Dashboard</h1>
        </div>
        <p className="text-sm" style={{ color: "#a08570" }}>Hello, {user?.name}</p>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total notes", value: data?.total_notes || 0, icon: "📝" },
            { label: "This week", value: data?.notes_this_week || 0, icon: "📅" },
            { label: "Archived", value: data?.archived_notes || 0, icon: "📦" },
            { label: "AI calls", value: data?.ai_stats?.total_ai_calls || 0, icon: "✨" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="p-5 rounded-xl border"
              style={{ background: "var(--parchment)", borderColor: "#d4c3b0" }}>
              <p className="text-2xl mb-1">{icon}</p>
              <p className="font-display text-3xl" style={{ color: "var(--ink-dark)" }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: "#a08570" }}>{label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Weekly activity */}
          <div className="p-6 rounded-xl border" style={{ background: "var(--parchment)", borderColor: "#d4c3b0" }}>
            <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink-dark)" }}>Weekly activity</h3>
            {data?.weekly_activity?.length > 0 ? (
              <div className="flex items-end gap-2 h-24">
                {data.weekly_activity.map((d: any) => (
                  <div key={d.day} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full rounded-t transition-all"
                      style={{
                        height: `${(d.count / maxActivity) * 80}px`,
                        background: "var(--rust)",
                        minHeight: "4px",
                      }} />
                    <p className="text-xs" style={{ color: "#bca48e" }}>
                      {new Date(d.day).toLocaleDateString("en", { weekday: "short" }).slice(0, 1)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "#bca48e" }}>No activity this week yet</p>
            )}
          </div>

          {/* Top tags */}
          <div className="p-6 rounded-xl border" style={{ background: "var(--parchment)", borderColor: "#d4c3b0" }}>
            <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink-dark)" }}>Top tags</h3>
            {data?.top_tags?.length > 0 ? (
              <div className="space-y-2">
                {data.top_tags.slice(0, 6).map((t: any) => (
                  <div key={t.name} className="flex items-center justify-between">
                    <span className="tag-pill">{t.name}</span>
                    <div className="flex items-center gap-2 flex-1 ml-3">
                      <div className="flex-1 rounded-full h-1.5" style={{ background: "#e8ddd2" }}>
                        <div className="h-full rounded-full" style={{
                          width: `${(t.count / data.top_tags[0].count) * 100}%`,
                          background: "var(--sage)"
                        }} />
                      </div>
                      <span className="text-xs" style={{ color: "#a08570" }}>{t.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "#bca48e" }}>No tags yet</p>
            )}
          </div>
        </div>

        {/* Recent notes */}
        <div className="p-6 rounded-xl border" style={{ background: "var(--parchment)", borderColor: "#d4c3b0" }}>
          <h3 className="font-display text-lg mb-4" style={{ color: "var(--ink-dark)" }}>Recently edited</h3>
          {data?.recently_edited?.length > 0 ? (
            <div className="space-y-3">
              {data.recently_edited.map((n: any) => (
                <div key={n.id} className="flex items-center justify-between py-2 border-b"
                  style={{ borderColor: "#e8ddd2" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--ink-dark)" }}>
                    {n.title || "Untitled"}
                  </p>
                  <p className="text-xs" style={{ color: "#bca48e" }}>
                    {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "#bca48e" }}>No notes yet</p>
          )}
        </div>

        {/* AI stats */}
        <div className="p-6 rounded-xl border" style={{ background: "var(--parchment)", borderColor: "#d4c3b0" }}>
          <h3 className="font-display text-lg mb-3" style={{ color: "var(--ink-dark)" }}>✨ AI Usage</h3>
          <div className="flex gap-8">
            <div>
              <p className="font-display text-2xl" style={{ color: "var(--rust)" }}>
                {data?.ai_stats?.notes_with_ai || 0}
              </p>
              <p className="text-xs mt-1" style={{ color: "#a08570" }}>Notes with AI summaries</p>
            </div>
            <div>
              <p className="font-display text-2xl" style={{ color: "var(--rust)" }}>
                {data?.ai_stats?.total_ai_calls || 0}
              </p>
              <p className="text-xs mt-1" style={{ color: "#a08570" }}>Total AI calls</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
