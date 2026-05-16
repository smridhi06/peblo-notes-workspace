"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { notes as notesApi, aiApi, shareApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updated_at: string;
  archived: boolean;
  is_public: boolean;
  share_id?: string;
  ai_summary?: string;
  ai_action_items?: string[];
  ai_suggested_title?: string;
}

export default function NotesPage() {
  const router = useRouter();
  const [notesList, setNotesList] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [savingStatus, setSavingStatus] = useState<"saved" | "saving" | "">("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const saveTimer = useRef<NodeJS.Timeout>();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    loadNotes();
    loadTags();
  }, []);

  useEffect(() => {
    loadNotes();
  }, [search, filterTag]);

  const loadNotes = async () => {
    try {
      const res = await notesApi.list({ search: search || undefined, tag: filterTag || undefined });
      setNotesList(res.data);
    } catch {}
  };

  const loadTags = async () => {
    try {
      const res = await notesApi.tags();
      setAllTags(res.data);
    } catch {}
  };

  const createNote = async () => {
    try {
      const res = await notesApi.create({ title: "Untitled", content: "" });
      setNotesList([res.data, ...notesList]);
      setActiveNote(res.data);
      setShowAiPanel(false);
    } catch {}
  };

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setShareUrl(note.share_id ? `${window.location.origin}/shared/${note.share_id}` : "");
    setShowAiPanel(false);
  };

  const handleTitleChange = (val: string) => {
    if (!activeNote) return;
    const updated = { ...activeNote, title: val };
    setActiveNote(updated);
    scheduleSave(updated);
  };

  const handleContentChange = (val: string) => {
    if (!activeNote) return;
    const updated = { ...activeNote, content: val };
    setActiveNote(updated);
    scheduleSave(updated);
  };

  const scheduleSave = useCallback((note: Note) => {
    setSavingStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await notesApi.update(note.id, { title: note.title, content: note.content });
        setSavingStatus("saved");
        loadNotes();
        setTimeout(() => setSavingStatus(""), 2000);
      } catch {
        setSavingStatus("");
      }
    }, 800);
  }, []);

  const addTag = async (tag: string) => {
    if (!activeNote || !tag.trim()) return;
    const newTags = [...new Set([...activeNote.tags, tag.trim().toLowerCase()])];
    await notesApi.update(activeNote.id, { tags: newTags });
    setActiveNote({ ...activeNote, tags: newTags });
    setTagInput("");
    loadTags();
    loadNotes();
  };

  const removeTag = async (tag: string) => {
    if (!activeNote) return;
    const newTags = activeNote.tags.filter((t) => t !== tag);
    await notesApi.update(activeNote.id, { tags: newTags });
    setActiveNote({ ...activeNote, tags: newTags });
    loadNotes();
  };

  const generateAI = async () => {
    if (!activeNote) return;
    setAiLoading(true);
    setShowAiPanel(true);
    try {
      const res = await aiApi.generateSummary(activeNote.id);
      setActiveNote({ ...activeNote, ...res.data });
    } catch (err: any) {
      alert(err.response?.data?.detail || "AI error");
    } finally {
      setAiLoading(false);
    }
  };

  const toggleShare = async () => {
    if (!activeNote) return;
    if (activeNote.is_public) {
      await shareApi.revoke(activeNote.id);
      setActiveNote({ ...activeNote, is_public: false, share_id: undefined });
      setShareUrl("");
    } else {
      const res = await shareApi.generate(activeNote.id);
      const url = `${window.location.origin}/shared/${res.data.share_id}`;
      setShareUrl(url);
      setActiveNote({ ...activeNote, is_public: true, share_id: res.data.share_id });
    }
  };

  const archiveNote = async () => {
    if (!activeNote) return;
    await notesApi.update(activeNote.id, { archived: true });
    setNotesList(notesList.filter((n) => n.id !== activeNote.id));
    setActiveNote(null);
  };

  const deleteNote = async () => {
    if (!activeNote || !confirm("Delete this note?")) return;
    await notesApi.delete(activeNote.id);
    setNotesList(notesList.filter((n) => n.id !== activeNote.id));
    setActiveNote(null);
  };

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  return (
    <div className="flex h-screen" style={{ background: "var(--cream)" }}>
      {/* Sidebar */}
      <div className="w-72 flex flex-col border-r" style={{ borderColor: "#d4c3b0", background: "var(--parchment)" }}>
        {/* Header */}
        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: "#d4c3b0" }}>
          <div>
            <h1 className="font-display text-xl" style={{ color: "var(--ink-dark)" }}>Peblo</h1>
            <p className="text-xs" style={{ color: "#a08570" }}>{user?.name}</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => router.push("/dashboard")}
              className="p-2 rounded-lg text-xs hover:opacity-70 transition" title="Dashboard"
              style={{ color: "var(--ink-mid)" }}>📊</button>
            <button onClick={logout}
              className="p-2 rounded-lg text-xs hover:opacity-70 transition" title="Sign out"
              style={{ color: "var(--ink-mid)" }}>↩</button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b" style={{ borderColor: "#d4c3b0" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
            style={{ background: "var(--cream)", borderColor: "#d4c3b0", color: "var(--ink-dark)" }}
          />
        </div>

        {/* Tags filter */}
        {allTags.length > 0 && (
          <div className="px-3 py-2 flex flex-wrap gap-1 border-b" style={{ borderColor: "#d4c3b0" }}>
            <button onClick={() => setFilterTag("")}
              className={`tag-pill cursor-pointer ${!filterTag ? "!bg-ink-800 !text-white" : ""}`}
              style={!filterTag ? { background: "var(--ink-dark)", color: "white" } : {}}>
              All
            </button>
            {allTags.slice(0, 8).map((t) => (
              <button key={t} onClick={() => setFilterTag(t === filterTag ? "" : t)}
                className="tag-pill cursor-pointer"
                style={t === filterTag ? { background: "var(--rust)", color: "white" } : {}}>
                {t}
              </button>
            ))}
          </div>
        )}

        {/* New note button */}
        <div className="px-3 py-2">
          <button onClick={createNote}
            className="w-full py-2 rounded-lg text-sm font-medium text-white transition"
            style={{ background: "var(--ink-dark)" }}>
            + New note
          </button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto">
          {notesList.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "#a08570" }}>
              No notes yet. Create one!
            </div>
          ) : (
            notesList.map((note) => (
              <div key={note.id} onClick={() => selectNote(note)}
                className="px-4 py-3 border-b cursor-pointer transition-all"
                style={{
                  borderColor: "#d4c3b0",
                  background: activeNote?.id === note.id ? "#e8ddd2" : "transparent",
                }}>
                <p className="text-sm font-medium truncate" style={{ color: "var(--ink-dark)" }}>
                  {note.title || "Untitled"}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "#a08570" }}>
                  {note.content?.slice(0, 60) || "Empty note"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs" style={{ color: "#bca48e" }}>
                    {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                  </p>
                  {note.tags.slice(0, 2).map((t) => (
                    <span key={t} className="tag-pill text-xs">{t}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main editor */}
      {activeNote ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="px-8 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "#d4c3b0" }}>
            <div className="flex items-center gap-3">
              {savingStatus === "saving" && (
                <span className="text-xs saving" style={{ color: "#a08570" }}>Saving...</span>
              )}
              {savingStatus === "saved" && (
                <span className="text-xs" style={{ color: "var(--sage)" }}>✓ Saved</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={generateAI}
                disabled={aiLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                style={{ background: "var(--ink-dark)", color: "white" }}>
                {aiLoading ? "Thinking..." : "✨ AI Summary"}
              </button>
              <button onClick={toggleShare}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
                style={{ borderColor: "#d4c3b0", color: activeNote.is_public ? "var(--rust)" : "var(--ink-mid)" }}>
                {activeNote.is_public ? "🔗 Shared" : "Share"}
              </button>
              <button onClick={archiveNote}
                className="px-3 py-1.5 rounded-lg text-xs border transition"
                style={{ borderColor: "#d4c3b0", color: "var(--ink-mid)" }}>
                Archive
              </button>
              <button onClick={deleteNote}
                className="px-3 py-1.5 rounded-lg text-xs border transition"
                style={{ borderColor: "#fca5a5", color: "#ef4444" }}>
                Delete
              </button>
            </div>
          </div>

          {/* Share URL */}
          {shareUrl && (
            <div className="px-8 py-2 flex items-center gap-2 border-b text-xs"
              style={{ borderColor: "#d4c3b0", background: "#f0fdf4" }}>
              <span style={{ color: "var(--sage)" }}>🔗 Public:</span>
              <code className="flex-1 truncate" style={{ color: "var(--ink-mid)" }}>{shareUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="text-xs px-2 py-0.5 rounded" style={{ color: "var(--rust)" }}>
                Copy
              </button>
            </div>
          )}

          <div className="flex flex-1 overflow-hidden">
            {/* Editor area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-8 py-8">
                {/* Title */}
                <input
                  value={activeNote.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full text-3xl font-display outline-none bg-transparent mb-4"
                  style={{ color: "var(--ink-dark)" }}
                  placeholder="Note title"
                />

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6 items-center">
                  {activeNote.tags.map((t) => (
                    <span key={t} className="tag-pill">
                      {t}
                      <button onClick={() => removeTag(t)} className="ml-1 opacity-60 hover:opacity-100">×</button>
                    </span>
                  ))}
                  <form onSubmit={(e) => { e.preventDefault(); addTag(tagInput); }}>
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="+ add tag"
                      className="text-xs outline-none bg-transparent"
                      style={{ color: "#a08570", width: "80px" }}
                    />
                  </form>
                </div>

                {/* Content */}
                <textarea
                  value={activeNote.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full outline-none bg-transparent resize-none note-editor"
                  style={{ minHeight: "60vh", color: "var(--ink-dark)", lineHeight: "1.8" }}
                  placeholder="Start writing..."
                />
              </div>
            </div>

            {/* AI Panel */}
            {showAiPanel && (
              <div className="w-80 border-l overflow-y-auto p-6 fade-in"
                style={{ borderColor: "#d4c3b0", background: "var(--parchment)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg" style={{ color: "var(--ink-dark)" }}>AI Insights</h3>
                  <button onClick={() => setShowAiPanel(false)} style={{ color: "#a08570" }}>✕</button>
                </div>

                {aiLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-4 rounded animate-pulse" style={{ background: "#d4c3b0" }} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activeNote.ai_suggested_title && (
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: "var(--rust)" }}>Suggested title</p>
                        <p className="text-sm font-display" style={{ color: "var(--ink-dark)" }}>
                          {activeNote.ai_suggested_title}
                        </p>
                        <button
                          onClick={() => handleTitleChange(activeNote.ai_suggested_title!)}
                          className="mt-1 text-xs" style={{ color: "var(--sage)" }}>
                          Use this title →
                        </button>
                      </div>
                    )}

                    {activeNote.ai_summary && (
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: "var(--rust)" }}>Summary</p>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-mid)" }}>
                          {activeNote.ai_summary}
                        </p>
                      </div>
                    )}

                    {activeNote.ai_action_items && activeNote.ai_action_items.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2" style={{ color: "var(--rust)" }}>Action items</p>
                        <ul className="space-y-2">
                          {activeNote.ai_action_items.map((item, i) => (
                            <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--ink-mid)" }}>
                              <span style={{ color: "var(--sage)" }}>○</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ color: "#bca48e" }}>
          <div className="text-center">
            <p className="font-display text-4xl mb-3">✦</p>
            <p className="font-display text-xl mb-1" style={{ color: "var(--ink-mid)" }}>Select a note</p>
            <p className="text-sm">or create a new one to get started</p>
          </div>
        </div>
      )}
    </div>
  );
}
