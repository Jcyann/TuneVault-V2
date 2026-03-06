import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Music2, Search, BookOpen, Disc, Video } from "lucide-react";
import type { Tune } from "@shared/schema";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 border-green-300",
  intermediate: "bg-amber-100 text-amber-800 border-amber-300",
  advanced: "bg-red-100 text-red-800 border-red-300",
};

const KEY_ORDER = ["A", "Am", "D", "Dm", "G", "Gm", "C", "Em", "F", "Bm"];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");

  const { data: tunes = [], isLoading } = useQuery<Tune[]>({
    queryKey: ["/api/tunes"],
  });

  const { data: keys = [] } = useQuery<{ key: string; count: number }[]>({
    queryKey: ["/api/keys"],
  });

  const { data: regions = [] } = useQuery<{ region: string; count: number }[]>({
    queryKey: ["/api/regions"],
  });

  const { data: stats } = useQuery<{ total: number; withVideo: number; withAbc: number }>({
    queryKey: ["/api/stats"],
  });

  const filteredTunes = tunes.filter((tune) => {
    const matchesSearch =
      search === "" ||
      tune.title.toLowerCase().includes(search.toLowerCase()) ||
      (tune.sourceFiddler ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (tune.alternativeTitles ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesKey = selectedKey === "all" || tune.key === selectedKey;
    const matchesDiff = selectedDifficulty === "all" || tune.difficulty === selectedDifficulty;
    const matchesRegion = selectedRegion === "all" || tune.region === selectedRegion;
    return matchesSearch && matchesKey && matchesDiff && matchesRegion;
  });

  const sortedKeys = [...keys].sort((a, b) => {
    const ai = KEY_ORDER.indexOf(a.key);
    const bi = KEY_ORDER.indexOf(b.key);
    if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const hasFilters = selectedKey !== "all" || selectedDifficulty !== "all" || selectedRegion !== "all" || search !== "";

  const clearFilters = () => {
    setSearch("");
    setSelectedKey("all");
    setSelectedDifficulty("all");
    setSelectedRegion("all");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="bg-primary text-primary-foreground py-14 px-4 shadow-lg">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-4 mb-3">
            <Music2 className="w-14 h-14 opacity-90" />
            <div>
              <h1 className="text-5xl font-bold tracking-tight font-serif">TuneVault</h1>
              <p className="text-lg opacity-80 mt-1">A Treasury of Old-Time Fiddle Music</p>
            </div>
          </div>
          <p className="mt-5 max-w-3xl opacity-85 text-base leading-relaxed">
            A comprehensive, scholarly collection of{" "}
            <strong>{stats?.total ?? "100+"} traditional American fiddle tunes</strong> organized
            by key, region, and difficulty — with embedded video, ABC notation, and direct links
            to the Library of Congress, TheSession.org, Tater Joe's, and Smithsonian Folkways.
            Built for lifelong learners and serious history buffs.
          </p>
          {stats && (
            <div className="flex flex-wrap gap-6 mt-6 text-sm opacity-80">
              <span className="flex items-center gap-2"><Video className="w-4 h-4" /> {stats.withVideo} with video</span>
              <span className="flex items-center gap-2"><Disc className="w-4 h-4" /> {stats.withAbc} with ABC notation</span>
              <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> {stats.total} tunes total</span>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Search & Filters */}
        <Card className="mb-8 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="w-5 h-5" /> Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2">
                <Input
                  data-testid="input-search"
                  placeholder="Search tunes, fiddlers, alternate names..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger data-testid="select-key">
                  <SelectValue placeholder="All Keys" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Keys</SelectItem>
                  {sortedKeys.map((k) => (
                    <SelectItem key={k.key} value={k.key}>
                      Key of {k.key} ({k.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger data-testid="select-difficulty">
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
            <div className="mt-3 flex flex-wrap gap-3 items-center">
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger data-testid="select-region" className="w-48">
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
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-muted-foreground text-sm">
            Showing <strong className="text-foreground">{filteredTunes.length}</strong>{" "}
            {filteredTunes.length === 1 ? "tune" : "tunes"}
            {filteredTunes.length !== tunes.length && ` of ${tunes.length}`}
          </p>
        </div>

        {/* Tunes Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTunes.length === 0 ? (
          <div className="text-center py-20">
            <Music2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-lg text-muted-foreground">No tunes found matching your criteria.</p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTunes.map((tune) => (
              <Link key={tune.id} href={`/tune/${tune.id}`}>
                <Card
                  data-testid={`card-tune-${tune.id}`}
                  className="h-full cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-snug">{tune.title}</CardTitle>
                      {(tune.popularity ?? 0) >= 9 && (
                        <Badge variant="secondary" className="shrink-0 text-xs bg-amber-100 text-amber-800 border-amber-300">
                          Essential
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className="border-primary/50 text-primary font-semibold">
                        Key of {tune.key}
                      </Badge>
                      {tune.tuneType && (
                        <Badge variant="outline" className="capitalize">
                          {tune.tuneType}
                        </Badge>
                      )}
                      {tune.difficulty && (
                        <Badge variant="outline" className={DIFFICULTY_COLORS[tune.difficulty] ?? ""}>
                          {tune.difficulty}
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      {tune.region && <p><span className="font-medium">Region:</span> <span className="text-muted-foreground">{tune.region}</span></p>}
                      {tune.sourceFiddler && <p><span className="font-medium">Source:</span> <span className="text-muted-foreground">{tune.sourceFiddler}</span></p>}
                      {tune.era && <p><span className="font-medium">Era:</span> <span className="text-muted-foreground">{tune.era}</span></p>}
                    </div>
                    {tune.description && (
                      <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                        {tune.description}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      {tune.youtubeVideoId && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Video className="w-3 h-3" /> Video
                        </Badge>
                      )}
                      {tune.abcNotation && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <BookOpen className="w-3 h-3" /> ABC
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Archive Footer */}
        <div className="mt-16 py-8 border-t border-border">
          <h3 className="text-center text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-6">
            Source Archives
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            {[
              { name: "Library of Congress", url: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/", desc: "Henry Reed Collection" },
              { name: "TheSession.org", url: "https://thesession.org", desc: "ABC Notation Database" },
              { name: "Tater Joe's", url: "http://www.taterjoes.com", desc: "Fiddle Transcriptions" },
              { name: "Smithsonian Folkways", url: "https://folkways.si.edu", desc: "Historic Recordings" },
            ].map((src) => (
              <a
                key={src.name}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors"
                data-testid={`link-archive-${src.name.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <p className="font-semibold">{src.name}</p>
                <p className="text-muted-foreground text-xs mt-1">{src.desc}</p>
              </a>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8">
            TuneVault — Built for serious learners and history buffs
          </p>
        </div>
      </div>
    </div>
  );
}
