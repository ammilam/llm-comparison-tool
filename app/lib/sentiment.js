"use server";

import { LanguageServiceClient } from '@google-cloud/language';
import { getCredentials } from './models';

/**
 * Analyzes sentiment using Google Cloud Natural Language API if available,
 * otherwise falls back to basic sentiment analysis
 * @param {string} text - Text to analyze
 * @returns {Promise<{score: number, magnitude: number, success: boolean}>}
 */
export async function analyzeSentiment(text) {
  // First, check if we have Google Cloud credentials
  try {
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
    
    // Create a language client
    const client = new LanguageServiceClient();
    
    // Prepare the document
    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };
    
    // Call the GCP sentiment analysis API
    const [result] = await client.analyzeSentiment({document});
    const sentiment = result.documentSentiment;
    
    return {
      score: sentiment.score,
      magnitude: sentiment.magnitude,
      success: true,
      sentences: result.sentences.map(sentence => ({
        text: sentence.text.content,
        score: sentence.sentiment.score,
        magnitude: sentence.sentiment.magnitude
      }))
    };
  } catch (error) {
    console.error('Error analyzing sentiment with GCP:', error);
    
    // Fall back to basic analysis
    return {
      score: basicSentimentAnalysis(text),
      magnitude: 0,
      success: false,
      error: error.message
    };
  }
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