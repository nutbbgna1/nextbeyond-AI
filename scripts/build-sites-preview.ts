import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  renderBankPage,
  renderBookPage,
  renderCheckModelsPage,
  renderCheckSetupPage,
  renderCurriculumPage,
  renderDiagramsPage,
  renderExamPage,
  renderHomePage,
  renderIndexPage,
  renderLibraryPage,
  renderLplanPage,
  renderOnlineExamPage,
  renderResultsPage,
  renderSavedPage,
  renderSchedulePage,
  renderSettingsPage,
  renderTermPage,
} from '../src/server/templates.js';

const root = process.cwd();
const out = path.join(root, 'sites-preview', 'dist');

const pages: Record<string, () => string> = {
  'index.html': () => renderHomePage(),
  'home.html': () => renderHomePage(),
  'worksheet.html': renderIndexPage,
  'term.html': renderTermPage,
  'lplan.html': renderLplanPage,
  'saved.html': renderSavedPage,
  'bank.html': renderBankPage,
  'book.html': renderBookPage,
  'exam.html': renderExamPage,
  'online-exam.html': renderOnlineExamPage,
  'diagrams.html': renderDiagramsPage,
  'library.html': renderLibraryPage,
  'curriculum.html': renderCurriculumPage,
  'settings.html': renderSettingsPage,
  'schedule.html': renderSchedulePage,
  'results.html': renderResultsPage,
  'check-setup.html': renderCheckSetupPage,
  'check-models.html': renderCheckModelsPage,
};

const routes: Record<string, string> = {
  'index.php': 'worksheet.html',
  'home.php': 'home.html',
  'term.php': 'term.html',
  'lplan.php': 'lplan.html',
  'saved.php': 'saved.html',
  'bank.php': 'bank.html',
  'book.php': 'book.html',
  'exam.php': 'exam.html',
  'online-exam.php': 'online-exam.html',
  'diagrams.php': 'diagrams.html',
  'library.php': 'library.html',
  'curriculum.php': 'curriculum.html',
  'settings.php': 'settings.html',
  'schedule.php': 'schedule.html',
  'results.php': 'results.html',
  'check_setup.php': 'check-setup.html',
  'check_models.php': 'check-models.html',
};

function makeStatic(html: string) {
  let result = html;
  for (const [from, to] of Object.entries(routes)) {
    result = result.replaceAll(from, to);
  }

  const banner = `<div class="sites-preview-banner" role="status">
    <b>โหมดเว็บทดสอบ</b><span>ดูหน้าจอและทดลองกรอกข้อมูลได้ โดยยังไม่เชื่อม AI หรือฐานข้อมูลจริง</span>
  </div>`;
  result = result.replace('<body>', `<body class="sites-preview">${banner}`);
  result = result.replace('</head>', `<style>
    .sites-preview-banner{position:sticky;top:0;z-index:9999;display:flex;justify-content:center;gap:10px;align-items:center;padding:8px 16px;background:#211747;color:#fff;font:14px/1.4 Sarabun,sans-serif;box-shadow:0 2px 12px #21174733}
    .sites-preview-banner b{color:#ffd76a}.sites-preview-banner span{opacity:.9}
    @media(max-width:640px){.sites-preview-banner{align-items:flex-start;flex-direction:column;gap:0}}
  </style></head>`);
  return result;
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
await cp(path.join(root, 'public'), path.join(out, 'public'), { recursive: true });

for (const [name, render] of Object.entries(pages)) {
  await writeFile(path.join(out, name), makeStatic(render()), 'utf8');
}

console.log(`Built ${Object.keys(pages).length} static preview pages in ${out}`);
