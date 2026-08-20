import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CANVA_VIEW_URL = "https://www.canva.com/d/UYwSEylH8Udg3T-";
const CANVA_DESIGN_ID = "DAHSshUT-n8";

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function rest(path: string) {
  const base = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return fetch(`${base}/rest/v1/${path}`, {
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
    },
  });
}

const baseHeaders = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "x-kpgs-runtime": "depth-population-poc-v2",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders });
  }
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: { ...baseHeaders, allow: "GET, OPTIONS" } });
  }

  const url = new URL(req.url);
  const [sceneRes, layerRes, ruleRes, entityRes] = await Promise.all([
    rest("depth_scenes?select=id,slug,name,description,status,canvas_width,canvas_height,metadata&slug=eq.canva-depth-portal&limit=1"),
    rest("depth_layers?select=key,label,layer_type,z_index,depth_z,parallax_factor,visible,interactive,transform,style,metadata&order=z_index.asc"),
    rest("population_rules?select=name,priority,enabled,trigger_type,condition,action,governance&enabled=eq.true&order=priority.asc"),
    rest("depth_entities?select=key,entity_type,state,payload,position,constraints&order=created_at.asc"),
  ]);

  if (![sceneRes, layerRes, ruleRes, entityRes].every((r) => r.ok)) {
    return new Response(JSON.stringify({ error: "runtime_data_unavailable" }), {
      status: 503,
      headers: { ...baseHeaders, "content-type": "application/json; charset=utf-8" },
    });
  }

  const scenes = await sceneRes.json();
  const layers = await layerRes.json();
  const rules = await ruleRes.json();
  const entities = await entityRes.json();
  const scene = scenes[0] ?? {};
  const payload = {
    schema: "kpgs.depth-population.public.v1",
    source: {
      canva_design_id: CANVA_DESIGN_ID,
      canva_view_url: CANVA_VIEW_URL,
      supabase_project_ref: "efafieaxwnzizkrkgdrk",
      edge_function: "depth-portal",
    },
    scene,
    layers,
    rules,
    entities,
  };

  if (url.searchParams.get("format") === "json" || url.pathname.endsWith("/state")) {
    return new Response(JSON.stringify(payload, null, 2), {
      headers: { ...baseHeaders, "content-type": "application/json; charset=utf-8" },
    });
  }

  const maxOffset = Number(rules?.[0]?.action?.max_offset_px ?? 24);
  const damping = Number(rules?.[0]?.action?.damping ?? 0.12);
  const layerCards = layers.map((l: any) => `<article class="layer-card"><div><span class="dot"></span><strong>${esc(l.label)}</strong></div><small>${esc(l.layer_type)} · z ${esc(l.depth_z)} · parallax ${esc(l.parallax_factor)}</small></article>`).join("");
  const portalLayers = layers.filter((l: any) => l.visible).map((l: any, i: number) => {
    const factor = Number(l.parallax_factor ?? 0);
    const depth = Number(l.depth_z ?? 0);
    const hue = 38 + i * 48;
    const size = Math.max(34, 94 - i * 8);
    if (l.layer_type === "subject") {
      return `<div class="depth-layer subject" data-factor="${factor}" style="z-index:${Number(l.z_index)}"><div class="subject-core"><span>KPGS</span><b>DEPTH</b><em>POC</em></div></div>`;
    }
    if (l.layer_type === "ui") {
      return `<div class="depth-layer ui-layer" data-factor="${factor}" style="z-index:${Number(l.z_index)}"><div class="ui-pill">POCEnforcement · READ ONLY</div></div>`;
    }
    return `<div class="depth-layer ring" data-factor="${factor}" style="z-index:${Number(l.z_index)};--size:${size}%;--h:${hue};--depth:${depth}"></div>`;
  }).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="description" content="Governed depth-population proof of concept authored in Canva and populated from Supabase runtime state." />
