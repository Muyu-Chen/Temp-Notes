const workspace = document.querySelector(".workspace");
const note = document.getElementById("note");
const previewPane = document.getElementById("previewPane");
const editModeBtn = document.getElementById("editModeBtn");
const previewModeBtn = document.getElementById("previewModeBtn");
const clipPanel = document.getElementById("clipPanel");
const toggleList = document.getElementById("toggleList");
const clipList = document.getElementById("clipList");
const clipCount = document.getElementById("clipCount");
const openRecorderBtn = document.getElementById("openRecorderBtn");
const modalLayer = document.getElementById("modalLayer");
const floatingRecorder = document.getElementById("floatingRecorder");
const recordName = document.getElementById("recordName");
const recordBtn = document.getElementById("recordBtn");
const minimizeBtn = document.getElementById("minimizeBtn");
const maximizeBtn = document.getElementById("maximizeBtn");
const closeBtn = document.getElementById("closeBtn");
const stateLabels = document.querySelectorAll("[data-record-state]");
const timers = document.querySelectorAll("[data-timer]");
const pauseButtons = document.querySelectorAll('[data-action="pause"]');
const stopButtons = document.querySelectorAll('[data-action="stop"]');

let draftMode = "edit";
let recordMode = "idle";
let elapsedSeconds = 0;
let tickTimer = null;
let clipId = 1;
let playingClipId = null;
let clips = [];

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });

const getDraftTitle = () => {
  const firstLine = note.value.split("\n").find((line) => line.trim());
  return firstLine ? firstLine.trim().slice(0, 28) : "当前草稿";
};

const renderPreview = () => {
  const lines = note.value.split("\n");
  const html = [];
  let listOpen = false;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      return;
    }

    if (trimmed.startsWith("- ")) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${escapeHtml(trimmed.slice(2))}</li>`);
      return;
    }

    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
    html.push(`<p>${escapeHtml(trimmed)}</p>`);
  });

  if (listOpen) html.push("</ul>");
  previewPane.innerHTML = html.join("") || '<p class="muted">暂无内容</p>';
};

const setDraftMode = (nextMode) => {
  draftMode = nextMode;
  const previewing = draftMode === "preview";
  note.hidden = previewing;
  previewPane.hidden = !previewing;
  editModeBtn.classList.toggle("active", !previewing);
  previewModeBtn.classList.toggle("active", previewing);
  if (previewing) renderPreview();
};

const syncRecorderVisibility = (view) => {
  modalLayer.hidden = view !== "modal";
  floatingRecorder.hidden = view !== "floating";
  openRecorderBtn.classList.toggle("active", view === "modal" || view === "floating");
};

const setRecordMode = (nextMode) => {
  recordMode = nextMode;
  workspace.classList.toggle("recording", recordMode === "recording");
  workspace.classList.toggle("paused", recordMode === "paused");

  const canPause = recordMode === "recording" || recordMode === "paused";
  pauseButtons.forEach((button) => {
    button.disabled = !canPause;
    button.textContent = recordMode === "paused" ? "继续" : "暂停";
  });
  stopButtons.forEach((button) => {
    button.disabled = recordMode === "idle";
  });

  let text = "准备录音";
  if (recordMode === "recording") text = "录音中";
  if (recordMode === "paused") text = "已暂停";
  stateLabels.forEach((label) => {
    label.textContent = text;
  });
};

const syncTimer = () => {
  timers.forEach((timer) => {
    timer.textContent = formatDuration(elapsedSeconds);
  });
};

const startTicking = () => {
  clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    elapsedSeconds += 1;
    syncTimer();
  }, 1000);
};

const stopTicking = () => {
  clearInterval(tickTimer);
  tickTimer = null;
};

const openRecorder = () => {
  recordName.textContent = getDraftTitle();
  syncRecorderVisibility("modal");
};

const minimizeRecorder = () => {
  syncRecorderVisibility("floating");
};

const closeRecorder = () => {
  if (recordMode !== "idle") return;
  syncRecorderVisibility("closed");
};

const startRecording = () => {
  elapsedSeconds = 0;
  syncTimer();
  recordName.textContent = getDraftTitle();
  setRecordMode("recording");
  startTicking();
};

const finishRecording = () => {
  stopTicking();

  if (elapsedSeconds > 0) {
    clips.unshift({
      id: clipId,
      title: getDraftTitle(),
      duration: elapsedSeconds,
      createdAt: new Date(),
    });
    clipId += 1;
  }

  elapsedSeconds = 0;
  syncTimer();
  setRecordMode("idle");
  syncRecorderVisibility("closed");
  renderClips();
};

const renderClips = () => {
  clipCount.textContent = String(clips.length);
  clipList.replaceChildren();

  if (clips.length === 0) {
    const empty = document.createElement("div");
    empty.className = "clip-empty";
    empty.textContent = "暂无片段";
    clipList.appendChild(empty);
    return;
  }

  clips.forEach((clip) => {
    const item = document.createElement("div");
    item.className = `clip-item${playingClipId === clip.id ? " playing" : ""}`;

    const play = document.createElement("button");
    play.className = "clip-play";
    play.type = "button";
    play.textContent = playingClipId === clip.id ? "Ⅱ" : "▶";
    play.title = "播放片段";
    play.onclick = () => {
      playingClipId = playingClipId === clip.id ? null : clip.id;
      renderClips();
    };

    const body = document.createElement("div");
    const title = document.createElement("div");
    title.className = "clip-title";
    title.textContent = clip.title || `录音 ${clip.id}`;
    const time = document.createElement("div");
    time.className = "clip-time";
    time.textContent = `${formatDuration(clip.duration)} · ${clip.createdAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    body.append(title, time);

    const remove = document.createElement("button");
    remove.className = "clip-remove";
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "删除片段";
    remove.onclick = () => {
      clips = clips.filter((x) => x.id !== clip.id);
      if (playingClipId === clip.id) playingClipId = null;
      renderClips();
      setRecordMode(recordMode);
    };

    item.append(play, body, remove);
    clipList.appendChild(item);
  });
};

editModeBtn.addEventListener("click", () => setDraftMode("edit"));
previewModeBtn.addEventListener("click", () => setDraftMode("preview"));
openRecorderBtn.addEventListener("click", openRecorder);
minimizeBtn.addEventListener("click", minimizeRecorder);
maximizeBtn.addEventListener("click", openRecorder);
closeBtn.addEventListener("click", closeRecorder);

recordBtn.addEventListener("click", () => {
  if (recordMode === "idle") {
    startRecording();
  } else {
    finishRecording();
  }
});

pauseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (recordMode === "recording") {
      stopTicking();
      setRecordMode("paused");
    } else if (recordMode === "paused") {
      setRecordMode("recording");
      startTicking();
    }
  });
});

stopButtons.forEach((button) => {
  button.addEventListener("click", finishRecording);
});

toggleList.addEventListener("click", () => {
  const collapsed = !clipPanel.classList.contains("collapsed");
  clipPanel.classList.toggle("collapsed", collapsed);
  toggleList.setAttribute("aria-expanded", String(!collapsed));
});

note.addEventListener("input", () => {
  if (draftMode === "preview") renderPreview();
  if (recordMode === "recording" || recordMode === "paused") {
    recordName.textContent = getDraftTitle();
  }
});

renderPreview();
renderClips();
setDraftMode("edit");
setRecordMode("idle");
syncTimer();
