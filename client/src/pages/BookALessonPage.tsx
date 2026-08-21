import { useState } from "react";
import { Link } from "wouter";
import { GraduationCap, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
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
import TipJar from "@/components/TipJar";
import { usePageMeta } from "@/hooks/usePageMeta";
import { apiRequest } from "@/lib/queryClient";
import instructorPortrait from "@assets/0_IMG_6259_1787327184148.jpeg";

const INSTRUMENTS = [
  {
    name: "Old-Time Fiddle",
    desc: "The heart of the tradition. Learn bow technique, left-hand position, tone production, and repertoire from the full Old-Time canon. Beginners welcome.",
  },
  {
    name: "Clawhammer Banjo",
    desc: "The driving pulse of Old-Time music. Learn the bum-ditty stroke, drop-thumb technique, and how to lock in with the fiddle at a session.",
  },
  {
    name: "Old-Time Guitar",
    desc: "The rhythmic backbone. Learn boom-chick rhythm, bass runs, and how to comp sensitively behind a melody without overpowering the groove.",
  },
  {
    name: "Upright Bass",
    desc: "The rhythmic foundation of Old-Time music. Learn to hold a steady, even pulse — two beats per bar, roots and fifths — and support the group without drawing attention to yourself. The goal is invisibility through reliability.",
  },
];

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
    "Online lessons in Old-Time fiddle, clawhammer banjo, Old-Time guitar, and upright bass. All levels welcome. Tune-based learning with deep historical context."
  );

  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const set = (field: keyof FormData) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const setInput =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(field)(e.target.value);

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = "Valid email is required";
    if (!form.instrument) e.instrument = "Please select an instrument";
    if (!form.experienceLevel) e.experienceLevel = "Please select your level";
    if (!form.currentGoals.trim())
      e.currentGoals = "Please describe what you'd like to work on";
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
      setSubmitted(true);
    } catch {
      setServerError("Something went wrong. Please try again or email directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 pt-16 sm:pt-20">
      <div className="container mx-auto max-w-3xl px-6">
        <header className="border-t border-foreground pt-6 pb-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Private Instruction</div>
          <h1 className="font-display text-[44px] sm:text-6xl font-semibold tracking-tight leading-[0.95] text-foreground">
            Book a lesson
          </h1>
          <p className="font-display italic text-xl text-muted-foreground mt-3">
            Fiddle · Clawhammer Banjo · Guitar · Upright Bass.
          </p>
        </header>
      </div>

      <div className="container mx-auto max-w-3xl px-6 pb-10 space-y-12">
        {/* Intro */}
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Old-Time music is one of the most rewarding traditions you can dive
            into — the repertoire is deep, the community is welcoming, and the
            music lives at the intersection of history, feel, and technique.
            Lessons draw directly from the TuneVault repertoire so every tune
            comes with context, recordings, and a real reason to play it.
          </p>
          <p>
            Whether you're picking up an instrument for the first time or
            looking to get your tunes session-ready, lessons are available
            online at all skill levels.
          </p>
        </div>

        {/* Instructor */}
        <section
          aria-labelledby="instructor-heading"
          className="grid grid-cols-1 gap-6 border-y border-border py-8 sm:grid-cols-[9.5rem_1fr] sm:items-start sm:gap-8"
          data-testid="section-instructor-bio"
        >
          <img
            src={instructorPortrait}
            alt="Jason Chinchen singing and playing upright bass"
            className="h-36 w-36 justify-self-center rounded-2xl object-cover shadow-sm sm:justify-self-start"
          />
          <div>
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
                Jason Chinchen is a lifelong learner and musician with a
                background steeped in traditional music and decades of playing
                and performing. He teaches lutherie and engineering at Sisters
                High School in Oregon and offers online music lessons.
              </p>
              <p>
                Jason focuses on intermediate-to-advanced clawhammer banjo,
                beginner fiddle, rhythm guitar, and upright bass. He
                specializes in groove and feel, as well as melodic, supportive
                playing. Using tunes from the TuneVault catalog—or suggestions
                from students—he crafts a lesson plan to help each player take
                their playing to the next level.
              </p>
            </div>
          </div>
        </section>

        {/* Instruments */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">The Instruments</div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-6">What we teach</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7 border-t border-border pt-7">
            {INSTRUMENTS.map(({ name, desc }) => (
              <div key={name} className="flex flex-col gap-2">
                <p className="font-display text-xl font-semibold text-foreground tracking-tight">{name}</p>
                <p className="font-serif text-[15px] text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What to expect */}
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground mb-3">
            What to Expect
          </h2>
          <ul className="space-y-2 text-muted-foreground text-sm">
            {[
              "Tune-based learning — you leave every lesson with something you can play at a session",
              "Historical context for every tune — the who, where, and why",
              "Technique tailored to your instrument and level",
              "Video call lessons — no travel, no scheduling headaches",
              "All levels welcome, including complete beginners",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Questionnaire ── */}
        <div id="inquiry-form">
          <h2 className="text-xl font-serif font-bold text-foreground mb-1">
            Get Started
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Fill out the form below and we'll be in touch to schedule your
            first lesson. The more detail you share, the better we can tailor
            the experience.
          </p>

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

              {/* Years playing */}
              <div className="space-y-1.5">
                <Label htmlFor="inq-years">
                  How long have you been playing this instrument?
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
                  What do you most want to work on? *
                </Label>
                <Textarea
                  id="inq-goals"
                  data-testid="textarea-inquiry-goals"
                  placeholder="Describe your goals — technique issues, specific skills, where you feel stuck, what kind of player you want to be..."
                  value={form.currentGoals}
                  onChange={setInput("currentGoals")}
                  rows={4}
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
                  Any specific tunes or styles you're drawn to?
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
                  <Label>General Availability</Label>
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
                  <Label htmlFor="inq-tz">Your Time Zone</Label>
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
                <Label htmlFor="inq-notes">Anything else you'd like us to know?</Label>
                <Textarea
                  id="inq-notes"
                  data-testid="textarea-inquiry-notes"
                  placeholder="Other instruments you play, music background, physical considerations, how you heard about TuneVault..."
                  value={form.additionalNotes}
                  onChange={setInput("additionalNotes")}
                  rows={3}
                />
              </div>

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
                    Send My Inquiry
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                No payment now — we'll confirm details and schedule together.
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

        <TipJar />
      </div>
    </div>
  );
}
