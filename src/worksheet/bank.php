<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/core.php';
require_once __DIR__ . '/../core/store.php';
require_once __DIR__ . '/saved.php';

/* ------------------------------------------------------------------ */
/*  คลังข้อสอบ: เก็บโจทย์รายข้อจากชุดใบงานที่บันทึกไว้ แล้วหยิบมาประกอบชุดใหม่       */
/*  data/bank/_items.json = { id => { id,type,part,grade,subject,topic,level,indicator,item,srcId,addedAt } } */
/*  ข้อที่พึ่งพารูป/บทอ่าน/สื่อเร้าอื่นในใบเดิมจะไม่เก็บ (เอาไปแยกใช้แล้วจะไม่ครบ)         */
/* ------------------------------------------------------------------ */

const BANK_MAX = 5000;
const BANK_LIST_KEYS = ['items', 'mcItems', 'writtenItems'];

function bank_read(): array
{
    return store_json_get('bank', '_items.json') ?? [];
}

function bank_write(array $all): void
{
    store_json_put('bank', '_items.json', $all, 0, 'บันทึกคลังข้อสอบไม่ได้ (ที่เก็บข้อมูลเขียนไม่ได้)');
}

function bank_item_text(array $it): string
{
    $t = saved_item_text($it);
    if ($t === '' && isset($it['statements'])) {
        $t = implode(' ', array_map('strval', (array) $it['statements']));
    }
    return $t;
}

function bank_hash(string $type, array $it): string
{
    $key = $type . '|' . bank_item_text($it) . '|' . json_encode($it['choices'] ?? ($it['right'] ?? ($it['answer'] ?? '')), JSON_UNESCAPED_UNICODE);
    return substr(sha1(mb_strtolower((string) preg_replace('/\s+/u', '', $key))), 0, 16);
}

/** ดึงโจทย์ที่ใช้ซ้ำได้จากเอกสารชุดใบงานหนึ่ง คืน [รายการเพิ่ม, จำนวนที่ข้าม] */
function bank_harvest(array $doc): array
{
    $m = (array) ($doc['meta'] ?? []);
    $out = [];
    $skipped = 0;
    foreach ((array) ($doc['sheets'] ?? []) as $s) {
        $sh = (array) ($s['sheet'] ?? []);
        $type = (string) ($sh['type'] ?? ($s['plan']['type'] ?? ''));
        if ($type === '' || $type === 'data_set' || !empty($sh['passage'])) {
            $skipped += count((array) ($sh['items'] ?? [])) + count((array) ($sh['mcItems'] ?? [])) + count((array) ($sh['writtenItems'] ?? []));
            continue;
        }
        foreach (BANK_LIST_KEYS as $k) {
            foreach ((array) ($sh[$k] ?? []) as $it) {
                if (!is_array($it)) {
                    continue;
                }
                if (!empty($it['figure']) || bank_item_text($it) === '') {
                    $skipped++;
                    continue;
                }
                $part = $k === 'mcItems' ? 'mc' : ($k === 'writtenItems' ? 'written' : '');
                unset($it['imagePrompt']);
                $id = bank_hash($type . $part, $it);
                $out[$id] = [
                    'id'        => $id,
                    'type'      => $type,
                    'part'      => $part,
                    'grade'     => (string) (($s['grade'] ?? '') ?: ($m['grade'] ?? '')),
                    'subject'   => (string) (($s['subject'] ?? '') ?: ($m['subject'] ?? '')),
                    'topic'     => (string) (($sh['topic'] ?? '') ?: ($s['plan']['topic'] ?? '')),
                    'term'      => (string) (($doc['term'] ?? '') ?: saved_auto_term((string) ($doc['savedAt'] ?? ''))[1]),
                    'level'     => (int) ($it['level'] ?? 0),
                    'indicator' => (string) ($it['indicator'] ?? ''),
                    'item'      => $it,
                    'srcId'     => (string) ($doc['id'] ?? ''),
                    'addedAt'   => date('c'),
                ];
            }
        }
    }
    return [$out, $skipped];
}

function bank_summary(array $e): array
{
    return [
        'id' => $e['id'], 'type' => $e['type'], 'part' => $e['part'] ?? '', 'grade' => $e['grade'], 'subject' => $e['subject'],
        'topic' => $e['topic'], 'term' => $e['term'] ?? '', 'level' => $e['level'], 'indicator' => $e['indicator'], 'text' => mb_substr(bank_item_text($e['item']), 0, 220),
        'item' => $e['item'], 'srcId' => $e['srcId'] ?? '', 'addedAt' => $e['addedAt'] ?? '',
    ];
}

/** ประกอบชุดใหม่จากรหัสข้อที่เลือก: แยกใบตามชนิดโจทย์ (exam รวม mc + written เป็นใบเดียว) */
function bank_compose(array $entries, string $topic): array
{
    $groups = [];
    foreach ($entries as $e) {
        $g = $e['type'];
        $groups[$g][] = $e;
    }
    $sheets = [];
    foreach ($groups as $type => $list) {
        $first = $list[0];
        $sh = ['topic' => $topic, 'instruction' => 'ให้นักเรียนทำให้ถูกต้อง', 'headerImagePrompt' => '', 'type' => $type, 'figures' => []];
        if ($type === 'exam') {
            $sh['mcItems'] = array_values(array_map(fn($e) => $e['item'], array_filter($list, fn($e) => ($e['part'] ?? '') === 'mc')));
            $sh['writtenItems'] = array_values(array_map(fn($e) => $e['item'], array_filter($list, fn($e) => ($e['part'] ?? '') === 'written')));
        } else {
            $sh['items'] = array_map(fn($e) => $e['item'], $list);
        }
        if ($type === 'fill_blank') {
            $words = array_values(array_filter(array_map(fn($e) => (string) ($e['item']['answer'] ?? ''), $list)));
            sort($words);
            $sh['wordBank'] = $words;
        }
        $inds = [];
        foreach ($list as $e) {
            if ($e['indicator'] !== '' && !in_array($e['indicator'], $inds, true)) {
                $inds[] = $e['indicator'];
            }
        }
        $sheets[] = [
            'plan'       => ['topic' => $topic, 'type' => $type, 'objective' => 'ข้อสอบจากคลังข้อสอบ'],
            'status'     => 'done',
            'sheet'      => $sh,
            'warnings'   => [],
            'grade'      => $first['grade'],
            'subject'    => $first['subject'],
            'style'      => in_array(mb_substr($first['grade'], 0, 2), ['ม.'], true) ? 'formal' : 'kid',
            'figureMode' => 'none',
            'difficulty' => 'medium',
            'extra'      => ['indicators' => array_map(fn($c) => ['code' => $c, 'text' => ''], $inds), 'showInd' => true, 'levelMix' => null],
        ];
    }
    return $sheets;
}
