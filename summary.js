(function () {
  const status = document.getElementById("summaryStatus");
  const output = document.getElementById("summaryText");

  function getFriendlyError(error) {
    const message = String(error?.message || error || "Unable to load summary.");

    if (message.includes("Could not find the table 'public.notes_items'")) {
      return "Run the updated supabase-notes-schema.sql in Supabase first, then try again.";
    }

    return message;
  }

  function normalizeText(value) {
    return String(value || "").replace(/\r\n/g, "\n").trim();
  }

  function flattenNote(note) {
    const lines = normalizeText(note.body)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\[( |x)\]\s+/i, ""));

    const parts = [];
    parts.push(`priority: ${note.priority || "medium"}`);
    parts.push(`completed: ${note.is_completed ? "yes" : "no"}`);
    if (note.due_date) {
      parts.push(`due: ${note.due_date}`);
    }
    if (lines.length) {
      parts.push(`note: ${lines.join(" | ")}`);
    } else {
      parts.push("note:");
    }

    return `- ${parts.join(" ; ")}`;
  }

  async function init() {
    if (!window.NotesAuth?.hasConfig()) {
      status.textContent = "Missing Supabase config.";
      output.textContent = "";
      return;
    }

    const client = window.NotesAuth.getClient();
    const { data, error } = await client
      .from("notes_items")
      .select("id, body, priority, due_date, is_completed, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const notes = data || [];
    status.textContent = `${notes.length} notes loaded.`;
    output.textContent = notes.length ? notes.map(flattenNote).join("\n") : "- no notes";
  }

  init().catch((error) => {
    status.textContent = getFriendlyError(error);
    output.textContent = "";
  });
})();
