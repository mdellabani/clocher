"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 p-8">
        <h1 className="text-2xl font-bold">Log in</h1>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-md border px-3 py-2" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-md border px-3 py-2" />
        <button type="submit" disabled={loading} className="w-full rounded-md bg-zinc-900 px-3 py-2 text-white disabled:opacity-50">{loading ? "Logging in..." : "Log in"}</button>
        <p className="text-center text-sm">Don&apos;t have an account? <a href="/auth/signup" className="underline">Sign up</a></p>
      </form>
    </div>
  );
}
