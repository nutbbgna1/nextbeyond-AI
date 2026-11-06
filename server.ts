import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { apiRouter } from './src/server/api.js';
import {
  renderHomePage,
  renderIndexPage,
  renderTermPage,
  renderLplanPage,
  renderSavedPage,
  renderBankPage,
  renderBookPage,
  renderExamPage,
  renderLibraryPage,
  renderCurriculumPage,
  renderSettingsPage,
  renderSchedulePage,
  renderResultsPage,
  renderCheckSetupPage,
  renderCheckModelsPage,
  renderOnlineExamPage,
  renderDiagramsPage,
} from './src/server/templates.js';
import { storeList } from './src/server/store.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static assets
app.use('/assets', express.static(path.resolve(process.cwd(), 'assets')));
app.use('/public', express.static(path.resolve(process.cwd(), 'public')));
app.use('/data/images', express.static(path.resolve(process.cwd(), 'data/images')));

// API routes
app.use('/api', apiRouter);

// Helper to count stored entities for home dashboard
function getDashboardCounts() {
  return {
    terms: Object.keys(storeList('terms', '*.json')).length,
    lplans: Object.keys(storeList('lplans', '*.json')).length,
    saved: Object.keys(storeList('saved', '*.json')).length,
    bank: 0,
    library: Object.keys(storeList('library', '*.json')).length,
    exams: Object.keys(storeList('exams', '*.json')).length,
  };
}

// Web pages
app.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderIndexPage());
});

app.get('/index.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderIndexPage());
});

app.get('/home.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderHomePage(getDashboardCounts()));
});

app.get('/term.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderTermPage());
});

app.get('/lplan.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderLplanPage());
});

app.get('/saved.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderSavedPage());
});

app.get('/bank.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderBankPage());
});

app.get('/book.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderBookPage());
});

app.get('/exam.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderExamPage());
});

app.get('/online-exam.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderOnlineExamPage());
});

app.get(['/diagrams.php', '/diagram.php', '/diagrams', '/diagram'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderDiagramsPage());
});

app.get('/library.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderLibraryPage());
});

app.get('/curriculum.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderCurriculumPage());
});

app.get('/settings.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderSettingsPage());
});

app.get('/schedule.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderSchedulePage());
});

app.get('/results.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderResultsPage());
});

app.get('/check_setup.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderCheckSetupPage());
});

app.get('/check_models.php', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderCheckModelsPage());
});

app.get(['/react.php', '/react-app'], (_req: Request, res: Response) => {
  res.redirect('/');
});

app.listen(PORT, HOST, () => {
  console.log(`Teacher AI server running at http://${HOST}:${PORT}`);
});
