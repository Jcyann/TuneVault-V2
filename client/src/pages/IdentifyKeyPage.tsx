import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Mic, Upload, Loader2, Music2, AlertTriangle, ArrowRight, Flag, Guitar, Users, Search, PencilLine, SlidersHorizontal, CheckCircle2 } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { detectKeyFromBlob, getEssentia } from "@/lib/keyDetectionClient";
import SuggestChangesForm from "@/components/SuggestChangesForm";
import type { KeyDetectionResult } from "@shared/keyDetection";
import {
  FIDDLE_TUNINGS,
  TUNER_INSTRUMENTS,
  TUNING_PRESETS,
  detectMonophonicPitch,
  getTunerNeedleAngle,
  getPitchReading,
  type PitchReading,
  type TunerInstrument,
  type TunerStatus,
  type TuningPreset,
} from "@/lib/tuner";

const MAX_RECORD_SECONDS = 15;

// Circle of fifths, clockwise from the top. Each slot lists the spellings
// essentia might report so we can light up the matching tonic.
const CIRCLE_OF_FIFTHS = [
  { label: "C", names: ["C"] },
  { label: "G", names: ["G"] },
  { label: "D", names: ["D"] },
  { label: "A", names: ["A"] },
  { label: "E", names: ["E"] },
  { label: "B", names: ["B"] },
  { label: "F♯", names: ["F#", "Gb"] },
  { label: "D♭", names: ["Db", "C#"] },
  { label: "A♭", names: ["Ab", "G#"] },
  { label: "E♭", names: ["Eb", "D#"] },
  { label: "B♭", names: ["Bb", "A#"] },
  { label: "F", names: ["F"] },
];

const LABEL_RADIUS = 45; // % of container from center
const POSITIONS = CIRCLE_OF_FIFTHS.map((_, i) => {
  const a = ((-90 + i * 30) * Math.PI) / 180;
  return { left: 50 + LABEL_RADIUS * Math.cos(a), top: 50 + LABEL_RADIUS * Math.sin(a) };
});

const RING_R = 46;
const RING_C = 2 * Math.PI * RING_R;

const USES = [
  { icon: Guitar, text: "Tuning up — bow one sustained note and get its name in about a second." },
  { icon: Music2, text: "Naming a recording's key — record a clip playing nearby, or upload an audio file." },
  { icon: Users, text: "Jamming with confidence — learn the key before you jump into a session." },
  { icon: Search, text: "Browsing smarter — leap straight to every TuneVault tune in that key." },
  { icon: PencilLine, text: "Transcribing — confirm the key before you write out the notation." },
];

function normalizeNote(n: string): string {
  return (n || "").replace("♯", "#").replace("♭", "b");
}

// Chromatic pitch class (C=0) -> index in the circle-of-fifths array above.
const PC_TO_FIFTHS: Record<number, number> = {
  0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: 7, 8: 8, 3: 9, 10: 10, 5: 11,
};

type ToolMode = "key" | "tuner";

const TUNER_THEMES: Record<TunerInstrument, {
  button: string;
  halo: string;
  ring: string;
  status: string;
  stroke: string;
}> = {
  fiddle: {
    button: "from-[hsl(25_55%_32%)] to-[hsl(42_70%_40%)]",
    halo: "bg-amber-500/15",
    ring: "text-amber-700",
    status: "text-amber-700",
    stroke: "hsl(42 70% 40% / 0.78)",
  },
  banjo: {
    button: "from-[hsl(204_55%_30%)] to-[hsl(188_64%_38%)]",
    halo: "bg-cyan-500/15",
    ring: "text-cyan-700",
    status: "text-cyan-700",
    stroke: "hsl(188 64% 38% / 0.78)",
  },
  guitar: {
    button: "from-[hsl(150_45%_28%)] to-[hsl(166_55%_38%)]",
    halo: "bg-emerald-500/15",
    ring: "text-emerald-700",
    status: "text-emerald-700",
    stroke: "hsl(166 55% 38% / 0.78)",
  },
};

const TUNER_VISUAL_HUES: Record<TunerInstrument, string> = {
  fiddle: "42 70% 40%",
  banjo: "188 64% 38%",
  guitar: "166 55% 38%",
};

function tunerStatusLabelFor(status: TunerStatus): string {
  if (status === "in-tune") return "In tune";
  if (status === "flat") return "Flat";
  if (status === "sharp") return "Sharp";
  return "Play a tuning note";
}

