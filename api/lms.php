<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/core/core.php';
require_once __DIR__ . '/../src/core/store.php';
require_once __DIR__ . '/../src/worksheet/saved.php';
require_once __DIR__ . '/../src/lms/lms.php';
require_once __DIR__ . '/../src/planning/exam.php';

/**
 * ยิงใบงานจากคลังของ teacher-ai เข้า LMS ของ nextbeyond (ใช้ได้เมื่อฝังอยู่ใน nextbeyond เท่านั้น)
 *   status  {}                                    → { embedded }
 *   targets {}                                    → { courses:[{id,title,subject,level,groups:[{id,name}]}] }
 *   students { courseId, groupId? }               → { students:[{id,name,grade}] }
 *   preview { id }                                → { sheets:[{index,topic,questions,skipped?,notes[],published?}] }   (แปลงดูก่อน ไม่เขียนอะไร)
 *   exam_preview { id }                           → { title, questions, total, notes[], published? }  (ข้อสอบจากหน้าข้อสอบ)
 *   exam_send    { id, target:{…เหมือน send} }    → { result:{ok,worksheetId,count,assignmentId,message,duplicate,notes} }
 *   send    { id, sheets:[index], target:{courseId, groupId?, mode:all|selected, studentIds[], dueDate?, maxAttempts?, passScore?, activityType?} }
 *           → { results:[{index,ok,worksheetId,count,assigned,message,notes}] }
 */
