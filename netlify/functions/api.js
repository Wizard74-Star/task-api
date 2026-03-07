import {
  getDoc,
  fetchAll,
  appendTask,
  updateTask,
  deleteTask,
  replaceTasks,
  replaceColors,
  setScoreHistory,
} from './sheets.js';

const DATA_CACHE_TTL_MS = 50 * 1000;
let dataCache = null;
let dataCacheTime = 0;

function invalidateDataCache() {
  dataCache = null;
  dataCacheTime = 0;
}

function jsonResponse(body, status = 200) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

export const handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' }, body: '' };
  }

  const rawPath = event.path || '';
  const path = (rawPath.replace(/^\/api/, '').replace(/^\/.netlify\/functions\/api/, '') || '/').split('?')[0];
  const method = event.httpMethod || 'GET';
  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (_) {
    body = {};
  }

  try {
    let doc;
    try {
      doc = getDoc();
    } catch (configErr) {
      console.error('Sheets config error:', configErr.message);
      return errorResponse('Sheets config missing: set GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY in Netlify env', 500);
    }

    if (path === '/data' && method === 'GET') {
      const now = Date.now();
      if (dataCache != null && now - dataCacheTime < DATA_CACHE_TTL_MS) {
        return jsonResponse(dataCache);
      }
      await doc.loadInfo();
      const data = await fetchAll(doc);
      dataCache = data;
      dataCacheTime = now;
      return jsonResponse(data);
    }

    await doc.loadInfo();

    if (path === '/tasks' && method === 'POST') {
      const task = body.task || body;
      if (!task.id || !task.text) return errorResponse('task.id and task.text required', 400);
      await appendTask(doc, task);
      invalidateDataCache();
      return jsonResponse({ ok: true });
    }

    if (path === '/tasks/update' && method === 'POST') {
      const { id, patch } = body;
      if (!id) return errorResponse('id required', 400);
      const ok = await updateTask(doc, id, patch || {});
      invalidateDataCache();
      return jsonResponse({ ok });
    }

    if (path === '/tasks/delete' && method === 'POST') {
      const id = body.id;
      if (!id) return errorResponse('id required', 400);
      const ok = await deleteTask(doc, id);
      invalidateDataCache();
      return jsonResponse({ ok });
    }

    if (path === '/tasks/replace' && method === 'POST') {
      const tasks = body.tasks || body;
      if (!Array.isArray(tasks)) return errorResponse('tasks array required', 400);
      await replaceTasks(doc, tasks);
      invalidateDataCache();
      return jsonResponse({ ok: true });
    }

    if (path === '/colors' && method === 'POST') {
      const colors = body.colors || body;
      if (!Array.isArray(colors)) return errorResponse('colors array required', 400);
      await replaceColors(doc, colors);
      invalidateDataCache();
      return jsonResponse({ ok: true });
    }

    if (path === '/score-history' && method === 'POST') {
      const scoreHistory = body.scoreHistory || body;
      if (typeof scoreHistory !== 'object' || scoreHistory === null) return errorResponse('scoreHistory object required', 400);
      await setScoreHistory(doc, scoreHistory);
      invalidateDataCache();
      return jsonResponse({ ok: true });
    }

    return errorResponse('Not found', 404);
  } catch (err) {
    console.error('API error:', err);
    const msg = err.message || 'Server error';
    const status = err.response?.status === 429 ? 429 : err.code === 403 ? 403 : 500;
    return errorResponse(msg, status);
  }
};
