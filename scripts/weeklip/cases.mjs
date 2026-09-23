// 이번 주 브랜드 사례: Claude API 웹 검색으로 찾고, 원문을 직접 열어 검증한 것만 싣는다.
const DAY = 86400000;
const strip = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

async function verify(c, from, to) {
  try {
    const r = await fetch(c.sourceUrl, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 weeklip-bot' } });
    if (!r.ok) return `원문 접속 실패(${r.status})`;
    const text = strip(await r.text());
    if (!text.includes(c.brand)) return '원문에 브랜드 이름이 없음';
    const d = new Date(c.sourceDate);
    if (isNaN(d) || d < from || d > to) return `기간 밖 날짜(${c.sourceDate})`;
    return null;
  } catch (e) { return '원문 확인 오류'; }
}

// 키가 없을 때: 네이버 뉴스 검색(API HUB)으로 지난주 기사 모음
const decode = s => s.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const PLATFORM = [['릴스', /릴스|reels/i], ['틱톡', /틱톡|tiktok/i], ['유튜브', /유튜브|쇼츠|youtube/i], ['인스타그램', /인스타|instagram/i], ['SNS', /SNS|숏폼|소셜/i]];
async function newsCases({ naverId, naverSecret, queries, beautyWords, from, to, max }) {
  const seen = new Set(), seenTitle = new Set(), out = [], notes = [];
  const beauty = new RegExp(beautyWords.join('|'));
  for (const q of queries) {
    const r = await fetch(`https://naverapihub.apigw.ntruss.com/search/v1/news?query=${encodeURIComponent(q)}&display=50&start=1&sort=date&format=json`,
      { headers: { 'X-NCP-APIGW-API-KEY-ID': naverId, 'X-NCP-APIGW-API-KEY': naverSecret } });
    if (!r.ok) { notes.push(`뉴스 검색 실패(${r.status}) '${q}' — API HUB 앱에 뉴스 API가 켜져 있는지 확인`); continue; }
    for (const it of (await r.json()).items || []) {
      const d = new Date(it.pubDate); if (isNaN(d) || d < from || d > to) continue;
      const title = decode(it.title), desc = decode(it.description), text = title + ' ' + desc;
      const plat = PLATFORM.find(([, re]) => re.test(text)); if (!plat || !beauty.test(text)) continue;
      const url = it.originallink || it.link, key = title.replace(/\s/g, '').slice(0, 18);
      if (seen.has(url) || seenTitle.has(key)) continue; seen.add(url); seenTitle.add(key);
      let host = ''; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch {}
      out.push({ brand: '', platform: plat[0], title, body: [desc], point: '', sourceUrl: url, sourceName: host,
        sourceDate: new Date(+d + 9 * 3600000).toISOString().slice(0, 10), postUrl: '', mode: 'news' });
    }
  }
  // 플랫폼이 고르게 섞이도록 순서대로 하나씩
  const byPlat = {}; out.forEach(c => (byPlat[c.platform] ||= []).push(c));
  const mixed = []; while (mixed.length < max && Object.values(byPlat).some(a => a.length)) for (const a of Object.values(byPlat)) if (a.length && mixed.length < max) mixed.push(a.shift());
  return { cases: mixed, notes };
}

export async function findCases({ apiKey, model, from, to, rangeLabel, max = 5, naverId, naverSecret, newsQueries = [], beautyWords = [] }) {
  if (!apiKey) return newsCases({ naverId, naverSecret, queries: newsQueries, beautyWords, from, to: new Date(+to + DAY), max });
  const f = from.toISOString().slice(0, 10), t = to.toISOString().slice(0, 10);
  const prompt = `${f}부터 ${t} 사이에 게시되거나 보도된, 뷰티 브랜드(화장품·스킨케어·헤어·바디·향수)가 인스타그램 게시물·릴스·틱톡·유튜브 쇼츠를 마케팅에 활용한 사례를 웹 검색으로 찾아 주세요.
조건:
- 한국 브랜드를 우선하되 해외 브랜드도 괜찮아요. 서로 다른 브랜드로 최대 ${max}개.
- 반드시 해당 기간에 날짜가 찍힌 기사·보도자료·공식 페이지를 출처로 삼으세요. 날짜를 확인할 수 없으면 제외하세요.
- 출처에 적힌 내용만 쓰고, 조회수·매출·효과 같은 숫자는 출처에 있는 것만 쓰세요. 추측하지 마세요.
- 화장품 효능을 단정하는 표현은 쓰지 마세요.
오직 JSON 배열만 출력:
[{"brand":"브랜드명(출처 표기 그대로)","platform":"인스타그램|릴스|틱톡|유튜브","title":"사례를 한 줄로","body":["무엇을 어떻게 했는지 2~3문장","출처에 있는 반응·수치가 있으면 1~2문장"],"point":"뷰티 마케터가 가져갈 포인트 1~2문장(편집부 제안)","sourceUrl":"출처 URL","sourceName":"매체명","sourceDate":"YYYY-MM-DD","postUrl":"원본 게시물 URL(출처에 있을 때만, 없으면 빈 문자열)"}]`;
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 4000, messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }] }) });
  if (!r.ok) return { cases: [], notes: [`브랜드 사례 검색 실패(${r.status})`] };
  const j = await r.json();
  const raw = j.content.filter(c => c.type === 'text').map(c => c.text).join('');
  let list = [];
  try { list = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)); } catch { return { cases: [], notes: ['브랜드 사례 결과를 읽지 못함'] }; }
  const cases = [], notes = [], seen = new Set();
  const toEnd = new Date(+to + DAY);
  for (const c of list) {
    if (!c.brand || !c.sourceUrl || seen.has(c.brand)) continue;
    const bad = await verify(c, from, toEnd);
    if (bad) { notes.push(`'${c.brand}' 제외: ${bad}`); continue; }
    seen.add(c.brand);
    cases.push({ brand: c.brand, platform: c.platform, title: c.title, body: [].concat(c.body || []).slice(0, 3), point: c.point || '',
      sourceUrl: c.sourceUrl, sourceName: c.sourceName || '', sourceDate: c.sourceDate, postUrl: /^https?:\/\//.test(c.postUrl || '') ? c.postUrl : '' });
    if (cases.length >= max) break;
  }
  return { cases, notes };
}
