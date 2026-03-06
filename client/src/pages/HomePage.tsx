import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Music2, Search, BookOpen, Disc, Video, Heart, Headphones, ChevronLeft, ChevronRight } from "lucide-react";
import type { Tune } from "@shared/schema";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 border-green-300",
  intermediate: "bg-amber-100 text-amber-800 border-amber-300",
  advanced: "bg-red-100 text-red-800 border-red-300",
};

const KEY_ORDER = ["A", "Am", "D", "Dm", "G", "Gm", "C", "Em", "F", "Bm"];
const PAGE_SIZE = 48;

interface TunesResponse {
  tunes: Tune[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export default function HomePage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [selectedKey, selectedDifficulty, selectedRegion, selectedType]);

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    ...(search && { search }),
    ...(selectedKey !== "all" && { key: selectedKey }),
    ...(selectedDifficulty !== "all" && { difficulty: selectedDifficulty }),
    ...(selectedRegion !== "all" && { region: selectedRegion }),
    ...(selectedType !== "all" && { tuneType: selectedType }),
  });

  const { data, isLoading } = useQuery<TunesResponse>({
    queryKey: ["/api/tunes", { search, key: selectedKey, difficulty: selectedDifficulty, region: selectedRegion, tuneType: selectedType, page }],
    queryFn: () => fetch(`/api/tunes?${queryParams}`).then((r) => r.json()),
  });

  const { data: keys = [] } = useQuery<{ key: string; count: number }[]>({
    queryKey: ["/api/keys"],
  });

  const { data: regions = [] } = useQuery<{ region: string; count: number }[]>({
    queryKey: ["/api/regions"],
  });

  const { data: tuneTypes = [] } = useQuery<{ tuneType: string; count: number }[]>({
    queryKey: ["/api/types"],
  });

  const { data: stats } = useQuery<{ total: number; withVideo: number; withAbc: number; withAudio: number }>({
    queryKey: ["/api/stats"],
  });

  const tunes = data?.tunes ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const sortedKeys = [...keys].sort((a, b) => {
    const ai = KEY_ORDER.indexOf(a.key);
    const bi = KEY_ORDER.indexOf(b.key);
    if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const hasFilters = selectedKey !== "all" || selectedDifficulty !== "all" || selectedRegion !== "all" || selectedType !== "all" || search !== "";

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setSelectedKey("all");
    setSelectedDifficulty("all");
    setSelectedRegion("all");
    setSelectedType("all");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div
        className="text-primary-foreground py-14 px-4 shadow-lg border-b border-white/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.82) 100%)" }}
      >
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
            <strong>{stats?.total?.toLocaleString() ?? "1,000+"} traditional American fiddle tunes</strong> organized
            by key, region, and difficulty — with embedded audio, video, and ABC notation.
            Built for lifelong learners and serious history buffs.
          </p>
          {stats && (
            <div className="flex flex-wrap gap-6 mt-6 text-sm opacity-80">
              <span className="flex items-center gap-2" data-testid="stat-audio">
                <Headphones className="w-4 h-4" /> {stats.withAudio?.toLocaleString()} with audio
              </span>
              <span className="flex items-center gap-2" data-testid="stat-video">
                <Video className="w-4 h-4" /> {stats.withVideo?.toLocaleString()} with video
              </span>
              <span className="flex items-center gap-2" data-testid="stat-abc">
                <BookOpen className="w-4 h-4" /> {stats.withAbc?.toLocaleString()} with ABC notation
              </span>
              <span className="flex items-center gap-2" data-testid="stat-total">
                <Disc className="w-4 h-4" /> {stats.total?.toLocaleString()} tunes total
              </span>
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
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
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
                <SelectTrigger data-testid="select-region" className="w-44">
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
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger data-testid="select-type" className="w-44">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {tuneTypes.map((t) => (
                    <SelectItem key={t.tuneType} value={t.tuneType ?? ""}>
                      {t.tuneType ? t.tuneType.charAt(0).toUpperCase() + t.tuneType.slice(1) : "Unknown"} ({t.count})
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
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-muted-foreground text-sm" data-testid="text-results-count">
            {isLoading ? (
              "Loading…"
            ) : (
              <>
                Showing <strong className="text-foreground">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)}</strong>{" "}
                of <strong className="text-foreground">{total.toLocaleString()}</strong>{" "}
                {total === 1 ? "tune" : "tunes"}
              </>
            )}
          </p>
          {totalPages > 1 && !isLoading && (
            <p className="text-muted-foreground text-xs">
              Page {page} of {totalPages}
            </p>
          )}
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
        ) : tunes.length === 0 ? (
          <div className="text-center py-20">
            <Music2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-lg text-muted-foreground">No tunes found matching your criteria.</p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tunes.map((tune) => (
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
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {tune.audioUrl && (
                        <Badge variant="secondary" className="text-xs gap-1 bg-amber-50 text-amber-700 border-amber-200" data-testid={`badge-audio-${tune.id}`}>
                          <Headphones className="w-3 h-3" /> Audio
                        </Badge>
                      )}
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

        {/* Pagination */}
        {totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-center gap-4 mt-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page <= 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground" data-testid="text-page-indicator">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page >= totalPages}
              data-testid="button-next-page"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
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
          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
              <span>Enjoying TuneVault? Help keep the lights on.</span>
            </div>
            <a
              href="https://venmo.com/Jason-Chinchen"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-tip-jar"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
              style={{ backgroundColor: "#3D95CE" }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
                <path d="M19.01 1.01C19.77 2.33 20.1 3.69 20.1 5.4c0 5.12-4.37 11.77-7.91 16.44H4.67L1.6 2.31l7.08-.67 1.63 12.97c1.52-2.47 3.39-6.38 3.39-9.03 0-1.45-.26-2.44-.66-3.26l6.07-1.31z"/>
              </svg>
              Tip jar — @Jason-Chinchen
            </a>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            TuneVault — Built for serious learners and history buffs
          </p>
        </div>
      </div>
    </div>
  );
}
