export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getJson } from "serpapi";

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
    const query = "Software Engineer OR Developer"; // In a real app, this should be dynamically generated via Gemini based on the resume.

    const serpApiKey = process.env.SERPAPI_KEY;
    const newJobs = [];

    if (serpApiKey) {
      // Sweep jobs across locations
      for (const location of LOCATIONS) {
        const response = await getJson({
          engine: "google_jobs",
          q: query,
          location: location,
          api_key: serpApiKey,
        });

        const jobsResults = response.jobs_results || [];
        
        for (const job of jobsResults.slice(0, 5)) { // Limit to 5 per location for demo
          // Save to DB
          const savedJob = await getPrisma().job.create({
            data: {
              company: job.company_name,
              title: job.title,
              location: location,
              description: job.description || job.snippet || "No description provided.",
              applyLink: job.related_links?.[0]?.link || "https://google.com/search?q=" + encodeURIComponent(job.title + " " + job.company_name),
            }
          });
          newJobs.push(savedJob);
        }
      }
    } else {
      // Mock data if no API key is provided
      console.log("No SERPAPI_KEY found. Generating mock jobs.");
      for (const location of LOCATIONS) {
        for (let i = 0; i < 2; i++) {
          const savedJob = await getPrisma().job.create({
            data: {
              company: `Mock Company ${i + 1}`,
              title: `Frontend Developer`,
              location: location,
              description: `This is a mock job description for a Frontend Developer role in ${location}. We are looking for someone with React and Next.js experience.`,
              applyLink: "https://example.com/apply",
            }
          });
          newJobs.push(savedJob);
        }
      }
    }

    return NextResponse.json({ success: true, jobsCount: newJobs.length });
  } catch (error) {
    console.error("Job sweep error:", error);
    return NextResponse.json({ error: "Failed to sweep jobs" }, { status: 500 });
  }
}
