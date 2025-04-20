"use server";

import { GoogleGenAI } from '@google/genai';
import { exec } from "child_process";
import { promisify } from "util";
import { VertexAI } from '@google-cloud/vertexai';
import { cookies } from 'next/headers';
import { MODEL_NAME_TO_ID, MODEL_CONFIGS } from "../config/models";
import { withRetry, isRetryableError } from "../utils/retry";

const execAsync = promisify(exec);

// Helper to get credentials from either env vars or client-side storage
export async function getCredentials() {
  // Server env variables take precedence
  const envCredentials = {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    googleProjectId: process.env.GOOGLE_PROJECT_ID || ''
  };

  // Only in development mode we check for client-provided credentials
  if (process.env.NODE_ENV !== 'production') {
    const cookieStore = await cookies();
    const clientCreds = {
      anthropicApiKey: await cookieStore.get('anthropic_api_key')?.value || '',
      openaiApiKey: await cookieStore.get('openai_api_key')?.value || '',
      googleProjectId: await cookieStore.get('google_project_id')?.value || ''
    };

    // Use client credentials if available
    return {
      anthropicApiKey: clientCreds.anthropicApiKey || envCredentials.anthropicApiKey,
      openaiApiKey: clientCreds.openaiApiKey || envCredentials.openaiApiKey,
      googleProjectId: clientCreds.googleProjectId || envCredentials.googleProjectId
    };
  }

  return envCredentials;
}

export async function callSonnet(
  prompt,
  systemInstructions,
  temperature = 0.7,
  maxTokens = 4096,
  modelVersion = "claude-3-7-sonnet-20250219"
) {
  return withRetry(
    async () => {
      const credentials = await getCredentials();
      const apiKey = credentials.anthropicApiKey;

      if (!apiKey) {
        throw new Error("Anthropic API key not configured. Please set up your API key in LLM Connectivity Settings.");
      }

      const startTime = Date.now();

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: modelVersion,
          max_tokens: maxTokens,
          temperature: temperature,
          system: systemInstructions || "You are a helpful assistant.",
          messages: [
            { role: "user", content: prompt }
          ]
        }),
      });

      const data = await response.json();

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (!response.ok) {
        const error = new Error(`Sonnet API error: ${JSON.stringify(data)}`);
        error.status = response.status;
        throw error;
      }

      return {
        text: data.content[0].text,
        model: "Claude Sonnet",
        rawResponse: data,
        responseTime: responseTime,
        promptTokens: data.usage?.input_tokens || null,
        completionTokens: data.usage?.output_tokens || null,
      };
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      shouldRetry: isRetryableError,
      onRetry: (error, attempt) => console.log(`Retrying Claude API call (attempt ${attempt}/2): ${error.message}`)
    }
  ).catch(error => {
    console.error("Error calling Sonnet:", error);
    return {
      text: `Error: ${error.message}`,
      model: "Claude Sonnet",
      error: true
    };
  });
}

export async function callGemini(
  prompt,
  systemInstructions,
  temperature = 0.7,
  maxTokens = 4096,
  modelVersion = "gemini-1.5-pro"
) {
  return withRetry(
    async () => {
      const startTime = Date.now();
      const credentials = await getCredentials();
      const projectId = credentials.googleProjectId;
      
      if (!projectId) {
        throw new Error("Google Cloud Project ID is required");
      }
      
      // Setup Vertex AI connection
      const vertexAi = new VertexAI({
        project: projectId,
        location: 'us-central1',
      });

      // Create model instance
      const generativeModel = vertexAi.getGenerativeModel({
        model: modelVersion,
        systemInstruction: systemInstructions,
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens,
        },
      });

      // Create request parts
      const requestContent = [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ];

      // Get response
      const response = await generativeModel.generateContent({
        contents: requestContent,
      });
      
      const result = response.response;
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Extract token usage from usageMetadata
      const promptTokens = result.usageMetadata?.promptTokenCount || 0;
      const completionTokens = result.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = result.usageMetadata?.totalTokenCount || 0;

      // Extract text from response
      const fullText = result.candidates[0]?.content?.parts[0]?.text || '';
      
      return {
        text: fullText,
        model: "Gemini",
        rawResponse: result,
        responseTime: responseTime,
        promptTokens: promptTokens,
        completionTokens: completionTokens,
        totalTokens: totalTokens
      };
    },
    {
      maxRetries: 3,
      baseDelay: 2000,
      shouldRetry: isRetryableError,
      onRetry: (error, attempt) => console.log(`Retrying Gemini API call (attempt ${attempt}/3): ${error.message}`)
    }
  ).catch(error => {
    console.error("Error calling Gemini:", error);
    
    // Return a structured error
    return {
      text: `Error: ${error.message}`,
      model: "Gemini",
      error: true,
      // Provide placeholder token values for consistency in error case
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };
  });
}

