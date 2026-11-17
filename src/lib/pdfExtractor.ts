import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const TARGET_CHUNK_CHARS = 7000;

export interface ExtractedPdfResult {
  fileName: string;
  pageCount: number;
  wordCount: number;
  chunks: string[];
}

export function validatePdfFile(file: File): string | null {
  const isPdfMime = file.type === "application/pdf";
  const isPdfExt = file.name.toLowerCase().endsWith(".pdf");
  if (!isPdfMime && !isPdfExt) {
    return "Please choose a valid .pdf file.";
  }
  if (file.size === 0) {
    return "This PDF file appears to be empty (0 bytes).";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File size exceeds 25 MB. Please upload a smaller PDF.";
  }
  return null;
}

export async function extractPdfText(
  file: File,
  onProgress: (info: { currentPage: number; totalPages: number; percent: number }) => void
): Promise<ExtractedPdfResult> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  let pdfDocument: pdfjsLib.PDFDocumentProxy;
  try {
    pdfDocument = await pdfjsLib.getDocument({ data, verbosity: 0 }).promise;
  } catch {
    throw new Error(
      "Could not open this PDF. It may be corrupted or password-protected."
    );
  }

  const totalPages = pdfDocument.numPages;
  if (totalPages === 0) {
    throw new Error("This PDF has 0 pages.");
  }

  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const strings = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean);
    const joined = strings.join(" ").replace(/\s+/g, " ").trim();

    if (joined) {
      pageTexts.push(`[Page ${pageNumber}]\n${joined}`);
    }

    const percent = Math.round((pageNumber / totalPages) * 100);
    onProgress({ currentPage: pageNumber, totalPages, percent });
  }

  const fullText = pageTexts.join("\n\n").trim();
  if (fullText.length < 40) {
    throw new Error(
      "No readable text was found in this PDF. Scanned image-only PDFs are not supported without OCR."
    );
  }

  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  // Group pages into manageable chunks (~7,000 chars each)
  const chunks: string[] = [];
  let currentChunk = "";

  for (const pageBlock of pageTexts) {
    if (pageBlock.length > TARGET_CHUNK_CHARS) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      for (let i = 0; i < pageBlock.length; i += TARGET_CHUNK_CHARS) {
        chunks.push(pageBlock.slice(i, i + TARGET_CHUNK_CHARS).trim());
      }
      continue;
    }

    if (currentChunk.length + pageBlock.length + 2 > TARGET_CHUNK_CHARS && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = pageBlock;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + pageBlock;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return {
    fileName: file.name,
    pageCount: totalPages,
    wordCount,
    chunks,
  };
}