export default function IdentifyKeyPage() {
  usePageMeta(
    "Tune — Free Old-Time Fiddle Tuner & Key Finder",
    "Free browser tools for old-time musicians: tune fiddle, banjo, or guitar in standard and cross-tunings, including Calico, Open C, Open D, and Open A, or identify the key of a recording.",
  );
  const { toast } = useToast();

  const [analyzing, setAnalyzing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<KeyDetectionResult | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [mode, setMode] = useState<ToolMode>("key");
  const [tunerListening, setTunerListening] = useState(false);
  const [tunerStarting, setTunerStarting] = useState(false);
  const [instrumentId, setInstrumentId] = useState<TunerInstrument>("fiddle");
  const [tuningId, setTuningId] = useState("standard");
  const [targetStringId, setTargetStringId] = useState<string | null>(null);
  const [referencePitch, setReferencePitch] = useState(440);
  const [tunerReading, setTunerReading] = useState<PitchReading | null>(null);
  const [showTunerSettings, setShowTunerSettings] = useState(false);
  const [tunerAnnouncement, setTunerAnnouncement] = useState("");
  const [tunerConfirmed, setTunerConfirmed] = useState(false);
  const [inTuneSoundEnabled, setInTuneSoundEnabled] = useState(false);

  const [liveIndex, setLiveIndex] = useState(-1);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live tuner visualization (Web Audio)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const timeDataRef = useRef<Float32Array | null>(null);
  const primaryRef = useRef<string>("");
  const frameRef = useRef(0);
  const vizRunningRef = useRef(false);
  const mountedRef = useRef(true);
  const modeRef = useRef<ToolMode>("key");
  const tunerListeningRef = useRef(false);
  const tunerStartPendingRef = useRef(false);
  const tunerSessionRef = useRef(0);
  const lastTunerAnnouncementRef = useRef("");
  const tunerAnnouncementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inTuneSinceRef = useRef<number | null>(null);
  const tunerConfirmedRef = useRef(false);
  const tunerChimedRef = useRef(false);
  const inTuneSoundEnabledRef = useRef(false);
  const tuningRef = useRef<TuningPreset>(FIDDLE_TUNINGS[0]);
  const targetStringRef = useRef<string | null>(null);
  const referencePitchRef = useRef(440);
  const instrumentHueRef = useRef(TUNER_VISUAL_HUES.fiddle);
  const tunerReadingRef = useRef<PitchReading | null>(null);

  const instrumentTunings = TUNING_PRESETS.filter((tuning) => tuning.instrument === instrumentId);
  const currentTuning = instrumentTunings.find((tuning) => tuning.id === tuningId) ?? instrumentTunings[0] ?? FIDDLE_TUNINGS[0];

  useEffect(() => {
    tuningRef.current = currentTuning;
    targetStringRef.current = targetStringId;
    referencePitchRef.current = referencePitch;
    instrumentHueRef.current = TUNER_VISUAL_HUES[instrumentId];
  }, [currentTuning, targetStringId, referencePitch, instrumentId]);

  useEffect(() => {
    tunerReadingRef.current = tunerReading;
  }, [tunerReading]);

  useEffect(() => {
    inTuneSoundEnabledRef.current = inTuneSoundEnabled;
  }, [inTuneSoundEnabled]);

  useEffect(() => {
    if (!tunerListening || !tunerReading) return;
    const announcementKey = `${tunerReading.target?.id ?? "none"}-${tunerReading.status}`;
    if (announcementKey === lastTunerAnnouncementRef.current) return;
    const targetLabel = tunerReading.target ? `target ${tunerReading.target.label}` : "no matching string";
    tunerAnnouncementTimerRef.current = setTimeout(() => {
      lastTunerAnnouncementRef.current = announcementKey;
      setTunerAnnouncement(`${tunerStatusLabelFor(tunerReading.status)}; ${targetLabel}.`);
    }, 800);
    return () => {
      if (tunerAnnouncementTimerRef.current) {
        clearTimeout(tunerAnnouncementTimerRef.current);
        tunerAnnouncementTimerRef.current = null;
      }
    };
  }, [tunerListening, tunerReading?.status, tunerReading?.target?.id]);

  // Warm up the WASM engine in the background as soon as the page loads.
  useEffect(() => {
    getEssentia().catch(() => {/* surfaced on first use */});
    return () => {
      mountedRef.current = false;
      if (tunerAnnouncementTimerRef.current) clearTimeout(tunerAnnouncementTimerRef.current);
      teardownRecording();
    };
  }, []);

  // Fully tear down a recording session: timer, viz/rAF, AudioContext, mic
  // tracks, and the recorder (with handlers detached so a late onstop can't
  // fire analysis after unmount or an aborted start).
  function teardownRecording() {
    tunerSessionRef.current += 1;
    tunerStartPendingRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopViz();
    const mr = mediaRecorderRef.current;
    if (mr) {
      mr.ondataavailable = null;
      mr.onstop = null;
      if (mr.state !== "inactive") { try { mr.stop(); } catch { /* already stopped */ } }
      mediaRecorderRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    tunerListeningRef.current = false;
  }

  function setupViz(stream: MediaStream): boolean {
    let ctx: AudioContext | null = null;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      timeDataRef.current = new Float32Array(analyser.fftSize);
      primaryRef.current = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "25 70% 45%";
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 360 * dpr;
        canvas.height = 360 * dpr;
        canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      frameRef.current = 0;
      vizRunningRef.current = true;
      rafRef.current = requestAnimationFrame(drawViz);
      return true;
    } catch {
      vizRunningRef.current = false;
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      ctx?.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
      return false;
    }
  }

  function resetTunerConfirmation() {
    inTuneSinceRef.current = null;
    tunerChimedRef.current = false;
    if (tunerConfirmedRef.current) {
      tunerConfirmedRef.current = false;
      setTunerConfirmed(false);
    }
  }

  function updateTunerConfirmation(reading: PitchReading | null) {
    if (!reading || reading.status !== "in-tune") {
      resetTunerConfirmation();
      return;
    }

    const now = performance.now();
    if (inTuneSinceRef.current === null) {
      inTuneSinceRef.current = now;
      return;
    }

    if (!tunerConfirmedRef.current && now - inTuneSinceRef.current >= 350) {
      tunerConfirmedRef.current = true;
      setTunerConfirmed(true);
      if (inTuneSoundEnabledRef.current && !tunerChimedRef.current) {
        tunerChimedRef.current = true;
        playInTuneChime();
      }
    }
  }

  function drawViz() {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const freq = freqDataRef.current;
    if (analyser && canvas && freq) {
      const c = canvas.getContext("2d");
      if (c) {
        analyser.getByteFrequencyData(freq);
        c.clearRect(0, 0, 360, 360);
        const cx = 180, cy = 180;
        const isTuner = modeRef.current === "tuner";
        const innerR = isTuner ? 102 : 116;
        const maxLen = isTuner ? 70 : 38;
        const N = isTuner ? 44 : 132;
        const SENS = 1.9;
        const usable = Math.floor(freq.length * 0.5);
        const reading = tunerReadingRef.current;
        const p = isTuner ? instrumentHueRef.current : (primaryRef.current || "25 70% 45%");
        const needleAngle = getTunerNeedleAngle(reading?.cents);
        const peakAngle = needleAngle === null
          ? null
          : -Math.PI / 2 + (needleAngle * Math.PI) / 180;
        c.lineWidth = 1.8;
        c.lineCap = "round";
        for (let i = 0; i < N; i++) {
          const t = i < N / 2 ? i / (N / 2) : (N - i) / (N / 2);
          const raw = (freq[Math.floor(t * usable)] || 0) / 255;
          const mag = Math.min(1, raw * SENS);
          const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
          const angleFromPeak = peakAngle === null
            ? Math.PI
            : Math.abs(Math.atan2(Math.sin(ang - peakAngle), Math.cos(ang - peakAngle)));
          const directionalPeak = peakAngle === null ? 0 : Math.max(0, Math.cos(angleFromPeak));
          const peak = peakAngle === null ? 0 : Math.pow(directionalPeak, 8);
          const len = isTuner
            ? 5 + mag * 17 + peak * 72
            : 2 + mag * maxLen;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          const hue = isTuner && reading?.status === "in-tune" && peak > 0.16 ? "145 55% 42%" : p;
          c.strokeStyle = `hsl(${hue} / ${isTuner ? 0.14 + mag * 0.38 + peak * 0.48 : 0.22 + mag * 0.6})`;
          c.lineWidth = isTuner ? 2.2 + peak * 2.6 : 1.8;
          c.beginPath();
          c.moveTo(cx + ca * innerR, cy + sa * innerR);
          c.lineTo(cx + ca * (innerR + len), cy + sa * (innerR + len));
          c.stroke();
        }
      }
    }

    frameRef.current = (frameRef.current + 1) % 600;
    if (frameRef.current % 4 === 0) {
      const time = timeDataRef.current;
      const ctx = audioCtxRef.current;
      if (analyser && time && ctx) {
        analyser.getFloatTimeDomainData(time);
        const pitch = detectMonophonicPitch(time, ctx.sampleRate);
        if (modeRef.current === "tuner" && tunerListeningRef.current) {
          const reading = pitch
            ? getPitchReading(
              pitch.frequency,
              tuningRef.current,
              referencePitchRef.current,
              targetStringRef.current,
            )
            : null;
          tunerReadingRef.current = reading;
          updateTunerConfirmation(reading);
          if (mountedRef.current) setTunerReading(reading);
        } else if (pitch && modeRef.current === "key") {
            const midi = Math.round(12 * Math.log2(pitch.frequency / 440) + 69);
            const slot = PC_TO_FIFTHS[((midi % 12) + 12) % 12];
            setLiveIndex((prev) => (prev === slot ? prev : slot));
        }
      }
    }

    if (vizRunningRef.current) rafRef.current = requestAnimationFrame(drawViz);
  }

  function stopViz() {
    vizRunningRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const canvas = canvasRef.current;
    const c = canvas?.getContext("2d");
    if (canvas && c) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height); }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setLiveIndex(-1);
  }

  function playInTuneChime() {
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === "closed") return;

    const playTone = () => {
      if (audioCtxRef.current !== ctx || ctx.state === "closed") return;
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(784, now);
      oscillator.frequency.exponentialRampToValueAtTime(988, now + 0.13);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.09, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.19);
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(playTone).catch(() => {});
    } else {
      playTone();
    }
  }

  async function startTuner() {
    if (tunerStartPendingRef.current || tunerListeningRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({ title: "Microphone unavailable", description: "This browser does not provide microphone access.", variant: "destructive" });
      return;
    }

    const session = ++tunerSessionRef.current;
    tunerStartPendingRef.current = true;
    resetTunerConfirmation();
    setTunerStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || session !== tunerSessionRef.current || modeRef.current !== "tuner") {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      tunerListeningRef.current = true;
      setTunerReading(null);
      lastTunerAnnouncementRef.current = "";
      if (!setupViz(stream)) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        tunerListeningRef.current = false;
        stopViz();
        setTunerAnnouncement("");
        toast({ title: "Tuner could not start", description: "Your browser could not prepare the audio input. Please try again.", variant: "destructive" });
        return;
      }
      setTunerListening(true);
      setTunerAnnouncement("Tuner listening. Play one string at a time.");
    } catch {
      if (mountedRef.current && session === tunerSessionRef.current) {
        setTunerListening(false);
        toast({ title: "Microphone unavailable", description: "Please allow microphone access and try again.", variant: "destructive" });
      }
    } finally {
      if (session === tunerSessionRef.current) {
        tunerStartPendingRef.current = false;
        if (mountedRef.current) setTunerStarting(false);
      }
    }
  }

  function stopTuner() {
    tunerSessionRef.current += 1;
    tunerStartPendingRef.current = false;
    tunerListeningRef.current = false;
    resetTunerConfirmation();
    setTunerListening(false);
    setTunerStarting(false);
    tunerReadingRef.current = null;
    setTunerReading(null);
    setTunerAnnouncement("Tuner stopped.");
    stopViz();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function switchMode(nextMode: ToolMode) {
    if (mode === nextMode) return;
    if (recording || analyzing || tunerListening || tunerStarting || tunerStartPendingRef.current) {
      toast({ title: "Stop listening first", description: "Finish the current audio session before changing tools." });
      return;
    }
    modeRef.current = nextMode;
    setMode(nextMode);
    setResult(null);
    tunerReadingRef.current = null;
    setTunerReading(null);
    setSourceLabel("");
    setLiveIndex(-1);
  }

  function changeTuning(nextId: string) {
    setTuningId(nextId);
    setTargetStringId(null);
    tunerReadingRef.current = null;
    setTunerReading(null);
    resetTunerConfirmation();
  }

  function changeInstrument(nextInstrument: TunerInstrument) {
    const firstTuning = TUNING_PRESETS.find((tuning) => tuning.instrument === nextInstrument);
    if (!firstTuning) return;
    setInstrumentId(nextInstrument);
    setTuningId(firstTuning.id);
    setTargetStringId(null);
    tunerReadingRef.current = null;
    setTunerReading(null);
    resetTunerConfirmation();
  }

  async function analyze(data: ArrayBuffer, label: string) {
    setAnalyzing(true);
    setResult(null);
    setSourceLabel(label);
    try {
      const r = await detectKeyFromBlob(data);
      if (mountedRef.current) setResult(r);
    } catch (err: any) {
      if (mountedRef.current) toast({ title: "Could not detect a key", description: err.message, variant: "destructive" });
    } finally {
      if (mountedRef.current) setAnalyzing(false);
    }
  }

  async function startRecording() {
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setLiveIndex(-1);
      setupViz(stream);
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
      teardownRecording();
      setRecording(false);
      toast({ title: "Microphone unavailable", description: "Please allow microphone access and try again.", variant: "destructive" });
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
    stopViz();
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

  function onDialClick() {
    if (analyzing) return;
    if (recording) stopRecording();
    else startRecording();
  }

  const idle = !recording && !analyzing && !result;
  const activeIndex = result
    ? CIRCLE_OF_FIFTHS.findIndex((s) => s.names.map(normalizeNote).includes(normalizeNote(result.tonic)))
    : -1;

  const tunerCents = tunerReading?.cents ?? 0;
  const tunerNeedleRotation = getTunerNeedleAngle(tunerReading?.cents);
  const tunerIndicatorFraction = tunerNeedleRotation === null ? 0 : tunerNeedleRotation / 90;
  const tunerStatusLabel = tunerStatusLabelFor(tunerReading?.status ?? "no-target");
  const tunerTheme = TUNER_THEMES[instrumentId];
  const currentInstrumentLabel = TUNER_INSTRUMENTS.find((instrument) => instrument.id === instrumentId)?.label ?? "Instrument";
  const tunerRailPosition = 50 + tunerIndicatorFraction * 39;
  const tunerNeedleAngleRadians = ((tunerNeedleRotation ?? 0) - 90) * Math.PI / 180;
  const tunerNeedleInner = {
    x: 50 + Math.cos(tunerNeedleAngleRadians) * 30,
    y: 50 + Math.sin(tunerNeedleAngleRadians) * 30,
  };
  const tunerNeedleTip = {
    x: 50 + Math.cos(tunerNeedleAngleRadians) * 46,
    y: 50 + Math.sin(tunerNeedleAngleRadians) * 46,
  };
  const tunerDirectionLabel = tunerReading?.status === "flat"
    ? "Tune up"
    : tunerReading?.status === "sharp"
      ? "Tune down"
      : tunerConfirmed
        ? "Hold it"
        : "Find the center";

  return (
    <div className="min-h-screen bg-background pb-16 pt-16 sm:pt-20">
      <div className="container mx-auto max-w-2xl px-6">

        {/* Header */}
        <header className="border-t border-foreground pt-6 pb-8 text-center sm:text-left">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">The Tool</div>
          <h1 className="font-display text-[40px] sm:text-6xl font-semibold tracking-tight leading-[0.95] text-foreground">
            {mode === "tuner" ? `Tune your ${currentInstrumentLabel.toLowerCase()}.` : "Tune."}
          </h1>
          <p className="font-display italic text-lg sm:text-xl text-muted-foreground mt-3 max-w-lg mx-auto sm:mx-0">
            {mode === "tuner"
              ? "A clear, steady tuner for strings, built for the way old-time musicians play."
              : "Play a few bars or upload a clip — TuneVault names the key, right in your browser."}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-1 p-1 border border-border bg-card max-w-xl mx-auto" role="tablist" aria-label="Choose an audio tool">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "tuner"}
            onClick={() => switchMode("tuner")}
            data-testid="tool-mode-tuner"
            className={`min-h-16 px-3 text-left transition-colors ${mode === "tuner" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <span className="block text-[10px] uppercase tracking-[0.16em] font-medium mb-1">Tune an instrument</span>
            <span className="block font-serif text-xs leading-snug opacity-80">Tune one fiddle string at a time.</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "key"}
            onClick={() => switchMode("key")}
            data-testid="tool-mode-key"
            className={`min-h-16 px-3 text-left transition-colors ${mode === "key" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <span className="block text-[10px] uppercase tracking-[0.16em] font-medium mb-1">Identify a tune’s key</span>
            <span className="block font-serif text-xs leading-snug opacity-80">Analyze a recording or audio clip.</span>
          </button>
        </div>

        {mode === "key" ? (
        <div className="flex flex-col items-center pt-7 pb-6">
          <div className="relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] select-none">

            {/* Circle of fifths labels */}
            {CIRCLE_OF_FIFTHS.map((s, i) => {
              const hot = (result != null && i === activeIndex) || (recording && i === liveIndex);
              return (
                <span
                  key={s.label}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 font-display tabular-nums transition-all duration-300 ${
                    hot
                      ? "text-primary font-bold scale-[1.6] text-lg sm:text-xl drop-shadow"
                      : result
                        ? "text-muted-foreground/35 text-sm sm:text-base"
                        : "text-muted-foreground/55 text-sm sm:text-base"
                  }`}
                  style={{ left: `${POSITIONS[i].left}%`, top: `${POSITIONS[i].top}%` }}
                  data-testid={`fifth-${s.label}`}
                >
                  {s.label}
                </span>
              );
            })}

            {/* Idle breathing halo */}
            {idle && (
              <>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[66%] h-[66%] rounded-full bg-primary/15 tv-breathe pointer-events-none" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[66%] h-[66%] rounded-full bg-primary/10 tv-breathe pointer-events-none" style={{ animationDelay: "1.7s" }} />
              </>
            )}

            {/* Recording sonar ripples */}
            {recording && [0, 1, 2].map((k) => (
              <span
                key={k}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full border-2 border-primary/40 tv-sonar pointer-events-none"
                style={{ animationDelay: `${k * 0.63}s` }}
              />
            ))}

            {/* Outer ring + countdown / result arc */}
            <svg viewBox="0 0 100 100" className={`absolute inset-[11%] w-[78%] h-[78%] -rotate-90 pointer-events-none ${analyzing ? "tv-spin-slow" : ""}`}>
              <circle cx="50" cy="50" r={RING_R} fill="none" stroke="hsl(var(--foreground) / 0.12)" strokeWidth="1.5" />
              {recording && (
                <circle
                  cx="50" cy="50" r={RING_R} fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (elapsed / MAX_RECORD_SECONDS)}
                  className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
              )}
              {analyzing && (
                <circle
                  cx="50" cy="50" r={RING_R} fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={`${RING_C * 0.25} ${RING_C * 0.75}`}
                />
              )}
              {result && activeIndex >= 0 && (
                <circle cx="50" cy="50" r={RING_R} fill="none" stroke="hsl(var(--primary) / 0.55)" strokeWidth="2" />
              )}
            </svg>

            {/* Live circular EQ (drawn during recording) */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full pointer-events-none"
              aria-hidden="true"
            />

            {/* Tuner needle — points at the note currently being played */}
            {recording && liveIndex >= 0 && (
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full pointer-events-none">
                <g transform={`rotate(${liveIndex * 30} 50 50)`}>
                  <line x1="50" y1="50" x2="50" y2="15" stroke="hsl(var(--primary))" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
                  <circle cx="50" cy="15" r="2.6" fill="hsl(var(--primary))" />
                </g>
              </svg>
            )}

            {/* Center disc — the button */}
            <button
              type="button"
              onClick={onDialClick}
              disabled={analyzing}
              data-testid="button-dial"
              aria-label={recording ? "Stop listening" : result ? "Listen again" : "Tap to listen"}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[58%] h-[58%] rounded-full flex flex-col items-center justify-center text-center gap-1 px-4
                bg-gradient-to-br from-[hsl(25_55%_32%)] to-[hsl(var(--primary))] text-primary-foreground shadow-2xl ring-1 ring-black/10
                transition-transform duration-300 hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:hover:scale-100 disabled:cursor-default"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span className="text-[11px] uppercase tracking-[0.16em] opacity-90 mt-1">Reading the key…</span>
                </>
              ) : recording ? (
                <>
                  <span className="font-display text-5xl sm:text-6xl font-bold tabular-nums leading-none" data-testid="text-countdown">
                    {MAX_RECORD_SECONDS - elapsed}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.16em] opacity-90 mt-1.5">Tap to guess now</span>
                </>
              ) : result ? (
                <>
                  <span key={result.key} className="font-display text-5xl sm:text-6xl font-bold leading-none tv-pop" data-testid="text-detected-key">
                    {result.key}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.16em] opacity-80 mt-2">Tap to try again</span>
                </>
              ) : (
                <>
                  <Mic className="w-8 h-8 sm:w-9 sm:h-9" />
                  <span className="text-[11px] uppercase tracking-[0.16em] opacity-90 mt-1.5">Tap to listen</span>
                </>
              )}
            </button>
          </div>

          {/* Status caption under the dial */}
          <div className="mt-7 text-center min-h-[3.5rem]" role="status" aria-live="polite">
            {result && !analyzing ? (
              <div className="tv-pop" data-testid="result-caption">
                <p className="font-display text-xl text-foreground">
                  {result.tonic} {result.scale}
                  <span className="text-muted-foreground"> · {(result.confidence * 100).toFixed(0)}% confidence</span>
                </p>
                {sourceLabel && <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs mx-auto">from {sourceLabel}</p>}
              </div>
            ) : recording ? (
              <p className="font-serif text-[15px] text-muted-foreground">Listening… play a note, then tap the dial anytime for an instant read.</p>
            ) : analyzing ? (
              <p className="font-serif text-[15px] text-muted-foreground">Working out the key…</p>
            ) : (
              <p className="font-serif text-[15px] text-muted-foreground max-w-sm">
                Tap the dial and play a tune — or a single note to tune up. Tap again anytime for an instant read, or let it run up to {MAX_RECORD_SECONDS} seconds.
              </p>
            )}
          </div>

          {/* Result actions */}
          {result && !analyzing && (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 tv-pop">
              <Link
                href={`/?key=${encodeURIComponent(result.key)}`}
                data-testid="link-browse-key"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Music2 className="w-4 h-4" /> Browse {result.key} tunes <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => setShowSuggest(true)}
                data-testid="button-suggest-key"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Flag className="w-4 h-4" /> Suggest "{result.key}" for a library tune
              </button>
            </div>
          )}

          {/* Upload — always available */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={onFileChange}
            className="hidden"
            data-testid="input-audio-file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={recording || analyzing}
            data-testid="button-choose-file"
            className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <Upload className="w-3.5 h-3.5" /> or upload an audio file
          </button>
        </div>
        ) : (
          <section className="pt-7 pb-6 max-w-xl mx-auto" data-testid="tuner-panel">
            <div className="flex flex-col items-center">
              <div className="self-stretch flex items-center justify-between gap-4 mb-2">
                <div>
                  <div className={`text-[10px] uppercase tracking-[0.2em] font-medium mb-2 ${tunerTheme.status}`}>The tuner</div>
                  <p className="font-display text-xl sm:text-2xl font-semibold tracking-tight">Play one string.</p>
                </div>
                <p className="font-serif text-sm text-muted-foreground text-right">{currentTuning.label}</p>
              </div>

              <div className="relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] select-none">
                <span className="absolute left-[8%] top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.16em] font-medium text-muted-foreground/75" data-testid="tuner-direction-flat">Flat</span>
                <span className="absolute left-1/2 top-[2%] -translate-x-1/2 text-[10px] uppercase tracking-[0.16em] font-medium text-emerald-700" data-testid="tuner-direction-center">In tune</span>
                <span className="absolute right-[7%] top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.16em] font-medium text-muted-foreground/75" data-testid="tuner-direction-sharp">Sharp</span>

                {tunerReading?.status === "in-tune" && (
                  <>
                    <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[66%] h-[66%] rounded-full ${tunerTheme.halo} tv-breathe pointer-events-none`} />
                    <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[66%] h-[66%] rounded-full ${tunerTheme.halo} tv-breathe pointer-events-none`} style={{ animationDelay: "1.7s" }} />
                  </>
                )}

                {tunerListening && [0, 1].map((k) => (
                  <span
                    key={k}
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full border-2 ${tunerTheme.ring} tv-sonar pointer-events-none`}
                    style={{ animationDelay: `${k * 0.8}s` }}
                  />
                ))}

                <svg viewBox="0 0 100 100" className="absolute inset-[11%] w-[78%] h-[78%] pointer-events-none">
                  <circle cx="50" cy="50" r={RING_R} fill="none" stroke="hsl(var(--foreground) / 0.12)" strokeWidth="1.5" />
                  <line x1="50" y1="3" x2="50" y2="11" stroke="hsl(145 55% 42% / 0.8)" strokeWidth="2.2" strokeLinecap="round" />
                  <circle cx="50" cy="7" r="1.8" fill="hsl(145 55% 42%)" />
                  {tunerReading?.status === "in-tune" && (
                    <circle cx="50" cy="50" r={RING_R} fill="none" stroke="hsl(145 55% 42% / 0.8)" strokeWidth="2.5" />
                  )}
                </svg>
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 h-full w-full pointer-events-none"
                  aria-hidden="true"
                  data-testid="tuner-spikes"
                />

                {tunerReading?.cents !== null && tunerReading?.cents !== undefined && (
                  <svg viewBox="0 0 100 100" className="absolute inset-0 z-10 h-full w-full pointer-events-none" data-testid="tuner-needle" aria-label={tunerReading.status === "in-tune" ? "Needle centered: in tune" : `${tunerStatusLabel} by ${Math.round(Math.abs(tunerCents))} cents`}>
                    <line
                      x1={tunerNeedleInner.x}
                      y1={tunerNeedleInner.y}
                      x2={tunerNeedleTip.x}
                      y2={tunerNeedleTip.y}
                      stroke={tunerReading.status === "in-tune" ? "hsl(145 55% 42%)" : tunerTheme.stroke}
                      strokeWidth={tunerReading.status === "in-tune" ? "3.8" : "3.2"}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={tunerNeedleTip.x}
                      cy={tunerNeedleTip.y}
                      r={tunerReading.status === "in-tune" ? "3.8" : "3.3"}
                      fill={tunerReading.status === "in-tune" ? "hsl(145 55% 42%)" : tunerTheme.stroke}
                    />
                  </svg>
                )}

                <button
                  type="button"
                  onClick={tunerListening || tunerStarting ? stopTuner : startTuner}
                  data-testid="button-tuner-listen"
                  aria-label={tunerListening || tunerStarting ? "Stop tuner" : "Start tuner"}
                  className={`absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 w-[58%] h-[58%] rounded-full flex flex-col items-center justify-center text-center gap-1 px-4 text-primary-foreground shadow-2xl ring-1 ring-black/10 transition-transform duration-300 hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:hover:scale-100 disabled:cursor-wait ${tunerConfirmed ? "bg-gradient-to-br from-emerald-700 to-emerald-500" : `bg-gradient-to-br ${tunerTheme.button}`}`}
                >
                  {tunerStarting ? (
                    <>
                      <Loader2 className="w-7 h-7 animate-spin" />
                      <span className="text-[11px] uppercase tracking-[0.16em] opacity-90 mt-1">Tap to cancel</span>
                    </>
                  ) : tunerReading ? (
                    <>
                      <span className="font-display text-6xl sm:text-7xl font-bold tabular-nums leading-none tv-pop" data-testid="tuner-note">{tunerReading.note}</span>
                      <span className="font-display text-lg tabular-nums mt-2" data-testid="tuner-cents">
                        {tunerReading.cents === null ? "—" : `${tunerReading.cents > 0 ? "+" : ""}${Math.round(tunerReading.cents)}¢`}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.13em] opacity-90 mt-1" data-testid="tuner-status">
                          {tunerConfirmed && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {tunerConfirmed ? "Locked in" : tunerStatusLabel}
                      </span>
                    </>
                  ) : tunerListening ? (
                    <>
                      <Mic className="w-8 h-8 sm:w-9 sm:h-9" />
                      <span className="text-[11px] uppercase tracking-[0.16em] opacity-90 mt-1.5">Listening…</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-8 h-8 sm:w-9 sm:h-9" />
                      <span className="text-[11px] uppercase tracking-[0.16em] opacity-90 mt-1.5">Tap to tune</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 w-full max-w-sm" data-testid="tuner-direction-meter">
                <div className="relative h-8">
                  <div className="absolute left-[6%] right-[6%] top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
                  <div className="absolute left-1/2 top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600 shadow-sm" aria-hidden="true" />
                  <span className="absolute left-[6%] top-1/2 h-2 w-px -translate-y-1/2 bg-foreground/25" aria-hidden="true" />
                  <span className="absolute right-[6%] top-1/2 h-2 w-px -translate-y-1/2 bg-foreground/25" aria-hidden="true" />
                  {tunerReading?.cents !== null && tunerReading?.cents !== undefined && (
                    <span
                      className={`absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-md transition-[left,background-color,transform] duration-200 ${tunerConfirmed || tunerReading.status === "in-tune" ? "scale-125 bg-emerald-500" : tunerReading.status === "flat" ? "bg-amber-500" : "bg-rose-500"}`}
                      style={{ left: `${tunerRailPosition}%` }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="flex justify-between px-[4%] text-[9px] uppercase tracking-[0.15em] font-medium text-muted-foreground">
                  <span>Flat · tune up</span>
                  <span className="text-emerald-700">center</span>
                  <span>Sharp · tune down</span>
                </div>
              </div>

              <div className="mt-5 text-center min-h-[3.5rem]">
                {tunerReading ? (
                  <div className="tv-pop">
                    <p className={`font-display text-xl ${tunerConfirmed ? "text-emerald-700" : tunerTheme.status}`}>
                      {tunerConfirmed ? "That’s it." : tunerDirectionLabel}
                      <span className="text-muted-foreground"> · {tunerReading.cents !== null ? `${Math.abs(Math.round(tunerReading.cents))}¢ ${tunerReading.cents < 0 ? "flat" : tunerReading.cents > 0 ? "sharp" : "centered"}` : "no target"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Target: {tunerReading.target?.label ?? "nearest string"}</p>
                  </div>
                ) : tunerListening ? (
                  <p className="font-serif text-[15px] text-muted-foreground">Listening… play one string at a time and bring the needle to center.</p>
                ) : (
                  <p className="font-serif text-[15px] text-muted-foreground max-w-sm">Tap the dial, choose a string if you like, and bring the needle to the green center.</p>
                )}
              </div>
              {tunerListening && (
                <button
                  type="button"
                  onClick={stopTuner}
                  data-testid="button-tuner-stop"
                  className="mt-3 inline-flex items-center gap-2 border border-border px-4 py-2 text-[10px] uppercase tracking-[0.16em] font-medium text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                >
                  Stop tuning
                </button>
              )}
              <p className="sr-only" role="status" aria-live="polite">{tunerAnnouncement}</p>
            </div>

            <div className="mt-2 border-t border-border pt-6">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TUNER_INSTRUMENTS.map((instrument) => (
                  <button
                    type="button"
                    key={instrument.id}
                    onClick={() => changeInstrument(instrument.id)}
                    data-testid={`tuner-instrument-${instrument.id}`}
                    aria-pressed={instrumentId === instrument.id}
                    className={`border px-3 py-2 text-[10px] uppercase tracking-[0.16em] font-medium transition-colors ${instrumentId === instrument.id ? `${tunerTheme.status} border-current bg-card` : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}
                  >
                    {instrument.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mt-5">
                <div>
                  <div className={`text-[10px] uppercase tracking-[0.18em] font-medium ${tunerTheme.status}`}>{currentInstrumentLabel} tuning</div>
                  <p className="font-display text-xl font-semibold text-foreground mt-1" data-testid="tuner-preset-label">{currentTuning.label}</p>
                  <p className="font-serif text-sm text-muted-foreground mt-1">{currentTuning.description}</p>
                </div>
                <select
                  value={currentTuning.id}
                  onChange={(event) => changeTuning(event.target.value)}
                  data-testid="tuner-preset-select"
                  className="w-full sm:w-auto border border-border bg-background px-3 py-2 text-sm text-foreground"
                  aria-label={`Choose ${currentInstrumentLabel.toLowerCase()} tuning`}
                >
                  {instrumentTunings.map((tuning) => <option key={tuning.id} value={tuning.id}>{tuning.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-5" aria-label={`Choose a ${currentInstrumentLabel.toLowerCase()} string to tune`}>
                {currentTuning.strings.map((string) => {
                  const selected = targetStringId === string.id;
                  const matched = tunerReading?.target?.id === string.id;
                  return (
                    <button
                      type="button"
                      key={string.id}
                      onClick={() => {
                        setTargetStringId(selected ? null : string.id);
                        setTunerReading(null);
                        resetTunerConfirmation();
                      }}
                      data-testid={`tuner-string-${string.id}`}
                      className={`min-h-20 border px-2 py-3 text-center transition-colors ${selected ? `${tunerTheme.status} border-current bg-card` : matched ? "border-emerald-600 bg-emerald-50 text-emerald-950" : "border-border bg-card text-foreground hover:border-foreground"}`}
                      aria-pressed={selected}
                    >
                      <span className="block font-display text-2xl font-semibold">{string.label}</span>
                      <span className="block mt-1 text-[9px] uppercase tracking-[0.12em] opacity-65">{string.id.replace("-", " ")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowTunerSettings((shown) => !shown)}
                data-testid="button-tuner-settings"
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-medium text-muted-foreground hover:text-foreground"
                aria-expanded={showTunerSettings}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Tuning settings
              </button>
              {showTunerSettings && (
                <div className="mt-3 border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-base font-semibold">Reference pitch</p>
                      <p className="font-serif text-xs text-muted-foreground mt-0.5">Most old-time sessions use A = 440 Hz.</p>
                    </div>
                    <select
                      value={referencePitch}
                      onChange={(event) => setReferencePitch(Number(event.target.value))}
                      data-testid="tuner-reference-pitch"
                      className="border border-border bg-background px-3 py-2 text-sm text-foreground"
                      aria-label="Reference pitch"
                    >
                      <option value={432}>A = 432</option>
                      <option value={440}>A = 440</option>
                      <option value={442}>A = 442</option>
                    </select>
                  </div>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-border pt-4">
                    <input
                      type="checkbox"
                      checked={inTuneSoundEnabled}
                      onChange={(event) => setInTuneSoundEnabled(event.target.checked)}
                      data-testid="tuner-in-tune-sound"
                      className="mt-0.5 h-4 w-4 accent-emerald-600"
                    />
                    <span>
                      <span className="block font-display text-base font-semibold">In-tune sound</span>
                      <span className="block font-serif text-xs text-muted-foreground mt-0.5">Play one short tone when a string settles in tune. Off by default.</span>
                    </span>
                  </label>
                </div>
              )}
            </div>
          </section>
        )}

        {/* How it works + uses */}
        <section className="border-t border-border pt-7 mt-4 max-w-xl mx-auto">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">How it works</div>
          <p className="font-serif text-[15px] text-muted-foreground leading-relaxed">
            {mode === "tuner"
              ? `The tuner listens for one sustained string at a time and compares it with the selected ${currentInstrumentLabel.toLowerCase()} tuning. It works right in your browser — your microphone audio never leaves your device.`
              : "Tune listens to a few seconds of sound and works out the musical key — the home note and whether it's major or minor — using a pitch-analysis engine that runs entirely inside your browser. Nothing is uploaded; your audio never leaves your device."}
          </p>

          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mt-8 mb-4">
            {mode === "tuner" ? "A good reading" : "Great for"}
          </div>
          <ul className="space-y-3.5">
            {(mode === "tuner"
              ? [
                  { icon: Mic, text: "Play one open string at a time — a clean, sustained bow stroke gives the steadiest reading." },
                  { icon: Guitar, text: "Pick a tuning and, if you like, tap the string you are working on to make its target explicit." },
                  { icon: CheckCircle2, text: "Aim for the green in-tune state, then use your ears to make the final call with your instrument." },
                ]
              : USES).map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3" data-testid={`use-${text.split(" ")[0].toLowerCase()}`}>
                <span className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="font-serif text-[15px] text-foreground leading-relaxed pt-0.5">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Disclaimer */}
        <div className="border-t border-border pt-5 mt-8 flex gap-2.5 max-w-xl mx-auto">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
          <p className="font-serif text-[13px] text-muted-foreground leading-relaxed">
            {mode === "tuner"
              ? "This is a monophonic tuner: play one string at a time, away from other instruments, for the clearest result. It is a practical guide, but your ears still have the final word."
              : <>Key detection is an estimate. Old-time fiddle uses lots of open-string drones, which can fool the analysis into the dominant (a fifth away) or the relative major/minor. Trust your ears — and if you spot a tune in our library with the wrong key, please <Link href="/about" className="text-primary hover:underline">suggest a correction</Link>.</>}
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
