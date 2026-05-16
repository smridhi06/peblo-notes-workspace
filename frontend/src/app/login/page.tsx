"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await auth.login(form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      router.push("/notes");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--cream)" }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-16"
        style={{ background: "var(--ink-dark)" }}>
        <div>
          <h1 className="font-display text-5xl text-white leading-tight">Peblo</h1>
          <p className="mt-3 text-sm" style={{ color: "#bca48e" }}>Your AI-powered notes workspace</p>
        </div>
        <div className="space-y-6">
          {["Capture ideas instantly", "AI summaries & action items", "Share notes publicly"].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--rust)" }} />
              <p className="text-sm" style={{ color: "#d4c3b0" }}>{f}</p>
            </div>
          ))}
        </div>
        <p className="text-xs" style={{ color: "#533e36" }}>© 2026 Peblo</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-3xl mb-1" style={{ color: "var(--ink-dark)" }}>Welcome back</h2>
          <p className="text-sm mb-8" style={{ color: "#a08570" }}>Sign in to your workspace</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-mid)" }}>Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg text-sm border outline-none transition-all"
                style={{ background: "var(--parchment)", borderColor: "#d4c3b0",
                  color: "var(--ink-dark)" }}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-mid)" }}>Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 rounded-lg text-sm border outline-none"
                style={{ background: "var(--parchment)", borderColor: "#d4c3b0",
                  color: "var(--ink-dark)" }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-xs p-3 rounded-lg" style={{ background: "#fde8e0", color: "var(--rust)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-medium text-white transition-all"
              style={{ background: loading ? "#a08570" : "var(--ink-dark)" }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "#a08570" }}>
            No account?{" "}
            <Link href="/signup" className="font-medium" style={{ color: "var(--rust)" }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
