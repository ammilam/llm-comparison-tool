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
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Select Models to Test</h2>
        <div className="space-y-3">
          {availableModels.map((model) => {
            const isSelected = selectedModels.some(m => m.id === model.id);
            const modelConfig = modelConfigs[model.id];
            
            return (
              <div key={model.id} className="card bg-base-100">
                <div className="card-body p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
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
                        className="checkbox checkbox-primary"
                      />
                      <span className="font-medium">{model.name}</span>
                    </label>
                    
                    {isSelected && modelConfig && modelConfig.versions && (
                      <select
                        value={selectedVersions[model.id] || modelConfig.defaultVersion}
                        onChange={(e) => onVersionChange(model.id, e.target.value)}
                        className="select select-bordered select-sm w-full sm:w-auto"
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}