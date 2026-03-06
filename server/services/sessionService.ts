/**
   * TheSession.org API Service
   * Fetches ABC notation and tune data
   * API Docs: https://thesession.org/api
   */

  interface SessionTune {
    id: number;
    name: string;
    type: string; // reel, jig, polka, etc.
    settings: Array<{
      id: number;
      key: string;
      abc: string;
      date: string;
    }>;
  }

  interface SessionSearchResult {
    id: number;
    name: string;
    type: string;
    url: string;
  }

  export class TheSessionService {
    private baseUrl = 'https://thesession.org';

    /**
     * Search for tunes by name
     */
    async searchTunes(query: string): Promise<SessionSearchResult[]> {
      const searchQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/tunes/search?q=${searchQuery}&format=json`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error('TheSession API error:', response.statusText);
          return [];
        }

        const data = await response.json();
        return data.tunes || [];
      } catch (error) {
        console.error('Error searching TheSession:', error);
        return [];
      }
    }

    /**
     * Get tune details with ABC notation
     */
    async getTuneDetails(tuneId: number): Promise<SessionTune | null> {
      const url = `${this.baseUrl}/tunes/${tuneId}?format=json`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching tune details:', error);
        return null;
      }
    }

    /**
     * Get ABC notation for a tune (first setting)
     */
    async getAbcNotation(tuneId: number): Promise<string | null> {
      const tune = await this.getTuneDetails(tuneId);
      if (!tune || !tune.settings || tune.settings.length === 0) {
        return null;
      }

      // Return the first (usually most popular) setting
      return tune.settings[0].abc;
    }

    /**
     * Find tune by exact name match
     */
    async findTuneByName(tuneName: string): Promise<SessionTune | null> {
      const results = await this.searchTunes(tuneName);
      
      // Try to find exact match (case-insensitive)
      const exactMatch = results.find(
        (result) => result.name.toLowerCase() === tuneName.toLowerCase()
      );

      if (exactMatch) {
        return await this.getTuneDetails(exactMatch.id);
      }

      // If no exact match but we have results, return the first one
      if (results.length > 0) {
        return await this.getTuneDetails(results[0].id);
      }

      return null;
    }
  }
  