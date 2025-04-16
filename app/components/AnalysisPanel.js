"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

export default function AnalysisPanel({
  responses,
  analyzerModels,
  onAnalyze,
  analysis,
  isAnalyzing,
  modelConfigs,
  selectedVersions,
  onVersionChange,
  onSaveReadme,
  defaultAnalysisInstructions
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
    if (name === "Claude Sonnet") return "claude";
    if (name === "Gemini") return "gemini";
    if (name === "ChatGPT") return "chatgpt";
    return "chatgpt";
  };

  const handleAnalyze = () => {
    const instructions = useCustomInstructions ? customInstructions : defaultAnalysisInstructions;
    onAnalyze(selectedAnalyzer, instructions);
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
                  onClick={() => setShowInstructionsEditor(!showInstructionsEditor)}
                  className="btn btn-sm btn-outline"
                >
                  {showInstructionsEditor ? "Hide Instructions" : "Edit Instructions"}
                </button>

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
            <div className="prose prose-sm md:prose-base max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]} // Add this for table support
                rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeSlug]}
                components={{
                  pre: ({ node, ...props }) => (
                    <pre className="bg-base-200 p-4 rounded-md overflow-x-auto" {...props} />
                  ),
                  code: ({ node, inline, ...props }) => (
                    inline ? 
                    <code className="bg-base-200 px-1 py-0.5 rounded" {...props} /> :
                    <code {...props} />
                  ),
                  // Add specific styling for tables
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
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