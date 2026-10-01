# Mock Interview AI

A React web app for realistic mock interviews. It runs in **Chrome or Edge on Windows and macOS**.

1. **Profile** – 10th, 12th/Diploma, UG, PG and PhD stream + score (percentage or CGPA), then upload your CV (PDF / DOCX / TXT).
2. **CV analysis** – CV scores (ATS, clarity, impact, formatting, relevance), strengths, weaknesses, red flags, fixes, and a comment on your academic trend.
3. **Setup** – pick **Beginner** (fresher), **Intermediate** (2-3 yrs) or **Hard** (8+ yrs). Technical round is up to **90 min** and HR round up to **15 min**. Includes a camera, mic and voice check.
4. **Technical round** – the laptop **speaks each question**, your spoken answer is transcribed live, and the **camera** tracks eye contact, face presence, extra faces and expressions. About 65% of the questions come **from your CV**, and the interviewer asks follow-ups. Software roles also get **FAANG coding problems** in a built-in code editor, tagged with the companies known to ask them.
5. **HR round** – a separate behavioural round (STAR questions, CV gaps, academic dips, motivation).
6. **Report** – overall score and hire verdict, per-area scores, a review of every question with a model answer, communication and body-language analysis, a CV review and a study plan. **Download it as a PDF.**

## Run it

You need **Node.js 18+** (https://nodejs.org).

**Windows:** double-click `start-windows.bat`.
**macOS:** run `chmod +x start-mac.command` once, then double-click `start-mac.command`.

Or from a terminal:

```bash
npm install
npm start
```

Then open http://localhost:5173 in **Chrome** or **Edge** and allow camera and microphone access.

## AI engine

| Mode | What you get |
| --- | --- |
| **Offline mode** (no key) | Rule-based CV analysis, questions from the built-in FAANG bank plus your CV's skills and projects, and **estimated** scoring by key-point coverage. |
| **Gemini** (free key) | Real AI CV review, questions and follow-ups generated from your CV, answer-by-answer evaluation, and a detailed report with model answers. |

To switch to Gemini, get a free key at https://aistudio.google.com/apikey and paste it in **⚙ Settings**. You can also put `VITE_GEMINI_API_KEY=...` (and optionally `VITE_GEMINI_MODEL=...`) in a `.env` file. Restart the app after editing `.env`.

- The default model is `gemini-flash-latest`, which always points to Google's current flash model. (`gemini-2.5-flash` is retired for new keys.)
- If a model is busy (503), rate-limited (429) or retired (404), the app automatically tries the other flash models your key can use, and keeps using whichever one answers.
- If every model is busy, you get **Retry** and **Continue in Offline mode** buttons. Click the "Offline (Gemini busy)" pill in the header later to switch back to AI.

## Privacy

- Webcam video is analysed **on your computer** (MediaPipe) and is never uploaded or recorded.
- In Gemini mode, your CV, profile and answer transcripts are sent to Google's Gemini API.
- Speech recognition uses the browser's built-in service, which in Chrome and Edge runs online.
- No interview history is stored. Download the PDF if you want to keep your report.

## Notes

- Speech recognition needs Chrome or Edge. In other browsers you can type your answers.
- Headphones help, because otherwise the microphone can pick up the interviewer's voice.
- Body-language numbers are heuristics meant as practice feedback, not a precise measurement.
