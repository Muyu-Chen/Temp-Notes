# Temp Notes - A Default-Offline Private Draft App 📝

这是一个 **默认完全离线** 运行的临时笔记应用，支持快速草稿、条目存档、Markdown 预览、导入导出。所有笔记数据默认仅保存在本地浏览器；只有用户主动启用大模型功能并点击测试连接或使用未来 AI 功能时，才会请求用户自己配置的服务。随手的草稿、临时信息都可以在这里安全地记录和管理，无需打开臃肿的笔记应用。

A **default-offline** temporary note app supporting quick drafts, entry archiving, Markdown preview, and data import/export. Notes stay in your local browser by default; network requests only happen when you explicitly enable LLM features and click the connection test or use future AI actions against your own configured service.

When you need to quickly capture ideas, inspiration, or to-dos, Temp Notes provides a fast and secure environment to record and manage your notes without opening a bloated note app. For temporary text pasting or storing ephemeral information, it's a lightweight tool that opens instantly, helping you efficiently manage temporary information.

> Your notes, your data, always in your control: JSON import/export makes it easy to backup, migrate, or recover your data anytime, anywhere.

- Repository: [https://github.com/Muyu-Chen/Temp-Notes](https://github.com/Muyu-Chen/Temp-Notes)
- 中文 README: [Read the Chinese version](https://github.com/Muyu-Chen/Temp-Notes/blob/master/README-CHINESE.md)

> Your notes, your data, always under your control. JSON import/export makes backup, migration, and recovery simple anytime.

## 🌐 Online Demo

Two independent deployments with the same core app (isolated by browser same-origin policy, data does not interoperate):

| URL | Description |
|------|------|
| [muyyy.link/draft](https://muyyy.link/draft) | Deployment 1, currently close to the GitHub version |
| [imagingmodel.com/draft](https://imagingmodel.com/draft/) | Deployment 2, slightly behind GitHub but more stable |

> Why is data not shared? Due to the same-origin policy, pages from different domains cannot access each other's local storage. Notes are strictly isolated per domain.

## How to Deploy

Clone the repository and open `./index.html` directly. No server configuration is required.

`git clone https://github.com/Muyu-Chen/Temp-Notes.git`

You can run it locally after cloning, clone directly on a server, or upload the entire folder to any static hosting platform (such as GitHub Pages or Netlify). This project is fully static and needs no backend.

## Privacy Guarantee

- Default offline: local browser execution with no automatic network connection
- Open source: all JavaScript files are open, with no hidden network requests
- Local storage only: notes are stored in LocalStorage/IndexedDB
- Never uploaded by default: your notes are not sent anywhere unless you explicitly enable and use user-configured LLM features
- No tracking: no analytics, no cookies, no hidden connections
- LLM features are disabled by default. The connection test sends `GET {base_url}/models` only after you enable LLM settings and click the test button; `base_url`, `api_key`, and `model` are user-provided and user-stored.

### Privacy Details

In the JavaScript codebase:

- No automatic `fetch()` requests
- No `XMLHttpRequest`
- No `WebSocket` connections
- No external resource dependencies required for offline usage
- Only local LocalStorage/IndexedDB operations
- Optional LLM connectivity uses `fetch()` only after explicit user action.

All code is open and auditable.

## Project Structure

```text
Temp-Notes/
├── css/                    # Style directory
│   ├── theme.css           # Theme system (color variables)
│   ├── base.css            # Base styles (resets, utilities)
│   ├── layout.css          # Layout structure
│   └── components.css      # UI component styles
├── js/                     # JavaScript modules
│   ├── main.js             # Thin app entry (DOM ready -> bootstrap)
│   ├── app-controller.js   # App-level coordinator
│   ├── constants.js        # Stable app constants
│   ├── crypto.js           # Encryption primitives
│   ├── crypto-js.min.js    # Local CryptoJS dependency
│   ├── storage.js          # Storage module barrel export
│   ├── utils.js            # Utility module barrel export
│   ├── bootstrap/          # Startup orchestration and event binding
│   ├── services/           # Business services
│   ├── storage/            # IndexedDB and data persistence modules
│   ├── ui/                 # DOM wrappers, views, modal, UI feedback
│   ├── lib/                # Focused helper modules
│   └── vendor/             # Local third-party browser libraries
├── tests/                  # Vitest regression tests
├── index.html              # App entry page
├── README.md               # English documentation
└── README-CHINESE.md       # Chinese documentation
```

## Architecture

### Layered Design

1. Entry and bootstrap layer
   - `main.js`: waits for DOM readiness and starts the app
   - `bootstrap/app-bootstrap.js`: creates core objects and runs startup steps
   - `bootstrap/bind-events.js`: binds DOM events to controller actions
   - `bootstrap/first-run.js`: first-run flag and usage notice

2. Presentation layer
   - `ui/ui-controller.js`: toast, metadata, and shell-level UI feedback
   - `ui/item-list-view.js`: archived entry list rendering
   - `ui/recycle-list-view.js`: recycle bin list rendering
   - `ui/dom-manager.js`: DOM access wrapper
   - `ui/modal.js`: common modal component
   - `css/*`: all style files

3. Coordination and service layer
   - `app-controller.js`: app-level coordinator and shared state
   - `services/*`: draft, entry, encryption, recycle bin, settings, theme, import/export flows

4. Data access layer
   - `storage/idb.js`: IndexedDB connection and store setup
   - `storage/*-storage.js`: draft, item, recycle, settings, and import/export storage helpers
   - `storage.js`: public storage export surface

5. Utilities layer
   - `lib/*`: text, time, byte, ID, and platform helpers
   - `utils.js`: public utility export surface

### Module Responsibilities

| Module | Responsibility | Exports |
|------|------|------|
| `main.js` | App entry | DOM ready startup |
| `bootstrap/app-bootstrap.js` | Startup orchestration | `bootstrapApp` |
| `bootstrap/bind-events.js` | Event binding | `bindAppEvents` |
| `bootstrap/first-run.js` | First-run state | `initializeFirstRun` |
| `app-controller.js` | App coordination | `AppController` class |
| `services/draft-service.js` | Draft autosave and archive flow | `DraftService` |
| `services/item-service.js` | Entry title and delete flow | `ItemService` |
| `services/encryption-service.js` | Entry encryption/decryption flow | `EncryptionService` |
| `services/recycle-service.js` | Recycle bin data state | `RecycleService` |
| `services/recycle-actions-service.js` | Recycle bin restore/delete/clear actions | `RecycleActionsService` |
| `services/import-export-service.js` | JSON import/export flow | `ImportExportService` |
| `services/llm-service.js` | Optional LLM configuration test | `LLMService` |
| `services/settings-service.js` | Font size, LLM settings, data clearing | Settings helpers |
| `services/theme-manager.js` | Theme load/apply/toggle | Theme helpers |
| `storage/idb.js` | IndexedDB setup | `getDB`, store constants |
| `storage/draft-storage.js` | Draft persistence | Draft load/save helpers |
| `storage/item-storage.js` | Entry persistence | Item load/save helpers |
| `storage/recycle-storage.js` | Recycle bin persistence | Recycle load/save helpers |
| `storage/settings-storage.js` | Settings object-store access | `readSetting`, `writeSetting` |
| `storage/import-export-storage.js` | Import/export normalization | Export, normalize, merge helpers |
| `ui/ui-controller.js` | UI feedback and metadata | `UIController` class |
| `ui/dom-manager.js` | DOM management | `DOMManager` class |
| `ui/item-list-view.js` | Entry list rendering | `ItemListView` class |
| `ui/recycle-list-view.js` | Recycle bin rendering | `RecycleListView` class |
| `ui/markdown-renderer.js` | Markdown rendering wrapper | `renderMarkdown` |
| `lib/download-utils.js` | Single-entry text export helpers | File payload and filename helpers |
| `ui/modal.js` | Modal UI | `Modal` class |
| `lib/*` | Focused utility helpers | Text/time/bytes/id/platform helpers |
| `vendor/*` | Local third-party libraries | Marked, DOMPurify |
| `constants.js` | Stable constants | `STORAGE_KEYS` |
| `crypto.js` | Encryption primitives | Encrypt/decrypt/verify helpers |

## CSS Structure

### theme.css

- CSS variable definitions (`--bg`, `--text`, `--accent`, etc.)
- Dark/light theme switching

### base.css

- Global reset (`box-sizing`, `margin`, font, etc.)
- Utility classes (`.muted`, `.small`, `.mono`)

### layout.css

- Main containers (`.app`, `header`, `.main`, `.panel`)
- Responsive design (media queries)

### components.css

- UI components (`button`, `textarea`, `input`, `card`, etc.)
- Interaction states (`hover`, `active`)

## Quick Start

### Testing

This project uses Vitest for regression tests.

1. Install dependencies:

```bash
npm install
```

2. Run the test suite:

```bash
npm test
```

The current suite covers regression behavior for:

- draft lifecycle rules: archive, clear, new draft, autosave, encrypted item loading, and timestamp preservation
- item operations: title rename fallbacks, encrypted title metadata, delete-to-recycle behavior
- recycle bin state: load-once init, add, delete, restore, and clear
- recycle bin auto-clean rules: never/7/30/90-day retention and setting-triggered cleanup
- import/export helpers: payload normalization, empty item filtering, deduplication, sorting, and export envelope shape
- single-entry TXT/MD export helpers: filename cleanup, timestamp format, MIME type, and encrypted-menu visibility
- settings: Markdown mode persistence, recycle retention, and LLM settings persistence
- LLM connection service: no request when disabled/incomplete, correct OpenAI-compatible `/models` request, success/failure states
- Markdown rendering: fallback escaping and local `marked` + `DOMPurify` integration
- text utilities: title resolution, first-line fallback, clamping, and mixed-language word count

### Keyboard Shortcuts

- `Ctrl+S`: Save current draft
- `Ctrl+K`: Search archived entries
- `Ctrl+L`: Clear draft

## Data Flow

```text
User input
   ↓
DOMManager reads/writes DOM state
   ↓
bindAppEvents routes browser events
   ↓
AppController coordinates services
   ↓
Services update app state and call storage modules
   ↓
UIController and view modules render feedback
   ↓
User receives feedback
```

## 📝 Main Features

- 🖊️ First-run usage guide popup
- ✍️ Auto-save drafts
- 📦 Entry archive management
- 🔍 Full-text search
- 📊 Real-time word/storage stats
- 🌓 Dark/light theme switching
- 💾 Export to JSON
- 📄 Export a single archived entry as TXT or Markdown
- 📥 Import from JSON (merge + dedup supported)
- 👀 Local Markdown preview with persistent edit/preview mode
- 🧹 Optional recycle bin auto-cleanup
- 🔌 Optional OpenAI-compatible LLM connection test
- ⌨️ Rich keyboard shortcuts

## 🔧 Extension Guide

### TODO - Completed

- [x] Switched to IndexedDB for larger storage capacity and broader client compatibility.
- [x] Added symmetric encryption to protect data with a password.
- [x] Merged draft-to-entry save logic to update matched entries instead of duplicating.
- [x] Optimized Chinese font stack for better readability.
- [x] Beautified scrollbar style.
- [x] Added font size settings.
- [x] Replaced clear entry with a More panel containing recycle bin + import/export.
- [x] Built recycle bin UI with single delete, bulk clear, and confirmation dialogs.
- [x] Changed delete flow to move entries into recycle bin first.
- [x] Implemented recycle bin management with double confirmation for destructive actions.
- [x] Added JSON import/export with deduplication and format compatibility.
- [x] Implemented a hard break logic: if draft becomes empty, next save must create a new entry ID.
- [x] Set default encryption password to `password` when input is empty; default-password notes can auto-decrypt.
- [x] Retained password hint after decryption for quick re-encryption.
- [x] Added a small GitHub link next to the main title.
- [x] Enabled click-to-edit entry titles outside encryption flow.
- [x] Auto-filled encryption modal title from current entry title.
- [x] Fallback to first line of body when title is empty.
- [x] Added first-run bootstrap logic to maintain the `firstOpen` flag and insert the usage notice when needed.
- [x] Clear draft without confirmation after the draft has been archived; ask for confirmation only for never-archived drafts.
- [x] Re-saving an unchanged archived draft keeps the original update timestamp.
- [x] Save single-entry changes incrementally instead of rewriting the full archive list for common edits.
- [x] Add local Markdown preview for drafts.
- [x] Add single-entry TXT/Markdown export from the archived entry menu.
- [x] Persist Markdown edit/preview mode across entries and reloads.
- [x] Add configurable recycle bin auto-cleanup.
- [x] Add optional OpenAI-compatible LLM settings and connection test.

### TODO - Planned

#### Short-Term Workflow Improvements

- [ ] Upgrade `Ctrl+K` into a global quick switcher that can search archived entries, recycle bin entries, and the current draft, with keyboard navigation and enter-to-open.
- [ ] Add batch actions for archived entries, including multi-select delete, batch export, and batch encryption/decryption where safe.
- [ ] Add entry pinning and favorites so frequently used temporary notes stay at the top without affecting normal update order.
- [ ] Add lightweight entry tags and tag filters; keep tag data local and include it in JSON import/export.
- [ ] Add draft version history for recent edits, with simple restore support for accidental overwrites.
- [ ] Improve first-load performance and add a restrained loading state for large local databases.

#### Recording and Attachments

- [ ] Add local voice recording for drafts using the browser recording API, with start/pause/resume/stop, duration display, and local-only storage by default.
- [ ] Attach recordings to archived entries, export them through JSON backup, and show attachment size in storage stats.
- [ ] Add recording playback controls inside entries, including seek, speed, and rename/remove attachment actions.
- [ ] Add image attachment support with local previews, size warnings, and JSON backup compatibility.
- [ ] Add an attachment manager that lists large files and helps users clean storage without deleting the whole entry.
- [ ] Plan optional audio transcription as a future LLM action; transcription must only run after explicit user action and use the user-configured provider.

#### Security and Data Control

- [ ] Add configurable default password in Settings. New notes encrypted with an empty password should use this updated default, while previously encrypted notes keep their original default password.
- [ ] Add one-click migration from old default password to new default password, so previously default-password-encrypted notes can be batch-updated safely (backup recommended before migration).
- [ ] Add remember-password-after-decrypt as a user option, so users can choose whether to auto-fill next time.
- [ ] Add archive auto-clean rules separate from recycle bin cleanup, such as deleting or moving entries older than a selected retention period.
- [ ] Add backup reminders and backup health checks, including last export time and estimated local storage usage.
- [ ] Add import preview before merge, showing new, duplicate, and conflicting entries.

#### Markdown and Editing

- [ ] Improve Markdown editing with toolbar actions for headings, bold, links, lists, code blocks, and task lists.
- [ ] Add split-view Markdown preview on larger screens while keeping the current edit/preview toggle on narrow screens.
- [ ] Add local search inside the active draft, including match count and next/previous navigation.
- [ ] Add reusable note templates for common temporary-note formats such as meeting notes, daily logs, and task lists.

#### Optional LLM Features

- [ ] Add AI-assisted draft actions such as summarize, polish, continue writing, extract tasks, and generate tags using the optional LLM configuration.
- [ ] Add per-action confirmation showing which text will be sent before any LLM request.
- [ ] Add model capability notes in Settings so users understand which configured models are suitable for summarization, rewriting, or transcription.
- [ ] Keep all LLM features default-off, user-triggered, and routed only through the user-configured OpenAI-compatible provider.

#### Sync and Platform

- [ ] Add optional sync with user-configured server `POST`/`GET` endpoints, disabled by default and separated from local-only usage.
- [ ] Add a lightweight Python server component with basic data receive/read APIs + CORS support for self-hosted sync.
- [ ] Add conflict handling for sync, including local-first merge rules and a manual conflict review screen.
- [ ] Consider PWA support for installability, offline launch, and mobile-friendly capture workflows.
- [ ] Add browser compatibility checks for recording, attachment storage, and large IndexedDB payloads.

### Adding New Features

1. Add a new UI component
   - Write styles in `css/components.css`
   - Add focused rendering logic in `js/ui/`
   - Use `ui/ui-controller.js` only for shared UI feedback and metadata

2. Add a new business feature
   - Put the core flow in `js/services/`
   - Keep `app-controller.js` as the coordinator
   - Bind DOM events in `bootstrap/bind-events.js`

3. Add new storage data
   - Add load/save methods in `js/storage/`
   - Define new storage keys in `constants.js`
   - Export shared storage helpers through `storage.js` when needed

4. Add new utility helpers
   - Implement focused helpers in `js/lib/`
   - Export public helper surfaces through `utils.js` when needed

### Adding a New CSS Theme

```css
/* Add a new theme in css/theme.css */
[data-theme="custom"] {
  --bg: #your-color;
  --text: #your-color;
  /* ... other variables ... */
}
```

## 💡 Best Practices

1. Module independence: each JS module handles a single responsibility.
2. Input validation: validate all public API inputs.
3. Error handling: use try-catch around critical operations.
4. Performance: debounced draft save (250ms).
5. Accessibility: keep semantic HTML structure.

## 🐛 Known Limitations

- Browser storage size limits (typically 5-10MB)
- No offline sync
- Single-tab usage recommended (multi-tab may conflict)

## 📦 Browser Compatibility

- Chrome/Edge 85+
- Firefox 78+
- Safari 14+
- ES6 module support required

## 📄 License

**AGPL-3.0 (GNU Affero General Public License v3.0)**

- All modifications must be open sourced.
- Commercial usage must open source the full code.
- Network service usage is also covered.

See the [LICENSE](LICENSE) file for details.

## 🤝 Commercial Licensing

If you need commercial licensing or a different license agreement, please visit:

**https://imagingmodel.com/**

Contact us to discuss commercial license options or cooperation.

---

**Developer**: MuYYY @ Chengdu Insaite Technology Co., Ltd.  
**Latest version**: 1.1.0  
**License**: AGPL-3.0  
**AI usage**: This project was built with AI assistance. Some code was AI-generated, then reviewed and edited manually. The documents in `./doc` were generated to help AI understand the project and should be treated as reference material, which have not been manually edited.  

## Welcome to open issues, feature requests, and PRs on GitHub!
