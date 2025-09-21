import { IVideo } from "@/models/Video";

export type VideoFormData = Omit<IVideo, "_id">;

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  cache?: boolean;
};

class ApiClient {
  private requestCache = new Map<string, { data: unknown; timestamp: number }>();
  private pendingRequests = new Map<string, Promise<unknown>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(endpoint: string, options: FetchOptions): string {
    return `${options.method || 'GET'}:${endpoint}:${JSON.stringify(options.body || {})}`;
  }

  private async fetch<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { method = "GET", body, headers = {}, cache = true } = options;
    const cacheKey = this.getCacheKey(endpoint, options);

    // Check cache first
    if (cache && method === 'GET') {
      const cached = this.requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data as T;
      }
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)! as Promise<T>;
    }

    const defaultHeaders = {
      "Content-Type": "application/json",
      ...headers,
    };

    const requestPromise = (async () => {
      try {
        const response = await fetch(`/api${endpoint}`, {
          method,
          headers: defaultHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        
        // Cache successful GET requests
        if (cache && method === 'GET') {
          this.requestCache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        }

        return data;
      } finally {
        // Remove from pending requests
        this.pendingRequests.delete(cacheKey);
      }
    })();

    // Store pending request
    this.pendingRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  async getVideos() {
    return this.fetch("/video");
  }

  async createVideo(videoData: VideoFormData) {
    return this.fetch("/video", {
      method: "POST",
      body: videoData,
      cache: false
    });
  }

  async likeVideo(videoId: string) {
    return this.fetch(`/video/${videoId}/like`, {
      method: "POST",
      cache: false
    });
  }

  // Clear cache when needed
  clearCache() {
    this.requestCache.clear();
  }
}

export const apiClient = new ApiClient();
