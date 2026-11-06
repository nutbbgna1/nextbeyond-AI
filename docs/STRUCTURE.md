# โครงสร้างโปรแกรม — อยากแก้อะไร ไปที่ไหน

หลักคิด: **1 ฟีเจอร์ = 4 ชิ้น** หน้าเว็บ (root) → ตัวรับคำขอ (`api/`) → ตรรกะฝั่งเซิร์ฟเวอร์ (`src/`) → โค้ดหน้าจอ (`assets/js/pages/`) ชื่อไฟล์ตรงกันเกือบทุกชิ้น หาง่าย

```
AI/
├─ index.php home.php term.php lplan.php exam.php book.php
│  saved.php bank.php library.php curriculum.php settings.php      หน้าเว็บ (URL เดิม ไม่เปลี่ยน)
├─ check_setup.php   ตรวจไฟล์/สิทธิ์/คีย์     check_models.php   ตรวจชื่อโมเดล
├─ config.php        คีย์และค่าเริ่มต้น (เราไม่แตะ ทุกครั้งที่อัปเดต)
├─ api/              ตัวรับคำขอจากหน้าเว็บ (JSON) บางๆ เรียก src/ อีกที
├─ src/              โค้ดฝั่งเซิร์ฟเวอร์ (เปิดผ่านเว็บไม่ได้)
│  ├─ core/       core (ล็อกอิน โควตา ค่าตั้งต้น) · store (ที่เก็บไฟล์) · settings (ตั้งค่า AI)
│  │              nav (เมนู) · health + manifest (หน้าตรวจระบบ)
│  ├─ ai/         gemini · openai · openrouter (ตัวเรียกแต่ละเจ้า) · ai (ตัวกลางเลือกเจ้า)
│  │              prompts (คำสั่งถึง AI) · schemas (รูปแบบ JSON ที่บังคับ)
│  ├─ worksheet/  validate (ตรวจคำตอบ) · difficulty (4 ระดับ) · saved (คลังใบงาน) · bank (คลังข้อสอบ)
│  ├─ planning/   lplan (แผนการสอน) · term (แผนภาคเรียน) · exam (ข้อสอบ)
│  └─ reference/  curriculum (ตัวชี้วัด/หลายฉบับ/เทียบฉบับ) · library (คลังเอกสารอ้างอิง)
├─ assets/
│  ├─ css/        style (ทั้งระบบ) · book · exam
│  ├─ js/shared/  common (ตัวช่วยทุกหน้า: api, showError) · render (แม่แบบใบงาน A4) · extract (อ่าน PDF/DOCX)
│  ├─ js/pages/   โค้ดของแต่ละหน้า: app(=index) bank book curriculum-admin exam library lplan saved settings term
│  ├─ js/data/    curriculum.js (รายชื่อหน่วยการเรียนรู้ ชั้น/วิชา)
│  └─ vendor/     katex · jszip · pdf.js (ไลบรารีสำเร็จรูป ไม่ต้องแก้)
├─ data/             ข้อมูลของคุณ: saved library bank terms lplans exams settings ... (ห้ามลบ)
├─ docs/             เอกสารนี้
└─ tools/            make_manifest.py
```

## ฟีเจอร์ → ไฟล์ที่เกี่ยวข้อง
| ฟีเจอร์ | หน้าเว็บ | api/ | src/ | assets/js/pages/ |
|---|---|---|---|---|
| สร้างใบงาน (③) | index.php | sheet, plan, image, img | ai/prompts, ai/schemas, worksheet/validate, worksheet/difficulty | app.js + shared/render.js |
| แผนภาคเรียน (①) | term.php | term | planning/term | term.js |
| แผนการสอน (②) | lplan.php | lplan | planning/lplan | lplan.js |
| รวมเล่ม (④) | book.php | books, book_ai | – | book.js + css/book.css |
| ข้อสอบ (⑤) | exam.php | exam | planning/exam | exam.js + css/exam.css |
| คลังใบงาน | saved.php | save | worksheet/saved | saved.js |
| คลังข้อสอบ | bank.php | bank | worksheet/bank | bank.js |
| คลังเอกสาร | library.php | library | reference/library | library.js + shared/extract.js |
| ตัวชี้วัด | curriculum.php | curriculum | reference/curriculum | curriculum-admin.js |
| ตั้งค่า AI | settings.php | settings, models | core/settings | settings.js |
| หน้าเริ่มต้น / ตรวจระบบ | home.php, check_setup.php | – | core/health | – |

