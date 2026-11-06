/**
 * ผู้ช่วยครู AI → เก็บไฟล์ต้นฉบับของ “คลังเอกสารอ้างอิง” ไว้ใน Google Drive ของบัญชีนี้
 * วิธีติดตั้ง: Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone
 * ไฟล์จะอยู่ในโฟลเดอร์ “ผู้ช่วยครู AI - คลังเอกสาร” และตั้งเป็น “ทุกคนที่มีลิงก์ดูได้” เพื่อเปิดดูเป็นเล่มในเว็บ
 * อ่านไฟล์กลับมาให้เว็บถอดข้อความ/OCR ได้ (action info/read) ไม่ต้องเลือกไฟล์จากเครื่องซ้ำ
 * Google Calendar: ดึงตารางสอนจากปฏิทินให้ระบบ (cal_list) และสร้างห้อง Google Meet ให้คาบที่ยังไม่มี (cal_add_meet)
 * จัดโฟลเดอร์อัตโนมัติ: คลังเอกสาร / ชั้น / วิชา / เทอม (เว็บส่งเส้นทางมาให้ในแต่ละไฟล์)
 * SECRET ด้านล่างกันคนนอกส่งไฟล์เข้ามา ห้ามแก้ (ต้องตรงกับที่เว็บเก็บไว้)
 */
const SECRET = '__SECRET__';
const FOLDER = 'ผู้ช่วยครู AI - คลังเอกสาร';
const VERSION = 6;

function doGet() {
  return out({ ok: true, app: 'teacher-ai-drive' });
}

