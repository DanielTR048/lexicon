import {
  createIcons,
  Atom,
  Rocket,
  FlaskConical,
  Brain,
  Landmark,
  BookOpen,
  Zap,
  Shield,
  Sparkles,
  Skull,
  Globe,
  Telescope,
  Dna,
  Microscope,
  Leaf,
  Compass,
  Music,
  Palette,
  Scroll,
  Scale,
  Crown,
  Orbit,
  Lightbulb,
  GraduationCap,
  CalendarDays,
  Trophy,
  LibraryBig,
  Layers,
  Volume2,
  VolumeX,
  Infinity,
  Sun,
  ArrowUpRight,
  ChevronDown,
  Check,
  Shuffle,
  ArrowRight,
  BadgeCheck,
  Play,
  Pause,
  Coffee,
  Printer,
  Maximize2,
  Heart,
  Search,
  Plus,
  NotebookPen,
  Flame,
  LockKeyhole,
  Feather,
  X,
  PartyPopper,
  Award,
} from "lucide";
import { THEMES, CATEGORIES } from "./data.js";
import {
  DIFFICULTIES,
  generatePuzzle,
  getLine,
  matchSelection,
  normalizeWord,
} from "./engine.js";
import {
  readStore,
  writeStore,
  emptyProfile,
  localDay,
  streakOf,
} from "./storage.js";
import "@fontsource-variable/dm-sans";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "./style.css";
import "./motion.css";
import { initInstall, apkURL } from "./install.js";
import { markDirty, syncProfile, syncStatus, syncConflict, setSyncListener, getSyncCode, formatCode, newConnectionCode, connectDevices } from "./sync.js";
import "./profiles.css";
import {
  clearMotion,
  motionAllowed,
  enterScene,
  revealCards,
  traceSelection,
  celebrateWord,
  rejectSelection,
  revealHint,
  openDialog,
  celebrateCompletion,
  reactFavorite,
} from "./motion.js";

const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icon = (name, cls = "") =>
  `<i data-lucide="${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}" class="${cls}" aria-hidden="true"></i>`;
const totalWords = THEMES.reduce((n, theme) => n + theme.words.length, 0);
const icons = {
  Atom,
  Rocket,
  FlaskConical,
  Brain,
  Landmark,
  BookOpen,
  Zap,
  Shield,
  Sparkles,
  Skull,
  Globe,
  Telescope,
  Dna,
  Microscope,
  Leaf,
  Compass,
  Music,
  Palette,
  Scroll,
  Scale,
  Crown,
  Orbit,
  Lightbulb,
  GraduationCap,
  CalendarDays,
  Trophy,
  LibraryBig,
  Layers,
  Volume2,
  VolumeX,
  Infinity,
  Sun,
  ArrowUpRight,
  ChevronDown,
  Check,
  Shuffle,
  ArrowRight,
  BadgeCheck,
  Play,
  Pause,
  Coffee,
  Printer,
  Maximize2,
  Heart,
  Search,
  Plus,
  NotebookPen,
  Flame,
  LockKeyhole,
  Feather,
  X,
  PartyPopper,
  Award,
};
const players = [{ id: "daniel", name: "Daniel", icon: "Atom", color: "green" }, { id: "larissa", name: "Larissa", icon: "Heart", color: "coral" }];
let activeProfile;
try { activeProfile = players.find(p => p.id === sessionStorage.getItem("lexicon-active-profile")); } catch { /* Start at the picker. */ }
let profile = emptyProfile();
let settings = { sound: false };
let favorites = [];
let pickingProfile = false;
const syncTimers = new Map();
let session;
let puzzle;
let view = "lab";
let query = "";
let category = "all";
let favoritesOnly = false;
let paused = false;
let focusMode = false;
let selected = [];
let anchor = null;
let pointerStart = null;
let dragging = false;
let activeCell = { row: 0, col: 0 };
let hintCell = null;
let lastDiscovery = null;
let modalCallback;
let audioContext;
let storageWarned = false;
const achievements = [
  {
    id: "first",
    title: "Eureka!",
    description: "Conclua seu primeiro experimento.",
    icon: "Lightbulb",
    check: () => profile.wins >= 1,
  },
  {
    id: "words50",
    title: "Colecionador de ideias",
    description: "Encontre 50 palavras.",
    icon: "BookOpen",
    check: () => profile.words >= 50,
  },
  {
    id: "themes5",
    title: "Mente renascentista",
    description: "Conclua 5 temas diferentes.",
    icon: "Compass",
    check: () => profile.themes.length >= 5,
  },
  {
    id: "nohint",
    title: "Pura genialidade",
    description: "Conclua sem usar nenhuma dica.",
    icon: "Brain",
    check: () => session.completed && session.hintsUsed === 0,
  },
  {
    id: "hard",
    title: "Doutor em descobertas",
    description: "Conclua um experimento no nível Gênio.",
    icon: "GraduationCap",
    check: () => session.completed && session.difficulty === "hard",
  },
  {
    id: "daily3",
    title: "Ritual científico",
    description: "Conclua 3 desafios diários.",
    icon: "CalendarDays",
    check: () => profile.dailyDays.length >= 3,
  },
  {
    id: "wins10",
    title: "Cientista de respeito",
    description: "Conclua 10 experimentos.",
    icon: "Trophy",
    check: () => profile.wins >= 10,
  },
  {
    id: "words200",
    title: "Enciclopédia viva",
    description: "Encontre 200 palavras.",
    icon: "LibraryBig",
    check: () => profile.words >= 200,
  },
];
const currentTheme = () =>
  session.customTheme ||
  THEMES.find((t) => t.id === session.themeId) ||
  THEMES[0];
const time = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const level = () =>
  profile.xp >= 5000
    ? "Gênio do laboratório"
    : profile.xp >= 2000
      ? "Professor de ideias"
      : profile.xp >= 500
        ? "Pesquisador curioso"
        : "Aprendiz curioso";

