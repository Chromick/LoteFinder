const $ = (selector) => document.querySelector(selector);

const state = {
  streets: [],
  quadras: [],
  deferredInstall: null,
};

const streetInput = $("#streetInput");
const blockInput = $("#blockInput");
const lotInput = $("#lotInput");
const noteInput = $("#noteInput");
const resultStatus = $("#resultStatus");
const suggestions = $("#suggestions");
const savedList = $("#savedList");
const savedBadge = $("#savedBadge");
const installButton = $("#installButton");

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const cleanBlock = (value) => {
  const raw = String(value || "").replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
  if (/^\d{1,3}$/.test(raw)) return raw.padStart(3, "0");
  return raw;
};

const currentKey = () => `${normalize(streetInput.value)}|${cleanBlock(blockInput.value)}`;

const readSaved = () => JSON.parse(localStorage.getItem("lotefinder.points") || "{}");

const writeSaved = (points) => {
  localStorage.setItem("lotefinder.points", JSON.stringify(points));
  renderSaved();
};

const mapsUrl = ({ street, block, lot, lat, lng }) => {
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const parts = [street, block ? `quadra ${block}` : "", lot ? `lote ${lot}` : "", "Itaipuaçu", "Maricá", "RJ"].filter(Boolean);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
};

const streetOnlyMapsUrl = (street) => {
  const query = [street, "Itaipuaçu", "Maricá", "RJ"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

const wazeUrl = ({ street, block, lat, lng }) => {
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }
  const query = [street, block ? `quadra ${block}` : "", "Itaipuaçu", "Maricá", "RJ"].filter(Boolean).join(", ");
  return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
};

const getRouteData = () => {
  const street = streetInput.value.trim();
  const block = cleanBlock(blockInput.value);
  const lot = lotInput.value.trim();
  const saved = readSaved()[`${normalize(street)}|${block}`];
  return { street, block, lot, saved };
};

const openRoute = (target) => {
  const { street, block, lot, saved } = getRouteData();
  if (!street || !block) {
    setStatus("Preencha rua e quadra antes de abrir a rota.");
    return;
  }
  const url = target === "waze"
    ? wazeUrl({ street, block, lat: saved?.lat, lng: saved?.lng })
    : mapsUrl({ street, block, lot, lat: saved?.lat, lng: saved?.lng });
  window.open(url, "_blank", "noopener");
};

const openStreetSearch = () => {
  const street = streetInput.value.trim();
  if (!street) {
    setStatus("Digite o nome atual da rua para consultar no Maps.");
    return;
  }
  window.open(streetOnlyMapsUrl(street), "_blank", "noopener");
};

const setStatus = (message) => {
  resultStatus.textContent = message;
};

const updateHints = () => {
  const street = streetInput.value.trim();
  const block = cleanBlock(blockInput.value);
  const saved = readSaved()[currentKey()];
  const streetKnown = state.streets.some((item) => normalize(item) === normalize(street));
  const blockKnown = state.quadras.some((item) => item.label === block);

  suggestions.innerHTML = "";
  if (street && !streetKnown) {
    state.streets
      .filter((item) => normalize(item).includes(normalize(street)))
      .slice(0, 5)
      .forEach((item) => {
        const button = document.createElement("button");
        button.className = "suggestion";
        button.type = "button";
        button.textContent = `Mapa antigo: ${item}`;
        button.addEventListener("click", () => {
          streetInput.value = item;
          updateHints();
        });
        suggestions.appendChild(button);
      });
  }

  if (saved) {
    setStatus(`Ponto salvo para ${street}, quadra ${block}. O Maps vai abrir direto no GPS confirmado.`);
  } else if (street && block) {
    const blockMessage = blockKnown ? "A quadra aparece no mapa antigo como referência." : "A quadra não apareceu no mapa antigo.";
    setStatus(`${blockMessage} A rua pode ser o nome atual do Maps; sem GPS salvo, o app vai abrir a busca no Maps para aproximar.`);
  } else {
    setStatus("Digite o nome atual da rua no Maps e a quadra para preparar a rota.");
  }
};

const saveCurrentGps = () => {
  const { street, block } = getRouteData();
  if (!street || !block) {
    setStatus("Preencha rua e quadra antes de salvar o GPS.");
    return;
  }
  if (!navigator.geolocation) {
    setStatus("Este telefone não liberou geolocalização para o app.");
    return;
  }
  setStatus("Pegando GPS atual...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const points = readSaved();
      points[`${normalize(street)}|${block}`] = {
        street,
        block,
        lot: lotInput.value.trim(),
        note: noteInput.value.trim(),
        lat: Number(position.coords.latitude.toFixed(7)),
        lng: Number(position.coords.longitude.toFixed(7)),
        accuracy: Math.round(position.coords.accuracy),
        updatedAt: new Date().toISOString(),
      };
      writeSaved(points);
      setStatus(`GPS salvo para ${street}, quadra ${block}. Precisão aproximada: ${Math.round(position.coords.accuracy)} m.`);
    },
    () => setStatus("Não consegui pegar o GPS. Confira a permissão de localização do navegador."),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
};

const copySearch = async () => {
  const { street, block, lot } = getRouteData();
  const text = [street, block ? `quadra ${block}` : "", lot ? `lote ${lot}` : "", noteInput.value.trim(), "Itaipuaçu, Maricá - RJ"]
    .filter(Boolean)
    .join(", ");
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Busca copiada.");
  } catch {
    setStatus(text);
  }
};

