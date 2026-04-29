export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const prisma = getPrisma();

    // Verify user exists in DB (to handle cases after DB reset)
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) {
      return NextResponse.json({ error: "Session expired or user not found. Please sign out and sign in again." }, { status: 401 });
    }

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

    if (file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && !file.name.endsWith('.docx')) {
      return NextResponse.json({ error: "Only DOCX files are supported." }, { status: 400 });
    }

    const result = await mammoth.extractRawText({ buffer });
    resumeText = result.value;

    const fileBase64 = buffer.toString('base64');

    // Use Gemini to extract target role and locations from resume
    let targetRole: string | null = null;
    let targetLocations: string | null = null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && resumeText.length > 50) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const extractionPrompt = `Analyze this resume and extract:
1. The most appropriate job title to search for (based on their experience and skills). Be specific but not too narrow. Examples: "Senior Frontend Developer", "Data Analyst", "Product Manager", "DevOps Engineer".
2. Any locations mentioned (city, state) where this person might be looking for work. If none are mentioned, return "Remote".

Return ONLY a raw JSON object, no markdown:
{"targetRole": "...", "targetLocations": "Remote, City1 State1, City2 State2"}

RESUME:
${resumeText.substring(0, 3000)}`;

        const result = await model.generateContent(extractionPrompt);
        let text = result.response.text().trim();
        if (text.startsWith("```")) {
          text = text.replace(/^```json\n?/, "").replace(/```$/, "").trim();
        }
        const parsed = JSON.parse(text);
        targetRole = parsed.targetRole || null;
        targetLocations = parsed.targetLocations || null;
      } catch (e) {
        console.error("Gemini extraction failed, using defaults:", e);
      }
    }

    // Upsert: update existing profile or create new one
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        originalResume: resumeText,
        pdfBase64: null,
        docxBase64: fileBase64,
        targetRole,
        targetLocations,
      },
      create: {
        user: { connect: { id: userId } },
        originalResume: resumeText,
        pdfBase64: null,
        docxBase64: fileBase64,
        targetRole,
        targetLocations,
      },
    });

    return NextResponse.json({ profileId: profile.id, success: true });
  } catch (error) {
    console.error("Upload error:", error);
    // Security: Do not leak stack traces or internal details to client
    return NextResponse.json({ 
      error: "Failed to process resume. Please ensure the file is not corrupted."
    }, { status: 500 });
  }
}

