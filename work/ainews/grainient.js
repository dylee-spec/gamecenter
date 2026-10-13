/* React Bits 'Grainient'를 리액트 없이 쓰도록 옮긴 것.
   메인 배경 전용: 마우스·클릭 반응, 시작 애니메이션은 뺐고 아주 느리게 흐르기만 함.
   움직임 줄이기 설정을 켠 사용자에게는 멈춘 한 장면만 보여줌.
   사용: window.AINEWS_GRAINIENT(container, { colors: [...], angle, flow, ... }) */
(function () {
  'use strict';
  var MAX_COLORS = 8;

  var VERTEX = [
    '#version 300 es',
    'out vec2 vUv;',
    'void main() {',
    '  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));',
    '  vUv = p;',
    '  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FIELD = [
    '#version 300 es',
    'precision highp float;',
    'precision highp int;',
    'uniform float uAspect;',
    'uniform float uTime;',
    'uniform vec3 uRamp[8];',
    'uniform int uCount;',
    'uniform int uType;',
    'uniform vec2 uDir;',
    'uniform float uExtent;',
    'uniform float uBands;',
    'uniform float uSoftness;',
    'uniform float uFlow;',
    'uniform float uScale;',
    'uniform float uSilk;',
    'uniform vec2 uSeed;',
    'uniform float uContrast;',
    'uniform float uSaturation;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    'vec2 hash2(vec2 p) {',
    '  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));',
    '  q += dot(q, q.yzx + 33.33);',
    '  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0;',
    '}',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);',
    '  float a = dot(hash2(i), f);',
    '  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));',
    '  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));',
    '  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));',
    '  return 0.5 + 0.5 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    'vec2 drift(vec2 p, float t) {',
    '  vec2 w1 = vec2(noise(p * 0.85 + vec2(t * 0.11, t * 0.07)), noise(p * 0.85 + vec2(4.1, 1.7) - vec2(t * 0.08, t * 0.12)));',
    '  vec2 w2 = vec2(noise(p * 1.55 + w1 * 1.8 + vec2(1.3, 7.1) + t * 0.05), noise(p * 1.55 + w1 * 1.8 + vec2(6.4, 2.2) - t * 0.06));',
    '  return (w1 - 0.5) * 1.1 + (w2 - 0.5) * 0.55;',
    '}',
    'vec2 warp(vec2 p) {',
    '  vec2 q = p / uScale;',
    '  if (uType == 1) {',
    '    float turn = uTime * 0.35;',
    '    q = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * q;',
    '  } else {',
    '    q += vec2(-uDir.y, uDir.x) * uTime * 0.45;',
    '  }',
    '  return p + drift(q + uSeed, uTime) * uFlow * uScale;',
    '}',
    'float coord(vec2 p) {',
    '  vec2 w = warp(p);',
    '  return uType == 1 ? 1.0 - length(w) * 1.1 : dot(w, uDir) / uExtent + 0.5;',
    '}',
    'vec3 labToRgb(vec3 lab) {',
    '  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;',
    '  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;',
    '  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;',
    '  l = l * l * l; m = m * m * m; s = s * s * s;',
    '  return vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);',
    '}',
    'vec3 encode(vec3 c) {',
    '  c = clamp(c, 0.0, 1.0);',
    '  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));',
    '}',
    'void main() {',
    '  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);',
    '  float raw = coord(p);',
    '  float s = raw;',
    '  if (uBands > 1.0) {',
    '    s *= uBands;',
    '    float cycle = floor(s);',
    '    s = fract(s);',
    '    if (mod(cycle, 2.0) > 0.5) s = 1.0 - s;',
    '  }',
    '  s = clamp(s, 0.0, 1.0);',
    '  float scaled = s * float(uCount - 1);',
    '  int index = int(min(floor(scaled), float(uCount - 2)));',
    '  float f = scaled - float(index);',
    '  float edge = max(uSoftness * 0.5, fwidth(scaled) * 0.75);',
    '  float shaped = smoothstep(0.5 - edge, 0.5 + edge, f);',
    '  vec3 from = uRamp[0];',
    '  vec3 to = uRamp[1];',
    '  for (int i = 0; i < 7; i++) {',
    '    if (i == index) { from = uRamp[i]; to = uRamp[i + 1]; }',
    '  }',
    '  vec3 lab = mix(from, to, shaped);',
    '  if (uSilk > 0.0) {',
    '    vec2 grad = vec2(coord(p + vec2(0.004, 0.0)) - raw, coord(p + vec2(0.0, 0.004)) - raw) / 0.004;',
    '    vec2 slope = grad * sin(3.14159265 * clamp(raw, 0.0, 1.0) * uBands) * uSilk * 4.0;',
    '    vec3 normal = normalize(vec3(-slope, 1.0));',
    '    vec3 light = normalize(vec3(-uDir.y, uDir.x, 1.2));',
    '    float diffuse = dot(normal, light) - light.z;',
    '    lab = uRamp[0] + (lab - uRamp[0]) * (1.0 + (diffuse * 0.35 + max(diffuse, 0.0) * diffuse * 0.6) * uSilk);',
    '  }',
    '  lab.x = (lab.x - 0.55) * uContrast + 0.55;',
    '  lab.yz *= uSaturation;',
    '  outColor = vec4(encode(labToRgb(lab)), 1.0);',
    '}'
  ].join('\n');

  var COMPOSITE = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uField;',
    'uniform float uGrain;',
    'uniform float uGrainSize;',
    'uniform float uFrame;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    'float hash(vec2 p) {',
    '  vec3 q = fract(vec3(p.xyx) * 0.1031);',
    '  q += dot(q, q.yzx + 33.33);',
    '  return fract((q.x + q.y) * q.z);',
    '}',
    'float clump(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',
    'void main() {',
    '  vec3 color = texture(uField, vUv).rgb;',
    '  vec2 pixel = gl_FragCoord.xy + uFrame * vec2(17.0, 59.0);',
    '  float fine = hash(pixel) + hash(pixel + 7.13) - 1.0;',
    '  float coarse = (clump(pixel / max(uGrainSize, 1.0)) - 0.5) * 2.0;',
    '  float grain = mix(fine, coarse, clamp(uGrainSize - 1.0, 0.0, 1.0) * 0.8);',
    '  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));',
    '  color += grain * uGrain * (0.45 + 2.2 * luma * (1.0 - luma));',
    '  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function toLinear(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function toLab(rgb) {
    var lr = toLinear(rgb[0]), lg = toLinear(rgb[1]), lb = toLinear(rgb[2]);
    var l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    var m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    var s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function hexToRgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
    gl.deleteShader(sh);
    return null;
  }
  function link(gl, fragSrc) {
    var v = compile(gl, gl.VERTEX_SHADER, VERTEX), f = compile(gl, gl.FRAGMENT_SHADER, fragSrc), p = gl.createProgram();
    if (!v || !f || !p) return null;
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    gl.deleteShader(v); gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { gl.deleteProgram(p); return null; }
    var u = {}, count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i++) {
      var info = gl.getActiveUniform(p, i);
      if (!info) continue;
      var name = info.name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(p, name);
    }
    return { program: p, uniforms: u };
  }

  window.AINEWS_GRAINIENT = function (container, opts) {
    if (!container) return;
    opts = opts || {};
    var colors = (opts.colors || ['#f2f4f6', '#1b64da']).slice(0, MAX_COLORS);
    if (colors.length < 2) colors = [colors[0], colors[0]];
    var s = {
      type: opts.type === 'radial' ? 1 : 0,
      angle: opts.angle == null ? 55 : opts.angle,
      bands: clamp(opts.bands == null ? 1 : opts.bands, 1, 8),
      speed: Math.max(0, opts.speed == null ? 1 : opts.speed),
      flow: clamp(opts.flow == null ? 0.8 : opts.flow, 0, 3),
      scale: clamp(opts.scale == null ? 1 : opts.scale, 0.25, 3),
      softness: clamp(opts.softness == null ? 1 : opts.softness, 0, 1),
      silk: clamp(opts.silk == null ? 0.35 : opts.silk, 0, 1),
      grainAmount: clamp(opts.grainAmount == null ? 0.08 : opts.grainAmount, 0, 0.5),
      grainSize: clamp(opts.grainSize == null ? 1.2 : opts.grainSize, 0.5, 4),
      contrast: clamp(opts.contrast == null ? 1 : opts.contrast, 0.2, 2),
      saturation: clamp(opts.saturation == null ? 1 : opts.saturation, 0, 2),
      variation: Math.max(0, opts.variation || 0)
    };
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%';
    var gl = null;
    try { gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false }); } catch (e) { gl = null; }
    var field = gl && link(gl, FIELD), comp = gl && link(gl, COMPOSITE);
    if (!gl || !field || !comp) { container.classList.add('bg-fallback'); return; }
    container.insertBefore(canvas, container.firstChild);

    var fu = field.uniforms, cu = comp.uniforms;
    var vao = gl.createVertexArray();
    var target = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var buffer = gl.createFramebuffer();
    var fieldSize = { w: 0, h: 0 }, view = { w: 1, h: 1, r: 1 };
    var ramp = new Float32Array(MAX_COLORS * 3);
    colors.forEach(function (c, i) { ramp.set(toLab(hexToRgb(c)), i * 3); });
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var time = 0, raf = 0, last = 0, visible = true;

    function draw() {
      var aspect = view.w / view.h, rad = s.angle * Math.PI / 180;
      gl.bindVertexArray(vao);
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
      gl.viewport(0, 0, fieldSize.w, fieldSize.h);
      gl.useProgram(field.program);
      gl.uniform1f(fu.uAspect, aspect);
      gl.uniform1f(fu.uTime, time);
      gl.uniform3fv(fu.uRamp, ramp);
      gl.uniform1i(fu.uCount, colors.length);
      gl.uniform1i(fu.uType, s.type);
      gl.uniform2f(fu.uDir, Math.sin(rad), Math.cos(rad));
      gl.uniform1f(fu.uExtent, aspect * Math.abs(Math.sin(rad)) + Math.abs(Math.cos(rad)));
      gl.uniform1f(fu.uBands, s.bands);
      gl.uniform1f(fu.uSoftness, s.softness);
      gl.uniform1f(fu.uFlow, s.flow);
      gl.uniform1f(fu.uScale, s.scale);
      gl.uniform1f(fu.uSilk, s.silk);
      gl.uniform2f(fu.uSeed, s.variation * 3.17, s.variation * 1.91);
      gl.uniform1f(fu.uContrast, s.contrast);
      gl.uniform1f(fu.uSaturation, s.saturation);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(comp.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, target);
      gl.uniform1i(cu.uField, 0);
      gl.uniform1f(cu.uGrain, s.grainAmount);
      gl.uniform1f(cu.uGrainSize, s.grainSize * view.r);
      gl.uniform1f(cu.uFrame, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function resize() {
      view.w = Math.max(1, container.clientWidth);
      view.h = Math.max(1, container.clientHeight);
      view.r = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(view.w * view.r));
      canvas.height = Math.max(1, Math.round(view.h * view.r));
      var w = Math.max(1, Math.round(canvas.width / 2)), h = Math.max(1, Math.round(canvas.height / 2));
      if (w !== fieldSize.w || h !== fieldSize.h) {
        fieldSize.w = w; fieldSize.h = h;
        gl.bindTexture(gl.TEXTURE_2D, target);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      draw();
      wake();
    }
    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = last ? clamp((now - last) / 1000, 0.001, 0.05) : 1 / 60;
      last = now;
      time += dt * s.speed * 0.16;
      draw();
      raf = requestAnimationFrame(frame);
    }
    function wake() {
      if (!reduce && s.speed > 0 && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    new ResizeObserver(resize).observe(container);
    new IntersectionObserver(function (es) {
      visible = es.some(function (e) { return e.isIntersecting; });
      if (visible) { last = 0; wake(); }
    }).observe(container);
    document.addEventListener('visibilitychange', function () { last = 0; wake(); });
    resize();
  };
})();
