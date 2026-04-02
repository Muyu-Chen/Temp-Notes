# Temp Notes - A Fully Offline Private Draft App 📝

这是一个 100% 完全离线运行的临时笔记应用，支持快速草稿、条目存档、导入导出。所有数据仅保存在本地浏览器，零网络请求、零隐私泄露。

This is a 100% fully offline temporary note app for quick drafts, entry archiving, and import/export. All data stays in your local browser with zero network requests and zero privacy leakage.

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

- Fully offline: 100% local browser execution, zero network connection
- Open source: all JavaScript files are open, with no hidden network requests
- Local storage only: notes are stored in LocalStorage/IndexedDB
- Never uploaded: your data is never sent anywhere
- No tracking: no analytics, no cookies, no hidden connections
- Tips: there is an `llm api` configuration option in settings, but this feature is currently in design only and makes no network requests. Future plans may support third-party LLM APIs (such as OpenAI), while `base_url`/`api_key` are user-provided and user-stored only. LLM features are disabled by default.

### Privacy Details

In the JavaScript codebase:

- No `fetch()` requests
- No `XMLHttpRequest`
- No `WebSocket` connections
- No external resource dependencies required for offline usage
- Only local LocalStorage/IndexedDB operations

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
│   ├── main.js             # App entry + event binding
│   ├── constants.js        # Constant definitions
│   ├── utils.js            # Utility functions
│   ├── storage.js          # Storage management
│   ├── dom-manager.js      # DOM access wrapper
│   ├── ui-controller.js    # UI rendering + feedback
│   ├── app-controller.js   # Core business logic
│   ├── modal.js            # Common modal component
│   └── initialize.js       # App state initialization
├── index.html              # App entry page
├── README.md               # English documentation
└── readme-chinese.md       # Chinese documentation
```

## Architecture

### Layered Design

1. Presentation layer
   - `ui-controller.js`: UI rendering and state display
   - `css/*`: all style files

2. Business logic layer
   - `app-controller.js`: core business flows
   - `constants.js`: business constants

3. Data access layer
   - `storage.js`: LocalStorage/IndexedDB operations
   - `dom-manager.js`: DOM operations

4. Utilities layer
   - `utils.js`: common helper functions

### Module Responsibilities

| Module | Responsibility | Exports |
|------|------|------|
| `constants.js` | Constant definitions | `STORAGE_KEYS`, `THEMES`, `DEFAULT_THEME` |
| `utils.js` | Helper functions | Time format, word count, byte conversion, etc. |
| `storage.js` | Storage management | Load/save, import/export handling |
| `dom-manager.js` | DOM management | `DOMManager` class |
| `ui-controller.js` | UI control | `UIController` class |
| `app-controller.js` | Business logic | `AppController` class |
| `main.js` | App bootstrap | Initialization + event binding |
| `modal.js` | Modal UI | `Modal` class |
| `initialize.js` | Initialization logic | `initializeAppState` function |

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

### Keyboard Shortcuts

- `Ctrl+S`: Save current draft
- `Ctrl+K`: Search archived entries
- `Ctrl+L`: Clear draft

## Data Flow

```text
User input
   ↓
Captured by DOMManager
   ↓
Processed by AppController
   ↓
Persisted by Storage + rendered by UIController
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
- 📥 Import from JSON (merge + dedup supported)
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
- [x] Introduced `initialize.js` to improve first-open bootstrap behavior.

### TODO - Planned

- [ ] Remember password after decryption for optional auto-fill next time.
- [ ] Auto-clean expired archive entries (e.g., older than 30 days).
- [ ] Add recycle bin auto-expiry (similar to recently deleted in photo apps).
- [ ] Support image attachment and storage.
- [ ] Add optional sync feature with user-configured server `POST`/`GET` endpoints (default off).
- [ ] Add a lightweight Python server component with basic data receive/read APIs + CORS support.

### Adding New Features

1. Add a new UI component
   - Write styles in `css/components.css`
   - Add rendering logic in `ui-controller.js`

2. Add a new business feature
   - Implement methods in `app-controller.js`
   - Bind events in `main.js`

3. Add new storage data
   - Add load/save methods in `storage.js`
   - Define new storage keys in `constants.js`

4. Add new utility helpers
   - Implement and export in `utils.js`

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

**Developer**: MuYYY @ Chengdu Insait Technology Co., Ltd.
**Latest version**: 1.1.0
**License**: AGPL-3.0
**AI usage**: This project was built with AI assistance. Some code was AI-generated, then reviewed and edited manually. The documents in `./doc` were generated to help AI understand the project and should be treated as reference material.

## Welcome to open issues, feature requests, and PRs on GitHub!