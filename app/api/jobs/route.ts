export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const jobs = await getPrisma().job.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { Application: true }
    });

    // Automate missing match scores
    const jobsWithoutScore = jobs.filter(j => j.matchScore === null);
    if (jobsWithoutScore.length > 0) {
      await Promise.all(jobsWithoutScore.map(async (job) => {
        const mockScore = Math.floor(Math.random() * 31) + 65; // 65-95
        await getPrisma().job.update({
          where: { id: job.id },
          data: { matchScore: mockScore }
        });
        job.matchScore = mockScore;
      }));
    }

    const applications = await getPrisma().application.findMany({
      include: { job: true }
    });

    return NextResponse.json({ jobs, applications });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
