// 위클립 주간 뷰티 트렌드 수집기
// 원칙: 수치는 API 원본 그대로 쓰고, 확인되지 않은 사실은 쓰지 않는다.
// 필요 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, YOUTUBE_API_KEY, (선택) ANTHROPIC_API_KEY
import fs from 'node:fs';
import { findCases, newsCases } from './cases.mjs';
import { shoppingClicks, shoppingDemo, bannedIn } from './extras.mjs';

const CFG = JSON.parse(fs.readFileSync('scripts/weeklip/config.json', 'utf8'));
const DRAFT = process.env.WEEKLIP_OUT === 'draft';
const ISSUES_PATH = DRAFT ? 'work/weeklip/draft.json' : 'work/weeklip/issues.json';
const { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, YOUTUBE_API_KEY, ANTHROPIC_API_KEY } = process.env;
if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET || !YOUTUBE_API_KEY) {
  console.error('필수 키가 없어요: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, YOUTUBE_API_KEY'); process.exit(1);
}

// ---------- 날짜 (한국 시간 기준) ----------
const DAY = 86400000;
const kstNow = new Date(Date.now() + 9 * 3600000);               // KST를 UTC 필드로 다룸
const ymd = d => d.toISOString().slice(0, 10);
const monday = (() => { const d = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate())); const w = (d.getUTCDay() + 6) % 7; return new Date(d - w * DAY); })();
const issueMon = new Date(monday);                                // 이번 호가 다루는 주(월~일)
const issueSun = new Date(+issueMon + 6 * DAY);
const dataEnd = new Date(+issueMon - DAY);                        // 지난주 일요일
const dataStart = new Date(+issueMon - CFG.weeksOfHistory * 7 * DAY); // 지난주 포함 N주
const yoyStart = new Date(+issueMon - (52 + CFG.weeksOfHistory) * 7 * DAY); // 작년 비교용
const M = d => d.getUTCMonth() + 1, D = d => d.getUTCDate();
const first = new Date(Date.UTC(issueMon.getUTCFullYear(), issueMon.getUTCMonth(), 1));
const weekNo = Math.ceil((D(issueMon) + (first.getUTCDay() + 6) % 7) / 7);
const issue = {
  id: `${issueMon.getUTCFullYear()}-${String(M(issueMon)).padStart(2, '0')}-w${weekNo}`,
  label: `${issueMon.getUTCFullYear()}년 ${M(issueMon)}월 ${weekNo}주차`,
  range: `${M(issueMon)}월 ${D(issueMon)}일 ~ ${M(issueSun)}월 ${D(issueSun)}일`,
  pub: `${kstNow.getUTCMonth() + 1}월 ${kstNow.getUTCDate()}일 발행`,
  dataRange: `${M(new Date(+dataEnd - 6 * DAY))}월 ${D(new Date(+dataEnd - 6 * DAY))}일 ~ ${M(dataEnd)}월 ${D(dataEnd)}일`,
  historyRange: `${M(dataStart)}월 ${D(dataStart)}일 ~ ${M(dataEnd)}월 ${D(dataEnd)}일`,
};

// ---------- 공통 ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(url, opt = {}) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, opt);
    if (r.ok) return r.json();
    if (r.status === 429 || r.status >= 500) { await sleep(1500 * (i + 1)); continue; }
    throw new Error(`${r.status} ${url.split('?')[0]}: ${(await r.text()).slice(0, 200)}`);
  }
  throw new Error('재시도 초과: ' + url.split('?')[0]);
}
const YT = 'https://www.googleapis.com/youtube/v3';

