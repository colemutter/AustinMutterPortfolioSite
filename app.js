const stage = document.getElementById("stage");
const tracker = document.getElementById("tracker");

// Menus
const desktopMenuList = document.getElementById("desktopMenuList");
const mobileMenuList = document.getElementById("mobileMenuList");
const menuOverlay = document.getElementById("menuOverlay");

const openIndexBtn = document.getElementById("openIndexBtn");
const mobileCloseBtn = document.getElementById("mobileCloseBtn");
const mobileIndexBtn = document.getElementById("mobileIndexBtn");

let projects = [];
let items = [];
let cursor = 0;
let activeProjectId = null;

function wrap(n, len) {
    if (len === 0) return 0;
    return ((n % len) + len) % len;
}

function isMobile() {
    return window.matchMedia("(max-width: 899px)").matches;
}

function openMenu() {
    if (!isMobile()) return;
    menuOverlay.classList.add("is-open");
    menuOverlay.setAttribute("aria-hidden", "false");
}

function closeMenu() {
    menuOverlay.classList.remove("is-open");
    menuOverlay.setAttribute("aria-hidden", "true");
}

function clearLayers() {
    stage.innerHTML = "";
}

function createMediaEl(item) {
    if (item.type === "video") {
        const v = document.createElement("video");
        v.className = "media";
        v.src = item.src;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.autoplay = true;
        v.preload = "metadata";
        if (item.poster) v.poster = item.poster;

        // best-effort play
        v.addEventListener("canplay", () => v.play().catch(() => {}), { once: true });
        return v;
    }

    const img = document.createElement("img");
    img.className = "media";
    img.src = item.src;
    img.alt = item.alt || "";
    img.loading = "eager";
    return img;
}

function applyCreativeControls(media, item) {
    const scale = typeof item.scale === "number" ? item.scale : 1;
    const fit = item.fit === "cover" ? "cover" : "contain";

    const x = typeof item.x === "number" ? item.x : 0;
    const y = typeof item.y === "number" ? item.y : 0;

    const rect = stage.getBoundingClientRect();
    const tx = x * rect.width;
    const ty = y * rect.height;

    media.style.setProperty("--scale", String(scale));
    media.style.setProperty("--fit", fit);
    media.style.setProperty("--tx", `${tx}px`);
    media.style.setProperty("--ty", `${ty}px`);
}

function addLayerAt(index) {
    const item = items[index];
    if (!item) return;

    const layer = document.createElement("div");
    layer.className = "layer";

    const media = createMediaEl(item);
    applyCreativeControls(media, item);

    layer.appendChild(media);
    stage.appendChild(layer);
}

function renderTracker() {
    tracker.innerHTML = "";
    items.forEach((_, i) => {
        const dot = document.createElement("div");
        dot.className = "dot" + (i === cursor ? " active" : "");
        tracker.appendChild(dot);
    });
}

function setActiveMenuItemStyles() {
    // mark selected project in both menus
    const all = document.querySelectorAll(".menuItem");
    all.forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.projectId === activeProjectId);
    });
}

function next() {
    if (items.length === 0) return;
    cursor = wrap(cursor + 1, items.length);
    renderTracker();
    addLayerAt(cursor);
}

function prev() {
    if (items.length === 0) return;
    cursor = wrap(cursor - 1, items.length);
    renderTracker();
    addLayerAt(cursor);
}

async function loadProjectById(projectId, { pushHash = true } = {}) {
    const p = projects.find((x) => x.id === projectId) || projects[0];
    if (!p) return;

    activeProjectId = p.id;
    setActiveMenuItemStyles();

    if (pushHash) location.hash = `#${encodeURIComponent(p.id)}`;

    const res = await fetch(p.src, { cache: "no-store" });
    items = await res.json();

    cursor = 0;
    clearLayers();
    renderTracker();
    addLayerAt(cursor);
}

function buildMenu(listEl) {
    listEl.innerHTML = "";
    projects.forEach((p) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "menuItem";
        btn.textContent = p.name;
        btn.dataset.projectId = p.id;
        btn.addEventListener("click", async () => {
            await loadProjectById(p.id);
            if (isMobile()) closeMenu();
        });
        listEl.appendChild(btn);
    });
}

async function init() {
    const res = await fetch("projects.json", { cache: "no-store" });
    projects = await res.json();

    buildMenu(desktopMenuList);
    buildMenu(mobileMenuList);

    // initial project (hash optional)
    const initialId = decodeURIComponent((location.hash || "").replace("#", "")).trim();
    await loadProjectById(initialId || projects[0]?.id, { pushHash: false });

    // Bottom “Index” button only matters on mobile
    openIndexBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openMenu();
    });

    // Mobile close controls
    mobileCloseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeMenu();
    });
    mobileIndexBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeMenu();
    });

    // Tap/click anywhere advances (but not when menu is open on mobile)
    window.addEventListener("pointerdown", (e) => {
        // if mobile menu open, clicking backdrop closes it
        if (isMobile() && menuOverlay.classList.contains("is-open")) {
            // click on the dark backdrop closes
            if (e.target === menuOverlay) closeMenu();
            return;
        }

        // ignore clicks on the Index button
        if (e.target === openIndexBtn) return;

        next();
    });

    // Keyboard
    window.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "ArrowRight" || e.key === "ArrowDown") next();
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
        if (e.key === "Escape") closeMenu();
    });

    setActiveMenuItemStyles();
}

init().catch((err) => {
    console.error(err);
    tracker.textContent = "Failed to load projects/media JSON.";
});