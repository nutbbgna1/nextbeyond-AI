(() => {
  "use strict";

  const app = document.getElementById("wr-app");
  const modal = document.getElementById("wr-modal");
  const modalTitle = document.getElementById("wr-modal-title");
  const modalBody = document.getElementById("wr-modal-body");
  if (!app) return;

  const API = "api/results.php";
  const assignmentId = parseInt(new URLSearchParams(window.location.search).get("id") || "0", 10);

  const TYPE_LABELS = {
    worksheet: "ใบงาน",
    practice: "แบบฝึก",
    homework: "การบ้าน",
    posttest: "Post-test",
    remediation: "ซ่อมเสริม",
    mastery_check: "วัดความเข้าใจ"
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  async function fetchApi(query) {
    const res = await fetch(`${API}?${query}`, { headers: { Accept: "application/json" } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || "ไม่สามารถโหลดข้อมูลได้");
    return data;
  }

  async function postAction(action, id) {
    const res = await fetch(`${API}?action=${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "worksheet" },
      body: JSON.stringify({ id })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || "ทำรายการไม่สำเร็จ");
    return data;
  }

  async function archiveAssignment(a) {
    const done = a.done_count || 0;
    const warn = done > 0
      ? `\n\nมีนักเรียนทำแล้ว ${done} คน คะแนนจะถูกเก็บไว้ในถังเก็บ แต่จะไม่แสดงในรายการและนักเรียนจะไม่เห็นงานนี้อีก`
      : "\n\nนักเรียนจะไม่เห็นงานนี้อีก";
    if (!confirm(`ลบ "${a.title}" ออกจากรายการ?${warn}\n(กู้คืนได้จาก "ถังเก็บ")`)) return;
    try {
      await postAction("archive", a.id);
      renderList();
    } catch (err) {
      alert(err.message);
    }
  }

  async function sendRetry(studentId) {
    const scope = studentId ? "ให้นักเรียนคนนี้" : "ให้ทุกคนที่ตอบผิดในข้อที่ผิดบ่อย";
    if (!confirm(`ยิงข้อสอบทบทวนจากข้อที่ตอบผิด ${scope} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`${API}?action=retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "worksheet" },
        body: JSON.stringify({ assignment_id: assignmentId, student_id: studentId || null })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "ยิงข้อสอบทบทวนไม่สำเร็จ");
      alert(data.duplicate
        ? "เคยยิงข้อสอบทบทวนชุดนี้ให้แล้ว ไม่ได้ส่งซ้ำ"
        : `ยิงข้อสอบทบทวนแล้ว ${data.question_count} ข้อ ถึง ${data.student_count} คน`);
    } catch (err) {
      alert(err.message);
    }
  }

  function formatDate(value) {
    if (!value) return "-";
    const d = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return escapeHtml(value);
    return d.toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function percentText(value) {
    return value === null || value === undefined ? "-" : `${Number(value).toFixed(0)}%`;
  }

  function fillClass(percent) {
    if (percent === null || percent === undefined) return "wr-fill-neutral";
    return percent >= 80 ? "wr-fill-good" : percent >= 60 ? "wr-fill-mid" : "wr-fill-bad";
  }

  function bar(percent, cls) {
    const width = Math.max(0, Math.min(100, Number(percent) || 0));
    return `<div class="wr-bar"><i class="${cls || fillClass(percent)}" style="width:${width}%"></i></div>`;
  }

  function stateBadge(state) {
    const map = {
      done: ["wr-b-done", "ส่งแล้ว"],
      late: ["wr-b-late", "ส่งช้า"],
      in_progress: ["wr-b-progress", "กำลังทำ"],
      not_started: ["wr-b-none", "ยังไม่ทำ"]
    };
    const [cls, label] = map[state] || map.not_started;
    return `<span class="wr-badge ${cls}">${label}</span>`;
  }

  // Answers are stored either as a choice key ("A") or as the full answer text.
  function answerLabel(answer, options) {
    const text = String(answer ?? "").trim();
    if (!text) return "";
    if (Array.isArray(options)) {
      const match = options.find(o => o && typeof o === "object" && String(o.key ?? "").trim() === text);
      if (match) return `${text}. ${match.text ?? ""}`;
    }
    return text;
  }

  // ── List view ────────────────────────────────────────────────
  async function renderTrash() {
    try {
      const { assignments } = await fetchApi("action=archived");
      const rows = assignments.map(a => `
        <tr>
          <td><div class="wr-strong">${escapeHtml(a.title)}</div><div class="wr-muted">${escapeHtml(a.course_title || "ไม่ระบุคอร์ส")}</div></td>
          <td class="wr-num">${a.submissions} ครั้ง</td>
          <td>${formatDate(a.created_at)}<div class="wr-muted">${escapeHtml(a.assigned_by_name || "")}</div></td>
          <td class="wr-act"><button type="button" class="wr-restore" data-restore="${a.id}">กู้คืน</button> <button type="button" class="wr-restore wr-purge" data-purge="${a.id}" data-title="${escapeHtml(a.title)}" data-n="${a.submissions}">ลบถาวร</button></td>
        </tr>`).join("");
      app.innerHTML = `
        <div class="wr-card">
          <div class="wr-card-head"><h2>ถังเก็บ</h2><small><a href="results.php" class="wr-strong" style="color:#db2777">← กลับรายการ</a></small></div>
          ${assignments.length ? `<div class="wr-scroll"><table class="wr-table" style="min-width:640px">
            <thead><tr><th>ข้อสอบ / ใบงาน</th><th>มีคนส่งแล้ว</th><th>ยิงเมื่อ</th><th></th></tr></thead>
            <tbody>${rows}</tbody></table></div>` : `<div class="wr-empty">ถังเก็บว่างเปล่า</div>`}
        </div>`;
      app.querySelectorAll("[data-restore]").forEach(b => {
        b.addEventListener("click", async () => {
          b.disabled = true;
          try { await postAction("restore", b.dataset.restore); renderTrash(); } catch (err) { alert(err.message); b.disabled = false; }
        });
      });
      app.querySelectorAll("[data-purge]").forEach(b => {
        b.addEventListener("click", async () => {
          const n = Number(b.dataset.n) || 0;
          if (!confirm(`ลบถาวร "${b.dataset.title}"?${n ? `\n\nคะแนนและคำตอบของนักเรียน (${n} ครั้ง) จะหายไปและกู้คืนไม่ได้` : "\n\nกู้คืนไม่ได้"}`)) return;
          b.disabled = true;
          try { await postAction("purge", b.dataset.purge); renderTrash(); } catch (err) { alert(err.message); b.disabled = false; }
        });
      });
    } catch (err) {
      app.innerHTML = `<div class="wr-card"><div class="wr-empty">${escapeHtml(err.message)}</div></div>`;
    }
  }

  async function renderList() {
    try {
      const all = (await fetchApi("action=list")).assignments;
      const ws = parseInt(new URLSearchParams(window.location.search).get("ws") || "0", 10);
      const assignments = ws > 0 ? all.filter(a => Number(a.worksheet_id) === ws) : all;
      if (!assignments.length) {
        app.innerHTML = `<div class="wr-card"><div class="wr-empty">ยังไม่มีการยิงงานเข้าคอร์ส<br>ไปที่ <a href="saved.php" class="wr-strong" style="color:#db2777">คลังใบงาน</a> แล้วกด "🚀 ยิงเข้าคอร์ส" เพื่อเริ่ม</div></div>`;
        return;
      }

      const byId = {};
      assignments.forEach(a => { byId[a.id] = a; });
      const rows = assignments.map(a => {
        const progress = a.target_count ? Math.round((a.done_count * 100) / a.target_count) : 0;
        const pending = a.target_count - a.done_count;
        const dueHtml = a.due_date
          ? `${formatDate(a.due_date)}${a.is_overdue && pending > 0 ? ` <span class="wr-badge wr-b-late">เลยกำหนด</span>` : ""}`
          : `<span class="wr-muted">ไม่กำหนด</span>`;
        return `
          <tr class="wr-row-click" data-id="${a.id}">
            <td>
              <div class="wr-strong">${escapeHtml(a.title)}</div>
              <div class="wr-muted">${escapeHtml(TYPE_LABELS[a.activity_type] || a.activity_type)}${a.subject ? " · " + escapeHtml(a.subject) : ""}${a.level ? " · " + escapeHtml(a.level) : ""}</div>
            </td>
            <td>
              <div>${escapeHtml(a.target_label)}</div>
              <div class="wr-muted">${a.course_title ? escapeHtml(a.course_title) : "ไม่ระบุคอร์ส"}</div>
            </td>
            <td style="min-width:150px">
              <div class="wr-num wr-strong">${a.done_count}/${a.target_count} คน${a.in_progress ? ` <span class="wr-muted">(กำลังทำ ${a.in_progress})</span>` : ""}</div>
              ${bar(progress, "wr-fill-neutral")}
            </td>
            <td class="wr-num wr-strong">${percentText(a.avg_percent)}</td>
            <td>${dueHtml}</td>
            <td>
              <div>${formatDate(a.created_at)}</div>
              <div class="wr-muted">${escapeHtml(a.assigned_by)}</div>
            </td>
            <td class="wr-act"><button type="button" class="wr-del" data-del="${a.id}" aria-label="ลบ ${escapeHtml(a.title)}" title="ลบออกจากรายการ">🗑</button></td>
          </tr>`;
      }).join("");

      app.innerHTML = `
        <div class="wr-card">
          <div class="wr-card-head"><h2>รายการที่ยิงไปแล้ว</h2><small>${assignments.length} รายการ · คลิกแถวเพื่อดูผล${ws > 0 ? ` · <a href="results.php" class="wr-strong" style="color:#db2777">ดูทั้งหมด</a>` : ""} · <a href="results.php?view=trash" class="wr-strong" style="color:#db2777">ถังเก็บ</a></small></div>
          <div class="wr-scroll">
            <table class="wr-table" style="min-width:860px">
              <thead><tr><th>ข้อสอบ / ใบงาน</th><th>ส่งถึง</th><th>ส่งแล้ว</th><th>คะแนนเฉลี่ย</th><th>กำหนดส่ง</th><th>ยิงเมื่อ</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`;

      app.querySelectorAll("[data-del]").forEach(b => {
        b.addEventListener("click", ev => { ev.stopPropagation(); archiveAssignment(byId[b.dataset.del]); });
      });
      app.querySelectorAll("tr[data-id]").forEach(tr => {
        tr.addEventListener("click", () => {
          window.location.href = `results.php?id=${tr.dataset.id}`;
        });
      });
    } catch (err) {
      app.innerHTML = `<div class="wr-card"><div class="wr-empty">${escapeHtml(err.message)}</div></div>`;
    }
  }

  // ── Report view ──────────────────────────────────────────────
  async function renderReport() {
    try {
      const data = await fetchApi(`action=report&id=${assignmentId}`);
      const { assignment: a, summary: s, students, items, skills } = data;

      const studentRows = students.map(st => `
        <tr class="wr-row-click" data-student="${st.id}">
          <td>
            <div class="wr-strong">${escapeHtml(st.first_name)} ${escapeHtml(st.last_name)}${st.nickname ? ` <span class="wr-muted">(${escapeHtml(st.nickname)})</span>` : ""}</div>
            <div class="wr-muted">${escapeHtml(st.student_code)}${st.grade ? " · " + escapeHtml(st.grade) : ""}</div>
          </td>
          <td>${stateBadge(st.state)}</td>
          <td style="min-width:130px">
            ${st.score_percent === null ? `<span class="wr-muted">-</span>` : `
              <div class="wr-num wr-strong">${percentText(st.score_percent)} <span class="wr-muted">(${Number(st.score)}/${Number(st.max_score)})</span></div>
              ${bar(st.score_percent)}`}
          </td>
          <td class="wr-muted">${st.submitted_at ? formatDate(st.submitted_at) : "-"}</td>
        </tr>`).join("");

      const skillRows = s.done_count === 0
        ? `<div class="wr-empty">ยังไม่มีนักเรียนส่งงาน</div>`
        : skills.map(sk => `
          <div class="wr-skill">
            <div class="wr-skill-top">
              <span class="wr-strong">${escapeHtml(sk.skill)} <span class="wr-muted">(${sk.questions} ข้อ)</span></span>
              <span class="wr-num wr-strong">${percentText(sk.percent)}</span>
            </div>
            ${bar(sk.percent)}
          </div>`).join("");

      const itemRows = items.map(it => {
        const wrongEntries = Object.entries(it.answer_distribution || {})
          .filter(([answer]) => answer.trim().toLowerCase() !== String(it.correct_answer).trim().toLowerCase());
        const topWrong = wrongEntries.length
          ? `${escapeHtml(answerLabel(wrongEntries[0][0], it.options))} <span class="wr-muted">(${wrongEntries[0][1]} คน)</span>`
          : `<span class="wr-muted">-</span>`;
        return `
          <tr>
            <td class="wr-num wr-strong">${it.number}</td>
            <td><div class="wr-clip" title="${escapeHtml(it.question_text)}">${escapeHtml(it.question_text)}</div></td>
            <td>${escapeHtml(it.skill)}</td>
            <td style="min-width:130px">
              ${it.correct_percent === null ? `<span class="wr-muted">-</span>` : `
                <div class="wr-num wr-strong">${percentText(it.correct_percent)} <span class="wr-muted">(${it.correct_count}/${s.done_count})</span></div>
                ${bar(it.correct_percent)}`}
            </td>
            <td><div class="wr-clip">${topWrong}</div></td>
          </tr>`;
      }).join("");

      const passTile = s.passed_count === null
        ? `<div class="wr-tile"><span>สูงสุด / ต่ำสุด</span><strong class="wr-num">${percentText(s.max_percent)} / ${percentText(s.min_percent)}</strong></div>`
        : `<div class="wr-tile"><span>ผ่านเกณฑ์ ${Number(a.pass_score)}%</span><strong class="wr-num">${s.passed_count}/${s.done_count}</strong><em>สูงสุด ${percentText(s.max_percent)} · ต่ำสุด ${percentText(s.min_percent)}</em></div>`;

      app.innerHTML = `
        <a href="results.php" class="wr-back">← กลับไปรายการทั้งหมด</a>
        <h1 class="wr-title">${escapeHtml(a.title)}</h1>
        <div class="wr-meta">
          ${escapeHtml(TYPE_LABELS[a.activity_type] || a.activity_type)} · ${a.question_count} ข้อ · ${escapeHtml(a.target_label)}
          · ${a.course_title ? escapeHtml(a.course_title) : "ไม่ระบุคอร์ส"}
          · ยิงเมื่อ ${formatDate(a.created_at)}${a.assigned_by ? " โดย " + escapeHtml(a.assigned_by) : ""}
          ${a.due_date ? " · กำหนดส่ง " + formatDate(a.due_date) : ""}
        </div>

        <div class="wr-tiles">
          <div class="wr-tile"><span>ส่งแล้ว</span><strong class="wr-num">${s.done_count}/${s.target_count}</strong><em>คน</em></div>
          <div class="wr-tile"><span>ยังไม่ส่ง</span><strong class="wr-num">${s.not_started + s.in_progress}</strong><em>กำลังทำ ${s.in_progress} · ยังไม่เริ่ม ${s.not_started}</em></div>
          <div class="wr-tile"><span>คะแนนเฉลี่ย</span><strong class="wr-num">${percentText(s.avg_percent)}</strong></div>
          ${passTile}
        </div>

        <div class="wr-grid">
          <div class="wr-card">
            <div class="wr-card-head"><h2>นักเรียน</h2><small>คลิกชื่อเพื่อดูคำตอบและจุดอ่อน</small></div>
            <div class="wr-scroll">
              ${students.length ? `
              <table class="wr-table" style="min-width:520px">
                <thead><tr><th>นักเรียน</th><th>สถานะ</th><th>คะแนน</th><th>ส่งเมื่อ</th></tr></thead>
                <tbody>${studentRows}</tbody>
              </table>` : `<div class="wr-empty">ไม่มีนักเรียนในรายการนี้</div>`}
            </div>
          </div>
          <div class="wr-card">
            <div class="wr-card-head"><h2>ทักษะที่ทั้งกลุ่มทำได้</h2><small>เรียงจากอ่อนสุด</small></div>
            ${skillRows}
          </div>
        </div>

        <div class="wr-card">
          <div class="wr-card-head">
            <div><h2>วิเคราะห์รายข้อ</h2><small>ข้อที่ตอบถูกน้อยควรนำมาสอนซ้ำ หรือตรวจโจทย์อีกครั้ง</small></div>
            ${s.done_count ? `<button type="button" id="wr-retry-class" class="wr-btn">ยิงทบทวนข้อที่ผิดบ่อย</button>` : ""}
          </div>
          <div class="wr-scroll">
            <table class="wr-table" style="min-width:820px">
              <thead><tr><th>ข้อ</th><th>โจทย์</th><th>ทักษะ</th><th>ตอบถูก</th><th>คำตอบผิดที่เลือกมากที่สุด</th></tr></thead>
              <tbody>${itemRows}</tbody>
            </table>
          </div>
        </div>`;

      document.getElementById("wr-retry-class")?.addEventListener("click", () => sendRetry(null));
      app.querySelectorAll("tr[data-student]").forEach(tr => {
        tr.addEventListener("click", () => openStudent(parseInt(tr.dataset.student, 10)));
      });
    } catch (err) {
      app.innerHTML = `<a href="results.php" class="wr-back">← กลับไปรายการทั้งหมด</a><div class="wr-card"><div class="wr-empty">${escapeHtml(err.message)}</div></div>`;
    }
  }

  // ── Student modal ────────────────────────────────────────────
  function levelBadge(level) {
    const map = {
      weak: ["wr-b-weak", "อ่อน"],
      developing: ["wr-b-dev", "กำลังพัฒนา"],
      strong: ["wr-b-strong", "ทำได้ดี"],
      insufficient: ["wr-b-none", "ข้อมูลยังน้อย"]
    };
    const [cls, label] = map[level] || map.insufficient;
    return `<span class="wr-badge ${cls}">${label}</span>`;
  }

  async function openStudent(studentId) {
    modalTitle.innerHTML = "";
    modalBody.innerHTML = `<div class="wr-empty">กำลังโหลด...</div>`;
    modal.hidden = false;

    try {
      const data = await fetchApi(`action=student&id=${assignmentId}&student_id=${studentId}`);
      const { student: st, submission: sub, sheet, weakness, state } = data;

      modalTitle.innerHTML = `
        <div class="wr-strong" style="font-size:17px">${escapeHtml(st.first_name)} ${escapeHtml(st.last_name)}</div>
        <div class="wr-muted">${escapeHtml(st.student_code)}${st.grade ? " · " + escapeHtml(st.grade) : ""}
          ${state === "done" && sub ? ` · ได้ ${Number(sub.score)}/${Number(sub.max_score)} (${percentText(sub.score_percent)})` : ""}</div>`;

      const studyHtml = weakness.study_next.length
        ? `<ul class="wr-study">${weakness.study_next.map(x => `<li><small>${escapeHtml(x.subject)} · ${escapeHtml(x.skill)}</small>${escapeHtml(x.objective)}</li>`).join("")}</ul>`
        : `<div class="wr-muted">${weakness.question_count ? "ยังไม่พบเรื่องที่ต้องเรียนเพิ่ม" : "ยังไม่มีงานที่ส่งแล้ว จึงยังวิเคราะห์ไม่ได้"}</div>`;

      const skillsHtml = weakness.skills.length ? `
        <div class="wr-scroll">
          <table class="wr-table">
            <thead><tr><th>ทักษะ</th><th>วิชา</th><th>ตอบถูก</th><th>ระดับ</th></tr></thead>
            <tbody>${weakness.skills.map(sk => `
              <tr>
                <td class="wr-strong">${escapeHtml(sk.skill)}</td>
                <td class="wr-muted">${escapeHtml(sk.subject)}</td>
                <td style="min-width:130px"><div class="wr-num wr-strong">${percentText(sk.percent)} <span class="wr-muted">(${sk.correct}/${sk.total} ข้อ)</span></div>${bar(sk.percent)}</td>
                <td>${levelBadge(sk.level)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="wr-muted" style="margin-top:8px">คิดจากทุกงานที่นักเรียนส่งแล้ว รวม ${weakness.question_count} ข้อ · ทักษะที่ทำไม่ถึง ${weakness.min_items} ข้อจะยังไม่ถูกตัดสิน</div>` : "";

      let sheetHtml;
      if (state === "not_started") {
        sheetHtml = `<div class="wr-muted">นักเรียนยังไม่ได้เริ่มทำงานนี้</div>`;
      } else {
        sheetHtml = (state === "in_progress" ? `<div class="wr-note">นักเรียนยังทำไม่เสร็จ คำตอบด้านล่างคือที่บันทึกไว้ล่าสุด</div>` : "") +
          sheet.map(q => {
            const your = q.answered ? escapeHtml(answerLabel(q.student_answer, q.options)) : "ไม่ได้ตอบ";
            return `
              <div class="wr-q ${q.is_correct ? "wr-q-ok" : "wr-q-wrong"}">
                <div class="wr-q-head"><span class="wr-q-no">${q.number}</span><div class="wr-q-text">${escapeHtml(q.question_text)}</div></div>
                <div class="wr-q-line">คำตอบของนักเรียน: <span class="${q.is_correct ? "wr-ok" : "wr-bad"}">${your}</span></div>
                ${q.is_correct ? "" : `<div class="wr-q-line">คำตอบที่ถูก: <span class="wr-ok">${escapeHtml(answerLabel(q.correct_answer, q.options))}</span></div>`}
                <div class="wr-q-line wr-muted">ทักษะ: ${escapeHtml(q.skill)}${q.hint_used ? " · ใช้คำใบ้" : ""}${q.time_spent_seconds ? ` · ใช้เวลา ${q.time_spent_seconds} วินาที` : ""}</div>
                ${!q.is_correct && q.explanation ? `<div class="wr-q-line wr-muted">เฉลย: ${escapeHtml(q.explanation)}</div>` : ""}
              </div>`;
          }).join("");
      }

      const hasWrong = state === "done" && sheet.some(q => !q.is_correct);
      modalBody.innerHTML = `
        ${hasWrong ? `<div style="margin-bottom:16px"><button type="button" id="wr-retry-student" class="wr-btn">ยิงข้อสอบทบทวนข้อที่ผิดให้คนนี้</button></div>` : ""}
        <div class="wr-section">ควรเรียนเพิ่ม</div>
        ${studyHtml}
        ${skillsHtml ? `<div class="wr-section">จุดแข็งและจุดอ่อนรายทักษะ</div>${skillsHtml}` : ""}
        <div class="wr-section">คำตอบในงานนี้</div>
        ${sheetHtml}`;
      document.getElementById("wr-retry-student")?.addEventListener("click", () => sendRetry(studentId));
    } catch (err) {
      modalBody.innerHTML = `<div class="wr-empty">${escapeHtml(err.message)}</div>`;
    }
  }

  function closeModal() {
    modal.hidden = true;
  }

  document.getElementById("wr-modal-close")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  const view = new URLSearchParams(window.location.search).get("view");
  if (assignmentId > 0) renderReport(); else if (view === "trash") renderTrash(); else renderList();
})();
