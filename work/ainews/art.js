/* 빨리 따라와! AI 소식! 커버 일러스트. 소식 내용에 맞춰 직접 그린 그림이에요(외부 이미지·브랜드 로고 없음). */
window.AINEWS_ART = (function () {
  var W = '#fff';
  function wrap(inner) {
    return '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }
  return {
    /* 질문에 맞춰 글·표·그래프가 한 화면에 섞여 나오는 화면 */
    ui: wrap(
      '<rect x="40" y="26" width="320" height="248" rx="22" fill="' + W + '" fill-opacity=".14"/>' +
      '<rect x="64" y="52" width="150" height="14" rx="7" fill="' + W + '" fill-opacity=".9"/>' +
      '<rect x="64" y="76" width="230" height="10" rx="5" fill="' + W + '" fill-opacity=".5"/>' +
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
      '<circle cx="200" cy="150" r="118" fill="' + W + '" fill-opacity=".12"/>' +
      '<circle cx="200" cy="150" r="82" fill="' + W + '" fill-opacity=".18"/>' +
      '<path d="M222 40 L130 168 H190 L172 262 L270 124 H208 Z" fill="' + W + '"/>' +
      '<rect x="40" y="108" width="62" height="10" rx="5" fill="' + W + '" fill-opacity=".7"/>' +
      '<rect x="24" y="134" width="84" height="10" rx="5" fill="' + W + '" fill-opacity=".5"/>' +
      '<rect x="48" y="160" width="54" height="10" rx="5" fill="' + W + '" fill-opacity=".7"/>'
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
      '<path d="M310 232 L350 272" stroke="#fff" stroke-width="16" stroke-linecap="round"/>'
    )
  };
})();
