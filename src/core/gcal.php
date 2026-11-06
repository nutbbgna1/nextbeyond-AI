<?php
declare(strict_types=1);

/* ------------------------------------------------------------------ */
/*  ซิงค์ Google Calendar (ต้นฉบับ) → ตารางสอนของ LMS (calendar_events)   */
/*  ติดต่อ Google ผ่าน Apps Script ตัวเดียวกับที่ใช้เก็บไฟล์ใน Drive         */
/*  (src/reference/gdrive-apps-script.gs รุ่น 4 ขึ้นไป) ฝั่ง Server เป็นคนเรียก */
/*  รหัสลับของสคริปต์จึงไม่หลุดไปที่เบราว์เซอร์ของครู                         */
/* ------------------------------------------------------------------ */

const GCAL_TZ = 'Asia/Bangkok';
const GCAL_MIN_SCRIPT_VERSION = 4;

/** ค่าเชื่อมต่อ: ['scriptUrl','secret','calendarId'] */
function gcal_config(): array
{
    $g = (array) (settings_read(true)['gdrive'] ?? []);
    return [
        'scriptUrl' => (string) ($g['scriptUrl'] ?? ''),
        'secret' => (string) ($g['secret'] ?? ''),
        'calendarId' => trim((string) ($g['calendarId'] ?? '')) ?: 'primary',
        'lastSync' => (int) ($g['lastSync'] ?? 0),
        'lastRecSync' => (int) ($g['lastRecSync'] ?? 0),
    ];
}

/** เรียกคำสั่งของ Apps Script (POST JSON แบบ text/plain ตามที่ Apps Script รับ) */
function gcal_call(array $body): array
{
    if (isset($GLOBALS['GCAL_CALL_OVERRIDE']) && is_callable($GLOBALS['GCAL_CALL_OVERRIDE'])) { // ใช้ตอนทดสอบ
        return ($GLOBALS['GCAL_CALL_OVERRIDE'])($body);
    }
    $c = gcal_config();
    if ($c['scriptUrl'] === '' || $c['secret'] === '') {
        throw new RuntimeException('ยังไม่ได้เชื่อม Google (ผู้ดูแลระบบตั้งค่าที่เมนู “ตั้งค่า AI” → Google Drive & Calendar)');
    }
    if (!function_exists('curl_init')) {
        throw new RuntimeException('PHP ไม่มีส่วนขยาย curl (เปิด extension=curl ใน php.ini)');
    }
    $ch = curl_init($c['scriptUrl']);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['secret' => $c['secret']] + $body, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ['Content-Type: text/plain;charset=utf-8'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_POSTREDIR => 0, // Apps Script ตอบ 302 ไปยังที่เก็บผลลัพธ์: ต้องตามด้วย GET ไม่ใช่ POST ซ้ำ
        CURLOPT_TIMEOUT => 90,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false) {
        throw new RuntimeException('ติดต่อสคริปต์ Google ไม่ได้: ' . $err);
    }
    $j = json_decode((string) $raw, true);
    if (!is_array($j)) {
        throw new RuntimeException('สคริปต์ Google ไม่ตอบเป็นข้อมูล (HTTP ' . $code . ') ตรวจว่า Deploy เป็น Web app และ Who has access = Anyone');
    }
    if (isset($j['error'])) {
        $m = (string) $j['error'];
        if (str_contains($m, 'ไม่รู้จักคำสั่ง')) {
            $m = 'สคริปต์ Google เป็นรุ่นเก่า ยังไม่รองรับปฏิทิน ให้ผู้ดูแลอัปเดตสคริปต์เป็นรุ่น ' . GCAL_MIN_SCRIPT_VERSION . ' (เมนู “ตั้งค่า AI”)';
        }
        throw new RuntimeException($m);
    }
    return $j;
}

/* ------------------------------ ตารางข้อมูล ------------------------------ */

function gcal_has_column(PDO $pdo, string $col): bool
{
    try {
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            foreach ($pdo->query('PRAGMA table_info(calendar_events)')->fetchAll(PDO::FETCH_ASSOC) as $r) {
                if ($r['name'] === $col) {
                    return true;
                }
            }
            return false;
        }
        return (bool) $pdo->query("SHOW COLUMNS FROM calendar_events LIKE " . $pdo->quote($col))->fetchColumn();
    } catch (Throwable $e) {
        return false;
    }
}

