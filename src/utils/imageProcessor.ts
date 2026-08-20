import type { ColorInfo, SampleImage } from '../types/vision';

export interface VisualFeatures {
  brightness: number;
  contrast: number;
  isLightBackground: boolean;
  skinToneRatio: number;
  estimatedPeopleCount: number;
  isGroupPhoto: boolean;
  isSinglePerson: boolean;
  hasBatikTexture: boolean;
  hasUniformOrSuit: boolean;
  hasPurpleHue: boolean;
  hasRedHue: boolean;
  hasGreenHue: boolean;
  hasBlueHue: boolean;
  hasYellowHue: boolean;
  isOutdoorSetting: boolean;
  isIndoorSetting: boolean;
  isDocumentLike: boolean;
  topColor: { r: number; g: number; b: number; name: string };
  midColor: { r: number; g: number; b: number; name: string };
  botColor: { r: number; g: number; b: number; name: string };
  purpleRatio: number;
  redRatio: number;
  greenRatio: number;
  blueRatio: number;
  yellowRatio: number;
  whiteRatio: number;
  darkRatio: number;
}

// Extract dominant color palette from image element using HTML5 Canvas
export async function extractColorPalette(imageSrc: string, colorCount: number = 6): Promise<ColorInfo[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(getDefaultPalette());
          return;
        }

        const width = 120;
        const height = Math.round((img.height / img.width) * width) || 120;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height).data;

        const colorMap: Record<string, { r: number; g: number; b: number; count: number }> = {};
        const step = 4 * 4;

        for (let i = 0; i < imageData.length; i += step) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a < 128) continue;

          const qR = Math.round(r / 32) * 32;
          const qG = Math.round(g / 32) * 32;
          const qB = Math.round(b / 32) * 32;
          const key = `${qR},${qG},${qB}`;

          if (!colorMap[key]) {
            colorMap[key] = { r: qR, g: qG, b: qB, count: 0 };
          }
          colorMap[key].count++;
        }

        const sortedColors = Object.values(colorMap).sort((a, b) => b.count - a.count);
        const totalPixels = sortedColors.reduce((acc, curr) => acc + curr.count, 0) || 1;

        const palette: ColorInfo[] = sortedColors.slice(0, colorCount).map((c) => {
          const hex = rgbToHex(c.r, c.g, c.b);
          const isLight = (c.r * 299 + c.g * 587 + c.b * 114) / 1000 > 128;
          const percentage = Math.round((c.count / totalPixels) * 100);
          return {
            hex,
            rgb: [c.r, c.g, c.b],
            percentage: Math.max(percentage, 5),
            name: getColorName(c.r, c.g, c.b),
            isLight,
          };
        });

        resolve(palette.length > 0 ? palette : getDefaultPalette());
      } catch (e) {
        console.warn('Canvas palette extraction fallback:', e);
        resolve(getDefaultPalette());
      }
    };

    img.onerror = () => resolve(getDefaultPalette());
    img.src = imageSrc;
  });
}

