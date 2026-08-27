import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Music2, ExternalLink, Video, BookOpen, Star, MessageSquarePlus, Play } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import type { Tune, Recording } from "@shared/schema";
import AudioPlayer from "@/components/AudioPlayer";
import AbcStaffRenderer from "@/components/AbcStaffRenderer";
import YoutubePlayer from "@/components/YoutubePlayer";
import TipJar from "@/components/TipJar";
import SuggestChangesForm from "@/components/SuggestChangesForm";
import { useFavorites } from "@/hooks/useFavorites";
import { trackEvent } from "@/lib/analytics";
import { usePlaylist, type PlaylistItem } from "@/context/PlaylistContext";

const DIFFICULTY_DOT: Record<string, string> = {
  beginner: "bg-emerald-700",
  intermediate: "bg-amber-700",
  advanced: "bg-rose-800",
};

function SectionHeader({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium mb-1.5">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground leading-tight">
        {title}
      </h2>
    </div>
  );
}

export default function TuneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showRawAbc, setShowRawAbc] = useState(false);
  const [recordingIndex, setRecordingIndex] = useState(0);
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [showSuggest, setShowSuggest] = useState(false);

  const { isFavorite, toggleFavorite } = useFavorites();
  const { startPlaylist } = usePlaylist();

  const { data: tune, isLoading, isError } = useQuery<Tune>({
    queryKey: [`/api/tunes/${id}`],
    enabled: !!id,
  });

  const { data: recordings = [] } = useQuery<Recording[]>({
    queryKey: [`/api/tunes/${id}/recordings`],
    enabled: !!id,
  });

  useEffect(() => {
    setRecordingIndex(0);
  }, [id]);

  useEffect(() => {
    if (!tune) return;

    trackEvent("tune_view", "tune", tune.title);

    const pageTitle = `${tune.title} — ${tune.key} ${tune.tuneType} | TuneVault`;
    const pageUrl = `https://tunevault.org/tunes/${tune.id}`;
    const pageDesc = tune.description
      ? tune.description.slice(0, 155).replace(/\s\S*$/, "") + "…"
      : `${tune.title}: a ${tune.key} ${tune.tuneType} from the Old-Time fiddle tradition. Audio, history, ABC notation, and video on TuneVault.`;

    const setMeta = (sel: string, attr: string, val: string) => {
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta") as HTMLMetaElement;
        const [attrName, attrVal] = attr.split("=");
        el.setAttribute(attrName, attrVal.replace(/"/g, ""));
        document.head.appendChild(el);
      }
      el.setAttribute("content", val);
    };

    document.title = pageTitle;
    setMeta('meta[name="description"]', 'name="description"', pageDesc);
    setMeta('meta[property="og:title"]', 'property="og:title"', pageTitle);
    setMeta('meta[property="og:description"]', 'property="og:description"', pageDesc);
    setMeta('meta[property="og:url"]', 'property="og:url"', pageUrl);
    setMeta('meta[property="og:type"]', 'property="og:type"', "article");
    setMeta('meta[name="twitter:title"]', 'name="twitter:title"', pageTitle);
    setMeta('meta[name="twitter:description"]', 'name="twitter:description"', pageDesc);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link") as HTMLLinkElement;
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", pageUrl);

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "MusicComposition",
      "name": tune.title,
      "alternateName": tune.alternativeTitles ?? undefined,
      "url": pageUrl,
      "description": tune.description ?? undefined,
      "musicalKey": tune.key,
      "genre": ["Old-Time", "Appalachian", tune.tuneType],
      "composer": tune.sourceFiddler
        ? { "@type": "Person", "name": tune.sourceFiddler }
        : undefined,
      "dateCreated": tune.era ?? undefined,
      "inLanguage": "en",
      "publisher": {
        "@type": "Organization",
        "name": "TuneVault",
        "url": "https://tunevault.org",
      },
    };

    let ldScript = document.getElementById("tune-jsonld") as HTMLScriptElement | null;
    if (!ldScript) {
      ldScript = document.createElement("script") as HTMLScriptElement;
      ldScript.id = "tune-jsonld";
      ldScript.type = "application/ld+json";
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = "TuneVault — Old-Time Fiddle Treasury";
      setMeta('meta[name="description"]', 'name="description"', "Over 1,000 Old-Time fiddle tunes with audio recordings, historical context, ABC notation, sheet music, and YouTube performances. Searchable, filterable, free.");
      setMeta('meta[property="og:title"]', 'property="og:title"', "TuneVault — Old-Time Fiddle Treasury");
      setMeta('meta[property="og:description"]', 'property="og:description"', "Over 1,000 Old-Time fiddle tunes with audio, history, notation, and video — the definitive online tune library.");
      setMeta('meta[property="og:url"]', 'property="og:url"', "https://tunevault.org");
      setMeta('meta[property="og:type"]', 'property="og:type"', "website");
      setMeta('meta[name="twitter:title"]', 'name="twitter:title"', "TuneVault — Old-Time Fiddle Treasury");
      setMeta('meta[name="twitter:description"]', 'name="twitter:description"', "Over 1,000 Old-Time fiddle tunes with audio, history, notation, and video.");
      const canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (canon) canon.setAttribute("href", "https://tunevault.org");
      const ld = document.getElementById("tune-jsonld");
      if (ld) ld.remove();
    };
  }, [tune]);

  const allRecordings: Recording[] = useMemo(() => {
    if (!tune) return [...recordings];
    const items: Recording[] = [...recordings];
    const alreadyCoveredByUrl = tune.audioUrl && recordings.some(r => r.audioUrl === tune.audioUrl);
    const alreadyCoveredByLoc = tune.locItemId && recordings.some(r => r.locItemId === tune.locItemId);

    if (tune.audioUrl && !alreadyCoveredByUrl) {
      items.unshift({
        id: 0,
        tuneId: tune.id,
        audioUrl: tune.audioUrl,
        locItemId: null,
        youtubeVideoId: null,
        audioSource: tune.audioSource ?? null,
        audioAttribution: (tune as any).audioAttribution ?? null,
        sourceFiddler: tune.sourceFiddler ?? null,
        collection: null,
        era: tune.era ?? null,
        key: tune.key ?? null,
        tuning: null,
        notes: null,
        slipperyHillSlug: null,
        createdAt: new Date(),
      });
    }

    if (tune.locItemId && !alreadyCoveredByLoc) {
      const locEntry: Recording = {
        id: -1,
        tuneId: tune.id,
        audioUrl: null,
        locItemId: tune.locItemId,
        youtubeVideoId: null,
        audioSource: tune.audioSource ?? "Library of Congress",
        audioAttribution: (tune as any).audioAttribution ?? "loc.gov",
        sourceFiddler: tune.sourceFiddler ?? null,
        collection: null,
        era: tune.era ?? null,
        key: tune.key ?? null,
        tuning: null,
        notes: null,
        slipperyHillSlug: null,
        createdAt: new Date(),
      };
      if (tune.audioUrl && !alreadyCoveredByUrl) {
        items.splice(1, 0, locEntry);
      } else {
        items.unshift(locEntry);
      }
    }

    return items;
  }, [tune, recordings]);

  const currentRecording = allRecordings[recordingIndex] ?? null;
  const hasDirectAudioRecording = allRecordings.some((recording) => Boolean(recording.audioUrl));
  const hasArchivalReference = allRecordings.some((recording) => Boolean(recording.locItemId));

  function patchedTuneForRecording(rec: typeof allRecordings[0]): PlaylistItem {
    if (!tune) throw new Error("no tune");
    const recordingKey = rec.key?.trim() || null;
    return {
      ...tune,
      key: recordingKey ?? tune.key,
      catalogKey: tune.key,
      playbackKeySource: recordingKey ? "recording" : "tune",
      audioUrl: rec.audioUrl ?? null,
      locItemId: rec.locItemId ?? null,
      audioSource: rec.audioSource ?? null,
      sourceFiddler: rec.sourceFiddler ?? null,
      audioAttribution: rec.audioAttribution ?? (tune as any).audioAttribution ?? null,
    };
  }

  function handleSelectRecording(i: number) {
    setRecordingIndex(i);
    const rec = allRecordings[i];
    if (!rec || !tune) return;
    if (rec.audioUrl || rec.locItemId) {
      startPlaylist([patchedTuneForRecording(rec)]);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-16">
        <div className="text-center">
          <Music2 className="w-10 h-10 mx-auto mb-3 animate-pulse text-primary" />
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Loading tune…</p>
        </div>
      </div>
    );
  }

  if (isError || !tune) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-16">
        <div className="text-center max-w-md">
          <p className="font-display text-3xl text-foreground mb-3">Tune not found.</p>
          <p className="text-sm text-muted-foreground mb-6">It may have been moved or never existed.</p>
          <Button onClick={() => history.back()} variant="outline" className="rounded-none">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to TuneVault
          </Button>
        </div>
      </div>
    );
  }

  const faved = isFavorite(tune.id);
  const difficultyDot = tune.difficulty ? DIFFICULTY_DOT[tune.difficulty] : "";

  return (
    <div className="min-h-screen bg-background pb-16 pt-16 sm:pt-20">
      <div className="container mx-auto max-w-6xl px-6">

        {/* Top utility bar — back + save */}
        <div className="flex items-center justify-between py-4 -mx-2">
          <button
            onClick={() => history.back()}
            className="flex items-center gap-1.5 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <ShareButton
              url={`${window.location.origin}/tune/${tune.id}`}
              title={tune.title}
              className="px-2 py-1"
              size={13}
              aria-label={`Share ${tune.title}`}
            />
            <button
              onClick={() => toggleFavorite(tune.id)}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-favorite-detail"
            >
              <Star className={`w-3.5 h-3.5 ${faved ? "fill-primary text-primary" : ""}`} />
              {faved ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        {/* Editorial title block */}
        <header className="border-t border-foreground pt-6 pb-8">
          {/* Eyebrow meta strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-4">
            <span className="text-foreground">Key of {tune.key}</span>
            {tune.tuneType && <span className="capitalize">{tune.tuneType}</span>}
            {tune.region && <span>{tune.region}</span>}
            {tune.difficulty && (
              <span className="inline-flex items-center gap-1.5 capitalize">
                <span className={`w-1.5 h-1.5 rounded-full ${difficultyDot}`} />
                {tune.difficulty}
              </span>
            )}
            {tune.era && <span>{tune.era}</span>}
          </div>

          <h1 className="font-display text-[44px] sm:text-[64px] lg:text-[84px] font-semibold tracking-tight leading-[0.95] text-foreground" data-testid="text-tune-title">
            {tune.title}
          </h1>

          {tune.alternativeTitles && (
            <p className="font-display italic text-xl sm:text-2xl text-muted-foreground mt-3 leading-snug">
              <span className="text-[11px] uppercase tracking-[0.18em] not-italic font-sans mr-2">a.k.a.</span>
              {tune.alternativeTitles}
            </p>
          )}

          {tune.sourceFiddler && (
            <p className="text-sm text-muted-foreground mt-4">
              <span className="text-[11px] uppercase tracking-[0.18em] mr-1.5">From</span>
              <span className="font-medium text-foreground">{tune.sourceFiddler}</span>
            </p>
          )}

          {/* Inline player when only one recording */}
          {allRecordings.length === 1 && currentRecording && (currentRecording.audioUrl || currentRecording.locItemId) && (
            <div className="mt-7 border-t border-border pt-5">
              <AudioPlayer tune={patchedTuneForRecording(currentRecording)} />
            </div>
          )}
          {!hasDirectAudioRecording && (
            <div
              className="mt-7 border-t border-border pt-5 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground"
              data-testid="audio-needed-state"
            >
              <Music2 className="w-4 h-4 text-primary/70" />
              <span>
                No direct audio file available — audio recording still needed
                {hasArchivalReference ? "; an archival reference may resolve below" : " and this tune is queued for sourcing"}
              </span>
            </div>
          )}
        </header>

        {/* Body — two column editorial */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-x-16 gap-y-12 mt-4">

          {/* Main column */}
          <div className="space-y-14 min-w-0">

            {/* About */}
            <section data-testid="section-about">
              <SectionHeader eyebrow="History & Notes" title="About this tune" />
              {tune.description ? (
                <p className="font-serif text-[17px] leading-[1.7] text-foreground/85 max-w-prose">
                  {tune.description}
                </p>
              ) : (
                <p className="font-serif italic text-[16px] leading-[1.7] text-muted-foreground max-w-prose">
                  Historical notes have not yet been documented for this tune. If you know its story,{" "}
                  <a href="/about#suggestion-box" className="text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors">suggest a write-up</a>.
                </p>
              )}
            </section>

            {/* Performance Notes */}
            {tune.notes && (
              <section data-testid="section-performance-notes">
                <SectionHeader eyebrow="On the bow" title="Performance notes" />
                <p className="font-serif text-[16px] leading-[1.7] text-foreground/85 max-w-prose border-l-2 border-primary pl-5 italic">
                  {tune.notes}
                </p>
              </section>
            )}

            {/* Recordings */}
            {allRecordings.length > 1 && (
              <section data-testid="section-recordings">
                <SectionHeader eyebrow={`${allRecordings.length} sources`} title="Recorded versions" />
                <p className="text-sm text-muted-foreground mb-5">Select a recording to listen — click to switch.</p>
                <ul className="border-t border-border">
                  {allRecordings.map((rec, i) => {
                    const hasAudio = !!(rec.audioUrl || rec.locItemId);
                    const isSelected = i === recordingIndex;
                    return (
                      <li key={`${rec.id}-${i}`} className="border-b border-border">
                        <button
                          className={`w-full text-left flex items-center gap-4 py-4 transition-colors group ${
                            isSelected ? "" : "hover:bg-foreground/[0.02]"
                          }`}
                          onClick={() => handleSelectRecording(i)}
                          data-testid={`recording-item-${rec.id}`}
                        >
                          <span className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-foreground/30 text-foreground/70 group-hover:border-foreground group-hover:text-foreground"
                          }`}>
                            {isSelected && hasAudio ? (
                              <Music2 className="w-3.5 h-3.5 animate-pulse" />
                            ) : (
                              <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-display text-lg text-foreground leading-tight">
                              {rec.sourceFiddler ?? "Unknown performer"}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground mt-1">
                              {rec.audioSource && <span>{rec.audioSource}</span>}
                              {rec.collection && <span>{rec.collection}</span>}
                              {rec.era && <span>{rec.era}</span>}
                              {rec.key && rec.key !== tune.key && <span>Key of {rec.key}</span>}
                            </div>
                          </div>
                          <span className={`shrink-0 text-[11px] uppercase tracking-[0.16em] font-medium ${
                            isSelected ? "text-primary" : "text-muted-foreground"
                          }`}>
                            {isSelected ? "Playing" : "Play"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Video */}
            {tune.youtubeVideoId && videoAvailable && (
              <section data-testid="section-video">
                <SectionHeader eyebrow="Watch" title="Video performance" />
                <YoutubePlayer
                  videoId={tune.youtubeVideoId}
                  title={tune.title}
                  onUnavailable={() => setVideoAvailable(false)}
                />
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <Video className="w-3 h-3" />
                  Use the gear icon in the player to slow to 0.5× for learning.
                </p>
              </section>
            )}

            {/* Sheet Music */}
            {(tune.abcNotation || tune.transcriptUrl) && (
              <section data-testid="section-notation">
                <SectionHeader eyebrow="Notation" title={tune.abcNotation ? "Sheet music & ABC" : "Sheet music"} />
                <div className="space-y-5">
                  {tune.abcNotation && (
                    <>
                      <div className="border border-border p-5 bg-card">
                        <AbcStaffRenderer notation={tune.abcNotation} />
                      </div>
                      <div>
                        <button
                          onClick={() => setShowRawAbc((v) => !v)}
                          className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
                          data-testid="button-toggle-raw-abc"
                        >
                          {showRawAbc ? "— Hide ABC text" : "+ Show ABC text"}
                        </button>
                        {showRawAbc && (
                          <pre
                            data-testid="text-abc-notation"
                            className="mt-3 bg-muted p-4 overflow-x-auto text-xs font-mono border border-border whitespace-pre-wrap"
                          >
                            {tune.abcNotation}
                          </pre>
                        )}
                      </div>
                    </>
                  )}
                  {tune.transcriptUrl && (
                    <div data-testid="sheet-music-image">
                      <a href={tune.transcriptUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={tune.transcriptUrl}
                          alt={`Sheet music for ${tune.title}`}
                          className="w-full border border-border hover:opacity-90 transition-opacity cursor-zoom-in"
                          loading="lazy"
                        />
                      </a>
                      <p className="text-xs text-muted-foreground mt-2">
                        Transcription via{" "}
                        <a href="https://fiddletunes.net" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                          FiddleTunes.net
                        </a>
                        {" "}— click to enlarge.
                      </p>
                    </div>
                  )}
                  {tune.theSessionId && (
                    <a
                      href={`https://thesession.org/tunes/${tune.theSessionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-4"
                      data-testid="link-thesession"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      All versions on TheSession.org
                    </a>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar — flat, hairline-divided */}
          <aside className="space-y-10 lg:pt-1">

            {/* Historical Details */}
            <div data-testid="sidebar-historical">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-foreground font-semibold mb-4 pb-2 border-b border-foreground">
                Historical details
              </h3>
              <dl className="space-y-4 text-sm">
                {tune.sourceFiddler && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">Source fiddler</dt>
                    <dd className="text-foreground font-medium">{tune.sourceFiddler}</dd>
                  </div>
                )}
                {tune.era && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">Era</dt>
                    <dd className="text-foreground">{tune.era}</dd>
                  </div>
                )}
                {tune.region && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">Region</dt>
                    <dd className="text-foreground">{tune.region}</dd>
                  </div>
                )}
                {tune.tags && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Tags</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {tune.tags.split(",").map((tag, i) => (
                        <span key={i} className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground border border-border px-2 py-0.5">
                          {tag.trim()}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {!tune.sourceFiddler && !tune.era && !tune.region && !tune.tags && (
                  <p className="text-xs text-muted-foreground italic">No historical details on record.</p>
                )}
              </dl>
            </div>

            {/* Source Archives */}
            <div data-testid="sidebar-archives">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-foreground font-semibold mb-4 pb-2 border-b border-foreground flex items-center gap-2">
                <BookOpen className="w-3 h-3" />
                Source archives
              </h3>
              <ul className="space-y-3 text-sm">
                {tune.locUrl && (
                  <li>
                    <a href={tune.locUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-foreground hover:text-primary transition-colors" data-testid="link-loc">
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" /> Library of Congress
                    </a>
                  </li>
                )}
                {tune.theSessionId && (
                  <li>
                    <a href={`https://thesession.org/tunes/${tune.theSessionId}`} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-foreground hover:text-primary transition-colors" data-testid="link-thesession-sidebar">
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" /> TheSession.org
                    </a>
                  </li>
                )}
                {tune.taterJoeUrl && (
                  <li>
                    <a href={tune.taterJoeUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-foreground hover:text-primary transition-colors" data-testid="link-taterjoe">
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" /> Tater Joe's Transcriptions
                    </a>
                  </li>
                )}
                {tune.folkwaysUrl && (
                  <li>
                    <a href={tune.folkwaysUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-foreground hover:text-primary transition-colors" data-testid="link-folkways">
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" /> Smithsonian Folkways
                    </a>
                  </li>
                )}
              </ul>

              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">More recordings</p>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a
                      href={`https://www.slippery-hill.com/tune-search?title=${encodeURIComponent(tune.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                      data-testid="link-slippery-hill"
                    >
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" /> Slippery Hill (15,000+)
                    </a>
                  </li>
                  <li>
                    <a
                      href={`https://tunearch.org/wiki/${encodeURIComponent(tune.title.replace(/ /g, "_"))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                      data-testid="link-tunearch"
                    >
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" /> Traditional Tune Archive
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Suggest a correction */}
            <div>
              <button
                onClick={() => setShowSuggest(true)}
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-suggest-changes"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Suggest a correction
              </button>
            </div>
          </aside>
        </div>

        <div className="mt-16 pt-10 border-t border-border">
          <TipJar />
        </div>
      </div>

      <Dialog open={showSuggest} onOpenChange={setShowSuggest}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-semibold">Suggest a correction</DialogTitle>
          </DialogHeader>
          <SuggestChangesForm
            tuneId={tune?.id}
            tuneName={tune?.title}
            onSuccess={() => setTimeout(() => setShowSuggest(false), 2000)}
            onCancel={() => setShowSuggest(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
