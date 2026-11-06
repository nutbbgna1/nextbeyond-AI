import { storeJsonGet } from './store.js';

export const GPT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

function getKey(): string {
  const settings = storeJsonGet<{ keys?: Record<string, string> }>('settings', 'settings.json');
  return settings?.keys?.openai || process.env.OPENAI_API_KEY || '';
}

export async function gptText(system: string, prompt: string, json = false): Promise<string> {
  const key = getKey();
  if (!key) throw new Error('NO_OPENAI_KEY');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GPT_MODEL,
      instructions: system,
      input: prompt,
      ...(json ? { text: { format: { type: 'json_object' } } } : {}),
    }),
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${response.status}`);
  if (data.status === 'incomplete') throw new Error('OpenAI ตอบไม่ครบ กรุณาลองใหม่');
  const text = (data.output || []).flatMap((item: any) => item?.content || [])
    .filter((part: any) => part?.type === 'output_text').map((part: any) => part.text).join('').trim();
  if (!text) throw new Error('OpenAI ไม่ส่งข้อความกลับมา');
  return text;
}

export async function gptJson(system: string, prompt: string): Promise<any> {
  const text = await gptText(system, prompt, true);
  try { return JSON.parse(text); }
  catch { throw new Error('OpenAI ส่งข้อมูล JSON ไม่ถูกต้อง'); }
}
