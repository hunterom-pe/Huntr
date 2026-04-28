export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { jobId } = await req.json();
    
    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const profile = await getPrisma().profile.findUnique({ where: { userId } });
    const job = await getPrisma().job.findUnique({ where: { id: jobId } });

    if (!profile || !job) {
      return NextResponse.json({ error: "Profile or Job not found" }, { status: 404 });
    }

    const profileId = profile.id;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    // Clean the resume text
    const cleanOriginalResume = profile.originalResume
      .replace(/-- \d+ of \d+ --/g, "") 
      .replace(/[\u0080-\uFFFF]/g, " ")
      .trim();

    const prompt = `
      REWRITE THE FOLLOWING RESUME FOR THIS JOB.
      
      TASK 1: REWRITE CONTENT
      Optimize the summary, skills, and bullets for the JD. Keep it professional.
      
      TASK 2: IDENTIFY ANCHORS
      For the "Summary" and each "Experience" entry, provide a unique 20-30 character snippet from the ORIGINAL text that I can use to find that section in the Word document.
      
      Output ONLY a raw JSON object:
      {
        "rewrittenJson": {
          "header": { "name": "...", "email": "...", "phone": "..." },
          "summary": "...",
          "experience": [ 
            { 
              "company": "...", 
              "role": "...", 
              "new_bullets": ["..."],
              "original_anchor": "A unique snippet from the original text for this job" 
            } 
          ],
          "skills": ["..."],
          "original_summary_anchor": "A unique snippet from the original summary"
        }
      }

      RESUME:
      ${cleanOriginalResume}

      JOB DESCRIPTION:
      ${job.description}
    `;

    // Direct Fetch call to the v1beta endpoint
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      throw new Error(errorData.error?.message || "Gemini API request failed");
    }

    const resultData = await apiResponse.json();
    let text = resultData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (text.startsWith("```")) {
      text = text.replace(/^```json\n?/, "").replace(/```$/, "").trim();
    }
    
    const structuredResume = JSON.parse(text);

    // Save to database
    let application = await getPrisma().application.findFirst({ 
      where: { jobId, profileId } 
    });

    const updateData = {
      rewrittenResume: JSON.stringify(structuredResume),
      rewrittenResumeJson: structuredResume,
      status: "PENDING"
    };

    if (!application) {
      application = await getPrisma().application.create({
        data: { jobId, profileId, ...updateData }
      });
    } else {
      application = await getPrisma().application.update({
        where: { id: application.id },
        data: updateData
      });
    }

    return NextResponse.json({ success: true, applicationId: application.id });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("Rewrite error:", err);
    return NextResponse.json({ error: "Failed to rewrite resume", details: err.message }, { status: 500 });
  }
}
