<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/core/core.php';
require_once __DIR__ . '/../src/lms/lms.php';

/**
 * ผลคะแนนของงานที่ยิงเข้า LMS (ใช้ตัวคำนวณเดียวกับหน้าผลคะแนนเดิมของ nextbeyond)
 *   GET  ?action=list                      → { assignments:[…] }
 *   GET  ?action=report&id=N               → รายงานของการมอบหมายหนึ่งรายการ
 *   GET  ?action=student&id=N&student_id=M → กระดาษคำตอบรายคน
 *   GET  ?action=archived                  → { assignments:[…] } รายการที่ลบไว้ (ถังเก็บ)
 *   POST ?action=archive {id}  (header X-Requested-With: worksheet) → ลบออกจากรายการ/ซ่อนจากนักเรียน (เก็บคะแนนไว้ กู้คืนได้)
 *   POST ?action=restore {id}  (header เดียวกัน) → กู้คืน
 *   POST ?action=purge {id}    (header เดียวกัน) → ลบถาวร เฉพาะรายการในถังเก็บ (ลบคะแนนด้วย)
 *   POST ?action=retry {assignment_id, student_id?} (header X-Requested-With: worksheet) → ยิงข้อสอบทบทวนจากข้อที่ผิด
 */
try {
    if (!is_authed()) {
        json_out(['error' => 'กรุณาเข้าสู่ระบบก่อน', 'code' => 'AUTH'], 401);
    }
    if (!lms_ready()) {
        json_out(['error' => 'ฟังก์ชันนี้ใช้ได้เมื่อเปิดผ่าน nextbeyond เท่านั้น', 'code' => 'NOT_EMBEDDED'], 400);
    }
    $pdo = lms_pdo();
    lms_ensure_schema($pdo);
    $f = lms_root() . '/includes/activity-results-service.php';
    if (!is_file($f)) {
        json_out(['error' => 'ไม่พบระบบผลคะแนนของ LMS'], 500);
    }
    require_once $f;
    $u = lms_user();
    $admin = defined('TA_IS_ADMIN') && TA_IS_ADMIN;
    $service = new ActivityResultsService($pdo, $admin ? null : $u['id']);
    $action = (string) ($_GET['action'] ?? 'list');

    if ($action === 'list') {
        json_out(['success' => true, 'assignments' => $service->listAssignments()]);
    }
    if ($action === 'report') {
        $r = $service->getReport((int) ($_GET['id'] ?? 0));
        if (!$r) {
            json_out(['error' => 'ไม่พบรายการที่มอบหมาย'], 404);
        }
        json_out(['success' => true] + $r);
    }
    if ($action === 'student') {
        $s = $service->getStudentSheet((int) ($_GET['id'] ?? 0), (int) ($_GET['student_id'] ?? 0));
        if (!$s) {
            json_out(['error' => 'ไม่พบข้อมูลนักเรียน'], 404);
        }
        json_out(['success' => true] + $s);
    }

    if ($action === 'archived') {
        $sql = "SELECT a.id, a.title, a.topic_name, a.activity_type, a.created_at, a.assigned_by_name,
                       w.title AS worksheet_title, c.title AS course_title,
                       (SELECT COUNT(*) FROM activity_submissions s WHERE s.assignment_id = a.id) AS submissions
                FROM worksheet_assignments a
                LEFT JOIN worksheets w ON w.id = a.worksheet_id
                LEFT JOIN courses c ON c.id = a.course_id
                WHERE a.status = 'archived'" . ($admin ? '' : ' AND a.assigned_by = ' . (int) $u['id']) . "
                ORDER BY a.id DESC LIMIT 200";
        $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['title'] = (string) ($r['title'] ?: ($r['worksheet_title'] ?: ($r['topic_name'] ?: 'ไม่มีชื่อ')));
            $r['submissions'] = (int) $r['submissions'];
        }
        unset($r);
        json_out(['success' => true, 'assignments' => $rows]);
    }
    if ($action === 'archive' || $action === 'restore' || $action === 'purge') {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'worksheet') {
            json_out(['error' => 'คำขอไม่ถูกต้อง', 'code' => 'BAD_REQUEST'], 400);
        }
        $in = json_decode((string) file_get_contents('php://input'), true) ?: [];
        $id = (int) ($in['id'] ?? 0);
        $st = $pdo->prepare('SELECT id, status, assigned_by FROM worksheet_assignments WHERE id = ?');
        $st->execute([$id]);
        $a = $st->fetch(PDO::FETCH_ASSOC);
        if (!$a) {
            json_out(['error' => 'ไม่พบรายการที่มอบหมาย'], 404);
        }
        if (!$admin && (int) $a['assigned_by'] !== (int) $u['id']) {
            json_out(['error' => 'คุณไม่มีสิทธิ์จัดการรายการนี้'], 403);
        }
        if ($action === 'purge') {
            if ($a['status'] !== 'archived') {
                json_out(['error' => 'ลบถาวรได้เฉพาะรายการที่อยู่ในถังเก็บ'], 422);
            }
            $pdo->beginTransaction();
            try {
                $pdo->prepare('DELETE FROM activity_answers WHERE submission_id IN (SELECT id FROM activity_submissions WHERE assignment_id = ?)')->execute([$id]);
                $pdo->prepare('DELETE FROM activity_submissions WHERE assignment_id = ?')->execute([$id]);
                $pdo->prepare('DELETE FROM worksheet_assignments WHERE id = ?')->execute([$id]);
                $pdo->commit();
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $e;
            }
            json_out(['success' => true, 'id' => $id, 'purged' => true]);
        }
        $to = $action === 'archive' ? 'archived' : 'active';
        $pdo->prepare('UPDATE worksheet_assignments SET status = ? WHERE id = ?')->execute([$to, $id]);
        $n = $pdo->prepare('SELECT COUNT(*) FROM activity_submissions WHERE assignment_id = ?');
        $n->execute([$id]);
        json_out(['success' => true, 'id' => $id, 'status' => $to, 'submissions' => (int) $n->fetchColumn()]);
    }
    if ($action === 'retry') {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'worksheet') {
            json_out(['error' => 'คำขอไม่ถูกต้อง', 'code' => 'BAD_REQUEST'], 400);
        }
        $in = json_decode((string) file_get_contents('php://input'), true) ?: [];
        try {
            $res = $service->createRetryPractice(
                (int) ($in['assignment_id'] ?? 0),
                !empty($in['student_id']) ? (int) $in['student_id'] : null,
                $u['id'],
                $u['name']
            );
        } catch (InvalidArgumentException $e) {
            json_out(['error' => $e->getMessage()], 422);
        }
        json_out(['success' => true] + $res);
    }
    json_out(['error' => 'Invalid action'], 400);
} catch (Throwable $e) {
    json_error($e);
}
