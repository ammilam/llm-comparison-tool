# LLM Comparison Tool

A powerful Next.js application for testing, comparing, and analyzing responses from multiple large language models side by side.

## Overview

This application allows you to test the same prompt against different language models (Claude, Gemini, ChatGPT) simultaneously and analyze their responses. It's designed for researchers, prompt engineers, and anyone interested in comparing the capabilities and outputs of various LLMs.


## Features

- **Multi-model Testing**: Test prompts against Claude, Gemini, and ChatGPT models simultaneously
- **Version Selection**: Choose specific versions of each model (e.g., Claude 3.7 Sonnet, GPT-4o, Gemini 2.0)
- **Parameter Customization**: Adjust temperature and token limits for fine-tuned responses
- **System Instructions**: Add custom system instructions to guide model behavior
- **Response Analysis**: Analyze and compare responses between models using any of the available LLMs
- **Analytics Dashboard**: Visualize metrics like response length, complexity, sentiment, and token usage
- **Sentiment Analysis**: Get sentiment scoring with optional Google Cloud Natural Language API integration
- **Markdown Rendering**: All responses are rendered as properly formatted markdown
- **Markdown Export**: All responses can be exported to markdown documents
- **Raw Response View**: Toggle between formatted and raw JSON responses
- **Responsive Design**: Works seamlessly on both desktop and mobile devices
- **API Access**: Programmatic access to all features through a RESTful API

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

3. There are two options to configure the LLM Connectivity settings for API keys and Google Cloud host project:

   3a. (option 1) Edit the `.env` file in the root directory with your API keys:
      ```
      GOOGLE_PROJECT_ID="your-google-project-id"
      OPENAI_API_KEY="your-openai-api-key"
      ANTHROPIC_API_KEY="your-anthropic-api-key"
      ```

   3b. (option 2) You can also add the env configurations into the app by clicking the "LLM Connectivity Settings" button in the top-right corner of the webpage.

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

## Analytics Features

The tool includes a comprehensive analytics dashboard that provides insights into model performance:

### Response Metrics

- Length Analysis: Compare response lengths in characters and words
- Complexity Analysis: Assess the complexity of responses based on word and sentence length
- Response Speed: Compare how quickly different models respond to the same prompts
- Token Usage: View token consumption by each model, broken down by prompt and completion tokens

### Sentiment Analysis

The tool provides two methods for sentiment analysis:

- Basic Sentiment Analysis: Built-in keyword-based sentiment scoring
- Advanced Sentiment Analysis: When configured with Google Cloud Project ID and Natural Language API enable

To enable advanced sentiment analysis:

```bash
# Enable the Natural Language API in your Google Cloud project
gcloud services enable language.googleapis.com
```

### Analytics Dashboard

* Visualize all metrics with interactive charts
* Toggle between different metric views
* Special dashboard for single-model analysis
* Compare metrics across multiple prompts

## API Usage

The tool provides a RESTful API for programmatic access to all its features.

### API Endpoints

```
POST /api/compare
GET /api/compare
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | String | Yes | The prompt to send to the language models |
| `system_instructions` | String | No | System instructions to guide model behavior |
| models | Array | Yes | Array of models to query. Supported: "claude", "gemini", "chatgpt" |
| `temperature` | Number | No | Temperature parameter (0.0-1.0). Default: 0.7 |
| `max_tokens` | Number | No | Maximum tokens to generate. Default: 2048 |
| `analyze_responses` | Boolean | No | Whether to analyze the responses. Default: false |
| `analyze_responses_model` | String | No | Model to use for analysis. Default: "ChatGPT" |
| `metrics` | Boolean | No | Whether to return metrics about the responses. Default: false |
| `model_versions` | Object | No | Specify model versions, e.g. `{"claude": "claude-3-5-sonnet-20240620"}` |

### Example API Call with curl

```bash
curl -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing in simple terms.",
    "system_instructions": "You are a helpful assistant that explains complex topics simply.",
    "models": ["claude", "gemini", "chatgpt"],
    "temperature": 0.5,
    "max_tokens": 1000,
    "analyze_responses": true,
    "metrics": true,
    "model_versions": {
      "claude": "claude-3-7-sonnet-20250219",
      "gemini": "gemini-2.0-flash-001",
      "chatgpt": "gpt-4o"
    }
  }'