// Computer Vision Feature Extractor on Canvas (Pure Dynamic Feature Analysis)
export async function extractVisualFeatures(imageSrc: string): Promise<VisualFeatures> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(getDefaultVisualFeatures());
          return;
        }

        const width = 120;
        const height = Math.round((img.height / img.width) * width) || 120;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height).data;

        let totalBrightness = 0;
        let skinTonePixelCount = 0;
        let purpleCount = 0;
        let redCount = 0;
        let greenCount = 0;
        let blueCount = 0;
        let yellowCount = 0;
        let whiteCount = 0;
        let darkCount = 0;
        let textureVarianceSum = 0;
        let totalPixels = 0;

        let topR = 0, topG = 0, topB = 0, topN = 0;
        let midR = 0, midG = 0, midB = 0, midN = 0;
        let botR = 0, botG = 0, botB = 0, botN = 0;

        const topBoundary = Math.floor(height * 0.35);
        const botBoundary = Math.floor(height * 0.65);

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];
            const a = imgData[idx + 3];

            if (a < 128) continue;
            totalPixels++;

            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            totalBrightness += lum;

            // Skin Tone Detection (Human face & skin pixels)
            if (r > 95 && g > 40 && b > 20 && Math.max(r, g, b) - Math.min(r, g, b) > 15 && Math.abs(r - g) > 15 && r > g && r > b) {
              skinTonePixelCount++;
            }

            // Purple Hue
            if ((r > 60 && r < 170 && g < 90 && b > 100) || (r > 90 && r < 190 && g < 110 && b > 140)) {
              purpleCount++;
            }

            // Red Hue
            if (r > 160 && g < 90 && b < 90) {
              redCount++;
            }

            // Green Hue
            if (g > r + 25 && g > b + 25 && g > 70) {
              greenCount++;
            }

            // Blue Hue
            if (b > r + 25 && b > g + 15 && b > 80) {
              blueCount++;
            }

            // Yellow / Golden Amber Hue
            if (r > 170 && g > 140 && b < 100) {
              yellowCount++;
            }

            // White / High Light
            if (r > 200 && g > 200 && b > 200) {
              whiteCount++;
            }

            // Dark / Black
            if (r < 55 && g < 55 && b < 55) {
              darkCount++;
            }

            // Texture variance with adjacent pixel
            if (x < width - 1) {
              const nextIdx = (y * width + (x + 1)) * 4;
              const diff = Math.abs(r - imgData[nextIdx]) + Math.abs(g - imgData[nextIdx + 1]) + Math.abs(b - imgData[nextIdx + 2]);
              textureVarianceSum += diff;
            }

            // Region sampling
            if (y < topBoundary) {
              topR += r; topG += g; topB += b; topN++;
            } else if (y > botBoundary) {
              botR += r; botG += g; botB += b; botN++;
            } else {
              midR += r; midG += g; midB += b; midN++;
            }
          }
        }

        const avgBrightness = totalBrightness / (totalPixels || 1);
        const skinToneRatio = skinTonePixelCount / (totalPixels || 1);
        const purpleRatio = purpleCount / (totalPixels || 1);
        const redRatio = redCount / (totalPixels || 1);
        const greenRatio = greenCount / (totalPixels || 1);
        const blueRatio = blueCount / (totalPixels || 1);
        const yellowRatio = yellowCount / (totalPixels || 1);
        const whiteRatio = whiteCount / (totalPixels || 1);
        const darkRatio = darkCount / (totalPixels || 1);
        const avgTextureDiff = textureVarianceSum / (totalPixels || 1);

        let estimatedPeopleCount = 0;
        if (skinToneRatio > 0.015) estimatedPeopleCount = 1;
        if (skinToneRatio > 0.035) estimatedPeopleCount = 4;
        if (skinToneRatio > 0.07) estimatedPeopleCount = 10;
        if (skinToneRatio > 0.14) estimatedPeopleCount = 20;

        const isGroupPhoto = estimatedPeopleCount >= 3;
        const isSinglePerson = estimatedPeopleCount === 1 || (skinToneRatio > 0.02 && skinToneRatio <= 0.04);
        const hasBatikTexture = avgTextureDiff > 22 && skinToneRatio > 0.02;
        const hasUniformOrSuit = darkRatio > 0.08 || whiteRatio > 0.15;
        const hasPurpleHue = purpleRatio > 0.025;
        const hasRedHue = redRatio > 0.025;
        const hasGreenHue = greenRatio > 0.025;
        const hasBlueHue = blueRatio > 0.025;
        const hasYellowHue = yellowRatio > 0.02;

        const topAvgR = Math.round(topR / (topN || 1));
        const topAvgG = Math.round(topG / (topN || 1));
        const topAvgB = Math.round(topB / (topN || 1));

        const isOutdoorSetting = topAvgR > 130 && topAvgG > 130 && topAvgB > 130;
        const isIndoorSetting = !isOutdoorSetting;
        const isDocumentLike = whiteRatio > 0.60 && skinToneRatio < 0.01;

        const safeDiv = (val: number, n: number) => Math.round(val / (n || 1));

        resolve({
          brightness: Math.round(avgBrightness),
          contrast: Math.round(avgTextureDiff),
          isLightBackground: avgBrightness > 160,
          skinToneRatio,
          estimatedPeopleCount,
          isGroupPhoto,
          isSinglePerson,
          hasBatikTexture,
          hasUniformOrSuit,
          hasPurpleHue,
          hasRedHue,
          hasGreenHue,
          hasBlueHue,
          hasYellowHue,
          isOutdoorSetting,
          isIndoorSetting,
          isDocumentLike,
          topColor: { r: topAvgR, g: topAvgG, b: topAvgB, name: getColorName(topAvgR, topAvgG, topAvgB) },
          midColor: { r: safeDiv(midR, midN), g: safeDiv(midG, midN), b: safeDiv(midB, midN), name: getColorName(safeDiv(midR, midN), safeDiv(midG, midN), safeDiv(midB, midN)) },
          botColor: { r: safeDiv(botR, botN), g: safeDiv(botG, botN), b: safeDiv(botB, botN), name: getColorName(safeDiv(botR, botN), safeDiv(botG, botN), safeDiv(botB, botN)) },
          purpleRatio,
          redRatio,
          greenRatio,
          blueRatio,
          yellowRatio,
          whiteRatio,
          darkRatio,
        });
      } catch (e) {
        console.warn('Canvas visual feature extraction error:', e);
        resolve(getDefaultVisualFeatures());
      }
    };

    img.onerror = () => resolve(getDefaultVisualFeatures());
    img.src = imageSrc;
  });
}

