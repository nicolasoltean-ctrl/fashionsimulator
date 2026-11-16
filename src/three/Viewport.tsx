import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { scoreToRgb } from '../lib/colors';
import type { MeshData } from '../lib/mesh';

export interface GarmentLayer {
  id: string;
  mesh: MeshData;
  color: string;
}

interface Props {
  body: MeshData;
  height: number;
  garments: GarmentLayer[];
  view: 'fabric' | 'fit';
  highlightId?: string | null;
}

function toGeometry(data: MeshData, colors?: Float32Array): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  if (colors) geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(data.indices);
  geo.computeVertexNormals();
  return geo;
}

function fitColors(data: MeshData): Float32Array {
  const out = new Float32Array(data.scores.length * 3);
  for (let i = 0; i < data.scores.length; i++) {
    const [r, g, b] = scoreToRgb(data.scores[i]);
    // Vertex colours are interpreted as linear; the palette is authored in sRGB.
    out[i * 3] = Math.pow(r, 2.2);
    out[i * 3 + 1] = Math.pow(g, 2.2);
    out[i * 3 + 2] = Math.pow(b, 2.2);
  }
  return out;
}

interface Rig {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  figure: THREE.Group;
  bodyMesh: THREE.Mesh;
  garmentGroup: THREE.Group;
  render(): void;
  framed: boolean;
}

export function Viewport({ body, height, garments, view, highlightId }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const rig = useRef<Rig | null>(null);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 10, 3000);
    camera.position.set(110, 120, 430);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b2a6, 1.15));
    const key = new THREE.DirectionalLight(0xfff4e6, 2.1);
    key.position.set(140, 300, 260);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -140;
    key.shadow.camera.right = 140;
    key.shadow.camera.top = 260;
    key.shadow.camera.bottom = -40;
    key.shadow.camera.near = 50;
    key.shadow.camera.far = 800;
    key.shadow.bias = -0.0015;
    key.shadow.normalBias = 2.2;
    key.shadow.radius = 5;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 0.9);
    rim.position.set(-200, 180, -220);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(-160, 80, 200);
    scene.add(fill);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(150, 64), new THREE.ShadowMaterial({ opacity: 0.16 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(62, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.035 }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.05;
    scene.add(disc);

    const figure = new THREE.Group();
    scene.add(figure);
    const bodyMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({ color: 0xcfc8be, roughness: 0.62, metalness: 0, side: THREE.DoubleSide }),
    );
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    figure.add(bodyMesh);
    const garmentGroup = new THREE.Group();
    figure.add(garmentGroup);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 90;
    controls.maxDistance = 900;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.target.set(0, 90, 0);

    let raf = 0;
    let dirty = true;
    const render = () => { dirty = true; };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (controls.update() || dirty) {
        dirty = false;
        renderer.render(scene, camera);
      }
    };
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    tick();
    rig.current = { renderer, scene, camera, controls, figure, bodyMesh, garmentGroup, render, framed: false };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      rig.current = null;
    };
  }, []);

  // Mannequin
  useEffect(() => {
    const r = rig.current;
    if (!r) return;
    r.bodyMesh.geometry.dispose();
    r.bodyMesh.geometry = toGeometry(body);
    r.render();
  }, [body]);

  // Frame the figure when its height changes.
  useEffect(() => {
    const r = rig.current;
    if (!r) return;
    const target = new THREE.Vector3(0, height * 0.52, 0);
    if (!r.framed) {
      const dist = height * 2.45;
      r.camera.position.set(dist * 0.3, height * 0.62, dist * 0.95);
      r.framed = true;
    } else {
      r.camera.position.y += target.y - r.controls.target.y;
    }
    r.controls.target.copy(target);
    r.render();
  }, [height]);

  // Garments
  useEffect(() => {
    const r = rig.current;
    if (!r) return;
    for (const child of [...r.garmentGroup.children]) {
      const m = child as THREE.Mesh;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      r.garmentGroup.remove(m);
    }
    for (const g of garments) {
      const fit = view === 'fit';
      const dim = highlightId && highlightId !== g.id;
      const material = new THREE.MeshStandardMaterial({
        color: fit ? 0xffffff : new THREE.Color(g.color),
        vertexColors: fit,
        roughness: 0.86,
        metalness: 0,
        side: THREE.DoubleSide,
        transparent: !!dim,
        opacity: dim ? 0.28 : 1,
      });
      const mesh = new THREE.Mesh(toGeometry(g.mesh, fit ? fitColors(g.mesh) : undefined), material);
      mesh.castShadow = !dim;
      mesh.receiveShadow = true;
      r.garmentGroup.add(mesh);
    }
    r.render();
  }, [garments, view, highlightId]);

  const setAngle = (az: number) => {
    const r = rig.current;
    if (!r) return;
    const t = r.controls.target;
    const d = r.camera.position.distanceTo(t);
    const elev = 0.09;
    r.camera.position.set(t.x + d * Math.sin(az) * Math.cos(elev), t.y + d * Math.sin(elev), t.z + d * Math.cos(az) * Math.cos(elev));
    r.render();
  };

  return (
    <div className="viewport">
      <div className="viewport-canvas" ref={host} />
      <div className="view-angles" role="group" aria-label="Camera angle">
        <button type="button" onClick={() => setAngle(0)}>Front</button>
        <button type="button" onClick={() => setAngle(Math.PI / 2)}>Side</button>
        <button type="button" onClick={() => setAngle(Math.PI)}>Back</button>
        <button type="button" onClick={() => setAngle(Math.PI / 5)}>¾</button>
      </div>
    </div>
  );
}