function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.secret !== SECRET) return out({ error: 'รหัสเชื่อมต่อไม่ตรงกัน (คัดลอกโค้ดจากหน้าตั้งค่าใหม่ แล้ว Deploy อีกครั้ง)' });

    if (b.action === 'ping') {
      const f = folder();
      return out({ ok: true, v: VERSION, email: Session.getEffectiveUser().getEmail(), folderUrl: f.getUrl() });
    }

    if (b.action === 'start') {
      const type = String(b.type || 'application/octet-stream');
      const meta = { name: String(b.name || 'file').slice(0, 200), parents: [folderAt(b.path).getId()], mimeType: type, description: 'อัปโหลดจาก ผู้ช่วยครู AI (คลังเอกสารอ้างอิง)' };
      const r = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id', {
        method: 'post',
        contentType: 'application/json; charset=UTF-8',
        payload: JSON.stringify(meta),
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': type, 'X-Upload-Content-Length': String(b.size) },
        muteHttpExceptions: true,
      });
      if (r.getResponseCode() !== 200) return out({ error: 'เริ่มอัปโหลดไม่ได้: ' + r.getContentText().slice(0, 300) });
      const h = r.getAllHeaders();
      const loc = h.Location || h.location || Object.keys(h).filter((k) => k.toLowerCase() === 'location').map((k) => h[k])[0];
      if (!loc) return out({ error: 'Google Drive ไม่ส่งที่อยู่อัปโหลดกลับมา' });
      return out({ session: String(loc) });
    }

    if (b.action === 'chunk') {
      if (!/^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?/.test(String(b.session))) return out({ error: 'ที่อยู่อัปโหลดไม่ถูกต้อง' });
      const bytes = Utilities.base64Decode(String(b.data));
      const start = Number(b.offset);
      const end = start + bytes.length - 1;
      const r = UrlFetchApp.fetch(String(b.session), {
        method: 'put',
        contentType: 'application/octet-stream',
        payload: bytes,
        headers: { 'Content-Range': 'bytes ' + start + '-' + end + '/' + Number(b.size) },
        muteHttpExceptions: true,
        followRedirects: false,
      });
      const code = r.getResponseCode();
      if (code === 308) return out({ next: end + 1 });
      if (code === 200 || code === 201) {
        const id = JSON.parse(r.getContentText()).id;
        try { DriveApp.getFileById(id).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) { /* บางองค์กรห้ามแชร์สาธารณะ */ }
        return out({ id: id, url: 'https://drive.google.com/file/d/' + id + '/view' });
      }
      return out({ error: 'อัปโหลดไม่สำเร็จ (HTTP ' + code + ') ' + r.getContentText().slice(0, 200) });
    }

    if (b.action === 'info') {
      const r = driveGet(String(b.id), '?fields=name,size,mimeType', {});
      if (r.getResponseCode() !== 200) return out({ error: 'เปิดไฟล์ใน Drive ไม่ได้ (บัญชีที่ติดตั้งสคริปต์ต้องมีสิทธิ์เข้าถึงไฟล์นี้)' });
      const j = JSON.parse(r.getContentText());
      return out({ name: j.name, size: Number(j.size || 0), mimeType: j.mimeType });
    }

    if (b.action === 'read') {
      const start = Number(b.offset), end = start + Math.min(Number(b.length) || 3145728, 3145728) - 1;
      const r = driveGet(String(b.id), '?alt=media', { Range: 'bytes=' + start + '-' + end });
      const code = r.getResponseCode();
      if (code !== 200 && code !== 206) return out({ error: 'อ่านไฟล์จาก Drive ไม่ได้ (HTTP ' + code + ')' });
      return out({ data: Utilities.base64Encode(r.getContent()) });
    }

    if (b.action === 'cal_list') {
      const cal = String(b.calendarId || 'primary');
      const items = [];
      let token = '', pages = 0;
      do {
        const q = 'singleEvents=true&orderBy=startTime&showDeleted=true&maxResults=250'
          + '&timeMin=' + encodeURIComponent(String(b.timeMin)) + '&timeMax=' + encodeURIComponent(String(b.timeMax))
          + (token ? '&pageToken=' + encodeURIComponent(token) : '')
          + '&fields=' + encodeURIComponent('nextPageToken,timeZone,items(id,status,summary,description,location,htmlLink,hangoutLink,start,end,updated,organizer(email),creator(email),attendees(email,responseStatus,resource),conferenceData(entryPoints(entryPointType,uri)),recurringEventId)');
        const r = calGet(cal, '/events?' + q);
        if (r.getResponseCode() !== 200) return out({ error: calErr(r) });
        const j = JSON.parse(r.getContentText());
        (j.items || []).forEach(function (e) { items.push(e); });
        token = j.nextPageToken || '';
      } while (token && ++pages < 20);
      return out({ items: items, truncated: !!token });
    }

    if (b.action === 'cal_add_meet') {
      const cal = String(b.calendarId || 'primary');
      const id = encodeURIComponent(String(b.eventId));
      const r = UrlFetchApp.fetch('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(cal) + '/events/' + id + '?conferenceDataVersion=1&sendUpdates=none', {
        method: 'patch',
        contentType: 'application/json; charset=UTF-8',
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        payload: JSON.stringify({ conferenceData: { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } } }),
        muteHttpExceptions: true,
      });
      if (r.getResponseCode() !== 200) return out({ error: calErr(r) });
      let e = JSON.parse(r.getContentText());
      for (let i = 0; i < 4 && !e.hangoutLink; i++) { // ห้องอาจใช้เวลาสร้างสักครู่
        Utilities.sleep(800);
        const g = calGet(cal, '/events/' + id + '?fields=hangoutLink');
        if (g.getResponseCode() === 200) e = Object.assign(e, JSON.parse(g.getContentText()));
      }
      return out(e.hangoutLink ? { meetUrl: e.hangoutLink } : { error: 'สร้างห้อง Meet ไม่สำเร็จ (บัญชีนี้อาจไม่มีสิทธิ์สร้าง Meet)' });
    }

    if (b.action === 'cal_insert') { // สร้างกิจกรรม (ซ้ำรายสัปดาห์ได้) พร้อมห้อง Google Meet และเชิญครู
      const cal = String(b.calendarId || 'primary');
      const ev = b.event || {};
      ev.conferenceData = { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
      const r = UrlFetchApp.fetch('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(cal) + '/events?conferenceDataVersion=1&sendUpdates=' + (b.sendUpdates === 'all' ? 'all' : 'none'), {
        method: 'post',
        contentType: 'application/json; charset=UTF-8',
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        payload: JSON.stringify(ev),
        muteHttpExceptions: true,
      });
      if (r.getResponseCode() !== 200) return out({ error: calErr(r) });
      const e = JSON.parse(r.getContentText());
      return out({ id: e.id, htmlLink: e.htmlLink || '', meetUrl: e.hangoutLink || '' });
    }

    if (b.action === 'rec_list') { // วิดีโอที่ Google Meet บันทึกไว้ในโฟลเดอร์ “Meet Recordings” ของบัญชีนี้
      const since = new Date(Number(b.sinceMs) || (Date.now() - 14 * 86400000));
      const q = 'mimeType contains "video/" and createdDate > "' + Utilities.formatDate(since, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'") + '"';
      const files = [], seen = {};
      ['Meet Recordings', 'Meet การบันทึก'].forEach(function (nm) {
        const fs = DriveApp.getFoldersByName(nm);
        while (fs.hasNext()) {
          const it = fs.next().searchFiles(q);
          while (it.hasNext() && files.length < 200) {
            const f = it.next();
            if (seen[f.getId()]) continue;
            seen[f.getId()] = 1;
            files.push({ id: f.getId(), name: f.getName(), created: f.getDateCreated().getTime(), size: f.getSize(), url: f.getUrl() });
          }
        }
      });
      return out({ files: files });
    }

    if (b.action === 'rec_share') { // ให้ใครมีลิงก์ก็เปิดดูได้ (นักเรียนกดลิงก์ไปดูที่ Drive)
      const f = DriveApp.getFileById(String(b.id));
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return out({ ok: true, url: f.getUrl() });
    }

    if (b.action === 'move') {
      const f = DriveApp.getFileById(String(b.id));
      f.moveTo(folderAt(b.path));
      return out({ ok: true });
    }

    return out({ error: 'ไม่รู้จักคำสั่ง' });
  } catch (err) {
    return out({ error: String((err && err.message) || err) });
  }
}

