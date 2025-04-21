"use client";

import { useState, useEffect } from "react";
import ThemeSwitcher from "./components/ThemeSwitcher";
import ModelSelector from "./components/ModelSelector";
import MultiPromptInput from "./components/MultiPromptInput";
import ParameterConfig from "./components/ParameterConfig";
import ResponsePane from "./components/ResponsePane";
import AnalysisPanel from "./components/AnalysisPanel";
import SettingsButton from "./components/SettingsButton";
import {  callSonnet, 
  callGemini, 
  callChatGPT, 
  analyzeResponses} from "./lib/models";
import { DEFAULT_ANALYSIS_INSTRUCTIONS } from "./utils/system-instructions";
import { saveAsReadme } from "./utils/readme";
import { syncCredentials } from "./utils/credentials";
import InfoBubble from './components/InfoBubble';
import PromptResponseAnalytics from "./components/PromptResponseAnalytics";
import { 
  MODEL_CONFIGS, 
  MODEL_PROVIDERS, 
  MODEL_ID_TO_NAME, 
  getAvailableModels,
} from "./config/models";

// Create mapping of model IDs to their functions
const modelFunctions = {
  [MODEL_PROVIDERS.CLAUDE]: callSonnet,
  [MODEL_PROVIDERS.GEMINI]: callGemini,
  [MODEL_PROVIDERS.CHATGPT]: callChatGPT,
};

// Get available models in the format expected by the UI
const AVAILABLE_MODELS = getAvailableModels().map(model => ({
  ...model,
  func: modelFunctions[model.id]
}));

const themeGroups = {
  "Light Themes": ["light", "cupcake", "bumblebee", "emerald", "corporate", "lemonade", "winter"],
  "Dark Themes": ["dark", "synthwave", "retro", "cyberpunk", "night", "coffee", "dracula", "black", "luxury"],
  "Colorful Themes": ["valentine", "halloween", "garden", "forest", "aqua", "lofi", "pastel", "fantasy", "cmyk", "autumn", "acid", "wireframe", "business"]
};


