import { Switch, Route, useLocation } from "wouter";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import TuneCopyEditor from "@/pages/TuneCopyEditor";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlaylistProvider } from "@/context/PlaylistContext";
import { useEffect, useRef } from "react";
import { initGA } from "@/lib/analytics";
import { useAnalytics } from "@/hooks/use-analytics";
import HomePage from "@/pages/HomePage";
import TuneDetailPage from "@/pages/TuneDetailPage";
import AboutPage from "@/pages/AboutPage";
import TuneOfTheDayPage from "@/pages/TuneOfTheDayPage";
import BookALessonPage from "@/pages/BookALessonPage";
import AdminPage from "@/pages/AdminPage";
import SubmitRecordingPage from "@/pages/SubmitRecordingPage";
import BlogPage from "@/pages/BlogPage";
import BlogPostPage from "@/pages/BlogPostPage";
import GearPage from "@/pages/GearPage";
import IdentifyKeyPage from "@/pages/IdentifyKeyPage";
import NotFound from "@/pages/not-found";
import MiniPlayer from "@/components/MiniPlayer";
import NavBar from "@/components/NavBar";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}
if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

function OwnerArea({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { data, isLoading, isError } = useQuery<{ owner: boolean }>({
    queryKey: ["/api/admin/me"],
    enabled: isLoaded && isSignedIn,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  if (!isLoaded || (isSignedIn && isLoading)) return <div className="container mx-auto px-4 py-16">Checking access…</div>;
  if (!isSignedIn) return <div className="container mx-auto px-4 py-16 space-y-4"><h1 className="text-2xl font-serif">Owner sign-in required</h1><a className="text-primary underline" href="/sign-in">Sign in to manage TuneVault</a></div>;
  if (isError || !data?.owner) return <div className="container mx-auto px-4 py-16 space-y-4"><h1 className="text-2xl font-serif">Owner access required</h1><p>This account cannot manage the catalog.</p><button className="text-primary underline" onClick={() => signOut({ redirectUrl: "/" })}>Sign out</button></div>;
  return <><div className="container mx-auto px-4 pt-4 text-right"><button className="text-sm text-primary underline" onClick={() => signOut({ redirectUrl: "/" })}>Sign out of admin</button></div>{children}</>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const id = user?.id ?? null;
    if (previous.current !== undefined && previous.current !== id) queryClient.clear();
    previous.current = id;
  }), [addListener]);
  return null;
}

function SignInPage() {
  return <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-12"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/admin`} /></div>;
}
function SignUpPage() {
  return <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-12"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/admin`} /></div>;
}

function Router() {
  useAnalytics();
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/tune/:id" component={TuneDetailPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/tune-of-the-day" component={TuneOfTheDayPage} />
      <Route path="/book-a-lesson" component={BookALessonPage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/admin/tune-copy">{() => <OwnerArea><TuneCopyEditor /></OwnerArea>}</Route>
      <Route path="/admin">{() => <OwnerArea><AdminPage /></OwnerArea>}</Route>
      <Route path="/submit-recording" component={SubmitRecordingPage} />
      {/* Blog hidden until posts are rewritten
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogPostPage} />
      */}
      <Route path="/gear" component={GearPage} />
      <Route path="/identify-key" component={IdentifyKeyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    initGA();
  }, []);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
      appearance={{
        theme: shadcn,
        options: {
          logoPlacement: "inside",
          logoLinkUrl: basePath || "/",
          logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
        },
        variables: {
          colorPrimary: "#9b5a21", colorForeground: "#29231e",
          colorMutedForeground: "#63574b", colorDanger: "#b42318",
          colorBackground: "#fffaf3", colorInput: "#ffffff",
          colorInputForeground: "#29231e", colorNeutral: "#766a5f",
          fontFamily: "Georgia, serif", borderRadius: "0.75rem",
        },
        elements: {
          cardBox: { width: "440px", maxWidth: "100%", background: "#fffaf3", border: "1px solid #ded2c3", borderRadius: "16px" },
          card: { boxShadow: "none", background: "transparent" },
          footer: { background: "transparent" },
        },
      }}
      localization={{ signIn: { start: { title: "TuneVault sign in", subtitle: "Sign in to manage your catalog" } }, signUp: { start: { title: "Create your TuneVault account", subtitle: "Manage your catalog securely" } } }}
    >
    <QueryClientProvider client={queryClient}>
      <ClerkQueryClientCacheInvalidator />
      <TooltipProvider>
        <PlaylistProvider>
          <Toaster />
          <NavBar />
          <Router />
          <MiniPlayer />
        </PlaylistProvider>
      </TooltipProvider>
    </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
