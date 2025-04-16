"use client";

export default function PromptInput({ prompt, systemInstructions, onPromptChange, onSystemInstructionsChange, onSubmit, isLoading }) {
  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <div className="mb-4">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">System Instructions</span>
            </div>
            <textarea
              value={systemInstructions}
              onChange={(e) => onSystemInstructionsChange(e.target.value)}
              placeholder="Optional system instructions..."
              className="textarea textarea-bordered h-24 w-full"
              rows={3}
            />
          </label>
        </div>
        
        <div className="mb-4">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Prompt</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="Enter your prompt here..."
              className="textarea textarea-bordered h-32 w-full"
              rows={5}
              required
            />
          </label>
        </div>
        
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="btn btn-primary w-full"
        >
          {isLoading ? 
            <>
              <span className="loading loading-spinner"></span>
              Testing Models...
            </> : 
            "Test Selected Models"
          }
        </button>
      </div>
    </div>
  );
}