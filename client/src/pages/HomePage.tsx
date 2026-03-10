import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Music2, Search, BookOpen, Disc, Video, Headphones, ChevronLeft, ChevronRight, X, Star, Shuffle, ListOrdered } from "lucide-react";
import type { Tune } from "@shared/schema";
import { useFavorites } from "@/hooks/useFavorites";
import { usePlaylist } from "@/context/PlaylistContext";
import TipJar from "@/components/TipJar";
import { useSwipe } from "@/hooks/useSwipe";
import fiddleHero from "@assets/IMG_5307_1773106986966.jpeg";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 border-green-200",
  intermediate: "bg-amber-100 text-amber-800 border-amber-200",
  advanced: "bg-red-100 text-red-800 border-red-200",
};

const TUNE_TYPE_COLORS: Record<string, string> = {
  breakdown: "#F59E0B",
  reel: "#0EA5E9",
  waltz: "#8B5CF6",
  jig: "#10B981",
  modal: "#F43F5E",
  polka: "#F97316",
  march: "#6366F1",
  hornpipe: "#14B8A6",
  polska: "#A855F7",
  schottische: "#EC4899",
};

const TUNE_TYPE_BADGE: Record<string, string> = {
  breakdown: "bg-amber-50 text-amber-700 border-amber-200",
  reel: "bg-sky-50 text-sky-700 border-sky-200",
  waltz: "bg-violet-50 text-violet-700 border-violet-200",
  jig: "bg-emerald-50 text-emerald-700 border-emerald-200",
  modal: "bg-rose-50 text-rose-700 border-rose-200",
  polka: "bg-orange-50 text-orange-700 border-orange-200",
  march: "bg-indigo-50 text-indigo-700 border-indigo-200",
  hornpipe: "bg-teal-50 text-teal-700 border-teal-200",
  polska: "bg-purple-50 text-purple-700 border-purple-200",
};

const KEY_ORDER = ["A", "Am", "D", "Dm", "G", "Gm", "C", "Em", "F", "Bm"];
const PAGE_SIZE = 48;
const SESSION_STORAGE_KEY = "tunevault_search";

