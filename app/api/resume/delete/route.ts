import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const prisma = getPrisma();

    // 1. Find the profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json({ error: "No profile found to delete" }, { status: 404 });
    }

    // 2. Delete all applications associated with this profile
    // We do this manually since we don't have cascade in the schema for this relation yet
    await prisma.application.deleteMany({
      where: { profileId: profile.id }
    });

    // 3. Delete the profile itself
    await prisma.profile.delete({
      where: { id: profile.id },
    });

    return NextResponse.json({ success: true, message: "Asset purged successfully" });
  } catch (error) {
    console.error("Purge error:", error);
    return NextResponse.json({ error: "Failed to purge asset" }, { status: 500 });
  }
}
