/**
 * Shared Google Sheets client for Netlify Functions.
 * Uses GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY from env.
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SHEET_NAMES = { TASKS: 'Tasks', COLOR_TAGS: 'ColorTags', SCORE_HISTORY: 'ScoreHistory' };

function getPrivateKey() {
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!key) return null;
  return key.replace(/\\n/g, '\n');
}

function getDoc() {
  const sheetId = process.env.GOOGLE_SHEET_ID || process.env.SHEETS_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = getPrivateKey();
  if (!sheetId || !email || !key) {
    throw new Error('Missing GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, or GOOGLE_PRIVATE_KEY');
  }
  const auth = new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return new GoogleSpreadsheet(sheetId, auth);
}

function taskToRow(t) {
  return {
    id: t.id || '',
    text: t.text || '',
    color: t.color || '',
    bucket: t.bucket || '',
    done: t.done ? '1' : '0',
    points: String(t.points ?? 1),
    createdAt: t.createdAt != null ? String(t.createdAt) : '',
    due: t.due || '',
    notes: t.notes || '',
    subtasks: typeof t.subtasks === 'string' ? t.subtasks : JSON.stringify(t.subtasks || []),
    recur: t.recur || 'none',
    completedAt: t.completedAt != null ? String(t.completedAt) : '',
    snoozedUntil: t.snoozedUntil != null ? String(t.snoozedUntil) : '',
    starred: t.starred ? '1' : '0',
  };
}

function rowToTask(row) {
  const get = (k) => (row.get && row.get(k)) ?? row[k];
  const subtasksRaw = get('subtasks');
  let subtasks = [];
  if (subtasksRaw) {
    try {
      subtasks = JSON.parse(subtasksRaw);
    } catch (_) {
      subtasks = [];
    }
  }
  return {
    id: get('id') || '',
    text: get('text') || '',
    color: get('color') || 'gray',
    bucket: get('bucket') || 'tasks',
    done: get('done') === '1' || get('done') === true,
    points: parseInt(get('points'), 10) || 1,
    createdAt: parseInt(get('createdAt'), 10) || Date.now(),
    due: get('due') || null,
    notes: get('notes') || '',
    subtasks: Array.isArray(subtasks) ? subtasks : [],
    recur: get('recur') || 'none',
    completedAt: (v => { const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; })(get('completedAt')),
    snoozedUntil: (v => { const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; })(get('snoozedUntil')),
    starred: get('starred') === '1' || get('starred') === true,
  };
}

function colorToRow(c) {
  return { id: c.id || '', label: c.label || '', bg: c.bg || '', border: c.border || '', dot: c.dot || '' };
}

function rowToColor(row) {
  const get = (k) => (row.get && row.get(k)) ?? row[k];
  return {
    id: get('id') || '',
    label: get('label') || '',
    bg: get('bg') || '',
    border: get('border') || '',
    dot: get('dot') || '',
  };
}

async function ensureSheetsAndHeaders(doc) {
  const taskHeaders = ['id','text','color','bucket','done','points','createdAt','due','notes','subtasks','recur','completedAt','snoozedUntil','starred'];
  const colorHeaders = ['id','label','bg','border','dot'];
  const scoreHeaders = ['date','score'];
  if (!doc.sheetsByTitle[SHEET_NAMES.TASKS]) {
    await doc.addSheet({ title: SHEET_NAMES.TASKS, headerValues: taskHeaders });
  } else if (doc.sheetsByTitle[SHEET_NAMES.TASKS].rowCount === 0) {
    await doc.sheetsByTitle[SHEET_NAMES.TASKS].setHeaderRow(taskHeaders);
  }
  if (!doc.sheetsByTitle[SHEET_NAMES.COLOR_TAGS]) {
    await doc.addSheet({ title: SHEET_NAMES.COLOR_TAGS, headerValues: colorHeaders });
  } else if (doc.sheetsByTitle[SHEET_NAMES.COLOR_TAGS].rowCount === 0) {
    await doc.sheetsByTitle[SHEET_NAMES.COLOR_TAGS].setHeaderRow(colorHeaders);
  }
  if (!doc.sheetsByTitle[SHEET_NAMES.SCORE_HISTORY]) {
    await doc.addSheet({ title: SHEET_NAMES.SCORE_HISTORY, headerValues: scoreHeaders });
  } else if (doc.sheetsByTitle[SHEET_NAMES.SCORE_HISTORY].rowCount === 0) {
    await doc.sheetsByTitle[SHEET_NAMES.SCORE_HISTORY].setHeaderRow(scoreHeaders);
  }
}

async function ensureHeaders(doc) {
  await ensureSheetsAndHeaders(doc);
}

async function fetchAll(doc) {
  await doc.loadInfo();
  await ensureHeaders(doc);
  const tasksSheet = doc.sheetsByTitle[SHEET_NAMES.TASKS];
  const colorSheet = doc.sheetsByTitle[SHEET_NAMES.COLOR_TAGS];
  const scoreSheet = doc.sheetsByTitle[SHEET_NAMES.SCORE_HISTORY];
  const tasks = [];
  const colors = [];
  const scoreHistory = {};
  if (tasksSheet) {
    const rows = await tasksSheet.getRows();
    for (const row of rows) {
      const t = rowToTask(row);
      if (t.id) tasks.push(t);
    }
  }
  if (colorSheet) {
    const rows = await colorSheet.getRows();
    for (const row of rows) {
      const c = rowToColor(row);
      if (c.id) colors.push(c);
    }
  }
  if (scoreSheet) {
    const rows = await scoreSheet.getRows();
    for (const row of rows) {
      const date = row.get ? row.get('date') : row.date;
      const score = row.get ? row.get('score') : row.score;
      if (date) scoreHistory[String(date)] = parseInt(score, 10) || 0;
    }
  }
  return { tasks, colors, scoreHistory };
}

async function appendTask(doc, task) {
  await doc.loadInfo();
  await ensureHeaders(doc);
  const sheet = doc.sheetsByTitle[SHEET_NAMES.TASKS];
  if (!sheet) throw new Error('Tasks sheet not found');
  await sheet.addRow(taskToRow(task));
}

async function updateTask(doc, id, patch) {
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[SHEET_NAMES.TASKS];
  if (!sheet) throw new Error('Tasks sheet not found');
  const rows = await sheet.getRows();
  const row = rows.find((r) => (r.get ? r.get('id') : r.id) === id);
  if (!row) return false;
  const full = rowToTask(row);
  const updated = { ...full, ...patch };
  const data = taskToRow(updated);
  Object.keys(data).forEach((key) => {
    if (row.set) row.set(key, data[key]);
    else row[key] = data[key];
  });
  await row.save();
  return true;
}

async function deleteTask(doc, id) {
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[SHEET_NAMES.TASKS];
  if (!sheet) throw new Error('Tasks sheet not found');
  const rows = await sheet.getRows();
  const row = rows.find((r) => (r.get ? r.get('id') : r.id) === id);
  if (!row) return false;
  await row.delete();
  return true;
}

async function replaceTasks(doc, tasks) {
  await doc.loadInfo();
  await ensureHeaders(doc);
  const sheet = doc.sheetsByTitle[SHEET_NAMES.TASKS];
  if (!sheet) throw new Error('Tasks sheet not found');
  const rows = await sheet.getRows();
  for (let i = rows.length - 1; i >= 0; i--) await rows[i].delete();
  if (tasks.length) await sheet.addRows(tasks.map(taskToRow));
}

async function replaceColors(doc, colors) {
  await doc.loadInfo();
  await ensureHeaders(doc);
  const sheet = doc.sheetsByTitle[SHEET_NAMES.COLOR_TAGS];
  if (!sheet) throw new Error('ColorTags sheet not found');
  const rows = await sheet.getRows();
  for (let i = rows.length - 1; i >= 0; i--) await rows[i].delete();
  if (colors.length) await sheet.addRows(colors.map(colorToRow));
}

async function setScoreHistory(doc, scoreHistory) {
  await doc.loadInfo();
  await ensureHeaders(doc);
  const sheet = doc.sheetsByTitle[SHEET_NAMES.SCORE_HISTORY];
  if (!sheet) throw new Error('ScoreHistory sheet not found');
  const rows = await sheet.getRows();
  for (let i = rows.length - 1; i >= 0; i--) await rows[i].delete();
  const entries = Object.entries(scoreHistory).map(([date, score]) => ({ date, score: String(score) }));
  if (entries.length) await sheet.addRows(entries);
}

module.exports = {
  getDoc,
  fetchAll,
  appendTask,
  updateTask,
  deleteTask,
  replaceTasks,
  replaceColors,
  setScoreHistory,
  rowToTask,
  taskToRow,
};
