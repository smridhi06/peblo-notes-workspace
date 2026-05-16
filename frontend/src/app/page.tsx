"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("token");
    router.replace(token ? "/notes" : "/login");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
      <div className="text-center">
        <h1 className="font-display text-4xl" style={{ color: "var(--ink-dark)" }}>Peblo</h1>
        <p className="mt-2 text-sm" style={{ color: "#a08570" }}>Loading your workspace...</p>
      </div>
    </div>
  );
}
