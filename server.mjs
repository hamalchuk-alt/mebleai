import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const leadsFile = path.join(dataDir, "leads.json");
const env = globalThis.process?.env || {};
const port = Number(env.PORT || 8787);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

const paletteFactors = {
  "світлий дуб і теплий білий": 1,
  "матовий графіт і дерево": 1.14,
  "оливкові фасади і світла кам'яна стільниця": 1.08,
  "кашемірові фасади і теплий дуб": 1.1,
  "чорні матові фасади і темний горіх": 1.22,
  "білий лак, світлий мармур і мінімалістичні фасади": 1.18,
  "пісочні фасади, бронзові акценти і тепла стільниця": 1.12,
  "темно-сині фасади і натуральний дуб": 1.16,
  "теракотові нижні фасади, кремові верхні шафи і світла стільниця": 1.12,
  "сірий бетон, білі фасади і чорні тонкі акценти": 1.06,
  "шавлієві фасади, світлий дуб і спокійна тепла атмосфера": 1.1,
  "темна вишня, графітова стільниця і преміальний контраст": 1.2,
};

const packageFactors = {
  facade: { standard: 1, painted: 1.22, premium: 1.34 },
  countertop: { laminate: 1, quartz: 1.38, compact: 1.26 },
  hardware: { standard: 1, blum: 1.18, premium: 1.3 },
};

const packageLabels = {
  facade: { standard: "Ламінат", painted: "Фарбовані", premium: "Шпон" },
  countertop: { laminate: "HPL", quartz: "Кварц", compact: "Compact" },
  hardware: { standard: "Стандарт", blum: "Blum", premium: "Premium" },
};

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function ensureData() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(leadsFile);
  } catch {
    await fs.writeFile(leadsFile, "[]", "utf8");
  }
}

async function readLeads() {
  await ensureData();
  return JSON.parse(await fs.readFile(leadsFile, "utf8"));
}

async function writeLeads(leads) {
  await ensureData();
  await fs.writeFile(leadsFile, JSON.stringify(leads, null, 2), "utf8");
}

function layoutFactor(layout = "") {
  if (layout.includes("остров")) return 1.55;
  if (layout.includes("Кутова")) return 1.32;
  return 1;
}

function estimateProject(project) {
  const width = Math.max(120, Math.min(900, Number(project.dimensions?.width) || 360));
  const height = Math.max(180, Math.min(340, Number(project.dimensions?.height) || 260));
  const depth = Math.max(45, Math.min(120, Number(project.dimensions?.depth) || 65));
  const pkg = project.package || {};
  const linearMeters = width / 100;
  const tallFactor = height > 250 ? 1.16 : 1;
  const depthFactor = depth > 70 ? 1.08 : 1;
  const paletteFactor = paletteFactors[project.color] || 1.1;
  const facadeFactor = packageFactors.facade[pkg.facade || "standard"];
  const countertopFactor = packageFactors.countertop[pkg.countertop || "laminate"];
  const hardwareFactor = packageFactors.hardware[pkg.hardware || "standard"];
  const packFactor = facadeFactor * countertopFactor * hardwareFactor;
  const furniture = linearMeters * 900 * layoutFactor(project.layout) * tallFactor * depthFactor * paletteFactor * packFactor;
  const countertop = linearMeters * 220 * countertopFactor;
  const hardware = 680 * layoutFactor(project.layout) * hardwareFactor;
  const lighting = pkg.led ? 420 : 0;
  const install = pkg.install ? Math.max(650, linearMeters * 190) : 0;
  const island = String(project.layout || "").includes("остров") ? 1450 : 0;
  const base = 930;
  return Math.round((base + furniture + countertop + hardware + lighting + install + island) / 50) * 50;
}

function packageText(pkg = {}) {
  const facade = packageLabels.facade[pkg.facade || "standard"];
  const countertop = packageLabels.countertop[pkg.countertop || "laminate"];
  const hardware = packageLabels.hardware[pkg.hardware || "standard"];
  const extras = [pkg.led ? "LED" : null, pkg.install ? "монтаж" : null].filter(Boolean).join(" + ");
  return `${facade}, ${countertop}, ${hardware}${extras ? `, ${extras}` : ""}`;
}