function persist() {
  if (!activeProfile) return;
  const ok = writeStore({ profile, settings, favorites, session }, activeProfile.id);
  if (ok) {
    markDirty(activeProfile.id);
    const id = activeProfile.id;
    clearTimeout(syncTimers.get(id));
    syncTimers.set(id, setTimeout(() => syncProfile(id), 1500));
  }
  if (!ok && !storageWarned) {
    storageWarned = true;
    toast(
      "O navegador não permitiu salvar. Seu jogo continua disponível nesta aba.",
    );
  }
  return ok;
}
function newSession(
  theme,
  difficulty = "medium",
  mode = "free",
  seed,
  customTheme,
) {
  const day = localDay();
  const next = {
    themeId: theme.id,
    difficulty,
    mode,
    seed: seed || `${theme.id}-${Date.now()}-${Math.random()}`,
    customTheme,
    found: [],
    foundPaths: {},
    seconds: 0,
    hintsUsed: 0,
    hintedWords: [],
    hintCell: null,
    score: 0,
    started: false,
    completed: false,
    day,
  };
  const generated = generatePuzzle({
    words: theme.words,
    difficulty,
    seed: next.seed,
  });
  puzzle = generated;
  session = next;
  paused = false;
  selected = [];
  anchor = null;
  hintCell = null;
  lastDiscovery = null;
  activeCell = { row: 0, col: 0 };
  persist();
}
function restoreGame(saved) {
profile = saved?.profile || emptyProfile();
settings = saved?.settings || { sound: false };
favorites = saved?.favorites || [];
hintCell = null;
try {
  if (
    (saved?.session && THEMES.some((t) => t.id === saved.session.themeId)) ||
    saved?.session?.customTheme
  ) {
    session = saved.session;
    if (
      !DIFFICULTIES[session.difficulty] ||
      typeof session.seed !== "string" ||
      !Array.isArray(session.found)
    )
      throw new Error("save");
    puzzle = generatePuzzle({
      words: currentTheme().words,
      difficulty: session.difficulty,
      seed: session.seed,
    });
    session.found = [...new Set(session.found)].filter((word) =>
      puzzle.placements.some((p) => p.normalized === word),
    );
    session.foundPaths ||= {};
    for (const word of session.found) {
      const path = session.foundPaths[word];
      const match =
        path && matchSelection(path, puzzle.placements, [], puzzle.grid);
      if (match?.normalized === word)
        puzzle.placements.find((p) => p.normalized === word).cells =
          match.cells;
    }
    for (const key of ["seconds", "hintsUsed", "score"])
      if (!Number.isFinite(session[key]) || session[key] < 0) session[key] = 0;
    session.hintsUsed = Math.min(3, Math.floor(session.hintsUsed));
    session.hintedWords = Array.isArray(session.hintedWords)
      ? session.hintedWords.filter((word) =>
          puzzle.placements.some((p) => p.normalized === word),
        )
      : [];
    if (
      session.hintCell &&
      Number.isInteger(session.hintCell.row) &&
      Number.isInteger(session.hintCell.col) &&
      session.hintCell.row >= 0 &&
      session.hintCell.col >= 0 &&
      session.hintCell.row < puzzle.size &&
      session.hintCell.col < puzzle.size
    )
      hintCell = session.hintCell;
    session.completed = session.found.length === puzzle.placements.length;
  } else newSession(THEMES[0]);
} catch {
  newSession(THEMES[0]);
}
}

function pickerView() {
  const apk = apkURL();
  return `<main class="profile-picker"><a class="picker-brand" href="./" aria-label="Lexicon">${icon("Atom")}lexicon<span>.</span></a><span class="eyebrow">DUAS MENTES. INFINITAS DESCOBERTAS.</span><h1>Quem vai explorar hoje?</h1><p class="picker-intro">Cada pessoa tem seu próprio laboratório.<br>Escolha um perfil e continue de onde parou.</p><div class="player-list" aria-label="Escolha seu perfil">${players.map(player => {
    const saved = readStore(player.id);
    return `<button class="player-card ${player.color}" data-action="choose-profile" data-profile="${player.id}" aria-label="Entrar como ${player.name}" ${pickingProfile ? "disabled" : ""}><span class="player-avatar">${icon(player.icon)}<span class="avatar-star">✳</span></span><strong>${player.name}</strong><span class="player-progress">${saved?.profile?.xp?.toLocaleString("pt-BR") || "0"} XP · ${saved?.profile?.wins || 0} experimentos</span><span class="player-continue">${saved?.session?.started && !saved.session.completed ? "Retomar experimento" : "Entrar no laboratório"} ${icon("ArrowRight")}</span></button>`;
  }).join("")}</div><button class="button secondary picker-sync" data-action="sync-setup">${icon("Orbit")}${getSyncCode() ? "Código dos aparelhos" : "Conectar site e app Android"}</button>${apk ? `<a class="button secondary picker-download" href="${escapeHTML(apk)}" download="lexicon-android.apk">Baixar app Android ${icon("ArrowUpRight")}</a>` : ""}<p class="picker-note">${getSyncCode() ? "Use o mesmo código no site e no app para sincronizar." : "Seu progresso fica separado e salvo neste aparelho."}</p><p class="profile-loading" role="status">${pickingProfile ? "Abrindo seu laboratório…" : ""}</p></main><div id="toast" class="toast" role="status" aria-live="polite"></div><dialog id="modal" class="modal"></dialog>`;
}

async function chooseProfile(id) {
  if (pickingProfile) return;
  const player = players.find(p => p.id === id);
  if (!player) return;
  pickingProfile = true;
  render();
  const result = await syncProfile(id);
  activeProfile = player;
  pickingProfile = false;
  try { sessionStorage.setItem("lexicon-active-profile", id); } catch { /* Profile works for this page. */ }
  view = "lab"; query = ""; category = "all"; favoritesOnly = false; paused = false; focusMode = false;
  selected = []; anchor = null; pointerStart = null; dragging = false; lastDiscovery = null;
  restoreGame(readStore(id));
  render({ entrance: true, board: true });
  window.scrollTo(0, 0);
  if (result.kind === "conflict") showSyncConflict(id);
}

function switchProfile() {
  if (persist() === false) return;
  closeModal();
  activeProfile = null;
  selected = []; anchor = null; pointerStart = null;
  try { sessionStorage.removeItem("lexicon-active-profile"); } catch { /* Picker stays open. */ }
  render();
  window.scrollTo(0, 0);
  document.querySelector('[data-action="choose-profile"]')?.focus();
}

function showSyncSetup() {
  const code = getSyncCode();
  showModal(`<div class="modal-symbol">${icon("Orbit")}</div><span class="eyebrow">O MESMO LABORATÓRIO, EM TODO LUGAR</span><h2>Conectar seus aparelhos</h2><p>${code ? "Copie este código e conecte o outro navegador ou o app Android. Quem tem o código pode acessar os dois perfis." : "Crie um código no primeiro aparelho. No outro, cole o mesmo código para continuar Daniel ou Larissa."}</p>${code ? `<label class="field-label" for="device-code">Código dos aparelhos</label><input id="device-code" class="sync-code" readonly value="${formatCode(code)}"><div class="modal-actions"><button class="button primary" data-action="copy-sync-code">Copiar código ${icon("Check")}</button><button class="button secondary" data-action="sync-now">Sincronizar agora</button></div>` : `<button class="button primary sync-create" data-action="create-sync-code">Criar código de conexão ${icon("Plus")}</button><form id="sync-connect-form"><label class="field-label" for="device-code">Já tem o código do outro aparelho?</label><input id="device-code" class="sync-code" required autocomplete="off" spellcheck="false" placeholder="LEX-…"><button class="button secondary" type="submit">Conectar aparelhos ${icon("ArrowRight")}</button></form>`}<p id="sync-message" class="form-note" role="status"></p>`);
}

function showSyncConflict(id) {
  const conflict = syncConflict(id);
  if (!conflict) return;
  const summary = save => `${save?.profile?.xp || 0} XP · ${save?.profile?.words || 0} palavras · ${save?.session?.found?.length || 0} encontradas nesta partida`;
  showModal(`<div class="modal-symbol">${icon("LibraryBig")}</div><h2>Qual progresso continuar?</h2><p>Este perfil foi jogado em dois aparelhos. Escolha a versão que quer continuar. A outra fica guardada como cópia neste aparelho.</p><p class="sync-summary"><b>Neste aparelho:</b> ${summary(conflict.local)}<br><b>Online:</b> ${summary(conflict.remote)}</p><div class="modal-actions"><button class="button primary" data-action="sync-resolve" data-profile="${id}" data-choice="cloud">Continuar progresso online</button><button class="button secondary" data-action="sync-resolve" data-profile="${id}" data-choice="local">Usar este aparelho</button></div>`);
}

