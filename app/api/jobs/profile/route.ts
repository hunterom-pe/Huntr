import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { targetRole, targetLocations } = await req.json();

    const prisma = getPrisma();

    // Fresh Start: Delete old un-saved jobs so the new resume gets a clean feed
    await prisma.job.deleteMany({
      where: {
        userId,
        isSaved: false,
      },
    });

    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        targetRole,
        targetLocations,
      },
    });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
