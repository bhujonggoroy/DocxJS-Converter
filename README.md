# NotebookLM to DOCX Converter

A lightweight, fully static, client-side web application designed to convert messy study notes, raw formulas, and LaTeX from **Google NotebookLM** into clean, beautifully styled Microsoft Word (`.docx`) documents with native Unicode mathematical notation.

Runs entirely in your browser — **no Node.js, no backend, no server required.**

---

## 🌟 Features

- **LaTeX to Clean Unicode Math**: Automatically translates raw LaTeX syntax (`$E = mc^2$`, `\frac{a}{b}`, `\sqrt{x}`, `\int`, `\sum`, Greek letters) into readable Unicode characters (`E = mc²`, `a/b`, `√x`, `∫`, `∑`, `α`, `β`, `θ`) that display seamlessly in Microsoft Word, Google Docs, Apple Pages, and mobile office viewers without requiring external equation plugins.
- **Academic Markdown Structuring**: Restructures unstructured lecture notes into organized headings (`# Heading 1`, `## Heading 2`, `### Subtopic`), bulleted lists, numbered step sequences, bold key terms, and formula callouts while **strictly preserving 100% of your notes' original content**.
- **Real In-Browser `.docx` Generation**: Uses the client-side `docx.js` library to generate true Word documents with professional margins, typography, heading hierarchy, and line spacing.
- **Direct Browser Download**: Converts and downloads directly via browser Blob APIs.
- **Document & Markdown Preview**: Review formatted notes or copy cleaned Markdown text with a single click before or after downloading.
- **100% Client-Side Privacy**: Your Gemini API key is saved exclusively in your browser's local storage (`localStorage`) and sent directly to Google's official Gemini API endpoint over encrypted HTTPS.

---

## 🚀 Free Deployment to GitHub Pages

Because this application consists of static files with zero build steps or server dependencies, it can be deployed to **GitHub Pages** in under 60 seconds:

1. **Fork or Push** this repository to your GitHub account.
2. In your repository on GitHub, navigate to:
   **Settings** &rarr; **Pages** (in the left sidebar).
3. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` (or your default branch) and `/ (root)`.
   - Click **Save**.
4. GitHub Pages will build and provide you with a live URL (e.g., `https://<your-username>.github.io/<repo-name>/`).

> **Note**: You can also run the application offline or locally simply by double-clicking `index.html` in any modern web browser!

---

## 🔑 Getting a Free Gemini API Key

This app calls Google's **Gemini 2.0 Flash** API directly from your browser:

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google Account.
3. Click **"Get API key"** and create a new key in an existing or new Google Cloud project.
4. Copy your API key (starts with `AIzaSy...`).
5. Open the NotebookLM to DOCX app, paste the key into the Gemini API Key input field, and click **"Save Key"**.

---

## 🔒 Security & Privacy Notice

- **Local Storage Only**: Your API key is stored only on your computer in your browser's `localStorage` under the key `notebooklm_gemini_api_key`.
- **Direct Communication**: When you click *Convert*, your browser calls `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=...` directly.
- **No Middleman Server**: There is no proxy server, telemetry tracker, or backend database. No third party ever sees your API key or study notes.

---

## 🛠️ Tech Stack

- **Frontend**: Plain HTML5, CSS3 (Modern Flexbox & CSS Grid, responsive design), Vanilla JavaScript.
- **AI Processing**: Google Gemini API (`gemini-2.0-flash` / `gemini-2.5-flash`) via browser `fetch()`.
- **Document Generation**: [`docx.js`](https://docx.js.org/) loaded via CDN (`jsdelivr`).
- **Typography**: Google Fonts (*Plus Jakarta Sans* & *JetBrains Mono*).

---

## 📄 License

MIT License. Free for academic, personal, and commercial use.
