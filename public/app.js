const palettes = [
  ["Світлий дуб + теплий білий", "світлий дуб і теплий білий", "#d4b98a", "#f2eee4"],
  ["Графіт + натуральне дерево", "матовий графіт і дерево", "#3f4745", "#b8895f"],
  ["Оливковий + камінь", "оливкові фасади і світла кам'яна стільниця", "#66745d", "#e8e1d3"],
  ["Кашемір + дуб", "кашемірові фасади і теплий дуб", "#c9beb0", "#c79a66"],
  ["Чорний мат + горіх", "чорні матові фасади і темний горіх", "#202321", "#79502f"],
  ["Білий лак + мармур", "білий лак, світлий мармур і мінімалістичні фасади", "#f7f7f2", "#d7d5cf"],
  ["Пісочний + бронза", "пісочні фасади, бронзові акценти і тепла стільниця", "#c7aa82", "#9a6f3d"],
  ["Темно-синій + дуб", "темно-сині фасади і натуральний дуб", "#243f5a", "#c18d58"],
  ["Теракота + крем", "теракотові нижні фасади, кремові верхні шафи і світла стільниця", "#aa6048", "#efe4d4"],
  ["Бетон + білий", "сірий бетон, білі фасади і чорні тонкі акценти", "#858782", "#f0f0ec"],
  ["Шавлія + дуб", "шавлієві фасади, світлий дуб і спокійна тепла атмосфера", "#9aa58f", "#cfaa79"],
  ["Вишня + графіт", "темна вишня, графітова стільниця і преміальний контраст", "#6f2e2b", "#3e4140"],
];

const variants = {
  modern: ["Modern", "drop-shadow(0 18px 18px rgba(0,0,0,.24))"],
  scandi: ["Scandi", "brightness(1.12) saturate(.74) drop-shadow(0 18px 18px rgba(0,0,0,.2))"],
  premium: ["Premium", "brightness(.7) contrast(1.2) saturate(.78) drop-shadow(0 18px 18px rgba(0,0,0,.26))"],
  minimal: ["Minimal", "brightness(1.04) saturate(.55) contrast(.98) drop-shadow(0 18px 18px rgba(0,0,0,.18))"],
  warm: ["Warm", "sepia(.2) saturate(.95) brightness(1.02) drop-shadow(0 18px 18px rgba(0,0,0,.2))"],
  contrast: ["Contrast", "contrast(1.2) brightness(.82) saturate(.85) drop-shadow(0 18px 18px rgba(0,0,0,.26))"],
};

const labels = {
  facade: { standard: "Ламінат", painted: "Фарбовані", premium: "Шпон" },
  countertop: { laminate: "HPL", quartz: "Кварц", compact: "Compact" },
  hardware: { standard: "Стандарт", blum: "Blum", premium: "Premium" },
};

const state = {
  roomImage: "/assets/room-ar-preview.png",
  sourceLabel: "Фото або камера",
  layout: "Пряма кухня",
  color: "світлий дуб і теплий білий",
  colorName: "Світлий дуб + теплий білий",
  package: { facade: "standard", countertop: "laminate", hardware: "standard", led: true, install: true },
  variant: "modern",
  variantKeys: ["modern", "scandi", "premium"],
  render: null,
  estimate: 0,
  stream: null,
};

const $ = (id) => document.querySelector(id);

function money(value) {
  return new Intl.NumberFormat("uk-UA", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value || 0);
}

function packageText() {
  const extras = [state.package.led ? "LED" : null, state.package.install ? "монтаж" : null].filter(Boolean).join(" + ");
  return `${labels.facade[state.package.facade]}, ${labels.countertop[state.package.countertop]}, ${labels.hardware[state.package.hardware]}${extras ? `, ${extras}` : ""}`;
}

function dimensions() {
  return {
    width: Number($("#width").value) || 360,
    height: Number($("#height").value) || 260,
    depth: Number($("#depth").value) || 65,
    note: $("#note").value.trim(),
  };
}