<title>${esc(scene.name || "KPGS Depth Portal")}</title>
<style>
:root{color-scheme:dark;--bg:#07091a;--panel:rgba(17,20,48,.72);--line:rgba(255,255,255,.12);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% 25%,#181d52 0,#0b0f2b 38%,#050713 78%);color:#f7f8ff;overflow-x:hidden}body:before{content:"";position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.7),transparent);pointer-events:none}.shell{width:min(1180px,100%);margin:auto;padding:20px}.topbar{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:10px 0 22px}.brand{display:flex;align-items:center;gap:10px}.brand i{width:12px;height:12px;border-radius:50%;background:#63f3bf;box-shadow:0 0 24px #63f3bf}.brand strong{letter-spacing:.08em}.actions{display:flex;gap:8px;flex-wrap:wrap}.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:#fff;text-decoration:none;font-weight:650;font-size:13px}.btn.primary{background:#fff;color:#090b19}.grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(290px,.75fr);gap:18px}.stage,.panel{border:1px solid var(--line);background:var(--panel);backdrop-filter:blur(20px);border-radius:28px;box-shadow:0 28px 80px rgba(0,0,0,.28)}.stage{position:relative;min-height:680px;overflow:hidden;display:grid;place-items:center;perspective:900px}.stage:after{content:"MOVE / TOUCH";position:absolute;left:22px;bottom:18px;font-size:11px;letter-spacing:.18em;opacity:.55}.portal{position:relative;width:min(82vw,650px);aspect-ratio:1;border-radius:50%;transform-style:preserve-3d}.depth-layer{position:absolute;inset:0;will-change:transform;transition:transform 60ms linear}.ring{margin:auto;top:50%;left:50%;right:auto;bottom:auto;width:var(--size);height:var(--size);transform:translate(-50%,-50%);border-radius:44% 56% 49% 51%/57% 46% 54% 43%;background:conic-gradient(from 15deg,hsl(var(--h) 92% 62%),hsl(calc(var(--h) + 50) 92% 57%),hsl(calc(var(--h) + 95) 95% 63%),hsl(calc(var(--h) + 160) 85% 55%),hsl(var(--h) 92% 62%));padding:clamp(12px,2.8vw,30px);filter:drop-shadow(0 24px 24px rgba(0,0,0,.2));opacity:.94}.ring:after{content:"";display:block;width:100%;height:100%;border-radius:50%;background:#070916;box-shadow:inset 0 0 70px rgba(0,0,0,.95)}.subject{display:grid;place-items:center}.subject-core{width:34%;aspect-ratio:.8;border-radius:48% 48% 28% 28%;background:linear-gradient(160deg,#1b234e,#0a0e23 60%);border:1px solid rgba(255,255,255,.18);box-shadow:0 25px 60px rgba(0,0,0,.55),inset 0 0 50px rgba(125,95,255,.18);display:grid;place-items:center;align-content:center;gap:3px;text-align:center;transform:translateY(5%)}.subject-core span{font-size:clamp(10px,1.3vw,14px);letter-spacing:.22em;opacity:.58}.subject-core b{font-size:clamp(25px,4vw,46px);line-height:.9;letter-spacing:-.06em}.subject-core em{font-style:normal;font-size:11px;margin-top:8px;padding:5px 9px;border-radius:999px;background:#63f3bf;color:#062116;font-weight:850}.ui-layer{pointer-events:none}.ui-pill{position:absolute;right:5%;top:14%;font-size:11px;font-weight:800;letter-spacing:.08em;padding:8px 10px;border-radius:999px;background:rgba(8,12,30,.74);border:1px solid rgba(99,243,191,.34);color:#8effd8}.panel{padding:22px;display:flex;flex-direction:column;gap:16px}.eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#63f3bf;font-weight:800}.panel h1{font-size:clamp(29px,4vw,48px);line-height:.96;letter-spacing:-.05em;margin:2px 0 4px}.panel p{color:#aeb4d1;line-height:1.55;margin:0}.metric-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.metric{padding:14px;border:1px solid var(--line);border-radius:17px;background:rgba(255,255,255,.035)}.metric b{display:block;font-size:23px}.metric small{color:#9ea5c6}.layer-list{display:grid;gap:8px}.layer-card{padding:12px 13px;border:1px solid var(--line);border-radius:15px;background:rgba(255,255,255,.03)}.layer-card div{display:flex;align-items:center;gap:8px}.layer-card small{display:block;color:#8f96b7;margin:4px 0 0 18px}.dot{width:8px;height:8px;border-radius:50%;background:#8a72ff;box-shadow:0 0 14px #8a72ff}.foot{font-size:11px;color:#7f86a8;margin-top:auto}.status{display:flex;align-items:center;gap:8px}.status i{width:8px;height:8px;border-radius:50%;background:#63f3bf;box-shadow:0 0 12px #63f3bf}@media(max-width:860px){.grid{grid-template-columns:1fr}.stage{min-height:58vh}.panel{order:-1}.panel h1{font-size:36px}.portal{width:min(92vw,560px)}.actions .secondary{display:none}}@media(prefers-reduced-motion:reduce){.depth-layer{transition:none!important;transform:none!important}}
</style>
</head>
<body>
<div class="shell">
  <header class="topbar">
    <div class="brand"><i></i><strong>KPGS / DEPTH POPULATION</strong></div>
    <div class="actions">
      <a class="btn secondary" href="${CANVA_VIEW_URL}" target="_blank" rel="noreferrer">View Canva source ↗</a>
      <a class="btn primary" href="?format=json">Runtime JSON</a>
    </div>
  </header>
  <main class="grid">
    <section class="stage" id="stage"><div class="portal" id="portal">${portalLayers}</div></section>
    <aside class="panel">
      <div class="eyebrow">Supabase Edge Runtime · Public POC</div>
      <h1>${esc(scene.name || "Canva Depth Portal")}</h1>
      <p>${esc(scene.description || "Interactive depth population proof-of-concept.")}</p>
      <div class="metric-grid">
        <div class="metric"><b>${layers.length}</b><small>governed layers</small></div>
        <div class="metric"><b>${entities.length}</b><small>runtime entities</small></div>
        <div class="metric"><b>${rules.length}</b><small>population rules</small></div>
        <div class="metric"><b>${maxOffset}px</b><small>movement bound</small></div>
      </div>
      <div class="status"><i></i><small>READ ONLY · state fetched from Supabase per request</small></div>
      <div class="layer-list">${layerCards}</div>
      <div class="foot">Canva = visual authoring · Supabase = governed state + deployment · GitHub/Sovereign Hub = source + experiment receipt · Pointer parallax = bounded runtime population (${damping} damping).</div>
    </aside>
  </main>
</div>
<script>
const layers=[...document.querySelectorAll('.depth-layer')];const max=${JSON.stringify(maxOffset)};let tx=0,ty=0,cx=0,cy=0;function input(x,y){const r=document.documentElement.getBoundingClientRect();tx=((x/r.width)-.5)*2;ty=((y/r.height)-.5)*2;}addEventListener('pointermove',e=>input(e.clientX,e.clientY),{passive:true});addEventListener('deviceorientation',e=>{if(e.gamma==null||e.beta==null)return;tx=Math.max(-1,Math.min(1,e.gamma/35));ty=Math.max(-1,Math.min(1,(e.beta-45)/35));},{passive:true});function loop(){cx+=(tx-cx)*${JSON.stringify(damping)};cy+=(ty-cy)*${JSON.stringify(damping)};for(const el of layers){const f=Number(el.dataset.factor||0);el.style.transform='translate3d('+(cx*max*f)+'px,'+(cy*max*f)+'px,0)';}requestAnimationFrame(loop)}loop();
</script>
</body></html>`;

  return new Response(html, {
    headers: {
      ...baseHeaders,
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors https://kopanolabs.com https://www.kopanolabs.com; base-uri 'none'; form-action 'none'",
    },
  });
});
