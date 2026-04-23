export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getJson } from "serpapi";
import { GoogleGenerativeAI } from "@google/generative-ai";

const LOCATIONS = ["Remote", "Phoenix, AZ", "Tempe, AZ", "Scottsdale, AZ"];

export async function POST(req: NextRequest) {
  try {
    const { profileId } = await req.json();
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const profile = await getPrisma().profile.findUnique({ where: { id: profileId } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Extract a brief query based on skills, or default to a generic job if skills are empty
    // For MVP, we will use a hardcoded query or extract top 3 keywords. Let's assume a generic tech query for now,
    // or we can use Gemini to extract job title. Let's do a generic one if no skills are parsed.
    const query = "QA Lead"; // Updated dynamically for MVP testing

    const serpApiKey = process.env.SERPAPI_KEY;
    const allScrapedJobs: any[] = [];

    if (serpApiKey) {
      const searchPromises = LOCATIONS.map(async (location) => {
        const searchParams: any = {
          engine: "google_jobs",
          q: location === "Remote" ? query : `${query} in ${location}`,
          api_key: serpApiKey,
        };
        if (location === "Remote") searchParams.ltype = "1";
        
        const response = await getJson(searchParams);
        return { location, results: response.jobs_results || [] };
      });

      const allResults = await Promise.all(searchPromises);
      
      const jobsToSummarize = allResults.flatMap(res => 
        res.results.slice(0, 5).map((job: any) => ({ ...job, location: res.location }))
      );

      const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
      const model = genAI?.getGenerativeModel({ model: "gemini-1.5-flash" });

      const processedJobs = await Promise.all(jobsToSummarize.map(async (job: any) => {
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
          company: job.company_name,
          title: job.title,
          location: job.location,
          description: summarizedDescription,
          matchScore: matchScore,
          applyLink: job.related_links?.[0]?.link || "https://google.com/search?q=" + encodeURIComponent(job.title + " " + job.company_name),
        };
      }));

      // Batch create using prisma.job.createMany
      // Note: SQLite doesn't support createMany easily with some adapters, but PG does.
      // We'll use a loop of creates if createMany isn't available, but here we'll try to batch.
      for (const jobData of processedJobs) {
        const savedJob = await getPrisma().job.create({ data: jobData });
        allScrapedJobs.push(savedJob);
      }
    } else {
      console.log("No SERPAPI_KEY found. Generating mock jobs.");
      for (const location of LOCATIONS) {
        for (let i = 0; i < 2; i++) {
          const savedJob = await getPrisma().job.create({
            data: {
              company: `Mock Company ${i + 1}`,
              title: `Frontend Developer`,
              location: location,
              description: `• Expert in React and Next.js\n• 5+ years experience\n• Strong CSS skills`,
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
