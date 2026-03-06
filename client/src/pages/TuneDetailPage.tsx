import { useQuery } from "@tanstack/react-query";
  import { useParams, Link } from "wouter";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Separator } from "@/components/ui/separator";
  import { ArrowLeft, Music2, ExternalLink, FileText, Video, Music } from "lucide-react";

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
    youtubeVideoId: string | null;
    abcNotation: string | null;
    locUrl: string | null;
    locItemId: string | null;
    theSessionId: string | null;
    taterJoeUrl: string | null;
    transcriptUrl: string | null;
    folkwaysUrl: string | null;
    tuning: string | null;
    notes: string | null;
    tags: string | null;
  }

  export default function TuneDetailPage() {
    const params = useParams();
    const tuneId = params.id ? parseInt(params.id) : null;

    const { data: tune, isLoading } = useQuery<Tune>({
      queryKey: [`/api/tunes/${tuneId}`],
      enabled: !!tuneId,
    });

    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
          <div className="text-center">
            <Music2 className="w-16 h-16 mx-auto mb-4 animate-pulse text-amber-900" />
            <p className="text-lg text-amber-800">Loading tune...</p>
          </div>
        </div>
      );
    }

    if (!tune) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-amber-800">Tune not found</p>
            <Link href="/">
              <Button className="mt-4 bg-amber-900 hover:bg-amber-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Collection
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900 via-orange-800 to-amber-900 text-white py-8 px-4 shadow-lg">
          <div className="container mx-auto max-w-5xl">
            <Link href="/">
              <Button variant="ghost" className="text-white hover:bg-amber-800 mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Collection
              </Button>
            </Link>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{tune.title}</h1>
                {tune.alternativeTitles && (
                  <p className="text-amber-200 text-lg">
                    Also known as: {tune.alternativeTitles}
                  </p>
                )}
              </div>
              {tune.popularity && tune.popularity >= 9 && (
                <Badge className="bg-orange-500 text-white text-lg px-4 py-2">
                  Popular Tune
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-5xl px-4 py-8">
          {/* Key Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-white/90 backdrop-blur border-amber-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Key</CardDescription>
                <CardTitle className="text-2xl text-amber-900">{tune.key}</CardTitle>
              </CardHeader>
            </Card>
            {tune.tuneType && (
              <Card className="bg-white/90 backdrop-blur border-amber-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Type</CardDescription>
                  <CardTitle className="text-lg text-orange-800 capitalize">{tune.tuneType}</CardTitle>
                </CardHeader>
              </Card>
            )}
            {tune.difficulty && (
              <Card className="bg-white/90 backdrop-blur border-amber-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Difficulty</CardDescription>
                  <CardTitle className="text-lg capitalize"
                    style={{
                      color: tune.difficulty === 'beginner' ? '#15803d' 
                        : tune.difficulty === 'intermediate' ? '#c2410c'
                        : '#991b1b'
                    }}
                  >
                    {tune.difficulty}
                  </CardTitle>
                </CardHeader>
              </Card>
            )}
            {tune.region && (
              <Card className="bg-white/90 backdrop-blur border-amber-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Region</CardDescription>
                  <CardTitle className="text-lg text-amber-900">{tune.region}</CardTitle>
                </CardHeader>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {tune.description && (
                <Card className="bg-white/90 backdrop-blur border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-900">About This Tune</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-amber-800 leading-relaxed">{tune.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Video Player */}
              {tune.youtubeVideoId && (
                <Card className="bg-white/90 backdrop-blur border-amber-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-900">
                      <Video className="w-5 h-5" />
                      Video Performance
                    </CardTitle>
                    <CardDescription>
                      Use playback speed controls (gear icon) to slow down for practice
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube-nocookie.com/embed/${tune.youtubeVideoId}?rel=0`}
                        title={tune.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ABC Notation */}
              {tune.abcNotation && (
                <Card className="bg-white/90 backdrop-blur border-amber-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-900">
                      <Music className="w-5 h-5" />
                      ABC Notation
                    </CardTitle>
                    <CardDescription>
                      Sheet music in ABC format from TheSession.org
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-amber-50 p-4 rounded-lg overflow-x-auto text-sm font-mono text-amber-900 border border-amber-200">
                      {tune.abcNotation}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Performance Notes */}
              {tune.notes && (
                <Card className="bg-white/90 backdrop-blur border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-900">Performance Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-amber-800 leading-relaxed">{tune.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Historical Details */}
              <Card className="bg-white/90 backdrop-blur border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-900">Historical Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {tune.sourceFiddler && (
                    <div>
                      <strong className="text-amber-900">Source Fiddler:</strong>
                      <p className="text-amber-800">{tune.sourceFiddler}</p>
                    </div>
                  )}
                  {tune.era && (
                    <div>
                      <strong className="text-amber-900">Era:</strong>
                      <p className="text-amber-800">{tune.era}</p>
                    </div>
                  )}
                  {tune.tuning && (
                    <div>
                      <strong className="text-amber-900">Tuning:</strong>
                      <p className="text-amber-800">{tune.tuning}</p>
                    </div>
                  )}
                  {tune.tags && (
                    <div>
                      <strong className="text-amber-900">Tags:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tune.tags.split(',').map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-amber-300">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* External Resources */}
              <Card className="bg-white/90 backdrop-blur border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-900">
                    <FileText className="w-5 h-5" />
                    External Resources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tune.locUrl && (
                    <a 
                      href={tune.locUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Library of Congress
                    </a>
                  )}
                  {tune.theSessionId && (
                    <a 
                      href={`https://thesession.org/tunes/${tune.theSessionId}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      TheSession.org
                    </a>
                  )}
                  {tune.taterJoeUrl && (
                    <a 
                      href={tune.taterJoeUrl}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Tater Joe's Transcriptions
                    </a>
                  )}
                  {tune.folkwaysUrl && (
                    <a 
                      href={tune.folkwaysUrl}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Smithsonian Folkways
                    </a>
                  )}
                  {tune.transcriptUrl && tune.transcriptUrl !== tune.taterJoeUrl && (
                    <a 
                      href={tune.transcriptUrl}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Transcript
                    </a>
                  )}
                </CardContent>
              </Card>

              {/* Practice Tips */}
              <Card className="bg-orange-50 border-orange-300">
                <CardHeader>
                  <CardTitle className="text-sm text-orange-900">💡 Practice Tip</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-orange-800 space-y-2">
                  <p>Use the YouTube player's speed control (gear icon) to slow down to 0.5x or 0.75x for learning.</p>
                  <p>Compare the ABC notation with the video to understand variations.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }
  