try {
    $b = api_guard();
    $action = (string) ($b['action'] ?? '');

    if ($action === 'status') {
        json_out(['embedded' => lms_ready()]);
    }
    if (!lms_ready()) {
        json_out(['error' => 'ฟังก์ชันนี้ใช้ได้เมื่อเปิดผ่าน nextbeyond เท่านั้น', 'code' => 'NOT_EMBEDDED'], 400);
    }

    if ($action === 'targets') {
        json_out(['courses' => lms_courses()]);
    }

    if ($action === 'students') {
        $cid = (int) ($b['courseId'] ?? 0);
        if ($cid <= 0 || !lms_course_allowed($cid)) {
            json_out(['error' => 'ไม่มีสิทธิ์เข้าถึงคอร์สนี้'], 403);
        }
        json_out(['students' => lms_students($cid, (int) ($b['groupId'] ?? 0))]);
    }

    if ($action === 'exam_preview' || $action === 'exam_send') {
        $eid = (string) ($b['id'] ?? '');
        $exam = exam_id_ok($eid) ? exam_read($eid) : null;
        if (!$exam) {
            json_out(['error' => 'ไม่พบข้อสอบนี้ในคลัง'], 404);
        }
        if ($action === 'exam_preview') {
            [$qs, $notes, $total] = lms_exam_questions($exam, true);
            $p = $exam['lms']['exam'] ?? null;
            json_out(['title' => (string) ($exam['title'] ?? ''), 'questions' => count($qs), 'total' => $total, 'notes' => $notes,
                'published' => $p ? ['worksheetId' => (int) $p['worksheetId'], 'at' => (string) $p['at']] : null]);
        }
        $t = (array) ($b['target'] ?? []);
        $cid = (int) ($t['courseId'] ?? 0);
        if ($cid <= 0 || !lms_course_allowed($cid)) {
            json_out(['error' => 'ไม่มีสิทธิ์เข้าถึงคอร์สนี้'], 403);
        }
        $p = lms_publish_exam($exam);
        if (!empty($p['ok']) && empty($p['reused'])) {
            exam_write($eid, $exam);
        }
        if (empty($p['ok'])) {
            json_out(['result' => $p]);
        }
        [$aid, $msg, $dup, $skipped] = lms_assign_worksheet((int) $p['worksheetId'], [
            'course_id'      => $cid,
            'class_group_id' => (int) ($t['groupId'] ?? 0),
            'target_type'    => ($t['mode'] ?? 'all') === 'selected' ? 'selected' : 'all',
            'student_ids'    => (array) ($t['studentIds'] ?? []),
            'due_date'       => (string) ($t['dueDate'] ?? ''),
            'max_attempts'   => (int) ($t['maxAttempts'] ?? 1),
            'pass_score'     => $t['passScore'] ?? '',
            'activity_type'  => (string) ($t['activityType'] ?? 'posttest'),
        ]);
        json_out(['result' => $p + ['assignmentId' => $aid, 'message' => $msg, 'duplicate' => $dup, 'skipped' => $skipped]]);
    }

    $id = (string) ($b['id'] ?? '');
    if (!saved_id_ok($id)) {
        json_out(['error' => 'รหัสชุดใบงานไม่ถูกต้อง'], 400);
    }
    $doc = saved_read($id);
    if (!$doc) {
        json_out(['error' => 'ไม่พบชุดใบงานนี้ในคลัง'], 404);
    }
    $sheets = array_values((array) ($doc['sheets'] ?? []));

    if ($action === 'preview') {
        $rows = [];
        foreach ($sheets as $i => $s) {
            if (!is_array($s) || ($s['status'] ?? '') !== 'done' || !is_array($s['sheet'] ?? null)) {
                continue;
            }
            [$qs, $notes] = lms_sheet_to_questions($s['sheet'], (array) ($doc['images'] ?? []), '', true);
            $total = count((array) ($s['sheet']['items'] ?? [])) + count((array) ($s['sheet']['mcItems'] ?? [])) + count((array) ($s['sheet']['writtenItems'] ?? []));
            $p = $doc['lms']['sheets'][(string) $i] ?? null;
            $rows[] = [
                'index'     => $i,
                'topic'     => (string) ($s['sheet']['topic'] ?? ''),
                'type'      => (string) ($s['sheet']['type'] ?? ''),
                'questions' => count($qs),
                'total'     => $total,
                'notes'     => $notes,
                'published' => $p ? ['worksheetId' => (int) $p['worksheetId'], 'at' => (string) $p['at']] : null,
            ];
        }
        json_out(['title' => (string) ($doc['title'] ?? ''), 'sheets' => $rows]);
    }

    if ($action === 'send') {
        $t = (array) ($b['target'] ?? []);
        $pick = array_values(array_unique(array_map('intval', (array) ($b['sheets'] ?? []))));
        if (!$pick) {
            json_out(['error' => 'กรุณาเลือกใบงานอย่างน้อย 1 ใบ'], 400);
        }
        $cid = (int) ($t['courseId'] ?? 0);
        if ($cid <= 0 || !lms_course_allowed($cid)) {
            json_out(['error' => 'ไม่มีสิทธิ์เข้าถึงคอร์สนี้'], 403);
        }
        $published = lms_publish_worksheets($doc, $pick);
        saved_write($id, $doc); // จำรหัสใบงานที่เผยแพร่ ส่งซ้ำจะไม่สร้างซ้ำ
        $results = [];
        foreach ($published as $p) {
            if (empty($p['ok'])) {
                $results[] = $p;
                continue;
            }
            [$aid, $msg, $dup, $skipped] = lms_assign_worksheet((int) $p['worksheetId'], [
                'course_id'      => $cid,
                'class_group_id' => (int) ($t['groupId'] ?? 0),
                'target_type'    => ($t['mode'] ?? 'all') === 'selected' ? 'selected' : 'all',
                'student_ids'    => (array) ($t['studentIds'] ?? []),
                'due_date'       => (string) ($t['dueDate'] ?? ''),
                'max_attempts'   => (int) ($t['maxAttempts'] ?? 1),
                'pass_score'     => $t['passScore'] ?? '',
                'activity_type'  => (string) ($t['activityType'] ?? 'worksheet'),
            ]);
            $results[] = $p + ['assignmentId' => $aid, 'message' => $msg, 'duplicate' => $dup, 'skipped' => $skipped];
        }
        json_out(['results' => $results]);
    }

    json_out(['error' => 'action ไม่ถูกต้อง'], 400);
} catch (Throwable $e) {
    json_error($e);
}
