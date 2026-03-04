import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

function stripMarkdown(text) {
  const ph = [];
  text = text.replace(/\[([^\]]{1,30})\]/g, (m, p1) => {
    ph.push(p1);
    return '\x00' + (ph.length - 1) + '\x00';
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\n]+)\*/g, '$1');
  text = text.replace(/\x00(\d+)\x00/g, (m, i) => '[' + ph[parseInt(i)] + ']');
  return text;
}

function parseChoices(content) {
  const pattern = /\[([^\]]{1,30})\]/g;
  const choices = [];
  let m;
  while ((m = pattern.exec(content)) !== null) choices.push(m[1]);
  const clean = content.replace(/\[([^\]]{1,30})\]\s*/g, '').trim();
  return { choices, clean };
}

function buildSystemPrompt(state) {
  const c = state.character;
  return '당신은 좀비 아포칼립스 세계관 속 생존 보조 시스템입니다.\n\n'
    + '캐릭터 정보 (항상 유지)\n'
    + '- 이름: ' + (c.name || '(미설정)') + '\n'
    + '- 직업: ' + (c.job || '(미설정)') + '\n'
    + '- 생존 계기: ' + (c.survival_reason || '(미설정)') + '\n'
    + '- 현재 일차: ' + state.currentDay + '일차\n\n'
    + '역할 규칙\n'
    + '1. 항상 3인칭 관찰자 시점을 유지한다. "당신은", 이름+"은/는" 처럼 3인칭으로 서술하며, "나는", "저는" 같은 1인칭을 절대 사용하지 않는다.\n'
    + '2. AI는 생존 보조 시스템처럼 건조하고 관찰적인 톤을 유지하되, 차갑지 않고 따뜻한 온기가 느껴지게 한다.\n'
    + '3. 아포칼립스 배경에서 상황을 3문장 이상 묘사하며 긴장과 몰입을 준다.\n'
    + '4. 마이크로 액션이라는 단어를 직접 사용하지 않는다.\n'
    + '5. 하루 마무리엔 오늘도 살아남았습니다. 내일 이어집니다. 로 끝낸다.\n'
    + '6. 볼드나 이탤릭 마크다운을 절대 사용하지 않는다. 순수 텍스트만.\n'
    + '7. 실행 확인은 [했어요] / [아직], 스토리 선택지는 [선택지1] / [선택지2] 형태.\n'
    + '8. 리포트 완성시 맨 끝에 [REPORT]{"step":"...","action":"...","done":true,"one_line":"...","coach_note":"..."} 포함.\n'
    + '9. 이 앱의 핵심 목적: 고립되고 지쳐있는 청년들이 아포칼립스 스토리를 통해 현실에서 작은 행동을 실제로 이행하며 조금씩 나아지도록 돕는 것이다.\n'
    + '10. 가장 중요한 규칙 - [선택:...] 태그가 포함된 메시지를 받으면, 스토리 전개 전에 반드시 그 선택에 대응하는 현실의 구체적인 행동을 먼저 제안하고 [했어요]/[아직]으로 확인한다.\n'
    + '현실 행동 예시:\n'
    + '핸드폰 확인 -> 지금 핸드폰을 열어보세요. 가장 최근에 연락한 사람이 누구인가요?\n'
    + '공구함/서랍 뒤지기 -> 지금 가장 가까이 있는 서랍이나 가방을 열어보세요. 소중하게 느껴지는 물건을 하나 꺼내보세요.\n'
    + '물 찾기 -> 지금 일어나서 물 한 잔을 가져와보세요.\n'
    + '주변 관찰 -> 창밖을 한번 내다보세요. 지금 밖에 보이는 것 중 하나를 말해줄 수 있나요?\n'
    + '잠자리 찾기 -> 지금 가장 편안한 자세를 찾아보세요.\n'
    + '휴식 -> 잠깐 눈을 감고 코로 숨을 들이쉬고 입으로 천천히 내쉬어보세요. 세 번만요.\n'
    + '위 예시에 없는 행동도 같은 방식으로 현실의 몸, 감각, 공간과 연결한다.\n'
    + '11. AI는 따뜻하고 조용한 인도자처럼 말한다. 강요하지 않고, 판단하지 않으며, 작은 행동 하나하나를 진심으로 응원한다.\n\n'
    + '스토리라인: 1일차(지하실탈출) 2일차(폐허거리) 3일차(무너진다리) 4일차(버려진병원) 5일차(폐허도서관) 6일차(생존자흔적) 7일차(생존자무리)\n'
    + '항상 한국어, 짧고 명확한 문장.';
    + '12. [했어요]를 받은 직후, 스토리로 바로 넘어가지 않는다. 반드시 방금 한 행동에 대한 후속 질문을 한 번 한다.'
    + '후속 질문은 실제로 경험한 것을 언어로 표현하게 유도하는 짧고 따뜻한 질문이어야 한다.'
    + '예시:'
    + '물건을 꺼냈다 -> "어떤 물건인가요? 왜 그 물건이 손에 잡혔나요?"'
    + '물을 마셨다 -> "물을 마신 후 지금 기분은 어떤가요?"'
    + '편안한 자세를 찾았다 -> "지금 어떤 자세인가요? 몸이 조금 편안해졌나요?"'
    + '창밖을 봤다 -> "지금 밖에서 무엇이 보이나요?"'
    + '최근 연락한 사람을 확인했다 -> "그 사람과의 마지막 대화가 기억나시나요?"'
    + '서랍을 열었다 -> "어떤 물건이 나왔나요? 그 물건을 보니 어떤 느낌이 드나요?"'
    + '후속 질문 후 사용자의 답변을 받은 다음에 스토리를 전개한다.'
    + '13. 후속질문을 할 때 "00(주인공이름)처럼"이라는 표현을 사용하지 않는다. 지칭어를 빼고 자연스럽게 말한다.'
    + '예시:'
    + '기존표현:기원(주인공이름)이 조심스럽게 움직이는 것처럼, 지금 당신도 가장 조용하게 움직여보세요.-> 지금 가장 조용하게 움직여보세요.'
    + '기존표현:좋습니다. 물을 마시며 잠깐 숨을 고르고 있는 당신의 모습이 기원(주인공이름)과 겹쳐 보입니다.-> 좋습니다. 물을 마시며 잠깐 숨을 고르는 시간을 가져보아요.'
}

