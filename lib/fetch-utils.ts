/**
 * Utility functions for handling fetch requests with proper error handling
 */

export interface FetchResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Safely fetch JSON data with proper error handling
 */
export async function safeFetchJson<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<FetchResponse<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error ${response.status}:`, errorText);
      
      // Try to parse as JSON for structured error responses
      try {
        const errorData = JSON.parse(errorText);
        return {
          success: false,
          error: errorData.error || errorData.message || `HTTP ${response.status}`,
          status: response.status
        };
      } catch {
        // If not JSON, return the text error
        return {
          success: false,
          error: errorText || `HTTP ${response.status}`,
          status: response.status
        };
      }
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('Non-JSON response received:', responseText);
      return {
        success: false,
        error: `Expected JSON response but received: ${contentType}`,
        status: response.status
      };
    }

    // Parse JSON
    const data = await response.json();
    return {
      success: true,
      data,
      status: response.status
    };

  } catch (error) {
    console.error('Fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
}

/**
 * Fetch with automatic retry on failure
 */
export async function fetchWithRetry<T = any>(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<FetchResponse<T>> {
  let lastError: string = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await safeFetchJson<T>(url, options);
    
    if (result.success) {
      return result;
    }
    
    lastError = result.error || 'Unknown error';
    
    // Don't retry on client errors (4xx)
    if (result.status && result.status >= 400 && result.status < 500) {
      break;
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return {
    success: false,
    error: `Failed after ${maxRetries} attempts: ${lastError}`
  };
}
