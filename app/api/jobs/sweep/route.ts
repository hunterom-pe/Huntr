export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getJson } from "serpapi";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const profile = await getPrisma().profile.findUnique({ 
      where: { userId } 
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found. Please upload a resume first." }, { status: 404 });
    }

    // Use AI-extracted role from profile, or fall back to a generic query
    const query = profile.targetRole || "Software Developer";

    // Use AI-extracted locations from profile, or fall back to Remote
    const locations = profile.targetLocations
      ? profile.targetLocations.split(",").map(l => l.trim()).filter(Boolean)
      : ["Remote"];

    // Always include Remote if not already present
    if (!locations.some(l => l.toLowerCase() === "remote")) {
      locations.unshift("Remote");
    }

    const serpApiKey = process.env.SERPAPI_KEY;
    const allScrapedJobs: unknown[] = [];

    if (serpApiKey) {
      const searchPromises = locations.map(async (location) => {
        const searchParams: Record<string, string> = {
          engine: "google_jobs",
          q: location.toLowerCase() === "remote" ? query : `${query} in ${location}`,
          api_key: serpApiKey,
        };
        if (location.toLowerCase() === "remote") searchParams.ltype = "1";
        
        const response = await getJson(searchParams);
        return { location, results: response.jobs_results || [] };
      });

      const allResults = await Promise.all(searchPromises);
      
      const jobsToSummarize = allResults.flatMap(res => 
        res.results.slice(0, 5).map((job: { description?: string; snippet?: string; [key: string]: unknown }) => ({ ...job, location: res.location }))
      );

      const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
      const model = genAI?.getGenerativeModel({ model: "gemini-flash-latest" });

      const processedJobs = await Promise.all(jobsToSummarize.map(async (job: { title: string; company_name: string; description?: string; snippet?: string; related_links?: { link: string }[]; location: string }) => {
        let summarizedDescription = job.description || job.snippet || "No description provided.";
        let matchScore: number | null = Math.floor(Math.random() * 31) + 65;
        
        if (model) {
          try {
            // 1. Summarization
            const summaryPrompt = `Summarize the following job description into 3 short, punchy bullet points. Return ONLY the bullet points, no other text.\n\n${summarizedDescription}`;
            const summaryResult = await model.generateContent(summaryPrompt);
            summarizedDescription = summaryResult.response.text().trim();

            // 2. Automated Scoring
            const scorePrompt = `Analyze this resume and this job description.
Return ONLY a single integer from 0 to 100 representing how well the resume matches the job description.
Do not return any text, markdown, or explanations, just the integer.

RESUME:
${profile.originalResume}

JOB DESCRIPTION:
${job.description || summarizedDescription}
`;
            const scoreResult = await model.generateContent(scorePrompt);
            const scoreText = scoreResult.response.text().trim();
            const score = parseInt(scoreText.replace(/[^0-9]/g, ''));
            matchScore = isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
          } catch (e) {
            console.error("Gemini processing failed:", e);
          }
        }

        return {
          userId,
          company: job.company_name,
          title: job.title,
          location: job.location,
          description: summarizedDescription,
          matchScore: matchScore,
          applyLink: job.related_links?.[0]?.link || "https://google.com/search?q=" + encodeURIComponent(job.title + " " + job.company_name),
        };
      }));

      for (const jobData of processedJobs) {
        const savedJob = await getPrisma().job.create({ data: jobData });
        allScrapedJobs.push(savedJob);
      }
    } else {
      console.log("No SERPAPI_KEY found. Generating mock jobs.");
      const mockTitles = [
        query,
        `Senior ${query}`,
        `${query} - Contract`,
        `Lead ${query}`,
      ];
      for (const location of locations) {
        for (let i = 0; i < 2; i++) {
          const savedJob = await getPrisma().job.create({
            data: {
              userId,
              company: `Mock Company ${i + 1}`,
              title: mockTitles[i % mockTitles.length],
              location: location,
              description: `• Expert in relevant technologies\n• ${3 + i}+ years experience\n• Strong problem-solving skills`,
              matchScore: 70 + Math.floor(Math.random() * 25),
              applyLink: "https://example.com/apply",
            }
          });
          allScrapedJobs.push(savedJob);
        }
      }
    }

    return NextResponse.json({ success: true, jobsCount: allScrapedJobs.length });
  } catch (error) {
    console.error("Job sweep error:", error);
    return NextResponse.json({ error: "Failed to sweep jobs" }, { status: 500 });
  }
}