## งานที่พบบ่อย
- **เปลี่ยนคำสั่ง/สไตล์การออกโจทย์ของ AI** → `src/ai/prompts.php` (กติกาแต่ละชนิดใบงานอยู่ใน `TYPE_RULES`, ตัวบอกวิชาอยู่ใน `subject_hint`)
- **เพิ่มชนิดใบงานใหม่** → `SHEET_TYPES` + `SHEET_TYPE_LABEL` ใน `src/core/core.php`, schema ใน `src/ai/schemas.php`, กติกาใน `src/ai/prompts.php`, การตรวจใน `src/worksheet/validate.php`, การวาดบนกระดาษใน `assets/js/shared/render.js`
- **เพิ่มผู้ให้บริการ AI เจ้าใหม่** → ไฟล์ใหม่ใน `src/ai/` แล้วต่อใน `src/ai/ai.php` (+ `PROVIDERS`), เพิ่มช่องคีย์ใน `src/core/settings.php`
- **เพิ่มเมนูให้ตั้งโมเดลแยกในหน้าตั้งค่า** → เพิ่มใน `AI_FEATURES` และ `AI_SCRIPT_FEATURE` ที่ `src/core/settings.php`
- **เพิ่ม/เปลี่ยนชื่อเมนูบนสุด** → `src/core/nav.php`
- **หน้าตา สี ปุ่ม** → `assets/css/style.css` (พิมพ์ A4 อยู่ท้ายไฟล์ + `@media print`)
- **เพิ่มหน่วยการเรียนรู้ให้ชั้น/วิชา** → `assets/js/data/curriculum.js`
- **เพิ่มหน้าใหม่** → คัดลอกหน้าที่คล้ายที่สุด (เช่น `term.php`) + `api/` + `src/` + `assets/js/pages/` แล้วเพิ่มลิงก์ใน nav

## กติกาเวลาเพิ่ม/ย้ายไฟล์
1. รัน `python3 tools/make_manifest.py` เพื่ออัปเดตรายการไฟล์ที่หน้า “ตรวจระบบ” ใช้ตรวจว่าไฟล์ขาดไหม
2. `src/` ต้องมี `.htaccess` (Require all denied) อยู่แล้ว อย่าลบ
3. ข้อมูลผู้ใช้อยู่ใน `data/` เท่านั้น ไม่เก็บข้อมูลไว้ในโฟลเดอร์โค้ด
4. การเรียกไฟล์ใน PHP ใช้ `require_once __DIR__ . '/...'` เสมอ (ไม่ใช้เส้นทางสัมพัทธ์จากหน้าเว็บ) ส่วน URL ของ CSS/JS ในหน้าเว็บเขียนเป็น `assets/...`
5. หลังอัปเดตไฟล์ทุกครั้งบน macOS ให้รัน `aifix` (ตั้งสิทธิ์ให้ Apache อ่านได้)

## ที่เก็บข้อมูล (ไฟล์ หรือ ฐานข้อมูล)
- โค้ดทุกส่วนเรียกผ่าน `src/core/store.php` (`store_get/put/del/list`, `store_json_get/put`) ไม่แตะไฟล์เอง
- ใช้เดี่ยวๆ → เก็บเป็นไฟล์ใน `data/` | ฝังใน nextbeyond (`host.php`) → เก็บใน MySQL ตาราง `ta_files` แยกตามครู (`docs/schema.sql`)
- ย้ายข้อมูลเดิมเข้าฐานข้อมูล: `php tools/migrate_files_to_db.php --owner=<users.id> --from=<data เดิม>`
