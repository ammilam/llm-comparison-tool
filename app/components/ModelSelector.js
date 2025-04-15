"use client";

export default function ModelSelector({ 
  availableModels, 
  selectedModels, 
  onChange,
  modelConfigs,
  selectedVersions,
  onVersionChange
}) {
  return (
    <div className="p-4 bg-black/5 dark:bg-white/5 rounded-lg">
      <h2 className="text-lg font-semibold mb-3">Select Models to Test</h2>
      <div className="space-y-3">
        {availableModels.map((model) => {
          const isSelected = selectedModels.some(m => m.id === model.id);
          const modelConfig = modelConfigs[model.id];
          
          return (
            <div key={model.id} className="border border-black/10 dark:border-white/10 rounded-md p-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      if (isSelected) {
                        onChange(selectedModels.filter(m => m.id !== model.id));
                      } else {
                        onChange([...selectedModels, model]);
                      }
                    }}
                    className="rounded text-foreground"
                  />
                  <span className="font-medium">{model.name}</span>
                </label>
                
                {isSelected && modelConfig && modelConfig.versions && (
                  <select
                    value={selectedVersions[model.id] || modelConfig.defaultVersion}
                    onChange={(e) => onVersionChange(model.id, e.target.value)}
                    className="p-2 text-sm rounded border border-black/10 dark:border-white/10 bg-background w-full sm:w-auto"
                  >
                    {modelConfig.versions.map(version => (
                      <option key={version.id} value={version.id}>
                        {version.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}