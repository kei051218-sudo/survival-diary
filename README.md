# 생존일기 — 배포 가이드

## 로컬 실행

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어 API 키 입력

# 3. 개발 서버 실행
npm run dev
# → http://localhost:3000 접속
```

## Vercel 배포

### 방법 1: GitHub 연동 (권장)
1. 이 폴더를 GitHub 레포지토리로 올리기
2. vercel.com → New Project → GitHub 레포 선택
3. Environment Variables에서 `ANTHROPIC_API_KEY` 추가
4. Deploy 클릭

### 방법 2: Vercel CLI
```bash
npm i -g vercel
vercel
# 프롬프트 따라 진행 후
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

## 파일 구조

```
survival-diary/
├── pages/
│   ├── index.js        ← 메인 앱 (UI 전체)
│   └── api/
│       └── chat.js     ← Anthropic API 프록시 (키 보안)
├── package.json
└── .env.local          ← API 키 (이 파일은 절대 GitHub에 올리지 마세요)
```

## 주의사항
- `.env.local`은 절대 git에 커밋하지 마세요
- Vercel 환경변수로만 API 키를 관리하세요
