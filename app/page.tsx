"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Search, Zap, FileJson, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import styles from "./page.module.css";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  return (
    <main className={styles.container}>
      <header className={styles.topNav}>
        <div className={styles.logo}>HUNTR</div>
        <div className={styles.navActions}>
          {status === "authenticated" ? (
            <div className={styles.userMenu}>
              <span className={styles.userEmail}>{session.user?.email}</span>
              <button onClick={() => router.push("/dashboard")} className={styles.dashboardLink}>Dashboard</button>
              <button onClick={() => signOut()} className={styles.logoutIcon} title="Sign Out">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button onClick={() => router.push("/login")} className={styles.signInButton}>Sign In</button>
          )}
        </div>
      </header>

      <div className={styles.gridBackground}></div>
      <div className={styles.blob + " " + styles.blob1}></div>
      <div className={styles.blob + " " + styles.blob2}></div>

      <div className={styles.content}>
        <section className={styles.hero}>
          <h1 className={styles.title}>
            Your Job Search, <span className="text-gradient">Automated</span>
          </h1>
          <p className={styles.subtitle}>
            Stop wasting hours searching and applying. Let our AI find your perfect matches and optimize your resume for every single one.
          </p>
          <div className={styles.ctaContainer}>
            <button 
              className={styles.getStartedBtn}
              onClick={() => router.push(status === "authenticated" ? "/onboarding" : "/login")}
            >
              Get Started for Free <ArrowRight size={20} />
            </button>
            <button 
              className={styles.secondaryBtn}
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              How it Works
            </button>
          </div>
        </section>

        <section className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <Search className={styles.featureIcon} />
            <h3 className={styles.featureTitle}>Deep Scan</h3>
            <p className={styles.featureText}>
              We scan thousands of job boards and company sites to find roles that actually match your experience.
            </p>
          </div>
          <div className={styles.featureCard}>
            <Zap className={styles.featureIcon} />
            <h3 className={styles.featureTitle}>Instant Match</h3>
            <p className={styles.featureText}>
              Our AI scores every job against your resume, showing you exactly where you stand before you apply.
            </p>
          </div>
          <div className={styles.featureCard}>
            <FileJson className={styles.featureIcon} />
            <h3 className={styles.featureTitle}>Auto-Optimize</h3>
            <p className={styles.featureText}>
              Automatically rewrite your resume bullets to highlight the exact skills each job description is looking for.
            </p>
          </div>
        </section>

        <section id="how-it-works" className={styles.stepsSection}>
          <h2 className={styles.sectionTitle}>The Path to Your Next Role</h2>
          <div className={styles.stepsContainer}>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>01</div>
              <h4 className={styles.stepTitle}>Upload Resume</h4>
              <p className={styles.stepText}>Tell us who you are. Our AI parses your entire history in seconds.</p>
            </div>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>02</div>
              <h4 className={styles.stepTitle}>AI Matching</h4>
              <p className={styles.stepText}>We find the best roles matching your target title and location.</p>
            </div>
            <div className={styles.stepItem}>
              <div className={styles.stepNumber}>03</div>
              <h4 className={styles.stepTitle}>Land the Job</h4>
              <p className={styles.stepText}>Apply with optimized resumes that get past the ATS every time.</p>
            </div>
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerItem}>© 2026 HUNTR AI</div>
        <div className={styles.footerItem}>Designed for High-Performance Job Seekers</div>
        <div className={styles.footerItem}>[ Build 0.1.0-alpha ]</div>
      </footer>
    </main>
  );
}
