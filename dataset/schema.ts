/**
 * Zod schemas for shoe catalog validation
 *
 * Provides runtime validation and TypeScript type inference for:
 * - Individual shoe entries with metadata
 * - Image metadata with dimensions and source info
 * - Provenance tracking for scraped data
 * - Complete dataset with distribution statistics
 */

import { z } from "zod";

// Difficulty tier for benchmark stratification
export const DifficultyTier = z.enum(["easy", "medium", "hard"]);
export type DifficultyTier = z.infer<typeof DifficultyTier>;

// Image metadata including dimensions and storage info
export const ImageMetadata = z.object({
  url: z.string().url(),
  localPath: z.string(),
  angle: z.enum(["side", "top", "three-quarter", "back"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
});
export type ImageMetadata = z.infer<typeof ImageMetadata>;

// Data provenance tracking for scraped entries
export const ProvenanceMetadata = z.object({
  source: z.enum(["stockx", "goat", "farfetch"]),
  scrapedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  scraperVersion: z.string(),
});
export type ProvenanceMetadata = z.infer<typeof ProvenanceMetadata>;

// Individual shoe entry with full metadata
export const ShoeEntry = z.object({
  id: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  difficultyTier: DifficultyTier,
  tierRationale: z.string().min(1),
  images: z.array(ImageMetadata).min(1),
  provenance: ProvenanceMetadata,
  metadata: z.object({
    isIconic: z.boolean(),
    culturalSignificance: z.string().optional(),
    brandingVisibility: z.enum(["high", "medium", "low"]),
  }),
});
export type ShoeEntry = z.infer<typeof ShoeEntry>;

// Alias for convenience
export type Shoe = ShoeEntry;

// Complete dataset with statistics
export const ShoeDataset = z.object({
  version: z.string(),
  createdAt: z.string().datetime(),
  totalShoes: z.number().int().nonnegative(),
  brandDistribution: z.record(z.string(), z.number().int().nonnegative()),
  shoes: z.array(ShoeEntry),
});
export type ShoeDataset = z.infer<typeof ShoeDataset>;

// Alias for convenience
export type Dataset = ShoeDataset;

// Partial types for building entries incrementally
export const PartialImageMetadata = ImageMetadata.partial();
export type PartialImageMetadata = z.infer<typeof PartialImageMetadata>;

// Image processing result (subset returned by image processor)
export const ImageProcessingResult = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
});
export type ImageProcessingResult = z.infer<typeof ImageProcessingResult>;
