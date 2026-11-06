<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/core.php';

/** คำที่ซ้ำกันในรายการ (หลังตัดช่องว่างส่วนเกิน) */
function dupes(array $list): array
{
    $seen = [];
    $out  = [];
    foreach ($list as $x) {
        $n = norm((string) $x);
        if (isset($seen[$n])) {
            $out[$n] = true;
        }
        $seen[$n] = true;
    }
    return array_keys($out);
}

/**
 * ตรวจสิ่งที่ตรวจได้แน่นอนด้วยโค้ด (ไม่เสียค่า AI) คืนรายการปัญหา ว่าง = ผ่าน
 */
function validate_sheet(array &$s, int $expected): array
{
    $p = [];
    if (trim((string) ($s['instruction'] ?? '')) === '') {
        $p[] = 'ไม่มีคำชี้แจง';
    }
    if (trim((string) ($s['topic'] ?? '')) === '') {
        $p[] = 'ไม่มีหัวข้อ';
    }
    if (($s['type'] ?? '') === 'exam') {
        return validate_exam($s, $expected);
    }
    $items = $s['items'] ?? null;
    if (!is_array($items) || count($items) !== $expected) {
        $p[] = "จำนวนข้อต้องเท่ากับ {$expected} แต่ได้ " . (is_array($items) ? count($items) : 0);
        return $p;
    }

    switch ($s['type'] ?? '') {
        case 'fill_blank':
            $bank = array_map('strval', $s['wordBank'] ?? []);
            if ($d = dupes($bank)) {
                $p[] = 'คลังคำมีคำซ้ำ: ' . implode(', ', $d);
            }
            $answers = array_map(fn($i) => norm((string) ($i['answer'] ?? '')), $items);
            if ($d = dupes($answers)) {
                $p[] = 'คำตอบซ้ำกันหลายข้อ: ' . implode(', ', $d);
            }
            $bankSet = array_map('norm', $bank);
            foreach ($items as $i => $it) {
                $n = $i + 1;
                if (!in_array(norm((string) ($it['answer'] ?? '')), $bankSet, true)) {
                    $p[] = "ข้อ {$n}: คำตอบ \"" . ($it['answer'] ?? '') . '" ไม่อยู่ในคลังคำ';
                }
                $blanks = preg_match_all('/_{3,}/u', (string) ($it['text'] ?? ''));
                if ($blanks !== 1) {
                    $p[] = "ข้อ {$n}: ต้องมีช่องว่าง ____ 1 ช่อง แต่พบ {$blanks}";
                }
            }
            foreach (array_unique($bankSet) as $w) {
                if (!in_array($w, $answers, true)) {
                    $p[] = "คลังคำมีคำเกิน \"{$w}\" ที่ไม่ใช่คำตอบของข้อใด";
                }
            }
            break;

        case 'multiple_choice':
            $idx = [];
            foreach ($items as $i => $it) {
                $n = $i + 1;
                $ch = $it['choices'] ?? [];
                if (count($ch) !== 4) {
                    $p[] = "ข้อ {$n}: ต้องมี 4 ตัวเลือก";
                }
                if ($d = dupes($ch)) {
                    $p[] = "ข้อ {$n}: ตัวเลือกซ้ำ " . implode(', ', $d);
                }
                $a = $it['answerIndex'] ?? null;
                if (!is_int($a) || $a < 0 || $a >= count($ch)) {
                    $p[] = "ข้อ {$n}: answerIndex ไม่ถูกต้อง";
                }
                $idx[] = $a;
            }
            if ($expected >= 4 && count(array_unique($idx)) === 1) {
                $p[] = 'เฉลยทุกข้ออยู่ตำแหน่งเดียวกัน ให้กระจายตำแหน่งคำตอบ';
            }
            break;

        case 'matching':
            if ($d = dupes(array_column($items, 'left'))) {
                $p[] = 'ฝั่งซ้ายซ้ำ: ' . implode(', ', $d);
            }
            if ($d = dupes(array_column($items, 'right'))) {
                $p[] = 'ฝั่งขวาซ้ำ: ' . implode(', ', $d);
            }
            break;

        case 'true_false':
            $t = count(array_filter($items, fn($i) => !empty($i['answer'])));
            if ($expected >= 4 && ($t === 0 || $t === $expected)) {
                $p[] = 'เฉลยเป็นถูกหมดหรือผิดหมด ให้ผสมทั้งถูกและผิด';
            }
            break;

        case 'ordering':
            $orders = array_map(fn($i) => $i['order'] ?? null, $items);
            sort($orders);
            if ($orders !== range(1, $expected)) {
                $p[] = "ลำดับต้องเป็น 1 ถึง {$expected} ไม่ซ้ำและไม่ข้าม";
            }
            if ($d = dupes(array_column($items, 'label'))) {
                $p[] = 'ชื่อขั้นตอนซ้ำ: ' . implode(', ', $d);
            }
            break;

        case 'short_answer':
            foreach ($items as $i => $it) {
                if (trim((string) ($it['question'] ?? '')) === '' || trim((string) ($it['answer'] ?? '')) === '') {
                    $p[] = 'ข้อ ' . ($i + 1) . ': ต้องมีทั้งคำถามและคำตอบ';
                }
            }
            break;

        case 'calculation':
            $p = array_merge($p, check_calc_items($items, 'ข้อ '));
            break;

        case 'multi_statement':
            foreach ($items as $i => $it) {
                $n = $i + 1;
                $st = (array) ($it['statements'] ?? []);
                if (count($st) < 3 || count($st) > 4) {
                    $p[] = "ข้อ {$n}: ต้องมีข้อความ 3-4 ข้อ";
                    continue;
                }
                $c = array_values(array_unique(array_map('intval', (array) ($it['correct'] ?? []))));
                if (!$c || array_filter($c, fn($x) => $x < 1 || $x > count($st))) {
                    $p[] = "ข้อ {$n}: correct ต้องเป็นเลขข้อความ 1-" . count($st) . ' อย่างน้อย 1 ข้อ';
                }
            }
            break;

        case 'data_set':
            if (trim((string) ($s['stimulus'] ?? '')) === '' && trim((string) ($s['stimulusFigure'] ?? '')) === '') {
                $p[] = 'ต้องมีข้อมูล (stimulus) หรือรูปประกอบสำหรับตอบคำถาม';
            }
            $p = array_merge($p, check_mc_items($items, $expected));
            break;

        default:
            $p[] = 'ไม่รู้จักรูปแบบใบงาน';
    }
    return array_merge($p, check_figures($s));
}

