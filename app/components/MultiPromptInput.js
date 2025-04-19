"use client";

import { useState } from "react";
import InfoBubble from './InfoBubble';

export default function MultiPromptInput({ 
  prompts, 
  onPromptsChange, 
  onSubmit, 
  isLoading 
}) {
  const [activePromptIndex, setActivePromptIndex] = useState(0);

  const handlePromptChange = (index, field, value) => {
    const updatedPrompts = [...prompts];
    updatedPrompts[index] = { ...updatedPrompts[index], [field]: value };
    onPromptsChange(updatedPrompts);
  };

  const handleClearPrompt = (index) => {
    const updatedPrompts = [...prompts];
    updatedPrompts[index] = { 
      ...updatedPrompts[index], 
      text: "", 
      systemInstructions: "", 
      useDefaultSystem: true 
    };
    onPromptsChange(updatedPrompts);
    setActivePromptIndex(0);
  };

  const getActivePromptsCount = () => {
    return prompts.filter(p => p.text.trim()).length;
  };

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-lg">Prompts</h2>
          <InfoBubble
            title="Using Multiple Prompts"
            content={`
## Multi-Prompt Feature

This tool allows you to test up to 5 sequential prompts:

1. Enter your first prompt (required)
2. Add up to 4 additional prompts using the prompt buttons
3. Each prompt can have its own system instructions or use the default from Prompt 1
4. When you click "Test Selected Models", all active prompts will be processed in sequence
5. Results will be grouped by prompt for easy comparison
            `}
          />
        </div>
        
        {/* Main prompt (always visible) */}
        <div className="mb-4">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium">System Instructions (Default)</span>
            </div>
            <textarea
              value={prompts[0].systemInstructions}
              onChange={(e) => handlePromptChange(0, "systemInstructions", e.target.value)}
              placeholder="Optional system instructions that apply to all prompts by default..."
              className="textarea textarea-bordered h-24 w-full"
              rows={3}
            />
          </label>
        </div>
        
        <div className="mb-4">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium">Prompt 1</span>
            </div>
            <textarea
              value={prompts[0].text}
              onChange={(e) => handlePromptChange(0, "text", e.target.value)}
              placeholder="Enter your first prompt here..."
              className="textarea textarea-bordered h-32 w-full"
              rows={5}
              required
            />
          </label>
        </div>
        
        {/* Prompt buttons */}
        <div className="flex flex-wrap gap-2 my-2">
          {[1, 2, 3, 4].map((index) => (
            <button
              key={index}
              onClick={() => setActivePromptIndex(index)}
              className={`btn ${
                prompts[index]?.text ? 'btn-primary' : 'btn-outline'
              } ${activePromptIndex === index ? 'btn-active' : ''}`}
            >
              {prompts[index]?.text ? `Prompt ${index + 1} ✓` : `Prompt ${index + 1}`}
            </button>
          ))}
        </div>
        
        {/* Additional prompt inputs */}
        {activePromptIndex > 0 && (
          <div className="mt-4 p-4 bg-base-200 rounded-lg">
            <div className="mb-4">
              <label className="form-control w-full">
                <div className="label justify-between">
                  <span className="label-text font-medium">System Instructions for Prompt {activePromptIndex + 1}</span>
                  <label className="label cursor-pointer gap-2">
                    <span className="label-text-alt">Use default instructions</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm toggle-primary"
                      checked={prompts[activePromptIndex].useDefaultSystem}
                      onChange={(e) => handlePromptChange(activePromptIndex, "useDefaultSystem", e.target.checked)}
                    />
                  </label>
                </div>
                <textarea
                  value={prompts[activePromptIndex].systemInstructions}
                  onChange={(e) => handlePromptChange(activePromptIndex, "systemInstructions", e.target.value)}
                  placeholder="Enter custom system instructions for this prompt..."
                  className="textarea textarea-bordered h-24 w-full"
                  rows={3}
                  disabled={prompts[activePromptIndex].useDefaultSystem}
                />
              </label>
            </div>
            
            <div className="mb-4">
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text font-medium">Prompt {activePromptIndex + 1}</span>
                </div>
                <textarea
                  value={prompts[activePromptIndex].text}
                  onChange={(e) => handlePromptChange(activePromptIndex, "text", e.target.value)}
                  placeholder={`Enter prompt ${activePromptIndex + 1} here...`}
                  className="textarea textarea-bordered h-32 w-full"
                  rows={5}
                />
              </label>
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={() => handleClearPrompt(activePromptIndex)}
                className="btn btn-sm btn-outline btn-error"
              >
                Clear Prompt {activePromptIndex + 1}
              </button>
            </div>
          </div>
        )}
        
        <button
          onClick={onSubmit}
          disabled={isLoading || !prompts[0].text.trim()}
          className="btn btn-primary w-full mt-4"
        >
          {isLoading ? 
            <>
              <span className="loading loading-spinner"></span>
              Testing Models...
            </> : 
            getActivePromptsCount() > 1 ?
              `Test Selected Models with ${getActivePromptsCount()} Prompts` :
              "Test Selected Models"
          }
        </button>
      </div>
    </div>
  );
}