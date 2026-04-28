"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, Briefcase, FileText, Search, Loader2, Download, Zap, Power } from "lucide-react";
import { motion } from "framer-motion";
import styles from "./dashboard.module.css";

const Typewriter = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.05, delay }}
    >
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0, delay: delay + i * 0.05 }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
};

const CircularProgress = ({ score }: { score: number }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={styles.progressContainer}>
      <svg className={styles.progressSvg} viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="var(--border-color)"
          strokeWidth="3"
          fill="transparent"
        />
        <motion.circle
          cx="24"
          cy="24"
          r={radius}
          stroke={score > 80 ? "var(--success)" : score > 60 ? "var(--accent-main)" : "var(--warning)"}
          strokeWidth="3"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, type: "spring", stiffness: 50, damping: 15, delay: 0.5 }}
          strokeLinecap="round"
        />
      </svg>
      <span className={styles.progressText}>
        <Typewriter text={`${score}%`} delay={1} />
      </span>
    </div>
  );
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`skeleton ${className}`} />
);

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  applyLink: string;
  matchScore: number | null;
  isSaved: boolean;
  isDeleted: boolean;
  Application?: Application[];
}

interface Application {
  id: string;
  status: string;
  job: Job;
}

/**
 * DashboardContent
 * NOTE: Security - This MVP uses profileId in the URL for session tracking.
 * In a production environment, this should be replaced with robust authentication 
 * (e.g., Clerk, NextAuth) to prevent IDOR vulnerabilities.
 */
