import { useState, useEffect, useRef } from "react";
import { Send, CheckCircle2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import type { Tune } from "@shared/schema";

const CORRECTION_TYPES = [
  { value: "general", label: "General feedback or new tune suggestion" },
  { value: "key", label: "Key / mode is wrong" },
  { value: "title", label: "Title needs correction" },
  { value: "alternative_titles", label: "Missing or wrong alternate titles" },
  { value: "source_fiddler", label: "Source fiddler is wrong or missing" },
  { value: "description", label: "Historical info needs correction" },
  { value: "audio", label: "Better audio URL available" },
  { value: "video", label: "YouTube video suggestion" },
];

const VALUE_LABELS: Record<string, { label: string; placeholder: string; type?: string }> = {
  key: { label: "Correct key / mode", placeholder: "e.g. D Major, A Dorian, G Minor…" },
  title: { label: "Correct title", placeholder: "e.g. Sandy River Belle" },
  alternative_titles: { label: "Alternate title(s)", placeholder: "e.g. Sandy River, Sandy's Reel (comma-separated)" },
  source_fiddler: { label: "Source fiddler name", placeholder: "e.g. Tommy Jarrell" },
  description: { label: "Corrected / additional information", placeholder: "What should the description say?" },
  audio: { label: "Audio URL", placeholder: "https://…", type: "url" },
  video: { label: "YouTube URL", placeholder: "https://www.youtube.com/watch?v=…", type: "url" },
};

interface Props {
  tuneId?: number;
  tuneName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export default function SuggestChangesForm({ tuneId: initialTuneId, tuneName: initialTuneName, onSuccess, onCancel, className = "" }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [correctionType, setCorrectionType] = useState("general");
  const [suggestedValue, setSuggestedValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Tune search (only shown when no tune is pre-filled)
  const [tuneId, setTuneId] = useState<number | undefined>(initialTuneId);
  const [tuneName, setTuneName] = useState(initialTuneName ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Tune[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preFilled = !!initialTuneId;
  const needsValue = correctionType !== "general";
  const valueConfig = VALUE_LABELS[correctionType];

  useEffect(() => {
    if (preFilled || !searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/tunes?q=${encodeURIComponent(searchQuery)}&limit=6`);
        const data = await res.json();
        setSearchResults(Array.isArray(data.tunes) ? data.tunes : Array.isArray(data) ? data : []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, preFilled]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectTune(tune: Tune) {
    setTuneId(tune.id);
    setTuneName(tune.title);
    setSearchQuery(tune.title);
    setShowDropdown(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = notes.trim() || suggestedValue.trim() || "(no additional notes)";
    if (!message || message === "(no additional notes)") {
      setError("Please provide a suggested value or notes.");
      return;
    }
    if (needsValue && !suggestedValue.trim()) {
      setError("Please fill in the suggested value.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/suggestion", {
        name: name.trim() || null,
        email: email.trim() || null,
        message: notes.trim() || "—",
        tuneId: tuneId ?? null,
        tuneTitle: tuneName.trim() || null,
        correctionType,
        suggestedValue: suggestedValue.trim() || null,
      });
      setSubmitted(true);
      onSuccess?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-7 text-center space-y-2" data-testid="suggest-changes-success">
        <CheckCircle2 className="w-9 h-9 text-green-500 mx-auto" />
        <p className="font-semibold text-green-900 dark:text-green-300">Thanks — got it!</p>
        <p className="text-green-700 dark:text-green-400 text-sm">We'll review this and apply the correction soon.</p>
        {onCancel && (
          <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground" onClick={onCancel}>Close</Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`} data-testid="suggest-changes-form">

      {/* Tune search — only when not pre-filled */}
      {!preFilled && (
        <div className="space-y-1.5" ref={searchRef}>
          <Label htmlFor="tune-search">Which tune? <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="tune-search"
              data-testid="input-tune-search"
              placeholder="Search by title…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) { setTuneId(undefined); setTuneName(""); }
              }}
              className="pl-9"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                {searchResults.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTune(t)}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted text-sm flex items-center gap-3"
                    data-testid={`tune-result-${t.id}`}
                  >
                    <span className="font-medium text-foreground">{t.title}</span>
                    <span className="text-muted-foreground text-xs">{t.key} {t.tuneType}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {tuneId && tuneName && (
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Selected: {tuneName}
              <button type="button" className="ml-2 text-muted-foreground underline" onClick={() => { setTuneId(undefined); setTuneName(""); setSearchQuery(""); }}>
                Clear
              </button>
            </p>
          )}
        </div>
      )}

      {/* Pre-filled tune label */}
      {preFilled && tuneName && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">Tune: </span>
          <span className="font-semibold text-foreground">{tuneName}</span>
        </div>
      )}

      {/* Correction type */}
      <div className="space-y-1.5">
        <Label htmlFor="correction-type">Type of feedback *</Label>
        <Select value={correctionType} onValueChange={(v) => { setCorrectionType(v); setSuggestedValue(""); }}>
          <SelectTrigger id="correction-type" data-testid="select-correction-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CORRECTION_TYPES.map((ct) => (
              <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Suggested value — conditional */}
      {needsValue && valueConfig && (
        <div className="space-y-1.5">
          <Label htmlFor="suggested-value">{valueConfig.label} *</Label>
          {correctionType === "description" ? (
            <Textarea
              id="suggested-value"
              data-testid="textarea-suggested-value"
              placeholder={valueConfig.placeholder}
              value={suggestedValue}
              onChange={(e) => setSuggestedValue(e.target.value)}
              rows={3}
            />
          ) : (
            <Input
              id="suggested-value"
              data-testid="input-suggested-value"
              type={valueConfig.type ?? "text"}
              placeholder={valueConfig.placeholder}
              value={suggestedValue}
              onChange={(e) => setSuggestedValue(e.target.value)}
            />
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">
          {correctionType === "general" ? "Your suggestion *" : "Additional context"}
          {correctionType !== "general" && <span className="text-muted-foreground font-normal"> (optional)</span>}
        </Label>
        <Textarea
          id="notes"
          data-testid="textarea-notes"
          placeholder={
            correctionType === "general"
              ? "Tune title, region, fiddler, recording, or any context that helps us find or fix it…"
              : "Any background, source, or reasoning that helps us verify this correction…"
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sc-name">Your name <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input id="sc-name" data-testid="input-sc-name" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-email">Email <span className="text-muted-foreground font-normal">(optional, for follow-up)</span></Label>
          <Input id="sc-email" data-testid="input-sc-email" type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-xs text-destructive" data-testid="suggest-error">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          data-testid="button-submit-suggestion"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
          ) : (
            <><Send className="w-4 h-4 mr-2" />Send Feedback</>
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
