import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlaylistProvider } from "@/context/PlaylistContext";
import HomePage from "@/pages/HomePage";
import TuneDetailPage from "@/pages/TuneDetailPage";
import AboutPage from "@/pages/AboutPage";
import TuneOfTheDayPage from "@/pages/TuneOfTheDayPage";
import BookALessonPage from "@/pages/BookALessonPage";
import NotFound from "@/pages/not-found";
import MiniPlayer from "@/components/MiniPlayer";
import NavBar from "@/components/NavBar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/tune/:id" component={TuneDetailPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/tune-of-the-day" component={TuneOfTheDayPage} />
      <Route path="/book-a-lesson" component={BookALessonPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
