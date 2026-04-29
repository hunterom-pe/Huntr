import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { jobId, status } = await req.json();
    if (!jobId || !status) {
      return NextResponse.json({ error: "Job ID and Status required" }, { status: 400 });
    }

    const prisma = getPrisma();

    // 1. Find the profile
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // 2. Upsert the application record
    const application = await prisma.application.upsert({
      where: {
        id: (await prisma.application.findFirst({ where: { jobId, profileId: profile.id } }))?.id || "new-id"
      },
      update: { status },
      create: {
        jobId,
        profileId: profile.id,
        status,
      },
    });

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
