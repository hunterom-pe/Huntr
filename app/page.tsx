"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
        router.push(`/dashboard?profileId=${data.profileId}`);
      }
    } catch (error) {
      console.error(error);
      alert("Error uploading file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.blob + " " + styles.blob1}></div>
      <div className={styles.blob + " " + styles.blob2}></div>

      <div className={styles.hero}>
        <h1 className={`${styles.title} text-gradient`}>
          Your next job, automated.
        </h1>
        <p className={styles.subtitle}>
          Upload your resume. We'll scan the web for matching jobs and rewrite your resume to perfectly match each one.
        </p>
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
            accept=".pdf,.docx"
            disabled={isUploading}
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center justify-center">
              <Loader2 className={`${styles.dropzoneIcon} animate-spin`} />
              <p className={styles.dropzoneText}>Analyzing your resume...</p>
              <p className={styles.dropzoneSubtext}>Extracting skills and experience</p>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center justify-center">
              <FileText className={styles.dropzoneIcon} />
              <p className={styles.dropzoneText}>{file.name}</p>
              <p className={styles.dropzoneSubtext}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <UploadCloud className={styles.dropzoneIcon} />
              <p className={styles.dropzoneText}>Drag & drop your resume here</p>
              <p className={styles.dropzoneSubtext}>Supports PDF and DOCX</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
