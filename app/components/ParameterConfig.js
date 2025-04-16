"use client";

export default function ParameterConfig({ temperature, maxTokens, onTemperatureChange, onMaxTokensChange }) {
  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Model Parameters</h2>
        
        <div className="mb-4">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Temperature: {temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              className="range range-primary"
            />
            <div className="flex justify-between text-xs opacity-70">
              <span>Deterministic (0)</span>
              <span>Creative (1)</span>
            </div>
          </label>
        </div>
        
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Max Tokens: {maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={maxTokens}
              onChange={(e) => onMaxTokensChange(parseInt(e.target.value))}
              className="range range-primary"
            />
            <div className="flex justify-between text-xs opacity-70">
              <span>256</span>
              <span>8192</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}