/** ตรวจปรนัย 4 ตัวเลือก (ใช้กับ data_set / exam) */
function check_mc_items(array $items, int $expected, string $prefix = 'ข้อ '): array
{
    $p = [];
    $idx = [];
    foreach ($items as $i => $it) {
        $n = $prefix . ($i + 1);
        $ch = (array) ($it['choices'] ?? []);
        if (count($ch) !== 4) {
            $p[] = "{$n}: ต้องมี 4 ตัวเลือก";
        }
        if ($d = dupes($ch)) {
            $p[] = "{$n}: ตัวเลือกซ้ำ " . implode(', ', $d);
        }
        $a = $it['answerIndex'] ?? null;
        if (!is_int($a) || $a < 0 || $a >= count($ch)) {
            $p[] = "{$n}: answerIndex ไม่ถูกต้อง";
        }
        $idx[] = $a;
    }
    if ($expected >= 4 && count(array_unique($idx)) === 1) {
        $p[] = 'เฉลยทุกข้ออยู่ตำแหน่งเดียวกัน ให้กระจายตำแหน่งคำตอบ';
    }
    return $p;
}

/** ตรวจโจทย์คำนวณ: ต้องมีวิธีทำ คำตอบ และ checkExpr ต้องคำนวณได้ค่าเท่ากับ answerValue */
function check_calc_items(array $items, string $prefix): array
{
    $p = [];
    foreach ($items as $i => $it) {
        $n = $prefix . ($i + 1);
        if (trim((string) ($it['question'] ?? '')) === '') {
            $p[] = "{$n}: ไม่มีโจทย์";
        }
        if (!array_filter((array) ($it['solution'] ?? []), fn($x) => trim((string) $x) !== '')) {
            $p[] = "{$n}: ไม่มีวิธีทำ (solution)";
        }
        if (trim((string) ($it['answer'] ?? '')) === '') {
            $p[] = "{$n}: ไม่มีคำตอบสุดท้าย";
        }
        if ($err = check_numeric((string) ($it['checkExpr'] ?? ''), $it['answerValue'] ?? null)) {
            $p[] = "{$n}: {$err}";
        }
    }
    return $p;
}