const CRISIS = ['자살', '자해', '죽고 싶', '끝내고 싶', '살기 싫', '사라지고 싶'];

export default function Home() {
  const [st, setSt] = useState({
    messages: [], character: { name: '', job: '', survival_reason: '' },
    setupStep: 1, currentDay: 0, stepIndex: 0, totalSteps: 8
  });
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [log, setLog] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    setLog([{
      role: 'assistant',
      text: '빛이 꺼진 도시, 희미한 불빛 아래 당신을 만납니다.\n\n생존일기를 시작하기 전에, 먼저 당신이라는 사람을 알고 싶습니다.\n\n당신의 이름은 무엇인가요?',
      choices: []
    }]);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [log, typing]);

  async function callAPI(msg, s) {
    const msgs = [...s.messages, { role: 'user', content: msg }];
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, systemPrompt: buildSystemPrompt(s) })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return { text: d.text, msgs: [...msgs, { role: 'assistant', content: d.text }] };
  }

  function parseResp(raw) {
    let text = raw, report = null;
    if (text.includes('[REPORT]')) {
      const p = text.split('[REPORT]');
      text = p[0].trim();
      try { report = JSON.parse(p[1].trim()); } catch (e) {}
    }
    text = stripMarkdown(text);
    const { choices, clean } = parseChoices(text);
    return { clean, choices, report };
  }

  async function send(override, isChoice) {
    const text = (override !== undefined ? override : input).trim();
    if (!text || typing) return;
    setInput('');
    if (CRISIS.some(k => text.includes(k))) setCrisis(true);
    setLog(p => [...p, { role: 'user', text }]);
    setTyping(true);
    const cur = st;
    try {
      if (cur.setupStep < 4) { await setup(text, cur); return; }
      const apiText = isChoice
        ? '[선택: ' + text + '] 중요: 스토리 전개 전에 반드시 이 선택에 대응하는 현실의 마이크로 액션을 먼저 구체적으로 제안하고, [했어요] / [아직] 으로 확인한 뒤에 스토리를 전개하라.'
        : text;
      const { text: raw, msgs } = await callAPI(apiText, cur);
      const { clean, choices, report } = parseResp(raw);
      const ns = { ...cur, messages: msgs, stepIndex: Math.min(cur.stepIndex + 1, cur.totalSteps - 1) };
      setSt(ns);
      setLog(p => [...p, {
        role: 'assistant', text: clean, choices,
        report: report ? { ...report, character: { ...cur.character } } : null
      }]);
    } catch (e) {
      setLog(p => [...p, { role: 'assistant', text: '신호가 끊겼습니다... 잠시 후 다시 시도해주세요.', choices: [] }]);
    } finally { setTyping(false); }
  }

  async function setup(answer, cur) {
    let ns = { ...cur }; let msg = null;
    if (cur.setupStep === 1) {
      ns = { ...ns, character: { ...ns.character, name: answer }, setupStep: 2 };
      msg = { role: 'assistant', text: answer + '... 좋은 이름이네요.\n\n' + answer + '의 직업과 이력은 무엇인가요?\n이 세계가 무너지기 전, 당신은 어떤 사람이었나요?', choices: [], hint: '배우\n평범한 직장인\n프리랜서 디자이너' };
    } else if (cur.setupStep === 2) {
      ns = { ...ns, character: { ...ns.character, job: answer }, setupStep: 3 };
      msg = { role: 'assistant', text: answer + '... 그런 배경을 가졌군요.\n\n마지막 질문입니다. 이 폐허 속에서 여전히 살아남을 수 있었던 계기는 무엇인가요?', choices: [], hint: '나의 단 한 가지 특기, 좀비 연기로 좀비를 속였다\n좀비 바이러스가 창궐한 날, 나 혼자 아무것도 모르고 출근해서 살아남았다' };
    } else if (cur.setupStep === 3) {
      ns = { ...ns, character: { ...ns.character, survival_reason: answer }, setupStep: 4, currentDay: 1 };
      try {
        const prompt = '캐릭터 생성 완료. 이름:' + ns.character.name + ', 직업:' + ns.character.job + ', 생존계기:' + answer + '. 1일차 스토리 시작. 지하실에서 눈을 뜨는 장면부터, 캐릭터 정보를 자연스럽게 녹여서, 첫 번째 상황만 진행. 마크다운 없이 순수 텍스트만.';
        const { text: raw, msgs } = await callAPI(prompt, ns);
        const { clean, choices } = parseResp(raw);
        ns.messages = msgs;
        msg = { role: 'assistant', text: clean, choices };
      } catch (e) {
        msg = { role: 'assistant', text: '캐릭터 생성 완료. 생존일기를 시작합니다...', choices: [] };
      }
    }
    setSt(ns);
    if (msg) setLog(p => [...p, msg]);
    setTyping(false);
  }

  const prog = st.currentDay === 0 ? 0 : Math.min(Math.round(((st.currentDay - 1) / 7 + st.stepIndex / (7 * st.totalSteps)) * 100), 100);

  return (<>
    <Head>
      <title>생존일기 — 당신은 살아남았다</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Share+Tech+Mono&family=Noto+Sans+KR:wght@300;400;500&display=swap" rel="stylesheet" />
    </Head>
    <style jsx global>{`
      *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
      body{background:#0a0a08;color:#ddd8cc;font-family:'Noto Sans KR',sans-serif;min-height:100vh}
      @keyframes fi{to{opacity:1;transform:translateY(0)}}
      @keyframes bl{0%,80%,100%{opacity:.2}40%{opacity:1}}
      .fin{animation:fi .4s ease forwards;opacity:0;transform:translateY(8px)}
      .cbtn:hover{background:rgba(200,147,42,.1)!important;border-color:#c8932a!important;color:#c8932a!important}
      textarea:focus{border-bottom-color:#c8932a!important;background:#111110!important}
      textarea::placeholder{color:#4a4840;font-style:italic}
      ::-webkit-scrollbar{width:3px}
      ::-webkit-scrollbar-thumb{background:#3a3020}
    `}</style>

    <div style={{ maxWidth: 720, margin: '0 auto', height: '100dvh', display: 'flex', flexDirection: 'column', padding: '0 16px', overflow: 'hidden' }}>
      <header style={{ padding: '28px 0 20px', borderBottom: '1px solid #2a2a26', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontFamily: "'Nanum Myeongjo',serif", fontSize: 22, fontWeight: 800, color: '#c8932a', letterSpacing: 2 }}>
          생존일기
          <span style={{ color: '#7a766c', fontWeight: 400, fontSize: 13, marginLeft: 12, letterSpacing: 1, fontFamily: "'Share Tech Mono',monospace" }}>SURVIVAL DIARY</span>
        </div>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: '#8a6420', background: 'rgba(200,147,42,.08)', border: '1px solid #3a3020', padding: '4px 10px', letterSpacing: 2 }}>
          {st.currentDay > 0 ? 'DAY ' + st.currentDay : 'DAY —'}
        </div>
      </header>

      <div style={{ height: 2, background: '#2a2a26', margin: '0 -16px', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg,#8a6420,#c8932a)', width: prog + '%', transition: 'width .5s ease' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px', paddingTop: '16px' }}>
        {log.map((m, i) => (
          <div key={i}>
            <div className="fin" style={{ display: 'flex', gap: 14, padding: '12px 0', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.role === 'user' ? 'rgba(61,110,74,.15)' : 'rgba(200,147,42,.1)', border: '1px solid ' + (m.role === 'user' ? 'rgba(61,110,74,.3)' : '#3a3020'), color: m.role === 'user' ? '#6aaf7a' : '#c8932a', fontFamily: "'Share Tech Mono',monospace", fontSize: 10 }}>
                {m.role === 'user' ? '나' : 'AI'}
              </div>
              <div style={{ maxWidth: 'calc(100% - 52px)', padding: '14px 18px', lineHeight: 1.8, fontSize: 15, fontWeight: 300, background: m.role === 'user' ? 'rgba(61,110,74,.1)' : '#1f1f1c', border: '1px solid ' + (m.role === 'user' ? 'rgba(61,110,74,.25)' : '#2a2a26'), borderLeft: m.role === 'user' ? undefined : '2px solid #8a6420', color: m.role === 'user' ? '#a09880' : '#ddd8cc', fontFamily: m.role === 'user' ? undefined : "'Nanum Myeongjo',serif", textAlign: m.role === 'user' ? 'right' : 'left' }}>
                {m.text.split('\n').map((l, j, a) => <span key={j}>{l}{j < a.length - 1 && <br />}</span>)}
                {m.hint && (
                  <span style={{ display: 'block', marginTop: 12, padding: '8px 12px', background: 'rgba(200,147,42,.05)', borderLeft: '2px solid #8a6420', fontSize: 12, color: '#7a766c', lineHeight: 1.8 }}>
                    <em style={{ color: '#8a6420', fontStyle: 'normal', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1.5, display: 'block', marginBottom: 5 }}>예시</em>
                    {m.hint.split('\n').map((l, j, a) => <span key={j}>{l}{j < a.length - 1 && <br />}</span>)}
                  </span>
                )}
              </div>
            </div>
            {m.choices && m.choices.length > 0 && (
              <div style={{ padding: '4px 0 12px 46px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {m.choices.map((c, ci) => (
                  <button key={ci} className="cbtn" onClick={() => send(c, true)} disabled={typing}
                    style={{ background: (c === '했어요' || c === '아직') ? 'rgba(200,147,42,.06)' : 'transparent', border: '1px solid #3a3020', color: '#8a6420', padding: '8px 16px', fontFamily: (c === '했어요' || c === '아직') ? "'Share Tech Mono',monospace" : "'Nanum Myeongjo',serif", fontSize: (c === '했어요' || c === '아직') ? 12 : 13, cursor: 'pointer', letterSpacing: (c === '했어요' || c === '아직') ? 1 : .5 }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            {m.report && (
              <div style={{ margin: '8px 0 8px 46px', background: '#1a1a17', border: '1px solid #3a3020', borderTop: '3px solid #c8932a', padding: '20px 22px' }}>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 3, color: '#c8932a', marginBottom: 16 }}>오늘의 생존일기</div>
                {[['캐릭터', (m.report.character?.name || '') + ' / ' + (m.report.character?.job || '')], ['생존계기', m.report.character?.survival_reason], ['오늘단계', m.report.step], ['오늘액션', m.report.action], ['실행여부', m.report.done ? '✓ 실행' : '△ 미실행'], ['오늘한줄', '"' + (m.report.one_line || '') + '"'], ['동행코멘트', m.report.coach_note]].map(([lbl, val], ri) => (
                  <div key={ri} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '6px 12px', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #2a2a26' }}>
                    <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: '#8a6420', letterSpacing: 1 }}>{lbl}</div>
                    <div style={{ color: '#e8e0cc', fontFamily: "'Nanum Myeongjo',serif", lineHeight: 1.7 }}>{val || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', gap: 14, padding: '12px 0', alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, background: 'rgba(200,147,42,.1)', border: '1px solid #3a3020', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8932a', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, flexShrink: 0 }}>AI</div>
            <div style={{ display: 'flex', gap: 5, padding: '14px 18px', background: '#1f1f1c', border: '1px solid #2a2a26', borderLeft: '2px solid #8a6420' }}>
              {[0, .2, .4].map((d, i) => <span key={i} style={{ width: 6, height: 6, background: '#8a6420', borderRadius: '50%', animation: 'bl 1.4s ' + d + 's infinite', display: 'block' }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {crisis && (
        <div style={{ background: 'rgba(139,51,51,.15)', border: '1px solid #8b3333', borderLeft: '3px solid #cc4444', padding: '14px 18px', margin: '4px 0', fontSize: 13, color: '#cc8888', lineHeight: 1.7, flexShrink: 0 }}>
          ⚠️ 지금 많이 힘드신 것 같아요. 당신 곁에 있습니다.<br />
          자살예방상담전화 1393 (24시간) · 정신건강 위기상담 1577-0199 · 긴급 112 / 119
        </div>
      )}

      <div style={{ borderTop: '1px solid #2a2a26', padding: '10px 0', display: 'flex', gap: 12, alignItems: 'flex-end', position: 'sticky', bottom: 0, background: '#0a0a08', zIndex: 10, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <textarea value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = ''; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="폐허 속에서, 당신의 이야기를 전해주세요..." rows={1} disabled={typing}
            style={{ width: '100%', background: '#1a1a17', border: '1px solid #2a2a26', borderBottom: '2px solid #8a6420', color: '#ddd8cc', padding: '12px 16px', fontFamily: "'Noto Sans KR',sans-serif", fontSize: 14, fontWeight: 300, lineHeight: 1.6, resize: 'none', minHeight: 48, maxHeight: 120, outline: 'none' }} />
        </div>
        <button onClick={() => send()} disabled={typing || !input.trim()}
          style={{ background: 'transparent', border: '1px solid #8a6420', color: '#c8932a', width: 48, height: 48, cursor: (typing || !input.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, opacity: (typing || !input.trim()) ? .3 : 1 }}>
          ▶
        </button>
      </div>
    </div>
  </>);
}
