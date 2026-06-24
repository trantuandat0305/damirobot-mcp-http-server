# DAMI Robot MCP HTTP Server v0.1.0

Server adapter HTTP/Streamable HTTP để kết nối imcp/Xiaozhi với Moodle DAMI API.

## Chạy local

```bash
cp .env.example .env
npm install
npm start
```

Test:

```bash
curl http://localhost:3000/health
```

## Deploy Render

- Build Command: `npm install`
- Start Command: `npm start`
- Env:
  - `PORT` = Render tự set, có thể không cần thêm
  - `VOICE=1`
  - `MOODLE_BASE_URL=https://elearning.anhngumsmy.com`
  - `MOODLE_API_TOKEN=TOKEN_MOODLE_CUA_BAN`
  - `MOODLE_TOOL_ENDPOINT=https://elearning.anhngumsmy.com/local/damirobot_api/api/tool.php`
  - `DEFAULT_COURSEID=4`
  - `REQUEST_TIMEOUT_MS=15000`

## URL dùng trên imcp

Streamable HTTP:

```text
https://ten-app.onrender.com/mcp
```

Health:

```text
https://ten-app.onrender.com/health
```

## Tool có sẵn

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

## Ghi chú an toàn

Server này chỉ gọi API read-only của Moodle. Không chứa token trong code. Không sửa/xóa/đình chỉ/check-in/feed DAMI.
