// Вингман (подсказки для диалога) на настоящей LLM.
//
// Раньше подсказки были только эвристикой на фронте (lib/wingman.js —
// ключевые слова + шаблоны по общим интересам). Это работало как мгновенный,
// бесплатный фолбэк, но не понимало контекст переписки. Теперь поверх него:
// фронт сначала показывает эвристику (0мс), а следом спрашивает этот
// эндпоинт за более живыми, контекстными вариантами и подменяет ими список,
// если ответ пришёл успешно. Если ключ не настроен, сеть упала или ответ
// неожиданной формы — просто возвращаем null, и фронт молча остаётся на
// эвристике: никакого отдельного состояния ошибки пользователю показывать
// не нужно.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = 'claude-haiku-4-5-20251001'; // быстрая и дешёвая модель — для коротких подсказок с запасом
const TIMEOUT_MS = 8000;

const SYSTEM_PROMPT = `Ты — помощник по общению в приложении знакомств TiAmo.
Пользователь переписывается с собеседником и хочет готовые варианты СВОЕГО следующего сообщения — говори от его лица, не от лица собеседника.
Учитывай обе анкеты и последние сообщения переписки, не повторяй то, что уже было сказано.
Ответь СТРОГО JSON-массивом из 3-4 строк на русском языке — без пояснений, без markdown, без код-блоков, только сам массив.
Каждая фраза короткая (до 100 символов), живая, в разговорном тоне, уместно с лёгким флиртом — без канцелярита и пафоса.`;

function profileBlurb(p) {
  const parts = [p.name, p.age ? `${p.age} лет` : null, p.city].filter(Boolean);
  const bio = p.bio ? `био: «${p.bio}»` : null;
  const interests = p.interests?.length ? `интересы: ${p.interests.join(', ')}` : null;
  return [parts.join(', '), bio, interests].filter(Boolean).join('; ');
}

function buildUserContent({ me, them, messages }) {
  const lines = [
    `Моя анкета — ${profileBlurb(me)}`,
    `Анкета собеседника (${them.name}) — ${profileBlurb(them)}`,
  ];

  if (messages.length === 0) {
    lines.push('Переписки ещё нет — предложи, с чего начать разговор.');
  } else {
    lines.push('Последние сообщения переписки (от старых к новым):');
    // Хватает недавнего контекста — вся история только тратит токены впустую.
    for (const m of messages.slice(-12)) {
      if (m.deleted) continue;
      const who = m.from === 'me' ? 'Я' : them.name;
      const text = m.text ?? (m.type === 'photo' ? '[фото]' : '[эмодзи]');
      lines.push(`${who}: ${text}`);
    }
  }

  lines.push(`Предложи 3-4 варианта моего следующего сообщения.`);
  return lines.join('\n');
}

// Модель иногда оборачивает JSON в ```-блок, несмотря на инструкцию — снимаем его перед парсингом.
function parseSuggestions(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  const arr = JSON.parse(cleaned);
  if (!Array.isArray(arr)) return null;
  const out = arr
    .filter((s) => typeof s === 'string' && s.trim())
    .map((s) => s.trim().slice(0, 160))
    .slice(0, 4);
  return out.length > 0 ? out : null;
}

export async function getAiSuggestions({ me, them, messages }) {
  if (!ANTHROPIC_API_KEY) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserContent({ me, them, messages }) }],
      }),
    });

    if (!res.ok) {
      console.error('[wingman] Anthropic API ответила', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data = await res.json();
    const text = data?.content?.find((b) => b.type === 'text')?.text;
    if (!text) return null;

    return parseSuggestions(text);
  } catch (err) {
    console.error('[wingman] не удалось получить подсказки', err.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
