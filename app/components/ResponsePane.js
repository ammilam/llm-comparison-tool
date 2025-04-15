"use client";

import { useState } from "react";
import Markdown from "react-markdown";

export default function ResponsePane({ response, isLoading }) {
  const [showRaw, setShowRaw] = useState(false);
  
  if (isLoading) {
    return (
      <div className="p-4 border border-black/10 dark:border-white/10 rounded-lg min-h-[300px] flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-4 w-32 bg-black/10 dark:bg-white/10 rounded mb-3 mx-auto"></div>
          <div className="h-3 w-48 bg-black/10 dark:bg-white/10 rounded mx-auto"></div>
        </div>
      </div>
    );
  }
  
  if (!response) {
    return (
      <div className="p-4 border border-black/10 dark:border-white/10 rounded-lg min-h-[300px] flex items-center justify-center text-center text-foreground/60">
        No response yet. Configure your prompt and test models to see results.
      </div>
    );
  }
  
  return (
    <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-black/20">
      <div className="bg-black/5 dark:bg-white/10 p-3 flex items-center justify-between">
        <h3 className="font-medium">{response.model}</h3>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-sm px-2 py-1 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20"
        >
          {showRaw ? "Show Formatted" : "Show Raw"}
        </button>
      </div>
      
      <div className="p-4 max-h-[600px] overflow-auto">
        {response.error ? (
          <div className="text-red-600 dark:text-red-400">{response.text}</div>
        ) : showRaw ? (
          <pre className="text-sm whitespace-pre-wrap font-mono bg-black/5 dark:bg-white/5 p-4 rounded-md overflow-x-auto">{JSON.stringify(response.rawResponse, null, 2)}</pre>
        ) : (
          <div className="prose dark:prose-invert prose-pre:bg-black/5 dark:prose-pre:bg-white/5 prose-pre:text-sm prose-pre:p-4 prose-pre:rounded-md prose-pre:overflow-x-auto prose-headings:mt-6 prose-headings:mb-4 prose-p:my-4 prose-li:my-1 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:bg-black/5 dark:prose-code:bg-white/10 prose-code:before:content-none prose-code:after:content-none max-w-none">
            <Markdown>{response.text}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}