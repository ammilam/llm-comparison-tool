"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { MODEL_NAME_TO_ID } from "../config/models";

export default function AnalysisPanel({
  responses,
  responsesByPrompt,
  analyzerModels,
  onAnalyze,
  analysis,
  isAnalyzing,
  modelConfigs,
  selectedVersions,
  onVersionChange,
  onSaveReadme,
  defaultAnalysisInstructions,
  selectedPromptIndex = 0,
  setSelectedPromptIndex
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAnalyzer, setSelectedAnalyzer] = useState(analyzerModels[0] || "ChatGPT");
  const [showInstructionsEditor, setShowInstructionsEditor] = useState(false);
  const [useCustomInstructions, setUseCustomInstructions] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  // Load custom instructions from localStorage on component mount
  useEffect(() => {
    const savedInstructions = localStorage.getItem('analysis_instructions');
    if (savedInstructions) {
      setCustomInstructions(savedInstructions);
      setUseCustomInstructions(true);
    } else {
      setCustomInstructions(defaultAnalysisInstructions);
    }
  }, [defaultAnalysisInstructions]);

  // Helper function to get model ID from name
  const getModelIdFromName = (name) => {
    return MODEL_NAME_TO_ID[name] || "chatgpt"; // Default to chatgpt if not found
  };

  const handleAnalyze = () => {
    const instructions = useCustomInstructions ? customInstructions : defaultAnalysisInstructions;
    onAnalyze(selectedPromptIndex, selectedAnalyzer, instructions);
    setIsOpen(true);
  };

  const handleSaveInstructions = () => {
    localStorage.setItem('analysis_instructions', customInstructions);
    setUseCustomInstructions(true);
    setShowInstructionsEditor(false);

    // Show a notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-success text-success-content px-4 py-2 rounded shadow-lg z-50 animate-fadeIn';
    notification.textContent = 'Custom analysis instructions saved';
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('animate-fadeOut');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 2000);
  };

  const handleResetInstructions = () => {
    localStorage.removeItem('analysis_instructions');
    setCustomInstructions(defaultAnalysisInstructions);
    setUseCustomInstructions(false);

    // Show a notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-info text-info-content px-4 py-2 rounded shadow-lg z-50 animate-fadeIn';
    notification.textContent = 'Analysis instructions reset to default';
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('animate-fadeOut');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 2000);
  };

  const modelId = getModelIdFromName(selectedAnalyzer);
  const versions = modelConfigs[modelId]?.versions || [];

  const hasMultiplePrompts = responsesByPrompt && responsesByPrompt.length > 1;

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
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Prompt selection dropdown - only show if multiple prompts exist */}
                {hasMultiplePrompts && (
                  <select
                    value={selectedPromptIndex}
                    onChange={(e) => setSelectedPromptIndex(parseInt(e.target.value))}
                    className="select select-bordered select-sm"
                  >
                    {responsesByPrompt.map((_, index) => (
                      <option key={index} value={index}>Analyze Prompt {index + 1}</option>
                    ))}
                    <option value={-1}>Analyze All Prompts</option>
                  </select>
                )}

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
                  value={selectedVersions[selectedAnalyzer] || modelConfigs[modelId]?.defaultVersion}
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
                  onClick={() => setShowInstructionsEditor(!showInstructionsEditor)}
                  className="btn btn-sm btn-outline"
                >
                  {showInstructionsEditor ? "Hide Instructions" : "Edit Instructions"}
                </button>

                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || responses.length === 0}
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

            {showInstructionsEditor && (
              <div className="mt-2 p-3 bg-base-200 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Analysis Instructions</h4>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="label-text">Use Custom</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={useCustomInstructions}
                        onChange={(e) => setUseCustomInstructions(e.target.checked)}
                      />
                    </label>
                  </div>
                </div>

                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="textarea textarea-bordered w-full h-64 font-mono text-xs"
                  placeholder="Enter custom analysis instructions..."
                />

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={handleResetInstructions}
                    className="btn btn-sm btn-outline"
                  >
                    Reset to Default
                  </button>
                  <button
                    onClick={handleSaveInstructions}
                    className="btn btn-sm btn-primary"
                    disabled={!customInstructions.trim()}
                  >
                    Save Instructions
                  </button>
                </div>
              </div>
            )}
          </div>

          {analysis ? (
            <div className="prose prose-sm md:prose-base max-w-none space-y-6">
              {/* Show which prompt was analyzed */}
              {hasMultiplePrompts && analysis.promptIndex !== undefined && (
                <div className="bg-base-200 p-2 rounded-md text-sm mb-4">
                  {analysis.promptIndex >= 0 ?
                    `Analysis for Prompt ${analysis.promptIndex + 1}` :
                    "Analysis for All Prompts"}
                </div>
              )}

              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeSlug]}
                components={{
                  pre: ({ node, ...props }) => (
                    <pre className="bg-base-200 p-4 rounded-md overflow-x-auto my-6" {...props} />
                  ),
                  code: ({ node, inline, ...props }) => (
                    inline ?
                      <code className="bg-base-200 px-1 py-0.5 rounded" {...props} /> :
                      <code {...props} />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-8">
                      <table className="table table-zebra w-full" {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead className="bg-base-200" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th className="px-4 py-2 text-left" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="border px-4 py-2" {...props} />
                  ),
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold mt-8 mb-3" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-bold mt-6 mb-2" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="my-4" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-6 my-4" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal pl-6 my-4" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-primary/50 pl-4 italic my-6" {...props} />
                  ),
                  hr: ({ node, ...props }) => (
                    <hr className="my-8 border-base-300" {...props} />
                  )
                }}
              >
                {analysis.text}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center p-8 opacity-60">
              {responses.length === 0 ? (
                "Need at least one model response to analyze."
              ) : (
                <>
                  <p>Click "Analyze Responses" to compare model outputs.</p>
                  {useCustomInstructions && (
                    <p className="text-sm mt-2 text-info">Using custom analysis instructions</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}