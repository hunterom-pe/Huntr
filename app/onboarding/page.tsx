"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, ArrowRight, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import styles from "./onboarding.module.css";

type Step = "UPLOAD" | "SCANNING" | "CONFIRM";

export default function Onboarding() {
  const { data: session, status, update } = useSession();
  const [step, setStep] = useState<Step>("UPLOAD");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [scanningProgress, setScanningProgress] = useState(0);
  
  // Extracted data for confirmation
  const [targetRole, setTargetRole] = useState("");
  const [targetLocations, setTargetLocations] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelected(droppedFile);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    const validTypes = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.docx')) {
      alert("Please upload a DOCX file.");
      return;
    }
    uploadFile(selectedFile);
  };

  const uploadFile = async (fileToUpload: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("resume", fileToUpload);

      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload resume.");
      }

      const data = await res.json();
      if (data.profileId) {
        setTargetRole(data.targetRole || "");
        setTargetLocations(data.targetLocations || "");
        setIsUploading(false);
        startScanning();
      }
    } catch (error) {
      console.error(error);
      alert("Error uploading file. Please try again.");
      setIsUploading(false);
    }
  };

  const startScanning = () => {
    setStep("SCANNING");
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setScanningProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setStep("CONFIRM");
        }, 500);
      }
    }, 50);
  };

  const [isSaving, setIsSaving] = useState(false);
  
  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/jobs/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          targetLocations,
        }),
      });

      if (res.ok) {
        // Refresh session to update hasProfile: true
        await update({
          user: { ...session?.user, hasProfile: true }
        });
        router.push("/dashboard");
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to save preferences: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Confirmation error:", error);
      alert("An error occurred during confirmation.");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading") return null;

  return (
    <main className={styles.container}>
      <div className={styles.gridBackground}></div>
      
      <header className={styles.topNav}>
        <div className={styles.logo}>HUNTR</div>
        <div className={styles.navActions}>
          <div className={styles.userEmail}>{session?.user?.email}</div>
          <button onClick={() => signOut({ callbackUrl: "/" })} className={styles.logoutIcon} title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {step === "UPLOAD" && (
          <>
            <div className={styles.wizardHeader}>
              <div className={styles.stepIndicator}>
                <div className={`${styles.stepDot} ${styles.stepDotActive}`}></div>
                <div className={styles.stepDot}></div>
                <div className={styles.stepDot}></div>
              </div>
              <h1 className={styles.title}>Let&apos;s start with your resume</h1>
              <p className={styles.subtitle}>Our AI will analyze your experience to find the perfect roles.</p>
            </div>

            <div className={styles.uploadSection}>
              <div 
                className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  className={styles.fileInput} 
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
                  accept=".docx"
                  disabled={isUploading}
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className={`${styles.dropzoneIcon} animate-spin`} />
                    <p className={styles.dropzoneText}>Analyzing Resume...</p>
                    <p className={styles.dropzoneSubtext}>Extracting skills and experience</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <UploadCloud className={styles.dropzoneIcon} />
                    <p className={styles.dropzoneText}>Upload Resume</p>
                    <p className={styles.dropzoneSubtext}>Supported Format: DOCX</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {step === "SCANNING" && (
          <div className={styles.scanningOverlay}>
            <div className={styles.scanningContent}>
              <h2 className={styles.title}>Analyzing your profile...</h2>
              <p className={styles.subtitle}>Our AI is identifying your core strengths and target roles.</p>
              
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBar} 
                  style={{ width: `${scanningProgress}%` }}
                ></div>
              </div>
              
              <div className={styles.scanningLog}>
                {scanningProgress > 20 && <div className={styles.logItem}>Analyzing document architecture...</div>}
                {scanningProgress > 40 && <div className={styles.logItem}>Identifying core competencies...</div>}
                {scanningProgress > 60 && <div className={styles.logItem}>Mapping professional trajectory...</div>}
                {scanningProgress > 80 && <div className={styles.logItem}>Ready for search intelligence...</div>}
              </div>
            </div>
          </div>
        )}

        {step === "CONFIRM" && (
          <>
            <div className={styles.wizardHeader}>
              <div className={styles.stepIndicator}>
                <div className={styles.stepDot}></div>
                <div className={styles.stepDot}></div>
                <div className={`${styles.stepDot} ${styles.stepDotActive}`}></div>
              </div>
              <h1 className={styles.title}>Confirm your preferences</h1>
              <p className={styles.subtitle}>We&apos;ve extracted these details from your resume. Feel free to adjust them.</p>
            </div>

            <div className={styles.confirmationCard}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Target Job Title</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Preferred Locations</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={targetLocations}
                  onChange={(e) => setTargetLocations(e.target.value)}
                  placeholder="e.g. New York, Remote, Austin"
                />
              </div>

              <button 
                className={styles.confirmButton} 
                onClick={handleConfirm}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>Saving Preferences <Loader2 className="animate-spin" size={20} /></>
                ) : (
                  <>Complete Setup <ArrowRight size={20} /></>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
