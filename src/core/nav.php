<?php
declare(strict_types=1);

/**
 * เมนูด้านข้างที่ใช้ร่วมกันทุกหน้า ($active = ชื่อหน้าที่กำลังเปิดอยู่)
 * กลุ่มบน = ขั้นตอนการทำงานตามลำดับ (มีเลขกำกับ)  กลุ่มล่าง = คลังข้อมูลและเครื่องมือ
 * จอแคบ (มือถือ/แท็บเล็ต ≤960px) จะเป็นแถบบน + ปุ่มแฮมเบอร์เกอร์เปิดเมนูแบบลิ้นชักด้านข้าง (ดู assets/css/style.css)
 */
function nav_html(string $active): string
{
    $steps = [
        'home'  => ['home.php', '⌂', 'หน้าเริ่มต้น', 'ภาพรวม ขั้นตอนการใช้งาน และเช็กความพร้อมของระบบ'],
        'term'  => ['term.php', '1', 'แผนภาคเรียน', 'วางหัวข้อรายสัปดาห์ทั้งภาคเรียน'],
        'lplan' => ['lplan.php', '2', 'แผนการสอน', 'ให้ AI ร่างแผนการจัดการเรียนรู้ของแต่ละเรื่อง (แกนหลักของบทเรียน)'],
        'index' => ['index.php', '3', 'สร้างใบงาน', 'สร้างใบงาน เฉลย ใบความรู้ ตามแผนการสอน แล้วพิมพ์เป็น PDF'],
        'book'  => ['book.php', '4', 'รวมเล่ม', 'รวมใบงานหลายชุดเป็นเล่ม มีปก สารบัญ และเฉลย'],
        'exam'  => ['exam.php', '5', 'ข้อสอบ', 'สร้างข้อสอบกลางภาค/ปลายภาค พร้อมตารางวิเคราะห์ กระดาษคำตอบ และเฉลย'],
    ];
    $tools = [
        'saved'      => ['saved.php', '🗂', 'คลังใบงาน', 'ชุดใบงานที่สร้างไว้ จัดหมวด ค้นหา ส่งออก'],
    ];
    if (defined('HOST_EMBEDDED')) { // ผลคะแนนจาก LMS ใช้ได้เมื่อฝังใน nextbeyond เท่านั้น
        $tools['results'] = ['results.php', '📊', 'ผลการมอบหมาย', 'ดูผลคะแนนของงานที่ยิงเข้าคอร์สแล้ว'];
    }
    $tools += [
        'diagrams'   => ['diagrams.php', '🎨', 'สตูดิโอแผนภาพ', 'คลังและเครื่องมือสร้างแผนภาพสื่อการสอน โหมดข้อสอบ/เฉลย และ AI'],
        'bank'       => ['bank.php', '🧩', 'คลังข้อสอบ', 'โจทย์รายข้อ เลือกมาประกอบเป็นชุดใหม่'],
        'library'    => ['library.php', '📚', 'คลังเอกสาร', 'อัปโหลดหนังสือเรียน/บทอ่านให้ AI ใช้อ้างอิง'],
        'curriculum' => ['curriculum.php', '🎯', 'ตัวชี้วัด', 'นำเข้าและจัดการตัวชี้วัดของหลักสูตร'],
        'settings'   => ['settings.php', '⚙️', 'ตั้งค่า AI', 'ใส่คีย์ และเลือกผู้ให้บริการ/โมเดลของแต่ละเมนู'],
        'setup'      => ['check_setup.php', '🩺', 'ตรวจระบบ', 'ตรวจว่าไฟล์ครบ เขียนข้อมูลได้ และตั้งค่า AI แล้ว'],
    ];
    $link = function (string $k, array $x) use ($active): string {
        $on = $k === $active;
        return '<a class="nl' . ($on ? ' on' : '') . '" href="' . $x[0] . '" title="' . htmlspecialchars($x[3]) . '"' . ($on ? ' aria-current="page"' : '') . '>'
            . '<span class="ic" aria-hidden="true">' . $x[1] . '</span><span>' . htmlspecialchars($x[2]) . '</span></a>';
    };
    $title = ($steps[$active] ?? $tools[$active] ?? [null, null, 'ผู้ช่วยครู AI'])[2];
    $h = '<nav class="topnav no-print" id="topnav" aria-label="เมนูหลัก">'
        . '<div class="navbar"><button type="button" class="burger" id="burger" aria-label="เปิดเมนู" aria-expanded="false" aria-controls="navmenu"><span></span><span></span><span></span></button>'
        . '<span class="navtitle">' . htmlspecialchars($title) . '</span></div>'
        . '<div class="navscrim" id="navscrim"></div>'
        . '<div class="navmenu" id="navmenu">'
        . (defined('HOST_EMBEDDED') ? '<a class="nl" href="' . htmlspecialchars(HOST_BACK_URL) . '" style="margin-bottom:6px"><span class="ic" aria-hidden="true">←</span><span>กลับหน้า Admin</span></a>' : '')
        . '<a class="brand" href="home.php"><b>ผู้ช่วยครู AI</b><span>แผนการสอน ใบงาน และข้อสอบ</span></a>'
        . '<div class="navrow"><div class="navlabel">ขั้นตอนการทำงาน</div>';
    foreach ($steps as $k => $x) {
        $h .= $link($k, $x);
    }
    $h .= '</div><div class="navrow"><div class="navlabel">คลังและเครื่องมือ</div>';
    foreach ($tools as $k => $x) {
        $h .= $link($k, $x);
    }
    $js = '(function(){var n=document.getElementById("topnav"),b=document.getElementById("burger");if(!n||!b)return;'
        . 'function set(o){n.classList.toggle("open",o);b.setAttribute("aria-expanded",o?"true":"false");b.setAttribute("aria-label",o?"ปิดเมนู":"เปิดเมนู");document.documentElement.classList.toggle("nav-lock",o);}'
        . 'b.addEventListener("click",function(){set(!n.classList.contains("open"));});'
        . 'document.getElementById("navscrim").addEventListener("click",function(){set(false);});'
        . 'n.addEventListener("click",function(e){if(e.target.closest("a.nl"))set(false);});'
        . 'document.addEventListener("keydown",function(e){if(e.key==="Escape"&&n.classList.contains("open")){set(false);b.focus();}});'
        . 'window.addEventListener("resize",function(){if(innerWidth>960)set(false);});})();';
    return $h . '</div><div class="navfoot">ผลงานจาก AI ครูควรตรวจทานก่อนใช้ทุกครั้ง</div></div></nav><script>' . $js . '</script>';
}
