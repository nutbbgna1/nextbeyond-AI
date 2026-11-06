<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/reference/library.php';
require_once __DIR__ . '/../src/core/settings.php';

/**
 * คลังเอกสารอ้างอิง
 *   list                              → { items:[meta], kinds, rights }
 *   save   { id?, title, grades, subject, unit, kind, rights, filename, note, pages:[{n,text}], keyPages?:[{n,text}], keyFilename?, removeKey? }
 *                                     → { id }  (ถ้ามี id และไม่ส่ง pages = แก้เฉพาะข้อมูลเอกสาร)
 *                                       keyPages = เฉลยที่คู่กับเอกสารนี้ (เก็บในเอกสารเดียวกัน); removeKey=true ลบเฉลย
 *   get    { id }                     → { meta, pages, keyPages }
 *   delete { id }
 *   search { grade, subject, q, docIds? }   → { hits }   (ใช้ดูว่าระบบจะดึงท่อนไหนไปให้ AI)
 *   append { id, pages?, keyPages? }  → { meta }  (เติมหน้าต่อท้ายเอกสารที่สร้างไว้ — ใช้อัปโหลดไฟล์ใหญ่เป็นก้อนๆ)
 *   create_shell { …ข้อมูลเอกสาร }    → { id }  (สร้างเอกสารที่ยังไม่มีข้อความ ใช้ก่อนอัปโหลดไฟล์ต้นฉบับ)
 *   file_put { id, which:'doc'|'key', offset, total, data(base64) } → { done, size }  (ฝากไฟล์ PDF ต้นฉบับไว้บน Server ทีละก้อน; อ่านกลับที่ library_file.php?id=&which=)
 *   file_remove { id, which }
 *   (นอกจากนี้เก็บลิงก์ Google Drive ได้ผ่านฟิลด์ driveUrl / keyDriveUrl ใน save)
 *   usage                             → { usage:{stored,original,files}|null }  (พื้นที่ที่คลังใช้ในฐานข้อมูล)
 *   compact                           → { before, after, usage }  (บีบอัดเอกสารเดิมที่เก็บไว้ก่อนมีการบีบอัด)
 *   passages { grade?, subject? }     → { items }
 *   passage_save { title, text, docId, docTitle, page, rights, grades, subject }
 *   passage_delete { id }
 */
