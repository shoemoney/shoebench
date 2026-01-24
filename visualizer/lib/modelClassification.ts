/**
 * Model classification utilities
 * Categorizes vision models as open-source, closed, or free
 */

export type ModelType = 'open' | 'closed' | 'free';

// Closed-source providers (proprietary APIs)
const CLOSED_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'x-ai',
  'perplexity',
  'amazon',
  'baidu',
  'z-ai',
  'stepfun-ai',
  'deepcogito',
];

// Open-source model providers
const OPEN_PROVIDERS = [
  'meta-llama',
  'qwen',
  'mistralai',
  'nvidia',
  'allenai',
  'bytedance',
  'bytedance-seed',
  'black-forest-labs',
];

/**
 * Classify a model by its provider and name
 */
export function classifyModel(modelName: string): ModelType {
  // Free tier models (marked with :free suffix)
  if (modelName.endsWith(':free')) {
    return 'free';
  }

  const provider = modelName.split('/')[0]?.toLowerCase() || '';

  // Check closed providers
  if (CLOSED_PROVIDERS.includes(provider)) {
    return 'closed';
  }

  // Check open providers
  if (OPEN_PROVIDERS.includes(provider)) {
    return 'open';
  }

  // Default to closed for unknown providers
  return 'closed';
}

/**
 * Get display label for model type
 */
export function getModelTypeLabel(type: ModelType): string {
  switch (type) {
    case 'open':
      return 'Open Source';
    case 'closed':
      return 'Closed';
    case 'free':
      return 'Free';
  }
}

/**
 * Get color classes for model type badge
 */
export function getModelTypeColor(type: ModelType): string {
  switch (type) {
    case 'open':
      return 'border-green-600 text-green-400 bg-green-950/50';
    case 'closed':
      return 'border-blue-600 text-blue-400 bg-blue-950/50';
    case 'free':
      return 'border-purple-600 text-purple-400 bg-purple-950/50';
  }
}

/**
 * Classify all models and return counts by type
 */
export function getModelTypeCounts(modelNames: string[]): Record<ModelType, number> {
  const counts: Record<ModelType, number> = { open: 0, closed: 0, free: 0 };

  for (const name of modelNames) {
    const type = classifyModel(name);
    counts[type]++;
  }

  return counts;
}
