"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import styles from "./login.module.css";
import { LogIn, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    setLoading("google");
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("credentials");
    await signIn("credentials", {
      email: "test@example.com",
      password: "password",
      callbackUrl: "/dashboard",
    });
  };

  return (
    <main className={styles.container}>
      <div className={styles.gridBackground}></div>
      <div className={styles.blob}></div>

      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.logo}>HUNTR</div>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Sign in to access your dashboard</p>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.providerButton}
            onClick={handleGoogleLogin}
            disabled={!!loading}
          >
            {loading === "google" ? <Loader2 className="animate-spin" /> : <Mail size={20} />}
            Continue with Google
          </button>

          <div className={styles.divider}>
            <span>OR TEST ACCESS</span>
          </div>

          <form onSubmit={handleTestLogin} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Email</label>
              <input type="email" value="test@example.com" disabled />
            </div>
            <div className={styles.inputGroup}>
              <label>Password</label>
              <input type="password" value="password" disabled />
            </div>
            <button 
              type="submit" 
              className={styles.loginButton}
              disabled={!!loading}
            >
              {loading === "credentials" ? <Loader2 className="animate-spin" /> : <LogIn size={20} />}
              Login to Sandbox
            </button>
          </form>
        </div>

        <p className={styles.footer}>
          Your data is encrypted and secure.
        </p>
      </div>
    </main>
  );
}
