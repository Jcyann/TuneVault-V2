/**
   * Library of Congress API Service
   * Fetches fiddle tunes from the Henry Reed Collection
   */

  interface LocItem {
    id: string;
    title: string;
    description?: string[];
    subjects?: string[];
    date?: string;
    url?: string;
  }

  interface LocResponse {
    results: LocItem[];
    pagination: {
      current: number;
      total: number;
    };
  }

  export class LibraryOfCongressService {
    private baseUrl = 'https://www.loc.gov';
    private collectionPath = '/collections/henry-reed-fiddle-tunes/';

    async fetchTunes(page: number = 1, perPage: number = 50): Promise<LocResponse> {
      const url = `${this.baseUrl}${this.collectionPath}?fo=json&sp=${page}&c=${perPage}`;
      const response = await fetch(url);
      return await response.json();
    }

    async searchTune(tuneName: string): Promise<LocResponse> {
      const query = encodeURIComponent(tuneName);
      const url = `${this.baseUrl}${this.collectionPath}?fo=json&q=${query}`;
      const response = await fetch(url);
      return await response.json();
    }

    extractTuneName(title: string): string {
      return title.split('/')[0].trim().replace(/\([^)]*\)/g, '').trim();
    }
  }
  