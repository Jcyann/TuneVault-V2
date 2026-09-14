import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { GraduationCap, ChevronRight, CheckCircle2, Loader2, Music2, School, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageMeta } from "@/hooks/usePageMeta";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import instructorPortrait from "@assets/0_IMG_6259_1787327184148.jpeg";

interface FormData {
  name: string;
  email: string;
  instrument: string;
  experienceLevel: string;
  yearsPlaying: string;
  currentGoals: string;
  specificTunes: string;
  availability: string;
  timezone: string;
  additionalNotes: string;
}

const EMPTY: FormData = {
  name: "",
  email: "",
  instrument: "",
  experienceLevel: "",
  yearsPlaying: "",
  currentGoals: "",
  specificTunes: "",
  availability: "",
  timezone: "",
  additionalNotes: "",
};

export default function BookALessonPage() {
  usePageMeta(
    "Book a Lesson",
    "Tune-based online lessons from $40 for 30 minutes, focused on beginner and intermediate Old-Time fiddle, intermediate-to-advanced clawhammer banjo, rhythm guitar, and upright bass."
  );

  const [form, setForm] = useState<FormData>(() => ({
    ...EMPTY,
    specificTunes: new URLSearchParams(window.location.search).get("tune") || "",
  }));
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [optionalOpen, setOptionalOpen] = useState(Boolean(new URLSearchParams(window.location.search).get("tune")));
  const formStarted = useRef(false);
  const params = new URLSearchParams(window.location.search);
  const selectedTune = params.get("tune") || "";
  const arrivalSource = params.get("source") || (selectedTune ? "tune" : "direct");

  useEffect(() => {
    const safeSources = ["homepage", "tune", "navigation", "page_footer"];
    trackEvent("lesson_page_arrival", "lessons", safeSources.includes(arrivalSource) ? arrivalSource : "direct");
  }, [arrivalSource]);

  const set = (field: keyof FormData) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const setInput =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(field)(e.target.value);

  const markFormStarted = () => {
    if (!formStarted.current) {
      formStarted.current = true;
      trackEvent("lesson_form_start", "lessons", "book_a_lesson");
    }
  };

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = "Valid email is required";
    if (!form.instrument) e.instrument = "Please select an instrument";
    if (!form.experienceLevel) e.experienceLevel = "Please select your level";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError("");
    try {
      await apiRequest("POST", "/api/lesson-inquiry", form);
      trackEvent("lesson_inquiry_submitted", "lessons", "book_a_lesson");
      setSubmitted(true);
    } catch {
      setServerError("Something went wrong. Please try again or email directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 pt-16 sm:pt-20">
      <div className="container mx-auto max-w-6xl px-6">
        <header className="border-t border-foreground pb-10 pt-6">
          <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Private online instruction with Jason Chinchen</div>
          <h1 className="font-display text-[44px] sm:text-6xl font-semibold tracking-tight leading-[0.95] text-foreground">
            Learn the tune.<br />Understand the music.
          </h1>
          <p className="mt-5 max-w-2xl font-serif text-lg leading-relaxed text-muted-foreground">
            One-on-one lessons built around real old-time repertoire—its rhythm, technique, source recordings, and history. Bring a tune you love or let Jason help you choose one.
          </p>
        </header>
        <div className="grid border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-border">
          {[
            { icon: Music2, title: "Decades in the music", text: "A lifelong traditional musician with decades of playing and performing experience." },
            { icon: School, title: "An active educator", text: "Jason teaches lutherie and engineering at Sisters High School in Oregon." },
            { icon: Video, title: "Focused online lessons", text: "Practical, one-on-one instruction shaped around your instrument, level, and tunes." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 border-b border-border py-5 last:border-b-0 sm:border-b-0 sm:px-5 first:sm:pl-0 last:sm:pr-0">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-6 pb-10">
        <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <main className="min-w-0 space-y-12">
            <section className="border border-foreground bg-card p-6 sm:p-8" aria-labelledby="first-tune-heading">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">A simple place to start</p>
              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h2 id="first-tune-heading" className="font-display text-4xl font-semibold tracking-tight text-foreground">
                  Your First Tune
                </h2>
                <p className="font-display text-2xl font-semibold text-primary">$40 <span className="text-base font-normal text-muted-foreground">· 30 minutes</span></p>
              </div>
              <div className="mt-5 space-y-2 font-serif text-[16px] leading-relaxed text-muted-foreground">
                <p>Pick a tune from TuneVault—or tell me what you’ve been trying to learn.</p>
                <p>We’ll spend the lesson getting you moving on it.</p>
                <p className="font-sans text-sm font-medium text-foreground">No subscription. No commitment. No payment until we confirm the lesson.</p>
              </div>
              <a
                href="#inquiry-form"
                onClick={() => trackEvent("lesson_cta_click", "lessons", "first_tune_offer")}
                className="mt-6 inline-flex items-center bg-primary px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-transform hover:-translate-y-0.5"
                data-testid="link-first-tune-inquiry"
              >
                Ask About Your First Lesson <ChevronRight className="ml-2 h-4 w-4" />
              </a>
            </section>

            <section aria-labelledby="ongoing-heading">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Flexible session lengths</p>
              <h2 id="ongoing-heading" className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
                Want ongoing instruction?
              </h2>
              <dl className="mt-5 grid grid-cols-3 divide-x divide-border border-y border-border">
                {[
                  ["30 min", "$40"],
                  ["45 min", "$55"],
                  ["60 min", "$70"],
                ].map(([length, price]) => (
                  <div key={length} className="px-3 py-5 text-center first:pl-0 last:pr-0">
                    <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{length}</dt>
                    <dd className="mt-1 font-display text-2xl font-semibold text-foreground">{price}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Focus: beginner-to-intermediate fiddle, intermediate-to-advanced clawhammer banjo, rhythm guitar, and upright bass.
              </p>
            </section>

            {/* ── Questionnaire ── */}
            <div id="inquiry-form">
              <h2 className="text-xl font-serif font-bold text-foreground mb-1">
                Tell Jason what you’d like to learn
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                A tune title, a technique question, or simply “I’m not sure where to start” is enough. Begin with four essentials; everything else is optional.
              </p>
              {selectedTune && (
                <p className="mb-5 border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm text-foreground" data-testid="lesson-selected-tune">
                  You’re asking about <strong>{selectedTune}</strong>. It is already included below.
                </p>
              )}

              {submitted ? (
                <div
                  className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-8 text-center space-y-3"
                  data-testid="inquiry-success"
                >
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                  <h3 className="text-lg font-serif font-bold text-green-900 dark:text-green-300">
                    We got it!
                  </h3>
                  <p className="text-green-800 dark:text-green-400 text-sm max-w-sm mx-auto">
                    Thanks, {form.name.split(" ")[0]}. We'll review your answers
                    and reach out to {form.email} within a day or two to set up
                    your first session.
                  </p>
                  <Link href="/" data-testid="link-explore-after-inquiry">
                    <Button
                      variant="outline"
                      className="mt-2 border-green-300 text-green-700 hover:bg-green-50"
                    >
                      Explore TuneVault while you wait{" "}
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8"
                  onFocus={markFormStarted}
                  data-testid="lesson-inquiry-form"
                >
                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="inq-name">Your Name *</Label>
                      <Input
                        id="inq-name"
                        data-testid="input-inquiry-name"
                        placeholder="Jane Smith"
                        value={form.name}
                        onChange={setInput("name")}
                      />
                      {errors.name && (
                        <p className="text-xs text-destructive">{errors.name}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="inq-email">Email Address *</Label>
                      <Input
                        id="inq-email"
                        type="email"
                        data-testid="input-inquiry-email"
                        placeholder="jane@example.com"
                        value={form.email}
                        onChange={setInput("email")}
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Instrument + Experience Level */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Instrument *</Label>
                      <Select
                        value={form.instrument}
                        onValueChange={set("instrument")}
                      >
                        <SelectTrigger data-testid="select-inquiry-instrument">
                          <SelectValue placeholder="Select an instrument" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Old-Time Fiddle">
                            Old-Time Fiddle
                          </SelectItem>
                          <SelectItem value="Clawhammer Banjo">
                            Clawhammer Banjo
                          </SelectItem>
                          <SelectItem value="Old-Time Guitar">
                            Old-Time Guitar
                          </SelectItem>
                          <SelectItem value="Upright Bass">Upright Bass</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.instrument && (
                        <p className="text-xs text-destructive">
                          {errors.instrument}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Current Level *</Label>
                      <Select
                        value={form.experienceLevel}
                        onValueChange={set("experienceLevel")}
                      >
                        <SelectTrigger data-testid="select-inquiry-level">
                          <SelectValue placeholder="Select your level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Complete beginner">
                            Complete beginner — never played this instrument
                          </SelectItem>
                          <SelectItem value="Early learner">
                            Early learner — some basics, working on fundamentals
                          </SelectItem>
                          <SelectItem value="Intermediate">
                            Intermediate — comfortable with tunes, want to improve
                          </SelectItem>
                          <SelectItem value="Advanced">
                            Advanced — session-ready, working on subtlety and style
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.experienceLevel && (
                        <p className="text-xs text-destructive">
                          {errors.experienceLevel}
                        </p>
                      )}
                    </div>
                  </div>

                  <details
                    className="group border-t border-border pt-5"
                    open={optionalOpen}
                    onToggle={(event) => setOptionalOpen(event.currentTarget.open)}
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold text-foreground marker:hidden">
                      <span className="inline-flex items-center">
                        <span className="mr-2 text-primary group-open:rotate-90 transition-transform">›</span>
                        Add context for Jason <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                      </span>
                    </summary>
                    <div className="mt-5 space-y-6">
                      {/* Years playing */}
                      <div className="space-y-1.5">
                    <Label htmlFor="inq-years">
                      How long have you been playing this instrument? <span className="text-muted-foreground/70">(optional)</span>
                    </Label>
                    <Input
                      id="inq-years"
                      data-testid="input-inquiry-years"
                      placeholder="e.g. 6 months, 3 years, just starting"
                      value={form.yearsPlaying}
                      onChange={setInput("yearsPlaying")}
                    />
                      </div>

                  {/* Goals */}
                  <div className="space-y-1.5">
                    <Label htmlFor="inq-goals">
                      What do you most want to work on? (optional)
                    </Label>
                    <Textarea
                      id="inq-goals"
                      data-testid="textarea-inquiry-goals"
                      placeholder="Describe your goals — technique issues, specific skills, where you feel stuck, what kind of player you want to be..."
                      value={form.currentGoals}
                      onChange={setInput("currentGoals")}
                      rows={3}
                    />
                    {errors.currentGoals && (
                      <p className="text-xs text-destructive">
                        {errors.currentGoals}
                      </p>
                    )}
                  </div>

                  {/* Specific tunes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="inq-tunes">
                      Any specific tunes or styles you're drawn to? <span className="text-muted-foreground/70">(optional)</span>
                    </Label>
                    <Textarea
                      id="inq-tunes"
                      data-testid="textarea-inquiry-tunes"
                      placeholder="Tune names, regions (Appalachian, Texas, Ozark…), fiddle styles, bands or recordings you love — anything that gives a sense of what excites you about the music"
                      value={form.specificTunes}
                      onChange={setInput("specificTunes")}
                      rows={3}
                    />
                  </div>

                  {/* Availability + Timezone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>General Availability <span className="text-muted-foreground/70">(optional)</span></Label>
                      <Select
                        value={form.availability}
                        onValueChange={set("availability")}
                      >
                        <SelectTrigger data-testid="select-inquiry-availability">
                          <SelectValue placeholder="When are you free?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Weekday mornings">
                            Weekday mornings
                          </SelectItem>
                          <SelectItem value="Weekday afternoons">
                            Weekday afternoons
                          </SelectItem>
                          <SelectItem value="Weekday evenings">
                            Weekday evenings
                          </SelectItem>
                          <SelectItem value="Weekends">Weekends</SelectItem>
                          <SelectItem value="Flexible">
                            Flexible — most times work
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="inq-tz">Your Time Zone <span className="text-muted-foreground/70">(optional)</span></Label>
                      <Input
                        id="inq-tz"
                        data-testid="input-inquiry-timezone"
                        placeholder="e.g. Eastern, Pacific, GMT+2"
                        value={form.timezone}
                        onChange={setInput("timezone")}
                      />
                    </div>
                  </div>

                  {/* Anything else */}
                  <div className="space-y-1.5">
                    <Label htmlFor="inq-notes">Anything else you'd like us to know? <span className="text-muted-foreground/70">(optional)</span></Label>
                    <Textarea
                      id="inq-notes"
                      data-testid="textarea-inquiry-notes"
                      placeholder="Other instruments you play, music background, physical considerations, how you heard about TuneVault..."
                      value={form.additionalNotes}
                      onChange={setInput("additionalNotes")}
                      rows={3}
                    />
                  </div>
                    </div>
                  </details>

                  {serverError && (
                    <p className="text-sm text-destructive" data-testid="inquiry-error">
                      {serverError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                    data-testid="button-submit-inquiry"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Ask About a Lesson
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    No payment or commitment now. Jason will reply within a day or two to talk through fit, details, and scheduling.
                  </p>
                </form>
              )}
            </div>

            {/* Secondary CTA */}
            {!submitted && (
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-3">
                  Explore the tune library to find what you'd like to learn:
                </p>
                <Link href="/" data-testid="link-explore-from-booking">
                  <Button
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    Explore TuneVault{" "}
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </main>

          <aside
            aria-labelledby="instructor-heading"
            className="order-first lg:order-last lg:sticky lg:top-24"
            data-testid="section-instructor-bio"
          >
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <img
                src={instructorPortrait}
                alt="Jason Chinchen singing and playing upright bass"
                className="mx-auto aspect-square w-full max-w-52 rounded-xl object-cover shadow-sm"
              />
              <div className="mt-5">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  About your instructor
                </p>
                <h2
                  id="instructor-heading"
                  className="font-display text-3xl font-semibold tracking-tight text-foreground"
                >
                  Jason Chinchen
                </h2>
                <div className="mt-3 space-y-3 font-serif text-[15px] leading-relaxed text-muted-foreground">
                  <p>
                    Jason Chinchen is a lifelong traditional musician with decades
                    of playing and performing experience. He also teaches lutherie
                    and engineering at Sisters High School in Oregon.
                  </p>
                  <p>
                    Jason focuses on intermediate-to-advanced clawhammer banjo,
                    beginner-to-intermediate fiddle, rhythm guitar, and upright bass. He specializes
                    in groove, feel, and melodic, supportive playing.
                  </p>
                  <p>
                    TuneVault is the working library behind his lessons: recordings,
                    notation, history, and playing notes gathered so students can
                    hear where a tune came from as they learn how to play it.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

      </div>
    </div>
  );
}
