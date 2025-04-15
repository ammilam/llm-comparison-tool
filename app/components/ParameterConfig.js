"use client";

export default function ParameterConfig({ temperature, maxTokens, onTemperatureChange, onMaxTokensChange }) {
  return (
    <div className="p-4 bg-black/5 dark:bg-white/5 rounded-lg">
      <h2 className="text-lg font-semibold mb-3">Model Parameters</h2>
      
      <div className="mb-4">
        <label htmlFor="temperature" className="block text-sm font-medium mb-1">
          Temperature: {temperature}
        </label>
        <input
          id="temperature"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={temperature}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-foreground/70">
          <span>Deterministic (0)</span>
          <span>Creative (1)</span>
        </div>
      </div>
      
      <div>
        <label htmlFor="maxTokens" className="block text-sm font-medium mb-1">
          Max Tokens: {maxTokens}
        </label>
        <input
          id="maxTokens"
          type="range"
          min="256"
          max="8192"
          step="256"
          value={maxTokens}
          onChange={(e) => onMaxTokensChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-foreground/70">
          <span>256</span>
          <span>8192</span>
        </div>
      </div>
    </div>
  );
}