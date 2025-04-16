"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

export default function AnalysisPanel({ 
  responses, 
  analyzerModels, 
  onAnalyze, 
  analysis, 
  isAnalyzing,
  modelConfigs,
  selectedVersions,
  onVersionChange,
  onSaveReadme
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
    <div className="card bg-base-100 shadow-sm overflow-hidden">
      <div 
        className="bg-base-200 p-3 flex items-center justify-between cursor-pointer"
        onClick={() => responses.length > 0 && setIsOpen(!isOpen)}
      >
        <h3 className="font-medium">Response Analysis</h3>
        {responses.length > 0 && (
          <button className="btn btn-sm btn-ghost btn-circle">
            {isOpen ? "▲" : "▼"}
          </button>
        )}
      </div>
      
      {isOpen && (
        <div className="card-body">
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <select 
                value={selectedAnalyzer} 
                onChange={(e) => setSelectedAnalyzer(e.target.value)}
                className="select select-bordered select-sm"
              >
                {analyzerModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              
              <select
                value={selectedVersions[selectedAnalyzer] || modelConfigs[modelId].defaultVersion}
                onChange={(e) => onVersionChange(selectedAnalyzer, e.target.value)}
                className="select select-bordered select-sm"
              >
                {versions.map(version => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || responses.length < 2}
                className="btn btn-sm btn-primary"
              >
                {isAnalyzing ? 
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Analyzing...
                  </> : 
                  "Analyze Responses"
                }
              </button>
              
              {analysis && (
                <button
                  onClick={() => onSaveReadme(analysis)}
                  disabled={isAnalyzing}
                  className="btn btn-sm btn-secondary"
                >
                  Save as README
                </button>
              )}
            </div>
          </div>
          
          {analysis ? (
            <div className="prose prose-sm md:prose-base max-w-none">
              <ReactMarkdown 
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                  pre: ({ node, ...props }) => (
                    <pre className="bg-base-200 p-4 rounded-md overflow-x-auto" {...props} />
                  ),
                  code: ({ node, inline, ...props }) => (
                    inline ? 
                    <code className="bg-base-200 px-1 py-0.5 rounded" {...props} /> :
                    <code {...props} />
                  )
                }}
              >
                {analysis.text}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center p-8 opacity-60">
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