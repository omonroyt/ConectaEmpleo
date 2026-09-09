export const sphereVertex = /* glsl */ `
uniform float uTime; uniform float uBass; uniform float uMotion;
varying vec3 vNormal; varying vec3 vPosition;
void main() {
  float noise = sin(position.x*4.0+uTime)*sin(position.y*3.0-uTime*.7)*sin(position.z*4.0+uTime*.4);
  vec3 p = position * (1.0 + noise * .006 * uMotion + uBass*.024*uMotion);
  vNormal = normalize(normalMatrix * normal); vPosition = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
}`;
export const sphereFragment = /* glsl */ `
uniform float uGlow; uniform float uCyan; uniform float uHighs;
varying vec3 vNormal; varying vec3 vPosition;
void main() {
  float facing = abs(dot(normalize(vNormal),vec3(0.,0.,1.)));
  float rim = pow(1.0-facing,3.0);
  vec3 blue = vec3(.10,.24,.95); vec3 violet = vec3(.52,.24,1.);
  vec3 tint = mix(blue,violet,smoothstep(-.8,.8,vPosition.x));
  tint = mix(tint,vec3(.05,.73,1.),uCyan * (1.-smoothstep(-.9,.3,vPosition.x))*.6);
  float edge = pow(1.0-facing,11.0);
  float under = pow(max(0.,-vPosition.y),4.0)*.32;
  float shoulder = pow(max(0.,vPosition.y*.8-vPosition.x*.4),3.)*.19;
  vec3 col = vec3(.018,.028,.105) + tint*(rim*1.45+under+shoulder) * (uGlow+.35) + vec3(.65,.7,1.)*edge*.95;
  gl_FragColor=vec4(col, .25 + rim*.65 + under + uHighs*.04);
}`;
export const haloVertex = /* glsl */ `
varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
export const haloFragment = /* glsl */ `
varying vec2 vUv; uniform float uGlow; uniform float uCyan; uniform float uHighs;
void main(){
  vec2 p=(vUv-.5)*2.; float r=length(p); float edge=.625;
  float halo=exp(-abs(r-edge)*22.)*.38 + exp(-abs(r-edge)*8.)*.14;
  halo *= smoothstep(.48,.64,r) * (1.-smoothstep(.80,1.,r));
  vec3 c=mix(vec3(.08,.26,1.),vec3(.46,.17,1.),smoothstep(-.5,.6,p.x));
  c=mix(c,vec3(.05,.7,1.),uCyan*.3);
  gl_FragColor=vec4(c,halo*(uGlow+uHighs*.5));
}`;
export const ribbonVertex = /* glsl */ `
uniform float uTime; uniform float uAmplitude; uniform float uMids; uniform float uLayer; uniform float uMotion;
varying vec2 vUv; varying float vDepth; varying vec3 vPosition;
void main(){
  vUv=uv;
  float x=position.x; float s=position.y; float envelope=sqrt(max(0.,1.-x*x));
  float t=uTime+uLayer*1.9;
  float amp=uAmplitude+uMids*.30*uMotion;
  float wave=sin(x*4.4+t)*amp + cos(x*7.-t*.7+uLayer)*.075;
  float y=(wave+s*.43+sin(s*5.+x*3.+t)*.075)*envelope;
  float z=(sin(x*3.2+t*.45+uLayer)*.32+s*.5)*envelope;
  vec3 p=vec3(x*.985,y,z);
  p *= min(1.,.985/max(length(p),.001));
  vDepth=z; vPosition=p;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
export const ribbonFragment = /* glsl */ `
uniform float uGlow; uniform float uCyan; uniform float uLayer; uniform float uHighs;
varying vec2 vUv; varying float vDepth; varying vec3 vPosition;
void main(){
  float lines=vUv.y*64.; float w=fwidth(lines);
  float thread=1.-smoothstep(.10,.10+w,abs(fract(lines)-.5));
  float border=pow(abs(vUv.y-.5)*2.,22.);
  float fade=pow(sin(vUv.x*3.14159265),.4);
  vec3 color=mix(vec3(.015,.44,1.),vec3(.48,.23,1.),smoothstep(.15,.88,vUv.x));
  color=mix(color,vec3(.08,.78,1.),uCyan*.28);
  color=mix(color,vec3(.55,.89,1.),border*.75);
  float a=(.105+thread*.32+border*.65)*fade*(.85+uGlow*.40)*(1.+vDepth*.45);
  gl_FragColor=vec4(color*(1.35+uHighs*.3),a);
}`;
