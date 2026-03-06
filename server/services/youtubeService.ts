/**
   * YouTube Service
   * Search for fiddle tune videos
   * Note: For production, add YouTube Data API key via Replit Secrets
   */

  interface YouTubeVideo {
    videoId: string;
    title: string;
    channelTitle: string;
    description: string;
    publishedAt: string;
  }

  export class YouTubeService {
    private apiKey: string | undefined;

    constructor() {
      // Check for YouTube API key in environment
      this.apiKey = process.env.YOUTUBE_API_KEY;
    }

    /**
     * Search for a fiddle tune on YouTube
     */
    async searchTune(tuneName: string): Promise<YouTubeVideo[]> {
      if (!this.apiKey) {
        console.warn('YouTube API key not configured. Returning empty results.');
        return [];
      }

      const query = encodeURIComponent(`${tuneName} old time fiddle`);
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=5&videoCategoryId=10&key=${this.apiKey}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error('YouTube API error:', response.statusText);
          return [];
        }

        const data = await response.json();
        
        return data.items?.map((item: any) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          description: item.snippet.description,
          publishedAt: item.snippet.publishedAt,
        })) || [];
      } catch (error) {
        console.error('Error searching YouTube:', error);
        return [];
      }
    }

    /**
     * Extract video ID from YouTube URL
     */
    extractVideoId(url: string): string | null {
      const match = url.match(/[?&]v=([^&]+)/);
      return match ? match[1] : null;
    }

    /**
     * Build embed URL for a video
     */
    buildEmbedUrl(videoId: string): string {
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
    }
  }
  