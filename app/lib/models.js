"use server";

import { GoogleGenAI } from '@google/genai';
import { exec } from "child_process";
import { promisify } from "util";
import { VertexAI } from '@google-cloud/vertexai';
const execAsync = promisify(exec);

export async function callSonnet(
  prompt, 
  systemInstructions, 
  temperature = 0.7, 
  maxTokens = 4096,
  modelVersion = "claude-3-7-sonnet-20250219"
) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
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
    // Initialize the Vertex AI client
    const projectId = process.env.GOOGLE_PROJECT_ID;
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
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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
  modelVersion = null
) {
  try {
    // Construct the analysis prompt
    const analysisPrompt = `
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
      - Break each section into markdown sections with headers, use lists, and formatting

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