<?php
declare(strict_types=1);

/* ------------------------------------------------------------------ */
/*  ที่เก็บข้อมูล (ใบงาน แผน ข้อสอบ คลัง ภาพ ตั้งค่า)                       */
/*  มี 2 แบบ เลือกอัตโนมัติ:                                             */
/*   • ฐานข้อมูล (db)  เมื่อฝังใน nextbeyond (host.php ส่ง PDO มาให้)        */
/*       ตาราง ta_files แยกข้อมูลตามครู (owner_id) ดู docs/schema.sql      */
/*   • ไฟล์ (file)  เมื่อใช้เดี่ยวๆ  เก็บใน data/ ถ้าเขียนไม่ได้ใช้โฟลเดอร์ชั่วคราว  */
/*  ทุกโมดูลเรียกผ่านฟังก์ชัน store_get / store_put / store_del / store_list  */
/*  ไม่ต้องรู้ว่าข้างหลังเป็นแบบไหน                                        */
/* ------------------------------------------------------------------ */

/** กลุ่มข้อมูลที่ใช้ร่วมกันทั้งระบบ (owner_id = 0) นอกนั้นแยกตามครู */
const STORE_SHARED = ['settings', 'curriculum', 'images', 'quota'];
/** ขนาดต่อแถวในฐานข้อมูล (ต่ำกว่า max_allowed_packet 1MB ของ XAMPP) */
const STORE_CHUNK = 400000;
/** กลุ่มข้อความ/JSON ที่บีบอัด (gzip) ก่อนลงฐานข้อมูล ภาษาไทยเล็กลงราว 3-4 เท่า (ภาพไม่บีบซ้ำ) */
const STORE_GZ = ['library', 'saved', 'exams', 'books', 'bank', 'lplans', 'terms'];

function store_pdo(): ?PDO
{
    $p = $GLOBALS['TA_PDO'] ?? null;
    return $p instanceof PDO ? $p : null;
}

function store_backend(): string
{
    return store_pdo() ? 'db' : 'file';
}

function store_owner(string $sub): int
{
    if (in_array($sub, STORE_SHARED, true)) {
        return 0;
    }
    return defined('TA_OWNER_ID') ? (int) TA_OWNER_ID : 0;
}

/* ============================ แบบฐานข้อมูล ============================ */

