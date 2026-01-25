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