try {
    $b = api_guard();
    $action = (string) ($b['action'] ?? '');

    if ($action === 'list') {
        json_out(['items' => lib_list(), 'kinds' => LIB_KINDS, 'rights' => LIB_RIGHTS]);
    }

    if ($action === 'save') {
        $id = (string) ($b['id'] ?? '');
        $old = [];
        if ($id !== '') {
            if (!lib_id_ok($id)) {
                json_out(['error' => 'รหัสเอกสารไม่ถูกต้อง'], 400);
            }
            $old = lib_read_json($id . '.meta.json') ?? [];
        }
        $meta = lib_meta_from($b, $old);
        $hasPages = array_key_exists('pages', $b);
        if (!$old && !$hasPages) {
            json_out(['error' => 'ไม่มีข้อความของเอกสาร'], 400);
        }
        if ($hasPages) {
            $pages = lib_pages_clean($b['pages']);
            if (!$pages) {
                json_out(['error' => 'ไม่พบข้อความในไฟล์นี้ (ถ้าเป็น PDF สแกน/รูปภาพ ระบบยังอ่านตัวอักษรจากรูปไม่ได้ ให้ใช้ไฟล์ที่เลือกข้อความได้ หรือพิมพ์/วางข้อความเอง)'], 400);
            }
            $meta['pages'] = count($pages);
            $meta['chars'] = array_sum(array_map(fn($p) => mb_strlen($p['text']), $pages));
            if (!isset($b['textMode'])) {
                $meta['textMode'] = 'text';
            }
            if ($meta['textMode'] === 'ocr') {
                $meta['ocrAt'] = date('c');
            }
        }
        // เฉลยที่คู่กับเอกสาร: ใหม่ = แทนที่, ไม่ส่ง = คงของเดิม, removeKey = ลบ
        $keyPages = null; // null = ไม่แตะ
        if (array_key_exists('keyPages', $b)) {
            $keyPages = lib_pages_clean($b['keyPages']);
            if (!$keyPages) {
                json_out(['error' => 'ไม่พบข้อความในไฟล์เฉลย (ถ้าเป็น PDF สแกน/รูปภาพ ระบบยังอ่านตัวอักษรจากรูปไม่ได้)'], 400);
            }
        } elseif (!empty($b['removeKey'])) {
            $keyPages = [];
        }
        if ($keyPages !== null) {
            $meta['keyPages'] = count($keyPages);
            $meta['keyChars'] = array_sum(array_map(fn($p) => mb_strlen($p['text']), $keyPages));
            $meta['keyFilename'] = $keyPages ? mb_substr(trim((string) ($b['keyFilename'] ?? '')), 0, 200) : '';
        }
        if (!lib_id_ok($meta['id'])) {
            $meta['id'] = lib_new_id();
        }
        if ($hasPages || $keyPages !== null) {
            $prev = $old ? (lib_read_json($meta['id'] . '.text.json') ?? []) : [];
            $doc = ['pages' => $hasPages ? $pages : (array) ($prev['pages'] ?? [])];
            $kp = $keyPages !== null ? $keyPages : (array) ($prev['keyPages'] ?? []);
            if ($kp) {
                $doc['keyPages'] = $kp;
            }
            lib_write_json($meta['id'] . '.text.json', $doc);
        }
        lib_write_json($meta['id'] . '.meta.json', $meta);
        json_out(['id' => $meta['id'], 'meta' => $meta]);
    }

    if ($action === 'create_shell') {
        $meta = lib_meta_from($b, []);
        $meta['id'] = lib_new_id();
        $meta['textMode'] = '';
        lib_write_json($meta['id'] . '.meta.json', $meta);
        json_out(['id' => $meta['id'], 'meta' => $meta]);
    }

    if ($action === 'append') {
        $id = (string) ($b['id'] ?? '');
        $meta = lib_id_ok($id) ? lib_read_json($id . '.meta.json') : null;
        if (!$meta) {
            json_out(['error' => 'ไม่พบเอกสารที่จะเติมหน้า'], 404);
        }
        $t = lib_read_json($id . '.text.json') ?? [];
        $pages = (array) ($t['pages'] ?? []);
        $keyPages = (array) ($t['keyPages'] ?? []);
        $full = false;
        if (!empty($b['pages'])) {
            $used = (int) array_sum(array_map(fn($p) => mb_strlen((string) ($p['text'] ?? '')), $pages));
            $add = lib_pages_clean($b['pages'], $used);
            $full = count($add) < count((array) $b['pages']);
            $pages = array_merge($pages, $add);
            $meta['pages'] = count($pages);
            $meta['chars'] = $used + array_sum(array_map(fn($p) => mb_strlen($p['text']), $add));
        }
        if (!empty($b['keyPages'])) {
            $used = (int) array_sum(array_map(fn($p) => mb_strlen((string) ($p['text'] ?? '')), $keyPages));
            $add = lib_pages_clean($b['keyPages'], $used);
            $keyPages = array_merge($keyPages, $add);
            $meta['keyPages'] = count($keyPages);
            $meta['keyChars'] = $used + array_sum(array_map(fn($p) => mb_strlen($p['text']), $add));
        }
        $doc = ['pages' => $pages];
        if ($keyPages) {
            $doc['keyPages'] = $keyPages;
        }
        lib_write_json($id . '.text.json', $doc);
        lib_write_json($id . '.meta.json', $meta);
        json_out(['meta' => $meta, 'full' => $full]);
    }

    if ($action === 'usage') {
        $fb = 0;
        $fc = 0;
        foreach (glob(lib_file_dir() . '/*.pdf') ?: [] as $f) {
            $fb += (int) filesize($f);
            $fc++;
        }
        json_out(['usage' => store_db_usage('library'), 'fileBytes' => $fb, 'fileCount' => $fc]);
    }

    if ($action === 'compact') {
        $before = store_db_usage('library');
        if (!$before) {
            json_out(['error' => 'ใช้ได้เฉพาะตอนเก็บข้อมูลในฐานข้อมูล (ฝังใน nextbeyond)'], 400);
        }
        foreach (array_keys(store_list('library', '*.json')) as $fn) {
            $d = store_get('library', $fn);
            if ($d !== null) {
                store_put('library', $fn, $d); // เขียนซ้ำ = บีบอัดอัตโนมัติ
            }
        }
        json_out(['before' => $before, 'after' => store_db_usage('library')]);
    }

    if ($action === 'get') {
        $id = (string) ($b['id'] ?? '');
        $meta = lib_id_ok($id) ? lib_read_json($id . '.meta.json') : null;
        if (!$meta) {
            json_out(['error' => 'ไม่พบเอกสารนี้'], 404);
        }
        $meta['fileSize'] = lib_file_size($id, 'doc');
        $meta['keyFileSize'] = lib_file_size($id, 'key');
        $t = lib_read_json($id . '.text.json');
        json_out(['meta' => $meta, 'pages' => (array) ($t['pages'] ?? []), 'keyPages' => (array) ($t['keyPages'] ?? [])]);
    }

    /* Google Drive ผ่าน Google Apps Script (Web app ของบัญชีโรงเรียน)
       เก็บแค่ URL ของ Web app + รหัสลับ ไฟล์ส่งจากเบราว์เซอร์ไป Apps Script โดยตรง ไม่ผ่าน/ไม่เก็บบน Server */
    if ($action === 'drive_config') {
        $canEdit = !defined('TA_IS_ADMIN') || TA_IS_ADMIN;
        $s = settings_read(true);
        $g = (array) ($s['gdrive'] ?? []);
        if (empty($g['secret']) && $canEdit) {
            $g['secret'] = bin2hex(random_bytes(16));
            $s['gdrive'] = $g;
            settings_write($s);
        }
        $url = (string) ($g['scriptUrl'] ?? '');
        $out = ['calendarId' => (string) ($g['calendarId'] ?? ''), 'lastSync' => (int) ($g['lastSync'] ?? 0), 'scriptUrl' => $url, 'secret' => $url !== '' || $canEdit ? (string) ($g['secret'] ?? '') : '', 'canEdit' => $canEdit];
        if ($canEdit) {
            $code = (string) @file_get_contents(__DIR__ . '/../src/reference/gdrive-apps-script.gs');
            $out['code'] = str_replace('__SECRET__', (string) $g['secret'], $code);
        }
        json_out($out);
    }

    if ($action === 'drive_config_save') {
        if (defined('TA_IS_ADMIN') && !TA_IS_ADMIN) {
            json_out(['error' => 'เฉพาะผู้ดูแลระบบ (Admin) ที่ตั้งค่า Google Drive ได้'], 403);
        }
        $s0 = settings_read(true);
        $g0 = (array) ($s0['gdrive'] ?? []);
        if (array_key_exists('calendarId', $b) && !array_key_exists('scriptUrl', $b)) { // บันทึกเฉพาะ ID ปฏิทิน
            $cal = trim((string) $b['calendarId']);
            if ($cal !== '' && !preg_match('/^[\w.\-@#]{3,200}$/', $cal)) {
                json_out(['error' => 'ID ปฏิทินไม่ถูกต้อง (ใช้อีเมลของปฏิทิน หรือ ID จาก Google Calendar → การตั้งค่า → รวมปฏิทิน)'], 400);
            }
            $g0['calendarId'] = $cal;
            $s0['gdrive'] = $g0;
            settings_write($s0);
            json_out(['ok' => true, 'calendarId' => $cal]);
        }
        $url = trim((string) ($b['scriptUrl'] ?? ''));
        if ($url !== '' && !preg_match('#^https://script\.google\.com/(a/macros/[\w.-]+|macros)/s/[\w-]{20,200}/exec$#', $url)) {
            json_out(['error' => 'ลิงก์ไม่ถูกต้อง: ต้องเป็น Web app URL ที่ขึ้นต้นด้วย https://script.google.com/macros/s/ และลงท้ายด้วย /exec'], 400);
        }
        $s = settings_read(true);
        $g = (array) ($s['gdrive'] ?? []);
        $g['scriptUrl'] = $url;
        $s['gdrive'] = $g;
        settings_write($s);
        json_out(['ok' => true, 'scriptUrl' => $url]);
    }

    if ($action === 'file_put' || $action === 'file_remove') {
        $id = (string) ($b['id'] ?? '');
        $which = ($b['which'] ?? 'doc') === 'key' ? 'key' : 'doc';
        if (!lib_id_ok($id) || lib_read_json($id . '.meta.json') === null) {
            json_out(['error' => 'ไม่พบเอกสารนี้'], 404);
        }
        $path = lib_file_path($id, $which);
        if ($action === 'file_remove') {
            @unlink($path);
            json_out(['ok' => true]);
        }
        $dir = lib_file_dir(true);
        if (!is_dir($dir) || !is_writable($dir)) {
            json_out(['error' => 'เขียนไฟล์บน Server ไม่ได้ (โฟลเดอร์ data/library_files ต้องให้เว็บเขียนได้)'], 500);
        }
        $total = (int) ($b['total'] ?? 0);
        $offset = (int) ($b['offset'] ?? 0);
        $bin = base64_decode((string) ($b['data'] ?? ''), true);
        if ($bin === false || $bin === '' || $total <= 0 || $offset < 0 || strlen($bin) > 4194304) {
            json_out(['error' => 'ข้อมูลไฟล์ไม่ถูกต้อง'], 400);
        }
        if ($total > LIB_FILE_MAX) {
            json_out(['error' => 'ไฟล์ใหญ่เกิน ' . (int) (LIB_FILE_MAX / 1048576) . ' MB'], 400);
        }
        if ($offset + strlen($bin) > $total) {
            json_out(['error' => 'ข้อมูลไฟล์เกินขนาดที่แจ้งไว้'], 400);
        }
        $part = $path . '.part';
        if ($offset === 0) {
            @unlink($part);
        } elseif (!is_file($part) || (int) filesize($part) !== $offset) {
            json_out(['error' => 'ลำดับก้อนไฟล์ไม่ตรง ลองอัปโหลดใหม่'], 409);
        }
        if (@file_put_contents($part, $bin, FILE_APPEND | LOCK_EX) === false) {
            json_out(['error' => 'เขียนไฟล์ไม่ได้ (พื้นที่เต็ม หรือไม่มีสิทธิ์เขียน)'], 500);
        }
        $done = $offset + strlen($bin) >= $total;
        if ($done) {
            $h = (string) @file_get_contents($part, false, null, 0, 5);
            if ($h !== '%PDF-') {
                @unlink($part);
                json_out(['error' => 'ไฟล์นี้ไม่ใช่ PDF'], 400);
            }
            if (!@rename($part, $path)) {
                @unlink($part);
                json_out(['error' => 'บันทึกไฟล์ไม่สำเร็จ'], 500);
            }
            @chmod($path, 0664);
        }
        json_out(['done' => $done, 'size' => $done ? $total : $offset + strlen($bin)]);
    }

    if ($action === 'delete') {
        $id = (string) ($b['id'] ?? '');
        if (!lib_id_ok($id)) {
            json_out(['error' => 'รหัสเอกสารไม่ถูกต้อง'], 400);
        }
        @unlink(lib_file_path($id, 'doc'));
        @unlink(lib_file_path($id, 'key'));
        store_del('library', "{$id}.meta.json");
        store_del('library', "{$id}.text.json");
        json_out(['ok' => true]);
    }

    if ($action === 'search') {
        $docIds = array_values(array_filter(array_map('strval', (array) ($b['docIds'] ?? [])), 'lib_id_ok'));
        $hits = library_search(
            mb_substr((string) ($b['grade'] ?? ''), 0, 10),
            mb_substr((string) ($b['subject'] ?? ''), 0, 80),
            mb_substr((string) ($b['q'] ?? ''), 0, 400),
            6,
            $docIds,
            ['textbook', 'plan', 'vocab', 'reading', 'other'],
            mb_substr((string) ($b['term'] ?? ''), 0, 1)
        );
        json_out(['hits' => $hits]);
    }

    if ($action === 'passages') {
        $grade = (string) ($b['grade'] ?? '');
        $subject = (string) ($b['subject'] ?? '');
        $items = array_values(array_filter(lib_passages(), function ($p) use ($grade, $subject) {
            $g = (array) ($p['grades'] ?? []);
            if ($g && $grade !== '' && !in_array($grade, $g, true)) {
                return false;
            }
            $s = (string) ($p['subject'] ?? '');
            return !($s !== '' && $subject !== '' && $s !== $subject);
        }));
        json_out(['items' => $items]);
    }

    if ($action === 'passage_save') {
        $text = trim(str_replace("\r", '', (string) ($b['text'] ?? '')));
        if (mb_strlen($text) < 20) {
            json_out(['error' => 'ข้อความสั้นเกินไป (อย่างน้อย 20 ตัวอักษร)'], 400);
        }
        $rights = (string) ($b['rights'] ?? 'own');
        $p = [
            'id'       => lib_new_id(),
            'title'    => mb_substr(trim((string) ($b['title'] ?? '')) ?: mb_substr($text, 0, 30) . '…', 0, 120),
            'text'     => mb_substr($text, 0, 8000),
            'docId'    => lib_id_ok((string) ($b['docId'] ?? '')) ? (string) $b['docId'] : '',
            'docTitle' => mb_substr(trim((string) ($b['docTitle'] ?? '')), 0, 150),
            'page'     => max(0, (int) ($b['page'] ?? 0)),
            'rights'   => isset(LIB_RIGHTS[$rights]) ? $rights : 'own',
            'grades'   => lib_clean_list($b['grades'] ?? [], 12, 10),
            'subject'  => mb_substr(trim((string) ($b['subject'] ?? '')), 0, 80),
            'createdAt' => date('c'),
        ];
        $items = lib_passages();
        array_unshift($items, $p);
        lib_passages_save(array_slice($items, 0, 300));
        json_out(['id' => $p['id'], 'item' => $p]);
    }

    if ($action === 'passage_delete') {
        $id = (string) ($b['id'] ?? '');
        lib_passages_save(array_values(array_filter(lib_passages(), fn($p) => ($p['id'] ?? '') !== $id)));
        json_out(['ok' => true]);
    }

    json_out(['error' => 'action ไม่ถูกต้อง'], 400);
} catch (Throwable $e) {
    json_error($e);
}