function store_db_ensure(PDO $p): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $sqlite = $p->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
    if ($sqlite) {
        $p->exec('CREATE TABLE IF NOT EXISTS ta_files (
            owner_id INTEGER NOT NULL DEFAULT 0, bucket TEXT NOT NULL, name TEXT NOT NULL, part INTEGER NOT NULL DEFAULT 0,
            content BLOB NOT NULL, enc TEXT NOT NULL DEFAULT "raw", size INTEGER NOT NULL DEFAULT 0, mtime INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (owner_id, bucket, name, part))');
        $p->exec('CREATE INDEX IF NOT EXISTS idx_ta_bucket ON ta_files (bucket, owner_id, mtime)');
    } else {
        $p->exec('CREATE TABLE IF NOT EXISTS ta_files (
            owner_id INT UNSIGNED NOT NULL DEFAULT 0,
            bucket VARCHAR(32) CHARACTER SET ascii NOT NULL,
            name VARCHAR(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
            part SMALLINT UNSIGNED NOT NULL DEFAULT 0,
            content LONGBLOB NOT NULL,
            enc ENUM("raw","b64") NOT NULL DEFAULT "raw",
            size INT UNSIGNED NOT NULL DEFAULT 0,
            mtime INT UNSIGNED NOT NULL DEFAULT 0,
            PRIMARY KEY (owner_id, bucket, name, part),
            KEY idx_ta_bucket (bucket, owner_id, mtime)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    }
    $done = true;
}

/** แปลง glob (* ?) เป็น LIKE พร้อม escape ด้วย ! */
function store_like(string $glob): string
{
    $out = '';
    foreach (preg_split('//u', $glob, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $ch) {
        if ($ch === '*') {
            $out .= '%';
        } elseif ($ch === '?') {
            $out .= '_';
        } elseif ($ch === '%' || $ch === '_' || $ch === '!') {
            $out .= '!' . $ch;
        } else {
            $out .= $ch;
        }
    }
    return $out;
}

function store_db_get(PDO $p, string $sub, string $name): ?string
{
    store_db_ensure($p);
    $q = $p->prepare('SELECT content, enc FROM ta_files WHERE owner_id = ? AND bucket = ? AND name = ? ORDER BY part');
    $q->execute([store_owner($sub), $sub, $name]);
    $rows = $q->fetchAll(PDO::FETCH_NUM);
    if (!$rows) {
        return null;
    }
    $data = '';
    foreach ($rows as $r) {
        $data .= is_resource($r[0]) ? (string) stream_get_contents($r[0]) : (string) $r[0];
    }
    if ($rows[0][1] === 'b64') {
        $data = (string) base64_decode($data, true);
        if (in_array($sub, STORE_GZ, true) && strncmp($data, "\x1f\x8b", 2) === 0 && function_exists('gzdecode')) {
            $z = @gzdecode($data);
            if ($z !== false) {
                return $z;
            }
        }
        return $data;
    }
    return $data;
}

/** พื้นที่ที่กลุ่มข้อมูลของผู้ใช้ปัจจุบันใช้จริงในฐานข้อมูล (ไบต์) เทียบกับขนาดก่อนบีบอัด; null = ไม่ใช่แบบฐานข้อมูล */
function store_db_usage(string $sub): ?array
{
    $p = store_pdo();
    if (!$p) {
        return null;
    }
    store_db_ensure($p);
    $q = $p->prepare('SELECT COALESCE(SUM(LENGTH(content)),0), COALESCE(SUM(CASE WHEN part = 0 THEN size ELSE 0 END),0), COUNT(DISTINCT name) FROM ta_files WHERE owner_id = ? AND bucket = ?');
    $q->execute([store_owner($sub), $sub]);
    $r = $q->fetch(PDO::FETCH_NUM) ?: [0, 0, 0];
    return ['stored' => (int) $r[0], 'original' => (int) $r[1], 'files' => (int) $r[2]];
}

function store_db_put(PDO $p, string $sub, string $name, string $data): void
{
    store_db_ensure($p);
    if (strlen($name) > 190) {
        throw new ApiException('ชื่อไฟล์ยาวเกินไป', 400, 'BAD_NAME');
    }
    $size = strlen($data);
    if ($size >= 2000 && in_array($sub, STORE_GZ, true) && function_exists('gzencode')) {
        $z = gzencode($data, 9);
        if ($z !== false && strlen($z) * 4 / 3 < $size * 0.85) { // ใช้เมื่อหลัง base64 แล้วยังเล็กลงชัดเจน
            $data = $z;
        }
    }
    $raw = mb_check_encoding($data, 'UTF-8') && !str_contains($data, "\0");
    $enc = $raw ? 'raw' : 'b64';
    $parts = [];
    if ($raw) {
        $n = strlen($data);
        $parts = $n === 0 ? [''] : [];
        for ($o = 0; $o < $n;) {
            $c = mb_strcut($data, $o, STORE_CHUNK, 'UTF-8');
            if ($c === '') {
                $c = substr($data, $o, STORE_CHUNK);
            }
            $parts[] = $c;
            $o += strlen($c);
        }
    } else {
        $parts = str_split(base64_encode($data), STORE_CHUNK) ?: [''];
    }
    $owner = store_owner($sub);
    $own = $p->inTransaction();
    try {
        if (!$own) {
            $p->beginTransaction();
        }
        $p->prepare('DELETE FROM ta_files WHERE owner_id = ? AND bucket = ? AND name = ?')->execute([$owner, $sub, $name]);
        $ins = $p->prepare('INSERT INTO ta_files (owner_id, bucket, name, part, content, enc, size, mtime) VALUES (?,?,?,?,?,?,?,?)');
        foreach ($parts as $i => $c) {
            $ins->execute([$owner, $sub, $name, $i, $c, $enc, $size, time()]);
        }
        if (!$own) {
            $p->commit();
        }
    } catch (Throwable $e) {
        if (!$own && $p->inTransaction()) {
            $p->rollBack();
        }
        error_log('ta_files write failed: ' . $e->getMessage());
        throw new ApiException('บันทึกลงฐานข้อมูลไม่ได้ (ตรวจ max_allowed_packet และสิทธิ์ของผู้ใช้ฐานข้อมูล)', 500, 'WRITE_FAIL');
    }
}

/* ============================== แบบไฟล์ =============================== */

function store_primary(string $sub): string
{
    return __DIR__ . '/../../data/' . $sub;
}

function store_fallback(string $sub): string
{
    return rtrim(sys_get_temp_dir(), '/\\') . '/ai-worksheet/' . $sub;
}

/** โฟลเดอร์ที่ "เขียนได้จริง" สำหรับ $sub */
function store_dir(string $sub): string
{
    foreach ([store_primary($sub), store_fallback($sub)] as $d) {
        if (!is_dir($d)) {
            @mkdir($d, 0775, true);
        }
        if (is_dir($d) && is_writable($d)) {
            return $d;
        }
    }
    throw new ApiException('เขียนไฟล์ไม่ได้ทั้งโฟลเดอร์ data และโฟลเดอร์ชั่วคราว เปิด check_setup.php เพื่อดูวิธีแก้', 500, 'WRITE_FAIL');
}

/** ทุกโฟลเดอร์ที่ควรค้นหาไฟล์ที่เคยบันทึกไว้ (เรียงจากที่ใช้ก่อน) */
function store_dirs(string $sub): array
{
    return [store_primary($sub), store_fallback($sub)];
}

function store_find(string $sub, string $name): ?string
{
    foreach (store_dirs($sub) as $d) {
        $f = $d . '/' . $name;
        if (is_file($f) && is_readable($f)) {
            return $f;
        }
    }
    return null;
}

/* ============================ ส่วนที่โมดูลเรียกใช้ ============================ */

/** อ่านเนื้อไฟล์ (null = ไม่มี) */
function store_get(string $sub, string $name): ?string
{
    if ($p = store_pdo()) {
        return store_db_get($p, $sub, $name);
    }
    $f = store_find($sub, $name);
    $d = $f ? @file_get_contents($f) : false;
    return $d === false ? null : $d;
}

/** เขียนทับทั้งไฟล์ (แบบไฟล์ใช้ tmp + rename กันไฟล์ค้างครึ่งเดียว) */
function store_put(string $sub, string $name, string $data): void
{
    if ($p = store_pdo()) {
        store_db_put($p, $sub, $name, $data);
        return;
    }
    $existing = store_find($sub, $name);
    $dir = $existing && is_writable($existing) ? dirname($existing) : store_dir($sub);
    $tmp = "{$dir}/{$name}.tmp";
    if (@file_put_contents($tmp, $data) === false || !@rename($tmp, "{$dir}/{$name}")) {
        throw new ApiException('บันทึกไฟล์ไม่ได้ ตรวจสิทธิ์เขียนของโฟลเดอร์ data (เปิด check_setup.php)', 500, 'WRITE_FAIL');
    }
}

function store_del(string $sub, string $name): void
{
    if ($p = store_pdo()) {
        store_db_ensure($p);
        $p->prepare('DELETE FROM ta_files WHERE owner_id = ? AND bucket = ? AND name = ?')->execute([store_owner($sub), $sub, $name]);
        return;
    }
    foreach (store_dirs($sub) as $d) {
        @unlink("{$d}/{$name}");
    }
}

function store_has(string $sub, string $name): bool
{
    if ($p = store_pdo()) {
        store_db_ensure($p);
        $q = $p->prepare('SELECT 1 FROM ta_files WHERE owner_id = ? AND bucket = ? AND name = ? AND part = 0');
        $q->execute([store_owner($sub), $sub, $name]);
        return (bool) $q->fetchColumn();
    }
    return store_find($sub, $name) !== null;
}

/** รายชื่อไฟล์ที่ตรงกับ glob => ['ชื่อ' => ['mtime'=>int,'size'=>int]] */
function store_list(string $sub, string $glob = '*'): array
{
    $out = [];
    if ($p = store_pdo()) {
        store_db_ensure($p);
        $q = $p->prepare("SELECT name, mtime, size FROM ta_files WHERE owner_id = ? AND bucket = ? AND part = 0 AND name LIKE ? ESCAPE '!' ORDER BY name");
        $q->execute([store_owner($sub), $sub, store_like($glob)]);
        foreach ($q->fetchAll(PDO::FETCH_NUM) as $r) {
            $out[(string) $r[0]] = ['mtime' => (int) $r[1], 'size' => (int) $r[2]];
        }
        return $out;
    }
    foreach (store_dirs($sub) as $d) {
        foreach (glob($d . '/' . $glob) ?: [] as $f) {
            $n = basename($f);
            if (!isset($out[$n]) && is_file($f)) {
                $out[$n] = ['mtime' => (int) @filemtime($f), 'size' => (int) @filesize($f)];
            }
        }
    }
    ksort($out);
    return $out;
}

function store_json_get(string $sub, string $name): ?array
{
    $s = store_get($sub, $name);
    $d = $s !== null ? json_decode($s, true) : null;
    return is_array($d) ? $d : null;
}

/** เขียน JSON (เกิน $max ไบต์ หรือ encode ไม่ได้ = โยน error) */
function store_json_put(string $sub, string $name, array $data, int $max = 0, string $err = 'บันทึกไม่ได้'): void
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
    if ($json === false || ($max > 0 && strlen($json) > $max)) {
        throw new ApiException($err, 500, 'WRITE_FAIL');
    }
    store_put($sub, $name, $json);
}

/**
 * ย่อ/บีบอัดภาพก่อนเก็บ: ด้านยาวไม่เกิน $maxPx แล้วแปลงเป็น JPEG (พื้นโปร่งใสถมขาว)
 * คืน [ไบต์ภาพ, นามสกุล] ถ้าไม่มี GD หรือผลไม่เล็กลง ก็คืนของเดิม
 */
function image_shrink(string $data, string $ext, ?int $maxPx = null, ?int $quality = null): array
{
    $maxPx = $maxPx ?? (int) (cfg()['image_max_px'] ?? 900);
    $quality = max(30, min(95, $quality ?? (int) (cfg()['image_quality'] ?? 78)));
    if ($maxPx <= 0 || !function_exists('imagecreatefromstring') || !function_exists('imagejpeg')) {
        return [$data, $ext];
    }
    $src = @imagecreatefromstring($data);
    if (!$src) {
        return [$data, $ext];
    }
    $w = imagesx($src);
    $h = imagesy($src);
    $k = min(1.0, $maxPx / max($w, $h));
    $nw = max(1, (int) round($w * $k));
    $nh = max(1, (int) round($h * $k));
    $dst = imagecreatetruecolor($nw, $nh);
    imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
    ob_start();
    imagejpeg($dst, null, $quality);
    $best = [(string) ob_get_clean(), 'jpg'];
    if ($ext === 'png' && function_exists('imagepng')) { // ภาพลายเส้นสีเรียบ PNG อาจเล็กกว่า JPEG เลือกอันที่เล็กกว่า
        ob_start();
        imagepng($dst, null, 9);
        $png = (string) ob_get_clean();
        if ($png !== '' && ($best[0] === '' || strlen($png) < strlen($best[0]))) {
            $best = [$png, 'png'];
        }
    }
    imagedestroy($src);
    imagedestroy($dst);
    $resized = $k < 1.0; // ถ้าย่อขนาดแล้ว ใช้ผลที่ย่อเสมอ ถ้าไม่ได้ย่อ ใช้เฉพาะเมื่อเล็กลงจริง
    return ($best[0] !== '' && ($resized || strlen($best[0]) < strlen($data))) ? $best : [$data, $ext];
}

/** ข้อความบอกที่เก็บ (ใช้แสดงผลหลังบันทึก) */
function store_where(string $sub): string
{
    if (store_pdo()) {
        return 'db';
    }
    return str_contains(store_dir($sub), 'ai-worksheet') ? 'temp' : 'data';
}
