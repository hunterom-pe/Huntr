import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { applicationId, status } = await req.json();

    if (!applicationId || !status) {
      return NextResponse.json({ error: "applicationId and status are required" }, { status: 400 });
    }

    const applicationCheck = await getPrisma().application.findUnique({
      where: { id: applicationId },
      include: { profile: true }
    });

    if (!applicationCheck || applicationCheck.profile?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized: You do not own this application" }, { status: 403 });
    }

    const validStatuses = ["PENDING", "INTERVIEWING", "OFFER", "REJECTED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const application = await getPrisma().application.update({
      where: { id: applicationId },
      data: { status },
      include: { job: true }
    });

    return NextResponse.json({ success: true, application });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Update status error:", err);
    return NextResponse.json({ error: "Failed to update status", details: err.message }, { status: 500 });
  }
}
