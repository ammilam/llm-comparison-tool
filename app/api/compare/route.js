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

// Add GET handler to return API information
export async function GET(request) {
  try {
    // Prepare API documentation and configuration information
    const apiInfo = {
      name: "LLM Comparison API",
      version: "1.0.0",
      description: "Compare responses from multiple language models",
      endpoints: {
        "GET /api/compare": "Returns API documentation and configuration",
        "POST /api/compare": "Compares responses from specified models"
      },
      supported_models: {},
      default_analysis_model: DEFAULT_ANALYSIS_MODEL,
      parameters: {
        prompt: "The text prompt to send to models (required)",
        system_instructions: "Optional system instructions to guide model behavior",
        models: "Array of model IDs to use (either models or model_versions is required)",
        model_versions: "Object mapping model IDs to specific versions",
        temperature: `Temperature parameter for generation (default: 0.7)`,
        max_tokens: `Maximum tokens to generate (default: 2048)`,
        analyze_responses: "Whether to analyze model responses (default: false)",
        analyze_responses_model: `Model to use for analysis (default: ${DEFAULT_ANALYSIS_MODEL})`,
        analyze_responses_model_version: "Specific version of the analysis model to use",
        metrics: "Whether to return metrics about the responses (default: false)"
      },
      examples: {
        basic: {
          prompt: "Explain quantum computing in simple terms",
          models: ["chatgpt"]
        },
        advanced: {
          prompt: "Compare the theories of relativity and quantum mechanics",
          models: ["claude", "gemini", "chatgpt"],
          system_instructions: "You are a physics professor explaining complex topics",
          temperature: 0.3,
          analyze_responses: true,
          metrics: true
        },
        with_versions: {
          prompt: "What are the ethical implications of AI?",
          model_versions: {
            "claude": "claude-3-opus-20240229",
            "chatgpt": "gpt-4"
          },
          analyze_responses: true,
          analyze_responses_model: "gemini",
          analyze_responses_model_version: "gemini-1.5-pro-001"
        }
      }
    };

    // Add model configuration details
    for (const [modelId, config] of Object.entries(MODEL_CONFIGS)) {
      apiInfo.supported_models[modelId] = {
        name: config.name,
        default_version: config.defaultVersion,
        versions: config.versions
      };
    }

    return NextResponse.json(apiInfo);
  } catch (error) {
    console.error('API info error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Update POST handler with the new features
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
      analyze_responses_model = DEFAULT_ANALYSIS_MODEL,
      analyze_responses_model_version,
      metrics = false,
      model_versions = {}
    } = params;
    
    // Validate required parameters
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Check if either models or model_versions is provided
    const hasModels = Array.isArray(models) && models.length > 0;
    const hasModelVersions = Object.keys(model_versions).length > 0;

    if (!hasModels && !hasModelVersions) {
      return NextResponse.json({ 
        error: 'Either models or model_versions must be specified'
      }, { status: 400 });
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

    // Determine which models to process based on either models array or model_versions object
    let modelsToProcess = [];
    
    if (hasModels) {
      // Process models specified in the models array
      modelsToProcess = models;
    } else {
      // Process models specified in the model_versions object
      modelsToProcess = Object.keys(model_versions);
    }

    // Process each requested model
    for (const modelIdentifier of modelsToProcess) {
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
                encoded_text: encodedResponse,
                version: modelVersion // Include the version used in the response
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
      models_requested: modelsToProcess,
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
        
        // Determine the analysis model version to use
        // Priority: 1) analyze_responses_model_version, 2) model_versions mapping, 3) default
        const analysisModelVersion = analyze_responses_model_version || 
                                    model_versions[finalAnalyzerModelId] || 
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
          model: analyze_responses_model,
          version: analyze_responses_model_version || "default"
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