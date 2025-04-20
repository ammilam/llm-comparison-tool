import { NextResponse } from 'next/server';
import { callSonnet, callGemini, callChatGPT, analyzeResponses } from '../../lib/models';
import { analyzeSentiment } from '../../lib/sentiment';
import { DEFAULT_ANALYSIS_INSTRUCTIONS } from '../../utils/system-instructions';
import { 
  MODEL_CONFIGS, 
  MODEL_PROVIDERS, 
  MODEL_ID_TO_NAME,
  DEFAULT_ANALYSIS_MODEL,
  normalizeModelIdentifier,
  isValidModelId
} from '../../config/models';

// Only handle POST requests with JSON payload
export async function POST(request) {
  try {
    // Parse request body as JSON
    let params;
    try {
      params = await request.json();
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }

    // Extract parameters with defaults
    const {
      prompt,
      system_instructions = '',
      models = [],
      temperature = 0.7,
      max_tokens = 2048,
      analyze_responses = false,
      analyze_responses_model = DEFAULT_ANALYSIS_MODEL, // Default from config
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

    // Process each model
    const modelPromises = [];
    const validModels = [];
    const invalidModels = [];

    // Map of model functions
    const modelFunctions = {
      [MODEL_CONFIGS[MODEL_PROVIDERS.CLAUDE].func]: callSonnet,
      [MODEL_CONFIGS[MODEL_PROVIDERS.GEMINI].func]: callGemini,
      [MODEL_CONFIGS[MODEL_PROVIDERS.CHATGPT].func]: callChatGPT
    };

    // Process each requested model
    for (const modelIdentifier of models) {
      // Normalize the model identifier (handle different formats)
      const modelId = normalizeModelIdentifier(modelIdentifier);
      
      // Check if the model is valid
      if (!isValidModelId(modelId)) {
        invalidModels.push({
          model: modelIdentifier,
          error: `Unsupported model. Supported models are: ${Object.keys(MODEL_CONFIGS).join(', ')}`
        });
        continue;
      }

      // Get the model configuration
      const modelConfig = MODEL_CONFIGS[modelId];
      
      // Get the function to call the model
      const modelFunction = modelFunctions[modelConfig.func];
      if (!modelFunction) {
        invalidModels.push({
          model: modelIdentifier,
          error: `Model function not available: ${modelConfig.func}`
        });
        continue;
      }

      // Use specified version or default
      const modelVersion = model_versions[modelId] || modelConfig.defaultVersion;

      try {
        // Queue the model call
        modelPromises.push(
          modelFunction(prompt, system_instructions, temperature, max_tokens, modelVersion)
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
                model: modelIdentifier,
                error: error.message
              });
              return null;
            })
        );
        validModels.push(modelIdentifier);
      } catch (error) {
        invalidModels.push({
          model: modelIdentifier,
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
      try {
        // Normalize the analyzer model identifier
        const analyzerModelId = normalizeModelIdentifier(analyze_responses_model);
        
        // If not a valid model ID, fall back to default
        const finalAnalyzerModelId = isValidModelId(analyzerModelId) ? 
          analyzerModelId : DEFAULT_ANALYSIS_MODEL;
        
        // Get the proper model name for the analyzer
        const analyzerModelName = MODEL_ID_TO_NAME[finalAnalyzerModelId];
        
        // Get the appropriate model version
        const analysisModelVersion = model_versions[finalAnalyzerModelId] || 
          MODEL_CONFIGS[finalAnalyzerModelId].defaultVersion;
        
        console.log(`Using ${analyzerModelName} (${finalAnalyzerModelId}) for analysis with version: ${analysisModelVersion}`);
        
        const analysisContext = `API-requested analysis of ${successfulResponses.length} model responses to prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`;
        
        // Prepare responses for analysis by decoding the base64 text
        const responsesForAnalysis = successfulResponses.map(r => ({
          ...r,
          text: Buffer.from(r.encoded_text, 'base64').toString()
        }));
        
        // Call the analysis function
        const analysisResult = await analyzeResponses(
          responsesForAnalysis,
          analyzerModelName,
          analysisModelVersion,
          DEFAULT_ANALYSIS_INSTRUCTIONS,
          analysisContext
        );
    
        result.analysis = {
          model: analyzerModelName,
          model_id: finalAnalyzerModelId,
          version: analysisModelVersion,
          text: analysisResult.text,
          encoded_text: Buffer.from(analysisResult.text).toString('base64')
        };
      } catch (error) {
        console.error('Analysis error:', error);
        result.analysis = {
          error: `Analysis failed: ${error.message}`,
          model: analyze_responses_model
        };
      }
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
    
    // Decode the base64 text for analysis
    const text = Buffer.from(response.encoded_text, 'base64').toString();
    
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
  try {
    for (const response of responses) {
      const text = Buffer.from(response.encoded_text, 'base64').toString();
      const sentiment = await analyzeSentiment(text, response.model);
      
      metrics.sentiment[response.model] = {
        score: sentiment.score,
        magnitude: sentiment.magnitude || 0,
        using_gcp_api: sentiment.success || false
      };
    }
  } catch (error) {
    console.error(`Error analyzing sentiment:`, error);
   
    for (const response of responses) {
      metrics.sentiment[response.model] = {
        error: `Sentiment analysis failed: ${error.message}`
      };
    }
  }
  
  return metrics;
}