import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Music2, Search, BookOpen, Disc, Video, Headphones, ChevronLeft, ChevronRight, X, Star, Shuffle, ListOrdered, Link2, Check, Play, ListPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tune } from "@shared/schema";
import { useFavorites } from "@/hooks/useFavorites";
import { usePlaylist } from "@/context/PlaylistContext";
import TipJar from "@/components/TipJar";
import { useSwipe } from "@/hooks/useSwipe";
import fiddleHero from "@assets/IMG_5307_1773106986966.jpeg";

const TUNE_TYPE_COLORS: Record<string, string> = {
  breakdown: "#B45309",
  reel: "#0369A1",
  waltz: "#6D28D9",
  jig: "#047857",
  modal: "#BE123C",
  polka: "#C2410C",
  march: "#4338CA",
  hornpipe: "#0F766E",
  polska: "#7E22CE",
  schottische: "#BE185D",
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
  search: string; key: string; difficulty: string;
  region: string; tuneType: string; page: number;
}

function loadSession(): SearchState | null {
  try { const raw = sessionStorage.getItem(SESSION_STORAGE_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function saveSession(s: SearchState) { try { sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(s)); } catch {} }

function getInitialState(): SearchState {
  const p = new URLSearchParams(window.location.search);
  const hasUrl = p.has("search") || p.has("key") || p.has("difficulty") || p.has("region") || p.has("tuneType") || p.has("page");
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
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMounted = useRef(false);

  const { favorites, toggleFavorite, isFavorite, favoritesCount } = useFavorites();
  const { startPlaylist, enqueue } = usePlaylist();
  const { toast } = useToast();

  useEffect(() => {
    if (showFavorites) return;
    const state: SearchState = { search, key: selectedKey, difficulty: selectedDifficulty, region: selectedRegion, tuneType: selectedType, page };
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
    if (!hasMounted.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  useEffect(() => { if (!hasMounted.current) return; setPage(1); }, [selectedKey, selectedDifficulty, selectedRegion, selectedType]);
  useEffect(() => { hasMounted.current = true; setSearch(init.search); }, []);

  const queryParams = new URLSearchParams({
    page: String(page), limit: String(PAGE_SIZE),
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

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyFilterLink = useCallback(() => {
    if (copied) return;
    const url = window.location.href;
    const done = () => { setCopied(true); if (copyTimerRef.current) clearTimeout(copyTimerRef.current); copyTimerRef.current = setTimeout(() => setCopied(false), 2000); };
    navigator.clipboard.writeText(url).then(done).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); done(); } catch {}
      document.body.removeChild(ta);
    });
  }, [copied]);

  const changePage = (n: number) => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

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
    } catch { if (tunesWithAudio.length > 0) startPlaylist(tunesWithAudio); }
    finally { setShuffleLoading(false); }
  }, [search, selectedKey, selectedDifficulty, selectedRegion, selectedType, tunesWithAudio, startPlaylist]);

  const handleChronoPlay = useCallback(async () => {
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
  }, [search, selectedKey, selectedDifficulty, selectedRegion, selectedType, tunesWithAudio, startPlaylist]);

  const handleFavoritesShufflePlay = useCallback(() => {
    const favTunes = favData?.tunes?.filter((t) => t.audioUrl || t.locItemId) ?? [];
    if (favTunes.length > 0) startPlaylist(favTunes);
  }, [favData, startPlaylist]);

  // Compact filter trigger styling
  const filterTrigger = (active: boolean) =>
    `h-9 px-3 text-[11px] uppercase tracking-[0.12em] font-medium rounded-none border bg-transparent transition-colors focus:ring-0 focus:ring-offset-0 ${
      active
        ? "border-foreground text-foreground bg-foreground/[0.04]"
        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/50"
    }`;

  return (
    <div className="min-h-screen bg-background pb-32" {...swipeHandlers}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="border-b border-border pt-20 sm:pt-24">
        <div className="container mx-auto max-w-6xl px-5 pb-8 sm:pb-10">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] font-medium text-muted-foreground mb-5 sm:mb-6 flex items-center gap-3">
            <span className="h-px w-8 bg-foreground/40" />
            An Old-Time Fiddle Treasury
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-display font-bold tracking-tight leading-[0.95] text-foreground text-[2.75rem] sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
                <span className="block">TuneVault</span>
              </h1>
              <p className="font-display italic font-medium text-primary mt-3 text-xl sm:text-2xl lg:text-3xl leading-snug">
                Where the Old-Time tradition lives on.
              </p>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xs leading-relaxed shrink-0 pb-1">
              Source recordings, sheet music, and history for{" "}
              <strong className="text-foreground font-semibold tabular-nums">{Number(stats?.total ?? 0).toLocaleString("en-US") ?? "1,032"}</strong>{" "}
              tunes.
            </p>
          </div>
        </div>

        {/* Full-width banner image */}
        <div className="w-full h-52 sm:h-64 lg:h-72 overflow-hidden border-t border-border">
          <img
            src={fiddleHero}
            alt="A row of fiddles on weathered wood"
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 35%" }}
          />
        </div>
      </section>

      {/* ── SEARCH + FILTERS ────────────────────────────────────────── */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl px-5 py-6 sm:py-7">

          {/* Search input — underline editorial style */}
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              data-testid="input-search"
              className="w-full bg-transparent border-0 border-b border-foreground/30 focus:border-foreground pl-8 pr-10 py-3 text-lg sm:text-xl font-display text-foreground placeholder:text-muted-foreground/60 focus:outline-none transition-colors"
              placeholder={`Search ${Number(stats?.total ?? 0).toLocaleString("en-US") ?? "1,032"} tunes by title…`}
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setShowFavorites(false); }}
            />
            {searchInput && (
              <button
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                onClick={() => { setSearchInput(""); setSearch(""); }}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <Select value={selectedKey} onValueChange={(v) => { setSelectedKey(v); setShowFavorites(false); }}>
              <SelectTrigger data-testid="select-key" className={filterTrigger(selectedKey !== "all") + " w-[7.5rem]"}>
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
              <SelectTrigger data-testid="select-type" className={filterTrigger(selectedType !== "all") + " w-[8rem]"}>
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
              <SelectTrigger data-testid="select-region" className={filterTrigger(selectedRegion !== "all") + " w-[9rem]"}>
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
              <SelectTrigger data-testid="select-difficulty" className={filterTrigger(selectedDifficulty !== "all") + " w-[8rem]"}>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>

            <button
              data-testid="button-toggle-favorites"
              onClick={() => setShowFavorites((v) => !v)}
              className={`h-9 px-3 text-[11px] uppercase tracking-[0.12em] font-medium border transition-colors inline-flex items-center gap-1.5 ${
                showFavorites
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 bg-transparent"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${showFavorites ? "fill-current" : ""}`} />
              Favorites {favoritesCount > 0 && <span className="tabular-nums">({favoritesCount})</span>}
            </button>

            {(hasFilters || showFavorites) && (
              <button
                data-testid="button-clear-filters"
                onClick={clearFilters}
                className="h-9 px-3 text-[11px] uppercase tracking-[0.12em] font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}

            {/* Play actions — sit right next to the search filters */}
            <div className="ml-auto flex items-center gap-2">
              {!showFavorites && tunesWithAudio.length > 0 && (
                <>
                  <button
                    onClick={handleShufflePlay}
                    disabled={shuffleLoading}
                    data-testid="button-shuffle-play"
                    className="h-9 px-3 text-[11px] uppercase tracking-[0.12em] font-medium border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    {shuffleLoading ? "Loading" : "Shuffle play"}
                  </button>
                  <button
                    onClick={handleChronoPlay}
                    disabled={shuffleLoading}
                    data-testid="button-chrono-play"
                    className="h-9 px-3 text-[11px] uppercase tracking-[0.12em] font-medium border border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors inline-flex items-center gap-1.5"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    Play in order
                  </button>
                </>
              )}
              {showFavorites && (favData?.tunes?.filter(t => t.audioUrl || t.locItemId).length ?? 0) > 0 && (
                <button
                  onClick={handleFavoritesShufflePlay}
                  data-testid="button-shuffle-favorites"
                  className="h-9 px-3 text-[11px] uppercase tracking-[0.12em] font-medium border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  <Shuffle className="w-3.5 h-3.5" /> Shuffle favorites
                </button>
              )}
            </div>

            {hasFilters && (
              <button
                data-testid="button-copy-link"
                onClick={copyFilterLink}
                className={`h-9 px-3 text-[11px] uppercase tracking-[0.12em] font-medium transition-colors inline-flex items-center gap-1.5 ${
                  copied ? "text-emerald-700" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Share link"}
              </button>
            )}
          </div>

          {/* Stats strip */}
          {stats && (
            <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-6">
              {[
                { label: "Tunes", value: stats.total, icon: Disc },
                { label: "With audio", value: stats.withAudio, icon: Headphones },
                { label: "With video", value: stats.withVideo, icon: Video },
                { label: "With notation", value: stats.withAbc, icon: BookOpen },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-baseline gap-2" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <span className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-foreground leading-none">{Number(value ?? 0).toLocaleString("en-US")}</span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* ── MAIN ─────────────────────────────────────────────────────── */}
      <div className="container mx-auto max-w-6xl px-5 py-8">

        {/* Header row: results count + play controls */}
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6 pb-4 border-b border-border">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-medium text-muted-foreground mb-1">
              {showFavorites ? "Saved tunes" : hasFilters ? "Results" : "Browse"}
            </p>
            {!isLoadingAny && total > 0 ? (
              <p className="font-display text-2xl font-semibold text-foreground" data-testid="text-page-position">
                {showFavorites ? (
                  <span><span className="tabular-nums">{total}</span> {total !== 1 ? "saved tunes" : "saved tune"}</span>
                ) : (
                  <span>
                    <span className="tabular-nums">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)}</span>{" "}
                    <span className="text-muted-foreground font-normal italic"> of </span>
                    <span className="tabular-nums">{total.toLocaleString("en-US")}</span>
                  </span>
                )}
              </p>
            ) : isLoadingAny ? (
              <p className="font-display text-2xl text-muted-foreground" data-testid="text-page-position">Loading…</p>
            ) : null}
          </div>

        </div>

        {/* Grid */}
        {isLoadingAny ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="py-5 border-b border-border">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-3" />
                <Skeleton className="h-3 w-full mb-1.5" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            ))}
          </div>
        ) : showFavorites && tunes.length === 0 ? (
          <div className="text-center py-24">
            <Star className="w-12 h-12 mx-auto mb-4 text-primary/30" />
            <p className="font-display text-xl text-foreground">No favorites yet</p>
            <p className="text-sm text-muted-foreground mt-2">Click the ★ on any tune to save it here.</p>
          </div>
        ) : tunes.length === 0 ? (
          <div className="text-center py-24">
            <Music2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="font-display text-xl text-foreground">No tunes found</p>
            <button onClick={clearFilters} className="mt-4 text-[11px] uppercase tracking-[0.12em] font-medium text-primary hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            {tunes.map((tune) => {
              const typeColor = TUNE_TYPE_COLORS[tune.tuneType ?? ""] ?? "hsl(var(--primary))";
              const faved = isFavorite(tune.id);
              const meta = [
                tune.key ? `Key of ${tune.key}` : null,
                tune.tuneType ? tune.tuneType.charAt(0).toUpperCase() + tune.tuneType.slice(1) : null,
                tune.difficulty ? tune.difficulty.charAt(0).toUpperCase() + tune.difficulty.slice(1) : null,
              ].filter(Boolean).join(" · ");

              return (
                <Link
                  key={tune.id}
                  href={`/tune/${tune.id}`}
                  data-testid={`card-tune-${tune.id}`}
                  className="group relative block py-5 border-b border-border hover:bg-muted/40 transition-colors px-2 -mx-2"
                >
                  <div className="absolute top-4 right-1.5 flex items-center gap-0.5">
                    {(tune.audioUrl || tune.locItemId) && (
                      <>
                        <button
                          data-testid={`button-play-${tune.id}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); startPlaylist([tune], "chronological"); }}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-label="Play tune"
                          title="Play now"
                        >
                          <Play className="w-3.5 h-3.5" fill="currentColor" />
                        </button>
                        <button
                          data-testid={`button-queue-${tune.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const added = enqueue([tune]);
                            toast({
                              description: added > 0 ? `Added "${tune.title}" to queue` : `"${tune.title}" is already in your queue`,
                              duration: 2000,
                            });
                          }}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-label="Add to queue"
                          title="Add to queue"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      data-testid={`button-favorite-${tune.id}`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(tune.id); }}
                      className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                      aria-label={faved ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star className={`w-4 h-4 transition-colors ${faved ? "fill-primary text-primary" : ""}`} />
                    </button>
                  </div>

                  <div className="flex items-start gap-2.5 pr-28">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-[0.55rem] shrink-0"
                      style={{ background: typeColor }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-display text-lg sm:text-xl font-semibold leading-tight text-foreground group-hover:text-primary transition-colors truncate">
                          {tune.title}
                        </h3>
                        {(tune.popularity ?? 0) >= 9 && (
                          <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] font-semibold text-primary/80">★ Ess.</span>
                        )}
                      </div>

                      <p className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground mt-1.5">
                        {meta}
                      </p>

                      {tune.description ? (
                        <p className="text-sm text-foreground/70 mt-2 line-clamp-2 leading-relaxed">
                          {tune.description}
                        </p>
                      ) : tune.region ? (
                        <p className="text-sm text-muted-foreground/80 italic mt-2">{tune.region}</p>
                      ) : null}

                      <div className="flex gap-3 mt-2.5 text-[10px] uppercase tracking-[0.12em] font-medium text-muted-foreground">
                        {(tune.audioUrl || tune.locItemId) && (
                          <span className="inline-flex items-center gap-1" data-testid={`badge-audio-${tune.id}`}>
                            <Headphones className="w-3 h-3" /> Audio
                          </span>
                        )}
                        {tune.isEmbeddable === true && (
                          <span className="inline-flex items-center gap-1" data-testid={`badge-video-${tune.id}`}>
                            <Video className="w-3 h-3" /> Video
                          </span>
                        )}
                        {tune.abcNotation && (
                          <span className="inline-flex items-center gap-1" data-testid={`badge-abc-${tune.id}`}>
                            <BookOpen className="w-3 h-3" /> Notation
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!showFavorites && totalPages > 1 && !isLoadingAny && (
          <div className="flex items-center justify-center gap-6 mt-14">
            <button
              onClick={() => changePage(Math.max(1, page - 1))}
              disabled={page <= 1}
              data-testid="button-prev-page"
              className="text-[11px] uppercase tracking-[0.14em] font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="font-display text-base text-foreground tabular-nums" data-testid="text-page-indicator">
              <span className="font-semibold">{page}</span>
              <span className="text-muted-foreground mx-2">/</span>
              <span className="text-muted-foreground">{totalPages}</span>
            </span>
            <button
              onClick={() => changePage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              data-testid="button-next-page"
              className="text-[11px] uppercase tracking-[0.14em] font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer archives */}
        <div className="mt-20 pt-10 border-t border-border">
          <p className="text-[10px] uppercase tracking-[0.22em] font-medium text-muted-foreground mb-6 flex items-center gap-3">
            <span className="h-px w-8 bg-foreground/40" />
            Source Archives
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-t border-b border-border">
            {[
              { name: "Library of Congress", url: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/", desc: "Henry Reed Collection" },
              { name: "Slippery Hill", url: "https://www.slippery-hill.com/", desc: "15,000+ source recordings" },
              { name: "TheSession.org", url: "https://thesession.org", desc: "ABC notation database" },
              { name: "OT Fiddle Tunes", url: "https://www.oldtimefiddletunes.net/links.html", desc: "Master resource list" },
            ].map((src) => (
              <a
                key={src.name}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-5 px-4 hover:bg-muted/40 transition-colors group"
                data-testid={`link-archive-${src.name.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <p className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">{src.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{src.desc}</p>
              </a>
            ))}
          </div>
          <div className="mt-12">
            <TipJar />
          </div>
        </div>
      </div>
    </div>
  );
}