/** เพิ่มคอลัมน์ที่ใช้ผูกกับ Google (ทำครั้งเดียว ปลอดภัยถ้าทำซ้ำ) */
function gcal_ensure_columns(PDO $pdo): void
{
    $add = [
        'gcal_id' => 'VARCHAR(255) NULL',
        'gcal_url' => 'VARCHAR(500) NULL',
        'gcal_synced_at' => 'DATETIME NULL',
        'meet_url' => 'VARCHAR(255) NULL',
        'meet_set_by' => 'INT NULL',
        'meet_set_at' => 'DATETIME NULL',
        'recording_url' => 'VARCHAR(500) NULL',
        'recording_set_at' => 'DATETIME NULL',
    ];
    foreach ($add as $col => $def) {
        if (!gcal_has_column($pdo, $col)) {
            $pdo->exec("ALTER TABLE calendar_events ADD COLUMN {$col} {$def}");
        }
    }
    try {
        $pdo->exec('CREATE INDEX idx_ce_gcal ON calendar_events (gcal_id)');
    } catch (Throwable $e) { /* มีอยู่แล้ว */ }
}

/* ------------------------------ แปลง event ------------------------------ */

function gcal_clean_text(?string $s): string
{
    $s = (string) $s;
    $s = preg_replace('~<br\s*/?>|</p>|</div>|</li>~i', "\n", $s);
    $s = html_entity_decode(strip_tags((string) $s), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim((string) preg_replace("/\n{3,}/", "\n\n", $s));
}

function gcal_meet_url(array $e): string
{
    $u = (string) ($e['hangoutLink'] ?? '');
    if ($u === '') {
        foreach ((array) ($e['conferenceData']['entryPoints'] ?? []) as $ep) {
            if (($ep['entryPointType'] ?? '') === 'video' && !empty($ep['uri'])) {
                $u = (string) $ep['uri'];
                break;
            }
        }
    }
    return preg_match('~^https://meet\.google\.com/[a-z0-9][a-z0-9-]{2,}(\?[A-Za-z0-9=&_%.-]*)?$~i', $u) ? $u : '';
}

/** เวลาเริ่ม/จบ ตามเวลาไทย; คืน null ถ้าเป็นกิจกรรมทั้งวัน */
function gcal_when(array $e): ?array
{
    $s = (string) ($e['start']['dateTime'] ?? '');
    $en = (string) ($e['end']['dateTime'] ?? '');
    if ($s === '' || $en === '') {
        return null;
    }
    $tz = new DateTimeZone(GCAL_TZ);
    $a = (new DateTimeImmutable($s))->setTimezone($tz);
    $b = (new DateTimeImmutable($en))->setTimezone($tz);
    $endTime = $b->format('Y-m-d') === $a->format('Y-m-d') ? $b->format('H:i:s') : '23:59:00'; // ข้ามเที่ยงคืน: ตัดที่สิ้นวัน
    if ($endTime <= $a->format('H:i:s')) {
        $endTime = '23:59:00';
    }
    return ['date' => $a->format('Y-m-d'), 'start' => $a->format('H:i:s'), 'end' => $endTime];
}

function gcal_event_type(string $title): string
{
    if (preg_match('/สอบ|ทดสอบ|exam|quiz|test/iu', $title)) {
        return 'exam';
    }
    if (preg_match('/ประชุม|meeting/iu', $title)) {
        return 'meeting';
    }
    return 'lesson';
}

/**
 * หาครูผู้สอนของ event: (1) อีเมลผู้เข้าร่วม/ผู้จัด ตรงกับอีเมลครูในระบบ
 * (2) ไม่พบ → ชื่อเล่น/ชื่อครูอยู่ในชื่อหรือรายละเอียด event (ต้องตรงกับครูเพียงคนเดียว)
 * $teachers = [ ['id'=>..,'email'=>..,'names'=>[...]], ... ]
 */
function gcal_pick_teacher(array $e, array $teachers): ?int
{
    $emails = [];
    foreach ((array) ($e['attendees'] ?? []) as $a) {
        if (empty($a['resource']) && !empty($a['email'])) {
            $emails[] = mb_strtolower(trim((string) $a['email']));
        }
    }
    foreach (['organizer', 'creator'] as $k) {
        if (!empty($e[$k]['email'])) {
            $emails[] = mb_strtolower(trim((string) $e[$k]['email']));
        }
    }
    foreach ($emails as $em) {
        foreach ($teachers as $t) {
            if ($t['email'] !== '' && $t['email'] === $em) {
                return (int) $t['id'];
            }
        }
    }
    $hay = mb_strtolower((string) ($e['summary'] ?? '') . ' ' . (string) ($e['description'] ?? ''));
    $found = [];
    foreach ($teachers as $t) {
        foreach ($t['names'] as $n) {
            if ($n !== '' && mb_strlen($n) >= 2 && str_contains($hay, $n)) {
                $found[(int) $t['id']] = true;
                break;
            }
        }
    }
    return count($found) === 1 ? (int) array_key_first($found) : null;
}

/** คอร์สที่ชื่อปรากฏในชื่อ event (เลือกชื่อที่ยาวที่สุด) */
function gcal_pick_course(string $title, array $courses): ?int
{
    $t = mb_strtolower($title);
    $best = null;
    $len = 0;
    foreach ($courses as $c) {
        $n = mb_strtolower(trim((string) $c['title']));
        if ($n !== '' && str_contains($t, $n) && mb_strlen($n) > $len) {
            $best = (int) $c['id'];
            $len = mb_strlen($n);
        }
    }
    return $best;
}

/* -------------------------------- ซิงค์ -------------------------------- */

/**
 * ดึงตารางจาก Google Calendar เข้า calendar_events (Google เป็นต้นฉบับ)
 * คืนสรุป: added, updated, cancelled, unchanged, skipped, unmapped[]
 */
function gcal_sync(PDO $pdo, int $daysBack = 14, int $daysAhead = 120, int $userId = 0): array
{
    gcal_ensure_columns($pdo);
    $cfg = gcal_config();
    $tz = new DateTimeZone(GCAL_TZ);
    $from = (new DateTimeImmutable('today', $tz))->modify("-{$daysBack} days");
    $to = (new DateTimeImmutable('today', $tz))->modify("+{$daysAhead} days");
    $res = gcal_call(['action' => 'cal_list', 'calendarId' => $cfg['calendarId'], 'timeMin' => $from->format('c'), 'timeMax' => $to->format('c')]);
    $items = (array) ($res['items'] ?? []);
    $complete = empty($res['truncated']);

    $teachers = [];
    foreach ($pdo->query("SELECT id, email, first_name, last_name, nickname FROM users WHERE role = 'teacher' AND (is_active IS NULL OR is_active = 1)")->fetchAll(PDO::FETCH_ASSOC) as $u) {
        $names = array_values(array_filter(array_map(static fn($x) => mb_strtolower(trim((string) $x)), [$u['nickname'] ?? '', $u['first_name'] ?? ''])));
        $teachers[] = ['id' => (int) $u['id'], 'email' => mb_strtolower(trim((string) ($u['email'] ?? ''))), 'names' => $names];
    }
    // อีเมล Google ของครูที่แอดมินกรอกไว้ในหน้าจัดตาราง (ใช้จับคู่ผู้เข้าร่วมกับครู)
    foreach ((array) (settings_read(true)['teacherEmails'] ?? []) as $tid => $em) {
        $em = mb_strtolower(trim((string) $em));
        if ($em !== '') {
            $teachers[] = ['id' => (int) $tid, 'email' => $em, 'names' => []];
        }
    }
    $courses = $pdo->query("SELECT id, title FROM courses WHERE status <> 'archived'")->fetchAll(PDO::FETCH_ASSOC);

    $existing = [];
    $q = $pdo->prepare('SELECT id, gcal_id, title, event_type, course_id, teacher_id, event_date, start_time, end_time, location, notes, status, meet_url, gcal_url FROM calendar_events WHERE gcal_id IS NOT NULL AND event_date BETWEEN :a AND :b');
    $q->execute([':a' => $from->format('Y-m-d'), ':b' => $to->format('Y-m-d')]);
    foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $existing[(string) $r['gcal_id']] = $r;
    }

    $sum = ['added' => 0, 'updated' => 0, 'cancelled' => 0, 'unchanged' => 0, 'skipped' => 0, 'unmapped' => [], 'fetched' => count($items), 'truncated' => !$complete];
    $seen = [];
    $now = date('Y-m-d H:i:s');
    foreach ($items as $e) {
        $gid = (string) ($e['id'] ?? '');
        if ($gid === '') {
            continue;
        }
        $seen[$gid] = true;
        $cancelled = ($e['status'] ?? '') === 'cancelled';
        $old = $existing[$gid] ?? null;
        if ($cancelled) {
            if ($old && $old['status'] !== 'cancelled') {
                $pdo->prepare("UPDATE calendar_events SET status = 'cancelled', gcal_synced_at = :n WHERE id = :id")->execute([':n' => $now, ':id' => $old['id']]);
                $sum['cancelled']++;
            }
            continue;
        }
        $when = gcal_when($e);
        if ($when === null) { // กิจกรรมทั้งวัน (เช่น วันหยุด) ไม่ใช่คาบเรียน
            $sum['skipped']++;
            continue;
        }
        $title = mb_substr(trim((string) ($e['summary'] ?? '')) ?: '(ไม่มีชื่อ)', 0, 300);
        $teacherId = $old ? (int) $old['teacher_id'] : null;
        $picked = gcal_pick_teacher($e, $teachers);
        if ($picked !== null) {
            $teacherId = $picked;
        }
        if (!$teacherId) {
            $sum['skipped']++;
            if (count($sum['unmapped']) < 15) {
                $sum['unmapped'][] = $title . ' · ' . $when['date'] . ' ' . substr($when['start'], 0, 5);
            }
            continue;
        }
        $meet = gcal_meet_url($e);
        $vals = [
            'title' => $title,
            'event_type' => gcal_event_type($title),
            'teacher_id' => $teacherId,
            'event_date' => $when['date'],
            'start_time' => $when['start'],
            'end_time' => $when['end'],
            'location' => mb_substr(trim((string) ($e['location'] ?? '')), 0, 255) ?: null,
            'notes' => mb_substr(gcal_clean_text($e['description'] ?? ''), 0, 4000) ?: null,
            'status' => 'scheduled',
            'gcal_url' => mb_substr((string) ($e['htmlLink'] ?? ''), 0, 500) ?: null,
        ];
        $courseId = gcal_pick_course($title, $courses);
        if ($old) {
            if ($courseId !== null) {
                $vals['course_id'] = $courseId; // ไม่เจอคอร์ส = คงที่แอดมินเลือกไว้ในระบบ
            }
            if ($meet !== '') {
                $vals['meet_url'] = $meet;
            }
            $changed = false;
            foreach ($vals as $k => $v) {
                $cur = $old[$k] ?? null;
                if ($k === 'start_time' || $k === 'end_time') {
                    $cur = $cur === null ? null : substr((string) $cur, 0, 8);
                }
                if ((string) $cur !== (string) $v) {
                    $changed = true;
                    break;
                }
            }
            if (!$changed) {
                $sum['unchanged']++;
                continue;
            }
            $sets = implode(', ', array_map(static fn($k) => "{$k} = :{$k}", array_keys($vals)));
            $vals['gcal_synced_at'] = $now;
            $sets .= ', gcal_synced_at = :gcal_synced_at';
            $vals['id'] = $old['id'];
            $pdo->prepare("UPDATE calendar_events SET {$sets} WHERE id = :id")->execute($vals);
            $sum['updated']++;
        } else {
            $vals['course_id'] = $courseId;
            $vals['gcal_id'] = $gid;
            $vals['color'] = '#2563eb';
            $vals['created_by'] = $userId > 0 ? $userId : null;
            $vals['gcal_synced_at'] = $now;
            if ($meet !== '') {
                $vals['meet_url'] = $meet;
                $vals['meet_set_at'] = $now;
            }
            $cols = array_keys($vals);
            $pdo->prepare('INSERT INTO calendar_events (' . implode(', ', $cols) . ') VALUES (:' . implode(', :', $cols) . ')')->execute($vals);
            $sum['added']++;
        }
    }
    // คาบที่เคยดึงมาแต่หายจาก Google แล้ว (ลบ event / ย้ายออกนอกช่วง) = ยกเลิก (ไม่ลบ เพราะอาจผูก Live Session/เนื้อหาไว้)
    if ($complete) {
        foreach ($existing as $gid => $r) {
            if (!isset($seen[$gid]) && $r['status'] !== 'cancelled' && $r['event_date'] >= (new DateTimeImmutable('today', $tz))->format('Y-m-d')) {
                $pdo->prepare("UPDATE calendar_events SET status = 'cancelled', gcal_synced_at = :n WHERE id = :id")->execute([':n' => $now, ':id' => $r['id']]);
                $sum['cancelled']++;
            }
        }
    }
    $s = settings_read(true);
    $s['gdrive'] = array_merge((array) ($s['gdrive'] ?? []), ['lastSync' => time()]);
    settings_write($s);
    return $sum;
}