export async function callChatGPT(
  prompt,
  systemInstructions,
  temperature = 0.7,
  maxTokens = 4096,
  modelVersion = "gpt-4o"
) {
  return withRetry(
    async () => {
      const startTime = Date.now();
      const credentials = await getCredentials();
      const apiKey = credentials.openaiApiKey;

      if (!apiKey) {
        throw new Error("OpenAI API key not configured. Please set up your API key in LLM Connectivity Settings.");
      }

      // Use the proper OpenAI chat completions endpoint
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelVersion,
          messages: [
            {
              role: "system",
              content: systemInstructions || "You are a helpful assistant."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: temperature,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(`ChatGPT API error: ${JSON.stringify(data)}`);
        error.status = response.status;
        throw error;
      }

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        text: data.choices[0]?.message?.content || "No response text",
        model: "ChatGPT",
        rawResponse: data,
        responseTime: responseTime,
        promptTokens: data.usage?.prompt_tokens || null,
        completionTokens: data.usage?.completion_tokens || null,
        totalTokens: data.usage?.total_tokens || null,
      };
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      shouldRetry: isRetryableError,
      onRetry: (error, attempt) => console.log(`Retrying ChatGPT API call (attempt ${attempt}/2): ${error.message}`)
    }
  ).catch(error => {
    console.error("Error calling ChatGPT:", error);
    return {
      text: `Error: ${error.message}`,
      model: "ChatGPT",
      error: true
    };
  });
}

  export async function analyzeResponses(
    responses,
    analyzerModel = "ChatGPT",
    modelVersion = null,
    customInstructions = null,
    analysisContext = ""
  ) {
    try {
      let selectedModelVersion = modelVersion;
  
      if (!selectedModelVersion) {
        // Get the model ID from the name
        const modelId = MODEL_NAME_TO_ID[analyzerModel];
        
        if (!modelId) {
          console.warn(`Unknown model name: ${analyzerModel}, falling back to ChatGPT`);
        }
        
        // Get the default version from the config
        const actualModelId = modelId || "chatgpt";
        selectedModelVersion = MODEL_CONFIGS[actualModelId].defaultVersion;
      }
  
      // Use custom instructions if provided, otherwise use default
      let systemInstructions = customInstructions;
  
      if (!systemInstructions) {
        // Adjust instructions based on number of responses
        if (responses.length === 1) {
          systemInstructions = `
            System Instructions:
            - You are an expert at analyzing outputs from language models
            // ... rest of the instructions remain the same
          `;
        } else {
          systemInstructions = `
            System Instructions:
            - You are an expert at analyzing differences between different LLMs
            // ... rest of the instructions remain the same
          `;
        }
      }
  
      // Construct the analysis prompt
      let analysisPrompt;
      if (responses.length === 1) {
        analysisPrompt = `
          ${systemInstructions}
          
          ${analysisContext ? `Analysis Context: ${analysisContext}\n\n` : ""}
          Model: ${responses[0].model}
          Response: ${responses[0].text}
        `;
      } else {
        analysisPrompt = `
          ${systemInstructions}
          
          ${analysisContext ? `Analysis Context: ${analysisContext}\n\n` : ""}
          ${responses.map(r => `${r.model}: ${r.text}`).join('\n\n')}
        `;
      }
  
      // Call the selected model for analysis with retry logic
      let analysisFunction;
      switch (analyzerModel) {
        case "Claude Sonnet":
          analysisFunction = () => callSonnet(analysisPrompt, "", 0.3, 4096, selectedModelVersion);
          break;
        case "Gemini":
          analysisFunction = () => callGemini(analysisPrompt, "", 0.3, 4096, selectedModelVersion);
          break;
        case "ChatGPT":
        default:
          analysisFunction = () => callChatGPT(analysisPrompt, "", 0.3, 4096, selectedModelVersion);
      }
      
      // The actual API calls already have retry logic from their respective functions
      const analysisResult = await analysisFunction();
  
      // Check if the analysis failed
      if (analysisResult.error) {
        throw new Error(`Analysis failed: ${analysisResult.text}`);
      }
  
      return {
        text: analysisResult.text,
        model: analyzerModel,
        rawResponse: analysisResult.rawResponse
      };
    } catch (error) {
      console.error("Error analyzing responses:", error);
      return {
        text: `Error analyzing responses: ${error.message}`,
        model: analyzerModel,
        error: true
      };
    }
  }