function project() {
  return {
    sourceLabel: state.sourceLabel,
    roomImage: state.roomImage,
    layout: state.layout,
    color: state.color,
    colorName: state.colorName,
    dimensions: dimensions(),
    tech: {
      water: $("#water").value.trim(),
      power: $("#power").value.trim(),
      gas: $("#gas").value.trim(),
    },
    package: { ...state.package },
    description: $("#description").value.trim(),
    variant: state.variant,
    client: {
      name: $("#clientName").value.trim(),
      phone: $("#clientPhone").value.trim(),
      city: $("#clientCity").value.trim(),
    },
    render: state.render,
  };
}

function show(view) {
  document.querySelectorAll("[data-view]").forEach((screen) => screen.classList.toggle("active", screen.dataset.view === view));
  document.querySelectorAll("[data-step]").forEach((step) => step.classList.toggle("active", step.dataset.step === view));
}

function updateText() {
  const d = dimensions();
  $("#dimsOut").textContent = `${d.width} x ${d.height} x ${d.depth} см`;
  $("#paletteOut").textContent = state.colorName;
  $("#packageOut").textContent = packageText();
  $("#leadDims").textContent = `${d.width} x ${d.height} x ${d.depth} см`;
  $("#leadColor").textContent = state.color;
  $("#leadPackage").textContent = packageText();
  $("#leadEstimate").textContent = state.estimate ? `від ${money(state.estimate)}` : "-";
  const scale = 0.88 + Math.min(0.24, Math.max(-0.12, (d.width - 360) / 1600));
  $("#renderFurniture").style.setProperty("--render-scale", scale.toFixed(2));
}

function renderPalettes() {
  $("#paletteGrid").innerHTML = palettes.map(([name, prompt, main, accent]) => `
    <button class="palette-choice ${prompt === state.color ? "active" : ""}" type="button" data-color="${prompt}" data-name="${name}">
      <span class="swatch" style="--main:${main};--accent:${accent}"></span>
      <strong>${name}</strong>
    </button>
  `).join("");
}

function renderVariants() {
  $("#variantGrid").innerHTML = state.variantKeys.map((key) => `
    <button class="variant-card ${key === state.variant ? "active" : ""}" type="button" data-variant="${key}">
      <img src="/assets/kitchen-ar.png" alt="${variants[key][0]}" style="filter:${variants[key][1]}">
      <strong>${variants[key][0]}</strong>
    </button>
  `).join("");
}

function applyDemoRender(render) {
  const stage = $("#renderStage");
  const furniture = $("#renderFurniture");
  $("#renderRoom").src = render.roomImage || state.roomImage;
  stage.classList.toggle("generated", Boolean(render.image));
  if (render.image) {
    furniture.src = render.image;
    furniture.style.removeProperty("--render-filter");
  } else {
    furniture.src = render.furnitureImage || "/assets/kitchen-ar.png";
    furniture.style.setProperty("--render-filter", render.filter || variants[state.variant][1]);
  }
}

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "API error");
  return data;
}

async function renderAI() {
  updateText();
  $("#renderBtn").textContent = "Генеруємо...";
  $("#renderBtn").disabled = true;
  try {
    const data = await api("/api/render", project());
    state.estimate = data.estimate;
    state.render = data.render;
    $("#estimateOut").textContent = `від ${money(data.estimate)}`;
    $("#summary").textContent = data.error
      ? `${data.summary} AI працює в демо-режимі: ${data.error}`
      : `${data.summary} Режим: ${data.aiMode === "openai" ? "реальний AI" : "демо"}.`;
    applyDemoRender(data.render);
    updateText();
    show("render");
  } catch (error) {
    alert(error.message);
  } finally {
    $("#renderBtn").textContent = "Зробити AI-візуалізацію";
    $("#renderBtn").disabled = false;
  }
}

async function saveLead(event) {
  event.preventDefault();
  try {
    const data = await api("/api/leads", project());
    state.estimate = data.lead.estimate;
    $("#leadOk").hidden = false;
    await loadLeads();
  } catch (error) {
    alert(error.message);
  }
}

