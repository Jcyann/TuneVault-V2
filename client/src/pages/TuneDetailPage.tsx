import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Music2, ExternalLink, FileText, Video, BookOpen, Star } from "lucide-react";
import type { Tune, Recording } from "@shared/schema";
import AudioPlayer from "@/components/AudioPlayer";
import AbcStaffRenderer from "@/components/AbcStaffRenderer";
import YoutubePlayer from "@/components/YoutubePlayer";
import TipJar from "@/components/TipJar";
import { useFavorites } from "@/hooks/useFavorites";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 border-green-300",
  intermediate: "bg-amber-100 text-amber-800 border-amber-300",
  advanced: "bg-red-100 text-red-800 border-red-300",
};

export default function TuneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showRawAbc, setShowRawAbc] = useState(false);
  const [recordingIndex, setRecordingIndex] = useState(0);
  const [videoAvailable, setVideoAvailable] = useState(true);

  const { isFavorite, toggleFavorite } = useFavorites();

  const { data: tune, isLoading, isError } = useQuery<Tune>({
    queryKey: [`/api/tunes/${id}`],
    enabled: !!id,
  });

  const { data: recordings = [] } = useQuery<Recording[]>({
    queryKey: [`/api/tunes/${id}/recordings`],
    enabled: !!id,
  });

  useEffect(() => {
    if (!tune) return;

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
      setMeta('meta[name="description"]', 'name="description"', "1,031+ Old-Time fiddle tunes with audio recordings, historical context, ABC notation, sheet music, and YouTube performances. Searchable, filterable, free.");
      setMeta('meta[property="og:title"]', 'property="og:title"', "TuneVault — Old-Time Fiddle Treasury");
      setMeta('meta[property="og:description"]', 'property="og:description"', "1,031+ Old-Time fiddle tunes with audio, history, notation, and video — the definitive online tune library.");
      setMeta('meta[property="og:url"]', 'property="og:url"', "https://tunevault.org");
      setMeta('meta[property="og:type"]', 'property="og:type"', "website");
      setMeta('meta[name="twitter:title"]', 'name="twitter:title"', "TuneVault — Old-Time Fiddle Treasury");
      setMeta('meta[name="twitter:description"]', 'name="twitter:description"', "1,031+ Old-Time fiddle tunes with audio, history, notation, and video.");
      const canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (canon) canon.setAttribute("href", "https://tunevault.org");
      const ld = document.getElementById("tune-jsonld");
      if (ld) ld.remove();
    };
  }, [tune]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Music2 className="w-16 h-16 mx-auto mb-4 animate-pulse" style={{ color: "#F59E0B" }} />
          <p className="text-lg text-muted-foreground">Loading tune...</p>
        </div>
      </div>
    );
  }

  if (isError || !tune) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">Tune not found</p>
          <Button onClick={() => history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
        </div>
      </div>
    );
  }

  const faved = isFavorite(tune.id);
  const currentRecording = recordings[recordingIndex] ?? null;

  return (
    <div className="min-h-screen bg-background pb-8 pt-12 sm:pt-12">
      {/* Header */}
      <div
        className="relative text-primary-foreground py-10 px-4 shadow-lg border-b border-white/12 overflow-hidden"
        style={{
          backgroundImage: "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(25 75% 28%) 100%)",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.14),transparent_60%)] pointer-events-none" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 -ml-2"
              onClick={() => history.back()}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to TuneVault
            </Button>
            <button
              onClick={() => toggleFavorite(tune.id)}
              className="flex items-center gap-1.5 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-primary-foreground/10"
              data-testid="button-favorite-detail"
            >
              <Star className={`w-4 h-4 ${faved ? "fill-amber-300 text-amber-300" : ""}`} />
              {faved ? "Saved" : "Save"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/25 font-semibold">
              Key of {tune.key}
            </Badge>
            {tune.tuneType && (
              <Badge className="capitalize bg-primary-foreground/20 text-primary-foreground border-primary-foreground/25">
                {tune.tuneType}
              </Badge>
            )}
            {tune.difficulty && (
              <Badge className={`${DIFFICULTY_COLORS[tune.difficulty] ?? ""}`}>
                {tune.difficulty}
              </Badge>
            )}
            {tune.era && (
              <Badge className="bg-primary-foreground/10 text-primary-foreground/70 border-primary-foreground/15 text-xs">
                {tune.era}
              </Badge>
            )}
          </div>

          <h1 className="text-4xl font-bold font-serif leading-tight">{tune.title}</h1>
          {tune.alternativeTitles && (
            <p className="text-primary-foreground/65 mt-1.5 text-sm italic">
              Also known as: {tune.alternativeTitles}
            </p>
          )}

          {(tune.audioUrl || tune.locItemId) && (
            <AudioPlayer tune={tune} />
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">

            {/* About */}
            {tune.description && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">About This Tune</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground text-sm">{tune.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Performance Notes */}
            {tune.notes && (
              <Card className="shadow-sm border-amber-200 bg-amber-50/40 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-amber-800 dark:text-amber-400">Performance Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-amber-900/80 dark:text-amber-300/80 text-sm">{tune.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Additional Recordings */}
            {recordings.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Music2 className="w-4 h-4 text-amber-600" />
                    Recorded Versions ({recordings.length})
                  </CardTitle>
                  <CardDescription className="text-xs">Historical recordings from field collections</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recordings.map((rec, i) => (
                    <button
                      key={rec.id}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                        i === recordingIndex
                          ? "border-primary/50 bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      }`}
                      onClick={() => setRecordingIndex(i)}
                      data-testid={`recording-item-${rec.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-medium">{rec.sourceFiddler ?? "Unknown performer"}</span>
                          <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-1.5">
                            {rec.audioSource && <span>{rec.audioSource}</span>}
                            {rec.collection && <span>· {rec.collection}</span>}
                            {rec.era && <span>· {rec.era}</span>}
                            {rec.key && <span>· Key of {rec.key}</span>}
                          </div>
                        </div>
                        {i === recordingIndex && (
                          <Badge className="shrink-0 text-xs bg-amber-100 text-amber-800 border-amber-300">Now Playing</Badge>
                        )}
                      </div>
                    </button>
                  ))}

                  {currentRecording && (currentRecording.audioUrl || currentRecording.locItemId) && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <AudioPlayer
                        tune={{
                          ...tune,
                          audioUrl: currentRecording.audioUrl ?? null,
                          locItemId: currentRecording.locItemId ?? null,
                          audioSource: currentRecording.audioSource ?? null,
                          sourceFiddler: currentRecording.sourceFiddler ?? null,
                          audioAttribution: currentRecording.audioAttribution ?? null,
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Video */}
            {tune.youtubeVideoId && videoAvailable && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Video className="w-4 h-4 text-red-500" />
                    Video Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <YoutubePlayer
                    videoId={tune.youtubeVideoId}
                    title={tune.title}
                    onUnavailable={() => setVideoAvailable(false)}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚙ Gear icon inside the player → Speed → 0.5× to slow it down for learning
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Sheet Music */}
            {(tune.abcNotation || tune.transcriptUrl) && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="w-4 h-4" />
                    Sheet Music{tune.abcNotation ? " & ABC Notation" : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tune.abcNotation && (
                    <>
                      <AbcStaffRenderer notation={tune.abcNotation} />
                      <div>
                        <button
                          onClick={() => setShowRawAbc((v) => !v)}
                          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                          data-testid="button-toggle-raw-abc"
                        >
                          {showRawAbc ? "Hide ABC text" : "Show ABC text"}
                        </button>
                        {showRawAbc && (
                          <pre
                            data-testid="text-abc-notation"
                            className="mt-2 bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono border border-border whitespace-pre-wrap"
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
                          className="w-full rounded border border-border shadow-sm hover:opacity-90 transition-opacity cursor-zoom-in"
                          loading="lazy"
                        />
                      </a>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Transcription via{" "}
                        <a href="https://fiddletunes.net" target="_blank" rel="noopener noreferrer" className="underline">
                          FiddleTunes.net
                        </a>
                        {" "}· Click to enlarge
                      </p>
                    </div>
                  )}
                  {tune.theSessionId && (
                    <a
                      href={`https://thesession.org/tunes/${tune.theSessionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      data-testid="link-thesession"
                    >
                      <ExternalLink className="w-3 h-3" />
                      All versions on TheSession.org
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Historical Details */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Historical Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {tune.sourceFiddler && (
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-0.5">Source Fiddler</p>
                    <p className="text-muted-foreground">{tune.sourceFiddler}</p>
                  </div>
                )}
                {tune.era && (
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-0.5">Era</p>
                    <p className="text-muted-foreground">{tune.era}</p>
                  </div>
                )}
                {tune.region && (
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-0.5">Region</p>
                    <p className="text-muted-foreground">{tune.region}</p>
                  </div>
                )}
                {tune.tags && (
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {tune.tags.split(",").map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{tag.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {!tune.sourceFiddler && !tune.era && !tune.region && !tune.tags && (
                  <p className="text-xs text-muted-foreground italic">No historical details on record</p>
                )}
              </CardContent>
            </Card>

            {/* Source Archives */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  Source Archives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {tune.locUrl && (
                  <a href={tune.locUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline" data-testid="link-loc">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Library of Congress
                  </a>
                )}
                {tune.theSessionId && (
                  <a href={`https://thesession.org/tunes/${tune.theSessionId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline" data-testid="link-thesession-sidebar">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" /> TheSession.org
                  </a>
                )}
                {tune.taterJoeUrl && (
                  <a href={tune.taterJoeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline" data-testid="link-taterjoe">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Tater Joe's Transcriptions
                  </a>
                )}
                {tune.folkwaysUrl && (
                  <a href={tune.folkwaysUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline" data-testid="link-folkways">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Smithsonian Folkways
                  </a>
                )}
                <div className="pt-2 mt-1 border-t border-border space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">More Recordings</p>
                  <a
                    href={`https://www.slippery-hill.com/tune-search?title=${encodeURIComponent(tune.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                    data-testid="link-slippery-hill"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Slippery Hill (15,000+ recordings)
                  </a>
                  <a
                    href={`https://tunearch.org/wiki/${encodeURIComponent(tune.title.replace(/ /g, "_"))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                    data-testid="link-tunearch"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Traditional Tune Archive
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <TipJar />
      </div>
    </div>
  );
}
