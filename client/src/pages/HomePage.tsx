import { useState } from "react";
  import { useQuery } from "@tanstack/react-query";
  import { Link } from "wouter";
  import { Music2, Search, Filter, Library, ExternalLink } from "lucide-react";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import type { Tune } from "@shared/schema";

  export default function HomePage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const { data: tunes = [], isLoading } = useQuery<Tune[]>({
      queryKey: ["/api/tunes", selectedKey, searchTerm],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (selectedKey) params.append("key", selectedKey);
        if (searchTerm) params.append("search", searchTerm);
        const response = await fetch(`/api/tunes?${params}`);
        return response.json();
      },
    });

    const { data: keys = [] } = useQuery<{ key: string; count: number }[]>({
      queryKey: ["/api/keys"],
      queryFn: async () => {
        const response = await fetch("/api/keys");
        return response.json();
      },
    });

    const filteredTunes = tunes.filter((tune) =>
      tune.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tune.sourceFiddler?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="min-h-screen">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-3 mb-2">
              <Music2 className="h-10 w-10 text-amber-700" />
              <div>
                <h1 className="text-4xl font-bold text-amber-900 tracking-tight">
                  TuneVault
                </h1>
                <p className="text-sm text-amber-700">Old Time Fiddle Treasury</p>
              </div>
            </div>
            <p className="text-gray-600 max-w-3xl">
              A comprehensive searchable treasury of Old Time Fiddle tunes with embedded media, 
              slow-down playback, and links to major historical repositories.
            </p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Search and Filter Controls */}
          <div className="mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search tunes by title or fiddler..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 py-6 text-lg"
              />
            </div>

            {/* Key Filter Tabs */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by Key:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedKey === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedKey(null)}
                  className={selectedKey === null ? "bg-amber-700 hover:bg-amber-800" : ""}
                >
                  All Keys ({tunes.length})
                </Button>
                {keys.map(({ key, count }) => (
                  <Button
                    key={key}
                    variant={selectedKey === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedKey(key)}
                    className={selectedKey === key ? "bg-amber-700 hover:bg-amber-800" : ""}
                  >
                    {key} ({count})
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-amber-200 hover:border-amber-400 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Library className="h-5 w-5 text-amber-700" />
                  Tater Joe's
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">
                  Extensive collection of transcriptions
                </p>
                <a
                  href="http://www.taterjoes.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:text-amber-900 text-sm font-medium inline-flex items-center gap-1"
                >
                  Visit Site <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>

            <Card className="border-amber-200 hover:border-amber-400 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Library className="h-5 w-5 text-amber-700" />
                  Library of Congress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">
                  Historic fiddle tune recordings
                </p>
                <a
                  href="https://www.loc.gov/collections/henry-reed-fiddle-tunes/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:text-amber-900 text-sm font-medium inline-flex items-center gap-1"
                >
                  Browse Collection <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>

            <Card className="border-amber-200 hover:border-amber-400 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Library className="h-5 w-5 text-amber-700" />
                  Smithsonian Folkways
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">
                  Classic old-time fiddle recordings
                </p>
                <a
                  href="https://folkways.si.edu/classic-old-time-fiddle-from-folkways/old-time/music/album/smithsonian"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:text-amber-900 text-sm font-medium inline-flex items-center gap-1"
                >
                  Explore Archive <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Tunes Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading tunes...</p>
            </div>
          ) : filteredTunes.length === 0 ? (
            <div className="text-center py-12">
              <Music2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No tunes found</p>
              <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTunes.map((tune) => (
                <Link key={tune.id} href={`/tune/${tune.id}`}>
                  <Card className="h-full hover:shadow-lg transition-all hover:border-amber-300 cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                          {tune.key}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {tune.region}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl group-hover:text-amber-700 transition-colors">
                        {tune.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {tune.sourceFiddler}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {tune.description}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {tune.youtubeUrl && (
                          <Badge variant="outline" className="text-xs">
                            <Music2 className="h-3 w-3 mr-1" />
                            Video
                          </Badge>
                        )}
                        {tune.transcriptUrl && (
                          <Badge variant="outline" className="text-xs">
                            <Library className="h-3 w-3 mr-1" />
                            Notation
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t bg-white/80 mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
            <p>TuneVault - Preserving Old Time Fiddle traditions through accessible digital archives</p>
          </div>
        </footer>
      </div>
    );
  }
  