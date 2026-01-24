/**
 * Vision testing types for shoe identification benchmark
 */

// Test execution status
export type TestStatus = 'success' | 'error' | 'refusal';

// Image metadata from catalog
export type ImageData = {
  url: string;
  localPath: string;
  angle: string;
  width: number;
  height: number;
  sizeBytes: number;
  status: string;
};

// Provenance information
export type Provenance = {
  source: string;
  scrapedAt: string;
  sourceUrl: string;
  scraperVersion: string;
};

// Metadata for classification
export type ShoeMetadata = {
  isIconic: boolean;
  culturalSignificance: string;
  brandingVisibility: string;
};

// Shoe from catalog
export type Shoe = {
  id: string;
  brand: string;
  model: string;
  difficultyTier: 'easy' | 'medium' | 'hard';
  tierRationale?: string;
  aliases?: string[];  // Name variants for judge evaluation
  images: ImageData[];
  provenance: Provenance;
  metadata: ShoeMetadata;
};

// Top-level catalog structure
export type ShoeCatalog = {
  version: string;
  createdAt: string;
  totalShoes: number;
  brandDistribution: Record<string, number>;
  shoes: Shoe[];
};

// Input to vision test
export type VisionTestCase = {
  shoe: Shoe;
  imagePath: string;
  systemPrompt: string;
  userPrompt: string;
};

// Output from vision test
export type VisionTestResult = {
  shoeId: string;
  model: string;
  status: TestStatus;
  responseText: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  imageWidth: number;
  imageHeight: number;
  imageSizeBytes: number;
  fromCache: boolean;
  createdAt: number;
};

// Database row structure for cache
export type CacheEntry = {
  cache_key: string;
  model: string;
  shoe_id: string;
  prompt_hash: string;
  response_text: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  latency_ms: number;
  created_at: number;
  image_width: number;
  image_height: number;
  image_size_bytes: number;
};