export default function Home() {
  // Model selection state - keeping your existing state
  const [analysisInstructions, setAnalysisInstructions] = useState(DEFAULT_ANALYSIS_INSTRUCTIONS);
  const [selectedModels, setSelectedModels] = useState([AVAILABLE_MODELS[0]]);
  const [selectedVersions, setSelectedVersions] = useState(() => {
    const defaults = {};
    Object.entries(MODEL_CONFIGS).forEach(([modelId, config]) => {
      defaults[modelId] = config.defaultVersion;
    });
    return defaults;
  });

  useEffect(() => {
    syncCredentials();
  }, []);

  // Theme state - keeping your existing theme handling
  const [currentTheme, setCurrentTheme] = useState('light');
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);

  // Multi-prompt state
  const [prompts, setPrompts] = useState([
    { text: "", systemInstructions: "", useDefaultSystem: false },
    { text: "", systemInstructions: "", useDefaultSystem: true },
    { text: "", systemInstructions: "", useDefaultSystem: true },
    { text: "", systemInstructions: "", useDefaultSystem: true },
    { text: "", systemInstructions: "", useDefaultSystem: true }
  ]);

  // Responses state
  const [responsesByPrompt, setResponsesByPrompt] = useState([]);
  const [responses, setResponses] = useState([]);

  // Apply theme effect - keeping your existing code
  useEffect(() => {
    // Get saved theme on initial load
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Add click outside handler for theme dropdown
    const handleClickOutside = (event) => {
      if (!event.target.closest('.theme-dropdown')) {
        setIsThemeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Theme change handler - keeping your existing code
  const changeTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    setCurrentTheme(theme);
    setIsThemeDropdownOpen(false);

    // Show theme change notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-success text-success-content px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `Theme changed to ${theme}`;
    document.body.appendChild(notification);

    // Remove after 2 seconds
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 2000);
  };

  const handleSaveReadme = (content) => {
    saveAsReadme(content);
  };

  // Analyzer state - keeping your existing code
  const [analyzerModels, setAnalyzerModels] = useState(() => 
    Object.values(MODEL_ID_TO_NAME)
  );


  const [selectedAnalyzerVersions, setSelectedAnalyzerVersions] = useState(() => {
    const defaults = {};
    Object.entries(MODEL_CONFIGS).forEach(([modelId, config]) => {
      const modelName = MODEL_ID_TO_NAME[modelId];
      defaults[modelName] = config.defaultVersion;
    });
    return defaults;
  });

  // Handle model version selection - keeping your existing code
  const handleVersionChange = (modelId, versionId) => {
    setSelectedVersions(prev => ({
      ...prev,
      [modelId]: versionId
    }));
  };

  // Handle analyzer model version selection - keeping your existing code
  const handleAnalyzerVersionChange = (modelName, versionId) => {
    setSelectedAnalyzerVersions(prev => ({
      ...prev,
      [modelName]: versionId
    }));
  };

  // Parameters state
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState({})
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentProcessingPrompt, setCurrentProcessingPrompt] = useState(null);
  const [selectedPromptForAnalysis, setSelectedPromptForAnalysis] = useState(0);

  // Updated submit handler for multiple prompts
  const handleSubmit = async () => {
    if (!prompts[0].text || selectedModels.length === 0) return;

    setIsLoading(true);
    setResponsesByPrompt([]);
    setResponses([]);
    setAnalysis(null);

    const initialLoadingStatus = {};
    const activePrompts = prompts.filter(prompt => prompt.text.trim());

    activePrompts.forEach((_, promptIndex) => {
      initialLoadingStatus[promptIndex] = {};
      selectedModels.forEach(model => {
        initialLoadingStatus[promptIndex][model.id] = true;
      });
    });

    setLoadingStatus(initialLoadingStatus);

    const newResponsesByPrompt = [];
    const allResponses = [];

    // Process prompts sequentially
    for (let i = 0; i < activePrompts.length; i++) {
      setCurrentProcessingPrompt(i);

      const promptObj = activePrompts[i];

      // Determine which system instructions to use
      const systemInstructionsToUse = promptObj.useDefaultSystem && i > 0 ?
        prompts[0].systemInstructions : promptObj.systemInstructions;

      const modelPromises = selectedModels.map(model =>
        model.func(
          promptObj.text,
          systemInstructionsToUse,
          temperature,
          maxTokens,
          selectedVersions[model.id]
        ).then(result => {
          setLoadingStatus(prev => ({
            ...prev,
            [i]: {
              ...prev[i],
              [model.id]: false
            }
          }));
          return {
            ...result,
            model: model.name,
            version: selectedVersions[model.id],
            promptIndex: i,
            promptText: promptObj.text
          };
        }).catch(error => {
          setLoadingStatus(prev => ({
            ...prev,
            [i]: {
              ...prev[i],
              [model.id]: false
            }
          }));
          return {
            error: error.message,
            model: model.name,
            version: selectedVersions[model.id],
            promptIndex: i,
            promptText: promptObj.text
          };
        })
      )

      try {
        const results = await Promise.all(modelPromises);

        const promptResponses = results.map(result => ({
          ...result,
          promptIndex: i,
          promptText: promptObj.text
        }));

        newResponsesByPrompt.push(promptResponses);
        allResponses.push(...promptResponses);

        // Update responses incrementally
        setResponsesByPrompt([...newResponsesByPrompt]);
      } catch (error) {
        console.error(`Error testing models for prompt ${i + 1}:`, error);
      }
    }

    setResponses(allResponses);
    setCurrentProcessingPrompt(null);
    setIsLoading(false);
  };

  // Updated analyze function for single or multiple prompts
  const handleAnalyze = async (promptIndex, analyzerModel, customInstructions) => {
    // Default to analyzing all responses
    let responsesToAnalyze = responses;

    // If a specific prompt index is provided and valid, filter responses for that prompt
    if (promptIndex !== undefined && promptIndex >= 0 && promptIndex < responsesByPrompt.length) {
      responsesToAnalyze = responsesByPrompt[promptIndex];
    }

    if (responsesToAnalyze.length < 1) return;

    setIsAnalyzing(true);

    try {
      // Get the corresponding model ID for the analyzer model name
      const modelIdMap = {
        "Claude Sonnet": "claude",
        "Gemini": "gemini",
        "ChatGPT": "chatgpt"
      };

      const modelId = modelIdMap[analyzerModel];
      const versionId = selectedAnalyzerVersions[analyzerModel];

      // Create context about which prompt is being analyzed
      let analysisContext = "";
      if (promptIndex !== undefined && promptIndex >= 0) {
        const promptText = prompts[promptIndex].text;
        analysisContext = `Analysis of responses for Prompt ${promptIndex + 1}: "${promptText.substring(0, 100)}${promptText.length > 100 ? '...' : ''}"`;
      } else {
        analysisContext = `Analysis of all responses across ${responsesByPrompt.length} different prompts`;
      }

      const result = await analyzeResponses(
        responsesToAnalyze,
        analyzerModel,
        versionId,
        customInstructions,
        analysisContext
      );

      setAnalysis({
        ...result,
        promptIndex
      });

      setSelectedPromptForAnalysis(promptIndex);
    } catch (error) {
      console.error("Error analyzing responses:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen text-base-content" data-theme={currentTheme}>
      <div className="navbar bg-base-200">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">LLM Comparison Tool</h1>
        </div>
        <InfoBubble
          title="Setup & Usage Instructions"
          content={`
# **Prerequisites**

- Node.js 18.x or later
- API keys for OpenAI, Anthropic, and Google Cloud (for Vertex AI)

## **API Keys Required**

| Variable | Description |
|----------|-------------|
| \`ANTHROPIC_API_KEY\` | API key for Anthropic Claude models |
| \`OPENAI_API_KEY\` | API key for OpenAI GPT models |
| \`GOOGLE_PROJECT_ID\` | Google Cloud project ID for Vertex AI |

## **Google Cloud Setup**

When using Google Models (Gemini), you need:

1. A Google Cloud Project with Vertex AI API enabled
2. Local Google Cloud CLI installed
3. Proper authentication

Run this command to authenticate:

\`\`\`bash
gcloud auth application-default login
\`\`\`

## **Google Cloud Features**

When using Google Cloud with this application:

1. **Gemini models**: Requires Vertex AI API enabled
2. **Advanced Sentiment Analysis**: Requires Natural Language API enabled
3. **Authentication**: Uses Application Default Credentials

For sentiment analysis, enable the Natural Language API:

\`\`\`bash
gcloud services enable language.googleapis.com
\`\`\`

Without Google Cloud configuration, the app will fall back to basic sentiment analysis.

## **Setting Up LLM Connectivity Configurations For Local Testing**

### **.env File**

Create or edit the \`.env\` file in the root directory, or :

\`\`\`
GOOGLE_PROJECT_ID="your-google-project-id"
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
\`\`\`

### **In App Settings**

When running in local development mode, you can also set the API Keys and Google Project settings in the app settings. This is useful for testing without modifying the \`.env\` file.
1. Open the app settings by clicking "LLM Connectivity Settings" in the top-right corner
2. Enter your API keys and Google Project ID
3. Click "Save Settings" to apply the settings


## **How to Use This Tool**

1. **Select Models**: Choose which models to test from the selector panel
2. **Configure Parameters**: Adjust temperature (creativity) and token length
3. **Enter Prompt**: Type your prompt and optional system instructions
4. **Test Models**: Click "Test Selected Models" to get responses
5. **View & Compare**: Results appear in the right panel
6. **Analyze**: Use the Analysis panel to compare model outputs

## **Multi-Prompt Feature**

This tool now supports up to 5 sequential prompts:

1. Enter your first prompt (required)
2. Add up to 4 additional prompts using the prompt buttons
3. Each prompt can have its own system instructions or use the default
4. Results are grouped by prompt for easy comparison

## **Analysis Features**

- Choose any model to analyze the differences between responses
- Analyze responses from specific prompts or across all prompts
- Customize analysis instructions for specific comparisons
- Save responses and analyses as markdown files
- Toggle between formatted and raw views
`}
        />
        <div className="flex-none">
          <SettingsButton />
        </div>
        <div className="flex-none">
        </div>
      </div>

      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
          <p className="opacity-70">Compare responses from different language models using the same prompt.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <ModelSelector
              availableModels={AVAILABLE_MODELS}
              selectedModels={selectedModels}
              onChange={setSelectedModels}
              modelConfigs={MODEL_CONFIGS}
              selectedVersions={selectedVersions}
              onVersionChange={handleVersionChange}
            />

            <ParameterConfig
              temperature={temperature}
              maxTokens={maxTokens}
              onTemperatureChange={setTemperature}
              onMaxTokensChange={setMaxTokens}
            />

            <MultiPromptInput
              prompts={prompts}
              onPromptsChange={setPrompts}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>

          <div className="md:col-span-2 space-y-6">
            {/* Loading indicator during processing */}
            {isLoading && (
              <div className="card bg-base-100 shadow-sm p-8">
                <div className="flex flex-col items-center justify-center">
                  <div className="loading loading-spinner loading-lg"></div>
                  <p className="mt-4">
                    {currentProcessingPrompt !== null ?
                      `Processing prompt ${currentProcessingPrompt + 1} of ${prompts.filter(p => p.text.trim()).length}...` :
                      'Processing prompts...'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Display responses grouped by prompt */}
            {responsesByPrompt.length > 0 && (
  <div className="space-y-8">
    {responsesByPrompt.map((promptResponses, promptIndex) => (
      <div key={promptIndex} className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="font-medium text-lg border-b pb-2 mb-4">
            Prompt {promptIndex + 1} Responses
          </h3>
          <div className="text-sm opacity-70 mb-4 line-clamp-2">
            <strong>Prompt:</strong> {promptResponses[0]?.promptText || ''}
          </div>
          
          {/* Show individual loading indicators */}
          {isLoading && loadingStatus[promptIndex] && (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedModels.map(model => (
                <div 
                  key={`loading-${promptIndex}-${model.id}`} 
                  className={`card ${loadingStatus[promptIndex][model.id] ? 'bg-base-200' : 'bg-base-100'} p-4`}
                >
                  <div className="flex items-center">
                    {loadingStatus[promptIndex][model.id] ? (
                      <>
                        <div className="loading loading-spinner loading-sm mr-2"></div>
                        <span>Loading {model.name}...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-success mr-2">✓</span>
                        <span>{model.name} response received</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Display responses for this prompt */}
          <div className="grid grid-cols-1 gap-6">
            {promptResponses.map((response, responseIndex) => (
              <ResponsePane
                key={`${promptIndex}-${responseIndex}`}
                response={response}
                isLoading={false}
                onSaveReadme={handleSaveReadme}
                promptIndex={promptIndex}
              />
            ))}
          </div>
          
          {/* Per-prompt analytics */}
          {promptResponses.length > 0 && (
            <div className="mt-6">
              <div className="divider text-sm opacity-70">Prompt {promptIndex + 1} Analytics</div>
              <PromptResponseAnalytics responses={promptResponses} />
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
)}

            {/* Empty state */}
            {!isLoading && selectedModels.length > 0 && responsesByPrompt.length === 0 && (
              <div className="card bg-base-100 p-8 text-center opacity-60">
                Configure your prompts and click "Test Selected Models" to see results.
              </div>
            )}

            {selectedModels.length === 0 && (
              <div className="card bg-base-100 p-8 text-center opacity-60">
                Select at least one model to test.
              </div>
            )}

            <AnalysisPanel
              responses={responses}
              responsesByPrompt={responsesByPrompt}
              analyzerModels={analyzerModels}
              onAnalyze={handleAnalyze}
              analysis={analysis}
              isAnalyzing={isAnalyzing}
              modelConfigs={MODEL_CONFIGS}
              selectedVersions={selectedAnalyzerVersions}
              onVersionChange={handleAnalyzerVersionChange}
              onSaveReadme={handleSaveReadme}
              defaultAnalysisInstructions={DEFAULT_ANALYSIS_INSTRUCTIONS}
              selectedPromptIndex={selectedPromptForAnalysis}
              setSelectedPromptIndex={setSelectedPromptForAnalysis}
            />
          </div>
        </div>

        <ThemeSwitcher
          currentTheme={currentTheme}
          setCurrentTheme={changeTheme}
          themeGroups={themeGroups}
        />
      </div>
    </div>
  );
}