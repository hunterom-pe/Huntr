export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";


export async function GET() {
  try {
    const profile = await getPrisma().profile.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const mammoth = require("mammoth");
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeText = "";

    if (file.type === "application/pdf") {
      const { PDFParse } = require("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      resumeText = data.text;
      await parser.destroy();
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
      resumeText = result.value;
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const profile = await getPrisma().profile.create({
      data: {
        originalResume: resumeText,
      },
    });

    return NextResponse.json({ profileId: profile.id, success: true });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ 
      error: "Failed to process resume", 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
