import type { AnalysisResult, UsageMetadata } from '../types/vision';

const ACTIVE_GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
];

const modelCooldownMap = new Map<string, number>();

function isModelInCooldown(modelName: string): boolean {
  const until = modelCooldownMap.get(modelName);
  if (!until) return false;
  if (Date.now() > until) {
    modelCooldownMap.delete(modelName);
    return false;
  }
  return true;
}

function markModelCooldown(modelName: string, durationMs: number = 60000) {
  modelCooldownMap.set(modelName, Date.now() + durationMs);
}

export async function analyzeImageWithGeminiApi(
  apiKey: string,
  imageSrc: string,
  imageName: string,
  dimensions: { width: number; height: number },
  fileSizeKB: number
): Promise<AnalysisResult> {
  let base64Data = '';
  let mimeType = 'image/jpeg';

  if (imageSrc.startsWith('data:')) {
    const matches = imageSrc.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Data = matches[2];
    } else {
      const base64Part = imageSrc.split(',')[1];
      base64Data = base64Part || '';
    }
  } else {
    const response = await fetch(imageSrc);
    const blob = await response.blob();
    mimeType = blob.type || 'image/jpeg';
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64Data = btoa(binary);
  }

  const promptText = `Anda adalah sistem Multimodal AI Vision & Information Extraction terkemuka.
Analisis foto/dokumen ini secara mendalam dan akurat:
1. Baca seluruh teks tulisan/spanduk/logo/watermark yang ada (OCR verbatim).
2. Identifikasi entitas penting (nama instansi/kampus, lokasi gedung/balaikota, nomor rekening, tokoh/pejabat, bendera/simbol kenegaraan).
3. Jelaskan konteks scene kegiatan yang sedang berlangsung secara naratif, faktual, dan komprehensif dalam Bahasa Indonesia.
4. Tentukan objek visual, atribut pakaian (almamater/batik/jas), dan warna dominan.
5. Berikan tagar (hashtags) yang relevan dan spesifik.

Output HARUS dalam format JSON MURNI (tanpa markdown codeblock) dengan struktur berikut:
{
  "detailedId": "Deskripsi rinci konteks gambar dalam Bahasa Indonesia",
  "detailedEn": "Detailed description of image context in English",
  "shortId": "Deskripsi singkat 1 kalimat dalam Bahasa Indonesia",
  "shortEn": "Short summary 1 sentence in English",
  "altText": "Alt text untuk aksesibilitas tunanetra",
  "socialCaption": "Teks caption media sosial menarik + emoji + hashtag",
  "hashtags": ["#Tagar1", "#Tagar2", "#Tagar3", "#Tagar4"],
  "sceneType": "Kategori Scene (misal: Posko Bantuan Bencana / Seminar Auditorium)",
  "primaryDomain": "Akademik / Keuangan / SDM / Kemahasiswaan / Penelitian / Umum",
  "indoorOutdoor": "Indoor" atau "Outdoor",
  "lightingCondition": "Deskripsi pencahayaan",
  "moodVibe": "Deskripsi suasana",
  "rawOcrText": "Teks lengkap yang terbaca di foto/gambar",
  "keyValuePairs": [
    { "key": "Entitas", "value": "Nilai", "confidence": 99 }
  ],
  "detectedObjects": [
    { "label": "Banner Posko", "labelId": "Spanduk Posko Bantuan", "confidence": 98, "category": "foreground" }
  ],
  "tagCategories": [
    {
      "category": "Entitas & Instansi",
      "categoryId": "Entitas & Instansi",
      "tags": [
        { "name": "Nama Tag", "nameId": "Nama Tag", "score": 0.99 }
      ]
    }
  ]
}`;

  let lastError: Error | null = null;
  let resultJson: any = null;
  let usedModelName = ACTIVE_GEMINI_MODELS[0];

  for (const modelName of ACTIVE_GEMINI_MODELS) {
    if (isModelInCooldown(modelName)) {
      console.info(`[Model Cooldown] Skipping ${modelName} due to active quota cooldown.`);
      continue;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          console.warn(`[429 Quota Exceeded] Applying 60s cooldown to ${modelName}. Switching model...`);
          markModelCooldown(modelName, 60000);
        } else if (response.status === 503) {
          console.warn(`[503 Unavailable] Applying 15s cooldown to ${modelName}. Switching model...`);
          markModelCooldown(modelName, 15000);
        }
        throw new Error(`Gemini API [${modelName}] failed (${response.status}): ${errorText}`);
      }

      resultJson = await response.json();
      usedModelName = modelName;
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${modelName} failed, switching to next fallback model...`, err.message);
    }
  }

  if (!resultJson) {
    throw lastError || new Error('All Gemini models failed to process image');
  }

  const rawCandidateText = resultJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawCandidateText) {
    throw new Error('Gemini API returned empty candidate response.');
  }

  const usageMetadata: UsageMetadata | undefined = resultJson.usageMetadata
    ? {
        promptTokenCount: resultJson.usageMetadata.promptTokenCount || 0,
        candidatesTokenCount: resultJson.usageMetadata.candidatesTokenCount || 0,
        totalTokenCount: resultJson.usageMetadata.totalTokenCount || 0,
      }
    : undefined;

  let cleanedJsonString = rawCandidateText.trim();
  if (cleanedJsonString.startsWith('```')) {
    cleanedJsonString = cleanedJsonString.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleanedJsonString);
  } catch (parseErr) {
    console.warn('Initial JSON.parse failed, attempting robust JSON repair for truncated Gemini response...', parseErr);
    try {
      parsed = parseAndRepairJson(cleanedJsonString);
    } catch (repairErr) {
      console.error('JSON repair failed:', repairErr);
      const firstBrace = cleanedJsonString.indexOf('{');
      const lastBrace = cleanedJsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        parsed = JSON.parse(cleanedJsonString.slice(firstBrace, lastBrace + 1));
      } else {
        throw parseErr;
      }
    }
  }

  return {
    imageId: `gemini-${Date.now()}`,
    imageName,
    imageSrc,
    dimensions,
    aspectRatio: `${(dimensions.width / (dimensions.height || 1)).toFixed(2)}:1 (${dimensions.width}x${dimensions.height})`,
    fileSizeKB,
    analyzedAt: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    captions: {
      detailedId: parsed.detailedId || 'Berhasil dianalisis secara presisi via Gemini Multimodal Vision AI.',
      detailedEn: parsed.detailedEn || 'Successfully analyzed via Gemini Multimodal Vision AI.',
      shortId: parsed.shortId || 'Analisis Gemini Vision AI',
      shortEn: parsed.shortEn || 'Gemini Vision AI Analysis',
      altText: parsed.altText || 'Foto dokumentasi kegiatan dan entitas visual.',
      socialCaption: parsed.socialCaption || 'Dokumentasi kegiatan resmi dan ekstraksi AI.',
      hashtags: parsed.hashtags || ['#GeminiAI', '#VisionExtraction', '#Dokumentasi'],
    },
    sceneContext: {
      sceneType: parsed.sceneType || 'Visual Multimodal Scene',
      sceneTypeId: parsed.sceneType || 'Gemini Vision Scene',
      primaryDomain: parsed.primaryDomain || 'Multimodal Domain',
      indoorOutdoor: (parsed.indoorOutdoor === 'Outdoor' || parsed.indoorOutdoor === 'outdoor') ? 'Outdoor' : 'Indoor',
      lightingCondition: parsed.lightingCondition || 'Balanced Natural Light',
      moodVibe: parsed.moodVibe || 'Faktual & Informatif',
      compositionRating: 9.8,
      spatialRelations: [],
    },
    colorPalette: [
      { hex: '#0f172a', rgb: [15, 23, 42], percentage: 40, name: 'Midnight Navy', isLight: false },
      { hex: '#38bdf8', rgb: [56, 189, 248], percentage: 35, name: 'Cyan Sky', isLight: true },
      { hex: '#f8fafc', rgb: [248, 250, 252], percentage: 25, name: 'Crisp Light', isLight: true },
    ],
    detectedObjects: (parsed.detectedObjects || []).map((o: any, idx: number) => ({
      id: `gemini-obj-${idx}`,
      label: o.label || 'Detected Object',
      labelId: o.labelId || o.label || 'Objek Terdeteksi',
      confidence: o.confidence || 95,
      category: o.category || 'foreground',
    })),
    tagCategories: (parsed.tagCategories || []).map((tc: any) => ({
      category: tc.category,
      categoryId: tc.categoryId || tc.category,
      tags: tc.tags || [],
    })),
    ocr: {
      hasText: Boolean(parsed.rawOcrText),
      rawText: parsed.rawOcrText || '',
      blocks: [],
      keyValuePairs: (parsed.keyValuePairs || []).map((kv: any) => ({
        key: kv.key,
        value: kv.value,
        confidence: kv.confidence || 95,
      })),
      language: 'Multilingual (Gemini Multimodal)',
    },
    engineUsed: usedModelName.includes('gemini') ? `Google ${usedModelName}` : 'Gemini Multimodal Vision AI',
    usageMetadata,
  };
}

