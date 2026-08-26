export type LatestUpdate = {
  id: string;
  category: string;
  title: string;
  summary: string;
  dateLabel: string;
  href: string;
  linkLabel: string;
};

export const LATEST_UPDATES: LatestUpdate[] = [
  {
    id: "uncle-joe-edition",
    category: "Audio",
    title: "A new edition to play",
    summary: "Uncle Joe now has a verified Lake Williamson performance from Jim Renner’s Oklahoma Fiddle Archive.",
    dateLabel: "Aug 26, 2026",
    href: "/tune/1058",
    linkLabel: "Hear Uncle Joe",
  },
  {
    id: "playable-editions",
    category: "Audio",
    title: "More playable editions are landing",
    summary: "Dubuque, Jack of Diamonds, and Jeff Sturgeon now each have named Slippery Hill performances.",
    dateLabel: "Aug 25, 2026",
    href: "/tune/1053",
    linkLabel: "Explore Dubuque",
  },
  {
    id: "audio-first",
    category: "Library",
    title: "Audio stays at the heart of TuneVault",
    summary: "High-demand tunes are being sourced first, while uncertain matches stay queued instead of being guessed.",
    dateLabel: "Recently",
    href: "/about",
    linkLabel: "About the library",
  },
  {
    id: "find-your-key",
    category: "Tools",
    title: "Find your way into a tune",
    summary: "Use the key finder to hear target notes and make the first step toward a clean, confident setup.",
    dateLabel: "Recently",
    href: "/identify-key",
    linkLabel: "Try the key finder",
  },
];