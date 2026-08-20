export interface ColorInfo {
  hex: string;
  rgb: [number, number, number];
  percentage: number;
  name: string;
  isLight: boolean;
}

export interface BoundingBox {
  x: number; // percentage or px
  y: number;
  width: number;
  height: number;
}

export interface OCRBlock {
  id: string;
  text: string;
  confidence: number;
  bbox: BoundingBox;
  type: 'heading' | 'key-value' | 'body' | 'list' | 'number' | 'table';
}

export interface KeyValuePair {
  key: string;
  value: string;
  confidence: number;
}

export interface DetectedObject {
  id: string;
  label: string;
  labelId: string; // Indonesian
  confidence: number;
  category: 'foreground' | 'background' | 'text' | 'person' | 'device' | 'document' | 'structure' | 'object';
  bbox?: BoundingBox;
  attributes?: string[];
}

export interface SpatialRelation {
  subject: string;
  relation: string;
  object: string;
  relationId: string;
}

export interface CaptionData {
  detailedEn: string;
  detailedId: string;
  shortEn: string;
  shortId: string;
  altText: string;
  socialCaption: string;
  hashtags: string[];
}

export interface TagCategory {
  category: string;
  categoryId: string;
  tags: { name: string; nameId: string; score: number }[];
}

export interface SceneContext {
  sceneType: string;
  sceneTypeId: string;
  primaryDomain: string;
  indoorOutdoor: 'Indoor' | 'Outdoor' | 'Document/Digital' | 'Mixed';
  lightingCondition: string;
  moodVibe: string;
  compositionRating: number;
  spatialRelations: SpatialRelation[];
}

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface AnalysisResult {
  imageId: string;
  imageName: string;
  imageSrc: string;
  dimensions: { width: number; height: number };
  aspectRatio: string;
  fileSizeKB: number;
  analyzedAt: string;
  
  captions: CaptionData;
  sceneContext: SceneContext;
  colorPalette: ColorInfo[];
  detectedObjects: DetectedObject[];
  tagCategories: TagCategory[];
  
  ocr: {
    hasText: boolean;
    rawText: string;
    blocks: OCRBlock[];
    keyValuePairs: KeyValuePair[];
    language: string;
  };
  
  engineUsed: string;
  usageMetadata?: UsageMetadata;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface SampleImage {
  id: string;
  title: string;
  category: string;
  url: string;
  description: string;
  mockResult?: Partial<AnalysisResult>;
}