function getDefaultVisualFeatures(): VisualFeatures {
  return {
    brightness: 120,
    contrast: 20,
    isLightBackground: false,
    skinToneRatio: 0,
    estimatedPeopleCount: 0,
    isGroupPhoto: false,
    isSinglePerson: false,
    hasBatikTexture: false,
    hasUniformOrSuit: false,
    hasPurpleHue: false,
    hasRedHue: false,
    hasGreenHue: false,
    hasBlueHue: false,
    hasYellowHue: false,
    isOutdoorSetting: true,
    isIndoorSetting: false,
    isDocumentLike: false,
    topColor: { r: 120, g: 120, b: 120, name: 'Cool Gray' },
    midColor: { r: 120, g: 120, b: 120, name: 'Cool Gray' },
    botColor: { r: 120, g: 120, b: 120, name: 'Cool Gray' },
    purpleRatio: 0,
    redRatio: 0,
    greenRatio: 0,
    blueRatio: 0,
    yellowRatio: 0,
    whiteRatio: 0,
    darkRatio: 0,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getColorName(r: number, g: number, b: number): string {
  if (r > 200 && g > 200 && b > 200) return 'Crisp White / Light Neutral';
  if (r < 50 && g < 50 && b < 50) return 'Deep Dark / Charcoal';
  if (r > 180 && g < 80 && b < 80) return 'Vibrant Crimson Red';
  if (r < 80 && g > 150 && b < 80) return 'Emerald Green';
  if (r < 80 && g < 120 && b > 180) return 'Sapphire Blue';
  if (r > 200 && g > 150 && b < 80) return 'Golden Amber / Yellow';
  if (r > 130 && g < 80 && b > 130) return 'Deep Purple / Violet';
  if (r > 180 && g > 120 && b > 100) return 'Warm Terracotta / Orange';
  if (r > 120 && g > 120 && b > 120) return 'Cool Gray / Platinum';
  return 'Slate Neutral';
}

function getDefaultPalette(): ColorInfo[] {
  return [
    { hex: '#1e293b', rgb: [30, 41, 59], percentage: 40, name: 'Deep Slate', isLight: false },
    { hex: '#3b82f6', rgb: [59, 130, 246], percentage: 25, name: 'Electric Blue', isLight: false },
    { hex: '#10b981', rgb: [16, 185, 129], percentage: 15, name: 'Emerald Green', isLight: false },
    { hex: '#f59e0b', rgb: [245, 158, 11], percentage: 10, name: 'Warm Amber', isLight: true },
    { hex: '#f8fafc', rgb: [248, 250, 252], percentage: 10, name: 'Off-White', isLight: true },
  ];
}

// Preset Sample Images for Real Indonesian Contexts
export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'posko-pakuan-disaster',
    title: 'Posko Bencana Universitas Pakuan',
    category: 'Disaster Relief & Campus Group',
    description: 'Relawan Universitas Pakuan Bogor membentangkan spanduk Posko Bantuan Banjir & Longsor Sumatera-Aceh.',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="%23e2e8f0"/><path d="M 200 80 L 400 30 L 600 80 L 750 160 L 50 160 Z" fill="%23334155"/><rect x="80" y="160" width="640" height="200" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="4"/><polygon points="400,45 440,95 360,95" fill="%2316a34a"/><circle cx="400" cy="70" r="15" fill="%23eab308"/><rect x="100" y="380" width="600" height="100" rx="12" fill="%23581c87" stroke="%237e22ce" stroke-width="4"/><text x="400" y="415" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23fef08a" text-anchor="middle">YAYASAN PAKUAN SILIWANGI - POSKO BANJIR &amp; TANAH LONGSOR</text><text x="400" y="445" font-family="sans-serif" font-size="20" font-weight="extrabold" fill="white" text-anchor="middle">UNIVERSITAS PAKUAN BOGOR</text><text x="400" y="470" font-family="monospace" font-size="14" fill="%2338bdf8" text-anchor="middle">SUMATERA | ACEH - BNI 0207242287</text><circle cx="120" cy="330" r="22" fill="%23f43f5e"/><circle cx="180" cy="330" r="22" fill="%2338bdf8"/><circle cx="240" cy="330" r="22" fill="%2310b981"/><circle cx="300" cy="330" r="22" fill="%23f59e0b"/><circle cx="360" cy="330" r="22" fill="%23a855f7"/><circle cx="420" cy="330" r="22" fill="%231e293b"/><circle cx="480" cy="330" r="22" fill="%230284c7"/><circle cx="540" cy="330" r="22" fill="%23eab308"/><circle cx="600" cy="330" r="22" fill="%23ec4899"/><circle cx="660" cy="330" r="22" fill="%2314b8a6"/></svg>',
  },
  {
    id: 'mou-plaque-ceremony',
    title: 'Serah Terima Plakat Diplomatik RI-China',
    category: 'MOU & Diplomatic Partnership',
    description: 'Penyerahan cenderamata plakat kehormatan antara perwakilan Indonesia dan Tiongkok (China).',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="%23fef3c7"/><rect x="40" y="40" width="100" height="300" fill="%23dc2626"/><rect x="40" y="190" width="100" height="150" fill="white"/><rect x="660" y="40" width="100" height="300" fill="%23dc2626"/><polygon points="700,80 706,96 724,96 710,106 715,122 700,112 685,122 690,106 676,96 694,96" fill="%23facc15"/><rect x="220" y="100" width="140" height="320" rx="40" fill="%231e293b"/><circle cx="290" cy="160" r="35" fill="%23fde047"/><rect x="440" y="100" width="140" height="320" rx="40" fill="%23b45309"/><circle cx="510" cy="160" r="35" fill="%23fbcfe8"/><rect x="340" y="240" width="120" height="100" rx="8" fill="%23581c87" stroke="%23fbbf24" stroke-width="4"/><text x="400" y="295" font-family="sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">PLAKAT MOU</text></svg>',
  },
  {
    id: 'balaikota-student-rally',
    title: 'Aksi Mahasiswa Almamater Ungu di Balaikota',
    category: 'Student Movement & City Hall Rally',
    description: 'Massa mahasiswa berjaket almamater ungu berkumpul di pilar Gedung Balaikota.',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="%23cbd5e1"/><rect x="100" y="80" width="600" height="180" fill="%23f8fafc" stroke="%2394a3b8" stroke-width="4"/><rect x="140" y="140" width="30" height="120" fill="%23e2e8f0"/><rect x="240" y="140" width="30" height="120" fill="%23e2e8f0"/><rect x="340" y="140" width="30" height="120" fill="%23e2e8f0"/><rect x="440" y="140" width="30" height="120" fill="%23e2e8f0"/><rect x="540" y="140" width="30" height="120" fill="%23e2e8f0"/><rect x="640" y="140" width="30" height="120" fill="%23e2e8f0"/><text x="400" y="125" font-family="serif" font-size="28" font-weight="bold" fill="%23991b1b" text-anchor="middle">Balaikota</text><rect x="0" y="280" width="800" height="220" fill="%236b21a8"/><circle cx="100" cy="340" r="25" fill="%23a855f7"/><circle cx="180" cy="340" r="25" fill="%23a855f7"/><circle cx="260" cy="340" r="25" fill="%23a855f7"/><circle cx="340" cy="340" r="25" fill="%23a855f7"/><circle cx="420" cy="340" r="25" fill="%23a855f7"/><circle cx="500" cy="340" r="25" fill="%23a855f7"/><circle cx="580" cy="340" r="25" fill="%23a855f7"/><circle cx="660" cy="340" r="25" fill="%23a855f7"/><circle cx="740" cy="340" r="25" fill="%23a855f7"/><line x1="380" y1="40" x2="380" y2="280" stroke="%23475569" stroke-width="5"/><rect x="380" y="40" width="50" height="20" fill="%23dc2626"/><rect x="380" y="60" width="50" height="20" fill="white"/></svg>',
  },
  {
    id: 'auditorium-formal-seminar',
    title: 'Seminar In-Door Hall Auditorium',
    category: 'Conference & Executive Ceremony',
    description: 'Barisan pejabat dan pimpinan berpakaian batik berdiri dalam acara seminar resmi.',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="%230f172a"/><rect x="300" y="60" width="200" height="120" rx="8" fill="%231e293b" stroke="%2338bdf8" stroke-width="2"/><text x="400" y="125" font-family="sans-serif" font-size="16" fill="%23e0f2fe" text-anchor="middle">SEMINAR AUDITORIUM</text><rect x="40" y="320" width="720" height="150" rx="16" fill="%23581c87"/><circle cx="100" cy="270" r="30" fill="%23d97706"/><circle cx="180" cy="270" r="30" fill="%231e293b"/><circle cx="260" cy="270" r="30" fill="%230284c7"/><circle cx="340" cy="270" r="30" fill="%23d97706"/><circle cx="420" cy="270" r="30" fill="%2316a34a"/><circle cx="500" cy="270" r="30" fill="%23d97706"/><circle cx="580" cy="270" r="30" fill="%230284c7"/><circle cx="660" cy="270" r="30" fill="%239333ea"/><circle cx="740" cy="270" r="30" fill="%231e293b"/></svg>',
  }
];