function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepProgress, setSweepProgress] = useState(0);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [jobListTab, setJobListTab] = useState("matched");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const itemsPerPage = 5;

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  useEffect(() => {
    const fetchJobs = async (silent = false) => {
      if (status !== "authenticated") return;
      if (!silent) setIsLoadingJobs(true);
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        if (data.noProfile) {
          router.push("/");
          return;
        }
        setJobs(data.jobs);
        setApplications(data.applications);
      }
      if (!silent) setIsLoadingJobs(false);
    };

    fetchJobs();
  }, [status]);

  const refreshJobs = async (silent = false) => {
    if (status !== "authenticated") return;
    if (!silent) setIsLoadingJobs(true);
    const res = await fetch("/api/jobs");
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs);
      setApplications(data.applications);
    }
    if (!silent) setIsLoadingJobs(false);
  };

  const handleSweep = async () => {
    if (status !== "authenticated") return alert("Session missing");
    setIsSweeping(true);
    setSweepProgress(0);

    // Simulated progress bar for 5 seconds
    const interval = setInterval(() => {
      setSweepProgress(prev => Math.min(prev + 2, 95));
    }, 100);

    try {
      const res = await fetch("/api/jobs/sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      clearInterval(interval);
      setSweepProgress(100);
      setTimeout(() => {
        setIsSweeping(false);
        setSweepProgress(0);
      }, 500);

      if (res.ok) {
        await refreshJobs(true);
      } else {
        alert("Failed to sweep jobs");
      }
    } catch {
      clearInterval(interval);
      setIsSweeping(false);
      alert("Error scanning for jobs");
    }
  };

  const handleSaveJob = async (jobId: string, isSaved: boolean) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSaved })
      });
      if (res.ok) refreshJobs(true);
    } catch {
      console.error("Failed to update save status");
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true })
      });
      if (res.ok) refreshJobs(true);
    } catch {
      console.error("Failed to delete job");
    }
  };


  const handleRewrite = async (jobId: string) => {
    if (status !== "authenticated") {
      console.error("Missing session for rewriting");
      alert("Please upload a resume first.");
      return;
    }
    setLoadingAction(`rewrite-${jobId}`);
    try {
      const res = await fetch("/api/resume/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId })
      });
      if (res.ok) {
        await refreshJobs(true);
      } else {
        const errorData = await res.json();
        console.error("Rewrite failed:", errorData.error);
        alert(`Rewrite failed: ${errorData.error}`);
      }
    } catch (err: unknown) {
      console.error("Network error during rewrite:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDownload = (appId: string) => {
    window.open(`/api/resume/download?applicationId=${appId}`, "_blank");
  };

  const handleUpdateStatus = async (applicationId: string, status: string) => {
    setLoadingAction(`status-${applicationId}`);
    try {
      const res = await fetch("/api/applications/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, status })
      });
      if (res.ok) {
        await refreshJobs(true);
      } else {
        console.error("Failed to update status");
      }
    } catch (err: unknown) {
      console.error("Network error updating status:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  const statuses = ["NOT_APPLIED", "PENDING", "INTERVIEWING", "OFFER", "REJECTED"];
  const [draggedOverStatus, setDraggedOverStatus] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData("appId", appId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDraggedOverStatus(null);
    const appId = e.dataTransfer.getData("appId");
    if (appId) {
      await handleUpdateStatus(appId, newStatus);
    }
  };

  return (
    <div className={styles.layout}>
      <div className="terminal-grid" />
      <div className="scanline" />
      
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          HUNTR
        </div>
        <nav>
          <div
            className={`${styles.navItem} ${activeTab === "dashboard" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard size={18} /> Overview
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "applications" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("applications")}
          >
            <Briefcase size={18} /> Applications
          </div>
          <div
            className={styles.navItem}
            onClick={handleLogout}
          >
            <Power size={18} /> Log Out
          </div>
          {/* 
          <div
            className={`${styles.navItem} ${activeTab === "resumes" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("resumes")}
          >
            <FolderArchive size={18} /> Archive
          </div>
          */}
        </nav>

        <div className="mt-auto pt-10 border-t border-[var(--border-color)]">
          <div className={styles.systemStatus}>
            <div className={styles.statusDot} style={{ background: 'var(--success)' }}></div>
            <Typewriter text={session?.user?.email || "System Online"} delay={2} />
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        {activeTab === "dashboard" && (
          <>
            <header className={styles.header}>
              <div>
                <div className="text-[10px] font-mono text-[var(--accent-main)] uppercase tracking-[0.2em] mb-2">Dashboard / Overview</div>
                <h1 className={styles.headerTitle}>Overview</h1>
              </div>
              <div className="flex flex-col items-end gap-4">
                <button 
                  className="btn-accent"
                  onClick={handleSweep}
                  disabled={isSweeping || status !== "authenticated"}
                >
                  {isSweeping ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  SYNC MARKET FEED
                </button>
                {isSweeping && (
                  <div className={styles.progressBarContainer}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${sweepProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </header>

            <motion.div 
              className={styles.statsGrid}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1, delayChildren: 0.3 }
                }
              }}
            >
              <motion.div 
                className={styles.statCard}
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 20 } }
                }}
              >
                <div className={styles.statLabel}>Target Jobs</div>
                <div className={styles.statValue}>{jobs.length.toString().padStart(2, '0')}</div>
              </motion.div>
              <motion.div 
                className={styles.statCard}
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 20 } }
                }}
              >
                <div className={styles.statLabel}>Active Ops</div>
                <div className={styles.statValue}>{applications.length.toString().padStart(2, '0')}</div>
              </motion.div>
              <motion.div 
                className={styles.statCard}
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 20 } }
                }}
              >
                <div className={styles.statLabel}>Engagements</div>
                <div className={styles.statValue}>
                  {applications.filter(a => a.status === "INTERVIEWING").length.toString().padStart(2, '0')}
                </div>
              </motion.div>
            </motion.div>

            <div className={styles.bentoGrid}>
              <div className={styles.jobsList}>
                <div className={styles.sectionTitle}>
                  <div className="flex gap-2">
                    <span
                      className={`${styles.tabLabel} ${jobListTab === "matched" ? styles.tabActive : ""}`}
                      onClick={() => { setJobListTab("matched"); setCurrentPage(1); }}
                    >
                      MATCHED FEED
                    </span>
                    <span
                      className={`${styles.tabLabel} ${jobListTab === "saved" ? styles.tabActive : ""}`}
                      onClick={() => { setJobListTab("saved"); setCurrentPage(1); }}
                    >
                      BOOKMARKED
                    </span>
                  </div>
                  <div className={styles.jobCountBadge}>
                    [{jobs.filter(j => jobListTab === "matched" ? !j.isSaved : j.isSaved).length}] TOTAL RECORDS
                  </div>
                </div>

                {(() => {
                  const filteredJobs = jobs
                    .filter(j => jobListTab === "matched" ? !j.isSaved : j.isSaved)
                    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
                  
                  if (isLoadingJobs) {
                    return (
                      <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={styles.jobItem} style={{ opacity: 1 - (i * 0.2) }}>
                            <div className={styles.jobHeader}>
                              <div className={styles.jobInfo}>
                                <Skeleton className="h-6 w-3/4 mb-3" />
                                <Skeleton className="h-4 w-1/2" />
                              </div>
                              <div className="flex gap-4">
                                <Skeleton className="w-12 h-12 rounded-full" />
                                <div className="flex gap-2">
                                  <Skeleton className="w-8 h-8 rounded-lg" />
                                  <Skeleton className="w-8 h-8 rounded-lg" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-2/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  if (filteredJobs.length === 0) {
                    return (
                      <div className="text-center py-20 border border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)] font-mono text-sm">
                        {jobListTab === "matched" ? "NO DATA FOUND" : "NO SAVED RECORDS"}
                      </div>
                    );
                  }

                  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
                  const displayedJobs = filteredJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                  return (
                    <div className="space-y-8">
                      <motion.div 
                        className="space-y-6"
                        initial="hidden"
                        animate="visible"
                        variants={{
                          hidden: { opacity: 0 },
                          visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.1 }
                          }
                        }}
                      >
                        {displayedJobs.map((job, index) => {
                          const app = job.Application?.[0];
                          return (
                            <motion.div 
                              key={job.id} 
                              className={styles.jobItem}
                              variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
                              }}
                            >
                              <div className={styles.jobHeader}>
                                <div className={styles.jobInfo}>
                                  <div className={styles.jobTitle}>{job.title}</div>
                                  <div className={styles.jobCompany}>{job.company}</div>
                                </div>
                                <div className={styles.jobActions}>
                                  <CircularProgress score={job.matchScore ?? 0} />
                                  <div className="flex gap-2">
                                    <button
                                      className={`${styles.iconButton} ${job.isSaved ? styles.iconButtonActive : ""}`}
                                      onClick={() => handleSaveJob(job.id, !job.isSaved)}
                                    >
                                      ★
                                    </button>
                                    <button
                                      className={styles.iconButton}
                                      onClick={() => handleDeleteJob(job.id)}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className={styles.jobDescription}>
                                {job.description}
                              </div>

                              <div className={styles.jobFooter}>
                                <div className={styles.jobLocation}>
                                  LOC: {job.location}
                                </div>
                                <div className="flex gap-3">
                                  {!app ? (
                                    <button 
                                      className="btn-accent py-2 px-6 text-xs flex items-center gap-2"
                                      onClick={() => handleRewrite(job.id)}
                                      disabled={loadingAction === `rewrite-${job.id}`}
                                    >
                                      {loadingAction === `rewrite-${job.id}` ? (
                                        <><Loader2 className="animate-spin" size={14} /> OPTIMIZING...</>
                                      ) : (
                                        <><Zap size={14} /> OPTIMIZE RESUME</>
                                      )}
                                    </button>
                                  ) : (
                                    <div className="flex flex-col gap-2">
                                      <button 
                                        className="btn-secondary py-2 px-6 text-xs flex items-center gap-2 border-[var(--success)] text-[var(--success)]"
                                        onClick={() => handleDownload(app.id)}
                                      >
                                        <Download size={14} /> GET REWRITE DOCX
                                      </button>
                                      <div className="flex gap-1">
                                        {["PENDING", "INTERVIEWING", "OFFER", "REJECTED"].map(s => (
                                          <button
                                            key={s}
                                            className={`text-[9px] font-mono px-2 py-1 rounded border transition-all ${
                                              app.status === s 
                                                ? 'bg-[var(--accent-main)] border-[var(--accent-main)] text-white' 
                                                : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--accent-main)]'
                                            }`}
                                            onClick={() => handleUpdateStatus(app.id, s)}
                                            disabled={loadingAction === `status-${app.id}`}
                                          >
                                            {s[0]}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <a 
                                    href={job.applyLink} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="btn-secondary py-2 px-6 text-xs"
                                  >
                                    ORIGINAL POST
                                  </a>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-8 mt-12 pb-12">
                          {currentPage > 1 ? (
                            <button
                              className="btn-secondary py-2 px-6 text-[10px] uppercase tracking-widest"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            >
                              PREV PAGE
                            </button>
                          ) : (
                            <div className="w-[100px]"></div> /* Spacer to keep center alignment if needed, or just remove */
                          )}
                          <span className="font-mono text-xs text-[var(--text-muted)] tracking-widest">
                            {currentPage} / {totalPages}
                          </span>
                          {currentPage < totalPages ? (
                            <button
                              className="btn-secondary py-2 px-6 text-[10px] uppercase tracking-widest"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            >
                              NEXT PAGE
                            </button>
                          ) : (
                            <div className="w-[100px]"></div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <motion.div 
                className={styles.kanban}
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.15, delayChildren: 0.5 }
                  }
                }}
              >
                {statuses.map(status => {
                  const appsInStatus = applications.filter(a => a.status === status);
                  if (status === "NOT_APPLIED" && appsInStatus.length === 0) return null;

                  return (
                    <motion.div 
                      key={status} 
                      variants={{
                        hidden: { x: 20, opacity: 0 },
                        visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 20 } }
                      }}
                      className={`${styles.kanbanColumn} ${draggedOverStatus === status ? styles.kanbanColumnActive : ""}`}
                      onDragOver={handleDragOver}
                      onDragEnter={() => setDraggedOverStatus(status)}
                      onDragLeave={() => setDraggedOverStatus(null)}
                      onDrop={(e) => handleDrop(e, status)}
                    >
                      <div className={styles.kanbanTitle}>{status.replace("_", " ")} [{appsInStatus.length}]</div>
                      {appsInStatus.map(app => (
                        <div 
                          key={app.id} 
                          className={styles.kanbanItem}
                          draggable
                          onDragStart={(e) => handleDragStart(e, app.id)}
                        >
                          <div className="font-bold text-xs mb-1 uppercase">{app.job.title}</div>
                          <div className="text-[10px] font-mono text-[var(--accent-main)]">{app.job.company}</div>
                        </div>
                      ))}
                      {appsInStatus.length === 0 && (
                        <div className="text-[14px] font-mono text-[var(--text-muted)] uppercase tracking-widest opacity-30 text-center py-4">0</div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </>
        )}

        {activeTab === "applications" && (
          <div className="max-w-5xl">
            <header className={styles.header}>
              <div>
                <div className="text-[10px] font-mono text-[var(--accent-main)] uppercase tracking-[0.2em] mb-2">Dashboard / Applications</div>
                <h1 className={styles.headerTitle}>Applications</h1>
              </div>
            </header>

            <motion.div 
              className="space-y-6"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
            >
              {applications.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                  <div className={styles.jobItem}>
                    <div className="flex flex-col items-center text-center py-12">
                      <div className="w-16 h-16 bg-[var(--accent-main)]/10 rounded-full flex items-center justify-center mb-6">
                        <Briefcase className="text-[var(--accent-main)]" size={32} />
                      </div>
                      <h3 className="text-xl font-bold mb-6 uppercase tracking-tight">No Applications Yet</h3>
                      <p className="text-[var(--text-muted)] text-sm mb-12 leading-relaxed max-w-sm">
                        You haven&apos;t optimized any resumes yet. Start by scanning for jobs that match your profile.
                      </p>
                      <button 
                        className="btn-accent w-full"
                        onClick={() => setActiveTab("dashboard")}
                      >
                        <Search size={16} /> RETURN TO OVERVIEW
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Setup Checklist</div>
                      <div className="space-y-4 mt-2">
                        {[
                          { label: "Profile Setup", status: status === "authenticated" ? "Complete" : "Pending" },
                          { label: "Market Data", status: jobs.length > 0 ? "Synchronized" : "Updating" },
                          { label: "AI Optimization", status: "Ready" }
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between items-center py-2 border-b border-[var(--border-color)] last:border-0">
                            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">{item.label}</span>
                            <span className={`text-[10px] font-mono font-bold ${['Complete', 'Synchronized', 'Ready'].includes(item.status) ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Next Steps</div>
                      <div className="font-mono text-xs text-[var(--text-main)] leading-relaxed mt-2 uppercase tracking-wide">
                        <Typewriter text="Go to Overview > Find Jobs > Select a Role > Click 'Optimize Resume'" delay={1} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                applications.map((app, index) => (
                  <motion.div 
                    key={app.id} 
                    className={styles.jobItem}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
                    }}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <div className={styles.jobTitle}>{app.job.title}</div>
                        <div className={styles.jobCompany}>{app.job.company}</div>
                      </div>
                      <select 
                        className={styles.statusSelect}
                        value={app.status}
                        onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                        disabled={loadingAction === `status-${app.id}`}
                      >
                        {["PENDING", "INTERVIEWING", "OFFER", "REJECTED"].map(s => (
                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-6">
                      <button 
                        className="btn-accent py-2.5 px-6 text-xs flex items-center gap-2 w-full justify-center"
                        onClick={() => handleDownload(app.id)}
                      >
                        <Download size={14} /> DOWNLOAD OPTIMIZED RESUME
                      </button>
                      
                      <div className="pt-6 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
                        <div className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                          <span className={styles.statusDot} style={{ background: app.status === 'OFFER' ? 'var(--success)' : 'var(--accent-main)', boxShadow: `0 0 10px ${app.status === 'OFFER' ? 'var(--success)' : 'var(--accent-main)'}` }}></span>
                          <span>Status: {app.status}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>
        )}

        {activeTab === "resumes" && (
          <div className="max-w-5xl">
            <header className={styles.header}>
              <div>
                <div className="text-[10px] font-mono text-[var(--accent-main)] uppercase tracking-[0.2em] mb-2">Dashboard / Archive</div>
                <h1 className={styles.headerTitle}>Archive</h1>
              </div>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Overview */}
              <div className="lg:col-span-2 space-y-8">
                <div className={styles.jobItem}>
                  <div className={styles.jobItemInner}>
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-sm font-mono uppercase tracking-widest flex items-center gap-3 text-[var(--accent-main)]">
                        <FileText size={18} /> Professional DNA Source
                      </h3>
                      <button className="btn-secondary py-1.5 px-4 text-[10px] uppercase tracking-widest font-mono">Re-Upload Source</button>
                    </div>
                    <div className="bg-black/40 p-8 rounded-xl border border-[var(--border-color)] h-96 overflow-y-auto font-mono text-xs text-[var(--text-muted)] leading-relaxed relative">
                      <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"></div>
                      <div className="pt-4">
                        {status === "authenticated" ? (
                          <pre className="whitespace-pre-wrap font-mono opacity-80">
                            {`--- BEGIN SESSION DATA ---\n\n`}
                            {`Authenticated User: ${session?.user?.email}\n`}
                            {`Account ID: ${session?.user?.id?.slice(0, 12)}...\n\n`}
                            {`Experience History: Synchronized\n`}
                            {`Education Credentials: Verified\n`}
                            {`Project Portfolio: Analyzed\n\n`}
                            {`[DATA PROTECTED BY VANGUARD ENCRYPTION]\n\n`}
                            {`Full document text is stored in the system's encrypted repository. Access is restricted to authorized optimization cycles.`}
                          </pre>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="text-[var(--warning)] animate-pulse">NO SOURCE DATA DETECTED</div>
                            <button className="btn-accent" onClick={() => router.push('/login')}>Initialize System</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={styles.statCard}>
                    <div className={styles.statCardInner}>
                      <div className={styles.statLabel}>Skill Matrix</div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {["Typescript", "React", "Node.js", "System Arch", "QA Automation", "CI/CD", "PostgreSQL", "Cloud Deployment"].map(skill => (
                          <span key={skill} className="px-3 py-1 bg-[var(--accent-main)]/5 border border-[var(--accent-main)]/20 rounded-full text-[9px] font-mono text-[var(--accent-main)] uppercase">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statCardInner}>
                      <div className={styles.statLabel}>Growth Metrics</div>
                      <div className="space-y-4 mt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">Avg Match Score</span>
                          <span className="text-xs font-mono font-bold text-[var(--success)]">+18%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">Optimization Success</span>
                          <span className="text-xs font-mono font-bold text-[var(--accent-main)]">100%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Stats */}
              <div className="space-y-6">
                <div className={styles.statCard}>
                  <div className={styles.statCardInner}>
                    <div className={styles.statLabel}>Total Assets</div>
                    <div className="text-6xl font-mono font-bold my-4 text-gradient">{applications.length.toString().padStart(2, '0')}</div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">Optimized Applications</div>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statCardInner}>
                    <div className={styles.statLabel}>System Health</div>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="relative w-12 h-12">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
                          <circle cx="24" cy="24" r="20" stroke="var(--success)" strokeWidth="4" fill="transparent" strokeDasharray="125.6" strokeDashoffset="25.1" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold">80%</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] font-mono uppercase tracking-widest mb-1">Operational Ready</div>
                        <div className="text-[9px] font-mono text-[var(--text-muted)]">ALL SYSTEMS NOMINAL</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--accent-main)]/5 border border-[var(--accent-main)]/20 p-6 rounded-2xl">
                  <div className="text-[10px] font-mono text-[var(--accent-main)] uppercase tracking-widest mb-4">Export Archive</div>
                  <p className="text-[var(--text-muted)] text-[11px] leading-relaxed mb-4">
                    Download your full operational history including all generated resumes and match data in a single package.
                  </p>
                  <button className="btn-accent w-full py-2.5 text-[10px]">PREPARE BUNDLE</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
