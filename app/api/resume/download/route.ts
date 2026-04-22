export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return new NextResponse("applicationId is required", { status: 400 });
    }

    const application = await getPrisma().application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application || !application.rewrittenResume) {
      return new NextResponse("Application or rewritten resume not found", { status: 404 });
    }

    // Generate PDF
    return new Promise<NextResponse>((resolve, reject) => {
      try {
        const pdfkitLib = require("pdfkit");
        const PDFDocument = pdfkitLib.default || pdfkitLib;
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          const pdfData = Buffer.concat(buffers);
          const response = new NextResponse(pdfData, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="Rewritten_Resume_${application.job.company.replace(/\\s+/g, '_')}.pdf"`,
            },
          });
          resolve(response);
        });

        // Basic formatting of the markdown for PDF
        // Note: For a true premium generation we would parse markdown to PDF properly. 
        // For MVP, we will strip basic markdown characters and format it.
        const cleanText = (application.rewrittenResume || "").replace(/\\*\\*/g, "").replace(/\\*/g, "").replace(/#/g, "");
        doc.fontSize(12).text(cleanText, {
          align: "left",
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}
