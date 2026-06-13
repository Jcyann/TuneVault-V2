import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { KeyRound, Mic, Square, Upload, Loader2, Music2, AlertTriangle, ArrowRight, Flag } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { detectKeyFromBlob, getEssentia } from "@/lib/keyDetectionClient";
import SuggestChangesForm from "@/components/SuggestChangesForm";
import type { KeyDetectionResult } from "@shared/keyDetection";

const MAX_RECORD_SECONDS = 15;

export default function IdentifyKeyPage() {
  usePageMeta(
    "Identify the Key — TuneVault",
    "Record or upload a fiddle tune and detect its musical key right in your browser. A free tool for old-time and traditional musicians.",
  );
  const { toast } = useToast();

  const [analyzing, setAnalyzing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<KeyDetectionResult | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>("");
  const [showSuggest, setShowSuggest] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Warm up the WASM engine in the background as soon as the page loads.
  useEffect(() => {
    getEssentia().catch(() => {/* surfaced on first use */});
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function analyze(data: ArrayBuffer, label: string) {
    setAnalyzing(true);
    setResult(null);
    setSourceLabel(label);
    try {
      const r = await detectKeyFromBlob(data);
      setResult(r);
    } catch (err: any) {
      toast({ title: "Could not detect a key", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  }

  async function startRecording() {
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const buf = await blob.arrayBuffer();
        await analyze(buf, "Microphone recording");
      };
      mr.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= MAX_RECORD_SECONDS) stopRecording();
          return e + 1;
        });
      }, 1000);
    } catch (err: any) {
      toast({ title: "Microphone unavailable", description: "Please allow microphone access and try again.", variant: "destructive" });
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    await analyze(buf, file.name);
    e.target.value = "";
  }

  const busy = analyzing || recording;

  return (
    <div className="min-h-screen bg-background pt-14">
      <div
        className="px-4 pt-12 pb-10 border-b border-border"
        style={{ background: "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(25 75% 28%) 100%)" }}
      >
        <div className="container mx-auto max-w-2xl text-center">
          <KeyRound className="w-10 h-10 mx-auto text-primary-foreground opacity-90 mb-3" />
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-primary-foreground">Identify the Key</h1>
          <p className="text-primary-foreground/70 text-sm sm:text-base mt-2 max-w-lg mx-auto">
            Record a few seconds of a tune or upload an audio file, and we'll estimate its musical key — right in your browser, nothing uploaded to a server.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Record */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center text-center gap-3">
            <Mic className="w-8 h-8 text-amber-500" />
            <h2 className="font-semibold text-foreground">Record live</h2>
            <p className="text-xs text-muted-foreground">Play or hold your device near the music for up to {MAX_RECORD_SECONDS} seconds.</p>
            {!recording ? (
              <Button
                onClick={startRecording}
                disabled={busy}
                data-testid="button-start-recording"
                className="bg-amber-500 hover:bg-amber-600 text-white gap-2 mt-1"
              >
                <Mic className="w-4 h-4" /> Start recording
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                data-testid="button-stop-recording"
                className="bg-red-600 hover:bg-red-700 text-white gap-2 mt-1"
              >
                <Square className="w-4 h-4" /> Stop ({MAX_RECORD_SECONDS - elapsed}s)
              </Button>
            )}
          </div>

          {/* Upload */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center text-center gap-3">
            <Upload className="w-8 h-8 text-amber-500" />
            <h2 className="font-semibold text-foreground">Upload a file</h2>
            <p className="text-xs text-muted-foreground">MP3, WAV, M4A, OGG, or any audio your browser can read.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={onFileChange}
              className="hidden"
              data-testid="input-audio-file"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              variant="outline"
              data-testid="button-choose-file"
              className="gap-2 mt-1"
            >
              <Upload className="w-4 h-4" /> Choose file
            </Button>
          </div>
        </div>

        {analyzing && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center" data-testid="status-analyzing">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500 mb-3" />
            <p className="text-sm text-muted-foreground">Analyzing audio…</p>
          </div>
        )}

        {result && !analyzing && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-8 text-center" data-testid="result-card">
            {sourceLabel && <p className="text-xs text-muted-foreground mb-2 truncate">From: {sourceLabel}</p>}
            <p className="text-sm uppercase tracking-wide text-amber-700 dark:text-amber-400 font-medium">Estimated key</p>
            <p className="text-6xl font-bold font-serif text-foreground my-2" data-testid="text-detected-key">{result.key}</p>
            <p className="text-sm text-muted-foreground">
              {result.tonic} {result.scale} · {(result.confidence * 100).toFixed(0)}% confidence
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4">
              <Link
                href={`/?key=${encodeURIComponent(result.key)}`}
                data-testid="link-browse-key"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline"
              >
                <Music2 className="w-4 h-4" /> Browse {result.key} tunes <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => setShowSuggest(true)}
                data-testid="button-suggest-key"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline"
              >
                <Flag className="w-4 h-4" /> Suggest "{result.key}" for a library tune
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground flex gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <p>
            Key detection is an estimate. Old-time fiddle uses lots of open-string drones, which can fool the analysis into the
            dominant (a fifth away) or the relative major/minor. Trust your ears — and if you spot a tune in our library with the
            wrong key, please <Link href="/about" className="text-amber-600 hover:underline">suggest a correction</Link>.
          </p>
        </div>
      </div>

      <Dialog open={showSuggest} onOpenChange={setShowSuggest}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-semibold">Suggest a key correction</DialogTitle>
            <DialogDescription>
              Search for the tune in our library that you just identified, and we'll review the key change.
            </DialogDescription>
          </DialogHeader>
          {result && (
            <SuggestChangesForm
              correctionType="key"
              suggestedValue={result.key}
              onSuccess={() => setTimeout(() => setShowSuggest(false), 1500)}
              onCancel={() => setShowSuggest(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
