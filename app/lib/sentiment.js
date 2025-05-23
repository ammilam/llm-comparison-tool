"use server";

import { LanguageServiceClient } from '@google-cloud/language';
import { getCredentials } from './models';
import { withRetry, isRetryableError } from "../utils/retry";

/**
 * Analyzes sentiment using Google Cloud Natural Language API if available,
 * otherwise falls back to basic sentiment analysis
 * @param {string} text - Text to analyze
 * @returns {Promise<{score: number, magnitude: number, success: boolean}>}
 */
export async function analyzeSentiment(text, model) {
  // First, check if we have Google Cloud credentials
  const credentials = await getCredentials();

  // If we don't have a Google Project ID, fall back to basic analysis
  if (!credentials.googleProjectId) {
    return {
      score: basicSentimentAnalysis(text),
      magnitude: 0,
      success: false,
      error: "No Google Cloud Project ID configured"
    };
  }

  // Truncate extremely long texts to avoid GCP limits
  const truncatedText = text.substring(0, 100000); // GCP has a size limit

  // Try to use GCP sentiment analysis with retries
  return withRetry(
    async () => {
      // Create a language client
      const client = new LanguageServiceClient();

      // Prepare the document
      const document = {
        content: truncatedText,
        type: 'PLAIN_TEXT',
      };

      // Call the GCP sentiment analysis API
      const [result] = await client.analyzeSentiment({ document });
      const sentiment = result.documentSentiment;

      const score = sentiment.score !== null && sentiment.score !== undefined ?
        Number(sentiment.score) : 0;

      const magnitude = sentiment.magnitude !== null && sentiment.magnitude !== undefined ?
        Number(sentiment.magnitude) : 0;

      // Handle null or undefined values with defaults
      return {
        score: score,
        magnitude: magnitude,
        success: true,
        sentences: result.sentences?.map(sentence => ({
          text: sentence.text?.content || "",
          score: sentence.sentiment?.score !== null ? Number(sentence.sentiment.score) : 0,
          magnitude: sentence.sentiment?.magnitude !== null ? Number(sentence.sentiment.magnitude) : 0
      })) || []
      };
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      shouldRetry: (error) => isRetryableError(error),
      onRetry: (error, attempt) => console.log(`Retrying sentiment analysis (attempt ${attempt}/2): ${error.message}`)
    }
  ).catch(error => {
    console.error('Error analyzing sentiment with GCP:', error);

    // Fall back to basic analysis
    return {
      score: basicSentimentAnalysis(text),
      magnitude: 0,
      success: false,
      error: error.message
    };
  });
}

/**
 * Basic sentiment analysis as a fallback when GCP is not available
 * @param {string} text - Text to analyze
 * @returns {number} - Sentiment score between -1 and 1
 */
function basicSentimentAnalysis(text) {
  const positive = [
    'good', 'great', 'excellent', 'best', 'positive', 'effective',
    'helpful', 'beneficial', 'success', 'wonderful', 'amazing',
    'impressive', 'outstanding', 'fantastic', 'splendid', 'superb'
  ];

  const negative = [
    'bad', 'worst', 'poor', 'negative', 'ineffective', 'harmful',
    'failure', 'issue', 'problem', 'terrible', 'horrible',
    'awful', 'disappointing', 'frustrating', 'inadequate', 'useless'
  ];

  const lowerText = text.toLowerCase();
  let score = 0;
  let totalMatches = 0;

  // Count positive word occurrences
  positive.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      score += matches.length;
      totalMatches += matches.length;
    }
  });

  // Count negative word occurrences
  negative.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      score -= matches.length;
      totalMatches += matches.length;
    }
  });

  // Normalize score to range between -1 and 1
  // If no matches, return 0 (neutral)
  return totalMatches > 0 ? score / (totalMatches * 2) : 0;
}