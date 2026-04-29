export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getJson } from "serpapi";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { auth } from "@/lib/auth";

export async function POST(_req: NextRequest) {
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

    // AI Expansion: Generate a matrix of synonymous titles
    const baseQuery = profile.targetRole || "Software Developer";
    let searchQueries = [baseQuery];

    const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
    const model = genAI?.getGenerativeModel({ model: "gemini-flash-latest" });

    if (model) {
      try {
        const expansionPrompt = `The user is searching for jobs with the title: "${baseQuery}".
Based on their resume summary below, give me 3 additional search queries (job titles) that are synonymous or highly relevant alternatives they should also search for.
Return ONLY a comma-separated list of the 3 titles, no other text.

RESUME SNIPPET:
${profile.originalResume.slice(0, 1000)}
`;
        const result = await model.generateContent(expansionPrompt);
        const text = result.response.text().trim();
        const expanded = text.split(",").map(t => t.trim()).filter(Boolean);
        searchQueries = Array.from(new Set([...searchQueries, ...expanded])).slice(0, 4);

      } catch (e) {
        console.error("Query expansion failed:", e);
      }
    }

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
    const seenJobKeys = new Set<string>();

    if (serpApiKey) {
      const searchPromises = searchQueries.flatMap(query => 
        locations.map(async (location) => {
          const searchParams: Record<string, string> = {
            engine: "google_jobs",
            q: location.toLowerCase() === "remote" ? query : `${query} in ${location}`,
            api_key: serpApiKey,
          };
          if (location.toLowerCase() === "remote") searchParams.ltype = "1";
          
          const response = await getJson(searchParams);
          return { location, results: response.jobs_results || [] };
        })
      );

      const allResults = await Promise.all(searchPromises);
      
      const jobsToSummarize = allResults.flatMap(res => 
        res.results.slice(0, 3).map((job: { title: string; company_name: string; description?: string; snippet?: string }) => {
          const key = `${job.title}-${job.company_name}`.toLowerCase();
          if (seenJobKeys.has(key)) return null;
          seenJobKeys.add(key);
          return { ...job, location: res.location };
        })
      ).filter(Boolean);

      const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
      const model = genAI?.getGenerativeModel({ model: "gemini-flash-latest" });

      const processedJobs = await Promise.all(jobsToSummarize.map(async (job: { title: string; company_name: string; description?: string; snippet?: string; related_links?: { link: string }[]; location: string }) => {
        let summarizedDescription = job.description || job.snippet || "No description provided.";
        let matchScore: number | null = Math.floor(Math.random() * 31) + 65;
        let matchReason: { pros: string[]; cons: string[]; summary: string } | null = null;
        
        if (model) {
          try {
            // 1. Summarization
            const summaryPrompt = `Summarize the following job description into a rich, professional 4-5 sentence paragraph that highlights the core mission, key technical requirements, and unique benefits. Return ONLY the paragraph, no other text.\n\n${summarizedDescription}`;
            const summaryResult = await model.generateContent(summaryPrompt);
            summarizedDescription = summaryResult.response.text().trim();

            // 2. Automated Scoring & Transparency
            const scorePrompt = `Analyze this resume and this job description.
Return ONLY a JSON object in this exact format:
{
  "score": number,
  "reason": {
    "pros": ["string"],
    "cons": ["string"],
    "summary": "string"
  }
}

RESUME:
${profile.originalResume}

JOB DESCRIPTION:
${job.description || summarizedDescription}
`;
            const scoreResult = await model.generateContent(scorePrompt);
            const scoreData = JSON.parse(scoreResult.response.text().replace(/```json|```/g, "").trim());
            matchScore = Math.min(100, Math.max(0, scoreData.score));
            matchReason = scoreData.reason;
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
          matchReason: matchReason,
          applyLink: job.related_links?.[0]?.link || "https://google.com/search?q=" + encodeURIComponent(job.title + " " + job.company_name),
        };
      }));

      for (const jobData of processedJobs) {
        if (jobData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const savedJob = await getPrisma().job.create({ data: jobData as any });
          allScrapedJobs.push(savedJob);
        }
      }
    } else {
      for (const q of searchQueries) {
        const mockTitles = [
          q,
          `Senior ${q}`,
          `${q} - Contract`,
          `Lead ${q}`,
          `${q} Specialist`,
          `Principal ${q}`,
          `Director of ${q}`,
          `${q} Manager`,
        ];
        for (const location of locations) {
          // Generate 6-8 jobs per query-location pair for a richer feel
          for (let i = 0; i < 6; i++) {
            const savedJob = await getPrisma().job.create({
              data: {
                userId,
                company: `Mock Corp ${Math.floor(Math.random() * 1000)}`,
                title: mockTitles[i % mockTitles.length],
                location: location,
                description: `We are looking for a ${q} to join our high-growth team in ${location}. In this role, you will be responsible for architecting and implementing mission-critical features while collaborating closely with cross-functional partners. We value deep technical expertise, a strong sense of ownership, and the ability to solve complex problems in a fast-paced environment. The ideal candidate has experience with our core stack and a passion for building scalable, user-centric products.`,
                matchScore: 65 + Math.floor(Math.random() * 30),
                matchReason: {
                  pros: ["Strong match for your core skills", "Location alignment", "Experience with similar tech stack"],
                  cons: ["Requires specific domain knowledge", "Slightly higher experience requirement"],
                  summary: "A very strong match based on your recent work history and technical stack."
                },
                applyLink: "https://example.com/apply",
              }
            });
            allScrapedJobs.push(savedJob);
          }
        }
      }
    }

    return NextResponse.json({ success: true, jobsCount: allScrapedJobs.length });
  } catch (error) {
    console.error("Job sweep error:", error);
    return NextResponse.json({ error: "Failed to sweep jobs" }, { status: 500 });
  }
}

