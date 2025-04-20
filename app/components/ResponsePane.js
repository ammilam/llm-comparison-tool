"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

export default function ResponsePane({ response, isLoading, onSaveReadme, promptIndex }) {
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
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{response.model}</h3>
            {promptIndex !== undefined && (
              <div className="badge badge-sm">{`Prompt ${promptIndex + 1}`}</div>
            )}
          </div>
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
                {response.text}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}