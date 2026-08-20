import * as XLSX from 'xlsx';
import JSZip from 'jszip';

export interface ExtractedDocumentData {
  text: string;
  sheetNames?: string[];
  totalRows?: number;
  headers?: string[];
  sampleRows?: string[];
  previewSnippet?: string;
}

/**
 * Helper to convert Data URL (base64) to ArrayBuffer / Uint8Array
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  if (!dataUrl.includes(',')) {
    return new TextEncoder().encode(dataUrl);
  }
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Robust Multi-Format Document Text & Metadata Extractor
 */
export async function extractDocumentText(dataUrlOrText: string, fileName: string): Promise<ExtractedDocumentData> {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  try {
    // 1. EXCEL (.XLSX / .XLS / .CSV)
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || ext === 'ods') {
      try {
        const bytes = dataUrlToUint8Array(dataUrlOrText);
        const workbook = XLSX.read(bytes, { type: 'array' });
        const sheetNames = workbook.SheetNames;
        const textParts: string[] = [];

        let totalRowCount = 0;
        sheetNames.forEach((name) => {
          const sheet = workbook.Sheets[name];
          const csvText = XLSX.utils.sheet_to_csv(sheet);
          if (csvText.trim()) {
            const lines = csvText.split('\n').filter((l) => l.trim());
            totalRowCount += lines.length;
            textParts.push(`--- Sheet: ${name} (${lines.length} rows) ---\n` + csvText);
          }
        });

        const fullText = textParts.join('\n\n');
        return {
          text: fullText,
          sheetNames,
          totalRows: totalRowCount,
          previewSnippet: fullText.slice(0, 1500),
        };
      } catch (excelErr) {
        console.warn('Excel parse warning:', excelErr);
      }
    }

    // 2. PLAIN TEXT / CSV / JSON / MARKDOWN / LOG / CODE
    if (ext === 'txt' || ext === 'json' || ext === 'md' || ext === 'log' || ext === 'csv' || ext === 'js' || ext === 'ts' || ext === 'html') {
      let rawText = dataUrlOrText;
      if (dataUrlOrText.startsWith('data:')) {
        const base64 = dataUrlOrText.split(',')[1] || '';
        try {
          rawText = atob(base64);
        } catch {
          rawText = dataUrlOrText;
        }
      }
      const lines = rawText.split('\n').filter((l) => l.trim());
      return {
        text: rawText,
        totalRows: lines.length,
        headers: lines[0] ? lines[0].split(/[,\t;|]/).map((h) => h.trim()) : [],
        sampleRows: lines.slice(1, 20),
        previewSnippet: rawText.slice(0, 1500),
      };
    }

    // 3. WORD (DOC / DOCX / RTF / ODT) & POWERPOINT (PPT / PPTX)
    if (ext === 'doc' || ext === 'docx' || ext === 'ppt' || ext === 'pptx' || ext === 'odt' || ext === 'rtf') {
      try {
        const bytes = dataUrlToUint8Array(dataUrlOrText);

        // A. JSZip unzipping for OOXML (.pptx, .docx, .odt)
        if (ext === 'docx' || ext === 'pptx' || ext === 'odt' || (bytes[0] === 0x50 && bytes[1] === 0x4b)) {
          try {
            const zip = await JSZip.loadAsync(bytes);
            const extractedChunks: string[] = [];

            // Sort keys so slides are in numerical order (slide1, slide2, slide3...)
            const fileKeys = Object.keys(zip.files).sort((a, b) => {
              const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
              const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
              return numA - numB;
            });

            for (const relPath of fileKeys) {
              if (
                relPath.includes('ppt/slides/slide') ||
                relPath.includes('ppt/notesSlides/notesSlide') ||
                relPath.includes('word/document.xml') ||
                relPath.includes('content.xml')
              ) {
                const xmlContent = await zip.files[relPath].async('text');
                const matches =
                  xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/g) ||
                  xmlContent.match(/<w:t[^>]*>(.*?)<\/w:t>/g) ||
                  xmlContent.match(/<text:p[^>]*>(.*?)<\/text:p>/g) ||
                  xmlContent.match(/<t[^>]*>(.*?)<\/t>/g) || [];
                const clean = matches.map((m) => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
                if (clean.length > 0) {
                  extractedChunks.push(clean.join(' '));
                }
              }
            }

            if (extractedChunks.length > 0) {
              const zipText = extractedChunks.join('\n\n');
              return {
                text: zipText,
                totalRows: extractedChunks.length,
                previewSnippet: zipText.slice(0, 1500),
              };
            }
          } catch (zipErr) {
            console.warn('JSZip decompression failed, falling back to raw string extraction:', zipErr);
          }
        }

        // B. UTF-16LE decoding for legacy binary Word .DOC / .PPT files
        const utf16Decoder = new TextDecoder('utf-16le', { fatal: false });
        const utf16String = utf16Decoder.decode(bytes);
        const printable16 = utf16String.match(/[\x20-\x7E\n\r\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]{4,}/g) || [];

        const cleanStrings = printable16
          .map((s) => s.trim())
          .filter((s) => {
            if (s.length < 4) return false;
            if (/c2pa|xmlns|stEvt|stRef|instanceID|adobe|xmpMM|rdf:RDF|<svg|image\/png|base64|Normal\.dotm/i.test(s)) return false;
            if (/^[a-zA-Z0-9_/:.-]{1,30}$/.test(s) && !s.includes(' ')) return false;
            return true;
          });

        if (cleanStrings.length > 0) {
          const docText = cleanStrings.join('\n');
          return {
            text: docText,
            totalRows: cleanStrings.length,
            previewSnippet: docText.slice(0, 1500),
          };
        }
      } catch (docErr) {
        console.warn('Doc/Docx extraction warning:', docErr);
      }
    }

    // 4. PDF (Extract text streams)
    if (ext === 'pdf') {
      try {
        const bytes = dataUrlToUint8Array(dataUrlOrText);
        const decoder = new TextDecoder('latin1');
        const pdfString = decoder.decode(bytes);
        const textMatches = pdfString.match(/\((.*?)\)\s*Tj/g) || pdfString.match(/\[(.*?)\]\s*TJ/g);

        if (textMatches && textMatches.length > 0) {
          const pdfText = textMatches
            .map((m) => m.replace(/[()[\]]|\s*TJ|\s*Tj/g, '').trim())
            .filter((s) => s.length > 2)
            .join(' ');

          if (pdfText.length > 20) {
            return {
              text: pdfText,
              previewSnippet: pdfText.slice(0, 1500),
            };
          }
        }
      } catch (pdfErr) {
        console.warn('PDF extraction warning:', pdfErr);
      }
    }

    // Default Fallback
    return {
      text: `Dokumen: ${fileName}`,
      previewSnippet: `Dokumen: ${fileName}`,
    };
  } catch (err) {
    console.error('Failed to extract document text:', err);
    return {
      text: `Dokumen: ${fileName}`,
      previewSnippet: `Dokumen: ${fileName}`,
    };
  }
}
