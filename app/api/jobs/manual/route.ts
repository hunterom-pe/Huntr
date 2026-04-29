import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { company, title, location, description, applyLink } = await req.json();

    if (!company || !title || !description) {
      return NextResponse.json({ error: "Company, Title, and Description are required" }, { status: 400 });
    }

    const prisma = getPrisma();

    // Create the job record manually
    const job = await prisma.job.create({
      data: {
        userId,
        company,
        title,
        location: location || "Remote",
        description,
        applyLink: applyLink || "",
        isSaved: true, // Manually added jobs are usually jobs you care about
        matchScore: null, // Will be calculated on dashboard refresh or by a separate call
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error("Manual job injection error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
