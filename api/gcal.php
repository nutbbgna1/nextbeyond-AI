<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/core/core.php';
require_once __DIR__ . '/../src/core/settings.php';
require_once __DIR__ . '/../src/core/gcal.php';

/**
 * ซิงค์ Google Calendar → ตารางสอนของ LMS (ใช้ได้เมื่อฝังใน nextbeyond เท่านั้น เพราะเขียนตาราง calendar_events)
 *   status                      → { configured, calendarId, lastSync }
 *   sync { auto? }              → { summary:{added,updated,cancelled,unchanged,skipped,unmapped[]}, skippedRecent? }
 *                                 auto=true: ข้ามถ้าเพิ่งซิงค์ภายใน 3 นาที
 *   rec_sync { auto? }          → { rec:{found,linked,already,unmatched[]} }  ดึงวิดีโอบันทึก Meet จาก Drive มาผูกกับคาบ (auto: ข้ามถ้าเพิ่งทำภายใน 10 นาที)
 *   add_meet { eventId }        → { meetUrl }   สร้างห้อง Google Meet ให้คาบที่มาจาก Google
 *   add_meet_all                → { made, failed, errors[] }   สร้างห้อง Meet ให้ทุกคาบที่กำลังจะถึง (7 วัน) ที่ยังไม่มี
 */
try {
    $b = api_guard();
    $action = (string) ($b['action'] ?? '');
    $c = gcal_config();

    if ($action === 'status') {
        json_out(['configured' => $c['scriptUrl'] !== '' && $c['secret'] !== '', 'calendarId' => $c['calendarId'], 'lastSync' => $c['lastSync']]);
    }

    $pdo = store_pdo();
    if (!$pdo) {
        json_out(['error' => 'ซิงค์ปฏิทินได้เมื่อฝังใน nextbeyond เท่านั้น (ต้องเข้าถึงตาราง calendar_events)'], 400);
    }
    $isAdmin = !defined('TA_IS_ADMIN') || TA_IS_ADMIN;
    $uid = defined('TA_OWNER_ID') ? (int) TA_OWNER_ID : 0;

    if ($action === 'sync') {
        if (!empty($b['auto']) && $c['lastSync'] > time() - 180) {
            json_out(['skippedRecent' => true, 'lastSync' => $c['lastSync']]);
        }
        @set_time_limit(120);
        json_out(['summary' => gcal_sync($pdo, 14, 120, $uid), 'lastSync' => time()]);
    }

    if ($action === 'rec_sync') {
        if (!empty($b['auto']) && $c['lastRecSync'] > time() - 600) {
            json_out(['skippedRecent' => true]);
        }
        @set_time_limit(120);
        $r = gcal_rec_sync($pdo);
        $s = settings_read(true);
        $s['gdrive'] = array_merge((array) ($s['gdrive'] ?? []), ['lastRecSync' => time()]);
        settings_write($s);
        json_out(['rec' => $r]);
    }

    if ($action === 'add_meet') {
        $id = (int) ($b['eventId'] ?? 0);
        if (!$isAdmin) { // ครูสร้างห้องได้เฉพาะคาบของตัวเอง
            $q = $pdo->prepare('SELECT teacher_id FROM calendar_events WHERE id = ?');
            $q->execute([$id]);
            if ((int) $q->fetchColumn() !== $uid) {
                json_out(['error' => 'ไม่มีสิทธิ์สร้างห้องให้คาบนี้'], 403);
            }
        }
        json_out(['meetUrl' => gcal_add_meet($pdo, $id)]);
    }

    if ($action === 'add_meet_all') {
        gcal_ensure_columns($pdo);
        $sql = "SELECT id FROM calendar_events WHERE event_type = 'lesson' AND status = 'scheduled' AND gcal_id IS NOT NULL AND (meet_url IS NULL OR meet_url = '')
                AND event_date BETWEEN :a AND :b" . ($isAdmin ? '' : ' AND teacher_id = :t') . ' ORDER BY event_date, start_time LIMIT 15';
        $p = [':a' => date('Y-m-d'), ':b' => date('Y-m-d', strtotime('+7 days'))];
        if (!$isAdmin) {
            $p[':t'] = $uid;
        }
        $q = $pdo->prepare($sql);
        $q->execute($p);
        $made = 0;
        $errs = [];
        @set_time_limit(180);
        foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $eid) {
            try {
                gcal_add_meet($pdo, (int) $eid);
                $made++;
            } catch (Throwable $e) {
                $errs[] = $e->getMessage();
                if (count($errs) >= 3) {
                    break;
                }
            }
        }
        json_out(['made' => $made, 'failed' => count($errs), 'errors' => array_values(array_unique($errs))]);
    }

    json_out(['error' => 'ไม่รู้จักคำสั่ง'], 400);
} catch (Throwable $e) {
    json_out(['error' => $e->getMessage()], 500);
}