// ---------- 1) 후보 키워드: 고정 목록 + 최근 7일 유튜브 해시태그 ----------
async function discoverFromYouTube() {
  const after = new Date(Date.now() - 7 * DAY).toISOString();
  const count = new Map();
  for (const q of CFG.discoveryQueries) {
    const s = await getJSON(`${YT}/search?part=snippet&type=video&videoDuration=short&order=viewCount&regionCode=KR&relevanceLanguage=ko&maxResults=50&publishedAfter=${after}&q=${encodeURIComponent(q)}&key=${YOUTUBE_API_KEY}`);
    const ids = s.items.map(i => i.id.videoId).join(',');
    if (!ids) continue;
    const v = await getJSON(`${YT}/videos?part=snippet&id=${ids}&key=${YOUTUBE_API_KEY}`);
    for (const it of v.items) {
      const text = `${it.snippet.title} ${it.snippet.description || ''}`;
      const tags = new Set((text.match(/#[0-9A-Za-z가-힣_]{2,20}/g) || []).map(t => t.slice(1).toLowerCase()));
      for (const t of tags) if (!CFG.stopTags.includes(t)) count.set(t, (count.get(t) || 0) + 1);
    }
  }
  return [...count.entries()].filter(([, n]) => n >= CFG.minTagCount).sort((a, b) => b[1] - a[1]).slice(0, CFG.maxDiscovered).map(([t]) => t);
}

// ---------- 2) 네이버 데이터랩: 주간 검색 추이 ----------
async function naverTrend(words) {
  const out = [];
  for (let i = 0; i < words.length; i += 4) {
    const group = words.slice(i, i + 4);
    const body = { startDate: ymd(yoyStart), endDate: ymd(dataEnd), timeUnit: 'week',
      keywordGroups: [CFG.anchorKeyword, ...group].map(k => typeof k === 'string' ? { groupName: k, keywords: [k] } : { groupName: k.name, keywords: k.keywords.slice(0, 20) }) };
    // 2026-07-31 이후 신규 키는 NAVER API HUB(네이버 클라우드), 이전 키는 개발자센터(레거시)
    const hub = CFG.naverApi !== 'legacy';
    const j = await getJSON(hub ? 'https://naverapihub.apigw.ntruss.com/search-trend/v1/search' : 'https://openapi.naver.com/v1/datalab/search', { method: 'POST',
      headers: hub
        ? { 'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID, 'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET, 'Content-Type': 'application/json' }
        : { 'X-Naver-Client-Id': NAVER_CLIENT_ID, 'X-Naver-Client-Secret': NAVER_CLIENT_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify(body) });
    const anchor = j.results[0].data || [];
    const anchorLast = anchor.at(-1)?.ratio || 0;
    for (const r of j.results.slice(1)) {
      const d = r.data; if (d.length < 3) continue;
      const last = d.at(-1).ratio, prev = d.slice(-5, -1).map(x => x.ratio);
      const prevAvg = prev.reduce((a, b) => a + b, 0) / (prev.length || 1);
      let yoyPct = null, lastYearGrowthPct = null;
      if (d.length >= 58) {
        const ly = d.at(-53).ratio, lyPrev = d.slice(-57, -53).map(x => x.ratio), lyAvg = lyPrev.reduce((a, b) => a + b, 0) / 4;
        if (ly > 0) yoyPct = Math.round((last / ly - 1) * 100);
        if (lyAvg > 0) lastYearGrowthPct = Math.round((ly / lyAvg - 1) * 100);
      }
      out.push({ keyword: r.title, series: d.slice(-CFG.weeksOfHistory).map(x => ({ period: x.period, ratio: +x.ratio.toFixed(2) })),
        last, prevAvg, growthPct: prevAvg > 0 ? Math.round((last / prevAvg - 1) * 100) : null, yoyPct, lastYearGrowthPct,
        seasonal: lastYearGrowthPct !== null && lastYearGrowthPct >= CFG.minGrowthPct,
        volumeIndex: anchorLast > 0 ? +(last / anchorLast).toFixed(3) : null });
    }
    await sleep(300);
  }
  return out;
}

// ---------- 3) 레퍼런스: 최근 영상 중 조회수 상위, 공개·재생 가능만 ----------
async function refsFor(keyword, windows = [7, 14]) {
  for (const days of windows) {
    const after = new Date(Date.now() - days * DAY).toISOString();
    const s = await getJSON(`${YT}/search?part=snippet&type=video&videoDuration=short&order=viewCount&regionCode=KR&relevanceLanguage=ko&maxResults=15&publishedAfter=${after}&q=${encodeURIComponent(keyword)}&key=${YOUTUBE_API_KEY}`);
    const ids = s.items.map(i => i.id.videoId).join(',');
    if (!ids) continue;
    const v = await getJSON(`${YT}/videos?part=snippet,statistics,status&id=${ids}&key=${YOUTUBE_API_KEY}`);
    const EXPLAIN = /뜻|의미|유래|설명|분석|정리|알아보|총정리|뉴스|news|explained|meaning|origin/i; // 설명·해설 영상은 레퍼런스에서 제외
    const ok = v.items.filter(x => x.status.privacyStatus === 'public' && x.status.uploadStatus === 'processed' && !EXPLAIN.test(x.snippet.title))
      .filter(x => !(CFG.refExcludeWords || []).some(w => x.snippet.title.toLowerCase().includes(w.toLowerCase()))) // 설명·해설 영상 제외
      .map(x => ({ id: x.id, ch: x.snippet.channelTitle, title: x.snippet.title, views: +(x.statistics.viewCount || 0), published: x.snippet.publishedAt.slice(0, 10), windowDays: days }))
      .sort((a, b) => (/[가-힣]/.test(b.title) - /[가-힣]/.test(a.title)) || (b.views - a.views)).slice(0, 3); // 한국어 영상 우선
    if (ok.length >= 2 || windows.length === 1) return ok;
  }
  return [];
}

// ---------- 3-1) 네이버 블로그: 지난주 올라온 글 수 (최대 100건까지 셈) ----------
async function blogCount(q) {
  try {
    const r = await fetch(`https://naverapihub.apigw.ntruss.com/search/v1/blog?query=${encodeURIComponent(q)}&display=100&start=1&sort=date&format=json`, { headers: { 'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID, 'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET } });
    if (!r.ok) return null;
    const from = ymd(new Date(+dataEnd - 6 * DAY)).replace(/-/g, ''), to = ymd(dataEnd).replace(/-/g, '');
    const items = (await r.json()).items || [];
    const n = items.filter(i => i.postdate >= from && i.postdate <= to).length;
    return { count: n, capped: n >= 100 || (items.length === 100 && items.at(-1).postdate >= from) };
  } catch { return null; }
}

// ---------- 3-2) 유행 포맷 검증: 최근 7일 업로드 수 vs 직전 3주 주평균 ----------
async function formatSignal(q) {
  const now = Date.now(), iso = t => new Date(t).toISOString();
  const count = async (after, before) => {
    const s = await getJSON(`${YT}/search?part=snippet&type=video&regionCode=KR&maxResults=50&order=date&publishedAfter=${iso(after)}${before ? '&publishedBefore=' + iso(before) : ''}&q=${encodeURIComponent(q)}&key=${YOUTUBE_API_KEY}`);
    return s.items.map(i => i.id.videoId);
  };
  const recentIds = await count(now - 7 * DAY), priorIds = await count(now - 28 * DAY, now - 7 * DAY);
  let top = [], views = 0;
  if (recentIds.length) {
    const v = await getJSON(`${YT}/videos?part=snippet,statistics&id=${recentIds.join(',')}&key=${YOUTUBE_API_KEY}`);
    const EXPLAIN = /뜻|의미|유래|설명|분석|정리|알아보|뉴스|news|explained|meaning|origin/i;
    const list = v.items.map(x => ({ id: x.id, ch: x.snippet.channelTitle, title: x.snippet.title, views: +(x.statistics.viewCount || 0), published: x.snippet.publishedAt.slice(0, 10) }));
    views = list.reduce((a, b) => a + b.views, 0);
    top = list.filter(x => !EXPLAIN.test(x.title)).sort((a, b) => b.views - a.views).slice(0, 3);
  }
  return { query: q, recent7: recentIds.length, recentCapped: recentIds.length >= 50, priorWeeklyAvg: +(priorIds.length / 3).toFixed(1), recentViews: views, top };
}

// ---------- 4) 글 초안: 주어진 사실만 사용 ----------
function fallbackText(t) {
  const p1 = [`네이버 데이터랩 기준으로 지난주 '${t.keyword}' 검색량이 직전 4주 평균보다 ${t.growthPct}% 늘었어요.`];
  if (t.yoyPct !== null) p1.push(`작년 같은 주와 비교하면 ${Math.abs(t.yoyPct)}% ${t.yoyPct >= 0 ? '많았어요' : '적었어요'}.`);
  if (t.lastYearGrowthPct !== null) p1.push(t.seasonal ? `작년 이맘때도 ${t.lastYearGrowthPct}% 올랐던 키워드라, 해마다 이 시기에 오르는 흐름일 수 있어요.` : `작년 이맘때는 이런 상승이 없었어요.`);
  const p2 = [];
  if (t.clickGrowthPct != null) p2.push(`네이버쇼핑 화장품/미용 분야에서 이 키워드의 클릭은 직전 4주 평균보다 ${Math.abs(t.clickGrowthPct)}% ${t.clickGrowthPct >= 0 ? '늘었어요' : '줄었어요'}.`);
  if (t.demo?.femalePct != null) p2.push(`지난주 쇼핑 클릭 중 여성 비중은 ${t.demo.femalePct}%였어요.`);
  if (t.demo?.topAge) p2.push(`연령대로는 ${t.demo.topAge}가 ${t.demo.topAgePct}%로 가장 많았어요.`);
  const body = [p1.join(' ')]; if (p2.length) body.push(p2.join(' '));
  body.push(`최근 올라온 관련 쇼츠 중 조회수가 가장 높은 영상은 '${t.refs[0].ch}' 채널의 영상으로, 조회수 ${t.refs[0].views.toLocaleString('ko-KR')}회를 기록하고 있어요.`);
  return { title: t.keyword, body,
    idea: '(편집자 작성 필요) 이 트렌드를 우리 브랜드 콘텐츠로 옮길 아이디어를 적어 주세요.' };
}
async function draftText(t) {
  if (!ANTHROPIC_API_KEY) return fallbackText(t);
  const facts = { 키워드: t.keyword, 데이터기간: issue.dataRange, 직전4주평균대비: `${t.growthPct}%`, 작년같은주대비: t.yoyPct, 작년이맘때상승률: t.lastYearGrowthPct, 쇼핑클릭증가율: t.clickGrowthPct, 쇼핑클릭여성비중: t.demo?.femalePct, 쇼핑클릭최다연령: t.demo?.topAge, 최다연령비중: t.demo?.topAgePct, 주간검색지수: t.series,
    참고영상: t.refs.map(r => ({ 채널: r.ch, 제목: r.title, 조회수: r.views, 게시일: r.published })) };
  const prompt = `당신은 뷰티 마케터용 트렌드 뉴스레터 '위클립'의 에디터입니다. 아래 사실만 사용해서 한국어 블로그 섹션을 쓰세요.
규칙:
- 아래에 없는 사실, 수치, 인물, 인용문을 절대 만들지 마세요. 모르면 쓰지 마세요.
- 숫자는 아래 데이터에 있는 값만 그대로 쓰세요.
- 화장품의 효능·효과를 단정하거나 의학적 표현(치료, 개선, 재생 등)을 쓰지 마세요.
- 해요체, 친근하고 술술 읽히게. body는 2~3문단, 각 2~3문장.
- idea는 뷰티 브랜드가 숏폼으로 옮길 수 있는 촬영 아이디어 1문단(편집부 제안).
- 오직 JSON만 출력: {"title":"...","body":["...","..."],"idea":"..."}
사실: ${JSON.stringify(facts)}`;
  const j = await getJSON('https://api.anthropic.com/v1/messages', { method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: CFG.claudeModel, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }) });
  try { return JSON.parse(j.content.map(c => c.text || '').join('').replace(/```json|```/g, '').trim()); }
  catch { return fallbackText(t); }
}
// 본문 숫자 검사: 데이터에 없는 숫자가 있으면 검수 경고
function unknownNumbers(text, t) {
  const extra = [t.yoyPct, t.lastYearGrowthPct, t.clickGrowthPct, t.demo?.femalePct, t.demo?.topAgePct, t.demo?.topAge && parseInt(t.demo.topAge)].filter(v => v != null).map(v => String(Math.abs(v)));
  const allowed = new Set([...extra, String(t.growthPct), ...t.refs.map(r => String(r.views)), ...t.refs.map(r => r.views.toLocaleString('ko-KR')),
    ...t.series.map(s => String(s.ratio)), ...issue.dataRange.match(/\d+/g), '2', '3', '4', '1']);
  return (text.match(/\d[\d,.]*/g) || []).filter(n => !allowed.has(n) && !allowed.has(n.replace(/,/g, '')));
}

// ---------- 실행 ----------
const discovered = await discoverFromYouTube();
const candidates = [...new Set([...CFG.seedKeywords, ...discovered])];
console.log(`후보 ${candidates.length}개 (고정 ${CFG.seedKeywords.length}, 유튜브 발견 ${discovered.length})`);
const trends = (await naverTrend(candidates))
  .filter(t => t.growthPct !== null && t.growthPct >= CFG.minGrowthPct && t.volumeIndex >= CFG.minVolumeIndex)
  .sort((a, b) => (a.seasonal - b.seasonal) || (b.growthPct - a.growthPct)); // 올해 새로 뜬 흐름을 계절성보다 먼저

const picked = [], warnings = [];
for (const t of trends) {
  if (picked.length >= CFG.maxTrends) break;
  t.refs = await refsFor(t.keyword);
  if (t.refs.length < 2) { warnings.push(`'${t.keyword}': 참고 영상이 2개 미만이라 제외`); continue; }
  const sw = { from: dataStart, to: dataEnd, id: NAVER_CLIENT_ID, secret: NAVER_CLIENT_SECRET };
  t.clickGrowthPct = (await shoppingClicks([t.keyword], sw))[t.keyword] ?? null;
  t.demo = await shoppingDemo(t.keyword, { ...sw, from: new Date(+dataEnd - 6 * DAY) });
  t.blog7 = await blogCount(t.keyword);
  let txt = await draftText(t);
  const bad = unknownNumbers([...txt.body, txt.idea].join(' '), t);
  if (bad.length) { warnings.push(`'${t.keyword}': 데이터에 없는 숫자(${bad.join(', ')})가 있어 기본 문장으로 대체`); txt = fallbackText(t); }
  const banned = bannedIn([...txt.body, txt.idea || ''].join(' '));
  if (banned.length) { warnings.push(`'${t.keyword}': 광고 금지 표현(${banned.join(', ')})이 있어 기본 문장으로 대체`); txt = fallbackText(t); }
  picked.push({ t: txt.title || t.keyword, keyword: t.keyword, growthPct: t.growthPct, volumeIndex: t.volumeIndex,
    yoyPct: t.yoyPct, lastYearGrowthPct: t.lastYearGrowthPct, seasonal: t.seasonal, clickGrowthPct: t.clickGrowthPct, demo: t.demo, blog7: t.blog7,
    series: t.series, body: txt.body, idea: txt.idea, refs: t.refs,
    src: [{ name: '네이버 데이터랩 검색어 트렌드', url: 'https://datalab.naver.com/keyword/trendSearch.naver' }, { name: 'YouTube Data API', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(t.keyword) }] });
}

// 클라이언트 브랜드 동향
const newsCount = async q => {
  try { const r = await fetch(`https://naverapihub.apigw.ntruss.com/search/v1/news?query=${encodeURIComponent(q)}&display=100&start=1&sort=date&format=json`, { headers: { 'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID, 'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET } });
    if (!r.ok) return null; const from = new Date(+dataEnd - 6 * DAY), to = new Date(+dataEnd + DAY);
    const dec = t => t.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const items = ((await r.json()).items || []).filter(i => { const d = new Date(i.pubDate); return d >= from && d < to; });
    return { count: items.length, items: items.slice(0, 15).map(i => ({ title: dec(i.title), desc: dec(i.description), url: i.originallink || i.link, date: new Date(+new Date(i.pubDate) + 9 * 3600000).toISOString().slice(0, 10) })) };
  } catch { return null; }
};
const topVideo = async q => { try { const v = await refsFor(q, [7]); return v[0] || null; } catch { return null; } };
const clients = [];
if (CFG.clientBrands?.length) {
  const tr = await naverTrend(CFG.clientBrands.map(b => ({ name: b.name, keywords: b.keywords })));
  for (const b of CFG.clientBrands) {
    const t = tr.find(x => x.keyword === b.name) || {};
    const n = await newsCount(b.news);
    clients.push({ brand: b.name, growthPct: t.growthPct ?? null, yoyPct: t.yoyPct ?? null, series: t.series || [],
      news: n ? n.count : null, newsItems: DRAFT && n ? n.items : undefined, video: await topVideo(b.video), issues: [] });
  }
}
const caseRes = await findCases({ apiKey: ANTHROPIC_API_KEY, model: CFG.claudeModel, from: new Date(+dataEnd - 6 * DAY), to: dataEnd, max: CFG.maxCases || 5,
  naverId: NAVER_CLIENT_ID, naverSecret: NAVER_CLIENT_SECRET, newsQueries: CFG.newsQueries, beautyWords: CFG.beautyWords });
warnings.push(...caseRes.notes);
// 업종 구분 없이 요즘 유행하는 영상 포맷·챌린지 관련 기사 (편집할 때 참고 자료)
const fmtQueries = [...new Set([...(CFG.formatCandidates || []), ...String(process.env.FORMAT_QUERIES || '').split(',').map(x => x.trim()).filter(Boolean)])];
const formatSignals = [];
for (const q of fmtQueries) { try { formatSignals.push(await formatSignal(q)); } catch (e) { warnings.push(`포맷 신호 수집 실패: ${q}`); } }
const fmtRes = await newsCases({ naverId: NAVER_CLIENT_ID, naverSecret: NAVER_CLIENT_SECRET, queries: CFG.formatQueries || [], from: new Date(+dataEnd - 6 * DAY), to: new Date(+dataEnd + DAY), max: CFG.maxFormatNews || 10 });
warnings.push(...fmtRes.notes);
if (!picked.length && !caseRes.cases.length) { console.log('기준을 넘은 트렌드가 없어 이번 주는 발행하지 않아요.'); fs.writeFileSync('/tmp/weeklip_skip', '1'); process.exit(0); }
const all = DRAFT ? [] : fs.existsSync(ISSUES_PATH) ? JSON.parse(fs.readFileSync(ISSUES_PATH, 'utf8')) : [];
const newIssue = { ...issue,
  headline: picked.length ? `이번 주 검색량이 가장 크게 오른\n뷰티 키워드는 '${picked[0].keyword}'${((picked[0].keyword.at(-1).charCodeAt(0) - 0xAC00) % 28) ? '이에요' : '예요'}` : '이번 주는 기준을 넘은 트렌드가 없었어요',
  intro: `지난주(${issue.dataRange}) 네이버 검색 데이터에서 직전 4주 평균보다 ${CFG.minGrowthPct}% 이상 오른 뷰티 키워드 ${picked.length}개를 골랐어요. 키워드마다 최근 올라온 쇼츠 중 조회수가 높은 영상을 참고용으로 붙였어요.`,
  trends: picked, cases: caseRes.cases, clients, ...(DRAFT ? { formatNews: fmtRes.cases, formatSignals } : {}) };
const next = all.filter(i => i.id !== issue.id).concat(newIssue);
fs.writeFileSync(ISSUES_PATH, JSON.stringify(next, null, 2) + '\n');

const pr = [`## 위클립 ${issue.label} 초안`, '', `데이터 기간: ${issue.dataRange}`, `선정된 트렌드: ${picked.length}개`, `브랜드 사례: ${caseRes.cases.length}개`, '',
  ...picked.map((p, i) => `${i + 1}. **${p.keyword}** · 직전 4주 평균 대비 +${p.growthPct}% · 참고 영상 ${p.refs.length}개`),
  '', warnings.length ? '### 검수 필요\n' + warnings.map(w => '- ' + w).join('\n') : '### 자동 검사 통과', '',
  '---', '검수 후 이 PR에 **발행 승인** 라벨을 붙이면 월요일 오전 9시에 자동 발행돼요. 본문은 이 PR의 파일 변경 탭에서 바로 고칠 수 있어요.'].join('\n');
fs.writeFileSync('/tmp/weeklip_pr.md', pr);
fs.writeFileSync('/tmp/weeklip_meta.env', `ISSUE_ID=${issue.id}\nISSUE_LABEL="${issue.label}"\n`);
console.log(pr);
