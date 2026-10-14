// Vercel Edge Function: OpenRouter 채팅 프록시 (API 키는 서버에서만 사용)
export const config = { runtime: 'edge' };

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT || '당신은 친절하고 간결하게 답하는 한국어 AI 어시스턴트입니다.';
const MAX_MESSAGES = 30;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json({ error: 'OPENROUTER_API_KEY 환경변수가 설정되지 않았습니다.' }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: '잘못된 요청 형식입니다.' }, 400);
  }

  const messages = Array.isArray(body?.messages)
    ? body.messages
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-MAX_MESSAGES)
    : [];
  if (messages.length === 0) {
    return json({ error: '메시지가 비어 있습니다.' }, 400);
  }

  const upstream = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': req.headers.get('origin') || 'https://vercel.app',
      'X-Title': 'chabot',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return json({ error: `OpenRouter 오류 (${upstream.status})`, detail }, 502);
  }

  // OpenRouter SSE 스트림에서 텍스트 조각만 뽑아 평문 스트림으로 전달
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  const stream = upstream.body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue; // ": OPENROUTER PROCESSING" 등 주석 무시
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const text = JSON.parse(data).choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            // 불완전한 JSON 조각은 무시
          }
        }
      },
    })
  );

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
