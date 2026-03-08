import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Music2, ExternalLink, FileText, Video, BookOpen, Star, Loader2 } from "lucide-react";
import type { Tune, Recording } from "@shared/schema";
import AudioPlayer from "@/components/AudioPlayer";
import AbcStaffRenderer from "@/components/AbcStaffRenderer";
import { useFavorites } from "@/hooks/useFavorites";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 border-green-300",
  intermediate: "bg-amber-100 text-amber-800 border-amber-300",
  advanced: "bg-red-100 text-red-800 border-red-300",
};

export default function TuneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showRawAbc, setShowRawAbc] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoChecking, setVideoChecking] = useState(false);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [recordingIndex, setRecordingIndex] = useState(0);

  const { isFavorite, toggleFavorite } = useFavorites();

  const { data: tune, isLoading, isError } = useQuery<Tune>({
    queryKey: [`/api/tunes/${id}`],
    enabled: !!id,
  });

  const { data: recordings = [] } = useQuery<Recording[]>({
    queryKey: [`/api/tunes/${id}/recordings`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Music2 className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
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
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Collection
          </Button>
        </div>
      </div>
    );
  }

  const faved = isFavorite(tune.id);

  const handlePlayVideo = async () => {
    if (!tune.youtubeVideoId) return;
    setVideoChecking(true);
    try {
      const res = await fetch(`/api/youtube-check/${tune.youtubeVideoId}`);
      const { embeddable } = await res.json();
      if (embeddable) {
        setVideoPlaying(true);
      } else {
        setVideoUnavailable(true);
      }
    } catch {
      setVideoPlaying(true);
    } finally {
      setVideoChecking(false);
    }
  };

  const currentRecording = recordings[recordingIndex] ?? null;
  const hasExtraRecordings = recordings.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div
        className="relative text-primary-foreground py-10 px-4 shadow-lg border-b border-white/12 overflow-hidden"
        style={{
          backgroundImage: [
            "repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(255,255,255,0.05) 22px, rgba(255,255,255,0.05) 23px)",
            "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(25 75% 28%) 100%)",
          ].join(", "),
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
              className="flex items-center gap-1.5 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors px-2 py-1 rounded-full hover:bg-primary-foreground/10"
              data-testid="button-favorite-detail"
              aria-label={faved ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={`w-4 h-4 transition-colors ${faved ? "fill-amber-300 text-amber-300" : ""}`} />
              {faved ? "Saved" : "Save"}
            </button>
          </div>
          <div className="flex flex-wrap items-start gap-3 mb-2">
            <Badge variant="secondary" className="text-base px-3 py-1 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 shadow-sm">
              Key of {tune.key}
            </Badge>
            {tune.tuneType && (
              <Badge variant="secondary" className="capitalize text-base px-3 py-1 bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 shadow-sm">
                {tune.tuneType}
              </Badge>
            )}
            {tune.difficulty && (
              <Badge variant="secondary" className={`text-base px-3 py-1 shadow-sm ${DIFFICULTY_COLORS[tune.difficulty] ?? ""}`}>
                {tune.difficulty}
              </Badge>
            )}
          </div>
          <h1 className="text-4xl font-bold font-serif">{tune.title}</h1>
          {tune.alternativeTitles && (
            <p className="text-primary-foreground/70 mt-1 text-sm">
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
                <CardHeader>
                  <CardTitle>About This Tune</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">{tune.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Performance Notes */}
            {tune.notes && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Performance Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">{tune.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Additional Recordings */}
            {hasExtraRecordings && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music2 className="w-5 h-5 text-amber-600" />
                    Recorded Versions ({recordings.length})
                  </CardTitle>
                  <CardDescription>Multiple historical recordings of this tune</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recordings.map((rec, i) => (
                    <div
                      key={rec.id}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${i === recordingIndex ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}
                      onClick={() => setRecordingIndex(i)}
                      data-testid={`recording-item-${rec.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {rec.sourceFiddler ?? "Unknown performer"}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rec.audioSource && (
                              <span className="text-xs text-muted-foreground">{rec.audioSource}</span>
                            )}
                            {rec.collection && (
                              <span className="text-xs text-muted-foreground">· {rec.collection}</span>
                            )}
                            {rec.era && (
                              <span className="text-xs text-muted-foreground">· {rec.era}</span>
                            )}
                            {rec.key && (
                              <Badge variant="outline" className="text-xs px-1 py-0 h-4">Key of {rec.key}</Badge>
                            )}
                            {rec.tuning && (
                              <Badge variant="outline" className="text-xs px-1 py-0 h-4">{rec.tuning}</Badge>
                            )}
                          </div>
                        </div>
                        {i === recordingIndex && <Badge className="shrink-0 text-xs bg-amber-100 text-amber-800 border-amber-300">Playing</Badge>}
                      </div>
                    </div>
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

            {/* Embedded Video */}
            {tune.youtubeVideoId && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-red-500" />
                    Video Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black shadow-lg relative">
                    {videoPlaying ? (
                      <iframe
                        data-testid="video-youtube"
                        width="100%"
                        height="100%"
                        src={`https://www.youtube-nocookie.com/embed/${tune.youtubeVideoId}?rel=0&modestbranding=1&autoplay=1`}
                        title={tune.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                      />
                    ) : videoUnavailable ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-900 text-white p-6 text-center">
                        <Video className="w-10 h-10 text-gray-500" />
                        <div>
                          <p className="font-semibold text-lg">Can't play here</p>
                          <p className="text-sm text-gray-400 mt-1">This video is restricted from embedding</p>
                        </div>
                        <a
                          href={`https://www.youtube.com/watch?v=${tune.youtubeVideoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-500 transition-colors text-sm font-semibold"
                          data-testid="link-youtube-unavailable"
                        >
                          ▶ Watch on YouTube ↗
                        </a>
                      </div>
                    ) : (
                      <button
                        data-testid="button-play-video"
                        onClick={handlePlayVideo}
                        disabled={videoChecking}
                        className="w-full h-full relative group focus:outline-none"
                        aria-label={`Play video for ${tune.title}`}
                      >
                        <img
                          src={`https://img.youtube.com/vi/${tune.youtubeVideoId}/hqdefault.jpg`}
                          alt={`${tune.title} video thumbnail`}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                          {videoChecking ? (
                            <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center shadow-xl">
                              <Loader2 className="w-7 h-7 text-white animate-spin" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-red-600 group-hover:bg-red-500 transition-colors flex items-center justify-center shadow-xl">
                              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-center mt-2 gap-4">
                    <p className="text-xs text-muted-foreground">
                      Use the gear icon ⚙️ to slow down to 0.5× for learning
                    </p>
                    <a
                      href={`https://www.youtube.com/watch?v=${tune.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline shrink-0"
                      data-testid="link-youtube-fallback"
                    >
                      ▶ Watch on YouTube
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sheet Music + ABC Notation */}
            {tune.abcNotation && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Sheet Music & ABC Notation
                  </CardTitle>
                  <CardDescription>
                    Standard notation rendered from ABC format
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AbcStaffRenderer notation={tune.abcNotation} />

                  <div>
                    <button
                      onClick={() => setShowRawAbc((v) => !v)}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                      data-testid="button-toggle-raw-abc"
                    >
                      {showRawAbc ? "Hide raw ABC text" : "Show raw ABC text"}
                    </button>
                    {showRawAbc && (
                      <pre
                        data-testid="text-abc-notation"
                        className="mt-2 bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono text-foreground border border-border whitespace-pre-wrap"
                      >
                        {tune.abcNotation}
                      </pre>
                    )}
                  </div>

                  {tune.theSessionId && (
                    <a
                      href={`https://thesession.org/tunes/${tune.theSessionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      data-testid="link-thesession"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View all versions on TheSession.org
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Historical Details */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Historical Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {tune.sourceFiddler && (
                  <div>
                    <p className="font-semibold text-foreground">Source Fiddler</p>
                    <p className="text-muted-foreground">{tune.sourceFiddler}</p>
                  </div>
                )}
                {tune.era && (
                  <div>
                    <p className="font-semibold text-foreground">Era</p>
                    <p className="text-muted-foreground">{tune.era}</p>
                  </div>
                )}
                {tune.region && (
                  <div>
                    <p className="font-semibold text-foreground">Region</p>
                    <p className="text-muted-foreground">{tune.region}</p>
                  </div>
                )}
                {tune.tags && (
                  <div>
                    <p className="font-semibold text-foreground mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {tune.tags.split(",").map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{tag.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {!tune.sourceFiddler && !tune.era && !tune.region && !tune.tags && (
                  <p className="text-xs text-muted-foreground">No historical details on record</p>
                )}
              </CardContent>
            </Card>

            {/* Source Archives */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" />
                  Source Archives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tune.locUrl && (
                  <a href={tune.locUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline" data-testid="link-loc">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Library of Congress
                  </a>
                )}
                {tune.theSessionId && (
                  <a href={`https://thesession.org/tunes/${tune.theSessionId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline" data-testid="link-thesession-sidebar">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    TheSession.org
                  </a>
                )}
                {tune.taterJoeUrl && (
                  <a href={tune.taterJoeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline" data-testid="link-taterjoe">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Tater Joe's Transcriptions
                  </a>
                )}
                {tune.folkwaysUrl && (
                  <a href={tune.folkwaysUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline" data-testid="link-folkways">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Smithsonian Folkways
                  </a>
                )}
                {tune.transcriptUrl && tune.transcriptUrl !== tune.taterJoeUrl && (
                  <a href={tune.transcriptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline" data-testid="link-transcript">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Sheet Music / Transcript
                  </a>
                )}

                <div className="pt-2 mt-2 border-t border-border space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Find More Recordings</p>
                  <a
                    href={`https://www.slippery-hill.com/tune-search?title=${encodeURIComponent(tune.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid="link-slippery-hill"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Slippery Hill (15,000+ recordings)
                  </a>
                  <a
                    href={`https://tunearch.org/wiki/${encodeURIComponent(tune.title.replace(/ /g, "_"))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid="link-tunearch"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Traditional Tune Archive
                  </a>
                  {!tune.locUrl && !tune.theSessionId && !tune.taterJoeUrl && !tune.folkwaysUrl && (
                    null
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
