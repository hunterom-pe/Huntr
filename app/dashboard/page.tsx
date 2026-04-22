"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutDashboard, Briefcase, FileText, Settings, Search, Loader2, Download, Zap } from "lucide-react";
import styles from "./dashboard.module.css";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const idFromUrl = searchParams.get("profileId");
    if (idFromUrl) {
      setProfileId(idFromUrl);
      localStorage.setItem("huntr_profile_id", idFromUrl);
    } else {
      const savedId = localStorage.getItem("huntr_profile_id");
      if (savedId) setProfileId(savedId);
    }
  }, [searchParams]);

  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [isSweeping, setIsSweeping] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const fetchJobs = async () => {
    const res = await fetch("/api/jobs");
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs);
      setApplications(data.applications);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSweep = async () => {
    if (!profileId) return alert("Profile ID missing");
    setIsSweeping(true);
    try {
      const res = await fetch("/api/jobs/sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId })
      });
      if (res.ok) {
        await fetchJobs();
      } else {
        alert("Failed to sweep jobs");
      }
    } finally {
      setIsSweeping(false);
    }
  };

  const handleAnalyze = async (jobId: string) => {
    if (!profileId) {
      console.error("Missing profileId for analysis");
      alert("Please upload a resume first.");
      return;
    }
    setLoadingAction(`analyze-${jobId}`);
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, jobId })
      });
      if (res.ok) {
        await fetchJobs();
      } else {
        const errorData = await res.json();
        console.error("Analysis failed:", errorData.error);
        alert(`Analysis failed: ${errorData.error}`);
      }
    } catch (err) {
      console.error("Network error during analysis:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRewrite = async (jobId: string) => {
    if (!profileId) {
      console.error("Missing profileId for rewriting");
      alert("Please upload a resume first.");
      return;
    }
    setLoadingAction(`rewrite-${jobId}`);
    try {
      const res = await fetch("/api/resume/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, jobId })
      });
      if (res.ok) {
        await fetchJobs();
      } else {
        const errorData = await res.json();
        console.error("Rewrite failed:", errorData.error);
        alert(`Rewrite failed: ${errorData.error}`);
      }
    } catch (err) {
      console.error("Network error during rewrite:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDownload = (appId: string) => {
    window.open(`/api/resume/download?applicationId=${appId}`, "_blank");
  };

  const statuses = ["NOT_APPLIED", "PENDING", "INTERVIEWING", "OFFER", "REJECTED"];

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          Huntr
          <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-[var(--text-main)] text-[var(--bg-main)] font-bold align-middle">v1.0</span>
        </div>
        <nav>
          <div 
            className={`${styles.navItem} ${activeTab === "dashboard" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard size={20} /> Dashboard
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === "applications" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("applications")}
          >
            <Briefcase size={20} /> My Applications
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === "resumes" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("resumes")}
          >
            <FileText size={20} /> Resumes
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === "settings" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Settings size={20} /> Settings
          </div>
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>Overview</h1>
          <button 
            className="btn-primary"
            onClick={handleSweep}
            disabled={isSweeping || !profileId}
          >
            {isSweeping ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            Sweep Internet for Jobs
          </button>
        </header>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Jobs Found</div>
            <div className={styles.statValue}>{jobs.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Applications</div>
            <div className={styles.statValue}>{applications.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Interviews</div>
            <div className={styles.statValue}>
              {applications.filter(a => a.status === "INTERVIEWING").length}
            </div>
          </div>
        </div>

        <div className={styles.bentoGrid}>
          <div className={styles.jobsList}>
            <div className={styles.sectionTitle}>
              Matched Jobs
              <div className={styles.jobCountBadge}>{jobs.length} total</div>
            </div>
            
            {jobs.length === 0 ? (
              <div className="text-center py-10 text-[var(--text-muted)]">
                No jobs found yet. Click 'Sweep Internet' to find matches.
              </div>
            ) : (
              jobs.map(job => {
                const app = job.Application?.[0];
                return (
                  <div key={job.id} className={styles.jobItem}>
                    <div className={styles.jobHeader}>
                      <div>
                        <div className={styles.jobTitle}>{job.title}</div>
                        <div className={styles.jobCompany}>{job.company}</div>
                      </div>
                      {job.matchScore !== null ? (
                        <div className={`${styles.jobScore} ${job.matchScore < 70 ? styles.jobScoreWarning : ''}`}>
                          {job.matchScore}% Match
                        </div>
                      ) : (
                        <button 
                          className="btn-secondary py-1 px-3 text-xs"
                          onClick={() => handleAnalyze(job.id)}
                          disabled={loadingAction === `analyze-${job.id}`}
                        >
                          {loadingAction === `analyze-${job.id}` ? "Scoring..." : "Analyze Match"}
                        </button>
                      )}
                    </div>
                    
                    <div className="text-sm text-[var(--text-muted)] line-clamp-2 mt-2 mb-4">
                      {job.description}
                    </div>

                    <div className={styles.jobFooter}>
                      <div className={styles.jobLocation}>
                        <Search size={14} className="inline mr-1" /> {job.location}
                      </div>
                      <div className={styles.actions}>
                        {!app ? (
                          <button 
                            className="btn-accent py-1.5 px-4 text-sm flex items-center gap-2"
                            onClick={() => handleRewrite(job.id)}
                            disabled={loadingAction === `rewrite-${job.id}`}
                          >
                            {loadingAction === `rewrite-${job.id}` ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
                            Rewrite & Apply
                          </button>
                        ) : (
                          <button 
                            className="btn-secondary py-1.5 px-4 text-sm flex items-center gap-2 border-[var(--success)] text-[var(--success)]"
                            onClick={() => handleDownload(app.id)}
                          >
                            <Download size={14} /> Download Resume
                          </button>
                        )}
                        <a 
                          href={job.applyLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn-secondary py-1.5 px-4 text-sm"
                        >
                          Original Post
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className={styles.kanban}>
            <div className={styles.sectionTitle}>Application Status</div>
            {statuses.map(status => {
              const appsInStatus = applications.filter(a => a.status === status);
              if (status === "NOT_APPLIED" && appsInStatus.length === 0) return null;
              
              return (
                <div key={status} className={styles.kanbanColumn}>
                  <div className={styles.kanbanTitle}>{status.replace("_", " ")} ({appsInStatus.length})</div>
                  {appsInStatus.map(app => (
                    <div key={app.id} className={styles.kanbanItem}>
                      <div className="font-medium">{app.job.title}</div>
                      <div className="text-xs text-[var(--text-muted)]">{app.job.company}</div>
                    </div>
                  ))}
                  {appsInStatus.length === 0 && (
                    <div className="text-xs text-[var(--text-muted)] italic">Empty</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
