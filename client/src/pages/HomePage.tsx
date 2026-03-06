import { useState } from "react";
  import { useQuery } from "@tanstack/react-query";
  import { Link } from "wouter";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Music2, Search, Filter } from "lucide-react";

  interface Tune {
    id: number;
    title: string;
    alternativeTitles: string | null;
    key: string;
    tuneType: string | null;
    region: string | null;
    difficulty: string | null;
    sourceFiddler: string | null;
    era: string | null;
    popularity: number | null;
    description: string | null;
    youtubeUrl: string | null;
  }

  export default function HomePage() {
    const [search, setSearch] = useState("");
    const [selectedKey, setSelectedKey] = useState<string>("all");
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
    const [selectedRegion, setSelectedRegion] = useState<string>("all");

    // Fetch all tunes
    const { data: tunes = [], isLoading } = useQuery<Tune[]>({
      queryKey: ["/api/tunes"],
    });

    // Fetch keys for filter
    const { data: keys = [] } = useQuery<{ key: string; count: number }[]>({
      queryKey: ["/api/keys"],
    });

    // Fetch regions for filter
    const { data: regions = [] } = useQuery<{ region: string; count: number }[]>({
      queryKey: ["/api/regions"],
    });

    // Fetch stats
    const { data: stats } = useQuery<{ total: number; withVideo: number; withAbc: number }>({
      queryKey: ["/api/stats"],
    });

    // Filter tunes
    const filteredTunes = tunes.filter((tune) => {
      const matchesSearch = search === "" || 
        tune.title.toLowerCase().includes(search.toLowerCase()) ||
        tune.sourceFiddler?.toLowerCase().includes(search.toLowerCase()) ||
        tune.alternativeTitles?.toLowerCase().includes(search.toLowerCase());
      
      const matchesKey = selectedKey === "all" || tune.key === selectedKey;
      const matchesDifficulty = selectedDifficulty === "all" || tune.difficulty === selectedDifficulty;
      const matchesRegion = selectedRegion === "all" || tune.region === selectedRegion;

      return matchesSearch && matchesKey && matchesDifficulty && matchesRegion;
    });

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-amber-900 via-orange-800 to-amber-900 text-white py-16 px-4 shadow-lg">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-4 mb-4">
              <Music2 className="w-16 h-16" />
              <div>
                <h1 className="text-5xl font-bold tracking-tight">TuneVault</h1>
                <p className="text-xl text-amber-100 mt-2">
                  A Treasury of Old-Time Fiddle Music
                </p>
              </div>
            </div>
            <p className="text-amber-100 max-w-3xl mt-4 text-lg leading-relaxed">
              Explore {stats?.total || "100+"} traditional American fiddle tunes with historical context, 
              ABC notation, and links to the Library of Congress, TheSession.org, and authoritative archives. 
              Built for serious learners and history enthusiasts.
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl px-4 py-8">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="bg-white/80 backdrop-blur border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-2xl font-bold text-amber-900">{stats.total}</CardTitle>
                  <CardDescription>Total Tunes</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-white/80 backdrop-blur border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-2xl font-bold text-orange-800">{stats.withVideo}</CardTitle>
                  <CardDescription>With Video Resources</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-white/80 backdrop-blur border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-2xl font-bold text-amber-900">{stats.withAbc}</CardTitle>
                  <CardDescription>With ABC Notation</CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Search and Filters */}
          <Card className="mb-6 bg-white/90 backdrop-blur border-amber-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <Search className="w-5 h-5" />
                Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Search by title or fiddler..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-amber-300 focus:border-orange-500"
                  />
                </div>
                <Select value={selectedKey} onValueChange={setSelectedKey}>
                  <SelectTrigger className="border-amber-300">
                    <SelectValue placeholder="All Keys" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Keys</SelectItem>
                    {keys.map((k) => (
                      <SelectItem key={k.key} value={k.key}>
                        {k.key} ({k.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="border-amber-300">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4">
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="border-amber-300">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r.region} value={r.region}>
                        {r.region} ({r.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results Count */}
          <div className="mb-4 text-amber-900">
            <p className="text-lg">
              Showing <strong>{filteredTunes.length}</strong> {filteredTunes.length === 1 ? 'tune' : 'tunes'}
            </p>
          </div>

          {/* Tunes Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-amber-900">
              <Music2 className="w-12 h-12 mx-auto mb-4 animate-pulse" />
              <p className="text-lg">Loading tunes...</p>
            </div>
          ) : filteredTunes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-amber-800">No tunes found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTunes.map((tune) => (
                <Link key={tune.id} href={`/tune/${tune.id}`}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/90 backdrop-blur border-amber-200 hover:border-orange-400 hover:scale-[1.02]">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-xl text-amber-900 leading-tight">
                          {tune.title}
                        </CardTitle>
                        {tune.popularity && tune.popularity >= 9 && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300 shrink-0">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="space-y-1">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-amber-400 text-amber-800">
                            {tune.key}
                          </Badge>
                          {tune.tuneType && (
                            <Badge variant="outline" className="border-orange-400 text-orange-800">
                              {tune.tuneType}
                            </Badge>
                          )}
                          {tune.difficulty && (
                            <Badge 
                              variant="outline"
                              className={
                                tune.difficulty === 'beginner' 
                                  ? 'border-green-400 text-green-700'
                                  : tune.difficulty === 'intermediate'
                                  ? 'border-yellow-400 text-yellow-700'
                                  : 'border-red-400 text-red-700'
                              }
                            >
                              {tune.difficulty}
                            </Badge>
                          )}
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-amber-800">
                        {tune.region && (
                          <p><strong>Region:</strong> {tune.region}</p>
                        )}
                        {tune.sourceFiddler && (
                          <p><strong>Source:</strong> {tune.sourceFiddler}</p>
                        )}
                        {tune.era && (
                          <p><strong>Era:</strong> {tune.era}</p>
                        )}
                        {tune.description && (
                          <p className="text-xs text-amber-700 mt-2 line-clamp-2">
                            {tune.description}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-16 py-8 border-t border-amber-300 text-center text-amber-800">
            <p className="text-sm">
              <strong>TuneVault</strong> - Integrating with Library of Congress, TheSession.org, and historical archives
            </p>
            <p className="text-xs mt-2 text-amber-700">
              Built for serious learners and history enthusiasts
            </p>
          </div>
        </div>
      </div>
    );
  }
  