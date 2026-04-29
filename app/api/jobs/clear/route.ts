import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all jobs for the user that have NO applications
    const result = await getPrisma().job.deleteMany({
      where: {
        userId: session.user.id,
        Application: {
          none: {}
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      count: result.count 
    });
  } catch (error) {
    console.error("Failed to clear jobs:", error);
    return NextResponse.json({ error: "Failed to clear search data" }, { status: 500 });
  }
}
