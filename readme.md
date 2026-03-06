# T2D Task Manager

React task app with Google Sheets as the database, deployed on Netlify.

## Google Sheets setup

1. Create a new Google Sheet (or use an existing one).
2. Share the sheet with your **service account email** (e.g. `sheets-access@task-manager-api-489421.iam.gserviceaccount.com`) with **Editor** access.
3. Copy the **Sheet ID** from the URL: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`
4. The app will create three worksheets automatically if they’re missing: **Tasks**, **ColorTags**, **ScoreHistory**.

## Environment variables

Set these in **Netlify → Site settings → Environment variables** (and in `.env` for local dev):

| Variable | Description |
|----------|-------------|
| `GOOGLE_SHEET_ID` | The spreadsheet ID from the sheet URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | From your service account JSON (`client_email`) |
| `GOOGLE_PRIVATE_KEY` | From your service account JSON (`private_key`). In Netlify you can paste the key with real newlines or with `\n`; the code accepts both. |

**Do not** commit `.env` or any file that contains the private key.

## Local development

```bash
npm install
npm run dev
```

To hit the real API locally, run Netlify Dev so `/api` is proxied to the functions:

```bash
npx netlify dev
```

Then open the URL it prints (e.g. http://localhost:8888). Set `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_PRIVATE_KEY` in `.env` for local runs.

## Deploy to Netlify

1. Connect the repo to Netlify (or drag-and-drop the `dist` folder after `npm run build`).
2. **Build command:** `npm run build`
3. **Publish directory:** `dist`
4. **Functions directory:** `netlify/functions` (optional; Netlify often detects it.)
5. Add the three environment variables above in the Netlify dashboard.

## API (backend)

All Google Sheets access runs in Netlify Functions; credentials never go to the browser.

- `GET /api/data` — returns `{ tasks, colors, scoreHistory }`
- `POST /api/tasks` — body `{ task }` — create task
- `POST /api/tasks/update` — body `{ id, patch }` — update task
- `POST /api/tasks/delete` — body `{ id }` — delete task
- `POST /api/tasks/replace` — body `{ tasks }` — replace all tasks
- `POST /api/colors` — body `{ colors }` — replace color tags
- `POST /api/score-history` — body `{ scoreHistory }` — replace score history

The frontend polls `GET /api/data` every 3 seconds so changes from other devices appear within a few seconds.
