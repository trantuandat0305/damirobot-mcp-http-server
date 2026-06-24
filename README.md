# DAMI Robot MCP HTTP Server v0.1.1

Server adapter HTTP/Streamable HTTP/SSE để kết nối imcp/Xiaozhi với Moodle DAMI API.

## Điểm mới v0.1.1

- `/mcp` hỗ trợ `POST` JSON-RPC để gọi MCP.
- `/mcp` cũng hỗ trợ `GET` dạng SSE để một số MCP client có thể discover schema.
- `/sse` hỗ trợ SSE fallback.
- Protocol version trả về `2025-03-26`.
- Giữ đủ 11 tools, gồm `get_student_fulltest_history`.

## Deploy Render

- Build Command: `yarn install` hoặc `npm install`
- Start Command: `node src/server.js` hoặc `npm start`
- Env:
  - `VOICE=1`
  - `MOODLE_BASE_URL=https://elearning.anhngumsmy.com`
  - `MOODLE_API_TOKEN=TOKEN_MOODLE_CUA_BAN`
  - `MOODLE_TOOL_ENDPOINT=https://elearning.anhngumsmy.com/local/damirobot_api/api/tool.php`
  - `DEFAULT_COURSEID=4`
  - `REQUEST_TIMEOUT_MS=15000`

Không cần thêm `PORT` trên Render.

## URL

Health:

```text
https://ten-app.onrender.com/health
```

Streamable HTTP:

```text
https://ten-app.onrender.com/mcp
```

SSE fallback:

```text
https://ten-app.onrender.com/sse
```

## Tools

- `test_connection`
- `find_student`
- `get_student_summary`
- `get_student_attendance`
- `get_missing_homework`
- `get_student_suspend_status`
- `get_student_dami_status`
- `get_student_latest_scores`
- `get_student_goal_status`
- `get_student_fulltest_history`
- `get_course_risk_students`
