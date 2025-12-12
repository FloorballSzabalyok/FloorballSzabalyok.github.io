// --- APP.JS vStable (FloorballSzabályok) ---

// --- KONFIGURÁCIÓ ---
const FIREBASE_URL = "https://floorball-duel-default-rtdb.firebaseio.com/";
const UMAMI_ENABLED = typeof window.umami !== "undefined";

// --- SEGÉDFÜGGVÉNYEK ---
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function shuffle(a) {
  return a.sort(() => Math.random() - 0.5);
}

function saveLS(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function loadLS(key, fallback = null) {
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : fallback;
}

// --- ÁLLAPOT ---
const state = {
  theme: loadLS("theme", "light"),
  currentScreen: "menu",
  currentTopic: null,
  currentLevel: null,
  questions: [],
  currentQuestion: 0,
  lives: 3,
  streak: loadLS("streak", 0),
  totalAnswers: loadLS("totalAnswers", 0),
  duel: {
    isActive: false,
    isHost: false,
    roomId: null,
    opponentJoined: false,
    inRematchOffer: false,
  },
};

// --- FIREBASE FUNKCIÓK ---
async function fb(path, method = "GET", data = null) {
  const url = `${FIREBASE_URL}${path}.json`;
  const options = { method };
  if (data) options.body = JSON.stringify(data);
  const res = await fetch(url, options);
  return await res.json();
}

async function fbSet(path, data) {
  return fb(path, "PUT", data);
}

async function fbPost(path, data) {
  return fb(path, "POST", data);
}

async function fbDelete(path) {
  return fb(path, "DELETE");
}

// --- UMAMI TRACKING ---
function trackEvent(eventName, data = {}) {
  if (UMAMI_ENABLED) {
    try {
      window.umami.track(eventName, data);
    } catch (e) {
      console.warn("Umami tracking error:", e);
    }
  }
}

// --- ALAP APP OBJEKTUM ---
const app = {
  init() {
    this.bindUI();
    this.updateStats();
    this.setTheme(state.theme);
    this.toggleScreen("menu");
    if (!loadLS("welcomeShown", false)) this.toggleWelcome(true);
  },

  bindUI() {
    $("#btn-theme").addEventListener("click", () => this.toggleTheme());
    $("#btn-info").addEventListener("click", () => this.toggleInfo());
    $("#btn-reset").addEventListener("click", () => this.toggleResetModal());
    $("#btn-duel").addEventListener("click", () => this.startDuel());
    $("#btn-home").addEventListener("click", () => this.toggleScreen("menu"));
  },

  toggleScreen(id) {
    $$(".screen").forEach((el) => el.classList.remove("active"));
    $(`#s-${id}`).classList.add("active");
    state.currentScreen = id;
  },

  setTheme(theme) {
    document.body.classList.toggle("dark-mode", theme === "dark");
    saveLS("theme", theme);
    state.theme = theme;
  },

  toggleTheme() {
    this.setTheme(state.theme === "light" ? "dark" : "light");
    trackEvent("toggle_theme", { theme: state.theme });
  },

  toggleWelcome(show = null) {
    const modal = $("#welcome-modal");
    const isOpen = modal.classList.contains("open");
    if (show === true || !isOpen) modal.classList.add("open");
    else modal.classList.remove("open");
    saveLS("welcomeShown", true);
  },

  toggleInfo() {
    $("#info-modal").classList.toggle("open");
    trackEvent("info_modal");
  },

  toggleResetModal() {
    $("#reset-modal").classList.toggle("open");
  },

  fullReset() {
    localStorage.clear();
    trackEvent("reset_data");
    location.reload();
  },

  updateStats() {
    $("#stat-total").textContent = state.totalAnswers;
    $("#stat-streak").textContent = state.streak;
  },
};
