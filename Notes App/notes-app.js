(function () {
  const PRIORITY_ORDER = ["high", "medium", "low"];
  const PRIORITY_LABELS = {
    high: "High priority",
    medium: "Medium priority",
    low: "Low priority"
  };

  const state = {
    client: null,
    notes: [],
    editingId: null,
    sortMode: "priority",
    sortDirection: "desc",
    statusFilter: "all",
    realtimeChannel: null,
    composerOpen: false
  };

  const elements = {
    userSummary: document.getElementById("userSummary"),
    composerPanel: document.getElementById("composerPanel"),
    noteForm: document.getElementById("noteForm"),
    noteBody: document.getElementById("noteBody"),
    notePriority: document.getElementById("notePriority"),
    noteDueDate: document.getElementById("noteDueDate"),
    noteCompleted: document.getElementById("noteCompleted"),
    saveNoteButton: document.getElementById("saveNoteButton"),
    cancelEditButton: document.getElementById("cancelEditButton"),
    toggleComposerButton: document.getElementById("toggleComposerButton"),
    composerHeading: document.getElementById("composerHeading"),
    addBulletButton: document.getElementById("addBulletButton"),
    addChecklistLineButton: document.getElementById("addChecklistLineButton"),
    sortMode: document.getElementById("sortMode"),
    sortDirection: document.getElementById("sortDirection"),
    statusFilter: document.getElementById("statusFilter"),
    totalNotesPill: document.getElementById("totalNotesPill"),
    highPriorityPill: document.getElementById("highPriorityPill"),
    notesList: document.getElementById("notesList"),
    emptyState: document.getElementById("emptyState"),
    emptyMessage: document.getElementById("emptyMessage"),
    floatingAddButton: document.getElementById("floatingAddButton"),
    mobileSheetBackdrop: document.getElementById("mobileSheetBackdrop"),
    toastStack: document.getElementById("toastStack")
  };

  function getFriendlyError(error) {
    const message = String(error?.message || error || "Unable to load your notes.");

    if (message.includes("Could not find the table 'public.notes_items'")) {
      return "Run the updated supabase-notes-schema.sql in Supabase first, then try again.";
    }

    return message;
  }

  function showToast(text) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = text;
    elements.toastStack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4000);
  }

  function formatDateTime(value) {
    if (!value) {
      return "";
    }

    return new Date(value).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function formatDueDate(value) {
    if (!value) {
      return "No due date";
    }

    return new Date(`${value}T00:00:00`).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function priorityWeight(priority) {
    return PRIORITY_ORDER.indexOf(priority);
  }

  function normalizeNoteBody(value) {
    return String(value || "").replace(/\r\n/g, "\n").trim();
  }

  function getNoteLines(value) {
    return normalizeNoteBody(value)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\[( |x)\]\s+/i, ""));
  }

  function insertAtCursor(prefix) {
    const field = elements.noteBody;
    const start = field.selectionStart || 0;
    const end = field.selectionEnd || 0;
    const original = field.value;
    const lineStart = original.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const needsNewline = start > lineStart && original.slice(lineStart, start).trim().length > 0;
    const insertion = `${needsNewline ? "\n" : ""}${prefix}`;
    field.value = `${original.slice(0, start)}${insertion}${original.slice(end)}`;
    const caret = start + insertion.length;
    field.focus();
    field.setSelectionRange(caret, caret);
  }

  function setComposerOpen(open) {
    state.composerOpen = open;
    elements.noteForm.classList.toggle("hidden", !open);
    elements.composerPanel.classList.toggle("collapsed", !open);
    elements.composerPanel.classList.toggle("mobile-open", open);
    elements.mobileSheetBackdrop.classList.toggle("hidden", !open);
    document.body.classList.toggle("sheet-open", open);
    elements.toggleComposerButton.textContent = open ? "Hide" : "Add note";
    elements.floatingAddButton.classList.toggle("hidden", open);
  }

  function getFilteredNotes() {
    return state.notes.filter((note) => {
      if (state.statusFilter === "open") {
        return !note.is_completed;
      }

      if (state.statusFilter === "completed") {
        return note.is_completed;
      }

      return true;
    });
  }

  function compareDueDates(a, b) {
    const aHasDate = Boolean(a.due_date);
    const bHasDate = Boolean(b.due_date);

    if (aHasDate && !bHasDate) {
      return -1;
    }

    if (!aHasDate && bHasDate) {
      return 1;
    }

    if (!aHasDate && !bHasDate) {
      return 0;
    }

    return new Date(`${a.due_date}T00:00:00`).getTime() - new Date(`${b.due_date}T00:00:00`).getTime();
  }

  function sortNotes(notes) {
    const sorted = [...notes].sort((a, b) => {
      if (state.sortMode === "priority") {
        const priorityComparison = priorityWeight(a.priority) - priorityWeight(b.priority);
        if (priorityComparison !== 0) {
          return priorityComparison;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      if (state.sortMode === "due-date") {
        const dueComparison = compareDueDates(a, b);
        if (dueComparison !== 0) {
          return state.sortDirection === "desc" ? dueComparison * -1 : dueComparison;
        }
        return state.sortDirection === "desc"
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      return state.sortDirection === "desc"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    if (state.sortMode === "priority" && state.sortDirection === "asc") {
      sorted.reverse();
    }

    return sorted;
  }

  function updateSummary() {
    const filtered = getFilteredNotes();
    const highPriorityCount = filtered.filter((note) => note.priority === "high" && !note.is_completed).length;
    elements.totalNotesPill.textContent = `${filtered.length} note${filtered.length === 1 ? "" : "s"}`;
    elements.highPriorityPill.textContent = `${highPriorityCount} high priority`;
  }

  function buildMetaRow(note) {
    const row = document.createElement("div");
    row.className = "meta-row";

    const due = document.createElement("span");
    due.textContent = `Due: ${formatDueDate(note.due_date)}`;
    row.appendChild(due);

    const added = document.createElement("span");
    added.textContent = `Added: ${formatDateTime(note.created_at)}`;
    row.appendChild(added);

    if (note.updated_at && note.updated_at !== note.created_at) {
      const updated = document.createElement("span");
      updated.textContent = `Updated: ${formatDateTime(note.updated_at)}`;
      row.appendChild(updated);
    }

    return row;
  }

  function buildNoteCard(note) {
    const card = document.createElement("article");
    card.className = `note-card${note.is_completed ? " completed" : ""}`;

    const main = document.createElement("div");
    main.className = "note-main";

    const header = document.createElement("div");
    header.className = "note-header-row";

    const bullet = document.createElement("span");
    bullet.className = "note-bullet";
    bullet.textContent = "•";

    const summary = document.createElement("div");
    summary.className = "note-summary";

    const lines = getNoteLines(note.body);
    const list = document.createElement("ul");
    list.className = "note-bullets";

    (lines.length ? lines : ["Empty note"]).forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      list.appendChild(item);
    });

    summary.appendChild(list);

    const pills = document.createElement("div");
    pills.className = "pill-row";

    const priorityPill = document.createElement("span");
    priorityPill.className = `priority-pill ${note.priority}`;
    priorityPill.textContent = PRIORITY_LABELS[note.priority] || "Priority";
    pills.appendChild(priorityPill);

    if (note.is_completed) {
      const completed = document.createElement("span");
      completed.className = "status-pill";
      completed.textContent = "Completed";
      pills.appendChild(completed);
    }

    const dueBadge = document.createElement("span");
    dueBadge.className = "pill";
    dueBadge.textContent = note.due_date ? formatDueDate(note.due_date) : "No due date";
    pills.appendChild(dueBadge);

    header.appendChild(bullet);
    header.appendChild(summary);

    const meta = buildMetaRow(note);

    const actions = document.createElement("div");
    actions.className = "note-actions";

    const leftActions = document.createElement("div");
    leftActions.className = "left-actions";

    const completeButton = document.createElement("button");
    completeButton.className = "secondary";
    completeButton.type = "button";
    completeButton.textContent = note.is_completed ? "Mark open" : "Mark done";
    completeButton.addEventListener("click", async () => {
      try {
        await updateNote(note.id, { is_completed: !note.is_completed }, false);
      } catch (error) {
        showToast(getFriendlyError(error));
      }
    });

    const editButton = document.createElement("button");
    editButton.className = "secondary";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => populateForm(note));

    leftActions.appendChild(completeButton);
    leftActions.appendChild(editButton);

    const rightActions = document.createElement("div");
    rightActions.className = "right-actions";

    const deleteButton = document.createElement("button");
    deleteButton.className = "secondary";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      if (!window.confirm("Delete this note?")) {
        return;
      }

      try {
        await deleteNote(note.id);
      } catch (error) {
        showToast(getFriendlyError(error));
      }
    });

    rightActions.appendChild(deleteButton);
    actions.appendChild(leftActions);
    actions.appendChild(rightActions);

    main.appendChild(header);
    main.appendChild(pills);
    main.appendChild(meta);
    main.appendChild(actions);
    card.appendChild(main);

    return card;
  }

  function renderEmptyState(message) {
    elements.notesList.innerHTML = "";
    elements.emptyState.classList.remove("hidden");
    elements.emptyMessage.textContent = message;
  }

  function renderPrioritySections(notes) {
    const prioritySequence = state.sortDirection === "desc" ? PRIORITY_ORDER : [...PRIORITY_ORDER].reverse();
    const sections = prioritySequence.map((priority) => ({
      priority,
      notes: notes.filter((note) => note.priority === priority)
    })).filter((section) => section.notes.length);

    if (!sections.length) {
      renderEmptyState("No notes match the current filters.");
      return;
    }

    elements.emptyState.classList.add("hidden");
    elements.notesList.innerHTML = "";

    sections.forEach((section) => {
      const wrapper = document.createElement("section");
      wrapper.className = "section-card";

      const header = document.createElement("div");
      header.className = "section-header";

      const title = document.createElement("h3");
      title.textContent = PRIORITY_LABELS[section.priority];
      header.appendChild(title);

      const body = document.createElement("div");
      body.className = "section-body";
      section.notes.forEach((note) => body.appendChild(buildNoteCard(note)));

      wrapper.appendChild(header);
      wrapper.appendChild(body);
      elements.notesList.appendChild(wrapper);
    });
  }

  function renderFlatNotes(notes) {
    if (!notes.length) {
      renderEmptyState("No notes match the current filters.");
      return;
    }

    elements.emptyState.classList.add("hidden");
    elements.notesList.innerHTML = "";
    notes.forEach((note) => elements.notesList.appendChild(buildNoteCard(note)));
  }

  function renderNotes() {
    updateSummary();
    const sorted = sortNotes(getFilteredNotes());

    if (!sorted.length) {
      renderEmptyState("No notes yet. Add your first one.");
      return;
    }

    if (state.sortMode === "priority") {
      renderPrioritySections(sorted);
      return;
    }

    renderFlatNotes(sorted);
  }

  function resetForm() {
    state.editingId = null;
    elements.noteForm.reset();
    elements.notePriority.value = "medium";
    elements.noteCompleted.checked = false;
    elements.composerHeading.textContent = "Quick note";
    elements.saveNoteButton.textContent = "Save note";
    elements.cancelEditButton.classList.add("hidden");
    setComposerOpen(false);
  }

  function populateForm(note) {
    state.editingId = note.id;
    elements.noteBody.value = note.body || "";
    elements.notePriority.value = note.priority;
    elements.noteDueDate.value = note.due_date || "";
    elements.noteCompleted.checked = Boolean(note.is_completed);
    elements.composerHeading.textContent = "Edit note";
    elements.saveNoteButton.textContent = "Update note";
    elements.cancelEditButton.classList.remove("hidden");
    setComposerOpen(true);
    elements.noteBody.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadNotes() {
    const { data, error } = await state.client
      .from("notes_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    state.notes = data || [];
  }

  async function saveNote(payload) {
    if (!normalizeNoteBody(payload.body)) {
      throw new Error("Write your note first.");
    }

    if (state.editingId) {
      return updateNote(state.editingId, payload);
    }

    const { error } = await state.client
      .from("notes_items")
      .insert(payload);

    if (error) {
      throw error;
    }

    showToast("Note saved.");
    resetForm();
    await refreshNotes();
  }

  async function updateNote(id, payload, resetAfterSave = true) {
    const { error } = await state.client
      .from("notes_items")
      .update(payload)
      .eq("id", id);

    if (error) {
      throw error;
    }

    showToast("Note updated.");
    if (resetAfterSave) {
      resetForm();
    }
    await refreshNotes();
  }

  async function deleteNote(id) {
    const { error } = await state.client
      .from("notes_items")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    if (state.editingId === id) {
      resetForm();
    }

    showToast("Note deleted.");
    await refreshNotes();
  }

  async function refreshNotes() {
    await loadNotes();
    renderNotes();
  }

  function removeRealtimeChannel() {
    if (state.realtimeChannel && state.client) {
      state.client.removeChannel(state.realtimeChannel);
      state.realtimeChannel = null;
    }
  }

  async function subscribeRealtime() {
    removeRealtimeChannel();

    state.realtimeChannel = state.client
      .channel("notes-items-public")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes_items"
        },
        async () => {
          await refreshNotes();
        }
      )
      .subscribe();
  }

  function wireEvents() {
    elements.toggleComposerButton.addEventListener("click", () => {
      setComposerOpen(!state.composerOpen);
      if (state.composerOpen) {
        elements.noteBody.focus();
      }
    });

    elements.floatingAddButton.addEventListener("click", () => {
      setComposerOpen(true);
      elements.noteBody.focus();
    });

    elements.mobileSheetBackdrop.addEventListener("click", () => {
      setComposerOpen(false);
    });

    elements.addBulletButton.addEventListener("click", () => {
      insertAtCursor("- ");
    });

    elements.addChecklistLineButton.addEventListener("click", () => {
      insertAtCursor("[ ] ");
    });

    elements.cancelEditButton.addEventListener("click", () => {
      resetForm();
    });

    elements.sortMode.addEventListener("change", () => {
      state.sortMode = elements.sortMode.value;
      renderNotes();
    });

    elements.sortDirection.addEventListener("change", () => {
      state.sortDirection = elements.sortDirection.value;
      renderNotes();
    });

    elements.statusFilter.addEventListener("change", () => {
      state.statusFilter = elements.statusFilter.value;
      renderNotes();
    });

    elements.noteForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const payload = {
          body: elements.noteBody.value,
          priority: elements.notePriority.value,
          due_date: elements.noteDueDate.value || null,
          is_completed: elements.noteCompleted.checked
        };

        await saveNote(payload);
      } catch (error) {
        showToast(getFriendlyError(error));
      }
    });
  }

  async function init() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("notes-sw.js").catch(() => {});
    }

    if (!window.NotesAuth?.hasConfig()) {
      elements.userSummary.textContent = "Add your Supabase settings to notes-cloud-config.js to continue.";
      return;
    }

    state.client = window.NotesAuth.getClient();

    elements.userSummary.textContent = "This shared notebook opens directly with no login.";
    elements.sortMode.value = state.sortMode;
    elements.sortDirection.value = state.sortDirection;
    elements.statusFilter.value = state.statusFilter;

    wireEvents();
    resetForm();
    await refreshNotes();
    await subscribeRealtime();
  }

  window.addEventListener("beforeunload", removeRealtimeChannel);
  init().catch((error) => {
    showToast(getFriendlyError(error));
  });
})();
