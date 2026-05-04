import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { stations } from "./stations.js";

const canvas = document.querySelector("#c");
const placeEl = document.querySelector("#place");
const metaEl = document.querySelector("#meta");
const groupsEl = document.querySelector("#groups");
const openTopBtn = document.querySelector("#openTop");
const searchEl = document.querySelector("#search");
const randomBtn = document.querySelector("#random");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 100);
camera.position.set(0, 0, 3.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 1.8;
controls.maxDistance = 6.0;

scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(5, 2, 5);
scene.add(dir);

const R = 1;
const texLoader = new THREE.TextureLoader();
const earthColor = texLoader.load("https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg");
const earthBump = texLoader.load("https://threejs.org/examples/textures/planets/earth_bump_2048.jpg");
const earthSpec = texLoader.load("https://threejs.org/examples/textures/planets/earth_specular_2048.jpg");
const cloudAlpha = texLoader.load("https://threejs.org/examples/textures/planets/earth_clouds_1024.png");

earthColor.colorSpace = THREE.SRGBColorSpace;

const globe = new THREE.Mesh(
  new THREE.SphereGeometry(R, 64, 64),
  new THREE.MeshPhongMaterial({
    map: earthColor,
    bumpMap: earthBump,
    bumpScale: 0.035,
    specularMap: earthSpec,
    specular: new THREE.Color(0x223344),
    shininess: 20
  })
);
scene.add(globe);

const wireframeOverlay = new THREE.Mesh(
  globe.geometry,
  new THREE.MeshBasicMaterial({ color: 0x93d6ff, wireframe: true, transparent: true, opacity: 0.14 })
);
wireframeOverlay.scale.setScalar(1.001);
globe.add(wireframeOverlay);

const cloudLayer = new THREE.Mesh(
  new THREE.SphereGeometry(R * 1.012, 64, 64),
  new THREE.MeshPhongMaterial({
    alphaMap: cloudAlpha,
    transparent: true,
    opacity: 0.35,
    depthWrite: false
  })
);
scene.add(cloudLayer);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(R * 1.04, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0x3d8eff, transparent: true, opacity: 0.06, side: THREE.BackSide })
);
scene.add(atmosphere);
const stationGroup = new THREE.Group();
scene.add(stationGroup);

stations.forEach((s) => {

  const pos = latLonToVector3(s.lat, s.lon, R * 1.01);

  const geom = new THREE.SphereGeometry(0.02, 12, 12);

  const mat = new THREE.MeshBasicMaterial({
    color: 0xffaa55,
    transparent: true,
    opacity: 0.9
  });

  const dot = new THREE.Mesh(geom, mat);

  dot.position.copy(pos);

  stationGroup.add(dot);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffaa55,
      transparent: true,
      opacity: 0.25
    })
  );

  halo.position.copy(pos);

  stationGroup.add(halo);

});
const raycaster = new THREE.Raycaster();
const forward = new THREE.Vector3();
let currentStation = null;

function latLonToVector3(lat, lon, radius) {

  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));

  return new THREE.Vector3(x, y, z);

}
function resizeIfNeeded() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const pr = renderer.getPixelRatio();
  const need = canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr);
  if (need) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

function vecToLatLon(v) {
  const p = v.clone().normalize();
  const lat = THREE.MathUtils.radToDeg(Math.asin(p.y));
  const lon = THREE.MathUtils.radToDeg(Math.atan2(p.z, p.x));
  return { lat, lon };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = d => (d * Math.PI) / 180;
  const Rk = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Rk * c;
}

function nearestStation(lat, lon) {
  let best = null;
  let bestD = Infinity;
  for (const s of stations) {
    const d = haversineKm(lat, lon, s.lat, s.lon);
    if (d < bestD) { bestD = d; best = s; }
  }
  return { station: best, distanceKm: bestD };
}

function renderStation(station, distanceKm, lat, lon) {
  currentStation = station;

  placeEl.textContent = station?.name ?? "—";
  metaEl.textContent = station
    ? `~${distanceKm.toFixed(0)} km • lat ${lat.toFixed(2)}, lon ${lon.toFixed(2)}`
    : `lat ${lat.toFixed(2)}, lon ${lon.toFixed(2)}`;

  groupsEl.innerHTML = "";
  if (!station) return;

  for (const g of station.groups) {
    const wrap = document.createElement("div");
    wrap.className = "group";

    const h = document.createElement("h3");
    h.textContent = g.title;

    const links = document.createElement("div");
    links.className = "links";

    for (const l of g.links) {
      const a = document.createElement("a");
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.textContent = l.label;
      links.appendChild(a);
    }

    wrap.appendChild(h);
    wrap.appendChild(links);
    groupsEl.appendChild(wrap);
  }
}

openTopBtn.addEventListener("click", () => {
  if (!currentStation) return;
  const flat = currentStation.groups.flatMap(g => g.links);
  for (const l of flat.slice(0, 5)) window.open(l.url, "_blank", "noreferrer");
});

searchEl.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const q = searchEl.value.trim().toLowerCase();
  if (!q) return;
  const hit = stations.find(s =>
    s.name.toLowerCase().includes(q) ||
    s.aliases?.some(a => a.toLowerCase() === q)
  );
  if (!hit) return;

  const latR = THREE.MathUtils.degToRad(hit.lat);
  const lonR = THREE.MathUtils.degToRad(hit.lon);
  const x = Math.cos(latR) * Math.cos(lonR);
  const y = Math.sin(latR);
  const z = Math.cos(latR) * Math.sin(lonR);
  const target = new THREE.Vector3(x, y, z).normalize();

  const desired = new THREE.Vector3(0, 0, 1);
  const qRot = new THREE.Quaternion().setFromUnitVectors(target, desired);
  globe.quaternion.premultiply(qRot);
});

randomBtn.addEventListener("click", () => {
  const s = stations[Math.floor(Math.random() * stations.length)];
  searchEl.value = s.aliases?.[0] ?? s.name;
  searchEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
});

function animate() {
  resizeIfNeeded();
  controls.update();
  cloudLayer.rotation.y += 0.00045;

  camera.getWorldDirection(forward);
  raycaster.set(camera.position, forward);

  const hits = raycaster.intersectObject(globe, false);
  if (hits.length) {
    const p = hits[0].point;
    const { lat, lon } = vecToLatLon(p);
    const { station, distanceKm } = nearestStation(lat, lon);

    if (!currentStation || currentStation.id !== station.id) {
      renderStation(station, distanceKm, lat, lon);
    } else {
      metaEl.textContent = `~${distanceKm.toFixed(0)} km • lat ${lat.toFixed(2)}, lon ${lon.toFixed(2)}`;
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
