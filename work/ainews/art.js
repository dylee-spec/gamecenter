/* 빨리 따라와! AI 소식! 커버 일러스트(밝은 회청색 바탕 #eef2f7 위에 놓이도록 그림). 소식 내용에 맞춰 직접 그린 그림이에요(외부 이미지·브랜드 로고 없음). */
window.AINEWS_ART = (function () {
  var W = '#fff';
  function wrap(inner) {
    return '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }
  return {
    /* 질문에 맞춰 글·표·그래프가 한 화면에 섞여 나오는 화면 */
    ui: wrap(
      '<rect x="40" y="26" width="320" height="248" rx="22" fill="#1b64da" fill-opacity=".08"/>' +
      '<rect x="64" y="52" width="150" height="14" rx="7" fill="#1e3a8a"/>' +
      '<rect x="64" y="76" width="230" height="10" rx="5" fill="#1b64da" fill-opacity=".2"/>' +
      '<rect x="64" y="104" width="136" height="96" rx="12" fill="' + W + '" fill-opacity=".95"/>' +
      '<rect x="76" y="116" width="112" height="10" rx="5" fill="#1b64da" fill-opacity=".25"/>' +
      '<rect x="76" y="134" width="112" height="10" rx="5" fill="#1b64da" fill-opacity=".15"/>' +
      '<rect x="76" y="152" width="112" height="10" rx="5" fill="#1b64da" fill-opacity=".25"/>' +
      '<rect x="76" y="170" width="112" height="10" rx="5" fill="#1b64da" fill-opacity=".15"/>' +
      '<rect x="216" y="104" width="120" height="96" rx="12" fill="' + W + '" fill-opacity=".95"/>' +
      '<rect x="232" y="162" width="16" height="26" rx="4" fill="#1b64da" fill-opacity=".45"/>' +
      '<rect x="256" y="140" width="16" height="48" rx="4" fill="#1b64da" fill-opacity=".7"/>' +
      '<rect x="280" y="120" width="16" height="68" rx="4" fill="#1b64da"/>' +
      '<rect x="304" y="150" width="16" height="38" rx="4" fill="#1b64da" fill-opacity=".55"/>' +
      '<rect x="64" y="216" width="272" height="34" rx="17" fill="' + W + '" fill-opacity=".9"/>' +
      '<circle cx="86" cy="233" r="6" fill="#1b64da"/><rect x="104" y="228" width="110" height="10" rx="5" fill="#1b64da" fill-opacity=".3"/>'
    ),
    /* 이용정책 문서와 방패 */
    policy: wrap(
      '<rect x="92" y="28" width="216" height="244" rx="20" fill="' + W + '" fill-opacity=".95"/>' +
      '<rect x="120" y="58" width="104" height="14" rx="7" fill="#1e3a8a"/>' +
      '<rect x="120" y="86" width="160" height="9" rx="4.5" fill="#1e3a8a" fill-opacity=".25"/>' +
      '<rect x="120" y="106" width="140" height="9" rx="4.5" fill="#1e3a8a" fill-opacity=".25"/>' +
      '<rect x="120" y="126" width="160" height="9" rx="4.5" fill="#1e3a8a" fill-opacity=".25"/>' +
      '<path d="M200 160 L248 178 V212 C248 238 226 252 200 262 C174 252 152 238 152 212 V178 Z" fill="#1b64da"/>' +
      '<path d="M178 212 L194 228 L224 196" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'
    ),
    /* 작고 빠른 모델: 번개 */
    fast: wrap(
      '<circle cx="200" cy="150" r="118" fill="#1b64da" fill-opacity=".07"/>' +
      '<circle cx="200" cy="150" r="82" fill="#1b64da" fill-opacity=".1"/>' +
      '<path d="M222 40 L130 168 H190 L172 262 L270 124 H208 Z" fill="#1b64da"/>' +
      '<rect x="40" y="108" width="62" height="10" rx="5" fill="#1b64da" fill-opacity=".35"/>' +
      '<rect x="24" y="134" width="84" height="10" rx="5" fill="#1b64da" fill-opacity=".22"/>' +
      '<rect x="48" y="160" width="54" height="10" rx="5" fill="#1b64da" fill-opacity=".35"/>'
    ),
    /* 월간 API 크레딧: 쌓인 코인과 카드 */
    credit: wrap(
      '<rect x="48" y="52" width="230" height="146" rx="18" fill="' + W + '" fill-opacity=".95"/>' +
      '<rect x="48" y="84" width="230" height="30" fill="#1e3a8a" fill-opacity=".85"/>' +
      '<rect x="70" y="140" width="84" height="12" rx="6" fill="#1e3a8a" fill-opacity=".3"/>' +
      '<rect x="70" y="162" width="52" height="12" rx="6" fill="#1e3a8a" fill-opacity=".2"/>' +
      '<ellipse cx="290" cy="236" rx="72" ry="22" fill="#9ec5ff"/>' +
      '<rect x="218" y="206" width="144" height="30" fill="#9ec5ff"/>' +
      '<ellipse cx="290" cy="206" rx="72" ry="22" fill="#cfe2ff"/>' +
      '<ellipse cx="290" cy="176" rx="72" ry="22" fill="#9ec5ff"/>' +
      '<rect x="218" y="176" width="144" height="30" fill="#9ec5ff"/>' +
      '<ellipse cx="290" cy="176" rx="72" ry="22" fill="#fff"/>' +
      '<text x="290" y="184" text-anchor="middle" font-size="24" font-weight="700" fill="#1b64da" font-family="sans-serif">$</text>'
    ),
    /* AI로 만든 이미지인지 확인: 사진과 돋보기 */
    verify: wrap(
      '<rect x="46" y="44" width="236" height="178" rx="18" fill="' + W + '" fill-opacity=".95"/>' +
      '<circle cx="106" cy="94" r="16" fill="#1b64da" fill-opacity=".35"/>' +
      '<path d="M46 196 L120 128 L172 176 L214 140 L282 204 V204 A18 18 0 0 1 264 222 H64 A18 18 0 0 1 46 204 Z" fill="#1b64da" fill-opacity=".55"/>' +
      '<g stroke="#1b64da" stroke-opacity=".35" stroke-width="2"><path d="M70 60 H258 M70 80 H258 M70 100 H258" stroke-dasharray="2 8"/></g>' +
      '<circle cx="268" cy="188" r="58" fill="#1b64da" fill-opacity=".92" stroke="#fff" stroke-width="12"/>' +
      '<path d="M244 190 L260 206 L294 168" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M310 232 L350 272" stroke="#1e3a8a" stroke-width="16" stroke-linecap="round"/>'
    ),
    /* 회의 녹음 요약: 마이크와 글 */
    rec: wrap(
      '<rect x="64" y="40" width="130" height="220" rx="22" fill="#1b64da" fill-opacity=".08"/>' +
      '<rect x="104" y="70" width="50" height="86" rx="25" fill="#1b64da"/>' +
      '<path d="M84 132 C84 176 124 176 124 176 C124 176 164 176 164 132" fill="none" stroke="#1b64da" stroke-width="8" stroke-linecap="round" transform="translate(5 0)"/>' +
      '<rect x="120" y="184" width="8" height="26" rx="4" fill="#1b64da" transform="translate(5 0)"/>' +
      '<rect x="224" y="60" width="120" height="180" rx="16" fill="' + W + '" fill-opacity=".95"/>' +
      '<rect x="240" y="80" width="64" height="10" rx="5" fill="#1b64da"/>' +
      '<rect x="240" y="104" width="88" height="8" rx="4" fill="#1b64da" fill-opacity=".3"/>' +
      '<rect x="240" y="122" width="76" height="8" rx="4" fill="#1b64da" fill-opacity=".3"/>' +
      '<rect x="240" y="140" width="88" height="8" rx="4" fill="#1b64da" fill-opacity=".3"/>' +
      '<circle cx="246" cy="178" r="7" fill="none" stroke="#1b64da" stroke-width="3"/><path d="M243 178 L245.5 180.5 L250 175" fill="none" stroke="#1b64da" stroke-width="2.5"/>' +
      '<rect x="262" y="174" width="62" height="8" rx="4" fill="#1b64da" fill-opacity=".5"/>' +
      '<circle cx="246" cy="204" r="7" fill="none" stroke="#1b64da" stroke-width="3"/>' +
      '<rect x="262" y="200" width="50" height="8" rx="4" fill="#1b64da" fill-opacity=".5"/>'
    ),
    /* 종이 문서 스캔: 폰과 문서 */
    scan: wrap(
      '<rect x="110" y="26" width="180" height="248" rx="28" fill="#1b64da" fill-opacity=".08"/>' +
      '<rect x="132" y="56" width="136" height="188" rx="10" fill="' + W + '" fill-opacity=".95"/>' +
      '<rect x="148" y="76" width="70" height="10" rx="5" fill="#1b64da"/>' +
      '<rect x="148" y="100" width="104" height="7" rx="3.5" fill="#1b64da" fill-opacity=".3"/>' +
      '<rect x="148" y="116" width="96" height="7" rx="3.5" fill="#1b64da" fill-opacity=".3"/>' +
      '<rect x="148" y="132" width="104" height="7" rx="3.5" fill="#1b64da" fill-opacity=".3"/>' +
      '<rect x="148" y="148" width="80" height="7" rx="3.5" fill="#1b64da" fill-opacity=".3"/>' +
      '<g fill="none" stroke="#1b64da" stroke-width="6" stroke-linecap="round"><path d="M122 92 V66 H148"/><path d="M278 92 V66 H252"/><path d="M122 208 V234 H148"/><path d="M278 208 V234 H252"/></g>' +
      '<rect x="132" y="160" width="136" height="6" rx="3" fill="#1b64da"/>'
    ),
    /* 비교표·계산기 */
    table: wrap(
      '<rect x="40" y="50" width="220" height="190" rx="16" fill="' + W + '" fill-opacity=".95"/>' +
      '<rect x="40" y="50" width="220" height="36" rx="16" fill="#1e3a8a"/><rect x="40" y="70" width="220" height="16" fill="#1e3a8a"/>' +
      '<g fill="#1b64da" fill-opacity=".25"><rect x="58" y="104" width="52" height="10" rx="5"/><rect x="128" y="104" width="46" height="10" rx="5"/><rect x="194" y="104" width="46" height="10" rx="5"/>' +
      '<rect x="58" y="136" width="52" height="10" rx="5"/><rect x="128" y="136" width="46" height="10" rx="5"/><rect x="194" y="136" width="46" height="10" rx="5"/>' +
      '<rect x="58" y="168" width="52" height="10" rx="5"/><rect x="128" y="168" width="46" height="10" rx="5"/><rect x="194" y="168" width="46" height="10" rx="5"/></g>' +
      '<rect x="190" y="130" width="58" height="22" rx="8" fill="#1b64da" fill-opacity=".25"/>' +
      '<rect x="250" y="100" width="116" height="170" rx="18" fill="#1b64da" stroke="#fff" stroke-width="6"/>' +
      '<rect x="266" y="116" width="84" height="32" rx="8" fill="' + W + '" fill-opacity=".9"/>' +
      '<g fill="' + W + '" fill-opacity=".85"><circle cx="282" cy="176" r="9"/><circle cx="308" cy="176" r="9"/><circle cx="334" cy="176" r="9"/><circle cx="282" cy="204" r="9"/><circle cx="308" cy="204" r="9"/><circle cx="334" cy="204" r="9"/><circle cx="282" cy="232" r="9"/><circle cx="308" cy="232" r="9"/><circle cx="334" cy="232" r="9"/></g>'
    ),
    /* 스페이스·페이지: 폴더와 함께 편집 */
    space: wrap(
      '<path d="M44 82 a16 16 0 0 1 16-16 h70 l24 26 h146 a16 16 0 0 1 16 16 v120 a16 16 0 0 1-16 16 H60 a16 16 0 0 1-16-16 Z" fill="' + W + '" fill-opacity=".95"/>' +
      '<rect x="72" y="126" width="92" height="12" rx="6" fill="#1b64da"/>' +
      '<rect x="72" y="152" width="150" height="8" rx="4" fill="#1b64da" fill-opacity=".3"/>' +
      '<rect x="72" y="170" width="130" height="8" rx="4" fill="#1b64da" fill-opacity=".3"/>' +
      '<rect x="72" y="188" width="150" height="8" rx="4" fill="#1b64da" fill-opacity=".3"/>' +
      '<circle cx="290" cy="170" r="22" fill="#1b64da"/><circle cx="326" cy="196" r="22" fill="#1e3a8a"/><circle cx="288" cy="214" r="22" fill="#3d4f9c"/>' +
      '<g fill="' + W + '"><circle cx="290" cy="164" r="7"/><path d="M276 184 a14 12 0 0 1 28 0Z"/><circle cx="326" cy="190" r="7"/><path d="M312 210 a14 12 0 0 1 28 0Z"/></g>'
    ),
    /* 스킬 저장: 반짝이는 카드 */
    skill: wrap(
      '<rect x="80" y="54" width="240" height="192" rx="20" fill="' + W + '" fill-opacity=".95"/>' +
      '<rect x="106" y="84" width="96" height="12" rx="6" fill="#1b64da"/>' +
      '<rect x="106" y="112" width="188" height="8" rx="4" fill="#1b64da" fill-opacity=".3"/>' +
      '<rect x="106" y="130" width="160" height="8" rx="4" fill="#1b64da" fill-opacity=".3"/>' +
      '<rect x="106" y="170" width="86" height="40" rx="20" fill="#1b64da"/>' +
      '<path d="M128 190 L140 178 V202 Z" fill="' + W + '"/><rect x="146" y="186" width="30" height="8" rx="4" fill="' + W + '"/>' +
      '<path d="M300 46 L310 74 L338 84 L310 94 L300 122 L290 94 L262 84 L290 74 Z" fill="#1b64da"/>' +
      '<path d="M342 128 L347 142 L361 147 L347 152 L342 166 L337 152 L323 147 L337 142 Z" fill="#1b64da" fill-opacity=".55"/>'
    ),
    /* CSV 차트 */
    chart: wrap(
      '<rect x="40" y="40" width="320" height="220" rx="20" fill="' + W + '" fill-opacity=".95"/>' +
      '<g stroke="#1b64da" stroke-opacity=".15" stroke-width="2"><path d="M70 90 H334 M70 130 H334 M70 170 H334 M70 210 H334"/></g>' +
      '<path d="M72 206 L116 176 L160 188 L204 140 L248 150 L292 96 L334 70" fill="none" stroke="#1b64da" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<g fill="#fff" stroke="#1b64da" stroke-width="5"><circle cx="116" cy="176" r="8"/><circle cx="204" cy="140" r="8"/><circle cx="292" cy="96" r="8"/></g>' +
      '<rect x="64" y="228" width="52" height="10" rx="5" fill="#1b64da" fill-opacity=".3"/>' +
      '<rect x="288" y="52" width="58" height="22" rx="11" fill="#1e3a8a"/><text x="317" y="68" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="sans-serif">CSV</text>'
    ),
    /* 자동 작업: 시계와 반복 화살표 */
    clock: wrap(
      '<circle cx="200" cy="150" r="104" fill="' + W + '" fill-opacity=".95"/>' +
      '<circle cx="200" cy="150" r="104" fill="none" stroke="#1b64da" stroke-opacity=".25" stroke-width="10"/>' +
      '<path d="M200 90 V150 L240 176" fill="none" stroke="#1b64da" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M306 98 A116 116 0 0 1 316 188" fill="none" stroke="#1b64da" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="M322 166 L318 196 L292 184" fill="none" stroke="#1b64da" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'
    )
  };
})();
