/**
 * URL validation utilities for ImageKit URLs
 * Prevents SSRF (Server-Side Request Forgery) attacks
 */

// ✅ Whitelist of allowed ImageKit domains
const ALLOWED_IMAGEKIT_DOMAINS = [
  'ik.imagekit.io',
  'ik.imagekit.in',
  // Add production ImageKit domains only
];

// ✅ Blocked IP ranges (private, loopback, etc.)
const BLOCKED_IP_RANGES = [
  /^127\./,           // 127.0.0.0/8 - Loopback
  /^10\./,            // 10.0.0.0/8 - Private
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12 - Private
  /^192\.168\./,      // 192.168.0.0/16 - Private
  /^169\.254\./,      // 169.254.0.0/16 - Link-local (AWS metadata)
  /^0\./,             // 0.0.0.0/8 - Invalid
  /^224\./,           // 224.0.0.0/4 - Multicast
];

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate ImageKit URL to prevent SSRF attacks
 */
export function validateImageKitUrl(urlString: string): UrlValidationResult {
  try {
    // 1. Parse URL
    const url = new URL(urlString);
    
    // 2. ✅ Only allow HTTPS (prevent downgrade attacks)
    if (url.protocol !== 'https:') {
      return {
        isValid: false,
        error: 'Only HTTPS URLs are allowed'
      };
    }
    
    // 3. ✅ Check domain whitelist
    const hostname = url.hostname.toLowerCase();
    const isAllowedDomain = ALLOWED_IMAGEKIT_DOMAINS.some(domain => {
      return hostname === domain || hostname.endsWith(`.${domain}`);
    });
    
    if (!isAllowedDomain) {
      return {
        isValid: false,
        error: `Domain not whitelisted: ${hostname}`
      };
    }
    
    // 4. ✅ Check for IP addresses directly (if someone bypasses DNS)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(hostname)) {
      // Direct IP address - check if blocked
      for (const range of BLOCKED_IP_RANGES) {
        if (range.test(hostname)) {
          return {
            isValid: false,
            error: `Blocked IP range: ${hostname}`
          };
        }
      }
      
      // Even if not in blocked range, reject direct IPs (should use domain)
      return {
        isValid: false,
        error: 'Direct IP addresses are not allowed. Use domain name.'
      };
    }
    
    // 5. ✅ Validate path contains ImageKit transformation format
    // Basic check: should contain ImageKit path structure
    if (!url.pathname.includes('/') || url.pathname.length < 2) {
      return {
        isValid: false,
        error: 'Invalid ImageKit URL path'
      };
    }
    
    // 6. ✅ Block query parameters that could be used for SSRF
    // ImageKit URLs shouldn't need query params for status checks
    if (url.search && url.search.length > 0) {
      // Allow only specific safe query parameters if needed
      const allowedParams = ['t', 'timestamp']; // Add only safe params
      const params = new URLSearchParams(url.search);
      
      for (const key of params.keys()) {
        if (!allowedParams.includes(key)) {
          return {
            isValid: false,
            error: `Query parameter not allowed: ${key}`
          };
        }
      }
    }
    
    return { isValid: true };
    
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