```

### Example API Response

```json
{
  "timestamp": "2025-04-19T12:34:56.789Z",
  "prompt": "Explain quantum computing in simple terms.",
  "system_instructions": "You are a helpful assistant that explains complex topics simply.",
  "models_requested": ["claude", "gemini", "chatgpt"],
  "models_processed": ["claude", "gemini", "chatgpt"],
  "models_failed": [],
  "responses": [
    {
      "model": "Claude Sonnet",
      "text": "Quantum computing is...",
      "encoded_text": "UXVhbnR1bSBjb21wdXRpbmcgaXMuLi4=",
      "responseTime": 1234,
      "promptTokens": 15,
      "completionTokens": 150
    },
    {
      "model": "Gemini",
      "text": "Quantum computing uses...",
      "encoded_text": "UXVhbnR1bSBjb21wdXRpbmcgdXNlcy4uLg==",
      "responseTime": 1456,
      "promptTokens": 12,
      "completionTokens": 142
    },
    {
      "model": "ChatGPT",
      "text": "Think of quantum computing as...",
      "encoded_text": "VGhpbmsgb2YgcXVhbnR1bSBjb21wdXRpbmcgYXMuLi4=",
      "responseTime": 980,
      "promptTokens": 14,
      "completionTokens": 165
    }
  ],
  "metrics": {
    "response_length": {
      "Claude Sonnet": 450,
      "Gemini": 520,
      "ChatGPT": 480
    },
    "word_count": {
      "Claude Sonnet": 75,
      "Gemini": 87,
      "ChatGPT": 80
    },
    "token_usage": {
      "Claude Sonnet": {
        "prompt_tokens": 15,
        "completion_tokens": 150,
        "total_tokens": 165
      },
      "Gemini": {
        "prompt_tokens": 12,
        "completion_tokens": 142,
        "total_tokens": 154
      },
      "ChatGPT": {
        "prompt_tokens": 14,
        "completion_tokens": 165,
        "total_tokens": 179
      }
    },
    "response_time": {
      "Claude Sonnet": {
        "ms": 1234,
        "seconds": 1.234
      },
      "Gemini": {
        "ms": 1456,
        "seconds": 1.456
      },
      "ChatGPT": {
        "ms": 980,
        "seconds": 0.98
      }
    },
    "complexity": {
      "Claude Sonnet": {
        "avg_word_length": 5.2,
        "avg_sentence_length": 15.3,
        "complexity_score": 8.7
      },
      "Gemini": {
        "avg_word_length": 4.9,
        "avg_sentence_length": 16.2,
        "complexity_score": 8.6
      },
      "ChatGPT": {
        "avg_word_length": 5.0,
        "avg_sentence_length": 17.8,
        "complexity_score": 9.1
      }
    },
    "sentiment": {
      "Claude Sonnet": {
        "score": 0.2,
        "magnitude": 0.8,
        "using_gcp_api": true
      },
      "Gemini": {
        "score": 0.3,
        "magnitude": 0.7,
        "using_gcp_api": true
      },
      "ChatGPT": {
        "score": 0.1,
        "magnitude": 0.9,
        "using_gcp_api": true
      }
    }
  },
  "analysis": {
    "model": "ChatGPT",
    "text": "In comparing the responses...",
    "encoded_text": "SW4gY29tcGFyaW5nIHRoZSByZXNwb25zZXMuLi4="
  }
}
```

### API Error Handling

For invalid requests or processing errors, the API will return an appropriate HTTP status code and an error message:

```json
{
  "error": "Error message"
}
```

Common error codes:
- 400: Bad Request (missing required parameters)
- 401: Unauthorized (API credentials issue)
- 500: Internal Server Error


## Extending with New Models

The application is designed to be easily extensible. To add a new model:

1. Create a new server function in `app/lib/models.js`
2. Add model configuration in the `MODEL_CONFIGS` object in `app/page.js`
3. Add the model to the `AVAILABLE_MODELS` array in `app/page.js`

## Technologies Used

- **Next.js**: React framework with App Router
- **React 19**: For UI components
- **Tailwind CSS**: For styling
- **DaisyUI**: For making things pretty
- **react-markdown**: For rendering markdown content
- **API Integrations**: OpenAI, Anthropic Claude, and Google Vertex AI


Built with ❤️ using Next.js and Tailwind CSS.
