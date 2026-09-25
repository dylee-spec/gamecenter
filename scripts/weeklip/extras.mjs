// 추가 데이터: 쇼핑 클릭 추이, 쇼핑 클릭 성별·연령 비중, 클라이언트 브랜드 동향, 광고 금지 표현 점검
const HUB = 'https://naverapihub.apigw.ntruss.com';
const BEAUTY_CAT = '50000002'; // 네이버쇼핑 화장품/미용
const ymd = d => d.toISOString().slice(0, 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function hubPost(path, body, id, secret) {
  return fetch(HUB + path, { method: 'POST', headers: { 'X-NCP-APIGW-API-KEY-ID': id, 'X-NCP-APIGW-API-KEY': secret, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async r => (r.ok ? r.json() : null)).catch(() => null);
}
// 일별 클릭을 월요일 시작 주 단위 하루 평균으로 묶어요 (아직 안 끝난 주도 공정하게 비교)
const weekly = (daily, from, to) => { const m = new Map(daily.map(x => [x.period, x.ratio])); const out = [];
  for (let w = new Date(+from); +w <= +to; w = new Date(+w + 7 * 86400000)) { let s = 0, n = 0;
    for (let k = 0; k < 7; k++) { const d = new Date(+w + k * 86400000); if (+d > +to) break; if (m.has(ymd(d))) { s += m.get(ymd(d)); n++; } }
    out.push({ period: ymd(w), ratio: n ? s / n : 0 }); } return out; };
const growth = d => { if (!d || d.length < 5) return null; const last = d.at(-1).ratio, prev = d.slice(-5, -1).map(x => x.ratio); const avg = prev.reduce((a, b) => a + b, 0) / 4; return avg > 0 ? Math.round((last / avg - 1) * 100) : null; };

// 네이버쇼핑 화장품/미용 분야에서 키워드별 클릭 추이 (직전 4주 평균 대비)
export async function shoppingClicks(keywords, { from, to, weekStart, id, secret }) {
  const out = {};
  for (let i = 0; i < keywords.length; i += 5) {
    const group = keywords.slice(i, i + 5);
    const j = await hubPost('/shopping/v1/category/keywords', { startDate: ymd(from), endDate: ymd(to), timeUnit: 'date', category: BEAUTY_CAT,
      keyword: group.map(k => ({ name: k, param: [k] })) }, id, secret);
    for (const r of j?.results || []) { const g = growth(weekly(r.data || [], from, to)); if (g !== null) out[r.title] = g; }
    await sleep(250);
  }
  return out;
}

// 지난주 쇼핑 클릭의 성별·연령 비중 (같은 요청 안의 값끼리만 비교)
export async function shoppingDemo(keyword, { from, to, id, secret }) {
  const share = async path => {
    const j = await hubPost(path, { startDate: ymd(from), endDate: ymd(to), timeUnit: 'week', category: BEAUTY_CAT, keyword }, id, secret);
    const sum = {}; for (const r of j?.results || []) for (const x of r.data || []) if (x.group) sum[x.group] = (sum[x.group] || 0) + x.ratio;
    const total = Object.values(sum).reduce((a, b) => a + b, 0); if (!total) return null;
    return Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, Math.round(v / total * 100)]));
  };
  const g = await share('/shopping/v1/category/keyword/gender'); await sleep(250);
  const a = await share('/shopping/v1/category/keyword/age');
  if (!g && !a) return null;
  const topAge = a ? Object.entries(a).sort((x, y) => y[1] - x[1])[0] : null;
  return { femalePct: g?.f ?? null, topAge: topAge ? `${topAge[0]}대` : null, topAgePct: topAge ? topAge[1] : null };
}

// 클라이언트 브랜드 동향: 검색 추이, 지난주 기사 수, 지난주 대표 영상
export async function clientWatch(brands, { trendFn, newsCount, topVideo }) {
  const trends = await trendFn(brands);
  const out = [];
  for (const b of brands) {
    const t = trends.find(x => x.keyword === b) || {};
    out.push({ brand: b, growthPct: t.growthPct ?? null, yoyPct: t.yoyPct ?? null, series: t.series || [],
      news: await newsCount(b), video: await topVideo(b) });
  }
  return out;
}

// 화장품 광고에서 문제 될 수 있는 표현
export const BANNED = ['치료', '치유', '완치', '재생', '처방', '특효', '즉효', '부작용 없', '부작용이 없', '기적', '영구적', '100% 효과', '의학적', '질병', '염증 개선', '흉터 제거', '주름 제거', '피부과 수준'];
export const bannedIn = text => BANNED.filter(w => text.includes(w));
