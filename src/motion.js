// Motion never owns game state or delays an answer. Every effect is disposable.
const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
const active = new Set();
const cleanupTasks = new Set();
const channels = new WeakMap();
let previousSelection = new Set();
let bubble;
const $ = (selector) => document.querySelector(selector);
const cellAt = ({ row, col }) =>
  $(`.letter-cell[data-row="${row}"][data-col="${col}"]`);
export const motionAllowed = () => !preference.matches && !document.hidden;

function animate(element, frames, options = {}, channel = "main") {
  if (!element || !motionAllowed() || !element.animate) return null;
  const existing = channels.get(element) || new Map();
  existing.get(channel)?.cancel();
  const animation = element.animate(frames, {
    duration: 360,
    easing: "cubic-bezier(.2,.75,.25,1)",
    ...options,
  });
  existing.set(channel, animation);
  channels.set(element, existing);
  active.add(animation);
  const clear = () => {
    active.delete(animation);
    if (existing.get(channel) === animation) existing.delete(channel);
  };
  animation.finished.then(clear, clear);
  return animation;
}

function transientClass(element, name, duration = 650) {
  if (!element) return;
  element.classList.add(name);
  const cleanup = () => {
    clearTimeout(timer);
    element.classList.remove(name);
    cleanupTasks.delete(cleanup);
  };
  const timer = setTimeout(cleanup, duration);
  cleanupTasks.add(cleanup);
}

export function clearMotion() {
  for (const animation of active) animation.cancel();
  active.clear();
  for (const cleanup of [...cleanupTasks]) cleanup();
  $("#motion-layer")?.replaceChildren();
  document
    .querySelectorAll(".modal-motion-layer")
    .forEach((layer) => layer.remove());
  bubble = null;
  previousSelection.clear();
}
preference.addEventListener("change", clearMotion);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearMotion();
});
window.addEventListener("beforeprint", clearMotion);

function layer() {
  let overlay = $("#motion-layer");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "motion-layer";
    overlay.setAttribute("aria-hidden", "true");
    document.body.append(overlay);
  }
  return overlay;
}

// Reserve each word's final space, then reveal its ink. Screen readers receive
// the original text once, not a stream of individual animated letters.
export function writeInk(element, { delay = 0, duration = 850 } = {}) {
  if (!element || !motionAllowed() || element.dataset.inkReady) return;
  element.dataset.inkReady = "true";
  const readable = element.innerText.replace(/\s+/g, " ").trim();
  element.setAttribute("aria-label", readable);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  const length = Math.max(
    1,
    nodes.reduce(
      (n, node) => n + node.textContent.replace(/\s/g, "").length,
      0,
    ),
  );
  let index = 0;
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    for (const token of node.textContent.split(/(\s+)/)) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        fragment.append(document.createTextNode(token));
        continue;
      }
      const word = document.createElement("span");
      word.className = "ink-word";
      word.setAttribute("aria-hidden", "true");
      for (const char of token) {
        const letter = document.createElement("span");
        letter.className = "ink-letter";
        letter.textContent = char;
        word.append(letter);
        animate(
          letter,
          [
            { opacity: 0, transform: "translateY(5px)", filter: "blur(2px)" },
            { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
          ],
          {
            duration: 180,
            delay: delay + index++ * Math.min(17, duration / length),
            fill: "backwards",
          },
        );
      }
      fragment.append(word);
    }
    node.replaceWith(fragment);
  }
}