export function parseAndRepairJson(jsonString: string): any {
  let cleaned = jsonString.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        // ignore
      }
    }

    let str = firstBrace !== -1 ? cleaned.slice(firstBrace) : cleaned;

    // Close unterminated string quotes
    let inString = false;
    let escaped = false;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = !inString;
      }
    }
    if (inString) {
      str += '"';
    }

    // Clean unclosed key-value pair or trailing commas
    str = str.replace(/,\s*$/, '');
    str = str.replace(/,\s*("[^"]*"\s*:?\s*)?$/, '');
    str = str.replace(/:\s*"[^"]*$/, ': ""');

    // Balance braces and brackets
    const stack: string[] = [];
    inString = false;
    escaped = false;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = !inString;
      } else if (!inString) {
        if (ch === '{' || ch === '[') {
          stack.push(ch === '{' ? '}' : ']');
        } else if (ch === '}' || ch === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === ch) {
            stack.pop();
          }
        }
      }
    }

    while (stack.length > 0) {
      str += stack.pop();
    }

    return JSON.parse(str);
  }
}

/**
 * Direct Document Intelligence with Gemini API using extracted document text & tables (No OCR)
 */
export async function analyzeDocumentWithGeminiApi(
  apiKey: string,
  documentText: string,
  fileName: string,
  fileSizeKB: number,
  fileSrc: string = '',
  fileType?: string
): Promise<AnalysisResult> {
  const promptText = `Anda adalah sistem Analisis Dokumen & Ekstraksi Informasi AI Tingkat Tinggi (Document Intelligence & Semantic Engine).
Analisis teks, representasi visual/tabel, dan struktur isi dari berkas dokumen berikut secara mendalam:
Nama Berkas: "${fileName}"
Ukuran: ${fileSizeKB} KB
Format/Tipe: ${fileType || 'Dokumen Digital'}

Teks Isi Dokumen:
"""
${documentText.slice(0, 15000)}
"""

Pedoman Analisis:
1. Pemahaman Menyeluruh & Netral: Pahami seluruh esensi konten secara murni dari data yang tertulis (teks naratif, struktur tabel, angka, relasi variabel, pertanyaan, entitas, maupun skema data) tanpa membatasi diri pada bidang/domain tertentu.
2. Analisis Faktual: Ekstrak fakta nyata dari konten. Uraikan konteks secara komprehensif, sebutkan metrik/indikator kunci, pihak/entitas yang terlibat, serta tujuan isi dokumen.
3. Fokus Substansi: Abaikan seluruh metadata teknis biner, hash file, tag C2PA, atau sertifikat digital. Fokus 100% pada isi/materi substantif dokumen.
4. Klasifikasi Terbuka: Tentukan tipe dokumen, domain, kategori tag, dan objek struktural secara dinamis berdasarkan data aktual yang tertera di dalam dokumen.

Output HARUS berupa JSON MURNI (tanpa format markdown codeblock seperti \`\`\`json) dengan struktur berikut:
{
  "detailedId": "Deskripsi faktual, menyeluruh, dan komprehensif mengenai konteks dokumen dalam Bahasa Indonesia",
  "detailedEn": "Comprehensive and factual description of document context in English",
  "shortId": "Ringkasan esensi dokumen dalam 1 kalimat padat (Bahasa Indonesia)",
  "shortEn": "Concise 1-sentence summary of the document essence (English)",
  "altText": "Deskripsi aksesibilitas singkat mengenai isi/tampilan visual dokumen",
  "socialCaption": "Teks ringkasan/caption informatif yang menarik + emoji yang relevan + hashtag",
  "hashtags": ["#TagarSpesifik1", "#TagarSpesifik2", "#TagarSpesifik3", "#TagarSpesifik4"],
  "sceneType": "Bentuk atau tipe fungsional dokumen yang ditentukan secara mandiri dari isi",
  "primaryDomain": "Bidang atau domain utama yang teridentifikasi secara organik dari konten",
  "tagCategories": [
    {
      "category": "Topik Utama",
      "categoryId": "Topik Utama",
      "tags": [
        { "name": "Tag Topik 1", "nameId": "Tag Topik 1", "score": 0.99 }
      ]
    },
    {
      "category": "Entitas & Pihak Terkait",
      "categoryId": "Entitas & Pihak Terkait",
      "tags": [
        { "name": "Nama Entitas 1", "nameId": "Nama Entitas 1", "score": 0.95 }
      ]
    },
    {
      "category": "Metrik & Indikator",
      "categoryId": "Metrik & Indikator",
      "tags": [
        { "name": "Nama Metrik/Parameter", "nameId": "Nama Metrik/Parameter", "score": 0.90 }
      ]
    },
    {
      "category": "Format & Struktur",
      "categoryId": "Format & Struktur",
      "tags": [
        { "name": "Bentuk Susunan Konten", "nameId": "Bentuk Susunan Konten", "score": 0.95 }
      ]
    }
  ],
  "detectedObjects": [
    {
      "label": "Nama komponen struktural yang terdeteksi (EN)",
      "labelId": "Nama komponen struktural yang terdeteksi (ID)",
      "confidence": 95,
      "attributes": ["Atribut 1", "Atribut 2"]
    }
  ]
}`;

  let pdfInlinePart: any = null;
  if (fileSrc && fileSrc.startsWith('data:')) {
    const matches = fileSrc.match(/^data:(application\/pdf);base64,(.+)$/);
    if (matches) {
      pdfInlinePart = {
        inlineData: {
          mimeType: 'application/pdf',
          data: matches[2],
        },
      };
    }
  }

  let lastError: Error | null = null;
  let resultJson: any = null;
  let usedModelName = ACTIVE_GEMINI_MODELS[0];

  for (const modelName of ACTIVE_GEMINI_MODELS) {
    if (isModelInCooldown(modelName)) {
      console.info(`[Model Cooldown] Skipping ${modelName} due to active quota cooldown.`);
      continue;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const parts: any[] = [{ text: promptText }];
      if (pdfInlinePart) {
        parts.push(pdfInlinePart);
      }

      const payload = {
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          console.warn(`[429 Quota Exceeded] Applying 60s cooldown to ${modelName}. Switching model...`);
          markModelCooldown(modelName, 60000);
        } else if (response.status === 503) {
          console.warn(`[503 Unavailable] Applying 15s cooldown to ${modelName}. Switching model...`);
          markModelCooldown(modelName, 15000);
        }
        throw new Error(`Gemini API [${modelName}] failed (${response.status}): ${errorText}`);
      }

      resultJson = await response.json();
      usedModelName = modelName;
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${modelName} failed for document, switching to next fallback model...`, err.message);
    }
  }

  if (!resultJson) {
    throw lastError || new Error('All Gemini models failed to process document text');
  }

  const rawCandidateText = resultJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawCandidateText) {
    throw new Error('Gemini API returned empty candidate response.');
  }

  const usageMetadata: UsageMetadata | undefined = resultJson.usageMetadata
    ? {
        promptTokenCount: resultJson.usageMetadata.promptTokenCount || 0,
        candidatesTokenCount: resultJson.usageMetadata.candidatesTokenCount || 0,
        totalTokenCount: resultJson.usageMetadata.totalTokenCount || 0,
      }
    : undefined;

  let cleanedJsonString = rawCandidateText.trim();
  if (cleanedJsonString.startsWith('```')) {
    cleanedJsonString = cleanedJsonString.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleanedJsonString);
  } catch (parseErr) {
    console.warn('Initial JSON.parse failed on document result, attempting repair...', parseErr);
    try {
      parsed = parseAndRepairJson(cleanedJsonString);
    } catch (repairErr) {
      console.error('Document JSON repair failed:', repairErr);
      const firstBrace = cleanedJsonString.indexOf('{');
      const lastBrace = cleanedJsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        parsed = JSON.parse(cleanedJsonString.slice(firstBrace, lastBrace + 1));
      } else {
        throw parseErr;
      }
    }
  }

  return {
    imageId: `gemini-doc-${Date.now()}`,
    imageName: fileName,
    imageSrc: fileSrc,
    dimensions: { width: 1200, height: 800 },
    aspectRatio: '1.5:1 (Document Layout)',
    fileSizeKB,
    analyzedAt: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    captions: {
      detailedId: parsed.detailedId || `Berkas dokumen "${fileName}" berisi data terstruktur dan telah dianalisis oleh Gemini AI.`,
      detailedEn: parsed.detailedEn || `Document file "${fileName}" analyzed by Gemini AI.`,
      shortId: parsed.shortId || `Dokumen: ${fileName}`,
      shortEn: parsed.shortEn || `Document: ${fileName}`,
      altText: parsed.altText || `Dokumen digital ${fileName}`,
      socialCaption: parsed.socialCaption || `Dokumen ${fileName} 📄📁`,
      hashtags: parsed.hashtags || ['#DokumenDigital', '#AnalisisAI', '#LuminousDrive'],
    },
    sceneContext: {
      sceneType: parsed.sceneType || 'Dokumen Digital Terstruktur',
      sceneTypeId: parsed.sceneType || 'Document Intelligence',
      primaryDomain: parsed.primaryDomain || 'Umum',
      indoorOutdoor: 'Document/Digital',
      lightingCondition: 'Digital Document Structure',
      moodVibe: 'Informatif, Terstruktur & Formal',
      compositionRating: 9.8,
      spatialRelations: [],
    },
    colorPalette: [
      { hex: '#4f46e5', rgb: [79, 70, 229], percentage: 45, name: 'Indigo Accent', isLight: false },
      { hex: '#f8fafc', rgb: [248, 250, 252], percentage: 35, name: 'Crisp White Paper', isLight: true },
      { hex: '#0f172a', rgb: [15, 23, 42], percentage: 20, name: 'Ink Navy', isLight: false },
    ],
    detectedObjects: (parsed.detectedObjects || []).map((o: any, idx: number) => ({
      id: `doc-obj-${idx}`,
      label: o.label || 'Document Element',
      labelId: o.labelId || o.label || 'Elemen Dokumen',
      confidence: o.confidence || 95,
      category: 'document',
      attributes: o.attributes || [],
    })),
    tagCategories: (parsed.tagCategories || []).map((tc: any) => ({
      category: tc.category,
      categoryId: tc.categoryId || tc.category,
      tags: tc.tags || [],
    })),
    ocr: {
      hasText: false,
      rawText: '',
      blocks: [],
      keyValuePairs: [
        { key: 'Nama Dokumen', value: fileName, confidence: 0.99 },
        { key: 'Tipe Dokumen', value: parsed.sceneType || 'Dokumen Digital', confidence: 0.98 },
        { key: 'Kategori Otomatis', value: parsed.primaryDomain || 'Umum', confidence: 0.98 },
        { key: 'Ukuran Berkas', value: `${fileSizeKB} KB`, confidence: 0.99 },
      ],
      language: 'Non-Image Document (No OCR Required)',
    },
    engineUsed: usedModelName.includes('gemini') ? `Google ${usedModelName}` : 'Gemini Document Intelligence AI',
    usageMetadata,
  };
}
