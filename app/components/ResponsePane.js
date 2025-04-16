"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

export default function ResponsePane({ response, isLoading, onSaveReadme }) {
  const [showRaw, setShowRaw] = useState(false);
  
  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-sm min-h-[300px] flex items-center justify-center">
        <div className="card-body items-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="text-center opacity-70 mt-2">Loading response...</p>
        </div>
      </div>
    );
  }
  
  if (!response) {
    return (
      <div className="card bg-base-100 shadow-sm min-h-[300px] flex items-center justify-center">
        <div className="card-body text-center opacity-60">
          No response yet. Configure your prompt and test models to see results.
        </div>
      </div>
    );
  }
  
  return (
    <div className="card bg-base-100 shadow-sm overflow-hidden">
      <div className="card-body p-0">
        <div className="bg-base-200 p-3 flex items-center justify-between">
          <h3 className="font-medium">{response.model}</h3>
          <div className="flex gap-2">
            {response && !response.error && (
              <button
                onClick={() => onSaveReadme(response)}
                className="btn btn-sm btn-primary"
              >
                Save as README
              </button>
            )}
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="btn btn-sm btn-ghost"
            >
              {showRaw ? "Show Formatted" : "Show Raw"}
            </button>
          </div>
        </div>
        
        <div className="p-4 max-h-[600px] overflow-auto">
          {response.error ? (
            <div className="text-error">{response.text}</div>
          ) : showRaw ? (
            <pre className="text-sm whitespace-pre-wrap font-mono bg-base-200 p-4 rounded-md overflow-x-auto">{JSON.stringify(response.rawResponse, null, 2)}</pre>
          ) : (
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
                {response.text}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}