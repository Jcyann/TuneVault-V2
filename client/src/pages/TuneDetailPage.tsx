import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Music2, ExternalLink, FileText, Video, BookOpen } from "lucide-react";
import type { Tune } from "@shared/schema";
import AudioPlayer from "@/components/AudioPlayer";
import AbcStaffRenderer from "@/components/AbcStaffRenderer";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 border-green-300",
  intermediate: "bg-amber-100 text-amber-800 border-amber-300",
  advanced: "bg-red-100 text-red-800 border-red-300",
};

export default function TuneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showRawAbc, setShowRawAbc] = useState(false);

  const { data: tune, isLoading, isError } = useQuery<Tune>({
    queryKey: [`/api/tunes/${id}`],
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
          <Link href="/">
            <Button><ArrowLeft className="w-4 h-4 mr-2" />Back to Collection</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="text-primary-foreground py-10 px-4 shadow-lg border-b border-white/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.82) 100%)" }}
      >
        <div className="container mx-auto max-w-5xl">
          <Link href="/">
            <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to TuneVault
            </Button>
          </Link>
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

            {/* Performance Notes — tune-specific only */}
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
                  <div className="aspect-video rounded-lg overflow-hidden bg-black shadow-lg">
                    <iframe
                      data-testid="video-youtube"
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${tune.youtubeVideoId}?rel=0&modestbranding=1`}
                      title={tune.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                      referrerPolicy="no-referrer-when-downgrade"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"
                      allowFullScreen
                    />
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
                  <a
                    href={tune.locUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid="link-loc"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Library of Congress
                  </a>
                )}
                {tune.theSessionId && (
                  <a
                    href={`https://thesession.org/tunes/${tune.theSessionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid="link-thesession-sidebar"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    TheSession.org
                  </a>
                )}
                {tune.taterJoeUrl && (
                  <a
                    href={tune.taterJoeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid="link-taterjoe"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Tater Joe's Transcriptions
                  </a>
                )}
                {tune.folkwaysUrl && (
                  <a
                    href={tune.folkwaysUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid="link-folkways"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Smithsonian Folkways
                  </a>
                )}
                {tune.transcriptUrl && tune.transcriptUrl !== tune.taterJoeUrl && (
                  <a
                    href={tune.transcriptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid="link-transcript"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Sheet Music / Transcript
                  </a>
                )}
                {!tune.locUrl && !tune.theSessionId && !tune.taterJoeUrl && !tune.folkwaysUrl && (
                  <p className="text-xs text-muted-foreground">No external links on record</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
