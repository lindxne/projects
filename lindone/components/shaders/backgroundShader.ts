/**
 * Slow animated backdrop shared by the full-screen background and by the glass lenses
 * (which refract exactly the part of the backdrop that lies behind them).
 * `uRect` = the rendered area in viewport-normalised units (x, y from the top, width, height).
 */
export const backgroundVertexShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uFullscreen;
  void main() {
    vUv = uv;
    gl_Position = uFullscreen > 0.5
      ? vec4(position.xy, 0.0, 1.0)
      : projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const backgroundFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;
  uniform vec4 uRect;
  uniform vec2 uLight;
  uniform float uScroll;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  // Simplex noise (Ian McEwan, Ashima Arts — MIT).
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float blob(vec2 p, vec2 center, float radius) {
    float d = length(p - center);
    return smoothstep(radius, 0.0, d);
  }

  void main() {
    vec2 uv = uRect.xy + vec2(vUv.x, 1.0 - vUv.y) * uRect.zw;
    vec2 p = vec2(uv.x * uAspect, uv.y + uScroll * 0.12);
    float t = uTime * 0.045;

    // Domain warp: the whole field flows slowly.
    vec2 warp = vec2(snoise(p * 0.9 + vec2(t, -t * 0.7)), snoise(p * 0.9 + vec2(-t * 0.8, t) + 7.3));
    vec2 q = p + warp * 0.22;

    vec3 color = mix(vec3(0.030, 0.024, 0.062), vec3(0.052, 0.036, 0.110), uv.y);

    vec3 violet = vec3(0.46, 0.25, 1.00);
    vec3 pink = vec3(0.94, 0.24, 0.60);
    vec3 blue = vec3(0.20, 0.44, 1.00);
    vec3 teal = vec3(0.08, 0.70, 0.78);
    vec3 amber = vec3(1.00, 0.58, 0.28);

    float a = uAspect;
    color += violet * 0.62 * blob(q, vec2(a * (0.22 + 0.10 * sin(t * 1.3)), 0.20 + 0.10 * cos(t * 1.1)), 0.62);
    color += pink * 0.50 * blob(q, vec2(a * (0.80 + 0.10 * cos(t * 0.9)), 0.30 + 0.14 * sin(t * 1.4)), 0.52);
    color += blue * 0.56 * blob(q, vec2(a * (0.66 + 0.14 * sin(t * 1.1 + 2.0)), 0.86 + 0.08 * cos(t * 0.8)), 0.60);
    color += teal * 0.40 * blob(q, vec2(a * (0.16 + 0.10 * cos(t * 1.2 + 1.0)), 0.80 + 0.10 * sin(t)), 0.46);

    // A pair of small bright spots that the glass picks up and disperses.
    color += amber * 0.85 * pow(blob(q, vec2(a * (0.58 + 0.24 * sin(t * 2.1)), 0.46 + 0.26 * cos(t * 1.7)), 0.20), 2.0);
    color += vec3(0.75, 0.82, 1.0) * 0.80 * pow(blob(q, vec2(a * (0.34 + 0.22 * cos(t * 1.6 + 4.0)), 0.60 + 0.24 * sin(t * 2.3 + 1.0)), 0.16), 2.0);

    // Soft halo around the light source (cursor / scroll).
    color += vec3(0.55, 0.50, 0.90) * 0.10 * blob(vec2(uv.x * a, uv.y), vec2(uLight.x * a, uLight.y), 0.45);

    color += snoise(q * 2.4 + t) * 0.022;
    color += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.035;

    // Keep the backdrop dark enough for white text on tinted glass (contrast >= 4.5:1).
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color *= min(1.0, 0.46 / max(luma, 0.0001));

    gl_FragColor = vec4(max(color, 0.0), 1.0);
  }
`;
