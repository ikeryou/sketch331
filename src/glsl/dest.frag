uniform sampler2D tCross;
uniform sampler2D tNormal;
uniform sampler2D tEffect;
uniform vec3 mouse;
uniform float time;
uniform float test;

varying vec2 vUv;

void main(void) {
  float crossTest = texture2D(tCross, vUv).a;

  vec4 destA = texture2D(tNormal, vUv);
  vec4 destB = texture2D(tEffect, vUv);

  if(crossTest > test) {
    destA = destB;

    float dotScale = 1.0;
    vec2 v = gl_FragCoord.xy * dotScale;
    float f = (sin(v.x) * 0.5 + 0.5) + (sin(v.y) * 0.5 + 0.5);
    destA.r *= f;


    // float contrast = 0.2;
    // destA.rgb = (destA.rgb - 0.5) / (1.0 - contrast) + 0.5;
    // destA.rgb = 1.0 - destA.rgb;
  } else {
    // destA *= destB * 1.8;
  }

  gl_FragColor = destA;
}
