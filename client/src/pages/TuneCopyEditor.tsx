import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Tune } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";

type SearchResult = { tunes: Tune[]; total: number };

export default function TuneCopyEditor() {
  usePageMeta("Edit tune copy — TuneVault", "Owner-only tune copy editor");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const { data: results, isLoading: searching } = useQuery<SearchResult>({
    queryKey: [`/api/tunes?search=${encodeURIComponent(debounced)}&limit=30`],
    enabled: debounced.length >= 2,
  });
  const { data: tune, isLoading: loadingTune } = useQuery<Tune>({
    queryKey: [`/api/tunes/${selectedId}`],
    enabled: selectedId !== null,
  });
  useEffect(() => {
    if (tune && tune.id === selectedId) {
      setDescription(tune.description ?? "");
      setNotes(tune.notes ?? "");
      setReviewing(false);
    }
  }, [tune, selectedId]);

  const dirty = !!tune && (description !== (tune.description ?? "") || notes !== (tune.notes ?? ""));
  function choose(id: number | null) {
    if (saving) return;
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setSelectedId(id);
    setReviewing(false);
  }
  async function save() {
    if (!tune || !dirty || saving) return;
    setSaving(true);
    try {
      const response = await apiRequest("PUT", `/api/admin/tunes/${tune.id}/copy`, {
        description: description.trim() || null,
        notes: notes.trim() || null,
      });
      const saved = await response.json();
      queryClient.setQueryData([`/api/tunes/${tune.id}`], (old: Tune | undefined) => old ? { ...old, ...saved } : old);
      queryClient.invalidateQueries({
        predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/tunes"),
      });
      setDescription(saved.description ?? "");
      setNotes(saved.notes ?? "");
      setReviewing(false);
      toast({ title: "Tune copy saved", description: "The public page now shows your changes." });
    } catch (err) {
      toast({ title: "Could not save", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10 pb-20">
      <Link href="/admin" className="text-primary underline text-sm">← Back to admin</Link>
      <h1 className="font-serif text-3xl font-bold mt-5">Edit tune page copy</h1>
      <p className="text-muted-foreground mt-2">Update the story and playing notes for one tune. Recordings, notation, and catalog details stay unchanged.</p>
      <label className="block mt-8 font-medium" htmlFor="tune-search">Find a tune by title</label>
      <input id="tune-search" value={search} disabled={saving} onChange={(e) => setSearch(e.target.value)}
        placeholder="Type at least two letters…" className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2" />
      {debounced.length >= 2 && (
        <div className="mt-2 rounded-md border border-border max-h-64 overflow-y-auto" role="listbox" aria-label="Tune search results">
          {searching ? <p className="p-3 text-sm">Searching…</p> :
            results?.tunes.length ? results.tunes.map((item) => (
              <button key={item.id} type="button" disabled={saving} onClick={() => choose(item.id)}
                className={`block w-full text-left px-3 py-2 border-b border-border last:border-0 hover:bg-muted ${selectedId === item.id ? "bg-muted font-semibold" : ""}`}>
                {item.title} <span className="text-muted-foreground font-normal text-sm">· {item.key}</span>
              </button>
            )) : <p className="p-3 text-sm text-muted-foreground">No matching tunes found.</p>}
          {!!results?.total && results.total > 30 && <p className="px-3 py-2 text-xs text-muted-foreground">Showing the first 30 matches. Refine your search to find more.</p>}
        </div>
      )}
      {selectedId !== null && (loadingTune ? <p className="mt-8">Loading tune…</p> : tune && (
        <section className="mt-8 space-y-5 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl font-semibold">{tune.title}</h2>
            <Link href={`/tune/${tune.id}`} className="text-primary underline text-sm" target="_blank">View public page ↗</Link>
          </div>
          <div>
            <label htmlFor="tune-description" className="block font-semibold mb-2">About this tune</label>
            <textarea id="tune-description" value={description} disabled={saving} onChange={(e) => { setDescription(e.target.value); setReviewing(false); }}
              maxLength={10000} rows={7} className="w-full rounded-md border border-border bg-background px-3 py-2" />
            <p className="text-xs text-muted-foreground">{description.length}/10,000 characters. Leave blank to show the public “not yet documented” message.</p>
          </div>
          <div>
            <label htmlFor="tune-notes" className="block font-semibold mb-2">Performance notes</label>
            <textarea id="tune-notes" value={notes} disabled={saving} onChange={(e) => { setNotes(e.target.value); setReviewing(false); }}
              maxLength={10000} rows={5} className="w-full rounded-md border border-border bg-background px-3 py-2" />
            <p className="text-xs text-muted-foreground">{notes.length}/10,000 characters. Leave blank to hide this section.</p>
          </div>
          {reviewing && <div className="rounded-md border border-primary/30 bg-background p-4 space-y-4">
            <h3 className="font-semibold">Review before saving</h3>
            <div><h4 className="text-sm font-semibold">About this tune</h4><p className="font-serif whitespace-pre-wrap">{description.trim() || "No description"}</p></div>
            <div><h4 className="text-sm font-semibold">Performance notes</h4><p className="font-serif whitespace-pre-wrap">{notes.trim() || "Section hidden"}</p></div>
          </div>}
          <div className="flex flex-wrap gap-3">
            <Button onClick={reviewing ? save : () => setReviewing(true)} disabled={!dirty || saving}>
              {saving ? "Saving…" : reviewing ? "Confirm and save" : "Review changes"}
            </Button>
            <Button variant="outline" onClick={() => { setDescription(tune.description ?? ""); setNotes(tune.notes ?? ""); setReviewing(false); }} disabled={!dirty || saving}>Cancel changes</Button>
          </div>
        </section>
      ))}
    </main>
  );
}