"use client";

export default function PromptInput({ prompt, systemInstructions, onPromptChange, onSystemInstructionsChange, onSubmit, isLoading }) {
  return (
    <div className="p-4 bg-black/5 dark:bg-white/5 rounded-lg">
      <div className="mb-4">
        <label htmlFor="systemInstructions" className="block text-sm font-medium mb-2">
          System Instructions
        </label>
        <textarea
          id="systemInstructions"
          value={systemInstructions}
          onChange={(e) => onSystemInstructionsChange(e.target.value)}
          placeholder="Optional system instructions..."
          className="w-full p-3 border border-black/10 dark:border-white/10 rounded-md bg-background"
          rows={3}
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="prompt" className="block text-sm font-medium mb-2">
          Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Enter your prompt here..."
          className="w-full p-3 border border-black/10 dark:border-white/10 rounded-md bg-background"
          rows={5}
          required
        />
      </div>
      
      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full py-2 px-4 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50"
      >
        {isLoading ? "Testing Models..." : "Test Selected Models"}
      </button>
    </div>
  );
}