function buildPrompt(project) {
  const dims = project.dimensions || {};
  const tech = project.tech || {};
  return [
    "Create a realistic interior visualization for a custom kitchen inside the uploaded room photo.",
    `Kitchen layout: ${project.layout}.`,
    `Exact furniture wall dimensions: width ${dims.width} cm, height ${dims.height} cm, depth ${dims.depth} cm.`,
    `Materials and colors: ${project.color}.`,
    `Package: ${packageText(project.package)}.`,
    `Client description: ${project.description}.`,
    `Technical points: water ${tech.water}; power ${tech.power}; gas ${tech.gas}.`,
    "Keep the room architecture, window, floor, perspective and wall proportions. Add only the kitchen furniture. Make it photorealistic and commercially presentable.",
  ].join("\n");
}

async function callOpenAI(project) {
  if (!env.OPENAI_API_KEY) return null;

  const input = [
    {
      role: "user",
      content: [
        { type: "input_text", text: buildPrompt(project) },
      ],
    },
  ];

  if (project.roomImage?.startsWith("data:image/")) {
    input[0].content.push({ type: "input_image", image_url: project.roomImage });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_TEXT_MODEL || "gpt-5",
      input,
      tools: [
        {
          type: "image_generation",
          size: "1024x1536",
          quality: "medium",
        },
      ],
      tool_choice: { type: "image_generation" },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${detail.slice(0, 500)}`);
  }

  const data = await response.json();
  const image = data.output?.find((item) => item.type === "image_generation_call")?.result;
  return image ? `data:image/png;base64,${image}` : null;
}

function demoRender(project) {
  const variant = String(project.variant || "modern");
  const filters = {
    modern: "drop-shadow(0 18px 18px rgba(0,0,0,.24))",
    scandi: "brightness(1.12) saturate(.74) drop-shadow(0 18px 18px rgba(0,0,0,.2))",
    premium: "brightness(.7) contrast(1.2) saturate(.78) drop-shadow(0 18px 18px rgba(0,0,0,.26))",
    minimal: "brightness(1.04) saturate(.55) contrast(.98) drop-shadow(0 18px 18px rgba(0,0,0,.18))",
    warm: "sepia(.2) saturate(.95) brightness(1.02) drop-shadow(0 18px 18px rgba(0,0,0,.2))",
    contrast: "contrast(1.2) brightness(.82) saturate(.85) drop-shadow(0 18px 18px rgba(0,0,0,.26))",
  };
  return {
    mode: "demo",
    roomImage: project.roomImage || "/assets/room-ar-preview.png",
    furnitureImage: "/assets/kitchen-ar.png",
    filter: filters[variant] || filters.modern,
  };
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/health") {
    return json(res, 200, { ok: true, ai: Boolean(env.OPENAI_API_KEY) });
  }

  if (pathname === "/api/render" && req.method === "POST") {
    try {
      const project = await readBody(req);
      const estimate = estimateProject(project);
      let image = null;
      let aiMode = "demo";
      let error = null;

      try {
        image = await callOpenAI(project);
        aiMode = image ? "openai" : "demo";
      } catch (err) {
        error = err.message;
      }

      return json(res, 200, {
        ok: true,
        estimate,
        prompt: buildPrompt(project),
        summary: `${project.layout} під розмір ${project.dimensions?.width} x ${project.dimensions?.height} x ${project.dimensions?.depth} см, ${project.color}, ${packageText(project.package)}.`,
        render: image ? { mode: aiMode, image } : demoRender(project),
        aiMode,
        error,
      });
    } catch (err) {
      return json(res, 500, { ok: false, error: err.message });
    }
  }

  if (pathname === "/api/leads" && req.method === "GET") {
    const leads = await readLeads();
    return json(res, 200, { ok: true, leads: leads.slice().reverse() });
  }

  if (pathname === "/api/leads" && req.method === "POST") {
    try {
      const project = await readBody(req);
      const leads = await readLeads();
      const lead = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status: "new",
        estimate: estimateProject(project),
        packageText: packageText(project.package),
        ...project,
      };
      leads.push(lead);
      await writeLeads(leads);
      return json(res, 201, { ok: true, lead });
    } catch (err) {
      return json(res, 500, { ok: false, error: err.message });
    }
  }

  return json(res, 404, { ok: false, error: "Not found" });
}

async function serveStatic(res, pathname) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(publicDir, cleanPath.slice(1));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    const index = await fs.readFile(path.join(publicDir, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(index);
  }
}

await ensureData();

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname.startsWith("/api/")) return handleApi(req, res, pathname);
  return serveStatic(res, pathname);
}).listen(port, () => {
  console.log(`MebliAI running on http://localhost:${port}`);
});
