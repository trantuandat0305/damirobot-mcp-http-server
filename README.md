# DAMI Robot MCP HTTP Server v0.1.2

Server adapter HTTP/Streamable HTTP/SSE để kết nối imcp/Xiaozhi với Moodle DAMI API.

## Điểm chính

- `/mcp` hỗ trợ `POST` JSON-RPC để gọi MCP.
- `/mcp` hỗ trợ `GET` dạng SSE để client discover schema.
- `/sse` hỗ trợ SSE fallback.
- Giữ đủ 11 tools, gồm `get_student_fulltest_history`.
- Tất cả tool dữ liệu học viên đều có khóa `speakerId` bắt buộc trước khi gọi Moodle.

## Speaker authorization gate

- `speakerId` thiếu/null/không hợp lệ → từ chối.
- Các giá trị rác như `null`, `undefined`, `unknown`, `anonymous`, `guest`, `none` → từ chối.
- Chỉ đọc `params.speakerId` hoặc `_meta.speakerId`; không tin `arguments.speakerId`.
- `ALLOWED_SPEAKER_IDS` để trống → chấp nhận mọi `speakerId` hợp lệ do Xiaozhi nhận diện.
- Nếu cấu hình `ALLOWED_SPEAKER_IDS=id_1,id_2` → chỉ đúng các ID đó được phép.
- `test_connection` không đọc dữ liệu học viên nên vẫn được phép chạy không cần speaker.

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
  - `ALLOWED_SPEAKER_IDS=` để trống nếu muốn tự động cho phép mọi diễn giả đã được Xiaozhi nhận diện

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
