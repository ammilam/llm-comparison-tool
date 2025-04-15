"use client";

import { useState } from "react";
import ModelSelector from "./components/ModelSelector";
import PromptInput from "./components/PromptInput";
import ParameterConfig from "./components/ParameterConfig";
import ResponsePane from "./components/ResponsePane";
import AnalysisPanel from "./components/AnalysisPanel";
import { callSonnet, callGemini, callChatGPT, analyzeResponses } from "./lib/models";

// Model configuration with available versions
const MODEL_CONFIGS = {
  claude: {
    name: "Claude Sonnet",
    versions: [
      { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet" },
      { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" }
    ],
    defaultVersion: "claude-3-7-sonnet-20250219"
  },
  gemini: {
    name: "Gemini",
    versions: [
      { id: "gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
      { id: "gemini-2.0-pro-001", name: "Gemini 2.0 Pro" },
      { id: "gemini-1.5-flash-001", name: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro-001", name: "Gemini 1.5 Pro" }
    ],
    defaultVersion: "gemini-2.0-flash-001"
  },
  chatgpt: {
    name: "ChatGPT",
    versions: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "gpt-4", name: "GPT-4" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" }
    ],
    defaultVersion: "gpt-4o"
  }
};

const AVAILABLE_MODELS = [
  { id: "claude", name: "Claude Sonnet", func: callSonnet },
  { id: "gemini", name: "Gemini", func: callGemini },
  { id: "chatgpt", name: "ChatGPT", func: callChatGPT },
];

export default function Home() {
  // Model selection state
  const [selectedModels, setSelectedModels] = useState([AVAILABLE_MODELS[0]]);
  const [selectedVersions, setSelectedVersions] = useState({
    claude: MODEL_CONFIGS.claude.defaultVersion,
    gemini: MODEL_CONFIGS.gemini.defaultVersion,
    chatgpt: MODEL_CONFIGS.chatgpt.defaultVersion,
  });
  
  // Analyzer state
  const [analyzerModels, setAnalyzerModels] = useState(
    AVAILABLE_MODELS.map(model => model.name)
  );
  const [selectedAnalyzerVersions, setSelectedAnalyzerVersions] = useState({
    "Claude Sonnet": MODEL_CONFIGS.claude.defaultVersion,
    "Gemini": MODEL_CONFIGS.gemini.defaultVersion,
    "ChatGPT": MODEL_CONFIGS.chatgpt.defaultVersion,
  });
  
  // Handle model version selection
  const handleVersionChange = (modelId, versionId) => {
    setSelectedVersions(prev => ({
      ...prev,
      [modelId]: versionId
    }));
  };
  
  // Handle analyzer model version selection
  const handleAnalyzerVersionChange = (modelName, versionId) => {
    setSelectedAnalyzerVersions(prev => ({
      ...prev,
      [modelName]: versionId
    }));
  };
  
  // Existing state
  const [prompt, setPrompt] = useState("");
  const [systemInstructions, setSystemInstructions] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async () => {
    if (!prompt || selectedModels.length === 0) return;
    
    setIsLoading(true);
    setResponses([]);
    setAnalysis(null);
    
    const modelPromises = selectedModels.map(model => 
      model.func(
        prompt, 
        systemInstructions, 
        temperature, 
        maxTokens, 
        selectedVersions[model.id]
      )
    );
    
    try {
      const results = await Promise.all(modelPromises);
      setResponses(results);
    } catch (error) {
      console.error("Error testing models:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async (analyzerModel) => {
    if (responses.length < 2) return;
    
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
      
      const result = await analyzeResponses(responses, analyzerModel, versionId);
      setAnalysis(result);
    } catch (error) {
      console.error("Error analyzing responses:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-[family-name:var(--font-geist-sans)]">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">LLM Comparison Tool</h1>
        <p className="text-foreground/70">Compare responses from different language models using the same prompt.</p>
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
          
          <PromptInput 
            prompt={prompt}
            systemInstructions={systemInstructions}
            onPromptChange={setPrompt}
            onSystemInstructionsChange={setSystemInstructions}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
        
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {selectedModels.map((model) => (
              <ResponsePane 
                key={model.id}
                response={responses.find(r => r.model === MODEL_CONFIGS[model.id].name)}
                isLoading={isLoading}
              />
            ))}
            
            {selectedModels.length === 0 && (
              <div className="p-8 border border-black/10 dark:border-white/10 rounded-lg text-center text-foreground/60">
                Select at least one model to test.
              </div>
            )}
          </div>
          
          <AnalysisPanel 
            responses={responses}
            analyzerModels={analyzerModels}
            onAnalyze={handleAnalyze}
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            modelConfigs={MODEL_CONFIGS}
            selectedVersions={selectedAnalyzerVersions}
            onVersionChange={handleAnalyzerVersionChange}
          />
        </div>
      </div>
    </div>
  );
}