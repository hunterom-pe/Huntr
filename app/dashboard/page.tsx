"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutDashboard, Briefcase, FileText, Search, Loader2, Download, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./dashboard.module.css";

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
  const searchParams = useSearchParams();
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestProfile = async () => {
      const res = await fetch("/api/resume/upload");
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfileId(data.profile.id);
          localStorage.setItem("huntr_profile_id", data.profile.id);
        }
      }
    };

    const idFromUrl = searchParams.get("profileId");
    if (idFromUrl) {
      setProfileId(idFromUrl);
      localStorage.setItem("huntr_profile_id", idFromUrl);
    } else {
      const savedId = localStorage.getItem("huntr_profile_id");
      if (savedId) {
        setProfileId(savedId);
      } else {
        fetchLatestProfile();
      }
    }
  }, [searchParams]);

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

  const fetchJobs = async () => {
    setIsLoadingJobs(true);
    const res = await fetch("/api/jobs");
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs);
      setApplications(data.applications);
    }
    setIsLoadingJobs(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSweep = async () => {
    if (!profileId) return alert("Profile ID missing");
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
        body: JSON.stringify({ profileId })
      });
      clearInterval(interval);
      setSweepProgress(100);
      setTimeout(() => {
        setIsSweeping(false);
        setSweepProgress(0);
      }, 500);

      if (res.ok) {
        await fetchJobs();
      } else {
        alert("Failed to sweep jobs");
      }
    } catch (err) {
      clearInterval(interval);
      setIsSweeping(false);
      alert("Error sweeping jobs");
    }
  };

  const handleSaveJob = async (jobId: string, isSaved: boolean) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSaved })
      });
      if (res.ok) fetchJobs();
    } catch (err) {
      console.error("Failed to save job");
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true })
      });
      if (res.ok) fetchJobs();
    } catch (err) {
      console.error("Failed to delete job");
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

  const handleUpdateStatus = async (applicationId: string, status: string) => {
    setLoadingAction(`status-${applicationId}`);
    try {
      const res = await fetch("/api/applications/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, status })
      });
      if (res.ok) {
        await fetchJobs();
      } else {
        console.error("Failed to update status");
      }
    } catch (err) {
      console.error("Network error updating status:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  const statuses = ["NOT_APPLIED", "PENDING", "INTERVIEWING", "OFFER", "REJECTED"];

  return (
    <div className={styles.layout}>
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
            <Briefcase size={18} /> Terminal
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "resumes" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("resumes")}
          >
            <FileText size={18} /> Archive
          </div>
        </nav>

        <div className="mt-auto pt-10 border-t border-[var(--border-color)]">
          <div className={styles.systemStatus}>
            <div className={styles.statusDot}></div>
            SYSTEM_ONLINE
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        {activeTab === "dashboard" && (
          <>
            <header className={styles.header}>
              <div>
                <div className="text-[10px] font-mono text-[var(--accent-main)] uppercase tracking-[0.2em] mb-2">Command Center / Dashboard</div>
                <h1 className={styles.headerTitle}>Overview</h1>
              </div>
              <div className="flex flex-col items-end gap-4">
                <button 
                  className="btn-accent"
                  onClick={handleSweep}
                  disabled={isSweeping || !profileId}
                >
                  {isSweeping ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  SCAN FOR JOBS
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

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Target Jobs</div>
                <div className={styles.statValue}>{jobs.length.toString().padStart(2, '0')}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Active Ops</div>
                <div className={styles.statValue}>{applications.length.toString().padStart(2, '0')}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Engagements</div>
                <div className={styles.statValue}>
                  {applications.filter(a => a.status === "INTERVIEWING").length.toString().padStart(2, '0')}
                </div>
              </div>
            </div>

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
                      <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-main)] mb-4" />
                        <div className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-widest">Retrieving target data...</div>
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
                    <>
                      {displayedJobs.map(job => {
                        const app = job.Application?.[0];
                        return (
                          <div key={job.id} className={styles.jobItem}>
                            <div className={styles.jobHeader}>
                              <div className={styles.jobInfo}>
                                <div className={styles.jobTitle}>{job.title}</div>
                                <div className={styles.jobCompany}>{job.company}</div>
                              </div>
                              <div className={styles.jobActions}>
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
                                <div className={`${styles.jobScore} ${(job.matchScore || 0) < 70 ? styles.jobScoreWarning : ''}`}>
                                  {job.matchScore ?? 0}% COMPATIBILITY
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
                                    {loadingAction === `rewrite-${job.id}` ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
                                    OPTIMIZE RESUME
                                  </button>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <button 
                                      className="btn-secondary py-2 px-6 text-xs flex items-center gap-2 border-[var(--success)] text-[var(--success)]"
                                      onClick={() => handleDownload(app.id)}
                                    >
                                      <Download size={14} /> GET_REWRITE.PDF
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
                          </div>
                        )
                      })}

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-8 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg">
                          <button
                            className="btn-secondary py-1.5 px-4 text-xs disabled:opacity-30"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          >
                            PREV_PAGE
                          </button>
                          <span className="font-mono text-xs text-[var(--text-muted)] tracking-widest uppercase">
                            SEQ_{currentPage.toString().padStart(2, '0')} // TOTAL_{totalPages.toString().padStart(2, '0')}
                          </span>
                          <button
                            className="btn-secondary py-1.5 px-4 text-xs disabled:opacity-30"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          >
                            NEXT_PAGE
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className={styles.kanban}>
                <div className={styles.sectionTitle}>DEPLOYMENT STATUS</div>
                {statuses.map(status => {
                  const appsInStatus = applications.filter(a => a.status === status);
                  if (status === "NOT_APPLIED" && appsInStatus.length === 0) return null;

                  return (
                    <div key={status} className={styles.kanbanColumn}>
                      <div className={styles.kanbanTitle}>{status.replace("_", " ")} [{appsInStatus.length}]</div>
                      {appsInStatus.map(app => (
                        <div key={app.id} className={styles.kanbanItem}>
                          <div className="font-bold text-xs mb-1 uppercase">{app.job.title}</div>
                          <div className="text-[10px] font-mono text-[var(--accent-main)]">{app.job.company}</div>
                        </div>
                      ))}
                      {appsInStatus.length === 0 && (
                        <div className="text-[14px] font-mono text-[var(--text-muted)] uppercase tracking-widest opacity-30">0</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === "applications" && (
          <div className="max-w-4xl">
            <div className="text-[10px] font-mono text-[var(--accent-main)] uppercase tracking-[0.2em] mb-2">Command Center / Terminal</div>
            <h1 className={styles.headerTitle + " mb-12"}>Deployment Logs</h1>
            <div className="space-y-4">
              {applications.length === 0 ? (
                <div className="py-20 border border-dashed border-[var(--border-color)] rounded-xl text-center text-[var(--text-muted)] font-mono text-sm">
                  NO_ACTIVE_LOGS: DEPLOYMENT_HISTORY_EMPTY
                </div>
              ) : (
                applications.map(app => (
                  <div key={app.id} className="flex justify-between items-center p-6 bg-[var(--bg-card)] backdrop-filter border border-[var(--border-color)] rounded-xl">
                    <div>
                      <div className="font-bold text-xl uppercase mb-1">{app.job.title}</div>
                      <div className="font-mono text-sm text-[var(--accent-main)]">{app.job.company}</div>
                    </div>
                    <div className="flex items-center gap-6">
                      <select 
                        className="bg-[var(--bg-main)] text-[var(--text-main)] font-mono text-xs px-3 py-2 rounded border border-[var(--border-color)] outline-none focus:border-[var(--accent-main)]"
                        value={app.status}
                        onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                        disabled={loadingAction === `status-${app.id}`}
                      >
                        {["PENDING", "INTERVIEWING", "OFFER", "REJECTED"].map(s => (
                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                      </select>
                      <button 
                        className="btn-accent py-2 px-6 text-xs flex items-center gap-2"
                        onClick={() => handleDownload(app.id)}
                      >
                        <Download size={14} /> DOWNLOAD_REWRITE
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "resumes" && (
          <div className="max-w-4xl">
            <div className="text-[10px] font-mono text-[var(--accent-main)] uppercase tracking-[0.2em] mb-2">Command Center / Archive</div>
            <h1 className={styles.headerTitle + " mb-12"}>Data Repository</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--border-color)]"></div>
                <h3 className="text-sm font-mono uppercase tracking-widest mb-6 flex items-center gap-3">
                  <FileText size={18} className="text-blue-400" /> Source_Resume
                </h3>
                <div className="bg-black/40 p-6 rounded border border-[var(--border-color)] h-64 overflow-y-auto font-mono text-[10px] text-[var(--text-muted)] leading-relaxed">
                  {profileId ? "ENCRYPTED_DATA_STORED: EXTRACT_SUCCESS" : "0"}
                </div>
              </div>
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--border-color)]"></div>
                <h3 className="text-sm font-mono uppercase tracking-widest mb-6 flex items-center gap-3">
                  <Zap size={18} className="text-yellow-400" /> Generated_Assets
                </h3>
                <div className="text-6xl font-mono font-bold mb-2">{applications.length.toString().padStart(2, '0')}</div>
                <div className="text-[var(--text-muted)] font-mono text-[10px] uppercase tracking-widest mb-8">Asset_Count::Targeted_Resumes</div>
                <button className="btn-secondary w-full text-xs font-mono uppercase tracking-widest">Access_Archive</button>
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
