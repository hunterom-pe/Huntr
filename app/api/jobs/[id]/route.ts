import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { isSaved, isDeleted } = await req.json();
    const job = await getPrisma().job.update({
      where: { id: id },
      data: { 
        ...(isSaved !== undefined && { isSaved }),
        ...(isDeleted !== undefined && { isDeleted })
      }
    });
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getPrisma().job.delete({
      where: { id: id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