/** สร้างห้อง Google Meet ให้ event (ที่ดึงมาจาก Google) คืนลิงก์ */
function gcal_add_meet(PDO $pdo, int $eventId): string
{
    gcal_ensure_columns($pdo);
    $q = $pdo->prepare('SELECT id, gcal_id, meet_url FROM calendar_events WHERE id = :id');
    $q->execute([':id' => $eventId]);
    $r = $q->fetch(PDO::FETCH_ASSOC);
    if (!$r) {
        throw new RuntimeException('ไม่พบคาบเรียนนี้');
    }
    if (!empty($r['meet_url'])) {
        return (string) $r['meet_url'];
    }
    if (empty($r['gcal_id'])) {
        throw new RuntimeException('คาบนี้สร้างในระบบ ไม่ได้มาจาก Google Calendar จึงสร้างห้อง Meet อัตโนมัติไม่ได้ (วางลิงก์เอง หรือสร้างคาบใน Google Calendar)');
    }
    $res = gcal_call(['action' => 'cal_add_meet', 'calendarId' => gcal_config()['calendarId'], 'eventId' => (string) $r['gcal_id']]);
    $url = (string) ($res['meetUrl'] ?? '');
    if (!preg_match('~^https://meet\.google\.com/~i', $url)) {
        throw new RuntimeException('สร้างห้อง Meet ไม่สำเร็จ');
    }
    $pdo->prepare('UPDATE calendar_events SET meet_url = :u, meet_set_at = :n WHERE id = :id')->execute([':u' => $url, ':n' => date('Y-m-d H:i:s'), ':id' => $eventId]);
    return $url;
}


