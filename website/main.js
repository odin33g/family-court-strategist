import * as THREE from "./vendor/three.module.min.js";

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   Three.js — "chaos to clarity": a drifting network of nodes
   that gently connects, themed gold-on-navy. Tasteful, not noisy.
   ============================================================ */
function initBackground() {
  const canvas = document.getElementById("bg-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 16;

  const COUNT = window.innerWidth < 720 ? 70 : 130;
  const SPREAD = 26;
  const LINK_DIST = 4.6;

  const positions = new Float32Array(COUNT * 3);
  const velocities = [];
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * SPREAD;
    positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD * 0.62;
    positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD * 0.5;
    velocities.push(new THREE.Vector3((Math.random() - 0.5) * 0.012, (Math.random() - 0.5) * 0.012, (Math.random() - 0.5) * 0.012));
  }

  // nodes
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const nodeMat = new THREE.PointsMaterial({ color: 0xe7c66b, size: 0.13, transparent: true, opacity: 0.9, sizeAttenuation: true });
  const nodes = new THREE.Points(nodeGeo, nodeMat);
  scene.add(nodes);

  // links
  const maxLines = COUNT * 6;
  const linePositions = new Float32Array(maxLines * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x7c9bd6, transparent: true, opacity: 0.22 });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  const pos = nodeGeo.attributes.position.array;

  function rebuildLinks() {
    let n = 0;
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < LINK_DIST * LINK_DIST && n < maxLines) {
          linePositions[n * 6] = pos[i * 3];
          linePositions[n * 6 + 1] = pos[i * 3 + 1];
          linePositions[n * 6 + 2] = pos[i * 3 + 2];
          linePositions[n * 6 + 3] = pos[j * 3];
          linePositions[n * 6 + 4] = pos[j * 3 + 1];
          linePositions[n * 6 + 5] = pos[j * 3 + 2];
          n++;
        }
      }
    }
    lineGeo.setDrawRange(0, n * 2);
    lineGeo.attributes.position.needsUpdate = true;
  }

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5);
    mouse.ty = (e.clientY / window.innerHeight - 0.5);
  });

  // scroll fade so text stays readable lower down
  let scrollFade = 1;
  window.addEventListener("scroll", () => {
    const t = Math.min(window.scrollY / window.innerHeight, 1);
    scrollFade = 1 - t * 0.55;
  }, { passive: true });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function step() {
    const half = SPREAD / 2;
    for (let i = 0; i < COUNT; i++) {
      const v = velocities[i];
      pos[i * 3] += v.x; pos[i * 3 + 1] += v.y; pos[i * 3 + 2] += v.z;
      if (pos[i * 3] > half || pos[i * 3] < -half) v.x *= -1;
      if (pos[i * 3 + 1] > half * 0.62 || pos[i * 3 + 1] < -half * 0.62) v.y *= -1;
      if (pos[i * 3 + 2] > half * 0.5 || pos[i * 3 + 2] < -half * 0.5) v.z *= -1;
    }
    nodeGeo.attributes.position.needsUpdate = true;
    rebuildLinks();

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.x = mouse.x * 4;
    camera.position.y = -mouse.y * 2.4;
    camera.lookAt(0, 0, 0);

    nodes.rotation.y += 0.0006;
    lines.rotation.y = nodes.rotation.y;
    nodeMat.opacity = 0.9 * scrollFade;
    lineMat.opacity = 0.22 * scrollFade;

    renderer.render(scene, camera);
  }

  if (reduced) {
    resize();
    step(); // single static frame
    return;
  }
  let running = true;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) loop(); });
  function loop() { if (!running) return; step(); requestAnimationFrame(loop); }
  loop();
}

/* ============================================================
   GSAP — entrance + scroll reveals, nav state, counters
   ============================================================ */
function initMotion() {
  // nav background on scroll
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (reduced || !gsap) return; // CSS already shows everything

  gsap.registerPlugin(ScrollTrigger);

  // hero entrance
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(".hero-title .line > span", { y: "0%", duration: 1.1, stagger: 0.12 })
    .to(".reveal-hero", { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 }, "-=0.7");

  // section reveals
  gsap.utils.toArray(".reveal").forEach((el) => {
    gsap.to(el, {
      y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 86%" },
    });
  });

  // number counters
  gsap.utils.toArray(".num[data-count]").forEach((el) => {
    const end = parseInt(el.dataset.count, 10);
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: "top 85%", once: true,
      onEnter: () => gsap.to(obj, {
        v: end, duration: 1.8, ease: "power2.out",
        onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString(); },
      }),
    });
  });
}

initBackground();
initMotion();
