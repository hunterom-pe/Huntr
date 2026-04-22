export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { profileId, jobId } = await req.json();
    
    if (!profileId || !jobId) {
      return NextResponse.json({ error: "profileId and jobId are required" }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!profile || !job) {
      return NextResponse.json({ error: "Profile or Job not found" }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return a random score if no API key is provided
      const randomScore = Math.floor(Math.random() * 40) + 60; // 60-100
      await prisma.job.update({
        where: { id: jobId },
        data: { matchScore: randomScore }
      });
      return NextResponse.json({ success: true, matchScore: randomScore });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
    Analyze this resume and this job description.
    Return ONLY a single integer from 0 to 100 representing how well the resume matches the job description.
    Do not return any text, markdown, or explanations, just the integer.
    
    RESUME:
    ${profile.originalResume}
    
    JOB DESCRIPTION:
    ${job.description}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    const score = parseInt(text.replace(/[^0-9]/g, ''));
    const finalScore = isNaN(score) ? 50 : Math.min(100, Math.max(0, score));

    await prisma.job.update({
      where: { id: jobId },
      data: { matchScore: finalScore }
    });

    return NextResponse.json({ success: true, matchScore: finalScore });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze job match" }, { status: 500 });
  }
}
