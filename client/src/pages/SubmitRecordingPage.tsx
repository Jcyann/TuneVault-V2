import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, CheckCircle2, Loader2, Music2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { usePageMeta } from "@/hooks/usePageMeta";
import { apiRequest } from "@/lib/queryClient";
import type { Tune } from "@shared/schema";

const RELEASE_TEXT =
  "By submitting, I confirm I own or have rights to this recording, and I grant TuneVault a non-exclusive, royalty-free license to display it with attribution on tunevault.org and associated platforms.";

type TuneOption = Pick<Tune, "id" | "title" | "key" | "tuneType">;

export default function SubmitRecordingPage() {
  usePageMeta("Submit a Recording — TuneVault", "Share your old-time fiddle recording with the TuneVault community.");

  const [tuneSearch, setTuneSearch] = useState("");
  const [tuneSuggestions, setTuneSuggestions] = useState<TuneOption[]>([]);
  const [selectedTune, setSelectedTune] = useState<TuneOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instrument, setInstrument] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [creditAs, setCreditAs] = useState("");
  const [releaseGranted, setReleaseGranted] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!tuneSearch || tuneSearch.length < 2 || selectedTune) {
      setTuneSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tunes?search=${encodeURIComponent(tuneSearch)}&limit=8`);
        const data = await res.json();
        setTuneSuggestions(data.tunes ?? []);
        setShowDropdown(true);
      } catch {
        setTuneSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [tuneSearch, selectedTune]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const mutation = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/recording-submission", body),
    onSuccess: () => setSubmitted(true),
    onError: async (err: any) => {
      let msg = "Something went wrong. Please try again.";
      try {
        const data = await err.response?.json();
        if (data?.error) msg = data.error;
      } catch {}
      setFormError(msg);
    },
  });

  function handleSelectTune(tune: TuneOption) {
    setSelectedTune(tune);
    setTuneSearch(tune.title);
    setShowDropdown(false);
  }

  function clearTune() {
    setSelectedTune(null);
    setTuneSearch("");
    setTuneSuggestions([]);
    setShowDropdown(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!selectedTune) { setFormError("Please select a tune from the list."); return; }
    if (!name.trim()) { setFormError("Your name is required."); return; }
    if (!email.trim() || !email.includes("@")) { setFormError("A valid email is required."); return; }
    if (!instrument) { setFormError("Please select your instrument."); return; }
    if (!youtubeUrl.trim() && !audioUrl.trim()) { setFormError("Please provide a YouTube URL or audio link."); return; }
    if (!releaseGranted) { setFormError("You must agree to the rights release to submit."); return; }

    mutation.mutate({
      tuneId: selectedTune.id,
      submitterName: name.trim(),
      submitterEmail: email.trim(),
      instrument,
      youtubeUrl: youtubeUrl.trim() || undefined,
      audioUrl: audioUrl.trim() || undefined,
      attributionName: creditAs.trim() || name.trim(),
      releaseGranted,
    });
  }

  return (
    <div className="min-h-screen bg-background pb-16 pt-12 sm:pt-12">
      {/* Hero */}
      <div
        className="relative text-primary-foreground px-4 pt-12 pb-10 overflow-hidden border-b border-white/10"
        style={{ backgroundImage: "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(25 75% 28%) 100%)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.18),transparent_65%)] pointer-events-none" />
        <div className="container mx-auto max-w-3xl relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Upload className="w-9 h-9 opacity-90" style={{ color: "#F59E0B" }} />
            <h1 className="text-3xl font-bold font-serif">Submit a Recording</h1>
          </div>
          <p className="text-primary-foreground/75 text-sm leading-relaxed max-w-lg" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Share your playing with the TuneVault community. Approved recordings appear directly on tune pages for everyone to hear.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-10">
        {submitted ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-10 text-center space-y-3" data-testid="submit-success">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-green-900 dark:text-green-300 font-serif">Thanks for sharing!</h2>
            <p className="text-green-700 dark:text-green-400 text-sm leading-relaxed">
              Your recording has been received. We'll review it and, if approved, it'll appear on the tune's page with your credit.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="submit-recording-form">

            {/* Tune search */}
            <div className="space-y-1.5">
              <Label htmlFor="tune-search">Tune <span className="text-destructive">*</span></Label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="tune-search"
                    data-testid="input-tune-search"
                    placeholder="Search tune name…"
                    value={tuneSearch}
                    onChange={(e) => {
                      setTuneSearch(e.target.value);
                      if (selectedTune) setSelectedTune(null);
                    }}
                    className="pl-9 pr-9"
                  />
                  {tuneSearch && (
                    <button
                      type="button"
                      onClick={clearTune}
                      data-testid="button-clear-tune"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {showDropdown && tuneSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden" data-testid="tune-dropdown">
                    {tuneSuggestions.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        data-testid={`tune-option-${t.id}`}
                        onClick={() => handleSelectTune(t)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-left text-sm"
                      >
                        <Music2 className="w-4 h-4 shrink-0 text-amber-500" />
                        <span className="font-medium text-foreground">{t.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{t.key} · {t.tuneType}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && tuneSuggestions.length === 0 && tuneSearch.length >= 2 && !selectedTune && (
                  <div className="absolute z-50 top-full mt-1 w-full rounded-xl border border-border bg-popover px-4 py-3 text-sm text-muted-foreground shadow-lg">
                    No tunes found — try a different spelling.
                  </div>
                )}
              </div>
              {selectedTune && (
                <p className="text-xs text-amber-700 font-medium flex items-center gap-1 mt-1" data-testid="selected-tune-name">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selected: {selectedTune.title}
                </p>
              )}
            </div>

            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sub-name">Your name <span className="text-destructive">*</span></Label>
                <Input
                  id="sub-name"
                  data-testid="input-submitter-name"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (!creditAs) setCreditAs(e.target.value); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="sub-email"
                  data-testid="input-submitter-email"
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Instrument */}
            <div className="space-y-1.5">
              <Label>Instrument <span className="text-destructive">*</span></Label>
              <Select value={instrument} onValueChange={setInstrument} data-testid="select-instrument">
                <SelectTrigger data-testid="trigger-instrument">
                  <SelectValue placeholder="Select your instrument…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiddle">Fiddle</SelectItem>
                  <SelectItem value="banjo">Banjo</SelectItem>
                  <SelectItem value="guitar">Guitar</SelectItem>
                  <SelectItem value="upright-bass">Upright Bass</SelectItem>
                  <SelectItem value="mandolin">Mandolin</SelectItem>
                  <SelectItem value="dulcimer">Dulcimer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URLs */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Provide at least one of the following:</p>
              <div className="space-y-1.5">
                <Label htmlFor="sub-youtube">YouTube URL</Label>
                <Input
                  id="sub-youtube"
                  data-testid="input-youtube-url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-audio">Audio URL <span className="text-muted-foreground font-normal text-xs">(SoundCloud, Google Drive, Dropbox, etc.)</span></Label>
                <Input
                  id="sub-audio"
                  data-testid="input-audio-url"
                  placeholder="https://soundcloud.com/..."
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Credit as */}
            <div className="space-y-1.5">
              <Label htmlFor="sub-credit">Credit as <span className="text-muted-foreground font-normal text-xs">(how your name appears on the tune page)</span></Label>
              <Input
                id="sub-credit"
                data-testid="input-credit-as"
                placeholder="Jane Smith"
                value={creditAs}
                onChange={(e) => setCreditAs(e.target.value)}
              />
            </div>

            {/* Rights release */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Rights Release</h3>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{RELEASE_TEXT}</p>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="release-check"
                  data-testid="checkbox-release"
                  checked={releaseGranted}
                  onCheckedChange={(v) => setReleaseGranted(!!v)}
                  className="mt-0.5"
                />
                <Label htmlFor="release-check" className="text-sm text-amber-900 dark:text-amber-200 leading-snug cursor-pointer">
                  I agree to these terms and confirm I have the rights to this recording.
                </Label>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive" data-testid="submit-error">{formError}</p>
            )}

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5"
              data-testid="button-submit-recording"
            >
              {mutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Submit Recording</>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Submissions are reviewed before appearing on tune pages. Only high-quality, on-topic recordings will be approved.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