/* ------------------------- วิดีโอบันทึกจาก Google Meet ------------------------- */

/** แยกชื่อไฟล์ที่ Meet ตั้งให้ → [title, date Y-m-d, minutes|null] หรือ null ถ้าไม่ใช่ไฟล์บันทึก
 *  รูปแบบที่พบ: "ชื่อ (2026-10-08 09:00 GMT+7) - Recording" และ "ชื่อ - 2026/10/08 09:00 ICT - Recording" */
function gcal_rec_parse(string $name): ?array
{
    $n = trim(preg_replace('/\.(mp4|mov|webm|mkv)$/i', '', $name));
    if (stripos($n, 'recording') === false && mb_strpos($n, 'บันทึก') === false) {
        return null;
    }
    if (preg_match('/^(.*?)\s*\((\d{4})[-\/](\d{2})[-\/](\d{2})(?:[ T](\d{1,2}):(\d{2}))?[^)]*\)/u', $n, $m)
        || preg_match('/^(.*?)\s+-\s+(\d{4})[-\/](\d{2})[-\/](\d{2})(?:\s+(\d{1,2}):(\d{2}))?/u', $n, $m)) {
        $title = trim($m[1]);
        if ($title === '') {
            return null;
        }
        return [$title, "{$m[2]}-{$m[3]}-{$m[4]}", isset($m[5]) && $m[5] !== '' ? ((int) $m[5]) * 60 + (int) $m[6] : null];
    }
    return null;
}

