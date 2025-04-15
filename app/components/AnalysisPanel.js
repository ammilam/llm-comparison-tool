"use client";

import { useState } from "react";
import Markdown from "react-markdown";

export default function AnalysisPanel({ 
  responses, 
  analyzerModels, 
  onAnalyze, 
  analysis, 
  isAnalyzing,
  modelConfigs,
  selectedVersions,
  onVersionChange
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAnalyzer, setSelectedAnalyzer] = useState(analyzerModels[0] || "ChatGPT");
  
  // Helper function to get model ID from name
  const getModelIdFromName = (name) => {
    if (name === "Claude Sonnet") return "claude";
    if (name === "Gemini") return "gemini";
    if (name === "ChatGPT") return "chatgpt";
    return "chatgpt";
  };
  
  const handleAnalyze = () => {
    onAnalyze(selectedAnalyzer);
    setIsOpen(true);
  };
  
  const modelId = getModelIdFromName(selectedAnalyzer);
  const versions = modelConfigs[modelId]?.versions || [];
  
  return (
    <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-black/20">
      <div 
        className="bg-black/10 dark:bg-white/10 p-3 flex items-center justify-between cursor-pointer"
        onClick={() => responses.length > 0 && setIsOpen(!isOpen)}
      >
        <h3 className="font-medium">Response Analysis</h3>
        {responses.length > 0 && (
          <button className="text-sm">
            {isOpen ? "▲ Hide" : "▼ Show"}
          </button>
        )}
      </div>
      
      {isOpen && (
        <div className="p-4">
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <select 
                value={selectedAnalyzer} 
                onChange={(e) => setSelectedAnalyzer(e.target.value)}
                className="p-2 rounded border border-black/10 dark:border-white/10 bg-background"
              >
                {analyzerModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              
              <select
                value={selectedVersions[selectedAnalyzer] || modelConfigs[modelId].defaultVersion}
                onChange={(e) => onVersionChange(selectedAnalyzer, e.target.value)}
                className="p-2 rounded border border-black/10 dark:border-white/10 bg-background"
              >
                {versions.map(version => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || responses.length < 2}
              className="py-2 px-4 bg-foreground text-background rounded hover:bg-foreground/90 disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Responses"}
            </button>
          </div>
          
          {analysis ? (
            <div className="prose dark:prose-invert prose-pre:bg-black/5 dark:prose-pre:bg-white/5 prose-pre:text-sm prose-pre:p-4 prose-pre:rounded-md prose-pre:overflow-x-auto prose-headings:mt-6 prose-headings:mb-4 prose-p:my-4 prose-li:my-1 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:bg-black/5 dark:prose-code:bg-white/10 prose-code:before:content-none prose-code:after:content-none max-w-none">
              <Markdown>{analysis.text}</Markdown>
            </div>
          ) : (
            <div className="text-center p-8 text-foreground/60">
              {responses.length < 2 ? (
                "Need at least two model responses to analyze."
              ) : (
                "Click 'Analyze Responses' to compare model outputs."
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}