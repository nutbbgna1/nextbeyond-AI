-- ผู้ช่วยครู AI: ที่เก็บข้อมูลบน MySQL / MariaDB (ใช้ตอนฝังใน nextbeyond/admin)
-- ระบบสร้างตารางนี้ให้เองอัตโนมัติ (CREATE TABLE IF NOT EXISTS) รันไฟล์นี้เองก็ต่อเมื่อผู้ใช้ฐานข้อมูลไม่มีสิทธิ์ CREATE
-- ต้องการ MySQL 5.7+ / MariaDB 10.2+ (InnoDB, utf8mb4)
--
-- 1 แถว = 1 ชิ้นส่วนของ 1 ไฟล์ (ไฟล์ใหญ่ถูกแบ่งเป็นท่อนละ ~400KB เผื่อ max_allowed_packet ต่ำ)
--   owner_id  รหัสครูใน users.id   (0 = ข้อมูลที่ใช้ร่วมกันทั้งระบบ: settings, curriculum, images, quota)
--   bucket    กลุ่มข้อมูล: saved ใบงาน | lplans แผนการสอน | terms แผนภาคเรียน | exams ข้อสอบ | bank คลังข้อสอบ
--                         | books เล่มรวม | library คลังเอกสาร | curriculum ตัวชี้วัด | images ภาพ | settings ตั้งค่า AI | quota
--   name      ชื่อไฟล์ เช่น 20261007-101500-ab12cd34.json
--   part      ลำดับท่อน (0,1,2…)  ท่อน 0 เก็บ size/mtime ของทั้งไฟล์
--   enc       raw = ข้อความ UTF-8 (JSON)   b64 = ไบนารี (ภาพ) เข้ารหัส base64
CREATE TABLE IF NOT EXISTS ta_files (
    owner_id INT UNSIGNED NOT NULL DEFAULT 0,
    bucket   VARCHAR(32)  CHARACTER SET ascii NOT NULL,
    name     VARCHAR(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    part     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    content  LONGBLOB NOT NULL,
    enc      ENUM('raw','b64') NOT NULL DEFAULT 'raw',
    size     INT UNSIGNED NOT NULL DEFAULT 0,
    mtime    INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (owner_id, bucket, name, part),
    KEY idx_ta_bucket (bucket, owner_id, mtime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
