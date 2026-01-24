/**
 * Image download and processing utilities
 *
 * Downloads images from URLs, resizes to 1024x1024 with white padding,
 * and saves as high-quality JPEG files.
 */

import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import type { ImageProcessingResult } from "../schema";

/**
 * Download an image from a URL, resize to 1024x1024, and save as JPEG
 *
 * @param imageUrl - The URL of the image to download
 * @param outputPath - The local path to save the processed image
 * @returns Metadata about the processed image (width, height, sizeBytes)
 * @throws Error if download, processing, or write fails
 *
 * @example
 * ```ts
 * const result = await downloadAndProcessImage(
 *   'https://example.com/shoe.jpg',
 *   './dataset/images/nike-airmax-side.jpg'
 * );
 * console.log(result); // { width: 1024, height: 1024, sizeBytes: 123456 }
 * ```
 */
export async function downloadAndProcessImage(
  imageUrl: string,
  outputPath: string
): Promise<ImageProcessingResult> {
  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  // Download image
  let response: Response;
  try {
    response = await fetch(imageUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to download image from ${imageUrl}: ${message}`);
  }

  if (!response.ok) {
    throw new Error(
      `Failed to download image from ${imageUrl}: HTTP ${response.status} ${response.statusText}`
    );
  }

  // Convert response to buffer
  let buffer: Buffer;
  try {
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read image data from ${imageUrl}: ${message}`);
  }

  // Process image with Sharp
  let processed: Buffer;
  try {
    processed = await sharp(buffer)
      .resize(1024, 1024, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to process image from ${imageUrl}: ${message}. The image may be corrupted or in an unsupported format.`
    );
  }

  // Write processed image to disk
  try {
    await writeFile(outputPath, processed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to write image to ${outputPath}: ${message}`);
  }

  // Get metadata from processed image
  const metadata = await sharp(processed).metadata();

  return {
    width: metadata.width || 1024,
    height: metadata.height || 1024,
    sizeBytes: processed.byteLength,
  };
}

/**
 * Process a local image file (resize to 1024x1024)
 *
 * @param inputPath - Path to the source image
 * @param outputPath - Path for the processed output
 * @returns Metadata about the processed image
 */
export async function processLocalImage(
  inputPath: string,
  outputPath: string
): Promise<ImageProcessingResult> {
  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  // Process image with Sharp
  let processed: Buffer;
  try {
    processed = await sharp(inputPath)
      .resize(1024, 1024, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to process image from ${inputPath}: ${message}. The image may be corrupted or in an unsupported format.`
    );
  }

  // Write processed image to disk
  try {
    await writeFile(outputPath, processed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to write image to ${outputPath}: ${message}`);
  }

  // Get metadata from processed image
  const metadata = await sharp(processed).metadata();

  return {
    width: metadata.width || 1024,
    height: metadata.height || 1024,
    sizeBytes: processed.byteLength,
  };
}