/** จับคู่ไฟล์บันทึกกับคาบ (ชื่อกิจกรรมตรงกัน + วันเดียวกัน + เวลาใกล้สุด) แล้วใส่ลิงก์ให้คาบที่ยังไม่มี */
function gcal_rec_sync(PDO $pdo, int $daysBack = 21): array
{
    gcal_ensure_columns($pdo);
    $res = gcal_call(['action' => 'rec_list', 'sinceMs' => (time() - $daysBack * 86400) * 1000]);
    $files = (array) ($res['files'] ?? []);
    $out = ['found' => count($files), 'linked' => 0, 'already' => 0, 'unmatched' => []];
    $q = $pdo->prepare("SELECT id, title, start_time, recording_url FROM calendar_events WHERE event_date = :d AND status <> 'cancelled' AND gcal_id IS NOT NULL");
    foreach ($files as $f) {
        $p = gcal_rec_parse((string) ($f['name'] ?? ''));
        if (!$p) {
            continue;
        }
        [$title, $date, $mins] = $p;
        $q->execute([':d' => $date]);
        $best = null;
        $bestGap = PHP_INT_MAX;
        foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $ev) {
            if (mb_strtolower(trim((string) $ev['title'])) !== mb_strtolower($title)) {
                continue;
            }
            $evMin = ((int) substr((string) $ev['start_time'], 0, 2)) * 60 + (int) substr((string) $ev['start_time'], 3, 2);
            $gap = $mins === null ? 0 : abs($evMin - $mins);
            if ($gap <= 240 && $gap < $bestGap) {
                $best = $ev;
                $bestGap = $gap;
            }
        }
        if (!$best) {
            $out['unmatched'][] = (string) $f['name'];
            continue;
        }
        if (!empty($best['recording_url'])) {
            $out['already']++;
            continue;
        }
        try {
            $sh = gcal_call(['action' => 'rec_share', 'id' => (string) $f['id']]);
        } catch (Throwable $e) {
            $out['unmatched'][] = (string) $f['name'] . ' (แชร์ไม่ได้: ' . $e->getMessage() . ')';
            continue;
        }
        $url = (string) ($sh['url'] ?? $f['url'] ?? '');
        if (!preg_match('~^https://(drive|docs)\.google\.com/~i', $url)) {
            continue;
        }
        $pdo->prepare('UPDATE calendar_events SET recording_url = :u, recording_set_at = :n WHERE id = :id')->execute([':u' => $url, ':n' => date('Y-m-d H:i:s'), ':id' => $best['id']]);
        $out['linked']++;
    }
    return $out;
}

