import { useParams, Link } from "wouter";
  import { useQuery } from "@tanstack/react-query";
  import { ArrowLeft, Music2, ExternalLink, Youtube, FileText, Library } from "lucide-react";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { Separator } from "@/components/ui/separator";
  import type { Tune } from "@shared/schema";

  export default function TuneDetailPage() {
    const { id } = useParams<{ id: string }>();

    const { data: tune, isLoading } = useQuery<Tune>({
      queryKey: [`/api/tunes/${id}`],
      queryFn: async () => {
        const response = await fetch(`/api/tunes/${id}`);
        if (!response.ok) throw new Error("Tune not found");
        return response.json();
      },
    });

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-500">Loading tune...</p>
        </div>
      );
    }

    if (!tune) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Music2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">Tune not found</p>
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </div>
        </div>
      );
    }

    const getYouTubeId = (url: string | null) => {
      if (!url) return null;
      const match = url.match(/[?&]v=([^&]+)/);
      return match ? match[1] : null;
    };

    const videoId = getYouTubeId(tune.youtubeUrl);

    return (
      <div className="min-h-screen">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tunes
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Music2 className="h-8 w-8 text-amber-700" />
              <div>
                <h1 className="text-3xl font-bold text-amber-900">TuneVault</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <div className="flex items-start gap-4 mb-4">
              <Badge className="bg-amber-700 text-white text-lg px-4 py-1">
                {tune.key}
              </Badge>
              <Badge variant="outline" className="text-base px-3 py-1">
                {tune.region}
              </Badge>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{tune.title}</h1>
            <p className="text-xl text-gray-600 mb-4">{tune.sourceFiddler}</p>
            <p className="text-gray-700 leading-relaxed max-w-3xl">
              {tune.description}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {videoId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Youtube className="h-5 w-5 text-red-600" />
                      Video Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
                        title={tune.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                    <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm font-medium text-amber-900 mb-2">
                        💡 Playback Speed Control
                      </p>
                      <p className="text-sm text-gray-700">
                        Use YouTube playback speed controls (gear icon) to slow down to 0.75x, 0.5x, or 0.25x for practice.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {tune.audioUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music2 className="h-5 w-5 text-amber-700" />
                      Audio Recording
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <audio
                      controls
                      controlsList="nodownload"
                      className="w-full"
                      style={{ height: "54px" }}
                    >
                      <source src={tune.audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    <p className="mt-3 text-sm text-gray-600">
                      Right-click on the timeline to adjust playback speed
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="text-lg">Historical Archives</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tune.taterJoeUrl && (
                    <a
                      href={tune.taterJoeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 group-hover:text-amber-900">
                          Tater Joe\'s
                        </span>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-amber-700" />
                      </div>
                      <p className="text-sm text-gray-600">
                        View transcription & notation
                      </p>
                    </a>
                  )}

                  {tune.locUrl && (
                    <a
                      href={tune.locUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 group-hover:text-amber-900">
                          Library of Congress
                        </span>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-amber-700" />
                      </div>
                      <p className="text-sm text-gray-600">
                        Historic recordings collection
                      </p>
                    </a>
                  )}

                  {tune.folkwaysUrl && (
                    <a
                      href={tune.folkwaysUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 group-hover:text-amber-900">
                          Smithsonian Folkways
                        </span>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-amber-700" />
                      </div>
                      <p className="text-sm text-gray-600">
                        Classic recordings archive
                      </p>
                    </a>
                  )}

                  {tune.transcriptUrl && tune.transcriptUrl !== tune.taterJoeUrl && (
                    <a
                      href={tune.transcriptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 group-hover:text-amber-900">
                          Sheet Music
                        </span>
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-amber-700" />
                      </div>
                      <p className="text-sm text-gray-600">
                        View notation
                      </p>
                    </a>
                  )}
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-gradient-to-br from-amber-50 to-orange-50">
                <CardHeader>
                  <CardTitle className="text-lg">Practice Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-700">
                  <p>🎵 Start by listening to the full-speed version multiple times</p>
                  <p>🐌 Use 0.5x speed to learn the melody note-by-note</p>
                  <p>📝 Follow along with the notation from Tater Joe\'s</p>
                  <p>⏫ Gradually increase speed as you gain confidence</p>
                  <p>🔄 Practice in small sections and loop difficult passages</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <footer className="border-t bg-white/80 mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
            <p>TuneVault - Preserving Old Time Fiddle traditions</p>
          </div>
        </footer>
      </div>
    );
  }
  