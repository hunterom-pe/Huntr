import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const { applicationId, status } = await req.json();

    if (!applicationId || !status) {
      return NextResponse.json({ error: "applicationId and status are required" }, { status: 400 });
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
  } catch (error: any) {
    console.error("Update status error:", error);
    return NextResponse.json({ error: "Failed to update status", details: error.message }, { status: 500 });
  }
}
