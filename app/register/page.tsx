"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../login/login.module.css";
import { UserPlus, Loader2, ArrowLeft } from "lucide-react";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Automatically sign in after registration
        const loginRes = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (loginRes?.ok) {
          router.push("/onboarding");
        } else {
          router.push("/login");
        }
      } else {
        setError(data.error || "Failed to register");
        setLoading(false);
      }
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <button onClick={() => router.push("/login")} className={styles.backButton}>
        <ArrowLeft size={16} /> Back to Login
      </button>

      <div className={styles.gridBackground}></div>
      <div className={`${styles.blob} ${styles.blob1}`}></div>
      <div className={`${styles.blob} ${styles.blob2}`}></div>

      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.logo}>HUNTR</div>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Join the automated career revolution</p>
        </div>

        <form onSubmit={handleRegister} className={styles.form}>
          {error && <div className="text-red-500 text-xs font-mono text-center p-2 bg-red-50 rounded-lg border border-red-100">{error}</div>}
          
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className={styles.premiumInput || "w-full p-4 bg-white/50 border border-[var(--border-color)] rounded-xl outline-none focus:border-[var(--accent-main)] transition-all"}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Secure Password</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={styles.premiumInput || "w-full p-4 bg-white/50 border border-[var(--border-color)] rounded-xl outline-none focus:border-[var(--accent-main)] transition-all"}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
            Sign Up for Huntr
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account? <button onClick={() => router.push("/login")} className="text-[var(--accent-main)] font-bold hover:underline">Sign In</button>
        </p>
      </div>
    </main>
  );
}
