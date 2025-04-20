/**
 * Utility function to retry async operations with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Options for retry behavior
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay between retries in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay between retries in ms (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if error is retryable (default: always retry)
 * @param {Function} options.onRetry - Function called before each retry attempt (default: console.log)
 * @returns {Promise<any>} - Result of the async function
 */
export async function withRetry(fn, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      shouldRetry = () => true,
      onRetry = (error, attempt) => console.log(`Retrying after error (attempt ${attempt}/${maxRetries}):`, error.message)
    } = options;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // First attempt (attempt = 0) or retry attempts
        return await fn();
      } catch (error) {
        lastError = error;
        
        // If this was the last attempt or we shouldn't retry this error, throw
        if (attempt >= maxRetries || !shouldRetry(error)) {
          throw error;
        }
        
        // Calculate delay with exponential backoff and some jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 500,
          maxDelay
        );
        
        // Call the onRetry callback
        onRetry(error, attempt + 1);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never be reached due to the throw above, but just in case
    throw lastError;
  }
  
  /**
   * Determines if an error is likely to be transient and should be retried
   * @param {Error} error - The error to check
   * @returns {boolean} - Whether the error should be retried
   */
  export function isRetryableError(error) {
    // Network errors are usually transient
    if (error.name === 'FetchError' || error.message.includes('network')) {
      return true;
    }
    
    // Check for common API rate limiting or server error status codes
    if (error.status) {
      // 429: Too Many Requests
      // 500-599: Server errors
      return error.status === 429 || (error.status >= 500 && error.status < 600);
    }
    
    // Check error message for common retryable error patterns
    const retryablePatterns = [
      'timeout', 
      'reset', 
      'ECONNRESET', 
      'ETIMEDOUT', 
      'ESOCKETTIMEDOUT',
      'ECONNREFUSED',
      'rate limit',
      'too many requests',
      'temporarily unavailable',
      'internal server error',
      'backend error'
    ];
    
    if (retryablePatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase()))) {
      return true;
    }
    
    return false;
  }