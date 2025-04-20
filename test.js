
/**
 * Test script for the LLM Comparison API
 * Run with: node app/api/compare/test.js
 */

async function testApi() {
  try {
    console.log('Testing LLM Comparison API...');
    
    const response = await fetch('http://localhost:3000/api/compare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Explain the concept of neural networks in 3 paragraphs',
        system_instructions: 'You are a helpful AI teacher explaining complex concepts simply.',
        models: ['claude', 'gemini', 'chatgpt'],
        temperature: 0.5,
        max_tokens: 1000,
        analyze_responses: true,
        metrics: true
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('API Response:');
      console.log(JSON.stringify(result, null, 2));
      
      // Decode the base64 responses to show the actual text
      console.log('\nDecoded Responses:');
      result.responses.forEach(response => {
        console.log(`\n${response.model}:`);
        console.log(Buffer.from(response.encoded_text, 'base64').toString());
      });
      
      if (result.analysis) {
        console.log('\nAnalysis:');
        console.log(Buffer.from(result.analysis.encoded_text, 'base64').toString());
      }
    } else {
      console.error('API Error:', result.error);
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testApi();