interface TunesResponse {
  tunes: Tune[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface SearchState {
  search: string;
  key: string;
  difficulty: string;
  region: string;
  tuneType: string;
  page: number;
}

function loadSession(): SearchState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(state: SearchState) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function getInitialState(): SearchState {
  const p = new URLSearchParams(window.location.search);
  const hasUrl =
    p.has("search") || p.has("key") || p.has("difficulty") ||
    p.has("region") || p.has("tuneType") || p.has("page");
  if (hasUrl) {
    return {
      search: p.get("search") || "",
      key: p.get("key") || "all",
      difficulty: p.get("difficulty") || "all",
      region: p.get("region") || "all",
      tuneType: p.get("tuneType") || "all",
      page: parseInt(p.get("page") || "1", 10),
    };
  }
  const stored = loadSession();
  if (stored) return stored;
  return { search: "", key: "all", difficulty: "all", region: "all", tuneType: "all", page: 1 };
}

export default function HomePage() {
  const init = getInitialState();
  const [searchInput, setSearchInput] = useState(init.search);
  const [search, setSearch] = useState(init.search);
  const [selectedKey, setSelectedKey] = useState(init.key);
  const [selectedDifficulty, setSelectedDifficulty] = useState(init.difficulty);
  const [selectedRegion, setSelectedRegion] = useState(init.region);
  const [selectedType, setSelectedType] = useState(init.tuneType);
  const [page, setPage] = useState(init.page);
  const [showFavorites, setShowFavorites] = useState(false);
  const [shuffleLoading, setShuffleLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { favorites, toggleFavorite, isFavorite, favoritesCount } = useFavorites();
  const { startPlaylist } = usePlaylist();

  useEffect(() => {
    if (showFavorites) return;
    const state: SearchState = {
      search,
      key: selectedKey,
      difficulty: selectedDifficulty,
      region: selectedRegion,
      tuneType: selectedType,
      page,
    };
    saveSession(state);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (selectedKey !== "all") p.set("key", selectedKey);
    if (selectedDifficulty !== "all") p.set("difficulty", selectedDifficulty);
    if (selectedRegion !== "all") p.set("region", selectedRegion);
    if (selectedType !== "all") p.set("tuneType", selectedType);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? "?" + qs : window.location.pathname);
  }, [search, selectedKey, selectedDifficulty, selectedRegion, selectedType, page, showFavorites]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

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
    enabled: !showFavorites,
  });

  const favIdList = Array.from(favorites).join(",");
  const { data: favData, isLoading: favLoading } = useQuery<TunesResponse>({
    queryKey: ["/api/tunes", "favorites", favIdList],
    queryFn: () => favIdList ? fetch(`/api/tunes?ids=${favIdList}`).then((r) => r.json()) : Promise.resolve({ tunes: [], total: 0, page: 1, totalPages: 1, limit: 48 }),
    enabled: showFavorites,
  });

  const { data: keys = [] } = useQuery<{ key: string; count: number }[]>({ queryKey: ["/api/keys"] });
  const { data: regions = [] } = useQuery<{ region: string; count: number }[]>({ queryKey: ["/api/regions"] });
  const { data: tuneTypes = [] } = useQuery<{ tuneType: string; count: number }[]>({ queryKey: ["/api/types"] });
  const { data: stats } = useQuery<{ total: number; withVideo: number; withAbc: number; withAudio: number }>({ queryKey: ["/api/stats"] });

  const activeData = showFavorites ? favData : data;
  const tunes = activeData?.tunes ?? [];
  const total = activeData?.total ?? 0;
  const totalPages = activeData?.totalPages ?? 1;
  const isLoadingAny = showFavorites ? favLoading : isLoading;

  const sortedKeys = [...keys].sort((a, b) => {
    const ai = KEY_ORDER.indexOf(a.key), bi = KEY_ORDER.indexOf(b.key);
    if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
    if (ai === -1) return 1; if (bi === -1) return -1;
    return ai - bi;
  });

  const hasFilters = selectedKey !== "all" || selectedDifficulty !== "all" || selectedRegion !== "all" || selectedType !== "all" || search !== "";

  const clearFilters = () => {
    setSearchInput(""); setSearch("");
    setSelectedKey("all"); setSelectedDifficulty("all");
    setSelectedRegion("all"); setSelectedType("all");
    setPage(1); setShowFavorites(false);
  };

  const changePage = (n: number) => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => { if (!showFavorites && page < totalPages) changePage(page + 1); },
    onSwipeRight: () => { if (!showFavorites && page > 1) changePage(page - 1); },
  });

  const tunesWithAudio = tunes.filter((t) => t.audioUrl || t.locItemId);

  const handleShufflePlay = useCallback(async () => {
    setShuffleLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedKey !== "all") params.set("key", selectedKey);
      if (selectedDifficulty !== "all") params.set("difficulty", selectedDifficulty);
      if (selectedRegion !== "all") params.set("region", selectedRegion);
      if (selectedType !== "all") params.set("tuneType", selectedType);
      const res = await fetch(`/api/tunes/playlist?${params}`);
      const allTunes: Tune[] = await res.json();
      if (allTunes.length > 0) startPlaylist(allTunes);
    } catch (e) {
      if (tunesWithAudio.length > 0) startPlaylist(tunesWithAudio);
    } finally {
      setShuffleLoading(false);
    }
  }, [search, selectedKey, selectedDifficulty, selectedRegion, selectedType, tunesWithAudio, startPlaylist]);

  const handleFavoritesShufflePlay = useCallback(() => {
    const favTunes = favData?.tunes?.filter((t) => t.audioUrl || t.locItemId) ?? [];
    if (favTunes.length > 0) startPlaylist(favTunes);
  }, [favData, startPlaylist]);

  return (
    <div className="min-h-screen bg-background pb-24 pt-12 sm:pt-12" {...swipeHandlers}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div
        className="relative text-primary-foreground px-4 pt-12 pb-10 overflow-hidden border-b border-white/10"
        style={{
          backgroundImage: [
            "linear-gradient(150deg, hsla(25,65%,16%,0.80) 0%, hsla(25,60%,22%,0.72) 100%)",
            `url(${fiddleHero})`,
          ].join(", "),
          backgroundSize: "auto, cover",
          backgroundPosition: "center, center 30%",
          backgroundRepeat: "no-repeat, no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.18),transparent_65%)] pointer-events-none" />

        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="flex items-center gap-4 mb-1">
            <Music2 className="w-16 h-16 drop-shadow" style={{ strokeWidth: 3, color: "#F59E0B" }} />
            <div>
              <h1 className="text-5xl font-bold tracking-tight font-serif drop-shadow-sm">TuneVault</h1>
              <p className="text-base opacity-80 mt-0.5 tracking-wide" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 500 }}>A Treasury of Old-Time Fiddle Music</p>
            </div>
          </div>

          {/* Hero search */}
          <div className="relative max-w-2xl mt-7">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/50 pointer-events-none" />
            <input
              data-testid="input-search"
              className="w-full rounded-full bg-white/15 border border-white/25 text-primary-foreground placeholder:text-primary-foreground/55 pl-12 pr-10 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-white/35 transition-all"
              placeholder={`Search ${stats?.total?.toLocaleString() ?? "1,000+"} old-time tunes…`}
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setShowFavorites(false); }}
            />
            {searchInput && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-foreground/50 hover:text-primary-foreground/80 transition-colors"
                onClick={() => { setSearchInput(""); setSearch(""); }}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex flex-wrap gap-x-7 gap-y-2 mt-5 text-sm">
              <span className="flex items-center gap-1.5 opacity-80" data-testid="stat-total">
                <Disc className="w-4 h-4" />
                <strong>{stats.total?.toLocaleString()}</strong> tunes
              </span>
              <span className="flex items-center gap-1.5 opacity-80" data-testid="stat-audio">
                <Headphones className="w-4 h-4" />
                <strong>{stats.withAudio?.toLocaleString()}</strong> with audio
              </span>
              <span className="flex items-center gap-1.5 opacity-80" data-testid="stat-video">
                <Video className="w-4 h-4" />
                <strong>{stats.withVideo?.toLocaleString()}</strong> with video
              </span>
              <span className="flex items-center gap-1.5 opacity-80" data-testid="stat-abc">
                <BookOpen className="w-4 h-4" />
                <strong>{stats.withAbc?.toLocaleString()}</strong> with notation
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky filter strip ───────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto max-w-5xl px-4 py-2 flex flex-wrap items-center gap-2">
          <Select value={selectedKey} onValueChange={(v) => { setSelectedKey(v); setShowFavorites(false); }}>
            <SelectTrigger data-testid="select-key" className="h-8 w-36 text-xs rounded-full border-border">
              <SelectValue placeholder="All Keys" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Keys</SelectItem>
              {sortedKeys.map((k) => (
                <SelectItem key={k.key} value={k.key}>Key of {k.key} ({k.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setShowFavorites(false); }}>
            <SelectTrigger data-testid="select-type" className="h-8 w-36 text-xs rounded-full border-border">
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

          <Select value={selectedRegion} onValueChange={(v) => { setSelectedRegion(v); setShowFavorites(false); }}>
            <SelectTrigger data-testid="select-region" className="h-8 w-40 text-xs rounded-full border-border">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.region} value={r.region}>{r.region} ({r.count})</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDifficulty} onValueChange={(v) => { setSelectedDifficulty(v); setShowFavorites(false); }}>
            <SelectTrigger data-testid="select-difficulty" className="h-8 w-36 text-xs rounded-full border-border">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showFavorites ? "default" : "outline"}
            size="sm"
            className={`h-8 px-3 text-xs rounded-full gap-1 ${showFavorites ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" : "border-amber-300 text-amber-700 hover:bg-amber-50"}`}
            onClick={() => setShowFavorites((v) => !v)}
            data-testid="button-toggle-favorites"
          >
            <Star className={`w-3 h-3 ${showFavorites ? "fill-white" : "fill-amber-400"}`} />
            Favorites {favoritesCount > 0 && `(${favoritesCount})`}
          </Button>

          {(hasFilters || showFavorites) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs rounded-full text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}

          <span className="ml-auto text-xs text-muted-foreground tabular-nums hidden sm:block" data-testid="text-results-count">
            {isLoadingAny ? "…" : `${total.toLocaleString()} tunes`}
          </span>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="container mx-auto max-w-5xl px-4 py-6">

        {/* Play controls + page position row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {!isLoadingAny && !showFavorites && tunesWithAudio.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3.5 text-xs rounded-full gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={handleShufflePlay}
                disabled={shuffleLoading}
                data-testid="button-shuffle-play"
              >
                <Shuffle className="w-3.5 h-3.5" />
                {shuffleLoading ? "Loading…" : "Shuffle Play"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3.5 text-xs rounded-full gap-1.5 border-border text-muted-foreground hover:bg-muted"
                onClick={async () => {
                  setShuffleLoading(true);
                  try {
                    const params = new URLSearchParams();
                    if (search) params.set("search", search);
                    if (selectedKey !== "all") params.set("key", selectedKey);
                    if (selectedDifficulty !== "all") params.set("difficulty", selectedDifficulty);
                    if (selectedRegion !== "all") params.set("region", selectedRegion);
                    if (selectedType !== "all") params.set("tuneType", selectedType);
                    const res = await fetch(`/api/tunes/playlist?${params}`);
                    const allTunes: Tune[] = await res.json();
                    if (allTunes.length > 0) startPlaylist(allTunes, "chronological");
                  } catch { if (tunesWithAudio.length > 0) startPlaylist(tunesWithAudio, "chronological"); }
                  finally { setShuffleLoading(false); }
                }}
                disabled={shuffleLoading}
                data-testid="button-chrono-play"
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Play In Order
              </Button>
            </>
          )}
          {showFavorites && (favData?.tunes?.filter(t => t.audioUrl || t.locItemId).length ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3.5 text-xs rounded-full gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={handleFavoritesShufflePlay}
              data-testid="button-shuffle-favorites"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Shuffle Favorites
            </Button>
          )}
          {!isLoadingAny && total > 0 && (
            <p className="text-xs text-muted-foreground" data-testid="text-page-position">
              {showFavorites ? (
                <span>Showing <strong className="text-foreground">{total}</strong> saved tune{total !== 1 ? "s" : ""}</span>
              ) : (
                <span>
                  Showing <strong className="text-foreground">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)}</strong>{" "}
                  of <strong className="text-foreground">{total.toLocaleString()}</strong>
                  {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Grid */}
        {isLoadingAny ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i} className="h-40">
                <CardHeader>
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : showFavorites && tunes.length === 0 ? (
          <div className="text-center py-20">
            <Star className="w-14 h-14 mx-auto mb-4 text-amber-400 opacity-40" />
            <p className="text-lg text-muted-foreground">No favorites yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Click the ★ on any tune to save it here.</p>
          </div>
        ) : tunes.length === 0 ? (
          <div className="text-center py-20">
            <Music2 className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg text-muted-foreground">No tunes found.</p>
            <Button variant="outline" className="mt-4 rounded-full" onClick={clearFilters}>Clear Filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tunes.map((tune) => {
              const leftColor = TUNE_TYPE_COLORS[tune.tuneType ?? ""] ?? "hsl(var(--primary) / 0.35)";
              const typeBadge = TUNE_TYPE_BADGE[tune.tuneType ?? ""] ?? "bg-muted text-muted-foreground border-muted";
              const faved = isFavorite(tune.id);
              return (
                <div key={tune.id} className="relative">
                  <button
                    data-testid={`button-favorite-${tune.id}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(tune.id); }}
                    className="absolute top-2 right-2 z-10 p-1 rounded-full hover:bg-muted/80 transition-colors"
                    aria-label={faved ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star className={`w-4 h-4 transition-colors ${faved ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                  </button>
                  <Link href={`/tune/${tune.id}`}>
                    <Card
                      data-testid={`card-tune-${tune.id}`}
                      className="h-full cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
                      style={{ borderLeftColor: leftColor, borderLeftWidth: "3px" }}
                    >
                      <CardHeader className="pb-2 pt-4 pr-8">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-bold font-serif leading-snug">
                            {tune.title}
                          </CardTitle>
                          {(tune.popularity ?? 0) >= 9 && (
                            <Badge className="shrink-0 text-xs bg-amber-100 text-amber-800 border-amber-300 font-medium">
                              Essential
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex flex-wrap gap-1 mt-1.5">
                          <Badge variant="outline" className="text-xs border-primary/40 text-primary font-semibold">
                            Key of {tune.key}
                          </Badge>
                          {tune.tuneType && (
                            <Badge variant="outline" className={`text-xs capitalize ${typeBadge}`}>
                              {tune.tuneType}
                            </Badge>
                          )}
                          {tune.difficulty && (
                            <Badge variant="outline" className={`text-xs ${DIFFICULTY_COLORS[tune.difficulty] ?? ""}`}>
                              {tune.difficulty}
                            </Badge>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 pb-4">
                        {tune.description ? (
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed mb-2">
                            {tune.description}
                          </p>
                        ) : tune.region ? (
                          <p className="text-xs text-muted-foreground mb-2">{tune.region}</p>
                        ) : null}
                        <div className="flex gap-1.5 flex-wrap">
                          {(tune.audioUrl || tune.locItemId) && (
                            <Badge variant="secondary" className="text-xs gap-1 bg-amber-50 text-amber-700 border-amber-200 py-0" data-testid={`badge-audio-${tune.id}`}>
                              <Headphones className="w-3 h-3" /> Audio
                            </Badge>
                          )}
                          {tune.youtubeVideoId && (
                            <Badge variant="secondary" className="text-xs gap-1 bg-red-50 text-red-600 border-red-200 py-0" data-testid={`badge-video-${tune.id}`}>
                              <Video className="w-3 h-3" /> Video
                            </Badge>
                          )}
                          {tune.abcNotation && (
                            <Badge variant="secondary" className="text-xs gap-1 bg-sky-50 text-sky-700 border-sky-200 py-0" data-testid={`badge-abc-${tune.id}`}>
                              <BookOpen className="w-3 h-3" /> Notation
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!showFavorites && totalPages > 1 && !isLoadingAny && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-5"
              onClick={() => changePage(Math.max(1, page - 1))}
              disabled={page <= 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums min-w-[90px] text-center" data-testid="text-page-indicator">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-5"
              onClick={() => changePage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              data-testid="button-next-page"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Footer archives */}
        <div className="mt-16">
          <h3 className="text-center text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-4">
            Source Archives
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
            {[
              { name: "Library of Congress", url: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/", desc: "Henry Reed Collection" },
              { name: "Slippery Hill", url: "https://www.slippery-hill.com/", desc: "15,000+ Source Recordings" },
              { name: "TheSession.org", url: "https://thesession.org", desc: "ABC Notation Database" },
              { name: "OT Fiddle Tunes", url: "https://www.oldtimefiddletunes.net/links.html", desc: "Master Resource List" },
            ].map((src) => (
              <a
                key={src.name}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors"
                data-testid={`link-archive-${src.name.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <p className="font-semibold text-xs">{src.name}</p>
                <p className="text-muted-foreground text-xs mt-1">{src.desc}</p>
              </a>
            ))}
          </div>
          <TipJar />
        </div>
      </div>
    </div>
  );
}
