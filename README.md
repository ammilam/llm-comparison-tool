# LLM Comparison Tool

A powerful Next.js application for testing, comparing, and analyzing responses from multiple large language models side by side.

![LLM Comparison Tool](https://via.placeholder.com/800x450.png?text=LLM+Comparison+Tool)

## Overview

This application allows you to test the same prompt against different language models (Claude, Gemini, ChatGPT) simultaneously and analyze their responses. It's designed for researchers, prompt engineers, and anyone interested in comparing the capabilities and outputs of various LLMs.


## Features

- **Multi-model Testing**: Test prompts against Claude, Gemini, and ChatGPT models simultaneously
- **Version Selection**: Choose specific versions of each model (e.g., Claude 3.7 Sonnet, GPT-4o, Gemini 2.0)
- **Parameter Customization**: Adjust temperature and token limits for fine-tuned responses
- **System Instructions**: Add custom system instructions to guide model behavior
- **Response Analysis**: Analyze and compare responses between models using any of the available LLMs
- **Markdown Rendering**: All responses are rendered as properly formatted markdown
- **Raw Response View**: Toggle between formatted and raw JSON responses
- **Responsive Design**: Works seamlessly on both desktop and mobile devices

## Installation

### Prerequisites

- Node.js 18.x or later
- API keys for OpenAI, Anthropic, and Google Cloud (for Vertex AI)

#### Environmental Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for Anthropic Claude models |
| `OPENAI_API_KEY` | API key for OpenAI GPT models |
| `GOOGLE_PROJECT_ID` | Google Cloud project ID for Vertex AI |

#### Google Auth

When interacting with Google Models, you will need to have the following:

- Google Project
- VertexAI Access
- Have gcloud installed locally
- Locally authenticate using gcloud

##### Authenticating With gcloud

```bash
gcloud auth login application-default
```

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd model-unit-tester
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with your API keys:
   ```
   GOOGLE_PROJECT_ID="your-google-project-id"
   OPENAI_API_KEY="your-openai-api-key"
   ANTHROPIC_API_KEY="your-anthropic-api-key"
   ```

4. For Google Cloud/Gemini access, make sure you have:
   - Installed the Google Cloud CLI
   - Run `gcloud auth application-default login`
   - Enabled the Vertex AI API in your Google Cloud project

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Select Models**: Choose which models to test from the model selector panel
2. **Configure Parameters**: Adjust temperature and maximum token length
3. **Enter Prompt**: Type your prompt in the input field, and add optional system instructions
4. **Test Models**: Click "Test Selected Models" to send the prompt to all selected models
5. **View Responses**: Review the generated responses in the response panes
6. **Analyze Results**: Select an analyzer model and click "Analyze Responses" to get a detailed comparison

## Extending with New Models

The application is designed to be easily extensible. To add a new model:

1. Create a new server function in models.js
2. Add model configuration in the `MODEL_CONFIGS` object in page.js
3. Add the model to the `AVAILABLE_MODELS` array in page.js

## Technologies Used

- **Next.js**: React framework with App Router
- **React 19**: For UI components
- **Tailwind CSS**: For styling
- **react-markdown**: For rendering markdown content
- **API Integrations**: OpenAI, Anthropic Claude, and Google Vertex AI


Built with ❤️ using Next.js and Tailwind CSS.