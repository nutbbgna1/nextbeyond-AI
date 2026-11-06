export type LegacyPage = {
  slug: string;
  file: string;
  title: string;
};

export const legacyPages: LegacyPage[] = [
  { slug: 'home', file: 'home.php', title: 'เริ่มต้นใช้งาน' },
  { slug: 'term', file: 'term.php', title: 'แผนภาคเรียน' },
  { slug: 'lplan', file: 'lplan.php', title: 'แผนการสอน' },
  { slug: 'worksheet', file: 'index.php', title: 'สร้างใบงาน' },
  { slug: 'book', file: 'book.php', title: 'รวมเล่ม' },
  { slug: 'exam', file: 'exam.php', title: 'ข้อสอบ' },
  { slug: 'saved', file: 'saved.php', title: 'คลังใบงาน' },
  { slug: 'bank', file: 'bank.php', title: 'คลังข้อสอบ' },
  { slug: 'library', file: 'library.php', title: 'คลังเอกสาร' },
  { slug: 'curriculum', file: 'curriculum.php', title: 'ตัวชี้วัด' },
  { slug: 'settings', file: 'settings.php', title: 'ตั้งค่า AI' },
  { slug: 'schedule', file: 'schedule.php', title: 'ตารางสอน' },
  { slug: 'results', file: 'results.php', title: 'ผลการมอบหมาย' },
  { slug: 'setup', file: 'check_setup.php', title: 'ตรวจระบบ' },
];

export const defaultPage = legacyPages[0];

export function pageFromHash(hash: string): LegacyPage {
  const slug = hash.replace(/^#\/?/, '').split(/[?&]/, 1)[0] || defaultPage.slug;
  return legacyPages.find((page) => page.slug === slug) || defaultPage;
}