/** ตรวจคำตอบตัวเลขด้วยการคำนวณซ้ำ คืนข้อความปัญหา หรือ null ถ้าผ่าน/ไม่ต้องตรวจ */
function check_numeric(string $expr, $value): ?string
{
    $expr = trim($expr);
    if ($expr === '') {
        return null;
    }
    try {
        $calc = calc_eval($expr);
    } catch (Throwable $e) {
        return "checkExpr \"{$expr}\" คำนวณไม่ได้ (ใช้ได้เฉพาะตัวเลข + - * / ^ ( ) sqrt sin cos tan log ln log2 pi; ลอการิทึมฐานอื่นใช้ ln(x)/ln(ฐาน)) ให้แก้ checkExpr";
    }
    if (!is_numeric($value)) {
        return 'ไม่มี answerValue ที่เป็นตัวเลข';
    }
    $v = (float) $value;
    $tol = max(1e-9, abs($calc) * 0.02); // ยอมให้ปัดเศษได้ 2%
    if (!is_finite($calc) || abs($calc - $v) > $tol) {
        return 'คำตอบไม่ถูกต้อง: คำนวณจาก ' . $expr . ' ได้ ' . round($calc, 4) . " แต่เฉลยตอบ {$v} ให้คำนวณใหม่และแก้วิธีทำ/คำตอบให้ตรงกัน";
    }
    return null;
}

/** ตัวคำนวณนิพจน์แบบปลอดภัย (ไม่ใช้ eval): + - * / ^ วงเล็บ ฟังก์ชันพื้นฐาน มุมเป็นองศา */
function calc_eval(string $expr): float
{
    $expr = str_replace(['×', '÷', '−', '·', '**', ','], ['*', '/', '-', '*', '^', ''], $expr);
    preg_match_all('/\s*(\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+|[a-zA-Z][a-zA-Z0-9]*|[-+*\/^()])/A', $expr, $m);
    $strip = fn($x) => preg_replace('/\s+/', '', $x);
    if (!$m[1] || $strip(implode('', $m[0])) !== $strip($expr)) {
        throw new InvalidArgumentException('bad token'); // มีอักขระที่ไม่รู้จัก
    }
    $t = $m[1];
    $i = 0;
    $peek = function () use (&$t, &$i) { return $t[$i] ?? null; };
    $next = function () use (&$t, &$i) { return $t[$i++] ?? null; };
    $expect = function (string $x) use ($next) {
        if ($next() !== $x) {
            throw new InvalidArgumentException('expected ' . $x);
        }
    };
    $fns = [
        'sqrt' => 'sqrt', 'abs' => 'abs', 'exp' => 'exp', 'ln' => 'log', 'log' => 'log10', 'log2' => fn($x) => log($x, 2),
        'sin' => fn($x) => sin(deg2rad($x)), 'cos' => fn($x) => cos(deg2rad($x)), 'tan' => fn($x) => tan(deg2rad($x)),
        'asin' => fn($x) => rad2deg(asin($x)), 'acos' => fn($x) => rad2deg(acos($x)), 'atan' => fn($x) => rad2deg(atan($x)),
    ];
    $expr_ = null;
    $primary = function () use (&$primary, &$expr_, $next, $peek, $expect, $fns): float {
        $tok = $next();
        if ($tok === null) {
            throw new InvalidArgumentException('end');
        }
        if ($tok === '(') {
            $v = $expr_();
            $expect(')');
            return $v;
        }
        if (is_numeric($tok)) {
            return (float) $tok;
        }
        $low = strtolower($tok);
        if ($low === 'pi') {
            return M_PI;
        }
        if ($low === 'e') {
            return M_E;
        }
        if (isset($fns[$low])) {
            $expect('(');
            $v = $expr_();
            $expect(')');
            return (float) ($fns[$low])($v);
        }
        throw new InvalidArgumentException('unknown ' . $tok);
    };
    $power = function () use (&$power, $primary, $peek, $next): float {
        if ($peek() === '-' || $peek() === '+') { // เครื่องหมายลบนำหน้า: -3^2 = -(3^2)
            return $next() === '-' ? -$power() : $power();
        }
        $b = $primary();
        if ($peek() === '^') {
            $next();
            return $b ** $power(); // ยกกำลังเข้าทางขวา
        }
        return $b;
    };
    $term = function () use ($power, $peek, $next): float {
        $v = $power();
        while (in_array($peek(), ['*', '/'], true) || ($peek() !== null && ($peek() === '(' || preg_match('/^[a-zA-Z\d.]/', $peek())))) {
            $op = in_array($peek(), ['*', '/'], true) ? $next() : '*'; // คูณแบบไม่เขียนเครื่องหมาย เช่น 2pi, 3(4)
            $r = $power();
            if ($op === '/') {
                if ($r == 0.0) {
                    throw new InvalidArgumentException('div0');
                }
                $v /= $r;
            } else {
                $v *= $r;
            }
        }
        return $v;
    };
    $expr_ = function () use ($term, $peek, $next): float {
        $v = $term();
        while (in_array($peek(), ['+', '-'], true)) {
            $v = $next() === '+' ? $v + $term() : $v - $term();
        }
        return $v;
    };
    $v = $expr_();
    if ($i !== count($t)) {
        throw new InvalidArgumentException('trailing');
    }
    return $v;
}

