<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/core/core.php';
require_once __DIR__ . '/../src/core/settings.php';
require_once __DIR__ . '/../src/core/gcal.php';
require_once __DIR__ . '/../src/ai/ai.php';
require_once __DIR__ . '/../src/ai/schemas.php';
require_once __DIR__ . '/../src/planning/schedule.php';

/**
 * จัดตารางสอนด้วย AI แล้วสร้างลง Google Calendar (เฉพาะแอดมิน และต้องฝังใน nextbeyond)
 *   init                      → { teachers, courses, cfg, configured }
 *   draft  {…เงื่อนไข…, useAi} → { slots[], issues[], unplaced[], aiUsed, aiError, summary, reqs[] }
 *   check  {…เงื่อนไข…, slots} → { slots[], issues[] }          ตรวจตารางที่แก้มือ
 *   commit {…เงื่อนไข…, slots, invite} → { created, failed, errors[], sync }
 * เงื่อนไข: items[{courseId,perWeek,minutes}], days[0-6 จันทร์=0], dayStart, dayEnd (HH:MM),
 *           avail{teacherId:[{day,from,to}]}, startDate, endDate, note
 */
function sched_request(array $b, PDO $pdo): array
{
    $items = array_slice((array) ($b['items'] ?? []), 0, 40);
    if (!$items) {
        throw new RuntimeException('เลือกคอร์สที่ต้องการจัดอย่างน้อย 1 คอร์ส');
    }
    $days = array_values(array_unique(array_filter(array_map('intval', (array) ($b['days'] ?? [])), fn($d) => $d >= 0 && $d <= 6)));
    sort($days);
    $ds = sched_min((string) ($b['dayStart'] ?? ''));
    $de = sched_min((string) ($b['dayEnd'] ?? ''));
    if (!$days || $ds < 0 || $de <= $ds) {
        throw new RuntimeException('ตั้งวันและช่วงเวลาที่เปิดสอนให้ถูกต้อง');
    }
    $sd = (string) ($b['startDate'] ?? '');
    $ed = (string) ($b['endDate'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $sd) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $ed) || $ed < $sd) {
        throw new RuntimeException('ตั้งวันที่เริ่มและสิ้นสุดให้ถูกต้อง');
    }
    if ((new DateTimeImmutable($sd))->modify('+400 days') < new DateTimeImmutable($ed)) {
        throw new RuntimeException('ช่วงวันที่ยาวเกิน 400 วัน');
    }
    $ids = array_values(array_unique(array_map(fn($i) => (int) ($i['courseId'] ?? 0), $items)));
    $in = implode(',', array_fill(0, count($ids), '?'));
    $cq = $pdo->prepare("SELECT c.id, c.title, c.teacher_id, u.email, u.first_name, u.last_name, u.nickname
                         FROM courses c LEFT JOIN users u ON u.id = c.teacher_id WHERE c.id IN ($in)");
    $cq->execute($ids);
    $rows = [];
    foreach ($cq->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $rows[(int) $r['id']] = $r;
    }
    $saved = (array) (settings_read(true)['teacherEmails'] ?? []);
    $reqs = [];
    foreach ($items as $it) {
        $r = $rows[(int) ($it['courseId'] ?? 0)] ?? null;
        if (!$r) {
            throw new RuntimeException('ไม่พบคอร์สที่เลือก');
        }
        if (empty($r['teacher_id'])) {
            throw new RuntimeException('คอร์ส “' . $r['title'] . '” ยังไม่ได้กำหนดครูผู้สอน ไปกำหนดครูที่คอร์สก่อน');
        }
        $reqs[] = [
            'courseId' => (int) $r['id'], 'courseTitle' => (string) $r['title'], 'teacherId' => (int) $r['teacher_id'],
            'teacherName' => trim($r['first_name'] . ' ' . $r['last_name']),
            'teacherEmail' => sched_real_email((string) (((array) ($b['emails'] ?? []))[(string) $r['teacher_id']] ?? '')) ?: sched_real_email((string) ($saved[(string) $r['teacher_id']] ?? '')) ?: sched_real_email((string) ($r['email'] ?? '')),
            'nickname' => (string) ($r['nickname'] ?? ''),
            'perWeek' => max(1, min(7, (int) ($it['perWeek'] ?? 1))), 'minutes' => max(30, min(240, (int) ($it['minutes'] ?? 60))),
        ];
    }
    $avail = [];
    foreach ((array) ($b['avail'] ?? []) as $tid => $list) {
        foreach ((array) $list as $a) {
            $f = sched_min((string) ($a['from'] ?? ''));
            $t = sched_min((string) ($a['to'] ?? ''));
            if ($f >= 0 && $t > $f && isset($a['day']) && (int) $a['day'] >= 0 && (int) $a['day'] <= 6) {
                $avail[(string) (int) $tid][] = ['day' => (int) $a['day'], 'from' => $f, 'to' => $t];
            }
        }
    }
    $tids = array_values(array_unique(array_column($reqs, 'teacherId')));
    $existing = [];
    $in2 = implode(',', array_fill(0, count($tids), '?'));
    $eq = $pdo->prepare("SELECT teacher_id, event_date, start_time, end_time FROM calendar_events
                         WHERE teacher_id IN ($in2) AND status = 'scheduled' AND event_date BETWEEN ? AND ?");
    $eq->execute(array_merge($tids, [$sd, $ed]));
    foreach ($eq->fetchAll(PDO::FETCH_ASSOC) as $e) {
        $existing[$e['teacher_id'] . '|' . $e['event_date']][] = ['from' => sched_min((string) $e['start_time']), 'to' => sched_min((string) $e['end_time'])];
    }
    $cfg = ['days' => $days, 'dayStart' => $ds, 'dayEnd' => $de, 'avail' => $avail, 'startDate' => $sd, 'endDate' => $ed, 'existing' => $existing];
    return [$reqs, $cfg];
}

function sched_real_email(string $e): string
{
    $e = mb_strtolower(trim($e));
    return $e !== '' && filter_var($e, FILTER_VALIDATE_EMAIL) && !preg_match('/\.internal$/', $e) ? $e : '';
}

function sched_slots_in(array $b): array
{
    $out = [];
    foreach (array_slice((array) ($b['slots'] ?? []), 0, 200) as $s) {
        $st = sched_min((string) ($s['start'] ?? ''));
        if ($st >= 0) {
            $out[] = ['reqIx' => (int) ($s['reqIx'] ?? -1), 'day' => (int) ($s['day'] ?? -1), 'start' => $st];
        }
    }
    return $out;
}

function sched_slots_out(array $slots): array
{
    return array_map(fn($s) => ['reqIx' => $s['reqIx'], 'day' => $s['day'], 'start' => sched_hhmm($s['start']), 'end' => sched_hhmm($s['end'])], $slots);
}

try {
    $b = api_guard();
    $action = (string) ($b['action'] ?? '');
    $pdo = store_pdo();
    if (!$pdo) {
        json_out(['error' => 'จัดตารางได้เมื่อฝังใน nextbeyond เท่านั้น'], 400);
    }
    if (defined('TA_IS_ADMIN') && !TA_IS_ADMIN) {
        json_out(['error' => 'เฉพาะแอดมินจัดตารางสอนได้'], 403);
    }
    $c = gcal_config();

    if ($action === 'init') {
        $saved = (array) (settings_read(true)['teacherEmails'] ?? []);
        $teachers = $pdo->query("SELECT id, first_name, last_name, nickname, email FROM users WHERE role = 'teacher' AND (is_active IS NULL OR is_active = 1) ORDER BY first_name")->fetchAll(PDO::FETCH_ASSOC);
        $courses = $pdo->query("SELECT id, title, teacher_id FROM courses WHERE status <> 'archived' ORDER BY title")->fetchAll(PDO::FETCH_ASSOC);
        json_out([
            'configured' => $c['scriptUrl'] !== '' && $c['secret'] !== '',
            'teachers' => array_map(function ($t) use ($saved) {
                return ['id' => (int) $t['id'], 'name' => trim($t['first_name'] . ' ' . $t['last_name']), 'nickname' => (string) $t['nickname'],
                    'email' => sched_real_email((string) ($saved[(string) $t['id']] ?? '')) ?: sched_real_email((string) $t['email'])];
            }, $teachers),
            'courses' => array_map(fn($x) => ['id' => (int) $x['id'], 'title' => (string) $x['title'], 'teacherId' => $x['teacher_id'] === null ? null : (int) $x['teacher_id']], $courses),
            'cfg' => (array) (settings_read(true)['schedule'] ?? []),
        ]);
    }

    if (in_array($action, ['draft', 'check', 'commit'], true)) {
        [$reqs, $cfg] = sched_request($b, $pdo);
        // จำค่าที่ตั้งไว้ ครั้งหน้าไม่ต้องกรอกใหม่
        $s = settings_read(true);
        $s['schedule'] = ['days' => $cfg['days'], 'dayStart' => (string) $b['dayStart'], 'dayEnd' => (string) $b['dayEnd'], 'avail' => (array) ($b['avail'] ?? []), 'minutes' => (int) ($b['items'][0]['minutes'] ?? 60)];
        foreach ($reqs as $r) { // จำอีเมล Google ของครู (ใช้เชิญ และใช้จับคู่คาบกับครูตอนซิงค์)
            if ($r['teacherEmail'] !== '') {
                $s['teacherEmails'][(string) $r['teacherId']] = $r['teacherEmail'];
            }
        }
        settings_write($s);

        if ($action === 'draft') {
            $provider = null;
            if (!empty($b['useAi'])) {
                $provider = resolve_provider('text', $b['textProvider'] ?? null);
                require_provider($provider);
                check_quota(1);
            }
            @set_time_limit(120);
            $d = sched_draft($reqs, $cfg, (string) ($b['note'] ?? ''), $provider);
            $d['slots'] = sched_slots_out($d['slots']);
            $d['reqs'] = array_map(fn($r) => ['courseId' => $r['courseId'], 'courseTitle' => $r['courseTitle'], 'teacherName' => $r['nickname'] ?: $r['teacherName'], 'perWeek' => $r['perWeek'], 'minutes' => $r['minutes']], $reqs);
            json_out($d);
        }

        [$ok, $issues] = sched_validate(sched_slots_in($b), $reqs, $cfg);
        $missing = [];
        foreach ($reqs as $ix => $r) {
            if (count(array_filter($ok, fn($s) => $s['reqIx'] === $ix)) < $r['perWeek']) {
                $missing[] = $r['courseTitle'] . ': ยังจัดไม่ครบ ' . $r['perWeek'] . ' คาบต่อสัปดาห์';
            }
        }
        if ($action === 'check') {
            json_out(['slots' => sched_slots_out($ok), 'issues' => array_merge($issues, $missing)]);
        }

        // commit: ตรวจใหม่ฝั่งเซิร์ฟเวอร์ ถ้ามีที่ผิดไม่สร้างอะไรเลย
        if ($issues || $missing || !$ok) {
            json_out(['error' => 'ตารางยังมีที่ไม่ผ่านการตรวจ: ' . implode(' / ', array_slice(array_merge($issues, $missing), 0, 3))], 422);
        }
        if ($c['scriptUrl'] === '' || $c['secret'] === '') {
            json_out(['error' => 'ยังไม่ได้เชื่อม Google (ตั้งค่าที่ “ตั้งค่าระบบ → Google”)'], 400);
        }
        $noMail = array_values(array_unique(array_map(fn($r) => $r['nickname'] ?: $r['teacherName'], array_filter($reqs, fn($r) => $r['teacherEmail'] === ''))));
        @set_time_limit(300);
        $created = 0;
        $errors = [];
        foreach ($ok as $sl) {
            $r = $reqs[$sl['reqIx']];
            $dates = sched_dates($cfg['startDate'], $cfg['endDate'], $sl['day']);
            if (!$dates) {
                $errors[] = $r['courseTitle'] . ': ไม่มีวัน' . SCHED_DAYS[$sl['day']] . 'ในช่วงที่เลือก';
                continue;
            }
            try {
                gcal_create_weekly($r, $sl, $dates[0], $cfg['endDate'], !empty($b['invite']));
                $created++;
            } catch (Throwable $e) {
                $errors[] = $r['courseTitle'] . ' ' . SCHED_DAYS[$sl['day']] . ' ' . sched_hhmm($sl['start']) . ': ' . $e->getMessage();
                if (count($errors) >= 3) {
                    break;
                }
            }
        }
        $sync = null;
        if ($created) {
            try {
                $sync = gcal_sync($pdo, 14, 120, defined("TA_OWNER_ID") ? (int) TA_OWNER_ID : 0);
            } catch (Throwable $e) {
                $errors[] = 'สร้างใน Google แล้ว แต่ซิงค์เข้า LMS ไม่สำเร็จ (กดซิงค์ที่หน้าปฏิทิน): ' . $e->getMessage();
            }
        }
        json_out(['created' => $created, 'failed' => count($errors), 'errors' => $errors, 'sync' => $sync, 'noEmail' => $noMail]);
    }

    json_out(['error' => 'ไม่รู้จักคำสั่ง'], 400);
} catch (Throwable $e) {
    if ($e instanceof ApiException) {
        json_error($e);
    }
    json_out(['error' => $e->getMessage()], 500);
}
