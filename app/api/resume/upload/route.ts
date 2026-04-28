export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Security: File size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (Max 5MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeText = "";

    if (file.type === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      resumeText = data.text;
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
      resumeText = result.value;
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const fileBase64 = buffer.toString('base64');
    
    const profile = await getPrisma().profile.create({
      data: {
        userId,
        originalResume: resumeText,
        pdfBase64: !isDocx ? fileBase64 : null,
        docxBase64: isDocx ? fileBase64 : null,
      },
    });

    return NextResponse.json({ profileId: profile.id, success: true });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    // Security: Do not leak stack traces or internal details to client
    return NextResponse.json({ 
      error: "Failed to process resume. Please ensure the file is not corrupted."
    }, { status: 500 });
  }
}