async function loadLeads() {
  const data = await api("/api/leads");
  $("#leadsList").innerHTML = data.leads.length ? data.leads.map((lead) => `
    <article class="lead-card">
      <img src="${lead.render?.image || lead.roomImage || "/assets/room-ar-preview.png"}" alt="Заявка">
      <div>
        <small>${new Date(lead.createdAt).toLocaleString("uk-UA")}</small>
        <h3>${lead.layout}</h3>
        <p>${lead.client?.name || "Клієнт"} ${lead.client?.phone || ""}</p>
        <p>${lead.dimensions?.width} x ${lead.dimensions?.height} x ${lead.dimensions?.depth} см · ${lead.color}</p>
        <p>${lead.packageText}</p>
        <p><strong>від ${money(lead.estimate)}</strong></p>
      </div>
    </article>
  `).join("") : `<p class="summary">Поки немає заявок.</p>`;
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Камера доступна тільки через HTTPS або localhost.");
    return;
  }
  state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
  $("#camera").srcObject = state.stream;
  $("#camera").hidden = false;
  $("#roomImage").hidden = true;
  await $("#camera").play();
  state.sourceLabel = "Live камера";
}

function captureFrame() {
  if (!state.stream) return alert("Спершу увімкніть камеру.");
  const video = $("#camera");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 900;
  canvas.height = video.videoHeight || 1200;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  state.roomImage = canvas.toDataURL("image/png");
  $("#roomImage").src = state.roomImage;
  $("#renderRoom").src = state.roomImage;
  $("#camera").hidden = true;
  $("#roomImage").hidden = false;
  state.sourceLabel = "Кадр з камери";
}

function uploadPhoto(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.roomImage = reader.result;
    $("#roomImage").src = state.roomImage;
    $("#renderRoom").src = state.roomImage;
    $("#camera").hidden = true;
    $("#roomImage").hidden = false;
    state.sourceLabel = "Фото кімнати";
  };
  reader.readAsDataURL(file);
}

document.addEventListener("click", (event) => {
  const next = event.target.closest("[data-next]");
  const step = event.target.closest("[data-step]");
  const layout = event.target.closest("[data-layout]");
  const color = event.target.closest("[data-color]");
  const option = event.target.closest("[data-option]");
  const variant = event.target.closest("[data-variant]");

  if (next) show(next.dataset.next);
  if (step) show(step.dataset.step);
  if (layout) {
    state.layout = layout.dataset.layout;
    document.querySelectorAll("[data-layout]").forEach((b) => b.classList.toggle("active", b === layout));
  }
  if (color) {
    state.color = color.dataset.color;
    state.colorName = color.dataset.name;
    renderPalettes();
    updateText();
  }
  if (option) {
    state.package[option.dataset.option] = option.dataset.value;
    document.querySelectorAll(`[data-option="${option.dataset.option}"]`).forEach((b) => b.classList.toggle("active", b === option));
    updateText();
  }
  if (variant) {
    state.variant = variant.dataset.variant;
    renderVariants();
    $("#renderFurniture").style.setProperty("--render-filter", variants[state.variant][1]);
  }
});

$("#startCamera").addEventListener("click", startCamera);
$("#captureFrame").addEventListener("click", captureFrame);
$("#uploadBtn").addEventListener("click", () => $("#upload").click());
$("#upload").addEventListener("change", (event) => uploadPhoto(event.target.files?.[0]));
$("#renderBtn").addEventListener("click", renderAI);
$("#leadForm").addEventListener("submit", saveLead);
$("#crmTab").addEventListener("click", async () => { show("crm"); await loadLeads(); });
$("#reloadLeads").addEventListener("click", loadLeads);
$("#moreVariants").addEventListener("click", () => {
  state.variantKeys = state.variantKeys[0] === "modern" ? ["minimal", "warm", "contrast"] : ["modern", "scandi", "premium"];
  state.variant = state.variantKeys[0];
  renderVariants();
  $("#renderFurniture").style.setProperty("--render-filter", variants[state.variant][1]);
});

["#width", "#height", "#depth", "#note", "#water", "#power", "#gas", "#description", "#led", "#install"].forEach((id) => {
  $(id).addEventListener("input", () => {
    state.package.led = $("#led").checked;
    state.package.install = $("#install").checked;
    updateText();
  });
});

api("/api/health").then((data) => {
  $("#apiStatus").textContent = data.ai ? "реальний AI увімкнено" : "демо AI без ключа";
}).catch(() => {
  $("#apiStatus").textContent = "сервер недоступний";
});

renderPalettes();
renderVariants();
updateText();
