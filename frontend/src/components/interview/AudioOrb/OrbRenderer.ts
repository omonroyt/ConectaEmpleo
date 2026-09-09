import * as THREE from "three";
import { AudioAnalyzer, type AudioLevels } from "./AudioAnalyzer";
import { orbConfig, clamp, type OrbQuality } from "./orbConfig";
import { orbStates, type OrbState } from "./orbStates";
import {
  sphereVertex,
  sphereFragment,
  haloVertex,
  haloFragment,
  ribbonVertex,
  ribbonFragment,
} from "./orbShaders";
export interface OrbRendererOptions {
  state?: OrbState;
  analyser?: AnalyserNode;
  intensity?: number;
  quality?: OrbQuality;
  onLevels?: (levels: Readonly<AudioLevels>) => void;
  onError?: (error: Error) => void;
}
/** Framework-independent renderer. One instance, one RAF, no per-frame geometry allocations. */
export class OrbRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1.6, 1.6, 1.6, -1.6, 0.1, 20);
  private group = new THREE.Group();
  private materials: THREE.ShaderMaterial[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private reader = new AudioAnalyzer();
  private options: OrbRendererOptions;
  private quality: OrbQuality;
  private current = { ...orbStates.idle };
  private stateKeys = Object.keys(
    orbStates.idle,
  ) as (keyof typeof orbStates.idle)[];
  private uniforms = {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMids: { value: 0 },
    uHighs: { value: 0 },
    uGlow: { value: 0.64 },
    uCyan: { value: 0.25 },
    uAmplitude: { value: 0.22 },
    uMotion: { value: 1 },
  };
  private frame = 0;
  private previous = 0;
  private phase = 0;
  private elapsed = 0;
  private reportAt = 0;
  private visible = true;
  private disposed = false;
  private lost = false;
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  constructor(
    private host: HTMLElement,
    options: OrbRendererOptions = {},
  ) {
    this.options = options;
    this.quality = options.quality ?? "medium";
    this.reader.analyser = options.analyser;
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: this.quality !== "low",
      powerPreference: "low-power",
    });
    this.renderer.setClearColor(0, 0);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, orbConfig[this.quality].dpr),
    );
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer.domElement.style.cssText =
      "display:block;width:100%;height:100%;";
    this.camera.position.z = 5;
    this.scene.add(this.group);
    this.build();
    this.renderer.debug.onShaderError = () => {
      this.lost = true;
      this.syncLoop();
      this.options.onError?.(new Error("No se pudo compilar el shader."));
    };
    host.appendChild(this.renderer.domElement);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(host);
    this.intersectionObserver = new IntersectionObserver((entries) => {
      this.visible = entries[0].isIntersecting;
      this.syncLoop();
    });
    this.intersectionObserver.observe(host);
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    document.addEventListener("visibilitychange", this.syncLoop);
    this.motion.addEventListener("change", this.motionChanged);
    this.resize();
    this.syncLoop();
  }
  update(options: OrbRendererOptions) {
    this.options = { ...this.options, ...options };
    this.reader.analyser = this.options.analyser;
  }
  private build() {
    const cfg = orbConfig[this.quality];
    const make = (
      vertexShader: string,
      fragmentShader: string,
      additive = false,
      layer = 0,
    ) => {
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { ...this.uniforms, uLayer: { value: layer } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      this.materials.push(material);
      return material;
    };
    const haloGeometry = new THREE.PlaneGeometry(3.2, 3.2);
    const halo = new THREE.Mesh(haloGeometry, make(haloVertex, haloFragment));
    halo.position.z = -1.2;
    halo.renderOrder = 0;
    this.group.add(halo);
    const sphereGeometry = new THREE.SphereGeometry(
      1,
      cfg.segments,
      cfg.segments / 2,
    );
    const sphereMaterial = make(sphereVertex, sphereFragment);
    sphereMaterial.side = THREE.FrontSide;
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.renderOrder = 5;
    this.group.add(sphere);
    const ribbonGeometry = new THREE.PlaneGeometry(
      2,
      1,
      cfg.ribbonSegments,
      32,
    );
    for (let i = 0; i < cfg.ribbons; i++) {
      const ribbon = new THREE.Mesh(
        ribbonGeometry,
        make(ribbonVertex, ribbonFragment, true, i),
      );
      ribbon.rotation.z = (i - 1) * 0.12;
      ribbon.renderOrder = i + 1;
      this.group.add(ribbon);
    }
    this.geometries.push(haloGeometry, sphereGeometry, ribbonGeometry);
  }
  private resize = () => {
    if (this.disposed) return;
    const width = this.host.clientWidth,
      height = this.host.clientHeight;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, orbConfig[this.quality].dpr),
    );
    this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    const aspect = width / Math.max(1, height);
    this.camera.left = -1.6 * Math.max(1, aspect);
    this.camera.right = -this.camera.left;
    this.camera.top = 1.6 / Math.min(1, aspect || 1);
    this.camera.bottom = -this.camera.top;
    this.camera.updateProjectionMatrix();
  };
  private contextLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
    this.syncLoop();
    this.options.onError?.(new Error("Se perdió el contexto WebGL."));
  };
  private motionChanged = () => {
    this.previous = 0;
  };
  private syncLoop = () => {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.previous = 0;
    if (!this.disposed && !this.lost && this.visible && !document.hidden)
      this.frame = requestAnimationFrame(this.tick);
  };
  private tick = (now: number) => {
    if (this.disposed || this.lost) return;
    this.frame = requestAnimationFrame(this.tick);
    const fps = this.motion.matches ? 30 : orbConfig[this.quality].fps;
    if (this.previous && now - this.previous < 1000 / fps - 1) return;
    const dt = this.previous
      ? Math.min((now - this.previous) / 1000, 0.1)
      : 1 / fps;
    this.previous = now;
    this.elapsed += dt;
    const target = orbStates[this.options.state ?? "idle"];
    const ease = 1 - Math.exp(-dt / 0.19);
    for (let i = 0; i < this.stateKeys.length; i++) {
      const key = this.stateKeys[i];
      this.current[key] += (target[key] - this.current[key]) * ease;
    }
    const intensity = clamp(this.options.intensity ?? 0.8, 0, 2);
    const levels = this.reader.sample(dt, intensity);
    const a = this.current.audio;
    const reduced = this.motion.matches;
    if (!reduced) this.phase += dt * this.current.speed;
    const u = this.uniforms;
    u.uTime.value = this.phase;
    u.uMotion.value = reduced ? 0 : 1;
    u.uBass.value = levels.bass * a;
    u.uMids.value = levels.mids * a;
    u.uHighs.value = levels.highs * a;
    u.uGlow.value =
      this.current.glow +
      levels.volume * a * 0.35 +
      Math.sin(this.elapsed * 0.65) * 0.025;
    u.uCyan.value = this.current.cyan;
    u.uAmplitude.value = reduced
      ? 0.25
      : this.current.amplitude * (0.65 + intensity * 0.45);
    const scale = reduced
      ? 1
      : 1.01 + Math.sin(this.elapsed * 0.7) * 0.01 + levels.volume * a * 0.035;
    this.group.scale.setScalar(scale);
    this.renderer.render(this.scene, this.camera);
    if (now - this.reportAt > 80) {
      this.reportAt = now;
      this.options.onLevels?.(levels);
    }
  };
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    document.removeEventListener("visibilitychange", this.syncLoop);
    this.motion.removeEventListener("change", this.motionChanged);
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.scene.clear();
  }
}
