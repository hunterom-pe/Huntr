export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import PizZip from "pizzip";
import puppeteer from "puppeteer";

import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = session.user.id;

    const searchParams = req.nextUrl.searchParams;
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return new NextResponse("applicationId is required", { status: 400 });
    }

    const application = await getPrisma().application.findUnique({
      where: { id: applicationId },
      include: { job: true, profile: { include: { user: true } } }
    });

    if (!application || !application.profile) {
      return new NextResponse("Application or Profile not found", { status: 404 });
    }

    // Security: Verify that the application belongs to the authenticated user
    if (application.profile.userId !== userId) {
       return new NextResponse("Unauthorized: Application does not belong to your account", { status: 403 });
    }

    const data = application.rewrittenResumeJson as Record<string, unknown>;
    if (!data) {
       return new NextResponse("No rewritten data found. Please optimize first.", { status: 400 });
    }

    const rawData = (data.rewrittenJson || data) as unknown;
    const resumeData = rawData as { 
      original_summary_anchor?: string; 
      summary?: string; 
      experience?: { original_anchor?: string; new_bullets?: string[] | string }[];
      header?: { name?: string };
    };

    // --- CASE 1: SMART DOCX CLONE ---
    if (application.profile.docxBase64) {
      try {
        const docxBuffer = Buffer.from(application.profile.docxBase64, 'base64');
        const zip = new PizZip(docxBuffer);
        let content = zip.file("word/document.xml")?.asText();

        
        // 1. Replace Summary
        if (resumeData.original_summary_anchor && resumeData.summary && content) {
          console.log("Replacing summary using anchor:", resumeData.original_summary_anchor as string);
          content = content.replace(resumeData.original_summary_anchor as string, resumeData.summary as string);
        }

        // 2. Replace Experience Bullets
        if (resumeData.experience && Array.isArray(resumeData.experience) && content) {
          resumeData.experience.forEach((exp: { original_anchor?: string; new_bullets?: string[] | string }) => {
            if (exp.original_anchor && exp.new_bullets) {
              console.log("Replacing experience using anchor:", exp.original_anchor);
              const newText = Array.isArray(exp.new_bullets) ? exp.new_bullets.join("\n") : exp.new_bullets;
              content = content!.replace(exp.original_anchor, newText);
            }
          });
        }

        if (content) {
          zip.file("word/document.xml", content);
        }

        const buf = zip.generate({
          type: "nodebuffer",
          compression: "DEFLATE",
        });

        return new NextResponse(new Uint8Array(buf), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="Optimized_Resume_${(resumeData.header?.name || 'Resume').replace(/\s+/g, '_')}.docx"`
          }
        });
      } catch (docxError) {
        console.error("Surgical DOCX swap failed:", docxError);
      }
    }

    // --- CASE 2: PDF RENDER (Fallback) ---
    if (application.rewrittenResumeHtml) {
      try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(application.rewrittenResumeHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="Optimized_Resume_${String(resumeData.header?.name || 'Resume').replace(/\s+/g, '_')}.pdf"`
          }
        });
      } catch (pdfError) {
        console.error("PDF generation failed:", pdfError);
      }
    }

    return new NextResponse("Failed to generate download. No template available.", { status: 500 });

  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
