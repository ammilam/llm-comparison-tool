
/**
 * Centralized model configuration for the LLM Comparison Tool
 * This file is used by both the frontend UI and API
 */

export const MODEL_PROVIDERS = {
    CLAUDE: 'claude',
    GEMINI: 'gemini',
    CHATGPT: 'chatgpt'
  };
  
  export const MODEL_CONFIGS = {
    [MODEL_PROVIDERS.CLAUDE]: {
      name: "Claude Sonnet",
      func: "callSonnet",
      versions: [
        { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet" },
        { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet" },
        { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
        { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" }
      ],
      defaultVersion: "claude-3-7-sonnet-20250219"
    },
    [MODEL_PROVIDERS.GEMINI]: {
      name: "Gemini",
      func: "callGemini",
      versions: [
        { id: "gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
        { id: "gemini-2.0-pro-001", name: "Gemini 2.0 Pro" },
        { id: "gemini-1.5-flash-001", name: "Gemini 1.5 Flash" },
        { id: "gemini-1.5-pro-001", name: "Gemini 1.5 Pro" }
      ],
      defaultVersion: "gemini-2.0-flash-001"
    },
    [MODEL_PROVIDERS.CHATGPT]: {
      name: "ChatGPT",
      func: "callChatGPT",
      versions: [
        { id: "gpt-4o", name: "GPT-4o" },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
        { id: "gpt-4", name: "GPT-4" },
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" }
      ],
      defaultVersion: "gpt-4o"
    }
  };
  
  /**
   * Map a model provider name to its ID and vice versa
   */
  export const MODEL_NAME_TO_ID = {
    "Claude Sonnet": MODEL_PROVIDERS.CLAUDE,
    "Gemini": MODEL_PROVIDERS.GEMINI,
    "ChatGPT": MODEL_PROVIDERS.CHATGPT
  };
  
  export const MODEL_ID_TO_NAME = {
    [MODEL_PROVIDERS.CLAUDE]: "Claude Sonnet",
    [MODEL_PROVIDERS.GEMINI]: "Gemini",
    [MODEL_PROVIDERS.CHATGPT]: "ChatGPT"
  };
  
  /**
   * Default model for analysis
   */
  export const DEFAULT_ANALYSIS_MODEL = MODEL_PROVIDERS.CHATGPT;
  
  /**
   * Get a list of all available models in the format needed by the frontend
   */
  export function getAvailableModels() {
    return Object.entries(MODEL_CONFIGS).map(([id, config]) => ({
      id,
      name: config.name
    }));
  }
  
  /**
   * Validate if a model ID is supported
   */
  export function isValidModelId(modelId) {
    return MODEL_CONFIGS.hasOwnProperty(modelId);
  }
  
  /**
   * Get default version for a model
   */
  export function getDefaultVersion(modelId) {
    return MODEL_CONFIGS[modelId]?.defaultVersion;
  }
  
  /**
   * Find the appropriate model function name for a given model ID
   */
  export function getModelFuncName(modelId) {
    return MODEL_CONFIGS[modelId]?.func;
  }
  
  /**
   * Normalize model identifiers (convert names to IDs and ensure proper format)
   */
  export function normalizeModelIdentifier(modelIdentifier) {
    // If it's already a valid model ID, return it
    if (isValidModelId(modelIdentifier)) {
      return modelIdentifier;
    }
    
    // If it's a model name, convert to ID
    const modelId = MODEL_NAME_TO_ID[modelIdentifier];
    if (modelId) {
      return modelId;
    }
    
    // Try lowercase version
    const lowercaseId = modelIdentifier.toLowerCase();
    if (isValidModelId(lowercaseId)) {
      return lowercaseId;
    }
    
    // Return the original if we can't normalize
    return modelIdentifier;
  }