import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlaylistProvider } from "@/context/PlaylistContext";
import { useEffect } from "react";
import { initGA } from "@/lib/analytics";
import { useAnalytics } from "@/hooks/use-analytics";
import HomePage from "@/pages/HomePage";
import TuneDetailPage from "@/pages/TuneDetailPage";
import AboutPage from "@/pages/AboutPage";
import TuneOfTheDayPage from "@/pages/TuneOfTheDayPage";
import BookALessonPage from "@/pages/BookALessonPage";
import AdminPage from "@/pages/AdminPage";
import SubmitRecordingPage from "@/pages/SubmitRecordingPage";
import NotFound from "@/pages/not-found";
import MiniPlayer from "@/components/MiniPlayer";
import NavBar from "@/components/NavBar";

function Router() {
  useAnalytics();
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/tune/:id" component={TuneDetailPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/tune-of-the-day" component={TuneOfTheDayPage} />
      <Route path="/book-a-lesson" component={BookALessonPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/submit-recording" component={SubmitRecordingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    initGA();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PlaylistProvider>
          <Toaster />
          <NavBar />
          <Router />
          <MiniPlayer />
        </PlaylistProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
