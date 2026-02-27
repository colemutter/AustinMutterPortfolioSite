const stage = document.getElementById("stage");
const tracker = document.getElementById("tracker");

let items = [];
let cursor = 0;

// wrap index
function wrap(n, len) {
    if (len === 0) return 0;
    return ((n % len) + len) % len;
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

        // best effort autoplay
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

function addLayerAt(index) {
    const item = items[index];
    if (!item) return;

    const layer = document.createElement("div");
    layer.className = "layer";

    const media = createMediaEl(item);

    // scale (number)
    const scale = typeof item.scale === "number" ? item.scale : 1;

    // fit ("contain" or "cover")
    const fit = item.fit === "cover" ? "cover" : "contain";

    // x/y offsets are fractions of stage size (0.1 = 10%)
    const x = typeof item.x === "number" ? item.x : 0;
    const y = typeof item.y === "number" ? item.y : 0;

    // convert x/y fractions into pixels based on current stage size
    const rect = stage.getBoundingClientRect();
    const tx = x * rect.width;
    const ty = y * rect.height;

    media.style.setProperty("--scale", String(scale));
    media.style.setProperty("--fit", fit);
    media.style.setProperty("--tx", `${tx}px`);
    media.style.setProperty("--ty", `${ty}px`);

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

function next() {
    if (items.length === 0) return;
    cursor = wrap(cursor + 1, items.length);
    renderTracker();
    addLayerAt(cursor);
}

async function init() {
    const res = await fetch("media.json", { cache: "no-store" });
    items = await res.json();

    cursor = 0;
    renderTracker();

    // Start with first layer
    addLayerAt(cursor);

    // Click anywhere advances
    window.addEventListener("click", () => next());

    // Optional: space/arrow also advances
    window.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "ArrowRight" || e.key === "ArrowDown") next();
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            cursor = wrap(cursor - 1, items.length);
            renderTracker();
            addLayerAt(cursor);
        }
    });
}

init().catch((err) => {
    console.error(err);
    tracker.textContent = "Failed to load media.json";
});