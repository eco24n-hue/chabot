# chabot

OpenRouter API를 사용하는 간단한 챗봇입니다. 별도 빌드 없이 Vercel에 바로 배포할 수 있습니다.

## 구조

```
public/index.html   # 채팅 화면 (정적 페이지)
api/chat.js         # Vercel Edge Function – OpenRouter 호출 프록시 (스트리밍)
```

API 키는 서버 함수에서만 사용되며 브라우저에 노출되지 않습니다.

## 환경변수 (Vercel → Project Settings → Environment Variables)

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API 키 |
| `OPENROUTER_MODEL` | | 사용할 모델 (기본값 `openrouter/auto`, 예: `openai/gpt-4o-mini`, `anthropic/claude-sonnet-4`) |
| `SYSTEM_PROMPT` | | 시스템 프롬프트 (기본값: 친절한 한국어 어시스턴트) |

환경변수를 바꾼 뒤에는 **Redeploy** 해야 반영됩니다.

## 로컬 실행

```bash
npm i -g vercel
vercel env pull .env.local   # 또는 .env.local 에 OPENROUTER_API_KEY=... 직접 작성
vercel dev
```
