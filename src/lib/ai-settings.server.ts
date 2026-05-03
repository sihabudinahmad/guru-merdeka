import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export type AiModelTier = "free" | "paid";

export type AiModelOption = {
  id: string;
  label: string;
  tier: AiModelTier;
  description: string;
  enabled: boolean;
};

export type AiSettingsRecord = {
  providerLabel: string;
  apiBaseUrl: string;
  apiKey: string;
  activeModel: string;
  activeTier: AiModelTier;
  modelCatalog: AiModelOption[];
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const DEFAULT_BASE_URL =
  process.env.AI_GATEWAY_URL ?? "https://api.blackbox.ai/chat/completions";
const DEFAULT_API_KEY = process.env.AI_GATEWAY_API_KEY ?? process.env.LOVABLE_API_KEY ?? "";
const DEFAULT_PROVIDER_LABEL = "Blackbox AI";

const DEFAULT_MODEL_CATALOG: AiModelOption[] = [
  {
    id: process.env.AI_MODEL ?? "blackbox",
    label: "Blackbox (Recommended)",
    tier: "free",
    description: "Model default Blackbox AI, optimal untuk Indonesian language.",
    enabled: true,
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    tier: "paid",
    description: "OpenAI GPT-4 Omni - Lebih capable untuk reasoning kompleks.",
    enabled: true,
  },
  {
    id: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    tier: "paid",
    description: "OpenAI GPT-4 Turbo - Lebih cepat dari GPT-4.",
    enabled: true,
  },
  {
    id: "claude-3-sonnet",
    label: "Claude 3 Sonnet",
    tier: "paid",
    description: "Anthropic Claude 3 Sonnet - Balanced model.",
    enabled: true,
  },
  {
    id: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    tier: "paid",
    description: "Google Gemini 1.5 Pro - Excellent untuk multimodal tasks.",
    enabled: true,
  },
];

function cloneModelCatalog(items: AiModelOption[]): AiModelOption[] {
  return items.map((item) => ({ ...item }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function getFallbackCatalog() {
  return cloneModelCatalog(DEFAULT_MODEL_CATALOG);
}

export function normalizeModelCatalog(input: unknown): AiModelOption[] {
  const source = Array.isArray(input) ? input : [];
  const unique = new Map<string, AiModelOption>();

  for (const rawItem of source) {
    if (!isRecord(rawItem)) continue;

    const id = asTrimmedString(rawItem.id);
    if (!id || unique.has(id)) continue;

    const label = asTrimmedString(rawItem.label, id);
    const tier: AiModelTier = rawItem.tier === "paid" ? "paid" : "free";
    const description = asTrimmedString(rawItem.description);
    const enabled = typeof rawItem.enabled === "boolean" ? rawItem.enabled : true;

    unique.set(id, {
      id,
      label,
      tier,
      description,
      enabled,
    });
  }

  if (!unique.size) {
    return getFallbackCatalog();
  }

  return Array.from(unique.values());
}

export function resolveActiveModel(activeModel: string | undefined, catalog: AiModelOption[]) {
  const enabledCatalog = catalog.filter((item) => item.enabled);
  const pool = enabledCatalog.length ? enabledCatalog : catalog;

  return (
    pool.find((item) => item.id === activeModel) ??
    pool[0] ?? {
      id: DEFAULT_MODEL_CATALOG[0].id,
      label: DEFAULT_MODEL_CATALOG[0].label,
      tier: DEFAULT_MODEL_CATALOG[0].tier,
      description: DEFAULT_MODEL_CATALOG[0].description,
      enabled: true,
    }
  );
}

export function serializeModelCatalog(catalog: AiModelOption[]): Json {
  return catalog as unknown as Json;
}

export async function getAiSettingsRecord(): Promise<AiSettingsRecord> {
  const fallbackCatalog = getFallbackCatalog();
  const fallbackActive = resolveActiveModel(process.env.AI_MODEL, fallbackCatalog);
  const fallback: AiSettingsRecord = {
    providerLabel: DEFAULT_PROVIDER_LABEL,
    apiBaseUrl: DEFAULT_BASE_URL,
    apiKey: DEFAULT_API_KEY,
    activeModel: fallbackActive.id,
    activeTier: fallbackActive.tier,
    modelCatalog: fallbackCatalog,
    isEnabled: true,
  };

  const { data, error } = await supabaseAdmin
    .from("ai_settings")
    .select(
      "provider_label, api_base_url, api_key, active_model, active_tier, model_catalog, is_enabled, created_at, updated_at",
    )
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return fallback;
  }

  const modelCatalog = normalizeModelCatalog(data.model_catalog);
  const activeModel = resolveActiveModel(data.active_model, modelCatalog);

  return {
    providerLabel: asTrimmedString(data.provider_label, fallback.providerLabel),
    apiBaseUrl: asTrimmedString(data.api_base_url, fallback.apiBaseUrl) || fallback.apiBaseUrl,
    apiKey: asTrimmedString(data.api_key) || fallback.apiKey,
    activeModel: activeModel.id,
    activeTier: activeModel.tier,
    modelCatalog,
    isEnabled: data.is_enabled ?? true,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getAiRuntimeConfig() {
  const settings = await getAiSettingsRecord();
  const activeModel = resolveActiveModel(settings.activeModel, settings.modelCatalog);

  return {
    providerLabel: settings.providerLabel,
    url: settings.apiBaseUrl,
    apiKey: settings.apiKey,
    model: activeModel.id,
    tier: activeModel.tier,
    isEnabled: settings.isEnabled,
    modelCatalog: settings.modelCatalog,
  };
}
