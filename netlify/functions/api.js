const {
  getDoc,
  fetchAll,
  appendTask,
  updateTask,
  deleteTask,
  replaceColors,
  setScoreHistory,
} = require('./sheets.js');

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

exports.handler = async (event, context) => {
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
    const doc = getDoc();
    await doc.loadInfo();

    if (path === '/data' && method === 'GET') {
      const data = await fetchAll(doc);
      return jsonResponse(data);
    }

    if (path === '/tasks' && method === 'POST') {
      const task = body.task || body;
      if (!task.id || !task.text) return errorResponse('task.id and task.text required', 400);
      await appendTask(doc, task);
      return jsonResponse({ ok: true });
    }

    if (path === '/tasks/update' && method === 'POST') {
      const { id, patch } = body;
      if (!id) return errorResponse('id required', 400);
      const ok = await updateTask(doc, id, patch || {});
      return jsonResponse({ ok });
    }

    if (path === '/tasks/delete' && method === 'POST') {
      const id = body.id;
      if (!id) return errorResponse('id required', 400);
      const ok = await deleteTask(doc, id);
      return jsonResponse({ ok });
    }

    if (path === '/tasks/replace' && method === 'POST') {
      const tasks = body.tasks || body;
      if (!Array.isArray(tasks)) return errorResponse('tasks array required', 400);
      await require('./sheets.js').replaceTasks(doc, tasks);
      return jsonResponse({ ok: true });
    }

    if (path === '/colors' && method === 'POST') {
      const colors = body.colors || body;
      if (!Array.isArray(colors)) return errorResponse('colors array required', 400);
      await replaceColors(doc, colors);
      return jsonResponse({ ok: true });
    }

    if (path === '/score-history' && method === 'POST') {
      const scoreHistory = body.scoreHistory || body;
      if (typeof scoreHistory !== 'object' || scoreHistory === null) return errorResponse('scoreHistory object required', 400);
      await setScoreHistory(doc, scoreHistory);
      return jsonResponse({ ok: true });
    }

    return errorResponse('Not found', 404);
  } catch (err) {
    console.error(err);
    return errorResponse(err.message || 'Server error', 500);
  }
};