export function enterScene({ board = false } = {}) {
  if (!motionAllowed()) return;
  layer();
  const targets = document.querySelectorAll(
    ".hero, .page-intro, main > .section-heading, .controls-panel, .experiment, .words-panel, .catalog-tools, .stats-grid, .achievements-grid",
  );
  targets.forEach((el, index) =>
    animate(
      el,
      [
        { opacity: 0.15, transform: "translateY(13px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { delay: Math.min(index * 35, 140), duration: 380, fill: "backwards" },
    ),
  );
  writeInk($(".hero h1, .page-intro h1"), { delay: 90, duration: 780 });
  revealCards();
  if (board) dealLetters();
}

export function revealCards() {
  document.querySelectorAll(".theme-card").forEach((el, i) =>
    animate(
      el,
      [
        { opacity: 0, transform: "translateY(12px) rotate(-.5deg)" },
        { opacity: 1, transform: "translateY(0) rotate(0)" },
      ],
      { delay: Math.min(i * 35, 210), duration: 320, fill: "backwards" },
    ),
  );
}

export function dealLetters() {
  document.querySelectorAll(".letter-cell").forEach((cell) => {
    const delay = (+cell.dataset.row + +cell.dataset.col) * 10;
    animate(
      cell.querySelector(".letter-glyph"),
      [
        { opacity: 0, transform: "translateY(-6px) scale(.75)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      { duration: 220, delay, fill: "backwards" },
    );
  });
}

export function traceSelection(cells) {
  const keys = new Set(cells.map(({ row, col }) => `${row}:${col}`));
  const changed =
    keys.size !== previousSelection.size ||
    [...keys].some((k) => !previousSelection.has(k));
  if (motionAllowed() && changed) {
    for (const cell of cells) {
      if (previousSelection.has(`${cell.row}:${cell.col}`)) continue;
      animate(
        cellAt(cell)?.querySelector(".letter-glyph"),
        [
          { transform: "scale(.86)" },
          { transform: "scale(1.2)", offset: 0.45 },
          { transform: "scale(1)" },
        ],
        { duration: 200 },
      );
    }
  }
  previousSelection = keys;
  if (!cells.length || !motionAllowed()) {
    bubble?.remove();
    bubble = null;
    return;
  }
  if (!changed && bubble?.isConnected) return;
  const last = cellAt(cells.at(-1));
  if (!last) return;
  const rect = last.getBoundingClientRect();
  if (!bubble?.isConnected) {
    bubble = document.createElement("div");
    bubble.className = "motion-word-bubble";
    layer().append(bubble);
    animate(
      bubble,
      [
        { opacity: 0, transform: "translateY(5px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 130 },
    );
  }
  bubble.textContent = cells.map((c) => cellAt(c)?.textContent || "").join("");
  const width = bubble.getBoundingClientRect().width;
  bubble.style.left = `${Math.min(window.innerWidth - width - 12, Math.max(12, rect.left + rect.width / 2 - width / 2))}px`;
  bubble.style.top = `${rect.top >= 55 ? rect.top - 42 : rect.bottom + 8}px`;
}

const colors = ["#bd6045", "#d6ad50", "#547e58", "#769b94", "#eee2b8"];
function sparks(
  x,
  y,
  { count = 13, celebration = false, target = layer() } = {},
) {
  if (!motionAllowed()) return;
  // Bound simultaneous effects even when inputs arrive faster than animations.
  const available = Math.max(
    0,
    90 - document.querySelectorAll(".motion-particle").length,
  );
  for (let i = 0; i < Math.min(count, available); i++) {
    const particle = document.createElement("span");
    particle.className = `motion-particle ${i % 5 === 0 ? "shape-star" : i % 4 === 0 ? "shape-ring" : ""}`;
    particle.style.setProperty("--particle-color", colors[i % colors.length]);
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    target.append(particle);
    const angle = Math.PI * 2 * (i / count);
    const radius = celebration
      ? 95 + Math.random() * 150
      : 28 + Math.random() * 45;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;
    const animation = animate(
      particle,
      [
        { opacity: 0, transform: "translate(0,0) rotate(0) scale(.4)" },
        {
          opacity: 1,
          transform: `translate(${dx * 0.45}px,${dy * 0.4 - 18}px) rotate(80deg) scale(1)`,
          offset: 0.18,
        },
        {
          opacity: 0,
          transform: `translate(${dx}px,${dy + (celebration ? 110 : 26)}px) rotate(${200 + i * 23}deg) scale(.4)`,
        },
      ],
      {
        duration: celebration ? 1550 : 720,
        delay: celebration ? (i % 8) * 20 : 0,
        easing: "cubic-bezier(.15,.65,.4,1)",
      },
    );
    animation?.finished.then(
      () => particle.remove(),
      () => particle.remove(),
    );
  }
}

function countScore(element, from, to, prefix = "", suffix = "") {
  if (!element || !motionAllowed() || from === to) return;
  let frame;
  const start = performance.now();
  const finish = () => {
    cancelAnimationFrame(frame);
    element.textContent = `${prefix}${to}${suffix}`;
    cleanupTasks.delete(finish);
  };
  cleanupTasks.add(finish);
  const tick = (now) => {
    if (!element.isConnected || !motionAllowed()) {
      finish();
      return;
    }
    const progress = Math.min(1, (now - start) / 400);
    element.textContent = `${prefix}${Math.round(from + (to - from) * (1 - (1 - progress) ** 3))}${suffix}`;
    if (progress < 1) frame = requestAnimationFrame(tick);
    else finish();
  };
  frame = requestAnimationFrame(tick);
}

export function celebrateWord({
  cells,
  normalized,
  points,
  score,
  found,
  total,
}) {
  const elements = cells.map(cellAt).filter(Boolean);
  elements.forEach((cell, i) => {
    transientClass(cell, "motion-hit", 580 + i * 25);
    animate(
      cell.querySelector(".letter-glyph"),
      [
        { transform: "scale(.9)" },
        { transform: "translateY(-3px) scale(1.25)", offset: 0.4 },
        { transform: "translateY(0) scale(1)" },
      ],
      { duration: 420, delay: i * 25 },
    );
  });
  const row = $(`.word-item[data-word="${normalized}"]`);
  transientClass(row, "motion-found", 700);
  animate(row, [
    { transform: "translateX(-5px)", opacity: 0.6 },
    { transform: "translateX(2px)", opacity: 1, offset: 0.6 },
    { transform: "translateX(0)", opacity: 1 },
  ]);
  animate(row?.querySelector(".word-check"), [
    { transform: "scale(.6) rotate(-20deg)" },
    { transform: "scale(1.25) rotate(8deg)", offset: 0.5 },
    { transform: "scale(1) rotate(0)" },
  ]);
  animate(
    $(".progress-track > span"),
    [
      { width: `${((found - 1) / total) * 100}%` },
      { width: `${(found / total) * 100}%` },
    ],
    { duration: 520 },
  );
  animate($(".word-count"), [
    { transform: "scale(1.15)" },
    { transform: "scale(1)" },
  ]);
  animate($(".score"), [
    { transform: "scale(1.1)" },
    { transform: "scale(1)" },
  ]);
  countScore($(".score b"), score - points, score);
  transientClass($(".discovery-note"), "motion-discovery", 1100);
  writeInk($(".discovery-note p"), { duration: 800 });
  if (!motionAllowed()) return;
  const center =
    elements[Math.floor(elements.length / 2)]?.getBoundingClientRect();
  if (!center) return;
  const x = center.left + center.width / 2,
    y = center.top + center.height / 2;
  sparks(x, y);
  const label = document.createElement("span");
  label.className = "motion-score";
  label.textContent = `+${points} · EUREKA!`;
  label.style.left = `${Math.max(12, Math.min(window.innerWidth - 145, x - 58))}px`;
  label.style.top = `${Math.max(60, y - 15)}px`;
  layer().append(label);
  const flight = animate(
    label,
    [
      { opacity: 0, transform: "translateY(6px) scale(.85)" },
      { opacity: 1, transform: "translateY(-16px) scale(1)", offset: 0.22 },
      { opacity: 1, transform: "translateY(-28px) scale(1)", offset: 0.65 },
      { opacity: 0, transform: "translateY(-48px) scale(.96)" },
    ],
    { duration: 1100 },
  );
  flight?.finished.then(
    () => label.remove(),
    () => label.remove(),
  );
}

export function rejectSelection(cells) {
  const board = $(".experiment");
  transientClass(board, "motion-error", 520);
  cells
    .map(cellAt)
    .filter(Boolean)
    .forEach((cell) => transientClass(cell, "motion-miss", 520));
  animate(
    $(".board-frame"),
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-5px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(-3px)" },
      { transform: "translateX(2px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 360, easing: "ease-out" },
  );
}

export function revealHint(cell) {
  const target = cellAt(cell);
  animate(
    target?.querySelector(".letter-glyph"),
    [
      { transform: "scale(.8) rotate(-8deg)" },
      { transform: "scale(1.35) rotate(5deg)", offset: 0.5 },
      { transform: "scale(1) rotate(0)" },
    ],
    { duration: 480 },
  );
  if (target && motionAllowed()) {
    const rect = target.getBoundingClientRect();
    sparks(rect.left + rect.width / 2, rect.top + rect.height / 2, {
      count: 8,
    });
  }
}

export function openDialog(dialog) {
  animate(
    dialog,
    [
      { opacity: 0, transform: "translateY(15px) scale(.97)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ],
    { duration: 300 },
  );
}

export function celebrateCompletion(dialog, xp) {
  if (!dialog || !motionAllowed()) return;
  writeInk(dialog.querySelector("h2"), { delay: 70, duration: 500 });
  animate(
    dialog.querySelector(".result-art"),
    [
      { transform: "scale(.55) rotate(-10deg)" },
      { transform: "scale(1.1) rotate(4deg)", offset: 0.6 },
      { transform: "scale(1) rotate(0)" },
    ],
    { duration: 650 },
  );
  dialog
    .querySelectorAll(".result-stats > div, .unlocked-notice")
    .forEach((el, i) =>
      animate(
        el,
        [
          { opacity: 0, transform: "translateY(9px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { delay: 150 + i * 75, duration: 350, fill: "backwards" },
      ),
    );
  countScore(
    dialog.querySelector(".result-stats > div:last-child strong"),
    0,
    xp,
    "+",
  );
  const localLayer = document.createElement("div");
  localLayer.className = "modal-motion-layer";
  localLayer.setAttribute("aria-hidden", "true");
  dialog.append(localLayer);
  sparks(dialog.clientWidth / 2, 95, {
    count: 52,
    celebration: true,
    target: localLayer,
  });
}

export function reactFavorite(button, saved) {
  animate(
    button?.querySelector("svg"),
    [
      { transform: "scale(.7)" },
      {
        transform: `scale(${saved ? 1.4 : 1.15}) rotate(-10deg)`,
        offset: 0.45,
      },
      { transform: "scale(1) rotate(0)" },
    ],
    { duration: 400 },
  );
}
