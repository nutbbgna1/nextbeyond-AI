/* หน้าแผนการจัดการเรียนรู้: ร่างด้วย AI → แก้ไข → บันทึก/พิมพ์/Word → สร้างใบงานตามแผน */
(() => {
  'use strict';
  const { esc, api, showError, GRADES, fmtDate, ls } = window.WS;
  const $ = (id) => document.getElementById(id);
  const CUR = window.CURRICULUM || {};
  const TL = window.SHEET_TYPE_LABELS || {};
  const MODELS = window.LP_MODELS || {};
  const COMP = window.LP_COMPETENCIES || [];
  const TRAITS = window.LP_TRAITS || [];
  const CUSTOM = '__custom';
  const st = { id: '', head: null, plan: null, mode: 'view', dirty: false, indAll: [], indChecked: new Set(), saved: [] };

  /* ---------- ฟอร์มด้านบน ---------- */
  $('grade').innerHTML = GRADES.map((g) => `<option>${g}</option>`).join('');
  function fillSubjects(pref) {
    const subs = Object.keys(CUR[$('grade').value] || {});
    const keep = pref || $('subject').value;
    $('subject').innerHTML = subs.map((s) => `<option>${esc(s)}</option>`).join('');
    if (subs.includes(keep)) $('subject').value = keep;
    else if (keep) { $('subject').add(new Option(keep, keep)); $('subject').value = keep; }
    fillUnits();
  }
  function unitList() {
    const t = $('term').value;
    return ((CUR[$('grade').value] || {})[$('subject').value] || []).filter((u) => !t || String(u[0]) === t);
  }
  function fillUnits(pref) {
    const keep = pref !== undefined ? pref : $('unit').value;
    const list = unitList();
    $('unit').innerHTML = '<option value="">— ไม่ระบุหน่วย —</option>' + list.map((u, i) => `<option value="${esc(u[1])}" data-no="${i + 1}" data-term="${u[0]}">ภาคเรียนที่ ${u[0]} · ${esc(u[1])}</option>`).join('') + `<option value="${CUSTOM}">✎ พิมพ์ชื่อหน่วยเอง…</option>`;
    if (keep && ![...$('unit').options].some((o) => o.value === keep)) $('unit').add(new Option(keep, keep), $('unit').options.length - 1);
    $('unit').value = keep || '';
  }
  const unitValue = () => ($('unit').value === CUSTOM ? '' : $('unit').value);
  $('grade').addEventListener('change', () => { fillSubjects(); loadIndicators(); remember(); });
  $('subject').addEventListener('change', () => { fillUnits(''); loadIndicators(); remember(); });
  $('term').addEventListener('change', () => fillUnits());
  $('unit').addEventListener('change', () => {
    const o = $('unit').selectedOptions[0];
    if ($('unit').value === CUSTOM) {
      const name = window.prompt('ชื่อหน่วยการเรียนรู้');
      fillUnits(name ? name.trim() : '');
      return;
    }
    if (o && o.dataset.no) {
      if (!$('unitNo').value) $('unitNo').value = o.dataset.no;
      if (!$('term').value) $('term').value = o.dataset.term;
      if (!$('topic').value) $('topic').value = $('unit').value;
    }
    autoPickInd();
  });

  // ค่าที่จำไว้ในเครื่อง (ใช้ร่วมกับหน้าสร้างใบงาน)
  function remember() {
    ls.set('ws_grade', $('grade').value);
    ls.set('ws_subject', $('subject').value);
    for (const k of ['school', 'teacher', 'year', 'periodMinutes', 'model']) ls.set('ws_lp_' + k, $(k).value);
    ls.set('ws_hSchool', $('school').value);
    ls.set('ws_hTeacher', $('teacher').value);
  }
  for (const k of ['school', 'teacher', 'year', 'periodMinutes', 'model']) $(k).addEventListener('change', remember);
  (function restore() {
    const g = ls.get('ws_grade');
    if (g && GRADES.includes(g)) $('grade').value = g;
    fillSubjects(ls.get('ws_subject') || '');
    $('school').value = ls.get('ws_lp_school') || ls.get('ws_hSchool') || '';
    $('teacher').value = ls.get('ws_lp_teacher') || ls.get('ws_hTeacher') || '';
    const y = new Date();
    $('year').value = ls.get('ws_lp_year') || String(y.getFullYear() + 543 - (y.getMonth() < 4 ? 1 : 0));
    $('periodMinutes').value = ls.get('ws_lp_periodMinutes') || '50';
    const m = ls.get('ws_lp_model');
    if (m && MODELS[m]) $('model').value = m;
  })();

  /* ---------- ตัวชี้วัด ---------- */
  function renderInd() {
    $('indCount').textContent = st.indAll.length ? `(เลือก ${st.indChecked.size}/${st.indAll.length})` : '';
    $('indList').innerHTML = st.indAll.length
      ? st.indAll.map((i) => `<label style="display:flex;gap:8px;align-items:flex-start;font-weight:400;padding:2px 0"><input type="checkbox" data-ind="${esc(i.code)}"${st.indChecked.has(i.code) ? ' checked' : ''}><span><b>${esc(i.code)}</b> ${esc(i.text)}</span></label>`).join('')
      : '<span style="color:var(--muted)">ยังไม่มีตัวชี้วัดของชั้น/วิชานี้ในระบบ — นำเข้าได้ที่เมนู “หลักสูตร/ตัวชี้วัด” (ถ้าไม่มี AI จะไม่ใส่รหัสตัวชี้วัด ครูเติมเองได้)</span>';
  }
  function autoPickInd() {
    const u = unitValue();
    if (!u) return renderInd();
    const hit = st.indAll.filter((i) => (i.units || []).includes(u));
    if (hit.length) { st.indChecked.clear(); for (const i of hit) st.indChecked.add(i.code); }
    renderInd();
  }
  async function loadIndicators(want) {
    try {
      const r = await api('api/curriculum.php', { action: 'for_grade', grade: $('grade').value, subject: $('subject').value });
      st.indAll = r.indicators || [];
    } catch {
      st.indAll = [];
    }
    st.indChecked.clear();
    if (want && want.length) for (const i of st.indAll) { if (want.includes(i.code)) st.indChecked.add(i.code); }
    else autoPickInd();
    renderInd();
  }
  $('indList').addEventListener('change', (e) => {
    const c = e.target.closest('[data-ind]');
    if (c) { c.checked ? st.indChecked.add(c.dataset.ind) : st.indChecked.delete(c.dataset.ind); renderInd(); }
  });
  const selectedInd = () => st.indAll.filter((i) => st.indChecked.has(i.code)).map((i) => ({ code: i.code, text: i.text }));

  function readHead() {
    return {
      grade: $('grade').value, subject: $('subject').value, term: $('term').value, year: $('year').value.trim(),
      unit: unitValue(), unitNo: $('unitNo').value.trim(), planNo: $('planNo').value.trim(), topic: $('topic').value.trim(),
      hours: Number($('hours').value) || 1, periodMinutes: Number($('periodMinutes').value) || 50, model: $('model').value,
      indicators: selectedInd(), school: $('school').value.trim(), teacher: $('teacher').value.trim(),
    };
  }
  function writeHead(h) {
    if (GRADES.includes(h.grade)) $('grade').value = h.grade;
    fillSubjects(h.subject);
    $('term').value = h.term || '';
    fillUnits(h.unit || '');
    for (const k of ['year', 'unitNo', 'planNo', 'topic', 'school', 'teacher']) $(k).value = h[k] || '';
    $('hours').value = h.hours || 1;
    $('periodMinutes').value = h.periodMinutes || 50;
    if (MODELS[h.model]) $('model').value = h.model;
  }

  /* ---------- เอกสารแผน ---------- */
  const list = (a, tag = 'ol') => (a && a.length ? `<${tag}>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</${tag}>` : '<p class="muted">-</p>');
  const lines = (a) => (a || []).map((x) => esc(x)).join('<br>');
  function docHTML(h, p) {
    const inds = (h.indicators || []).filter((i) => !(p.indicatorCodes || []).length || p.indicatorCodes.includes(i.code));
    const model = MODELS[h.model] || MODELS['3stage'];
    const totalMin = (p.activities || []).reduce((s, a) => s + (Number(a.minutes) || 0), 0);
    const hd = [
      `<h2>แผนการจัดการเรียนรู้${h.planNo ? 'ที่ ' + esc(h.planNo) : ''}</h2>`,
      '<div class="hd">',
      `<div>รายวิชา${esc(h.subject)} &nbsp; ชั้น${esc(h.grade)}${h.term ? ` &nbsp; ภาคเรียนที่ ${esc(h.term)}` : ''}${h.year ? ` &nbsp; ปีการศึกษา ${esc(h.year)}` : ''}</div>`,
      h.unit ? `<div>หน่วยการเรียนรู้${h.unitNo ? 'ที่ ' + esc(h.unitNo) : ''} ${esc(h.unit)}</div>` : '',
      `<div><b>เรื่อง ${esc(p.title || h.topic)}</b> &nbsp; เวลา ${esc(h.hours)} ชั่วโมง</div>`,
      h.teacher || h.school ? `<div>${h.teacher ? 'ผู้สอน ' + esc(h.teacher) : ''}${h.school ? ' &nbsp; ' + esc(h.school) : ''}</div>` : '',
      '</div>',
    ].join('');
    const actRows = (p.activities || []).map((a) => `<tr><td style="width:24%"><b>${esc(a.stage)}</b><br><span class="muted">(${esc(a.minutes)} นาที)</span></td><td>${list(a.teacher)}</td><td style="width:30%">${list(a.student, 'ul')}</td></tr>`).join('');
    const asRows = (p.assessment || []).map((a) => `<tr><td>${esc(a.target)}</td><td>${esc(a.method)}</td><td>${esc(a.tool)}</td><td>${esc(a.criteria)}</td></tr>`).join('');
    const post = p.postTeaching ? `<p style="white-space:pre-wrap;text-indent:0">${esc(p.postTeaching)}</p>` : '<div class="dots"></div>'.repeat(3);
    return `${hd}
      <h3>1. มาตรฐานการเรียนรู้/ตัวชี้วัด</h3>
      ${inds.length ? `<ul>${inds.map((i) => `<li><b>${esc(i.code)}</b> ${esc(i.text)}</li>`).join('')}</ul>` : '<p class="muted">(ครูระบุตัวชี้วัดตามหลักสูตรสถานศึกษา)</p>'}
      <h3>2. สาระสำคัญ/ความคิดรวบยอด</h3><p>${esc(p.concept || '')}</p>
      <h3>3. จุดประสงค์การเรียนรู้</h3>
      <h4>ด้านความรู้ (K)</h4>${list(p.objectives && p.objectives.K)}
      <h4>ด้านทักษะ/กระบวนการ (P)</h4>${list(p.objectives && p.objectives.P)}
      <h4>ด้านเจตคติ/คุณลักษณะ (A)</h4>${list(p.objectives && p.objectives.A)}
      <h3>4. สาระการเรียนรู้</h3>
      <h4>ด้านความรู้</h4>${list(p.content && p.content.knowledge)}
      <h4>ด้านทักษะ/กระบวนการ</h4>${list(p.content && p.content.skills)}
      <h4>ด้านคุณลักษณะ</h4>${list(p.content && p.content.attributes)}
      <h3>5. สมรรถนะสำคัญของผู้เรียน</h3>${list(p.competencies, 'ul')}
      <h3>6. คุณลักษณะอันพึงประสงค์</h3>${list(p.desiredTraits, 'ul')}
      <h3>7. กิจกรรมการเรียนรู้ <span style="font-weight:400">(${esc(model.label)} · รวม ${totalMin} นาที)</span></h3>
      <table><thead><tr><th>ขั้นตอน/เวลา</th><th>กิจกรรมครู</th><th>กิจกรรมนักเรียน</th></tr></thead><tbody>${actRows}</tbody></table>
      ${p.workpiece ? `<h3>8. ภาระงาน/ชิ้นงาน</h3><p>${esc(p.workpiece)}</p>` : '<h3>8. ภาระงาน/ชิ้นงาน</h3><p class="muted">-</p>'}
      <h3>9. สื่อและแหล่งการเรียนรู้</h3>${list([...(p.materials || []), ...(p.worksheetIdeas || []).map((w) => `ใบงานเรื่อง ${w.topic}`)].filter((x, i, a) => a.indexOf(x) === i), 'ul')}
      <h3>10. การวัดและประเมินผล</h3>
      <table><thead><tr><th>สิ่งที่ต้องการวัด</th><th>วิธีการ</th><th>เครื่องมือ</th><th>เกณฑ์</th></tr></thead><tbody>${asRows}</tbody></table>
      <h3>11. บันทึกหลังการจัดการเรียนรู้</h3>
      <h4>ผลการจัดการเรียนรู้ / ปัญหาและอุปสรรค / ข้อเสนอแนะ</h4>${post}
      <div class="sign">ลงชื่อ ........................................ ผู้สอน<br>(${esc(h.teacher || '........................................')})</div>
      <h3>ความคิดเห็นของผู้บริหารสถานศึกษา/ผู้ที่ได้รับมอบหมาย</h3>${'<div class="dots"></div>'.repeat(2)}
      <div class="sign">ลงชื่อ ........................................<br>(........................................)</div>`;
  }

  /* ---------- โหมดแก้ไข ---------- */
  const ta = (path, arr, ph) => `<textarea data-p="${path}" data-k="lines" placeholder="${esc(ph || 'หนึ่งบรรทัดต่อหนึ่งข้อ')}">${esc((arr || []).join('\n'))}</textarea>`;
  function editorHTML(p) {
    const stages = (p.activities || []).map((a, i) => `<div class="stage"><div class="row" style="justify-content:space-between"><b>${esc(a.stage)}</b><label style="font-size:13px;font-weight:400">เวลา <input type="number" data-p="activities.${i}.minutes" data-k="num" value="${esc(a.minutes)}" style="width:80px"> นาที</label></div>
      <div class="g2"><label class="f">กิจกรรมครู${ta(`activities.${i}.teacher`, a.teacher)}</label><label class="f">กิจกรรมนักเรียน${ta(`activities.${i}.student`, a.student)}</label></div></div>`).join('');
    const checks = (key, all) => all.map((c) => `<label class="chip${(p[key] || []).includes(c) ? ' on' : ''}"><input type="checkbox" data-pick="${key}" value="${esc(c)}"${(p[key] || []).includes(c) ? ' checked' : ''}> ${esc(c)}</label>`).join(' ');
    const asRows = (p.assessment || []).map((a, i) => `<div class="g2" style="grid-template-columns:2fr 1.3fr 1.3fr 1.3fr auto;align-items:end;margin-bottom:6px">${['target', 'method', 'tool', 'criteria'].map((k) => `<input type="text" data-p="assessment.${i}.${k}" value="${esc(a[k] || '')}" placeholder="${{ target: 'สิ่งที่วัด', method: 'วิธีการ', tool: 'เครื่องมือ', criteria: 'เกณฑ์' }[k]}">`).join('')}<button class="ghost small" data-rm="assessment.${i}">✕</button></div>`).join('');
    const typeOpts = (v) => Object.entries(TL).map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(l)}</option>`).join('');
    const ideaRows = (p.worksheetIdeas || []).map((w, i) => `<div class="g2" style="grid-template-columns:2fr 1fr 2fr auto;align-items:end;margin-bottom:6px"><input type="text" data-p="worksheetIdeas.${i}.topic" value="${esc(w.topic)}" placeholder="หัวข้อใบงาน"><select data-p="worksheetIdeas.${i}.type">${typeOpts(w.type)}</select><input type="text" data-p="worksheetIdeas.${i}.purpose" value="${esc(w.purpose || '')}" placeholder="ใช้ในขั้นใด/เพื่ออะไร"><button class="ghost small" data-rm="worksheetIdeas.${i}">✕</button></div>`).join('');
    return `<div class="row" style="justify-content:space-between"><strong>แก้ไขแผน</strong><span style="font-size:12px;color:var(--muted)">ช่องหลายบรรทัด: หนึ่งบรรทัด = หนึ่งข้อ · แก้แล้วกด “บันทึก”</span></div>
      <div class="sec"><label class="f">เรื่อง<input type="text" data-p="title" value="${esc(p.title || '')}"></label></div>
      <div class="sec"><label class="f">สาระสำคัญ<textarea data-p="concept">${esc(p.concept || '')}</textarea></label></div>
      <div class="sec"><b>จุดประสงค์การเรียนรู้</b><div class="g2"><label class="f">K ความรู้${ta('objectives.K', p.objectives && p.objectives.K)}</label><label class="f">P ทักษะ/กระบวนการ${ta('objectives.P', p.objectives && p.objectives.P)}</label><label class="f">A เจตคติ${ta('objectives.A', p.objectives && p.objectives.A)}</label></div></div>
      <div class="sec"><b>สาระการเรียนรู้</b><div class="g2"><label class="f">ความรู้${ta('content.knowledge', p.content && p.content.knowledge)}</label><label class="f">ทักษะ/กระบวนการ${ta('content.skills', p.content && p.content.skills)}</label><label class="f">คุณลักษณะ${ta('content.attributes', p.content && p.content.attributes)}</label></div></div>
      <div class="sec"><b>สมรรถนะสำคัญ</b><div class="types">${checks('competencies', COMP)}</div></div>
      <div class="sec"><b>คุณลักษณะอันพึงประสงค์</b><div class="types">${checks('desiredTraits', TRAITS)}</div></div>
      <div class="sec"><b>กิจกรรมการเรียนรู้</b>${stages}</div>
      <div class="sec"><div class="g2"><label class="f">ภาระงาน/ชิ้นงาน<input type="text" data-p="workpiece" value="${esc(p.workpiece || '')}"></label><label class="f">สื่อและแหล่งการเรียนรู้${ta('materials', p.materials)}</label></div></div>
      <div class="sec"><b>การวัดและประเมินผล</b>${asRows}<button class="ghost small" data-add="assessment">＋ เพิ่มแถว</button></div>
      <div class="sec"><b>ใบงานตามแผน</b>${ideaRows}<button class="ghost small" data-add="worksheetIdeas">＋ เพิ่มใบงาน</button></div>
      <div class="sec"><label class="f">บันทึกหลังการจัดการเรียนรู้ (เติมหลังสอน)<textarea data-p="postTeaching" style="min-height:90px">${esc(p.postTeaching || '')}</textarea></label></div>`;
  }
  function setPath(o, path, v) {
    const ks = path.split('.');
    let cur = o;
    for (let i = 0; i < ks.length - 1; i++) {
      const k = /^\d+$/.test(ks[i]) ? Number(ks[i]) : ks[i];
      if (cur[k] == null) cur[k] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      cur = cur[k];
    }
    cur[ks[ks.length - 1]] = v;
  }
  function onEdit(e) {
    const t = e.target;
    if (t.dataset.pick) {
      const k = t.dataset.pick;
      const set = new Set(st.plan[k] || []);
      t.checked ? set.add(t.value) : set.delete(t.value);
      const order = k === 'competencies' ? COMP : TRAITS;
      st.plan[k] = order.filter((x) => set.has(x));
      t.closest('.chip').classList.toggle('on', t.checked);
    } else if (t.dataset.p) {
      const v = t.dataset.k === 'lines' ? t.value.split('\n').map((x) => x.trim()).filter(Boolean) : t.dataset.k === 'num' ? Math.max(0, Number(t.value) || 0) : t.value;
      setPath(st.plan, t.dataset.p, v);
    } else return;
    markDirty();
    renderDoc();
  }
  $('editor').addEventListener('input', onEdit);
  $('editor').addEventListener('change', onEdit);
  $('editor').addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    const rm = e.target.closest('[data-rm]');
    if (add) {
      const k = add.dataset.add;
      st.plan[k] = st.plan[k] || [];
      st.plan[k].push(k === 'assessment' ? { target: '', method: '', tool: '', criteria: '' } : { topic: '', type: 'multiple_choice', purpose: '' });
    } else if (rm) {
      const [k, i] = rm.dataset.rm.split('.');
      st.plan[k].splice(Number(i), 1);
    } else return;
    markDirty();
    render();
  });

  function markDirty() {
    st.dirty = true;
    $('saveNote').textContent = 'ยังไม่ได้บันทึกการแก้ไข';
  }
  function renderDoc() {
    $('doc').innerHTML = docHTML(st.head, st.plan);
    renderIdeas();
  }
  function renderIdeas() {
    const ideas = st.plan.worksheetIdeas || [];
    $('ideas').innerHTML = ideas.length
      ? ideas.map((w, i) => `<div class="idea"><span>${i + 1}. ${esc(w.topic || '(ยังไม่มีหัวข้อ)')} <span class="chip gray">${esc(TL[w.type] || w.type)}</span> <span style="color:var(--muted);font-size:12px">${esc(w.purpose || '')}</span></span><button class="ghost small" data-make="${i}">สร้างใบนี้</button></div>`).join('')
      : '<span style="color:var(--muted)">แผนนี้ยังไม่มีรายการใบงาน (เพิ่มได้ในโหมดแก้ไข) หรือกดปุ่มด้านบนเพื่อให้ AI วางใบงานจากแผน</span>';
  }
  function render() {
    $('docWrap').classList.toggle('hidden', !st.plan);
    if (!st.plan) return;
    $('editor').classList.toggle('hidden', st.mode !== 'edit');
    $('modeBtn').textContent = st.mode === 'edit' ? '✓ เสร็จสิ้นการแก้ไข' : '✎ แก้ไข';
    if (st.mode === 'edit') $('editor').innerHTML = editorHTML(st.plan);
    renderDoc();
  }
  $('modeBtn').addEventListener('click', () => {
    st.mode = st.mode === 'edit' ? 'view' : 'edit';
    render();
  });

  /* ---------- ร่างด้วย AI ---------- */
  function emptyPlan(h) {
    const stages = (MODELS[h.model] || MODELS['3stage']).stages;
    return {
      title: h.topic, concept: '', objectives: { K: [], P: [], A: [] }, content: { knowledge: [], skills: [], attributes: [] }, competencies: [], desiredTraits: [],
      activities: stages.map((s) => ({ stage: s, minutes: Math.round((h.hours * h.periodMinutes) / stages.length), teacher: [], student: [] })),
      workpiece: '', materials: [], assessment: [], worksheetIdeas: [], indicatorCodes: h.indicators.map((i) => i.code), postTeaching: '',
    };
  }
  async function generate() {
    const h = readHead();
    if (!h.topic) return showError('ระบุเรื่องที่สอน');
    if (st.dirty && st.plan && !window.confirm('แผนที่แสดงอยู่ยังไม่ได้บันทึก ร่างใหม่ทับเลยไหม?')) return;
    showError('');
    $('gen').disabled = $('regen').disabled = true;
    $('genNote').textContent = 'AI กำลังร่างแผน… (อาจใช้เวลา 30-90 วินาที)';
    const run = window.WS.stoppable($('stopGen'));
    try {
      const r = await api('api/lplan.php', Object.assign({ action: 'generate', id: st.id, hint: $('hint').value, refMode: $('refMode').value }, h), true, run.signal);
      st.head = r.head;
      st.plan = r.plan;
      st.mode = 'view';
      markDirty();
      $('genNote').textContent = 'ร่างเสร็จแล้ว ตรวจทานและแก้ไขได้ แล้วกด “บันทึก”';
      render();
      $('docWrap').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      if (e.code === 'ABORT') {
        $('genNote').textContent = 'หยุดแล้ว (แผนเดิมที่แสดงอยู่ไม่เปลี่ยน) กดร่างใหม่ได้เลย';
      } else {
        $('genNote').textContent = '';
        showError(e.message);
      }
    } finally {
      run.done();
      $('gen').disabled = $('regen').disabled = false;
    }
  }
  $('gen').addEventListener('click', async () => {
    const keep = st.id;
    st.id = ''; // ร่างจากฟอร์ม = แผนใหม่เสมอ (ร่างทับแผนเดิมใช้ปุ่ม “ร่างใหม่”)
    await generate();
    if (!st.plan || (!st.dirty && keep)) st.id = keep;
  });
  $('regen').addEventListener('click', generate);
  $('blank').addEventListener('click', () => {
    const h = readHead();
    if (!h.topic) return showError('ระบุเรื่องที่สอน');
    st.id = '';
    st.head = h;
    st.plan = emptyPlan(h);
    st.mode = 'edit';
    markDirty();
    render();
  });

  /* ---------- บันทึก / เปิด ---------- */
  async function save() {
    try {
      showError('');
      const head = Object.assign({}, st.head || {}, readHead());
      const r = await api('api/lplan.php', { action: 'save', id: st.id, head, plan: st.plan });
      st.id = r.id;
      st.head = head;
      st.dirty = false;
      $('saveNote').textContent = 'บันทึกแล้ว';
      loadSaved();
      return true;
    } catch (e) {
      showError(e.message);
      return false;
    }
  }
  $('save').addEventListener('click', save);
  async function openPlan(id) {
    try {
      const d = (await api('api/lplan.php', { action: 'get', id })).data;
      st.id = d.id;
      st.head = d.head;
      st.plan = d.plan;
      st.dirty = false;
      st.mode = 'view';
      writeHead(d.head);
      await loadIndicators((d.head.indicators || []).map((i) => i.code));
      $('saveNote').textContent = 'บันทึกเมื่อ ' + fmtDate(d.savedAt);
      render();
      $('docWrap').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      showError(e.message);
    }
  }

  /* ---------- สร้างใบงานตามแผน ---------- */
  async function goMake(idea) {
    if (!st.id || st.dirty) {
      if (!(await save())) return;
    }
    location.href = 'index.php?lp=' + encodeURIComponent(st.id) + (idea >= 0 ? '&idea=' + idea : '');
  }
  $('makeAll').addEventListener('click', () => goMake(-1));
  $('ideas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-make]');
    if (b) goMake(Number(b.dataset.make));
  });

  /* ---------- พิมพ์ / Word ---------- */
  $('printBtn').addEventListener('click', () => window.print());
  $('wordBtn').addEventListener('click', () => {
    const css = `body{font-family:'TH Sarabun New','TH SarabunPSK','Sarabun',sans-serif;font-size:16pt;line-height:1.25}
      h2{text-align:center;font-size:20pt;margin:0}h3{font-size:16pt;margin:10pt 0 2pt}h4{font-size:16pt;margin:4pt 0 0 14pt;font-weight:bold}
      .hd{text-align:center}p{margin:0 0 0 18pt}ol,ul{margin:0 0 0 36pt}table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #000;padding:3pt 5pt;vertical-align:top;font-size:15pt}th{background:#eee}.muted{color:#555}
      .dots{border-bottom:1px dotted #000;height:20pt}.sign{margin:14pt 0 0 50%;text-align:center}`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>แผนการจัดการเรียนรู้</title><style>@page{size:21cm 29.7cm;margin:2cm 2cm 2cm 2.5cm}${css}</style></head><body>${docHTML(st.head, st.plan)}</body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const name = `แผนการจัดการเรียนรู้${st.head.planNo ? '-' + st.head.planNo : ''}-${(st.plan.title || 'แผน').replace(/[\\/:*?"<>|]/g, '').slice(0, 60)}.doc`;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  });

  /* ---------- รายการที่บันทึก ---------- */
  function renderSaved() {
    const g = $('fGrade').value, s = $('fSubject').value, t = $('fTerm').value, q = $('fQ').value.trim().toLowerCase();
    const rows = st.saved.filter((x) => (!g || x.grade === g) && (!s || x.subject === s) && (!t || x.term === t) && (!q || `${x.title} ${x.unit}`.toLowerCase().includes(q)));
    $('saved').innerHTML = rows.length
      ? rows.map((x) => `<div class="row" style="justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee"><span>${x.planNo ? `<b>แผนที่ ${esc(x.planNo)}</b> ` : ''}${esc(x.title)} <span style="color:var(--muted);font-size:12px">${esc(x.grade)} ${esc(x.subject)}${x.term ? ' · ภาคเรียนที่ ' + esc(x.term) : ''}${x.unit ? ' · ' + esc(x.unit) : ''} · ${x.hours} ชม. · ใบงาน ${x.ideas} · ${esc(fmtDate(x.savedAt))}</span></span><span class="row"><button class="ghost small" data-open="${x.id}">เปิด</button><a class="btnlink" href="index.php?lp=${encodeURIComponent(x.id)}">สร้างใบงาน</a><button class="ghost small" data-copy="${x.id}">ทำสำเนา</button><button class="ghost small" data-del="${x.id}">ลบ</button></span></div>`).join('')
      : `<span style="color:var(--muted)">${st.saved.length ? 'ไม่พบแผนที่ตรงกับตัวกรอง' : 'ยังไม่มีแผนที่บันทึก'}</span>`;
  }
  async function loadSaved() {
    try {
      st.saved = (await api('api/lplan.php', { action: 'list' })).items;
      const fill = (id, first, vals) => {
        const cur = $(id).value;
        $(id).innerHTML = `<option value="">${first}</option>` + vals.map((v) => `<option>${esc(v)}</option>`).join('');
        if (vals.includes(cur)) $(id).value = cur;
      };
      fill('fGrade', 'ทุกชั้น', GRADES.filter((g) => st.saved.some((x) => x.grade === g)));
      fill('fSubject', 'ทุกวิชา', [...new Set(st.saved.map((x) => x.subject).filter(Boolean))]);
      renderSaved();
    } catch (e) {
      showError(e.message);
    }
  }
  for (const id of ['fGrade', 'fSubject', 'fTerm']) $(id).addEventListener('change', renderSaved);
  $('fQ').addEventListener('input', renderSaved);
  $('saved').addEventListener('click', async (e) => {
    const o = e.target.closest('[data-open]'), c = e.target.closest('[data-copy]'), d = e.target.closest('[data-del]');
    try {
      if (o) {
        if (st.dirty && !window.confirm('แผนที่แสดงอยู่ยังไม่ได้บันทึก เปิดแผนอื่นเลยไหม?')) return;
        openPlan(o.dataset.open);
      }
      if (c) {
        const r = await api('api/lplan.php', { action: 'copy', id: c.dataset.copy });
        await loadSaved();
        openPlan(r.id);
      }
      if (d && window.confirm('ลบแผนนี้? (ใบงานที่สร้างไปแล้วไม่ถูกลบ)')) {
        await api('api/lplan.php', { action: 'delete', id: d.dataset.del });
        if (st.id === d.dataset.del) { st.id = ''; markDirty(); }
        loadSaved();
      }
    } catch (er) {
      showError(er.message);
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (st.dirty && st.plan) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ---------- เริ่มต้น / รับค่าจาก URL ---------- */
  (async () => {
    const qs = new URLSearchParams(location.search);
    loadSaved();
    if (qs.get('open')) {
      history.replaceState(null, '', location.pathname);
      return openPlan(qs.get('open'));
    }
    if (qs.get('topic') || qs.get('unit')) {
      history.replaceState(null, '', location.pathname);
      writeHead({ grade: qs.get('grade') || $('grade').value, subject: qs.get('subject') || $('subject').value, term: qs.get('term') || '', unit: qs.get('unit') || '', topic: qs.get('topic') || '', year: $('year').value, school: $('school').value, teacher: $('teacher').value, hours: Number(qs.get('hours')) || 1, periodMinutes: Number($('periodMinutes').value) || 50, model: $('model').value });
      await loadIndicators((qs.get('ind') || '').split(',').filter(Boolean));
      $('formBox').scrollIntoView();
      return;
    }
    loadIndicators();
  })();
})();
