import { NextResponse } from 'next/server';
import { callSonnet, callGemini, callChatGPT, analyzeResponses } from '../../lib/models';
import { analyzeSentiment } from '../../lib/sentiment';
import { DEFAULT_ANALYSIS_INSTRUCTIONS } from '../../utils/system-instructions';

// Main function to handle both POST and GET requests
export async function POST(request) {
  return await handleRequest(request);
}

export async function GET(request) {
  return await handleRequest(request);
}

async function handleRequest(request) {
  try {
    // Parse query parameters for GET or body for POST
    let params;
    if (request.method === 'GET') {
      const url = new URL(request.url);
      params = Object.fromEntries(url.searchParams);
      
      // Parse any JSON strings in query params
      for (const key in params) {
        try {
          if (params[key].startsWith('[') || params[key].startsWith('{')) {
            params[key] = JSON.parse(params[key]);
          }
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
    } else {
      params = await request.json();
    }

    // Extract parameters with defaults
    const {
      prompt,
      system_instructions = '',
      models = [],
      temperature = 0.7,
      max_tokens = 2048,
      analyze_responses = false,
      analyze_responses_model = 'ChatGPT',
      metrics = false,
      model_versions = {}
    } = params;

    // Validate required parameters
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!Array.isArray(models) || models.length === 0) {
      return NextResponse.json({ error: 'At least one model must be specified' }, { status: 400 });
    }

    // Define model mapping
    const MODEL_MAPPING = {
      'claude': {
        func: callSonnet,
        defaultVersion: 'claude-3-7-sonnet-20250219'
      },
      'gemini': {
        func: callGemini,
        defaultVersion: 'gemini-2.0-flash-001'
      },
      'chatgpt': {
        func: callChatGPT,
        defaultVersion: 'gpt-4o'
      }
    };

    // Process each model
    const modelPromises = [];
    const validModels = [];
    const invalidModels = [];

    for (const model of models) {
      const modelConfig = MODEL_MAPPING[model.toLowerCase()];
      if (!modelConfig) {
        invalidModels.push({
          model,
          error: 'Unsupported model. Supported models are: claude, gemini, chatgpt'
        });
        continue;
      }

      // Use specified version or default
      const modelVersion = model_versions[model.toLowerCase()] || modelConfig.defaultVersion;

      try {
        // Queue the model call
        modelPromises.push(
          modelConfig.func(prompt, system_instructions, temperature, max_tokens, modelVersion)
            .then(response => {
              // Base64 encode the response text for consistent transfer
              const encodedResponse = Buffer.from(response.text).toString('base64');
              return {
                ...response,
                encoded_text: encodedResponse
              };
            })
            .catch(error => {
              invalidModels.push({
                model,
                error: error.message
              });
              return null;
            })
        );
        validModels.push(model);
      } catch (error) {
        invalidModels.push({
          model,
          error: error.message
        });
      }
    }

    // Wait for all model responses
    const modelResponses = await Promise.all(modelPromises);
    
    // Filter out nulls from failed requests
    const successfulResponses = modelResponses.filter(r => r !== null);

    // Prepare result object
    const result = {
      timestamp: new Date().toISOString(),
      prompt,
      system_instructions,
      models_requested: models,
      models_processed: validModels,
      models_failed: invalidModels,
      responses: successfulResponses
    };

    // If there are no successful responses, return early
    if (successfulResponses.length === 0) {
      return NextResponse.json({
        ...result,
        error: 'No models could be processed successfully'
      }, { status: 400 });
    }

    // Calculate metrics if requested
    if (metrics) {
      result.metrics = await calculateMetrics(successfulResponses);
    }

    // Perform response analysis if requested
    if (analyze_responses && successfulResponses.length > 0) {
      const analysisResult = await analyzeResponses(
        successfulResponses,
        analyze_responses_model,
        null, // Use default version
        DEFAULT_ANALYSIS_INSTRUCTIONS,
        `API-requested analysis of ${successfulResponses.length} model responses to prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`
      );

      result.analysis = {
        model: analyze_responses_model,
        text: analysisResult.text,
        encoded_text: Buffer.from(analysisResult.text).toString('base64')
      };
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Function to calculate metrics for responses
async function calculateMetrics(responses) {
  // Initialize metrics containers
  const metrics = {
    response_length: {},
    word_count: {},
    token_usage: {},
    response_time: {},
    complexity: {},
    sentiment: {}
  };

  // Calculate basic metrics
  for (const response of responses) {
    const model = response.model;
    const text = response.text;
    
    // Response length (characters)
    metrics.response_length[model] = text.length;
    
    // Word count
    metrics.word_count[model] = text.trim().split(/\s+/).length;
    
    // Token usage if available
    if (response.promptTokens !== undefined || response.completionTokens !== undefined) {
      metrics.token_usage[model] = {
        prompt_tokens: response.promptTokens || 0,
        completion_tokens: response.completionTokens || 0,
        total_tokens: response.totalTokens || 
          (response.promptTokens + response.completionTokens) || 0
      };
    }
    
    // Response time
    if (response.responseTime) {
      metrics.response_time[model] = {
        ms: response.responseTime,
        seconds: response.responseTime / 1000
      };
    }
    
    // Text complexity (based on word and sentence length)
    const words = text.trim().split(/\s+/);
    const avgWordLength = words.length > 0 ? 
      words.reduce((sum, word) => sum + word.length, 0) / words.length : 0;
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.length > 0 ?
      words.length / sentences.length : 0;
    
    metrics.complexity[model] = {
      avg_word_length: avgWordLength,
      avg_sentence_length: avgSentenceLength,
      complexity_score: (avgWordLength * 0.6) + (avgSentenceLength * 0.4)
    };
  }
  
  // Calculate sentiment (async)
  for (const response of responses) {
    try {
      const sentiment = await analyzeSentiment(response.text, response.model);
      metrics.sentiment[response.model] = {
        score: sentiment.score,
        magnitude: sentiment.magnitude || 0,
        using_gcp_api: sentiment.success || false
      };
    } catch (error) {
      console.error(`Error analyzing sentiment for ${response.model}:`, error);
      metrics.sentiment[response.model] = {
        error: error.message,
        score: 0,
        magnitude: 0,
        using_gcp_api: false
      };
    }
  }
  
  return metrics;
}