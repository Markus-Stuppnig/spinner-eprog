import { Hono } from "hono";
import { html } from "hono/html";

const app = new Hono();

app.get("/", (c) =>
  c.html(html`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glücksrad</title>
<style>
  :root { --bg:#12071f; --panel:#1f1033; --text:#fff; --gold:#ffd23f; }
  * { box-sizing: border-box; }
  body {
    margin:0; min-height:100vh; background:radial-gradient(circle at 50% 30%, #2d1450, var(--bg));
    color:var(--text); font-family:system-ui,sans-serif;
    display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:2rem; padding:1.5rem;
  }
  .stage { position:relative; width:min(88vmin, 900px); aspect-ratio:1; }
  canvas { width:100%; height:100%; display:block; }
  .pointer {
    position:absolute; top:-1.5%; left:50%; transform:translateX(-50%); z-index:2;
    width:0; height:0; border-left:3.5vmin solid transparent; border-right:3.5vmin solid transparent;
    border-top:7vmin solid var(--gold); filter:drop-shadow(0 4px 6px #0008);
  }
  #spin {
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:2;
    width:20%; aspect-ratio:1; border-radius:50%; border:.6vmin solid #fff;
    background:radial-gradient(circle at 35% 30%, #ff6b6b, #c0152f); color:#fff;
    font-size:clamp(1rem,3.5vmin,2.4rem); font-weight:800; letter-spacing:.05em; cursor:pointer;
    box-shadow:0 0 25px #ff2d55aa, inset 0 -6px 12px #0006;
  }
  #spin:hover:not(:disabled) { filter:brightness(1.15); }
  #spin:active:not(:disabled) { transform:translate(-50%,-50%) scale(.96); }
  #spin:disabled { cursor:not-allowed; filter:grayscale(.6); }
  aside { background:var(--panel); border-radius:1rem; padding:1.25rem; width:min(100%, 320px); }
  h1 { margin:0 0 1rem; font-size:1.4rem; color:var(--gold); }
  form { display:flex; gap:.5rem; }
  input {
    flex:1; min-width:0; padding:.6rem .8rem; border-radius:.5rem; border:1px solid #5b3d8a;
    background:#120822; color:var(--text); font-size:1rem;
  }
  button.add, li button {
    border:0; border-radius:.5rem; background:var(--gold); color:#222; font-weight:700; cursor:pointer; padding:.6rem .9rem;
  }
  .time { display:flex; flex-direction:column; gap:.3rem; margin-top:1rem; font-size:.9rem; color:#cbb8ee; }
  ul { list-style:none; margin:1rem 0 0; padding:0; max-height:50vh; overflow:auto; }
  li { display:flex; align-items:center; gap:.6rem; padding:.4rem 0; border-bottom:1px solid #ffffff14; }
  li i { width:1rem; height:1rem; border-radius:50%; flex:none; }
  li span { flex:1; overflow-wrap:anywhere; }
  li button { background:#ffffff1a; color:#fff; padding:.2rem .6rem; }
  #result { margin-top:1rem; min-height:2.5rem; font-size:1.3rem; font-weight:700; color:var(--gold); text-align:center; }
</style>
</head>
<body>
  <div class="stage">
    <div class="pointer"></div>
    <canvas id="wheel" width="1200" height="1200"></canvas>
    <button id="spin">SPIN</button>
  </div>
  <aside>
    <h1>Optionen</h1>
    <form id="form">
      <input id="input" placeholder="z.B. Margherita" autocomplete="off" autofocus>
      <button class="add">+</button>
    </form>
    <label class="time">Spin-Dauer (Sekunden)
      <input id="dur" type="number" min="0.5" max="30" step="0.5" value="5.5">
    </label>
    <ul id="list"></ul>
    <div id="result"></div>
  </aside>
<script>
  const COLORS = ["#e63946","#f4a261","#ffd23f","#2a9d8f","#3a86ff","#8338ec","#ff006e","#06d6a0","#fb5607","#118ab2"];
  const KEY = "spinner-items-v2";
  let items = [];
  try { items = JSON.parse(localStorage.getItem(KEY)) ?? []; } catch {}
  if (!Array.isArray(items)) items = [];

  const DUR_KEY = "spinner-duration";
  let seconds = 5.5;
  try { seconds = Number(localStorage.getItem(DUR_KEY)) || 5.5; } catch {}
  const clampDur = (v) => Math.min(30, Math.max(0.5, Math.round(v * 2) / 2 || 5.5));
  seconds = clampDur(seconds);
  document.getElementById("dur").value = seconds;
  document.getElementById("dur").onchange = (e) => {
    seconds = clampDur(Number(e.target.value));
    e.target.value = seconds;
    try { localStorage.setItem(DUR_KEY, seconds); } catch {}
  };

  let angle = 0, spinning = false;
  const canvas = document.getElementById("wheel"), ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const color = (i) => COLORS[i % COLORS.length];

  function draw() {
    const n = items.length, S = canvas.width, r = S / 2 - 12, step = 2 * Math.PI / n;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(angle);
    for (let i = 0; i < n; i++) {
      const a0 = i * step - Math.PI / 2, a1 = a0 + step;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath();
      ctx.fillStyle = (n > 1 && n % COLORS.length === 1 && i === n - 1) ? "#6c757d" : color(i);
      ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.stroke();
      ctx.save();
      ctx.rotate(a0 + step / 2);
      ctx.fillStyle = "#fff"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.shadowColor = "#000a"; ctx.shadowBlur = 6;
      const size = Math.max(22, Math.min(54, r * 0.9 * step / 2));
      ctx.font = "700 " + size + "px system-ui, sans-serif";
      let t = items[i]; const maxW = r * 0.62;
      while (ctx.measureText(t).width > maxW && t.length > 1) t = t.slice(0, -1);
      if (t !== items[i]) t += "…";
      ctx.fillText(t, r - 30, 0);
      ctx.restore();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, r, 0, 7);
    ctx.lineWidth = 14; ctx.strokeStyle = "#ffd23f"; ctx.stroke();
  }

  function renderList() {
    $("list").innerHTML = "";
    items.forEach((t, i) => {
      const li = document.createElement("li");
      li.innerHTML = '<i style="background:' + color(i) + '"></i><span></span><button title="Entfernen">×</button>';
      li.querySelector("span").textContent = t;
      li.querySelector("button").onclick = () => { items.splice(i, 1); update(); };
      $("list").append(li);
    });
    $("spin").disabled = spinning || items.length < 2;
  }

  function update() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
    renderList(); draw();
  }

  $("form").onsubmit = (e) => {
    e.preventDefault();
    const v = $("input").value.trim();
    if (!v || spinning) return;
    items.push(v); $("input").value = ""; $("result").textContent = ""; update();
  };

  $("spin").onclick = () => {
    if (spinning || items.length < 2) return;
    spinning = true; renderList(); $("result").textContent = "";
    const n = items.length, step = 2 * Math.PI / n;
    const target = Math.floor(Math.random() * n);
    const jitter = (Math.random() * 0.8 + 0.1) * step;
    const base = -(target * step + jitter);
    const start = angle, TAU = 2 * Math.PI;
    const end = base +Math.floor((start - base) / TAU) * TAU - TAU * (5 + Math.floor(Math.random() * 3));
    const dur = seconds * 1000, t0 = performance.now();
    const ease = (x) => 1 - Math.pow(1 - x, 4);
    (function frame(now) {
      const p = Math.min(1, (now - t0) / dur);
      angle = start + (end - start) * ease(p);
      draw();
      if (p < 1) return requestAnimationFrame(frame);
      angle = ((angle % TAU) + TAU) % TAU;
      spinning = false; renderList();
      $("result").textContent = "🎉 " + items[target];
    })(t0);
  };

  update();
</script>
</body>
</html>`));

Deno.serve({ port: Number(Deno.env.get("PORT") ?? 8000) }, app.fetch);
