/**
 * Rate-limited HTTP fetching with exponential backoff
 *
 * Provides a base class for scrapers that:
 * - Enforces maximum requests per minute
 * - Adds random jitter to avoid detection
 * - Retries failed requests with exponential backoff
 * - Uses realistic browser headers
 */

import { backOff } from "exponential-backoff";

/**
 * Configuration for rate limiting behavior
 */
export interface RateLimiterConfig {
  /** Maximum requests per minute (default: 8) */
  requestsPerMinute: number;
  /** Random delay range in ms [min, max] (default: [2000, 5000]) */
  randomDelayMs: [number, number];
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  requestsPerMinute: 8,
  randomDelayMs: [2000, 5000],
};

/**
 * Base class for site scrapers with built-in rate limiting
 *
 * Usage:
 * ```ts
 * class StockXScraper extends SiteScraperBase {
 *   async scrapeProduct(url: string) {
 *     const html = await this.fetchWithRateLimit(url);
 *     // parse html...
 *   }
 * }
 * ```
 */
export class SiteScraperBase {
  private lastRequestTime = 0;
  protected config: RateLimiterConfig;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Fetch a URL with rate limiting and exponential backoff retry
   *
   * @param url - The URL to fetch
   * @returns The response body as text
   * @throws Error if all retry attempts fail
   */
  async fetchWithRateLimit(url: string): Promise<string> {
    await this.enforceRateLimit();

    return backOff(
      async () => {
        const response = await fetch(url, {
          headers: this.getBrowserHeaders(),
        });

        if (response.status === 429) {
          throw new Error("Rate limited - HTTP 429");
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.text();
      },
      {
        numOfAttempts: 5,
        startingDelay: 1000,
        timeMultiple: 2,
        maxDelay: 30000,
        retry: (error: Error, attemptNumber: number) => {
          console.warn(
            `Retry attempt ${attemptNumber}/5 for ${url}: ${error.message}`
          );
          return true;
        },
      }
    );
  }

  /**
   * Enforce rate limiting by waiting if necessary
   * Adds random jitter to avoid detection patterns
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const minInterval = 60000 / this.config.requestsPerMinute;
    const elapsed = now - this.lastRequestTime;

    // Wait if we're requesting too fast
    if (elapsed < minInterval && this.lastRequestTime > 0) {
      const waitTime = minInterval - elapsed;
      await this.sleep(waitTime);
    }

    // Add random jitter to avoid detection
    const [minJitter, maxJitter] = this.config.randomDelayMs;
    const jitter = Math.random() * (maxJitter - minJitter) + minJitter;
    await this.sleep(jitter);

    this.lastRequestTime = Date.now();
  }

  /**
   * Get realistic Chrome browser headers
   * Keeps entire header set consistent to avoid fingerprinting detection
   */
  protected getBrowserHeaders(): HeadersInit {
    return {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Standalone rate-limited fetch function
 *
 * Creates a new SiteScraperBase instance for one-off requests.
 * For multiple requests, instantiate SiteScraperBase directly.
 *
 * @param url - The URL to fetch
 * @param config - Optional rate limiter configuration
 * @returns The response body as text
 */
export async function fetchWithRateLimit(
  url: string,
  config?: Partial<RateLimiterConfig>
): Promise<string> {
  const scraper = new SiteScraperBase(config);
  return scraper.fetchWithRateLimit(url);
}
