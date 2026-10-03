import "./install.css";

const DISMISSED_KEY = "lexicon-install-dismissed";
const standalone = () =>
  matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;

function storageDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function apkURL() {
  const configured = import.meta.env.VITE_ANDROID_APK_URL;
  if (!configured) return null;
  try {
    const url = new URL(
      configured,
      new URL(import.meta.env.BASE_URL, location.href),
    );
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function initInstall() {
  let installPrompt = null;
  let dismissed = storageDismissed();
  let offlineState = "checking";
  let prompting = false;
  let card;
  const mobile = matchMedia("(max-width: 820px) and (pointer: coarse)");
  const installed = matchMedia("(display-mode: standalone)");

  function update() {
    if (standalone() || dismissed || !mobile.matches) {
      card?.remove();
      card = null;
      return;
    }
    if (!card) {
      card = document.createElement("aside");
      card.className = "install-card";
      card.setAttribute("aria-label", "Jogar no celular");
      card.innerHTML = `<img class="install-icon" src="${import.meta.env.BASE_URL}icons/icon-192.png" alt="" width="42" height="42"><div class="install-copy"><strong>Seu laboratório de bolso</strong><p class="install-status" aria-live="polite"></p><div class="install-actions"><button type="button" class="install-button"></button></div><p class="install-help" hidden>Abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”. Confirme a instalação para criar o ícone do Lexicon.</p></div><button type="button" class="install-dismiss" aria-label="Fechar sugestão de instalação">×</button>`;
      document.body.insertBefore(card, document.getElementById("app"));
      card.querySelector(".install-dismiss").addEventListener("click", () => {
        dismissed = true;
        try {
          sessionStorage.setItem(DISMISSED_KEY, "1");
        } catch {
          /* Private browsing may block storage. */
        }
        update();
      });
      card
        .querySelector(".install-button")
        .addEventListener("click", requestInstall);
      const download = apkURL();
      if (download) {
        const link = document.createElement("a");
        link.className = "install-apk";
        link.href = download;
        link.textContent = "Baixar Android";
        link.setAttribute("download", "lexicon-android.apk");
        card.querySelector(".install-actions").append(link);
      }
    }
    card.dataset.offline = offlineState;
    card.querySelector(".install-status").textContent =
      offlineState === "ready"
        ? "Pronto para jogar offline neste aparelho."
        : offlineState === "checking"
          ? "Preparando os temas para jogar offline…"
          : "Instale o atalho. Conecte-se para preparar o modo offline.";
    const button = card.querySelector(".install-button");
    button.disabled = prompting;
    button.textContent = prompting
      ? "Aguardando confirmação…"
      : installPrompt
        ? "Instalar jogo"
        : "Como instalar";
  }

  async function requestInstall() {
    if (!installPrompt) {
      const help = card?.querySelector(".install-help");
      if (help) help.hidden = !help.hidden;
      return;
    }
    const prompt = installPrompt;
    installPrompt = null;
    prompting = true;
    update();
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") dismissed = true;
    } catch {
      /* The user can use the browser menu if its prompt is unavailable. */
    } finally {
      prompting = false;
      update();
    }
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    update();
  });
  window.addEventListener("appinstalled", () => {
    dismissed = true;
    installPrompt = null;
    update();
  });
  mobile.addEventListener("change", update);
  installed.addEventListener("change", update);
  update();

  function checkCache() {
    const controller = navigator.serviceWorker.controller;
    if (!controller) return;
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      offlineState = "unavailable";
      update();
    }, 10_000);
    channel.port1.onmessage = ({ data }) => {
      clearTimeout(timeout);
      channel.port1.close();
      offlineState = data.ready ? "ready" : "unavailable";
      document.documentElement.dataset.offlineReady = String(
        Boolean(data.ready),
      );
      update();
    };
    controller.postMessage({ type: "LEXICON_OFFLINE_STATUS" }, [channel.port2]);
  }

  async function prepareOffline() {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
      offlineState = "unavailable";
      update();
      return;
    }
    navigator.serviceWorker.addEventListener("controllerchange", checkCache);
    window.addEventListener("online", checkCache);
    try {
      const base = new URL(import.meta.env.BASE_URL, location.href);
      await navigator.serviceWorker.register(new URL("sw.js", base), {
        scope: base.pathname,
      });
      await navigator.serviceWorker.ready;
      checkCache();
    } catch {
      if (navigator.serviceWorker.controller) checkCache();
      else {
        offlineState = "unavailable";
        update();
      }
    }
  }
  if (document.readyState === "complete") prepareOffline();
  else window.addEventListener("load", prepareOffline, { once: true });
}