/** ตรวจ/ซ่อมรูปประกอบ: รหัสที่อ้างถึงต้องมีจริง ข้อมูลกราฟ/ตารางต้องครบ */
function check_figures(array &$s): array
{
    $p = [];
    $ids = [];
    foreach ((array) ($s['figures'] ?? []) as $k => $f) {
        $id = trim((string) ($f['id'] ?? ''));
        $kind = (string) ($f['kind'] ?? '');
        $ids[$id] = $kind;
        if ($kind === 'graph') {
            $ok = array_filter((array) ($f['series'] ?? []), fn($se) => count((array) ($se['points'] ?? [])) >= 2);
            if (!$ok) {
                $p[] = "รูป {$id}: กราฟต้องมี series ที่มีจุดอย่างน้อย 2 จุด";
            }
        } elseif ($kind === 'table') {
            $hc = count((array) ($f['headers'] ?? []));
            if (!$hc || !count((array) ($f['rows'] ?? []))) {
                $p[] = "รูป {$id}: ตารางต้องมี headers และ rows";
            }
        } elseif ($kind === 'diagram' && !count((array) ($f['shapes'] ?? []))) {
            $p[] = "รูป {$id}: แผนภาพต้องมี shapes";
        }
    }
    $refs = [];
    $collect = function ($list) use (&$refs) {
        foreach ((array) $list as $it) {
            if (is_array($it) && trim((string) ($it['figure'] ?? '')) !== '') {
                $refs[] = trim((string) $it['figure']);
            }
        }
    };
    $collect($s['items'] ?? []);
    $collect($s['mcItems'] ?? []);
    $collect($s['writtenItems'] ?? []);
    $collect($s['sections'] ?? []);
    $collect($s['examples'] ?? []);
    if (trim((string) ($s['stimulusFigure'] ?? '')) !== '') {
        $refs[] = trim((string) $s['stimulusFigure']);
    }
    foreach (array_unique($refs) as $r) {
        if (!isset($ids[$r])) {
            $p[] = "อ้างถึงรูป \"{$r}\" แต่ไม่มีใน figures";
        }
    }
    return $p;
}

/** แบบทดสอบ: ตอนที่ 1 ปรนัย + ตอนที่ 2 อัตนัย */
function exam_split(int $total): array
{
    $written = max(1, min(5, (int) round($total * 0.25)));
    return [max(2, $total - $written), $written];
}

