"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(selectedFile.type)) {
      alert("Please upload a PDF or DOCX file.");
      return;
    }
    setFile(selectedFile);
    uploadFile(selectedFile);
  };

  const startScanning = (profileId: string) => {
    setIsScanning(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setScanningProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          router.push(`/dashboard?profileId=${profileId}`);
        }, 500);
      }
    }, 100);
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
        throw new Error("Failed to upload resume.");
      }

      const data = await res.json();
      if (data.profileId) {
        setIsUploading(false);
        startScanning(data.profileId);
      }
    } catch (error) {
      console.error(error);
      alert("Error uploading file. Please try again.");
      setIsUploading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.gridBackground}></div>
      <div className={styles.blob + " " + styles.blob1}></div>
      <div className={styles.blob + " " + styles.blob2}></div>

      {isScanning && (
        <div className={styles.scanningOverlay}>
          <div className={styles.scanningContent}>
            <div className={styles.scanningHeader}>
              <div className={styles.logoSmall}>HUNTR</div>
              <div className={styles.scanningStatus}>
                <span className={styles.statusDot}></span>
                WEB_SCAN_IN_PROGRESS
              </div>
            </div>
            
            <h2 className={styles.scanningTitle}>Scanning the Web for Matches</h2>
            <p className={styles.scanningSubtitle}>Finding the best jobs and preparing your custom applications...</p>
            
            <div className={styles.progressBarContainer}>
              <div 
                className={styles.progressBar} 
                style={{ width: `${scanningProgress}%` }}
              ></div>
            </div>
            
            <div className={styles.scanningLog}>
              {scanningProgress > 10 && <div className={styles.logItem}>[ OK ] Searching major job boards...</div>}
              {scanningProgress > 30 && <div className={styles.logItem}>[ OK ] Checking LinkedIn and Indeed...</div>}
              {scanningProgress > 50 && <div className={styles.logItem}>[ OK ] Matching your skills with requirements...</div>}
              {scanningProgress > 70 && <div className={styles.logItem}>[ OK ] Finding your best matches...</div>}
              {scanningProgress > 90 && <div className={styles.logItem}>[ OK ] Setting up your dashboard...</div>}
            </div>
          </div>
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.logo}>HUNTR</div>
        <div className={styles.tagline}>FIND A JOB</div>
      </header>

      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDot}></span>
            System Ready: Standby for Upload
          </div>
          <h1 className={styles.title}>
            FIND YOUR NEXT JOB, <span className="text-gradient">AUTOMATED</span>
          </h1>
          <p className={styles.subtitle}>
            The smart way to land your next role. Upload your resume and let us find your best matches and optimize your application in seconds.
          </p>
        </div>

        <div className={styles.uploadSection}>
          <div 
            className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && !isScanning && fileInputRef.current?.click()}
          >
            <div className={styles.cornerTl}></div>
            <div className={styles.cornerTr}></div>
            <div className={styles.cornerBl}></div>
            <div className={styles.cornerBr}></div>

            <input 
              type="file" 
              className={styles.fileInput} 
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
              accept=".pdf,.docx"
              disabled={isUploading || isScanning}
            />
            
            {isUploading ? (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className={`${styles.dropzoneIcon} animate-spin`} />
                <p className={styles.dropzoneText}>Analyzing Resume...</p>
                <p className={styles.dropzoneSubtext}>Extracting skills and experience</p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center justify-center">
                <FileText className={styles.dropzoneIcon} />
                <p className={styles.dropzoneText}>{file.name.toUpperCase()}</p>
                <p className={styles.dropzoneSubtext}>File size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <UploadCloud className={styles.dropzoneIcon} />
                <p className={styles.dropzoneText}>Upload Resume</p>
                <p className={styles.dropzoneSubtext}>Supported Formats: PDF / DOCX</p>
              </div>
            )}
          </div>
          
          <div className={styles.uploadHint}>
            Secure Connection: Encrypted Tunnel Active
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerItem}>[ Core v0.1.0 ]</div>
        <div className={styles.footerItem}>[ Status: Operational ]</div>
        <div className={styles.footerItem}>[ Huntr Network Active ]</div>
      </footer>
    </main>
  );
}
