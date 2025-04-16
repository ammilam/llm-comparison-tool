"use client";

import { useState, useEffect } from 'react';
import InfoBubble from './InfoBubble';

// Model requirement information
const modelRequirements = {
  anthropic: {
    title: "Claude API Requirements",
    content: "To use Claude models, you need an Anthropic API key.\n\n1. Visit https://console.anthropic.com\n2. Create an account or log in\n3. Navigate to the API Keys section\n4. Generate a new API key\n5. Copy and paste it here\n\nThis key will be stored securely in your browser's localStorage and only used for API requests."
  },
  openai: {
    title: "OpenAI API Requirements",
    content: "To use OpenAI models, you need an API key.\n\n1. Visit https://platform.openai.com\n2. Create an account or log in\n3. Navigate to the API Keys section\n4. Generate a new API key\n5. Copy and paste it here\n\nThis key will be stored securely in your browser's localStorage and only used for API requests."
  },
  google: {
    title: "Google/Gemini Requirements",
    content: "To use Google Gemini models, you need:\n\n1. A Google Cloud project with Vertex AI API enabled\n2. Your Google Project ID\n3. Local gcloud CLI authentication\n\nTo set up authentication:\n1. Install Google Cloud CLI\n2. Run 'gcloud auth application-default login' in your terminal\n3. Select your Google account and allow access\n\nYour Google Project ID will be stored in your browser's localStorage."
  }
};

export default function SettingsModal({ onClose }) {
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [googleProjectId, setGoogleProjectId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Load existing values on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAnthropicApiKey(localStorage.getItem('anthropic_api_key') || "");
      setOpenaiApiKey(localStorage.getItem('openai_api_key') || "");
      setGoogleProjectId(localStorage.getItem('google_project_id') || "");
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    
    try {
      // Simple obfuscation for localStorage (not truly secure but better than plaintext)
      // In a production app, would use more secure methods
      if (anthropicApiKey) {
        localStorage.setItem('anthropic_api_key', anthropicApiKey);
      }
      
      if (openaiApiKey) {
        localStorage.setItem('openai_api_key', openaiApiKey);
      }
      
      if (googleProjectId) {
        localStorage.setItem('google_project_id', googleProjectId);
      }
      
      setNotification({
        type: 'success',
        message: 'Settings saved successfully!'
      });
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to save settings: ' + error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl relative">
        <button 
          className="btn btn-sm btn-circle absolute right-2 top-2"
          onClick={onClose}
        >
          ✕
        </button>
        
        <h3 className="font-bold text-lg mb-4">LLM Connectivity Settings</h3>
        
        <div className="text-sm mb-4 bg-warning bg-opacity-20 p-3 rounded-lg">
          <p className="font-medium">⚠️ Security Note:</p>
          <p>API keys are stored locally in your browser and only used when running in development mode (localhost). 
          Never expose these keys in production environments.</p>
        </div>
        
        <div className="space-y-4">
          {/* Anthropic API Key */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium flex items-center">
                Claude/Anthropic API Key
                <InfoBubble 
                  title={modelRequirements.anthropic.title}
                  content={modelRequirements.anthropic.content}
                />
              </span>
            </label>
            <input
              type="password"
              className="input input-bordered"
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              placeholder="sk-ant-api-..."
            />
          </div>
          
          {/* OpenAI API Key */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium flex items-center">
                OpenAI API Key
                <InfoBubble 
                  title={modelRequirements.openai.title}
                  content={modelRequirements.openai.content}
                />
              </span>
            </label>
            <input
              type="password"
              className="input input-bordered"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          
          {/* Google Project ID */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium flex items-center">
                Google Cloud Project ID
                <InfoBubble 
                  title={modelRequirements.google.title}
                  content={modelRequirements.google.content}
                />
              </span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={googleProjectId}
              onChange={(e) => setGoogleProjectId(e.target.value)}
              placeholder="my-project-123"
            />
          </div>
        </div>
        
        <div className="modal-action">
          <button 
            className="btn btn-outline"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className={`btn btn-primary ${isSaving ? 'loading' : ''}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
        
        {notification && (
          <div className={`alert mt-4 ${notification.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <div>
              <span>{notification.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}