function validate_exam(array &$s, int $total): array
{
    [$nMc, $nWr] = exam_split($total);
    $p = [];
    if (trim((string) ($s['topic'] ?? '')) === '') {
        $p[] = 'ไม่มีหัวข้อ';
    }
    $mc = (array) ($s['mcItems'] ?? []);
    $wr = (array) ($s['writtenItems'] ?? []);
    if (count($mc) !== $nMc) {
        $p[] = "ตอนที่ 1 ต้องมี {$nMc} ข้อ แต่ได้ " . count($mc);
    }
    if (count($wr) !== $nWr) {
        $p[] = "ตอนที่ 2 ต้องมี {$nWr} ข้อ แต่ได้ " . count($wr);
    }
    $p = array_merge($p, check_mc_items($mc, $nMc, 'ตอนที่ 1 ข้อ '), check_calc_items($wr, 'ตอนที่ 2 ข้อ '));
    return array_merge($p, check_figures($s));
}

/** ใบความรู้ */
function validate_lesson(array &$l): array
{
    $p = [];
    $secs = array_filter((array) ($l['sections'] ?? []), fn($x) => trim((string) ($x['heading'] ?? '')) !== '');
    if (count($secs) < 2) {
        $p[] = 'ใบความรู้ต้องมีเนื้อหาอย่างน้อย 2 หัวข้อย่อย';
    }
    foreach ((array) ($l['examples'] ?? []) as $i => $ex) {
        if ($err = check_numeric((string) ($ex['checkExpr'] ?? ''), $ex['answerValue'] ?? null)) {
            $p[] = 'ตัวอย่างที่ ' . ($i + 1) . ": {$err}";
        }
    }
    return array_merge($p, check_figures($l));
}


/** ปรับค่า level/indicator ที่ AI ให้มาให้อยู่ในช่วงที่ใช้ได้ และเรียงข้อจากง่ายไปยาก (เรียงแบบคงลำดับเดิมเมื่อ level เท่ากัน) */
function tidy_levels_indicators(array &$s, bool $levels, array $inds): void
{
    $codes = array_column($inds, 'code');
    foreach (['items', 'mcItems', 'writtenItems'] as $k) {
        if (!isset($s[$k]) || !is_array($s[$k])) {
            continue;
        }
        foreach ($s[$k] as &$it) {
            if (!is_array($it)) {
                continue;
            }
            if ($levels) {
                $lv = (int) ($it['level'] ?? 0);
                $it['level'] = $lv >= 1 && $lv <= 4 ? $lv : 0;
            } else {
                unset($it['level']);
            }
            if ($codes) {
                $it['indicator'] = match_indicator((string) ($it['indicator'] ?? ''), $codes);
            } else {
                unset($it['indicator']);
            }
        }
        unset($it);
        if ($levels && !array_filter($s[$k], fn($x) => !is_array($x) || ($x['level'] ?? 0) === 0)) {
            $idx = array_keys($s[$k]);
            usort($idx, fn($a, $b) => [$s[$k][$a]['level'], $a] <=> [$s[$k][$b]['level'], $b]);
            $s[$k] = array_map(fn($i) => $s[$k][$i], $idx);
        }
    }
    if ($inds) {
        $s['indicators'] = $inds;
    } else {
        unset($s['indicators']);
    }
}

/**
 * ตัวเลือกที่อ้างถึงตัวเลือกอื่น (เช่น "ถูกทั้งข้อ ก และ ข", "ทุกข้อข้างต้น") สลับตำแหน่งไม่ได้
 */
function choices_cross_reference(array $choices): bool
{
    foreach ($choices as $c) {
        if (preg_match('/ข้อ\s*[กขคงabcd1-4]|ทั้ง\s*[กขคง]|ถูกทั้ง|ผิดทั้ง|ถูกทุก|ผิดทุก|ทุกข้อ|ไม่มีข้อ|ข้างต้น|ข้อใดข้อหนึ่ง|ทั้งหมด/ui', (string) $c)) {
            return true;
        }
    }
    return false;
}

