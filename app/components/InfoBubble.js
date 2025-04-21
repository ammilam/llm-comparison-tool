"use client";

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";


export default function InfoBubble({ title, content }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="btn btn-circle btn-ghost btn-xs text-info"
        aria-label="Show information"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </button>

      {isVisible && (
        <div className="card bg-base-200 shadow-xl absolute z-50 right-0 mt-2 w-80 md:w-[500px]">
          <div className="card-body p-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">{title}</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="btn btn-ghost btn-xs"
              >
                ✕
              </button>
            </div>
            <div className="divider my-1"></div>
            <div className="text-sm overflow-y-auto max-h-[70vh] prose prose-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
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
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}