const renderSaved = () => {
  const points = Object.entries(readSaved()).sort((a, b) => a[1].street.localeCompare(b[1].street, "pt-BR"));
  savedBadge.textContent = `${points.length} salvos`;
  savedList.innerHTML = "";

  if (!points.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Nenhum GPS salvo ainda.";
    savedList.appendChild(empty);
    return;
  }

  for (const [key, point] of points) {
    const item = document.createElement("div");
    item.className = "saved-item";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${point.street} · Q ${point.block}`;
    const details = document.createElement("small");
    details.textContent = [point.lot ? `Lote ${point.lot}` : "", point.note, `±${point.accuracy || "?"} m`].filter(Boolean).join(" · ");
    info.append(title, details);

    const rowActions = document.createElement("div");
    rowActions.className = "row-actions";

    const go = document.createElement("button");
    go.className = "secondary";
    go.type = "button";
    go.textContent = "Ir";
    go.title = "Abrir ponto salvo";
    go.addEventListener("click", () => window.open(mapsUrl(point), "_blank", "noopener"));

    const del = document.createElement("button");
    del.className = "ghost";
    del.type = "button";
    del.textContent = "×";
    del.title = "Apagar ponto salvo";
    del.addEventListener("click", () => {
      const next = readSaved();
      delete next[key];
      writeSaved(next);
      updateHints();
    });

    rowActions.append(go, del);
    item.append(info, rowActions);
    savedList.appendChild(item);
  }
};

const loadCsvStreets = async () => {
  const response = await fetch("ruas_itaipuacu_extraidas.csv");
  const text = await response.text();
  return text
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.replace(/^"|"$/g, "").trim())
    .filter(Boolean)
    .filter((value, index, array) => array.findIndex((item) => normalize(item) === normalize(value)) === index);
};

const init = async () => {
  try {
    const [streets, quadras] = await Promise.all([
      loadCsvStreets(),
      fetch("quadras_itaipuacu_extraidas.json").then((response) => response.json()),
    ]);
    state.streets = streets;
    state.quadras = quadras;
    const fragment = document.createDocumentFragment();
    streets.forEach((street) => {
      const option = document.createElement("option");
      option.value = street;
      fragment.appendChild(option);
    });
    $("#streetList").appendChild(fragment);
  } catch {
    setStatus("O app abriu, mas não carregou a base extraída do mapa.");
  }

  renderSaved();
  updateHints();
};

streetInput.addEventListener("input", updateHints);
blockInput.addEventListener("input", () => {
  blockInput.value = cleanBlock(blockInput.value);
  updateHints();
});
lotInput.addEventListener("input", updateHints);
$("#mapsButton").addEventListener("click", () => openRoute("maps"));
$("#wazeButton").addEventListener("click", () => openRoute("waze"));
$("#streetMapsButton").addEventListener("click", openStreetSearch);
$("#saveGpsButton").addEventListener("click", saveCurrentGps);
$("#copyQueryButton").addEventListener("click", copySearch);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.deferredInstall = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!state.deferredInstall) return;
  state.deferredInstall.prompt();
  await state.deferredInstall.userChoice;
  state.deferredInstall = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      setStatus("App aberto. O modo offline fica ativo quando publicado em HTTPS.");
    });
  });
}

init();
