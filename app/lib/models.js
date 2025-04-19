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
  try {
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
      throw new Error(`Sonnet API error: ${JSON.stringify(data)}`);
    }

    return {
      text: data.content[0].text,
      model: "Claude Sonnet",
      rawResponse: data,
      responseTime: responseTime, // Add this line
      promptTokens: data.usage?.input_tokens || null,
      completionTokens: data.usage?.output_tokens || null,
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
  modelVersion = "gemini-1.5-pro"
) {
  try {
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
  } catch (error) {
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
    const startTime = Date.now();
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


    const endTime = Date.now();
    const responseTime = endTime - startTime;


    return {
      text: data.output?.[0]?.content?.[0]?.text || "No response text",
      model: "ChatGPT",
      rawResponse: data,
      responseTime: responseTime,
      promptTokens: data.usage?.input_tokens || null,
      completionTokens: data.usage?.output_tokens || null,
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
  customInstructions = null,
  analysisContext = ""

) {
  try {

    // Use custom instructions if provided, otherwise use default
    let systemInstructions = customInstructions;

    if (!systemInstructions) {
      // Adjust instructions based on number of responses
      if (responses.length === 1) {
        systemInstructions = `
          System Instructions:
          - You are an expert at analyzing outputs from language models
          - Your job is to analyze the output of this model and provide detailed feedback
          - Process the following output and provide insights
          - If the output contains code, look for security vulnerabilities or bad practices, and highlight them
          - If the output contains text, look for grammar issues, and highlight them
          - If the output contains any other content, look for any issues and highlight them
          - Provide a detailed analysis of the quality, accuracy, and completeness of the response
          - Assess the style, tone, and effectiveness of the communication
          - Identify strengths and areas for improvement in the response
          - Your analysis should be done in a markdown format
          - Use bullet points and lists to make the analysis easy to read
          - Use code blocks for any code snippets
          - Use tables for any comparisons
          - Use headers to separate different sections of the analysis
          - Use bold and italics to emphasize important points
          - Break each section into markdown sections with headers, use lists, and formatting
        `;
      } else {
        // Original instructions for multiple models
        systemInstructions = `
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
