#!/usr/bin/env node

import http from 'node:http';
import { URL } from 'node:url';

const VERSION = '0.1.0';
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_COURSEID = process.env.DEFAULT_COURSEID || '4';
const DEFAULT_VOICE = process.env.VOICE || '1';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000);

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function getMoodleEndpoint() {
  const explicit = env('MOODLE_TOOL_ENDPOINT');
  const base = env('MOODLE_BASE_URL').replace(/\/$/, '');
  if (explicit) {
    if (/^https?:\/\//i.test(explicit)) return explicit;
    return `${base}${explicit.startsWith('/') ? '' : '/'}${explicit}`;
  }
  return `${base}/local/damirobot_api/api/tool.php`;
}

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: '2.0', id: id ?? null, error };
}

const tools = [
  {
    name: 'test_connection',
    description: 'Kiểm tra kết nối tới Moodle DAMI API.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'find_student',
    description: 'Tìm học viên theo tên, email hoặc userid trong Moodle.',
    inputSchema: {
      type: 'object',
      properties: {
        student_name: { type: 'string', description: 'Tên học viên, ví dụ: Đặng Thị Hồng Hạnh' },
        email: { type: 'string', description: 'Email học viên nếu có' },
        userid: { type: ['string', 'number'], description: 'Moodle user id nếu biết chính xác' },
        courseid: { type: ['string', 'number'], description: 'Course id, mặc định 4' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'get_student_summary',
    description: 'Lấy tổng quan học tập của học viên: điểm danh, bài thiếu, tình trạng nick, điểm gần nhất, DAMI.',
    inputSchema: studentSchema()
  },
  {
    name: 'get_student_attendance',
    description: 'Lấy thông tin điểm danh, buổi nghỉ, đi muộn, C/D, học bù/khất nếu có.',
    inputSchema: studentSchema()
  },
  {
    name: 'get_missing_homework',
    description: 'Lấy danh sách bài online/homework còn thiếu của học viên.',
    inputSchema: studentSchema()
  },
  {
    name: 'get_student_suspend_status',
    description: 'Lấy tình trạng nick: bình thường, đình chỉ, bảo lưu, chờ xóa, đã mở lại.',
    inputSchema: studentSchema()
  },
  {
    name: 'get_student_dami_status',
    description: 'Lấy trạng thái DAMI: EXP, level, rank, giờ học, ngày học, streak.',
    inputSchema: studentSchema()
  },
  {
    name: 'get_student_latest_scores',
    description: 'Lấy điểm LR/Speaking/Writing/FULL TEST gần nhất và breakdown part yếu/mạnh nếu có.',
    inputSchema: studentSchema()
  },
  {
    name: 'get_student_goal_status',
    description: 'Lấy mục tiêu điểm thi và tiến độ so với mục tiêu.',
    inputSchema: studentSchema()
  },
  {
    name: 'get_student_fulltest_history',
    description: 'Lấy lịch sử FULL TEST/LR gần đây và xu hướng điểm nếu đủ dữ liệu.',
    inputSchema: {
      type: 'object',
      properties: {
        student_name: { type: 'string' },
        email: { type: 'string' },
        userid: { type: ['string', 'number'] },
        courseid: { type: ['string', 'number'] },
        limit: { type: ['string', 'number'], description: 'Số bài gần nhất, mặc định 3' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'get_course_risk_students',
    description: 'Lấy danh sách học viên có nguy cơ trong lớp/course: nghỉ nhiều, thiếu bài, điểm thấp hoặc tình trạng nick cần chú ý.',
    inputSchema: {
      type: 'object',
      properties: {
        courseid: { type: ['string', 'number'], description: 'Course id, mặc định 4' },
        limit: { type: ['string', 'number'], description: 'Số học viên tối đa' }
      },
      additionalProperties: false
    }
  }
];

function studentSchema() {
  return {
    type: 'object',
    properties: {
      student_name: { type: 'string', description: 'Tên học viên nếu chưa có userid' },
      email: { type: 'string', description: 'Email học viên nếu có' },
      userid: { type: ['string', 'number'], description: 'Moodle user id nếu biết chính xác' },
      courseid: { type: ['string', 'number'], description: 'Course id, mặc định 4' }
    },
    additionalProperties: false
  };
}

async function callMoodleTool(toolName, args = {}) {
  const endpoint = getMoodleEndpoint();
  const token = env('MOODLE_API_TOKEN');
  if (!token) {
    return {
      ok: false,
      reply_text: 'DAMI chưa được cấu hình token Moodle API.',
      emotion: 'confused',
      error: 'missing_moodle_api_token'
    };
  }

  const url = new URL(endpoint);
  url.searchParams.set('token', token);
  url.searchParams.set('tool', toolName);
  url.searchParams.set('voice', String(args.voice ?? DEFAULT_VOICE));

  const merged = { ...args };
  if (!merged.courseid && toolName !== 'test_connection') merged.courseid = DEFAULT_COURSEID;

  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === '') continue;
    if (key === 'voice') continue;
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, reply_text: text.slice(0, 2000), raw_text: text };
    }
    if (!res.ok) {
      data.ok = false;
      data.http_status = res.status;
      data.reply_text = data.reply_text || `Moodle API trả lỗi HTTP ${res.status}.`;
    }
    return data;
  } catch (err) {
    return {
      ok: false,
      reply_text: 'DAMI chưa kết nối được Moodle API. Cô kiểm tra lại server adapter hoặc token giúp em ạ.',
      emotion: 'confused',
      error: err?.name === 'AbortError' ? 'timeout' : 'request_failed',
      detail: err?.message || String(err)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleRpc(message) {
  const id = message?.id;
  const method = message?.method;
  const params = message?.params || {};

  if (!method) return jsonRpcError(id, -32600, 'Invalid Request');

  switch (method) {
    case 'initialize':
      return jsonRpcResult(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'damirobot-mcp-http-server', version: VERSION }
      });
    case 'notifications/initialized':
      return null;
    case 'ping':
      return jsonRpcResult(id, {});
    case 'tools/list':
      return jsonRpcResult(id, { tools });
    case 'tools/call': {
      const name = params.name;
      const args = params.arguments || {};
      if (!tools.some((tool) => tool.name === name)) {
        return jsonRpcError(id, -32602, `Unknown tool: ${name}`);
      }
      const data = await callMoodleTool(name, args);
      const text = data.reply_text || data.message || JSON.stringify(data, null, 2);
      return jsonRpcResult(id, {
        content: [{ type: 'text', text }],
        structuredContent: data,
        isError: data.ok === false
      });
    }
    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

function sendJson(res, status, body) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, mcp-session-id'
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return '';
  return Buffer.concat(chunks).toString('utf8');
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = requestUrl.pathname;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, mcp-session-id'
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && (path === '/' || path === '/health')) {
      sendJson(res, 200, {
        ok: true,
        name: 'damirobot-mcp-http-server',
        version: VERSION,
        mcp: '/mcp',
        tools: tools.length
      });
      return;
    }

    if (req.method === 'GET' && path === '/tools') {
      sendJson(res, 200, { tools: tools.map((tool) => tool.name) });
      return;
    }

    if (req.method === 'GET' && path === '/sse') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write(`event: endpoint\ndata: ${JSON.stringify({ url: '/mcp' })}\n\n`);
      res.write(`event: ready\ndata: ${JSON.stringify({ ok: true, tools: tools.length })}\n\n`);
      return;
    }

    if (req.method === 'POST' && path === '/mcp') {
      const body = await readBody(req);
      let message;
      try {
        message = JSON.parse(body || '{}');
      } catch {
        sendJson(res, 400, jsonRpcError(null, -32700, 'Parse error'));
        return;
      }
      if (Array.isArray(message)) {
        const responses = [];
        for (const item of message) {
          const response = await handleRpc(item);
          if (response) responses.push(response);
        }
        if (!responses.length) {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
          res.end();
          return;
        }
        sendJson(res, 200, responses);
        return;
      }
      const response = await handleRpc(message);
      if (!response || message.id === undefined) {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
        res.end();
        return;
      }
      sendJson(res, 200, response);
      return;
    }

    sendJson(res, 404, { ok: false, error: 'not_found', mcp: '/mcp', health: '/health' });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: 'server_error', detail: err?.message || String(err) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.error(`[DAMI MCP HTTP] listening on 0.0.0.0:${PORT}`);
});
