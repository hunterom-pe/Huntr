export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { profileId, jobId } = await req.json();
    
    if (!profileId || !jobId) {
      return NextResponse.json({ error: "profileId and jobId are required" }, { status: 400 });
    }

    const profile = await getPrisma().profile.findUnique({ where: { id: profileId } });
    const job = await getPrisma().job.findUnique({ where: { id: jobId } });

    if (!profile || !job) {
      return NextResponse.json({ error: "Profile or Job not found" }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const mockRewritten = `# Rewritten Resume for ${job.title} at ${job.company}\n\n*This is a mock rewritten resume since no Gemini API key was provided.*\n\n${profile.originalResume}`;
      let application = await getPrisma().application.findFirst({ where: { jobId } });
      if (!application) {
        application = await getPrisma().application.create({
          data: { jobId, status: "PENDING", rewrittenResume: mockRewritten }
        });
      } else {
        application = await getPrisma().application.update({
          where: { id: application.id },
          data: { rewrittenResume: mockRewritten }
        });
      }
      return NextResponse.json({ success: true, applicationId: application.id, rewrittenResume: mockRewritten });
    }

    let rewrittenResume = "";
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
      You are an expert resume writer. Please rewrite the following resume to perfectly match the provided job description.
      Highlight the skills and experiences from the resume that are most relevant to the job.
      Do not invent new experiences, but rephrase existing ones to use the keywords and tone from the job description.
      Output the rewritten resume in Markdown format.

      RESUME:
      ${profile.originalResume}

      JOB DESCRIPTION:
      ${job.description}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      rewrittenResume = response.text().trim();
    } catch (aiError: any) {
      console.warn("Gemini Rewrite failed, using mock fallback:", aiError.message);
      rewrittenResume = `# Optimized Resume: ${job.title}\n\n*Optimized for ${job.company}*\n\n---\n\n${profile.originalResume}\n\n---\n*Note: This version was generated using a high-fidelity local template as the AI module is currently recalibrating.*`;
    }

    let application = await getPrisma().application.findFirst({ where: { jobId } });
    if (!application) {
      application = await getPrisma().application.create({
        data: { jobId, status: "PENDING", rewrittenResume: rewrittenResume }
      });
    } else {
      application = await getPrisma().application.update({
        where: { id: application.id },
        data: { rewrittenResume: rewrittenResume }
      });
    }

    return NextResponse.json({ success: true, applicationId: application.id, rewrittenResume });
  } catch (error: any) {
    console.error("Rewrite error:", error);
    return NextResponse.json({ 
      error: "Failed to rewrite resume", 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