/** โฟลเดอร์ย่อยตามเส้นทาง เช่น ['ป.1','ภาษาอังกฤษ','เทอม 1'] (สร้างให้ถ้ายังไม่มี) */
function folderAt(path) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    let f = folder();
    (Array.isArray(path) ? path : []).slice(0, 5).forEach(function (n) {
      const name = String(n || '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!name) return;
      const it = f.getFoldersByName(name);
      f = it.hasNext() ? it.next() : f.createFolder(name);
    });
    return f;
  } finally { lock.releaseLock(); }
}

function calGet(cal, path) {
  return UrlFetchApp.fetch('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(cal) + path, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true,
  });
}

function calErr(r) {
  let m = '';
  try { m = (JSON.parse(r.getContentText()).error || {}).message || ''; } catch (e) { /* ไม่เป็นไร */ }
  return 'Google Calendar: ' + (m || 'HTTP ' + r.getResponseCode()) + (r.getResponseCode() === 404 ? ' (ไม่พบปฏิทินนี้ ตรวจ “ID ปฏิทิน” และการแชร์ปฏิทินให้บัญชีนี้)' : '');
}

/** กด Run ฟังก์ชันนี้ 1 ครั้งหลังวางโค้ดใหม่ เพื่ออนุญาตสิทธิ์ Google Calendar (จำเป็นสำหรับระบบตารางสอน) แล้วค่อย Deploy */
function authorize() {
  CalendarApp.getDefaultCalendar(); // ทำให้ Google ขอสิทธิ์ปฏิทิน
  DriveApp.getRootFolder();
  UrlFetchApp.fetch('https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest', { muteHttpExceptions: true });
}

function driveGet(id, query, headers) {
  if (!/^[\w-]{10,}$/.test(id)) throw new Error('รหัสไฟล์ไม่ถูกต้อง');
  headers.Authorization = 'Bearer ' + ScriptApp.getOAuthToken();
  return UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + query, { headers: headers, muteHttpExceptions: true });
}

function folder() {
  const it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
