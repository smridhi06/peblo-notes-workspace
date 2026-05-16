"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await auth.signup(form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      router.push("/notes");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "var(--cream)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="font-display text-4xl" style={{ color: "var(--ink-dark)" }}>Peblo</h1>
          <p className="mt-1 text-sm" style={{ color: "#a08570" }}>Create your workspace</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {[
            { key: "name", label: "Full name", type: "text", placeholder: "Jane Doe" },
            { key: "email", label: "Email", type: "email", placeholder: "jane@example.com" },
            { key: "password", label: "Password", type: "password", placeholder: "Min 8 characters" },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-mid)" }}>
                {label}
              </label>
              <input
                type={type}
                required
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full px-4 py-3 rounded-lg text-sm border outline-none"
                style={{ background: "var(--parchment)", borderColor: "#d4c3b0", color: "var(--ink-dark)" }}
                placeholder={placeholder}
              />
            </div>
          ))}

          {error && (
            <div className="text-xs p-3 rounded-lg" style={{ background: "#fde8e0", color: "var(--rust)" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-medium text-white"
            style={{ background: loading ? "#a08570" : "var(--ink-dark)" }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "#a08570" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-medium" style={{ color: "var(--rust)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
