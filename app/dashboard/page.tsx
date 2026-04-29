"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, Briefcase, FileText, Search, Loader2, Download, Zap, Power, User, Plus, ArrowRight, RefreshCw, MapPin, ExternalLink, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./dashboard.module.css";

interface Job {
  id: string;
  company: string;
  title: string;
  location: string;
  description: string;
  matchScore: number;
  matchReason: {
    pros: string[];
    cons: string[];
    summary: string;
  } | null;
  applyLink: string;
  createdAt: string;
}

interface Application {
  id: string;
  status: "PENDING" | "APPLIED" | "INTERVIEWING" | "OFFERED" | "REJECTED";
  job: Job;
  updatedAt: string;
}

interface Profile {
  id: string;
  targetRole: string | null;
  targetLocations: string | null;
}

const ALL_MESSAGES = [
  "Analyzing market trends...",
  "Scanning competitive landscape...",
  "Identifying technical requirements...",
  "Extracting key competencies...",
  "Synthesizing job descriptions...",
  "Mapping skill intersections...",
  "Evaluating cultural alignment...",
  "Calculating match scores...",
  "Optimizing career pipeline...",
  "Searching for hidden opportunities...",
  "AI intelligence active..."
];

export default function Dashboard() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // Core State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, _setProfile] = useState<Profile | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepProgress, setSweepProgress] = useState(0);
  const [scanMessages, setScanMessages] = useState<string[]>([]);

  // UI State
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [jobListTab, setJobListTab] = useState<"matched" | "saved" | "applied">("matched");
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 6;

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  const [manualCompany, setManualCompany] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fragmentPositions = useMemo(() => {
    return ALL_MESSAGES.map(() => ({
      // eslint-disable-next-line react-hooks/purity
      left: `${10 + Math.random() * 80}%`,
      // eslint-disable-next-line react-hooks/purity
      top: `${40 + Math.random() * 40}%`
    }));
  }, []);

  useEffect(() => {
    if (isSweeping) {
      const interval = setInterval(() => {
        setScanMessages(prev => {
          const next = [...prev, ALL_MESSAGES[Math.floor(Math.random() * ALL_MESSAGES.length)]];
          return next.slice(-5);
        });
      }, 800);
      return () => {
        clearInterval(interval);
        setScanMessages([]);
      };
    }
  }, [isSweeping]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchJobs = async () => {
      setIsLoadingJobs(true);
      try {
        const res = await fetch("/api/jobs");
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs);
          setApplications(data.applications);
          _setProfile(data.profile);
        }
      } catch (e) {
        console.error("Fetch jobs failed:", e);
      } finally {
        setIsLoadingJobs(false);
      }
    };

    fetchJobs();
  }, [status, router]);

  const refreshJobs = async (silent = false) => {
    if (status !== "authenticated") return;
    if (!silent) setIsLoadingJobs(true);
    try {
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
        setApplications(data.applications);
        _setProfile(data.profile);
      }
    } catch (e) {
      console.error("Refresh failed:", e);
    } finally {
      if (!silent) setIsLoadingJobs(false);
    }
  };

  const handleSweep = async () => {
    setIsSweeping(true);
    setSweepProgress(0);
    
    const interval = setInterval(() => {
      setSweepProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 1;
      });
    }, 100);

    try {
      const res = await fetch("/api/jobs/sweep", { method: "POST" });
      if (res.ok) {
        setSweepProgress(100);
        setTimeout(async () => {
          await refreshJobs(true);
          setIsSweeping(false);
        }, 500);
      } else {
        setIsSweeping(false);
        const err = await res.json();
        alert(err.error || "Sweep failed");
      }
    } catch {
      setIsSweeping(false);
      alert("An error occurred during sweep");
    } finally {
      clearInterval(interval);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    // Find the application to get its jobId
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    try {
      const res = await fetch("/api/applications/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: app.job.id, status: newStatus }),
      });
      if (res.ok) {
        await refreshJobs(true);
      }
    } catch (e) {
      console.error("Status update failed:", e);
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    if (!confirm("Are you sure you want to remove this job from your pipeline?")) return;
    try {
      const res = await fetch(`/api/jobs/${appId}`, { method: "DELETE" });
      if (res.ok) {
        await refreshJobs(true);
      }
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingManual(true);
    try {
      const res = await fetch("/api/jobs/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: manualCompany,
          title: manualTitle,
          description: manualDescription
        })
      });
      if (res.ok) {
        await refreshJobs(true);
        setShowManualEntry(false);
        setManualCompany("");
        setManualTitle("");
        setManualDescription("");
        setJobListTab("matched");
      }
    } catch (e) {
      console.error("Manual save failed:", e);
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleOptimize = async (app: Application) => {
    setIsOptimizing(true);
    try {
      const res = await fetch("/api/jobs/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: app.id }),
      });
      if (res.ok) {
        const updatedApp = await res.json();
        await refreshJobs(true);
        setSelectedApp(updatedApp);
      }
    } catch (e) {
      console.error("Optimization failed:", e);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!confirm("This will delete your resume and reset your profile. You will be redirected to onboarding. Continue?")) return;
    try {
      const res = await fetch("/api/resume/delete", { method: "DELETE" });
      if (res.ok) {
        await update({ user: { ...session?.user, hasProfile: false } });
        router.push("/onboarding");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete profile");
      }
    } catch {
      alert("An unexpected error occurred");
    }
  };

  const filteredApps = applications.filter(app => {
    if (jobListTab === "applied") return ["APPLIED", "INTERVIEWING", "OFFERED", "REJECTED"].includes(app.status);
    if (jobListTab === "saved") return app.status === "PENDING";
    return false;
  });

  const displayList = jobListTab === "matched" ? jobs : filteredApps;
  const totalPages = Math.ceil(displayList.length / jobsPerPage);
  const currentItems = displayList.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage);

  if (status === "loading") return null;

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>HUNTR</div>
        </div>
        <nav className={styles.nav}>
          <button onClick={() => setActiveTab("dashboard")} className={`${styles.navItem} ${activeTab === "dashboard" ? styles.navActive : ""}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab("jobs")} className={`${styles.navItem} ${activeTab === "jobs" ? styles.navActive : ""}`}>
            <Briefcase size={20} /> Job Pipeline
          </button>
          <button onClick={() => setActiveTab("resume")} className={`${styles.navItem} ${activeTab === "resume" ? styles.navActive : ""}`}>
            <FileText size={20} /> Intelligence
          </button>
          <button onClick={() => setActiveTab("profile")} className={`${styles.navItem} ${activeTab === "profile" ? styles.navActive : ""}`}>
            <User size={20} /> Profile
          </button>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className="systemStatus text-[10px] font-mono text-[var(--text-muted)] mb-4 px-2 uppercase tracking-tighter opacity-50">
            {session?.user?.email}
          </div>
          <button onClick={() => signOut()} className={styles.signOutBtn}>
            <Power size={18} /> Sign Out
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        {activeTab === "dashboard" && (
          <DashboardContent 
            session={session} 
            isSweeping={isSweeping} 
            handleSweep={handleSweep} 
            applications={applications}
            jobs={jobs}
            setJobListTab={setJobListTab}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "jobs" && (
          <div className="space-y-8">
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--text-main)] mb-2">Job Pipeline</h1>
                <p className="text-[var(--text-muted)]">Track and manage your active opportunities.</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowManualEntry(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white/50 border border-[var(--border-color)] rounded-xl text-sm font-bold hover:bg-white transition-all"
                >
                  <Plus size={18} /> ADD JOB MANUALLY
                </button>
                <button 
                  onClick={handleSweep}
                  disabled={isSweeping}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-main)] text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  <RefreshCw size={18} className={isSweeping ? "animate-spin" : ""} />
                  {isSweeping ? "SWEEPING WEB..." : "RUN GLOBAL SWEEP"}
                </button>
              </div>
            </header>

            <div className="flex gap-4 border-b border-[var(--border-color)]">
              <button onClick={() => {setJobListTab("matched"); setCurrentPage(1);}} className={`px-6 py-4 text-sm font-bold transition-all relative ${jobListTab === "matched" ? "text-[var(--accent-main)]" : "text-[var(--text-muted)]"}`}>
                <span className={jobListTab === "matched" ? "tabActive" : ""}>AUTO-MATCHED ({jobs.length})</span>
                {jobListTab === "matched" && <motion.div layoutId="tabActive" className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent-main)]" />}
              </button>
              <button onClick={() => {setJobListTab("saved"); setCurrentPage(1);}} className={`px-6 py-4 text-sm font-bold transition-all relative ${jobListTab === "saved" ? "text-[var(--accent-main)]" : "text-[var(--text-muted)]"}`}>
                <span className={jobListTab === "saved" ? "tabActive" : ""}>SAVED ({applications.filter(a => a.status === 'PENDING').length})</span>
                {jobListTab === "saved" && <motion.div layoutId="tabActive" className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent-main)]" />}
              </button>
              <button onClick={() => {setJobListTab("applied"); setCurrentPage(1);}} className={`px-6 py-4 text-sm font-bold transition-all relative ${jobListTab === "applied" ? "text-[var(--accent-main)]" : "text-[var(--text-muted)]"}`}>
                <span className={jobListTab === "applied" ? "tabActive" : ""}>MY APPLICATIONS ({applications.filter(a => a.status !== 'PENDING').length})</span>
                {jobListTab === "applied" && <motion.div layoutId="tabActive" className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent-main)]" />}
              </button>
            </div>

            {isLoadingJobs ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-white/30 border border-[var(--border-color)] rounded-3xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentItems.map((item) => (
                    <JobCard 
                      key={item.id} 
                      item={item} 
                      type={jobListTab === "matched" ? "job" : "app"}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteApplication}
                      onSelect={(app) => {
                        setSelectedApp(app);
                        setShowAnalysis(true);
                      }}
                    />
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 py-8">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-3 bg-white/50 border border-[var(--border-color)] rounded-xl disabled:opacity-30"
                    >
                      <ArrowRight size={20} className="rotate-180" />
                    </button>
                    <span className="font-mono text-sm">PAGE {currentPage} OF {totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-3 bg-white/50 border border-[var(--border-color)] rounded-xl disabled:opacity-30"
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "resume" && (
          <div className="space-y-8">
            <header>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--text-main)] mb-2">Intelligence Dashboard</h1>
              <p className="text-[var(--text-muted)]">Advanced analysis and resume optimization metrics.</p>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/40 border border-[var(--border-color)] rounded-3xl p-8 backdrop-blur-md">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Zap className="text-[var(--accent-main)]" /> Skill Strength Index</h3>
                <div className="space-y-6">
                  {["System Architecture", "Cloud Infrastructure", "React & TypeScript", "AI Integration"].map((skill, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm font-bold mb-2">
                        <span>{skill}</span>
                        <span className="text-[var(--accent-main)]">{90 - (i * 10)}%</span>
                      </div>
                      <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${90 - (i * 10)}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className="h-full bg-[var(--accent-main)]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/40 border border-[var(--border-color)] rounded-3xl p-8 backdrop-blur-md flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-[var(--accent-main)]">
                  <RefreshCw size={40} />
                </div>
                <h3 className="text-xl font-bold">Optimization History</h3>
                <p className="text-[var(--text-muted)] max-w-xs">Detailed logs of your AI-optimized resumes will appear here as you apply for roles.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="max-w-2xl space-y-8">
            <header>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--text-main)] mb-2">Professional Profile</h1>
              <p className="text-[var(--text-muted)]">Manage your core identity and assets.</p>
            </header>
            <div className="bg-white/40 border border-[var(--border-color)] rounded-3xl p-8 backdrop-blur-md space-y-8">
              <section className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold">
                  {session?.user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{session?.user?.name || "Professional User"}</h3>
                  <p className="text-[var(--text-muted)]">{session?.user?.email}</p>
                </div>
              </section>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/50 border border-[var(--border-color)] rounded-2xl">
                  <div className="text-[var(--text-muted)] text-xs font-mono uppercase mb-1">Target Role</div>
                  <div className="font-bold text-[var(--text-main)]">{profile?.targetRole || "Not specified"}</div>
                </div>
                <div className="p-4 bg-white/50 border border-[var(--border-color)] rounded-2xl">
                  <div className="text-[var(--text-muted)] text-xs font-mono uppercase mb-1">Locations</div>
                  <div className="font-bold text-[var(--text-main)]">{profile?.targetLocations || "Remote"}</div>
                </div>
              </div>

              <section className="pt-8 border-t border-[var(--border-color)]">
                <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Professional Assets</h4>
                <div className="flex flex-wrap gap-4">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border-color)] rounded-xl text-sm hover:bg-black/5 transition-all">
                    <Download size={16} /> DOWNLOAD CURRENT RESUME
                  </button>
                  <button 
                    onClick={handleDeleteResume}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm hover:bg-red-100 transition-all font-bold"
                  >
                    <Trash2 size={16} /> DELETE ASSET
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      <Suspense fallback={null}>
        {/* Scanning Intelligence Overlay */}
        <AnimatePresence>
          {isSweeping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-2xl"
            >
              <div className="max-w-2xl w-full p-8 text-center space-y-12 relative">
                {fragmentPositions.map((pos, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: [0.1, 0.4, 0.1],
                      scale: [0.8, 1.2, 0.8],
                      // eslint-disable-next-line react-hooks/purity
                      x: [0, Math.random() * 20 - 10, 0],
                      // eslint-disable-next-line react-hooks/purity
                      y: [0, Math.random() * 20 - 10, 0],
                    }}
                    transition={{ 
                      // eslint-disable-next-line react-hooks/purity
                      duration: 3 + Math.random() * 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute font-mono text-[10px] text-indigo-400 select-none pointer-events-none opacity-20"
                    style={{ left: pos.left, top: pos.top }}
                  >
                    {/* eslint-disable-next-line react-hooks/purity */}
                    [0x{Math.random().toString(16).slice(2, 8)}] RECON_ACTIVE
                  </motion.div>
                ))}

                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="w-48 h-48 border-4 border-dashed border-indigo-200 rounded-full mx-auto"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-16 h-16 text-[var(--accent-main)] animate-spin" />
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  <h2 className="text-4xl font-bold tracking-tight text-[var(--text-main)]">Global Intelligence Sweep</h2>
                  <p className="text-[var(--text-muted)] text-xl">Aggregating job markets across decentralized networks...</p>
                </div>

                <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden max-w-md mx-auto">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${sweepProgress}%` }}
                    className="h-full bg-[var(--accent-main)] shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                  />
                </div>

                <div className="h-32 flex flex-col items-center justify-center gap-3">
                  <AnimatePresence mode="popLayout">
                    {scanMessages.map((msg, idx) => (
                      <motion.div
                        key={`${msg}-${idx}`}
                        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                        animate={{ opacity: 1 - (idx * 0.2), y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-indigo-600 font-mono text-sm flex items-center gap-2"
                      >
                        <Zap size={12} className="animate-pulse" /> {msg}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual Job Entry Modal */}
        <AnimatePresence>
          {showManualEntry && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowManualEntry(false)} />
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative z-10"
              >
                <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--text-main)]">Add External Position</h2>
                    <p className="text-sm text-[var(--text-muted)]">Inject a specific role into your tracking pipeline.</p>
                  </div>
                  <button onClick={() => setShowManualEntry(false)} className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center transition-all">
                    &times;
                  </button>
                </div>
                
                <form onSubmit={handleManualSave} className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Company</label>
                      <input 
                        required
                        className="w-full p-4 bg-black/5 border border-transparent rounded-2xl outline-none focus:border-[var(--accent-main)] focus:bg-white transition-all"
                        placeholder="e.g. Google"
                        value={manualCompany}
                        onChange={(e) => setManualCompany(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Job Title</label>
                      <input 
                        required
                        className="w-full p-4 bg-black/5 border border-transparent rounded-2xl outline-none focus:border-[var(--accent-main)] focus:bg-white transition-all"
                        placeholder="e.g. Senior QA Engineer"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Full Job Description</label>
                    <textarea 
                      required
                      rows={6}
                      className="w-full p-4 bg-black/5 border border-transparent rounded-2xl outline-none focus:border-[var(--accent-main)] focus:bg-white transition-all resize-none"
                      placeholder="Paste the entire job description here..."
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSavingManual}
                    className="w-full py-4 bg-[var(--accent-main)] text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {isSavingManual ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                    Save & Analyze Job
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Job Analysis/Optimization Modal */}
        <AnimatePresence>
          {showAnalysis && selectedApp && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-8"
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowAnalysis(false)} />
              
              <motion.div 
                layoutId={`card-${selectedApp.id}`}
                className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative z-10"
              >
                <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-white shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-[var(--accent-main)] font-bold text-xl">
                      {selectedApp.job?.company.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[var(--text-main)]">Analysis & Optimization</h2>
                      <div className="flex items-center gap-2 text-[var(--text-muted)]">
                        <span className="font-bold">{selectedApp.job?.company}</span>
                        <span>•</span>
                        <span>{selectedApp.job?.title}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAnalysis(false)} 
                    className="w-12 h-12 rounded-full hover:bg-black/5 flex items-center justify-center text-3xl transition-all"
                  >
                    &times;
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-12 scrollbar-hide">
                  <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 flex flex-col items-center justify-center p-8 bg-indigo-50/50 rounded-[2rem] border border-indigo-100">
                      <div className="relative w-32 h-32 mb-4">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle className="text-indigo-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                          <motion.circle 
                            initial={{ strokeDasharray: "0 264" }}
                            animate={{ strokeDasharray: `${(selectedApp.job?.matchScore || 0) * 2.64} 264` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="text-indigo-600" 
                            strokeWidth="8" 
                            strokeLinecap="round" 
                            stroke="currentColor" 
                            fill="transparent" 
                            r="42" 
                            cx="50" 
                            cy="50" 
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-mono text-3xl font-bold text-indigo-600">
                          {selectedApp.job?.matchScore}%
                        </div>
                      </div>
                      <span className="text-sm font-bold uppercase tracking-widest text-indigo-400">Match Accuracy</span>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                      <div>
                        <h3 className="text-sm font-mono uppercase tracking-widest text-indigo-500 mb-4 flex items-center gap-2">
                          <Search size={14} /> AI Recommendation
                        </h3>
                        <p className="text-lg leading-relaxed text-[var(--text-main)] italic">
                          &quot;{selectedApp.job?.matchReason?.summary || "Analyzing strategic alignment with your professional background..."}&quot;
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <h4 className="text-[10px] font-bold text-emerald-600 uppercase mb-2">Strengths</h4>
                          <ul className="space-y-1">
                            {selectedApp.job?.matchReason?.pros?.map((p, i) => <li key={i} className="text-xs text-emerald-700">• {p}</li>)}
                          </ul>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                          <h4 className="text-[10px] font-bold text-amber-600 uppercase mb-2">Gaps</h4>
                          <ul className="space-y-1">
                            {selectedApp.job?.matchReason?.cons?.map((c, i) => <li key={i} className="text-xs text-amber-700">• {c}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-8 pt-8 border-t border-black/5">
                    <div className="flex justify-between items-end">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Resume Optimization</h3>
                        <p className="text-[var(--text-muted)]">We rewrite your resume bullets to bypass ATS and catch the recruiter&apos;s eye.</p>
                      </div>
                      <button 
                        onClick={() => handleOptimize(selectedApp)}
                        disabled={isOptimizing}
                        className="px-8 py-4 bg-[var(--accent-main)] text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isOptimizing ? <Loader2 className="animate-spin" /> : <Zap size={18} />}
                        {isOptimizing ? "OPTIMIZING..." : "RUN AI REWRITE"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(selectedApp as any).rewrittenResumeJson ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-8"
                        >
                          <div className="p-8 bg-black/5 rounded-[2rem] border border-black/5">
                            <h4 className="text-sm font-mono text-[var(--accent-main)] uppercase mb-4">Optimized Profile Summary</h4>
                            <p className="text-xl italic leading-relaxed text-indigo-900 font-medium">
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              &quot;{(selectedApp as any).rewrittenResumeJson.summary}&quot;
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] px-2">Key Keywords Injected</h4>
                              <div className="flex flex-wrap gap-2">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(selectedApp as any).rewrittenResumeJson.missingSkills.map((skill: string, i: number) => (
                                  <span key={i} className="px-3 py-1 bg-white border border-indigo-100 text-indigo-600 rounded-full text-xs font-mono font-bold">
                                    + {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] px-2">Impact Phrases</h4>
                              <div className="space-y-2">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(selectedApp as any).rewrittenResumeJson.enhancedBulletPoints.slice(0, 3).map((bullet: string, i: number) => (
                                  <div key={i} className="p-3 bg-indigo-50/50 rounded-xl text-xs text-indigo-700 leading-normal border border-indigo-100">
                                    {bullet}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="h-64 flex flex-col items-center justify-center bg-black/5 rounded-[2rem] border border-dashed border-black/10 text-center space-y-4">
                          <FileText size={48} className="text-black/10" />
                          <p className="text-[var(--text-muted)] font-medium">Click &quot;Run AI Rewrite&quot; to generate an optimized version<br/>of your resume specifically for this company.</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <div className="p-8 border-t border-[var(--border-color)] bg-white flex justify-between items-center shrink-0">
                  <div className="text-sm text-[var(--text-muted)] font-mono">
                    ID: {selectedApp.id.slice(0, 8)}
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowAnalysis(false)}
                      className="px-8 py-3 bg-black/5 rounded-xl text-sm font-bold hover:bg-black/10 transition-all"
                    >
                      CLOSE
                    </button>
                    <a 
                      href={selectedApp.job?.applyLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-8 py-3 bg-black text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                    >
                      OPEN IN NEW TAB <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Suspense>
    </div>
  );
}

interface DashboardContentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  isSweeping: boolean;
  handleSweep: () => void;
  applications: Application[];
  jobs: Job[];
  setJobListTab: (t: "matched" | "saved" | "applied") => void;
  setActiveTab: (t: string) => void;
}

function DashboardContent({ 
  session, 
  isSweeping, 
  handleSweep, 
  applications,
  jobs,
  setJobListTab,
  setActiveTab
}: DashboardContentProps) {
  const pendingCount = applications.filter((a) => a.status === 'PENDING').length;
  const appliedCount = applications.filter((a) => a.status !== 'PENDING').length;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-main)] mb-2">Systems Overview</h1>
          <p className="text-[var(--text-muted)]">Welcome back, <span className="text-[var(--text-main)] font-bold">{session?.user?.name || "Seeker"}</span>. Your career agents are standing by.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleSweep}
            disabled={isSweeping}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-main)] text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <RefreshCw size={18} className={isSweeping ? "animate-spin" : ""} />
            {isSweeping ? "SWEEPING..." : "RE-OPTIMIZE PIPELINE"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Market Potential" 
          value={jobs.length} 
          icon={<Search size={20} />} 
          color="indigo"
          onClick={() => { setJobListTab("matched"); setActiveTab("jobs"); }}
        />
        <StatCard 
          label="Saved / Staging" 
          value={pendingCount} 
          icon={<Download size={20} />} 
          color="amber"
          onClick={() => { setJobListTab("saved"); setActiveTab("jobs"); }}
        />
        <StatCard 
          label="Active Applications" 
          value={appliedCount} 
          icon={<Briefcase size={20} />} 
          color="emerald"
          onClick={() => { setJobListTab("applied"); setActiveTab("jobs"); }}
        />
        <StatCard 
          label="Match Velocity" 
          value="94%" 
          icon={<Zap size={20} />} 
          color="purple"
          onClick={() => setActiveTab("resume")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/40 border border-[var(--border-color)] rounded-3xl p-8 backdrop-blur-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Recent Opportunities</h3>
            <button onClick={() => { setJobListTab("matched"); setActiveTab("jobs"); }} className="text-xs font-bold text-[var(--accent-main)] hover:underline">VIEW ALL</button>
          </div>
          <div className="space-y-4">
            {jobs.slice(0, 4).map((job) => (
              <div key={job.id} className="p-4 bg-white/50 border border-[var(--border-color)] rounded-2xl flex justify-between items-center group hover:bg-white transition-all">
                <div>
                  <div className="font-bold text-sm text-[var(--text-main)]">{job.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{job.company} • {job.location}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono font-bold text-[var(--accent-main)] bg-indigo-50 px-2 py-1 rounded-lg">{job.matchScore}%</div>
                  <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center mx-auto text-black/20">
                  <Search size={24} />
                </div>
                <p className="text-sm text-[var(--text-muted)]">No jobs matched yet. Start a sweep!</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/40 border border-[var(--border-color)] rounded-3xl p-8 backdrop-blur-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Pipeline Status</h3>
            <button onClick={() => { setJobListTab("applied"); setActiveTab("jobs"); }} className="text-xs font-bold text-[var(--accent-main)] hover:underline">VIEW ALL</button>
          </div>
          <div className="space-y-4">
            {applications.filter(a => a.status !== 'PENDING').slice(0, 4).map((app) => (
              <div key={app.id} className="p-4 bg-white/50 border border-[var(--border-color)] rounded-2xl flex justify-between items-center group hover:bg-white transition-all">
                <div>
                  <div className="font-bold text-sm text-[var(--text-main)]">{app.job.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{app.job.company}</div>
                </div>
                <div className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                  app.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                  app.status === 'OFFERED' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-indigo-50 text-indigo-600'
                }`}>
                  {app.status}
                </div>
              </div>
            ))}
            {applications.filter(a => a.status !== 'PENDING').length === 0 && (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center mx-auto text-black/20">
                  <Briefcase size={24} />
                </div>
                <p className="text-sm text-[var(--text-muted)]">No active applications. Move a saved job to applied!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

function StatCard({ label, value, icon, color, onClick }: StatCardProps) {
  const colors: Record<string, string> = {
    indigo: "from-indigo-50 to-indigo-100 text-indigo-600",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-600",
    amber: "from-amber-50 to-amber-100 text-amber-600",
    purple: "from-purple-50 to-purple-100 text-purple-600",
  };

  return (
    <button onClick={onClick} className="bg-white/40 border border-[var(--border-color)] rounded-3xl p-6 backdrop-blur-md text-left hover:scale-[1.02] hover:bg-white transition-all">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div className="text-[var(--text-muted)] text-xs font-mono uppercase mb-1 tracking-wider">{label}</div>
      <div className="text-3xl font-bold text-[var(--text-main)]">{value}</div>
    </button>
  );
}

function JobCard({ item, type, onStatusChange, onDelete, onSelect }: { 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any, 
  type: "job" | "app", 
  onStatusChange: (id: string, s: string) => void,
  onDelete: (id: string) => void,
  onSelect: (app: Application) => void
}) {
  const data = type === "job" ? item : item.job;
  
  const handleSaveJob = async () => {
    try {
      const res = await fetch("/api/applications/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: item.id, status: "PENDING" }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error("Save job failed:", e);
    }
  };

  return (
    <motion.div 
      layout
      className="jobItem bg-white/40 border border-[var(--border-color)] rounded-[2rem] p-6 backdrop-blur-md flex flex-col justify-between group hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 transition-all relative"
    >
      <div>
        <div className="jobActions flex justify-between items-start mb-4">
          <div className="w-14 h-14 rounded-2xl bg-black/5 flex items-center justify-center text-xl font-bold text-black/20 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
            {data.company.charAt(0)}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
              {data.matchScore}% MATCH
            </div>
            {type === "app" && (
              <select 
                value={item.status} 
                onChange={(e) => onStatusChange(item.id, e.target.value)}
                className="text-[10px] font-bold uppercase tracking-wider bg-black/5 border-none rounded-lg px-2 py-1 outline-none"
              >
                <option value="PENDING">SAVED</option>
                <option value="APPLIED">APPLIED</option>
                <option value="INTERVIEWING">INTERVIEW</option>
                <option value="OFFERED">OFFER</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            )}
          </div>
        </div>
        
        <h3 className="text-lg font-bold text-[var(--text-main)] mb-1 leading-tight">{data.title}</h3>
        <p className="text-sm font-bold text-[var(--accent-main)] mb-3">{data.company}</p>
        <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs mb-4">
          <MapPin size={12} /> {data.location}
        </div>
      </div>

      <div className="space-y-4">
        {type === "job" ? (
          <button 
            onClick={handleSaveJob}
            className="w-full py-3 bg-black text-white rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            SAVE TO PIPELINE
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => onSelect(item)}
              className="flex-1 py-3 bg-[var(--accent-main)] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Zap size={14} /> VIEW ANALYSIS
            </button>
            <button 
              onClick={() => onDelete(item.id)}
              className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
              title="Remove from pipeline"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