/**
 * กระจายตำแหน่งเฉลยปรนัยด้วยโค้ด (ไม่พึ่ง AI): ย้ายตัวเลือกที่ถูกไปตำแหน่งเป้าหมายแบบสุ่มเป็นรอบ
 * ไม่ให้ซ้ำตำแหน่งเดิมติดกัน คงลำดับตัวเลือกอื่นไว้ ข้ามข้อที่ตัวเลือกอ้างถึงกัน
 */
function balance_answer_positions(array &$s): void
{
    $lists = ['mcItems'];
    if (in_array($s['type'] ?? '', ['multiple_choice', 'data_set'], true)) {
        $lists[] = 'items';
    }
    foreach ($lists as $k) {
        if (empty($s[$k]) || !is_array($s[$k])) {
            continue;
        }
        $pool = [];
        $last = -1;
        foreach ($s[$k] as &$it) {
            if (!is_array($it)) {
                continue;
            }
            $ch = array_values((array) ($it['choices'] ?? []));
            $a = $it['answerIndex'] ?? null;
            if (count($ch) !== 4 || !is_int($a) || $a < 0 || $a > 3 || choices_cross_reference($ch)) {
                continue;
            }
            if (!$pool) {
                $pool = [0, 1, 2, 3];
                shuffle($pool);
                if ($pool[0] === $last) { // ไม่ให้ซ้ำกับข้อก่อนหน้า
                    $pool[] = array_shift($pool);
                }
            }
            $target = array_shift($pool);
            $right = $ch[$a];
            array_splice($ch, $a, 1);
            array_splice($ch, $target, 0, [$right]);
            $it['choices'] = $ch;
            $it['answerIndex'] = $target;
            $last = $target;
        }
        unset($it);
    }
}

/**
 * ติดป้ายระดับตามโควตาด้วยโค้ด: ข้อถูกเรียงง่าย→ยากอยู่แล้ว (AI เรียง และ tidy_levels_indicators เรียงซ้ำ)
 * จึงกำหนดระดับตามตำแหน่งให้ตรงจำนวนที่ครูตั้งไว้เสมอ ไม่ต้องรอให้ AI นับให้ถูก
 */
function enforce_level_counts(array &$s, array $expectedByList): void
{
    foreach ($expectedByList as $list => $counts) {
        $n = array_sum($counts);
        if (empty($s[$list]) || !is_array($s[$list]) || count($s[$list]) !== $n) {
            continue;
        }
        $levels = [];
        foreach ($counts as $k => $c) {
            for ($i = 0; $i < $c; $i++) {
                $levels[] = LEVEL_IDS[$k];
            }
        }
        $i = 0;
        foreach ($s[$list] as &$it) {
            if (is_array($it)) {
                $it['level'] = $levels[$i];
            }
            $i++;
        }
        unset($it);
    }
}

/** ตรวจ level (จำนวนต่อระดับ) และ indicator (ทุกข้อควรอ้างรหัสที่กำหนด) */
function validate_levels_indicators(array $s, array $expectedByList, array $inds): array
{
    $p = [];
    foreach ($expectedByList as $list => $expected) {
        $label = $list === 'mcItems' ? 'ตอนที่ 1' : ($list === 'writtenItems' ? 'ตอนที่ 2' : 'ใบงาน');
        $p = array_merge($p, check_levels((array) ($s[$list] ?? []), $expected, $label));
    }
    if ($inds) {
        $total = 0;
        $blank = 0;
        foreach (['items', 'mcItems', 'writtenItems'] as $k) {
            foreach ((array) ($s[$k] ?? []) as $it) {
                $total++;
                if (!is_array($it) || ($it['indicator'] ?? '') === '') {
                    $blank++;
                }
            }
        }
        if ($total && $blank / $total > 0.4) {
            $p[] = 'ระบุรหัสตัวชี้วัด (indicator) ของแต่ละข้อไม่ครบ ต้องใช้รหัสตามที่กำหนดเท่านั้น: ' . implode(', ', array_column($inds, 'code'));
        }
    }
    return $p;
}