/* ---------------------- สร้างคาบประจำสัปดาห์ใน Google Calendar ---------------------- */

/** สร้างกิจกรรมซ้ำรายสัปดาห์ 1 รายการ (พร้อม Meet) คืน {id, htmlLink, meetUrl}
 *  $req ต้องมี courseTitle, nickname, teacherName, teacherEmail; $slot: day (จันทร์=0), start, end เป็นนาที */
function gcal_create_weekly(array $req, array $slot, string $firstDate, string $endDate, bool $invite): array
{
    $tz = new DateTimeZone(GCAL_TZ);
    $hh = static fn(int $m): string => sprintf('%02d:%02d:00', intdiv($m, 60), $m % 60);
    $until = (new DateTimeImmutable($endDate . ' 23:59:59', $tz))->setTimezone(new DateTimeZone('UTC'))->format('Ymd\THis\Z');
    $email = mb_strtolower(trim((string) ($req['teacherEmail'] ?? '')));
    $attendees = [];
    if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) && !preg_match('/\.internal$/', $email)) {
        $attendees[] = ['email' => $email];
    }
    $event = [
        'summary' => (string) $req['courseTitle'],
        'description' => 'ครู' . (($req['nickname'] ?? '') !== '' ? $req['nickname'] : $req['teacherName']) . "\nสร้างโดยระบบจัดตารางสอนอัตโนมัติ (ผู้ช่วยครู AI)",
        'start' => ['dateTime' => $firstDate . 'T' . $hh((int) $slot['start']), 'timeZone' => GCAL_TZ],
        'end' => ['dateTime' => $firstDate . 'T' . $hh((int) $slot['end']), 'timeZone' => GCAL_TZ],
        'recurrence' => ['RRULE:FREQ=WEEKLY;UNTIL=' . $until],
    ];
    if ($attendees) {
        $event['attendees'] = $attendees;
    }
    return gcal_call(['action' => 'cal_insert', 'calendarId' => gcal_config()['calendarId'], 'event' => $event, 'sendUpdates' => $invite && $attendees ? 'all' : 'none']);
}
