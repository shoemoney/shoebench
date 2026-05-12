// Provider icons for model names
export function getProviderIcon(modelName: string): string {
  if (modelName.startsWith("openai/")) return "֎ ";
  if (modelName.startsWith("anthropic/")) return "⚛ ";
  if (modelName.startsWith("google/")) return "✦︎ ";
  if (modelName.startsWith("meta-llama/")) return "🦙 ";
  return "";
}

export function getShortName(fullName: string): string {
  return fullName
    .replace("openai/", "")
    .replace("anthropic/", "")
    .replace("google/", "")
    .replace("meta-llama/", "");
}

export function formatModelName(modelName: string): string {
  const icon = getProviderIcon(modelName);
  const shortName = getShortName(modelName);
  return `${icon}${shortName}`;
}

export function getProviderFromModel(modelName: string): string {
  if (modelName.startsWith("openai/")) return "openai";
  if (modelName.startsWith("anthropic/")) return "anthropic";
  if (modelName.startsWith("google/")) return "google";
  if (modelName.startsWith("meta-llama/")) return "meta";
  return "other";
}

// Provider logo URLs (from simple-icons CDN)
export const PROVIDER_LOGOS: Record<string, string> = {
  openai: "https://cdn.simpleicons.org/openai/white",
  anthropic: "https://cdn.simpleicons.org/anthropic/white",
  google: "https://cdn.simpleicons.org/google/white",
  meta: "https://cdn.simpleicons.org/meta/white",
};
