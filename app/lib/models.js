"use server";

import { GoogleGenAI } from '@google/genai';
import { exec } from "child_process";
import { promisify } from "util";
import { VertexAI } from '@google-cloud/vertexai';
import { cookies } from 'next/headers';
const execAsync = promisify(exec);

// Helper to get credentials from either env vars or client-side storage
async function getCredentials() {
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
      anthropicApiKey: cookieStore.get('anthropic_api_key')?.value || '',
      openaiApiKey: cookieStore.get('openai_api_key')?.value || '',
      googleProjectId: cookieStore.get('google_project_id')?.value || ''
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
  try {
    const credentials = await getCredentials();
    const apiKey = credentials.anthropicApiKey;
    
    if (!apiKey) {
      throw new Error("Anthropic API key not configured. Please set up your API key in LLM Connectivity Settings.");
    }
    
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
    
    if (!response.ok) {
      throw new Error(`Sonnet API error: ${JSON.stringify(data)}`);
    }
    
    return {
      text: data.content[0].text,
      model: "Claude Sonnet",
      rawResponse: data
    };
  } catch (error) {
    console.error("Error calling Sonnet:", error);
    return { 
      text: `Error: ${error.message}`,
      model: "Claude Sonnet",
      error: true
    };
  }
}

export async function callGemini(
  prompt, 
  systemInstructions, 
  temperature = 0.7, 
  maxTokens = 4096,
  modelVersion = "gemini-2.0-flash-001"
) {
  try {
    const credentials = await getCredentials();
    const projectId = credentials.googleProjectId;
    
    if (!projectId) {
      throw new Error("Google Project ID not configured. Please set up your Project ID in LLM Connectivity Settings.");
    }
    
    // Initialize the Vertex AI client
    const location = "us-central1";
    
    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
      systemInstructions
    });
    
    // Get the Gemini model
    const generativeModel = vertexAI.preview.getGenerativeModel({
      model: modelVersion,
      generation_config: {
        max_output_tokens: maxTokens,
        temperature: temperature,
        top_p: 0.8,
      },
      safety_settings: [
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
      ],
    });
    
    // Prepare request content
    const requestContent = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    };
    
    // Generate content with streaming
    const streamingResponse = await generativeModel.generateContentStream(requestContent);
    
    // Collect all chunks of the response
    let fullText = '';
    const rawChunks = [];
    
    for await (const chunk of streamingResponse.stream) {
      if (chunk.candidates && 
          chunk.candidates[0] && 
          chunk.candidates[0].content && 
          chunk.candidates[0].content.parts && 
          chunk.candidates[0].content.parts[0]) {
        const text = chunk.candidates[0].content.parts[0].text || '';
        fullText += text;
      }
      rawChunks.push(chunk);
    }
    
    return {
      text: fullText,
      model: "Gemini",
      rawResponse: rawChunks
    };
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return { 
      text: `Error: ${error.message}`,
      model: "Gemini",
      error: true
    };
  }
}

export async function callChatGPT(
  prompt, 
  systemInstructions, 
  temperature = 0.7, 
  maxTokens = 4096,
  modelVersion = "gpt-4o"
) {
  try {
    const credentials = await getCredentials();
    const apiKey = credentials.openaiApiKey;
    
    if (!apiKey) {
      throw new Error("OpenAI API key not configured. Please set up your API key in LLM Connectivity Settings.");
    }
    
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelVersion,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: systemInstructions || "You are a helpful assistant."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt
              }
            ]
          }
        ],
        text: {
          format: {
            type: "text"
          }
        },
        reasoning: {},
        tools: [],
        temperature: temperature,
        max_output_tokens: maxTokens,
        top_p: 1,
        store: true
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`ChatGPT API error: ${JSON.stringify(data)}`);
    }
    
    return {
      text: data.output?.[0]?.content?.[0]?.text || "No response text",
      model: "ChatGPT",
      rawResponse: data
    };
  } catch (error) {
    console.error("Error calling ChatGPT:", error);
    return { 
      text: `Error: ${error.message}`,
      model: "ChatGPT",
      error: true
    };
  }
}

export async function analyzeResponses(
  responses, 
  analyzerModel = "ChatGPT", 
  modelVersion = null,
  customInstructions = null
) {
  try {
    // Use custom instructions if provided, otherwise use default
    const systemInstructions = customInstructions || `
      System Instructions:
      - You are an expert at analyzing differences between different LLMs
      - Your job is to analyze the outputs of the models and provide a detailed comparison
      - Different models are fed the same prompt, and their outputs are captured, and passed to you for analysis
      - Process the following outputs and distinguish the differences between the models.
      - If the outputs contain code, look for security vulnerabilities or bad practices, and highlight them
      - If the outputs contain text, look for grammar issues, and highlight them
      - If the outputs contain any other content, look for any issues and highlight them
      - Provide a detailed analysis of the differences between the models
      - Provide a summary of the differences between the models
      - Provide a summary of the strengths and weaknesses of each model
      - Provide a summary of the overall performance of each model
      - At the bottom provide which model you think is the best overall pick
      - Your analysis should be done in a markdown format
      - Use bullet points and lists to make the analysis easy to read
      - Use code blocks for any code snippets
      - Use tables for any comparisons
      - Use headers to separate different sections of the analysis
      - Use bold and italics to emphasize important points
      - Use links to any relevant resources
      - Break each section into markdown sections with headers, use lists, and formatting
    `;

    // Construct the analysis prompt
    const analysisPrompt = `
      ${systemInstructions}

      ${responses.map(r => `${r.model}: ${r.text}`).join('\n\n')}
    `;

    // Call the selected model for analysis
    let analysisResult;
    switch (analyzerModel) {
      case "Claude Sonnet":
        analysisResult = await callSonnet(analysisPrompt, "", 0.3, 8000, modelVersion);
        break;
      case "Gemini":
        analysisResult = await callGemini(analysisPrompt, "", 0.3, 8000, modelVersion);
        break;
      case "ChatGPT":
      default:
        analysisResult = await callChatGPT(analysisPrompt, "", 0.3, 8000, modelVersion);
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