setSyncListener((id, message) => {
  if (activeProfile?.id === id) {
    const label = document.querySelector(".profile-sync-status");
    if (label) label.textContent = message;
  }
});

async function synchronizeCurrent() {
  const ids = activeProfile ? [activeProfile.id] : players.map(p => p.id);
  for (const id of ids) {
    const result = await syncProfile(id);
    if (result.kind === "loaded" && activeProfile?.id === id) { restoreGame(result.save); render(); }
    if (result.kind === "conflict") { showSyncConflict(id); return; }
  }
  if (!activeProfile) render();
  else toast(syncStatus(activeProfile.id));
}

function header() {
  return `<div class="institution-bar"><span>INSTITUTO DE MENTES INQUIETAS</span><span>CIÊNCIA, CURIOSIDADE & UM POUCO DE LOUCURA <span class="tiny-star">✳</span> EST. 1962</span></div>
  <header class="header"><button class="brand" data-action="view" data-view="lab" aria-label="Lexicon, ir ao laboratório"><span class="brand-mark">${icon("Atom")}</span><span><strong>lexicon<span class="brand-period">.</span></strong><small>LABORATÓRIO DE PALAVRAS</small></span></button>
    <nav class="main-nav" aria-label="Navegação principal">${[
      ["lab", "FlaskConical", "Laboratório"],
      ["themes", "Layers", "Arquivo de temas"],
      ["discoveries", "BookOpen", "Minhas descobertas"],
    ]
      .map(
        ([id, i, label]) =>
          `<button class="nav-link ${view === id ? "active" : ""}" data-action="view" data-view="${id}" ${view === id ? 'aria-current="page"' : ""}>${icon(i)}<span>${label}</span></button>`,
      )
      .join("")}</nav>
    <div class="header-actions"><button class="icon-button sound-button ${settings.sound ? "is-on" : ""}" data-action="sound" aria-label="${settings.sound ? "Desativar" : "Ativar"} sons" title="${settings.sound ? "Desativar" : "Ativar"} sons">${icon(settings.sound ? "Volume2" : "VolumeX")}</button><button class="profile-button" data-action="view" data-view="discoveries">${icon("Sparkles")}<span><small>${level()}</small><strong>${profile.xp.toLocaleString("pt-BR")} XP</strong></span></button></div>
  </header><div class="profile-toolbar"><span class="active-player ${activeProfile.color}">${icon(activeProfile.icon)}<strong>${activeProfile.name}</strong></span><button class="sync-status-button" data-action="sync-setup"><span class="profile-sync-status">${syncStatus(activeProfile.id)}</span>${icon("Orbit")}</button><button class="text-button" data-action="switch-profile">Trocar perfil ${icon("ChevronDown")}</button></div>`;
}
function hero() {
  return `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="status-dot"></span> O LABORATÓRIO ESTÁ ABERTO</p><h1>Grandes ideias começam<br>com uma <span>boa descoberta.</span></h1><p>Encontre palavras. Conecte universos. Alimente sua curiosidade.</p><div class="hero-tags"><span>${icon("Layers")}${THEMES.length} temas para explorar</span><span>${icon("Infinity")}Descobertas sem fim</span></div></div><div class="hero-art"><img src="${import.meta.env.BASE_URL}images/lab-genius.png" alt="Cientista excêntrico entre átomos, livros e frascos em uma ilustração dos anos 60" fetchpriority="high"><span class="art-note">A curiosidade é o<br>nosso combustível!</span></div><span class="hero-edition">VOL. 01 / EXPERIMENTOS LEXICAIS</span></section>`;
}
function labView() {
  const theme = currentTheme();
  const progress = Math.round(
    (session.found.length / puzzle.placements.length) * 100,
  );
  return `${hero()}<div class="section-heading"><div><span class="eyebrow">BANCADA DE EXPERIMENTOS</span><h2>O que vamos descobrir hoje?</h2></div><button class="daily-button" data-action="daily">${icon("Sun")}<span>Desafio do dia<small>Uma nova dose de curiosidade</small></span>${icon("ArrowUpRight")}</button></div>
  <section class="workbench" aria-label="Caça-palavras"><aside class="controls-panel"><div class="panel-label"><span>01</span> PREPARE A EXPERIÊNCIA</div><div class="control-body"><label class="field-label">Universo de pesquisa</label><button class="theme-select" data-action="view" data-view="themes"><span class="theme-mini ${theme.color}">${icon(theme.icon)}</span><span><strong>${escapeHTML(theme.title)}</strong><small>${CATEGORIES.find((c) => c.id === theme.category)?.label || "Seu próprio universo"}</small></span>${icon("ChevronDown")}</button><p class="theme-description">${escapeHTML(theme.description)}</p><label class="field-label difficulty-label">Nível de genialidade</label><div class="difficulty-options">${Object.entries(
    DIFFICULTIES,
  )
    .map(
      ([key, d], i) =>
        `<button class="difficulty ${session.difficulty === key ? "selected" : ""}" data-action="difficulty" data-difficulty="${key}" ${session.difficulty === key ? 'aria-pressed="true"' : 'aria-pressed="false"'}><span class="level-bars">${Array.from({ length: 3 }, (_, j) => `<b class="${j <= i ? "filled" : ""}"></b>`).join("")}</span><span>${d.label}</span><small>${d.size}×${d.size}</small>${session.difficulty === key ? icon("Check") : ""}</button>`,
    )
    .join(
      "",
    )}</div><button class="button primary new-button" data-action="new">${icon("Shuffle")}Novo experimento</button><div class="control-divider"></div><div class="lab-note"><span>${icon("Lightbulb")}</span><p><strong>Todo gênio começa curioso.</strong>Arraste entre as letras ou toque na primeira e na última letra da palavra.</p></div><button class="text-button how-button" data-action="help">Como funciona ${icon("ArrowRight")}</button></div><div class="specimen-label"><span>LEX / ${String(THEMES.indexOf(theme) + 1 || 99).padStart(3, "0")}</span><span>APROVADO ${icon("BadgeCheck")}</span></div></aside>
  <div class="experiment"><div class="experiment-toolbar"><div class="experiment-name">${icon("Atom")}<span>EXPERIMENTO <b>Nº ${String(profile.wins + 1).padStart(3, "0")}</b></span>${session.mode === "daily" ? '<span class="mode-pill">DO DIA</span>' : ""}</div><div class="timer"><span id="timer-text">${time(session.seconds)}</span><button class="icon-button compact" data-action="pause" aria-label="${paused ? "Continuar" : "Pausar"} experimento" ${session.completed ? "disabled" : ""}>${icon(paused ? "Play" : "Pause")}</button></div></div>
  <div class="board-wrap ${paused ? "paused" : ""}"><div class="board-top-coordinates" aria-hidden="true">${Array.from({ length: puzzle.size }, (_, i) => `<span>${String(i + 1).padStart(2, "0")}</span>`).join("")}</div><div class="board-frame"><div id="letter-grid" class="letter-grid size-${puzzle.size}" role="grid" aria-label="Tabuleiro ${puzzle.size} por ${puzzle.size}. Use as setas para navegar e Enter para marcar o início e o fim." style="--size:${puzzle.size}">${puzzle.grid.map((row, r) => `<div role="row" class="grid-row">${row.map((letter, c) => `<button class="letter-cell ${cellColor(r, c)}" data-row="${r}" data-col="${c}" role="gridcell" tabindex="${r === activeCell.row && c === activeCell.col ? "0" : "-1"}" aria-label="${letter}, linha ${r + 1}, coluna ${c + 1}"><span class="letter-glyph">${letter}</span></button>`).join("")}</div>`).join("")}</div></div>${paused ? `<div class="pause-overlay">${icon("Coffee")}<h3>Intervalo para o café.</h3><p>Até grandes mentes precisam de uma pausa.</p><button class="button primary" data-action="pause">${icon("Play")}Continuar experimento</button></div>` : ""}</div>
  <div class="board-bottom"><span><span class="status-dot ${session.completed ? "done" : ""}"></span>${session.completed ? "EXPERIMENTO CONCLUÍDO" : paused ? "EXPERIMENTO PAUSADO" : session.started ? "PESQUISA EM ANDAMENTO" : "À ESPERA DO SEU PRIMEIRO EUREKA!"}</span><div><button class="icon-button" data-action="print" aria-label="Imprimir caça-palavras" title="Imprimir">${icon("Printer")}</button><button class="icon-button" data-action="focus" aria-label="Ampliar tabuleiro" title="Ampliar tabuleiro">${icon("Maximize2")}</button></div></div><div class="experiment-actions"><button class="hint-button" data-action="hint" ${session.hintsUsed >= 3 || session.completed || paused ? "disabled" : ""}>${icon("Lightbulb")}Uma pequena faísca<span>${3 - session.hintsUsed}/3 dicas</span></button><span class="score">${icon("Zap")}<b>${session.score}</b> pontos</span></div></div>
  <aside class="words-panel"><div class="words-heading"><div><span class="eyebrow">NO RADAR</span><h3>Palavras ocultas</h3></div><span class="word-count">${session.found.length}<small>/${puzzle.placements.length}</small></span></div><div class="progress-track"><span style="width:${progress}%"></span></div><p class="word-list-help">${session.difficulty === "easy" ? "Procure para a direita, para baixo e na diagonal." : "Em todas as direções. Até ao contrário."}</p><ul class="word-list">${puzzle.placements.map((p, i) => `<li><button class="word-item ${session.found.includes(p.normalized) ? "found" : ""}" data-action="word" data-word="${p.normalized}"><span class="word-check">${session.found.includes(p.normalized) ? icon("Check") : "<span></span>"}</span><span>${escapeHTML(p.word)}</span>${session.found.includes(p.normalized) ? icon("BookOpen") : `<small>${String(i + 1).padStart(2, "0")}</small>`}</button></li>`).join("")}</ul><div class="discovery-note"><div>${icon("Sparkles")} ${lastDiscovery ? "EUREKA! VOCÊ DESCOBRIU" : "CADA PALAVRA, UMA DESCOBERTA"}</div><p>${lastDiscovery ? `<strong>${escapeHTML(lastDiscovery.word)}.</strong> ${escapeHTML(lastDiscovery.clue)}` : "Encontrou uma palavra? Uma pequena dose de conhecimento espera por você."}</p></div>${session.completed ? '<button class="button primary result-button" data-action="result">Ver resultado ' + icon("ArrowUpRight") + "</button>" : ""}</aside></section>
  <section class="explore-section"><div class="section-heading small"><div><span class="eyebrow">A CURIOSIDADE NÃO TEM LIMITES</span><h2>Outros universos esperam por você.</h2></div><button class="text-button" data-action="view" data-view="themes">Explorar os ${THEMES.length} temas ${icon("ArrowRight")}</button></div><div class="teaser-grid">${[
    THEMES.find((t) => t.category === "ficcao"),
    THEMES.find((t) => t.category === "filosofia"),
    THEMES.find((t) => t.category === "historia"),
    THEMES.find((t) => t.category === "politica"),
  ]
    .filter(Boolean)
    .map((t) => themeCard(t, true))
    .join("")}</div></section>`;
}
function cellColor(r, c) {
  const index = puzzle.placements.findIndex(
    (p) =>
      session.found.includes(p.normalized) &&
      p.cells.some((cell) => cell.row === r && cell.col === c),
  );
  return index < 0 ? "" : `found-cell color-${index % 6}`;
}
function themeCard(theme, compact = false) {
  return `<article class="theme-card ${theme.color} ${compact ? "compact-card" : ""}"><button class="favorite ${favorites.includes(theme.id) ? "saved" : ""}" data-action="favorite" data-id="${theme.id}" aria-label="${favorites.includes(theme.id) ? "Remover dos" : "Adicionar aos"} favoritos: ${escapeHTML(theme.title)}" aria-pressed="${favorites.includes(theme.id)}">${icon("Heart")}</button><button class="theme-card-content" data-action="theme" data-id="${theme.id}"><span class="theme-card-icon">${icon(theme.icon)}</span><span class="theme-category">${CATEGORIES.find((c) => c.id === theme.category)?.label || ""}</span><h3>${escapeHTML(theme.title)}</h3>${!compact ? `<p>${escapeHTML(theme.description)}</p>` : ""}<span class="theme-card-footer">${theme.words.length} palavras ${icon("ArrowUpRight")}</span></button></article>`;
}
function filteredThemes() {
  const normalized = normalizeWord(query);
  return THEMES.filter(
    (t) =>
      (category === "all" || t.category === category) &&
      (!favoritesOnly || favorites.includes(t.id)) &&
      (!normalized ||
        normalizeWord(
          `${t.title} ${t.description} ${t.words.map((w) => w.word).join(" ")}`,
        ).includes(normalized)),
  );
}
function catalogView() {
  const themes = filteredThemes();
  return `<section class="page-intro"><span class="eyebrow">DEPARTAMENTO DE CURIOSIDADES</span><h1>Um universo puxa o outro.</h1><p>${THEMES.length} temas. ${totalWords.toLocaleString("pt-BR")} palavras e pistas. Infinitas possibilidades de dizer “eureka”.</p><span class="intro-symbol">${icon("Orbit")}</span></section><div class="catalog-tools"><div class="search-field">${icon("Search")}<input id="theme-search" type="search" placeholder="Que universo desperta sua curiosidade?" aria-label="Buscar temas" value="${escapeHTML(query)}"><kbd>/</kbd></div><button class="button ${favoritesOnly ? "primary" : "secondary"}" data-action="favorites">${icon("Heart")}Favoritos <span>${favorites.length}</span></button><button class="button secondary" data-action="custom">${icon("Plus")}Criar meu tema</button></div><div class="category-tabs" role="group" aria-label="Filtrar por categoria"><button data-action="category" data-category="all" class="${category === "all" ? "active" : ""}">Todos os universos <span>${THEMES.length}</span></button>${CATEGORIES.map((c) => `<button data-action="category" data-category="${c.id}" class="${category === c.id ? "active" : ""}">${c.label}</button>`).join("")}</div><div id="catalog-results"><div class="catalog-count">${themes.length} ${themes.length === 1 ? "universo encontrado" : "universos encontrados"}<span>ESCOLHA UM TEMA E COMECE A EXPLORAR</span></div><div class="catalog-grid">${themes.length ? themes.map((t) => themeCard(t)).join("") : `<div class="empty-state">${icon("Telescope")}<h3>Nenhum sinal por aqui.</h3><p>Tente outro termo ou explore uma nova categoria.</p><button class="button secondary" data-action="clear-search">Limpar filtros</button></div>`}</div></div>`;
}
function discoveriesView() {
  return `<section class="page-intro"><span class="eyebrow">SEU CADERNO DE CAMPO</span><h1>Uma mente em expansão.</h1><p>Cada experimento deixa uma descoberta. Este é o registro da sua jornada.</p><span class="intro-symbol">${icon("NotebookPen")}</span></section><div class="stats-grid">${[
    ["FlaskConical", profile.wins, "experimentos concluídos"],
    ["Search", profile.words, "palavras encontradas"],
    ["Sparkles", profile.xp.toLocaleString("pt-BR"), "pontos de experiência"],
    ["Flame", streakOf(profile.dailyDays), "dias seguidos de desafio"],
  ]
    .map(
      ([i, n, l]) =>
        `<div class="stat-card">${icon(i)}<strong>${n}</strong><span>${l}</span></div>`,
    )
    .join(
      "",
    )}</div><div class="section-heading"><div><span class="eyebrow">PEQUENAS GRANDES VITÓRIAS</span><h2>Sua coleção de conquistas</h2></div><span class="count-label">${profile.achievements.length} de ${achievements.length} desbloqueadas</span></div><div class="achievements-grid">${achievements.map((a) => `<article class="achievement ${profile.achievements.includes(a.id) ? "unlocked" : ""}"><span>${icon(a.icon)}</span><div><h3>${a.title}</h3><p>${a.description}</p></div>${icon(profile.achievements.includes(a.id) ? "BadgeCheck" : "LockKeyhole")}</article>`).join("")}</div><div class="notebook-columns"><section><div class="section-heading"><div><span class="eyebrow">MEMÓRIAS DO LABORATÓRIO</span><h2>Últimos experimentos</h2></div></div>${
    profile.history.length
      ? `<div class="history-list">${profile.history
          .slice(0, 8)
          .map(
            (h) =>
              `<div class="history-item"><span class="history-icon">${icon(h.mode === "daily" ? "Sun" : "FlaskConical")}</span><div><strong>${escapeHTML(h.title)}</strong><small>${DIFFICULTIES[h.difficulty]?.label || ""} · ${time(h.seconds)} · ${escapeHTML(h.day.split("-").reverse().join("/"))}</small></div><b>+${h.xp} XP</b></div>`,
          )
          .join("")}</div>`
      : '<div class="notebook-empty">' +
        icon("Feather") +
        '<p>Seu próximo eureka começa na bancada.</p><button class="text-button" data-action="view" data-view="lab">Começar uma descoberta ' +
        icon("ArrowRight") +
        "</button></div>"
  }</section><section><div class="section-heading"><div><span class="eyebrow">PARA LEVAR COM VOCÊ</span><h2>Pequenas doses de conhecimento</h2></div></div><div class="discovery-entries">${
    profile.discoveries.length
      ? profile.discoveries
          .slice(-8)
          .reverse()
          .map(
            (d) =>
              `<article><span>${icon("Sparkles")}</span><div><h3>${escapeHTML(d.word)}</h3><p>${escapeHTML(d.clue)}</p></div></article>`,
          )
          .join("")
      : '<div class="notebook-empty">' +
        icon("BookOpen") +
        "<p>Encontre palavras para preencher seu caderno com pistas e ideias.</p></div>"
  }</div></section></div>`;
}
function render({ entrance = false, board = false } = {}) {
  clearMotion();
  if (!activeProfile) {
    $("#app").innerHTML = pickerView();
    refreshIcons();
    return;
  }
  $("#app").innerHTML =
    `${header()}<main>${view === "lab" ? labView() : view === "themes" ? catalogView() : discoveriesView()}</main><footer><div class="footer-brand">${icon("Atom")} lexicon<span>.</span></div><p>Feito para quem nunca deixou de perguntar “por quê?”.</p><span>EXPLORE. DESCUBRA. REPITA.</span><button class="text-button" data-action="help">Manual do laboratório ${icon("ArrowUpRight")}</button></footer><div id="toast" class="toast" role="status" aria-live="polite"></div><dialog id="modal" class="modal"></dialog><div class="sr-only" id="live-announcement" aria-live="polite"></div>`;
  refreshIcons();
  if (view === "lab") {
    $(".workbench")?.classList.toggle("focus-mode", focusMode);
    paintSelection();
  }
  if (entrance) enterScene({ board });
}
function refreshIcons() {
  createIcons({ icons, attrs: { "stroke-width": 1.7 } });
}
let toastTimeout;
function toast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove("visible"), 4200);
}
function announce(message) {
  const el = $("#live-announcement");
  if (el) el.textContent = message;
}
function setView(next) {
  view = next;
  selected = [];
  anchor = null;
  render({ entrance: true });
  window.scrollTo({ top: 0, behavior: motionAllowed() ? "smooth" : "instant" });
}
function showModal(html) {
  selected = [];
  anchor = null;
  paintSelection();
  const m = $("#modal");
  m.innerHTML = `<button class="modal-close icon-button" data-action="close" aria-label="Fechar">${icon("X")}</button>${html}`;
  refreshIcons();
  m.showModal();
  openDialog(m);
}
function closeModal() {
  clearMotion();
  $("#modal")?.close();
  modalCallback = null;
}
function confirmChange(callback) {
  if (session.started && !session.completed) {
    modalCallback = callback;
    showModal(
      `<div class="modal-symbol">${icon("FlaskConical")}</div><span class="eyebrow">UM NOVO EXPERIMENTO</span><h2>Trocar de pesquisa?</h2><p>O experimento atual será substituído. As palavras já descobertas continuam no seu caderno.</p><div class="modal-actions"><button class="button secondary" data-action="close">Continuar este</button><button class="button primary" data-action="confirm">Começar o novo ${icon("ArrowRight")}</button></div>`,
    );
  } else callback();
}
function beginExperiment(
  theme = currentTheme(),
  difficulty = session.difficulty,
  mode = "free",
  seed,
  customTheme,
) {
  const fitting = theme.words.filter(
    (w) => normalizeWord(w.word).length <= DIFFICULTIES[difficulty].size,
  );
  if (fitting.length < 4) {
    toast(
      "Este tema precisa de um tabuleiro maior. Escolha Pesquisador ou Gênio.",
    );
    return;
  }
  try {
    newSession(theme, difficulty, mode, seed, customTheme);
    view = "lab";
    render({ entrance: true, board: true });
    window.scrollTo({
      top: Math.max(0, $(".section-heading").offsetTop - 25),
      behavior: motionAllowed() ? "smooth" : "instant",
    });
  } catch {
    toast(
      "Não foi possível montar este tema. Confira o tamanho e a quantidade das palavras.",
    );
  }
}
function playTone(type = "found") {
  if (!settings.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    const frequencies =
      type === "win"
        ? [523, 659, 784, 1047]
        : type === "error"
          ? [220, 174]
          : type === "select"
            ? [420]
            : type === "hint"
              ? [440, 554]
              : [523, 784];
    frequencies.forEach((f, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const t = audioContext.currentTime + i * 0.1;
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(
        type === "select" ? 0.012 : type === "error" ? 0.028 : 0.055,
        t + 0.015,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    /* Sound is optional. */
  }
}
function unlockAchievements() {
  const unlocked = [];
  for (const a of achievements)
    if (!profile.achievements.includes(a.id) && a.check()) {
      profile.achievements.push(a.id);
      unlocked.push(a.title);
    }
  return unlocked;
}
function acceptSelection(cells, attempted = cells) {
  if (paused || session.completed) return;
  const match = matchSelection(
    cells,
    puzzle.placements,
    session.found,
    puzzle.grid,
  );
  selected = [];
  anchor = null;
  if (!match) {
    paintSelection();
    if (attempted.length > 1) {
      rejectSelection(attempted);
      playTone("error");
      const message = cells.length
        ? "Ainda não! Essa combinação não está na lista. Tente outra descoberta."
        : "Quase! Conecte as letras em uma linha reta.";
      toast(message);
      announce(message);
    }
    return;
  }
  session.started = true;
  session.found.push(match.normalized);
  session.foundPaths ||= {};
  session.foundPaths[match.normalized] = match.cells;
  puzzle.placements.find((p) => p.normalized === match.normalized).cells =
    match.cells;
  session.score += { easy: 50, medium: 75, hard: 100 }[session.difficulty];
  profile.words++;
  if (
    !profile.discoveries.some((d) => normalizeWord(d.word) === match.normalized)
  )
    profile.discoveries.push({ word: match.word, clue: match.clue });
  profile.discoveries = profile.discoveries.slice(-500);
  lastDiscovery = match;
  hintCell = null;
  session.hintCell = null;
  const complete = session.found.length === puzzle.placements.length;
  let unlocked = [];
  if (complete) {
    session.completed = true;
    const repeatDaily =
      session.mode === "daily" && profile.dailyDays.includes(session.day);
    const xp = repeatDaily
      ? 0
      : session.score +
        Math.max(0, 3 - session.hintsUsed) * 25 +
        (session.mode === "daily" ? 150 : 0);
    session.earnedXP = xp;
    if (!repeatDaily) {
      profile.xp += xp;
      profile.wins++;
      profile.seconds += session.seconds;
      if (!profile.themes.includes(session.themeId))
        profile.themes.push(session.themeId);
      if (session.mode === "daily") profile.dailyDays.push(session.day);
      profile.history.unshift({
        title: currentTheme().title,
        difficulty: session.difficulty,
        seconds: session.seconds,
        xp,
        mode: session.mode,
        day: session.day,
      });
      profile.history = profile.history.slice(0, 50);
    }
  }
  unlocked = unlockAchievements();
  persist();
  render();
  celebrateWord({
    cells: match.cells,
    normalized: match.normalized,
    points: { easy: 50, medium: 75, hard: 100 }[session.difficulty],
    score: session.score,
    found: session.found.length,
    total: puzzle.placements.length,
  });
  announce(
    `${match.word} encontrada. ${session.found.length} de ${puzzle.placements.length}.`,
  );
  playTone(complete ? "win" : "found");
  if (complete) showResult(unlocked);
  else
    toast(
      unlocked.length
        ? `Conquista desbloqueada: ${unlocked.join(", ")}!`
        : `Eureka! ${match.word} encontrada. +${{ easy: 50, medium: 75, hard: 100 }[session.difficulty]} pontos`,
    );
}
function showResult(unlocked = []) {
  showModal(
    `<div class="result-art">${icon("PartyPopper")}<span>✳</span>${icon("Atom")}</div><span class="eyebrow">EXPERIMENTO CONCLUÍDO</span><h2>Eureka, mente brilhante!</h2><p>Você desvendou <strong>${escapeHTML(currentTheme().title)}</strong>.<br>Mais um universo para o seu repertório.</p><div class="result-stats"><div><strong>${session.found.length}</strong><span>descobertas</span></div><div><strong>${time(session.seconds)}</strong><span>tempo de pesquisa</span></div><div><strong>+${session.earnedXP || 0}</strong><span>XP conquistado</span></div></div>${unlocked.length ? `<div class="unlocked-notice">${icon("Award")}Conquista: ${unlocked.join(" · ")}</div>` : ""}<div class="modal-actions"><button class="button secondary" data-action="result-notebook">Meu caderno</button><button class="button primary" data-action="next">Próxima descoberta ${icon("ArrowRight")}</button></div>`,
  );
  celebrateCompletion($("#modal"), session.earnedXP || 0);
}
function paintSelection() {
  document.querySelectorAll(".letter-cell").forEach((cell) => {
    const r = +cell.dataset.row,
      c = +cell.dataset.col;
    cell.classList.toggle(
      "selecting",
      selected.some((s) => s.row === r && s.col === c),
    );
    cell.classList.toggle(
      "selection-start",
      selected.length > 0 && selected[0].row === r && selected[0].col === c,
    );
    cell.classList.toggle(
      "selection-tip",
      selected.length > 0 &&
        selected.at(-1).row === r &&
        selected.at(-1).col === c,
    );
    cell.classList.toggle(
      "hinted",
      Boolean(hintCell && hintCell.row === r && hintCell.col === c),
    );
    cell.setAttribute(
      "aria-selected",
      String(selected.some((s) => s.row === r && s.col === c)),
    );
  });
  traceSelection(selected);
}
function canSelect() {
  return activeProfile && view === "lab" && !paused && !session.completed && !$("#modal")?.open;
}
function cellFromEvent(event) {
  const element = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest(".letter-cell");
  return element
    ? { row: +element.dataset.row, col: +element.dataset.col }
    : null;
}
document.addEventListener("pointerdown", (event) => {
  const el = event.target.closest(".letter-cell");
  if (!el || !canSelect() || event.button !== 0) return;
  event.preventDefault();
  pointerStart = { row: +el.dataset.row, col: +el.dataset.col };
  activeCell = pointerStart;
  dragging = false;
  if (!session.started) {
    session.started = true;
    persist();
  }
  selected = getLine(anchor || pointerStart, pointerStart);
  paintSelection();
  playTone("select");
});
document.addEventListener("pointermove", (event) => {
  if (!pointerStart || !canSelect()) return;
  const cell = cellFromEvent(event);
  if (!cell) return;
  if (cell.row !== pointerStart.row || cell.col !== pointerStart.col)
    dragging = true;
  selected = getLine(anchor || pointerStart, cell);
  paintSelection();
});
document.addEventListener("pointerup", (event) => {
  if (!pointerStart) return;
  const cell = cellFromEvent(event);
  const start = anchor || pointerStart;
  if (!cell) {
    pointerStart = null;
    anchor = null;
    selected = [];
    paintSelection();
    return;
  }
  if (dragging || anchor) {
    const line = getLine(start, cell);
    pointerStart = null;
    dragging = false;
    acceptSelection(line, line.length ? line : [start, cell]);
  } else {
    anchor = pointerStart;
    selected = [anchor];
    pointerStart = null;
    paintSelection();
    announce("Início marcado. Agora escolha a última letra.");
  }
});
document.addEventListener("pointercancel", () => {
  pointerStart = null;
  anchor = null;
  selected = [];
  paintSelection();
});
document.addEventListener("keydown", (event) => {
  const cell = event.target.closest(".letter-cell");
  if (cell && canSelect()) {
    const row = +cell.dataset.row,
      col = +cell.dataset.col;
    const deltas = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (deltas[event.key]) {
      event.preventDefault();
      const [dr, dc] = deltas[event.key];
      activeCell = {
        row: Math.max(0, Math.min(puzzle.size - 1, row + dr)),
        col: Math.max(0, Math.min(puzzle.size - 1, col + dc)),
      };
      document
        .querySelectorAll(".letter-cell")
        .forEach((c) => (c.tabIndex = -1));
      const next = $(
        `[data-row="${activeCell.row}"][data-col="${activeCell.col}"]`,
      );
      next.tabIndex = 0;
      next.focus();
      if (anchor) {
        selected = getLine(anchor, activeCell);
        paintSelection();
      }
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      session.started = true;
      if (anchor) {
        const line = getLine(anchor, { row, col });
        acceptSelection(line, line.length ? line : [anchor, { row, col }]);
        $(`[data-row="${row}"][data-col="${col}"]`)?.focus();
      } else {
        anchor = { row, col };
        selected = [anchor];
        paintSelection();
        playTone("select");
        announce("Início marcado. Use as setas e Enter para concluir.");
      }
    }
    if (event.key === "Escape") {
      anchor = null;
      selected = [];
      paintSelection();
    }
  }
  if (
    event.key === "/" &&
    view === "themes" &&
    !["INPUT", "TEXTAREA"].includes(event.target.tagName) &&
    !$("#modal").open
  ) {
    event.preventDefault();
    $("#theme-search").focus();
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === "choose-profile") { await chooseProfile(button.dataset.profile); return; }
  if (action === "switch-profile") { switchProfile(); return; }
  if (action === "sync-setup") { showSyncSetup(); return; }
  if (action === "sync-now") { closeModal(); await synchronizeCurrent(); return; }
  if (action === "copy-sync-code") {
    try { await navigator.clipboard.writeText(formatCode(getSyncCode())); $("#sync-message").textContent = "Código copiado. Cole no outro aparelho."; }
    catch { $("#device-code").select(); $("#sync-message").textContent = "Selecione e copie o código acima."; }
    return;
  }
  if (action === "create-sync-code") {
    button.disabled = true;
    try { await connectDevices(newConnectionCode(), true); showSyncSetup(); }
    catch (error) { $("#sync-message").textContent = error.message; button.disabled = false; }
    return;
  }
  if (action === "sync-resolve") {
    button.disabled = true;
    const id = button.dataset.profile;
    const result = await syncProfile(id, button.dataset.choice);
    if (result.kind === "saved" || result.kind === "loaded") {
      if (activeProfile?.id === id) { restoreGame(readStore(id)); render(); } else { closeModal(); render(); }
    } else if (result.kind === "conflict") { showSyncConflict(id); }
    else { button.disabled = false; toast(result.error || "Não foi possível sincronizar agora. Tente novamente."); }
    return;
  }
  if (action === "view") {
    setView(button.dataset.view);
    return;
  }
  if (action === "close") {
    closeModal();
    return;
  }
  if (action === "confirm") {
    const callback = modalCallback;
    closeModal();
    callback?.();
    return;
  }
  if (action === "sound") {
    settings.sound = !settings.sound;
    persist();
    render();
    playTone();
    toast(
      settings.sound ? "Sons do laboratório ativados." : "Sons desativados.",
    );
    return;
  }
  if (action === "new") {
    confirmChange(() =>
      beginExperiment(
        currentTheme(),
        session.difficulty,
        "free",
        undefined,
        session.customTheme,
      ),
    );
    return;
  }
  if (action === "difficulty") {
    if (session.difficulty !== button.dataset.difficulty)
      confirmChange(() =>
        beginExperiment(
          currentTheme(),
          button.dataset.difficulty,
          "free",
          undefined,
          session.customTheme,
        ),
      );
    return;
  }
  if (action === "theme") {
    const theme = THEMES.find((t) => t.id === button.dataset.id);
    if (theme) confirmChange(() => beginExperiment(theme));
    return;
  }
  if (action === "favorite") {
    const id = button.dataset.id;
    favorites = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    persist();
    render();
    reactFavorite($(`.favorite[data-id="${id}"]`), favorites.includes(id));
    return;
  }
  if (action === "favorites") {
    favoritesOnly = !favoritesOnly;
    render();
    revealCards();
    return;
  }
  if (action === "category") {
    category = button.dataset.category;
    render();
    revealCards();
    return;
  }
  if (action === "clear-search") {
    category = "all";
    query = "";
    favoritesOnly = false;
    render();
    return;
  }
  if (action === "pause") {
    paused = !paused;
    anchor = null;
    selected = [];
    persist();
    render();
    if (paused) openDialog($(".pause-overlay"));
    return;
  }
  if (action === "hint") {
    const remaining = puzzle.placements.filter(
      (p) => !session.found.includes(p.normalized),
    );
    const p =
      remaining.find((p) => !session.hintedWords.includes(p.normalized)) ||
      remaining[0];
    if (!p) return;
    const repeated = session.hintedWords.includes(p.normalized);
    if (!repeated) session.hintedWords.push(p.normalized);
    session.hintsUsed++;
    session.started = true;
    hintCell = repeated ? p.cells.at(-1) : p.cells[0];
    session.hintCell = hintCell;
    session.score = Math.max(0, session.score - 25);
    persist();
    render();
    paintSelection();
    playTone("hint");
    revealHint(hintCell);
    toast(
      `Uma faísca: ${p.word} ${repeated ? "termina" : "começa"} na letra destacada. Dica custa até 25 pontos.`,
    );
    return;
  }
  if (action === "word") {
    const p = puzzle.placements.find(
      (p) => p.normalized === button.dataset.word,
    );
    if (session.found.includes(p.normalized))
      showModal(
        `<div class="modal-symbol">${icon("BookOpen")}</div><span class="eyebrow">UMA PEQUENA DESCOBERTA</span><h2>${escapeHTML(p.word)}</h2><p>${escapeHTML(p.clue)}</p><button class="button primary" data-action="close">Continuar explorando ${icon("ArrowRight")}</button>`,
      );
    else toast("Encontre esta palavra no tabuleiro para revelar sua pista.");
    return;
  }
  if (action === "daily") {
    const day = localDay();
    const dayNumber = Math.floor(
      Date.UTC(...day.split("-").map((n, i) => +n - (i === 1 ? 1 : 0))) /
        86400000,
    );
    const theme = THEMES[dayNumber % THEMES.length];
    if (session.mode === "daily" && session.day === day) {
      setView("lab");
      if (session.completed) showResult();
      return;
    }
    if (profile.dailyDays.includes(day)) {
      showModal(
        `<div class="modal-symbol">${icon("Sun")}</div><span class="eyebrow">MISSÃO DO DIA CUMPRIDA</span><h2>Sua dose de eureka está em dia.</h2><p>Você já concluiu o desafio de hoje. Amanhã tem um novo universo! Enquanto isso, explore os ${THEMES.length} temas do arquivo.</p><button class="button primary" data-action="daily-catalog">Explorar temas ${icon("ArrowRight")}</button>`,
      );
      return;
    }
    confirmChange(() =>
      beginExperiment(theme, "medium", "daily", `lexicon-daily-${day}`),
    );
    return;
  }
  if (action === "daily-catalog") {
    closeModal();
    setView("themes");
    return;
  }
  if (action === "result") {
    showResult();
    return;
  }
  if (action === "result-notebook") {
    closeModal();
    setView("discoveries");
    return;
  }
  if (action === "next") {
    closeModal();
    const next =
      THEMES[
        (THEMES.findIndex((t) => t.id === session.themeId) + 1) % THEMES.length
      ];
    beginExperiment(next);
    return;
  }
  if (action === "focus") {
    focusMode = !focusMode;
    $(".workbench").classList.toggle("focus-mode", focusMode);
    button.setAttribute(
      "aria-label",
      focusMode ? "Restaurar tabuleiro" : "Ampliar tabuleiro",
    );
    $(".workbench").scrollIntoView({
      behavior: motionAllowed() ? "smooth" : "instant",
      block: "start",
    });
    return;
  }
  if (action === "print") {
    window.print();
    return;
  }
  if (action === "help") {
    showHelp();
    return;
  }
  if (action === "custom") {
    showCustom();
    return;
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "theme-search") {
    query = event.target.value;
    const content = catalogView();
    const template = document.createElement("template");
    template.innerHTML = content;
    $("#catalog-results").replaceWith(
      template.content.querySelector("#catalog-results"),
    );
    refreshIcons();
  }
});
document.addEventListener("submit", async (event) => {
  if (event.target.id === "sync-connect-form") {
    event.preventDefault();
    const submit = event.target.querySelector('button[type="submit"]');
    submit.disabled = true;
    try { await connectDevices($("#device-code").value); closeModal(); await synchronizeCurrent(); }
    catch (error) { $("#sync-message").textContent = error.message; submit.disabled = false; }
    return;
  }
  if (event.target.id !== "custom-form") return;
  event.preventDefault();
  const title = $("#custom-title").value.trim();
  const raw = $("#custom-words")
    .value.split(/[\n,;]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  const words = [
    ...new Map(
      raw.map((word) => [
        normalizeWord(word),
        {
          word,
          clue: "Uma palavra do seu universo particular. Experimento criado por você.",
        },
      ]),
    ).values(),
  ];
  if (!title) {
    $("#custom-error").textContent = "Dê um nome ao seu experimento.";
    return;
  }
  if (
    words.length < 8 ||
    words.length > 30 ||
    words.some(
      (w) =>
        normalizeWord(w.word).length < 2 || normalizeWord(w.word).length > 16,
    )
  ) {
    $("#custom-error").textContent =
      "Use de 8 a 30 palavras diferentes, com 2 a 16 letras cada.";
    return;
  }
  const theme = {
    id: "custom",
    title,
    category: "custom",
    icon: "FlaskConical",
    description:
      "Sua curiosidade, suas palavras. Um experimento com a sua assinatura.",
    color: "purple",
    words,
  };
  const fit = words.filter((w) => normalizeWord(w.word).length <= 10).length;
  const difficulty =
    fit >= 8
      ? "easy"
      : words.filter((w) => normalizeWord(w.word).length <= 13).length >= 8
        ? "medium"
        : "hard";
  closeModal();
  confirmChange(() =>
    beginExperiment(theme, difficulty, "custom", undefined, theme),
  );
});
function showCustom() {
  showModal(
    `<div class="modal-symbol">${icon("FlaskConical")}</div><span class="eyebrow">EXPERIMENTO AUTORAL</span><h2>Seu próprio universo.</h2><p>Dê um nome ao tema e adicione de 8 a 30 palavras. A dificuldade inicial se adapta ao tamanho delas.</p><form id="custom-form"><label class="field-label" for="custom-title">Nome do experimento</label><input id="custom-title" required maxlength="45" placeholder="Ex.: As ideias da nossa turma"><label class="field-label" for="custom-words">Palavras (uma por linha ou separadas por vírgula)</label><textarea id="custom-words" required rows="6" placeholder="Curiosidade, ciência, livros, ideias, invenção, pesquisa, futuro, descoberta"></textarea><p class="form-note">De 2 a 16 letras por palavra. Acentos e espaços são removidos no tabuleiro.</p><p id="custom-error" class="form-error" role="alert"></p><button class="button primary" type="submit">${icon("Sparkles")}Criar experimento</button></form>`,
  );
}
function showHelp() {
  showModal(
    `<div class="modal-symbol">${icon("BookOpen")}</div><span class="eyebrow">MANUAL DO LABORATÓRIO · EDIÇÃO 1962</span><h2>A fórmula é a curiosidade.</h2><ol class="help-steps"><li><b>Escolha seu universo.</b> Explore os temas e selecione Aprendiz (10×10), Pesquisador (13×13) ou Gênio (16×16).</li><li><b>Conecte as letras.</b> Arraste da primeira até a última letra, ou toque nas duas pontas. As palavras formam linhas retas; no nível Aprendiz, seguem para a direita, para baixo ou na diagonal para baixo e à direita.</li><li><b>Use uma faísca, se precisar.</b> Há 3 dicas por experimento. Cada uma revela o início de uma palavra e desconta até 25 pontos. Palavras rendem 50, 75 ou 100 pontos, conforme o nível.</li><li><b>Registre seu eureka.</b> Complete o tabuleiro para receber XP. Cada dica não usada vale 25 XP extras; o desafio diário dá mais 150 XP uma vez por dia.</li></ol><div class="help-footnote"><p><b>Teclado:</b> Tab acessa o tabuleiro, setas navegam, Enter ou espaço marcam as pontas, Esc cancela a seleção.</p><p><b>Seu progresso:</b> salvo automaticamente neste navegador. O tempo para ao sair da aba, navegar para outro painel, abrir um diálogo ou pausar. Funciona sem conta e sem internet depois da primeira carga da versão de produção.</p><p><b>Política & história:</b> conteúdo educativo com nomes, conceitos e instituições; as pistas não representam apoio a figuras ou ideologias.</p></div><button class="button primary" data-action="close">Vamos experimentar ${icon("ArrowRight")}</button>`,
  );
}
setInterval(() => {
  if (
    activeProfile &&
    session.started &&
    !session.completed &&
    !paused &&
    view === "lab" &&
    !document.hidden &&
    !$("#modal")?.open
  ) {
    session.seconds++;
    const timer = $("#timer-text");
    if (timer) timer.textContent = time(session.seconds);
    if (session.seconds % 5 === 0) persist();
  }
}, 1000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pointerStart = null;
    anchor = null;
    selected = [];
    paintSelection();
    persist();
  }
});
window.addEventListener("pagehide", persist);
if (activeProfile) restoreGame(readStore(activeProfile.id));
render({ entrance: true, board: true });
initInstall();
window.addEventListener("online", synchronizeCurrent);
if (activeProfile && getSyncCode()) synchronizeCurrent();
