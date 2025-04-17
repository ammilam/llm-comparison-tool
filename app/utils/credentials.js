"use client";

// This utility helps sync credentials between localStorage and cookies for server access
export function syncCredentials() {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  
  // Get credentials from localStorage
  const anthropicApiKey = localStorage.getItem('anthropic_api_key');
  const openaiApiKey = localStorage.getItem('openai_api_key');
  const googleProjectId = localStorage.getItem('google_project_id');

  // Set cookies to make them available to the server
  if (anthropicApiKey) {
    document.cookie = `anthropic_api_key=${anthropicApiKey}; path=/; max-age=3600; SameSite=Strict`;
  }
  
  if (openaiApiKey) {
    document.cookie = `openai_api_key=${openaiApiKey}; path=/; max-age=3600; SameSite=Strict`;
  }
  
  if (googleProjectId) {
    document.cookie = `google_project_id=${googleProjectId}; path=/; max-age=3600; SameSite=Strict`;
  }
}