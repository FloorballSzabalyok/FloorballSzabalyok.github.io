// --- APP.JS vFinal (Embedded Data) ---

// --- 1. ADATBÁZIS (Beépítve a biztos működésért) ---
const HARDCODED_DB = {
  topics: [
    { id: "T00_BASE", name: "Alapfogalmak", order: 1 },
    { id: "T01_RINK", name: "A játéktér", order: 2 },
    { id: "T02_TIME", name: "A játékidő", order: 3 },
    { id: "T03_PART", name: "A résztvevők", order: 4 },
    { id: "T04_EQUI", name: "A felszerelés", order: 5 },
    { id: "T05_RST", name: "Rögzített helyzetek", order: 6 },
    { id: "T06_PEN", name: "Büntetések", order: 7 },
    { id: "T07_GOAL", name: "Gólok", order: 8 }
  ],
  data: {
    /* IDE JÖN A TELJES KÉRDÉSBÁZIS - most csak minta van benne */
    T00_BASE: {
      L1: [
        {
          id: "T00_L1_Q_001",
          q: "Mekkora a floorball mérkőzéshez használt játéktér mérete főszabály szerint?",
          o: ["40 m x 20 m", "44 m x 22 m", "36 m x 18 m"],
          c: 0,
          e: "A szabálykönyv meghatározza, hogy a játéktér mérete 40m x 20m főszabály szerint.",
          r: "101/1"
        },
        {
          id: "T00_L1_Q_002",
          q: "Mi veszi körül a hivatalos játékteret egy mérkőzésen?",
          o: [
            "Az IFF által hitelesített, lekerekített sarkú palánk",
            "Csak vonalak",
            "Háló"
          ],
          c: 0,
          e: "A játéktér körül palánknak kell lennie.",
          r: "101/1"
        },
        {
          id: "T00_L1_Q_003",
          q: "Mekkora a legkisebb megengedett mérete hivatalos mérkőzésen a játéktérnek?",
          o: ["36 m x 18 m", "30 m x 15 m", "40 m x 20 m"],
          c: 0,
          e: "A legkisebb megengedett játéktérméret 36 m x 18 m.",
          r: "101/1"
        },
        {
          id: "T00_L1_Q_004",
          q: "Mire szolgál a középvonal?",
          o: ["A pályát két egyenlő térfélre osztja", "A csereterületet jelöli", "Nincs funkciója"],
          c: 0,
          e: "A középvonal két egyenlő méretű térfélre osztja a játékteret.",
          r: "102/2"
        },
        {
          id: "T00_L1_Q_006",
          q: "Mire szolgál a gólvonal?",
          o: [
            "Annak meghatározására, hogy mikor születik érvényes gól.",
            "A kapus területét jelöli",
            "A leshatárt jelöli"
          ],
          c: 0,
          e: "A gólvonal jelöli azt a vonalat, amelyen a labdának át kell haladnia a gólhoz.",
          r: "102/5"
        },
        {
          id: "T00_L1_Q_012",
          q: "Hány játékost nevezhet legfeljebb egy csapat egy mérkőzésre?",
          o: ["Legfeljebb 20 játékost", "Legfeljebb 15 játékost", "Legfeljebb 22 játékost"],
          c: 0,
          e: "Minden csapat legfeljebb 20 játékost nevezhet.",
          r: "301/1"
        },
        {
          id: "T00_L1_Q_014",
          q: "Hány játékos tartózkodhat egy csapatból egyszerre a játéktéren?",
          o: ["Legfeljebb 6 (5 mezőny + 1 kapus)", "Legfeljebb 5", "Legfeljebb 7"],
          c: 0,
          e: "Egyszerre legfeljebb 6 játékos lehet a pályán csapatonként.",
          r: "301/2"
        },
        {
          id: "T00_L1_Q_029",
          q: "Mennyi a rendes játékidő főszabály szerint?",
          o: ["3 x 20 perc", "2 x 45 perc", "4 x 15 perc"],
          c: 0,
          e: "A rendes játékidő 3 x 20 perc.",
          r: "201/1"
        }
      ],
      L2: [],
      L3: []
    },
    T01_RINK: {
      L1: [
        {
          id: "T01_L1_Q_001",
          q: "Mekkora a szabványos játéktér mérete?",
          o: ["40 x 20 méter", "38 x 19 méter", "42 x 22 méter"],
          c: 0,
          e: "40m x 20m a szabvány.",
          r: "101/1"
        },
        {
          id: "T01_L1_Q_004",
          q: "Mekkora a kapuelőtér mérete?",
          o: ["4 x 5 méter", "3 x 4 méter", "5 x 6 méter"],
          c: 0,
          e: "A kapuelőterek mérete 4x5m.",
          r: "102/3"
        },
        {
          id: "T01_L1_Q_005",
          q: "Mekkora a kapusterület mérete?",
          o: ["1 x 2,5 méter", "2 x 3 méter", "1.5 x 2.5 méter"],
          c: 0,
          e: "A kapusterületek mérete 1x2,5m.",
          r: "102/4"
        }
      ],
      L2: [],
      L3: []
    },
    T02_TIME: {
      L1: [
        {
          id: "T02_L1_Q_001",
          q: "Mennyi a szünetek hossza?",
          o: ["10 perc", "5 perc", "15 perc"],
          c: 0,
          e: "A szünetek 10 percesek.",
          r: "201/1"
        }
      ],
      L2: [],
      L3: []
    },
    T03_PART: {
      L1: [
        {
          id: "T03_L1_Q_001",
          q: "Hány csapatkapitánya lehet egy csapatnak?",
          o: ["Egy", "Kettő", "Három"],
          c: 0,
          e: "Mindegyik csapatnak egy kapitánya van.",
          r: "304/1"
        }
      ],
      L2: [],
      L3: []
    },
    T04_EQUI: {
      L1: [
        {
          id: "T04_L1_Q_001",
          q: "Milyen cipőt kell viselni?",
          o: ["Teremsport cipőt", "Futócipőt", "Stoplist"],
          c: 0,
          e: "Teremsportokra tervezett modellt kell viselni.",
          r: "401/4"
        }
      ],
      L2: [],
      L3: []
    },
    T05_RST: {
      L1: [
        {
          id: "T05_L1_Q_001",
          q: "Mi a teendő, ha a labda elhagyja a pályát?",
          o: ["Beütés", "Húzás", "Szabadütés"],
          c: 0,
          e: "Beütés jár a vétlen csapatnak.",
          r: "504/1"
        }
      ],
      L2: [],
      L3: []
    },
    T06_PEN: {
      L1: [
        {
          id: "T06_L1_Q_001",
          q: "Mennyi ideig tart egy kisbüntetés?",
          o: ["2 perc", "5 perc", "10 perc"],
          c: 0,
          e: "A kisbüntetés 2 perc.",
          r: "604/1"
        }
      ],
      L2: [],
      L3: []
    },
    T07_GOAL: {
      L1: [
        {
          id: "T07_L1_Q_001",
          q: "Mikor érvényes a gól?",
          o: [
            "Ha a labda teljes terjedelmével áthalad a gólvonalon",
            "Ha érinti a gólvonalat",
            "Ha a hálóba ér"
          ],
          c: 0,
          e: "Teljes terjedelmével át kell haladnia.",
          r: "702/1"
        }
      ],
      L2: [],
      L3: []
    }
  }
};

// --- 2. KONFIGURÁCIÓ ---
const CONFIG = {
  STORAGE_KEY: "fb_v12_embedded",
  WELCOME_KEY: "fb_welcome_seen",
  LEVELS: ["L1", "L2", "L3"],
  MULTI_MAX_QUESTIONS: 10,
  ROUND_TIME: 30
};

// --- 3. SEGÉDFÜGGVÉNYEK ---
const $ = (s) => document.querySelector(s);

function seededRandom(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray(array) {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex]
    ];
  }
  return array;
}

// Analytics wrapper
const Analytics = {
  track(eventName, eventData) {
    try {
      if (
        typeof window !== "undefined" &&
        window.umami &&
        typeof window.umami.track === "function"
      ) {
        window.umami.track(eventName, eventData);
      }
    } catch (e) {
      console.warn(e);
    }
  }
};

// Firebase (ha van net, betöltődik)
const firebaseConfig = {
  apiKey: "AIzaSyCAVPTDjt0nAGrcu-S0XAn87_6g6BfUgvg",
  authDomain: "floorballszabalyok-hu.firebaseapp.com",
  databaseURL:
    "https://floorballszabalyok-hu-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "floorballszabalyok-hu",
  storageBucket: "floorballszabalyok-hu.appspot.com",
  messagingSenderId: "171694131350",
  appId: "1:171694131350:web:c713d121fd781fe7df9ab7"
};

function initFirebaseSafe() {
  try {
    const fb =
      typeof window !== "undefined" && window.firebase
        ? window.firebase
        : typeof firebase !== "undefined"
        ? firebase
        : null;
    if (fb && (!fb.apps || !fb.apps.length)) fb.initializeApp(firebaseConfig);
  } catch (e) {
    console.error("FB init error", e);
  }
}
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initFirebaseSafe);
} else {
  initFirebaseSafe();
}

// Ikonok
const LIFE_SVG = `
<svg class="life-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="6"/>
  <circle cx="50" cy="50" r="9" fill="currentColor"/>
  <circle cx="50" cy="18" r="7" fill="currentColor"/>
  <circle cx="50" cy="82" r="7" fill="currentColor"/>
  <circle cx="18" cy="50" r="7" fill="currentColor"/>
  <circle cx="82" cy="50" r="7" fill="currentColor"/>
  <circle cx="73" cy="27" r="6" fill="currentColor"/>
  <circle cx="27" cy="27" r="6" fill="currentColor"/>
  <circle cx="73" cy="73" r="6" fill="currentColor"/>
  <circle cx="27" cy="73" r="6" fill="currentColor"/>
</svg>`;

// --- 4. FŐ ALKALMAZÁS ---
const app = {
  user: { progress: {}, theme: "light", streak: 0, roastIndex: 0 },
  session: { topic: null, level: null, qList: [], idx: 0, lives: 3 },

  db: null,
  topics: [],
  questionIndex: {},

  // Multi változók
  currentRoomId: null,
  myPlayerId: null,
  roomRef: null,
  seed: null,
  timerInterval: null,
  hasAnsweredThisRound: false,
  lastEvaluatedRound: 0,
  waitingTimeoutId: null,
  deferredPrompt: null,

  async init() {
    this.loadUser();
    this.bindUI();
    this.applyTheme();

    // Adatbázis betöltése a beépített objektumból
    this.db = HARDCODED_DB.data;
    this.topics = HARDCODED_DB.topics;

    this.buildQuestionIndex();
    this.renderMenu();
    this.checkWelcome();
    this.initInstallButton();

    // URL paraméter (szoba meghívó)
    const urlParams = new URLSearchParams(window.location.search);
    let roomId = urlParams.get("room");
    if (roomId) {
      if (/^[A-Z0-9]{4,10}$/.test(roomId)) {
        this.joinGame(roomId);
      } else {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    Analytics.track("app_loaded_embedded");
  },

  bindUI() {
    window.addEventListener("beforeunload", () => {
      if (this.myPlayerId === "host" && this.roomRef) {
        this.roomRef.remove().catch((e) => console.error(e));
      }
    });
  },

  loadUser() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.user = { ...this.user, ...parsed };
      }
    } catch (e) {
      console.warn(e);
    }
  },

  saveUser() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.user));
    } catch (e) {
      console.warn(e);
    }
    this.calculateAndShowGlobalStats();
  },

  toggleTheme() {
    this.user.theme = this.user.theme === "light" ? "dark" : "light";
    this.saveUser();
    this.applyTheme();
  },

  applyTheme() {
    const icon = document.getElementById("theme-icon");
    if (this.user.theme === "dark") {
      document.body.classList.add("dark-mode");
      if (icon) {
        icon.classList.remove("ph-moon");
        icon.classList.add("ph-sun");
      }
    } else {
      document.body.classList.remove("dark-mode");
      if (icon) {
        icon.classList.remove("ph-sun");
        icon.classList.add("ph-moon");
      }
    }
  },

  // --- NAVIGÁCIÓ ---
  clearWaitingTimeout() {
    if (this.waitingTimeoutId) {
      clearTimeout(this.waitingTimeoutId);
      this.waitingTimeoutId = null;
    }
  },

  showScreen(id) {
    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.remove("active"));
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
    window.scrollTo(0, 0);
  },

  toggleScreen(id) {
    this.showScreen(id);
  },

  menu() {
    if (this.roomRef) {
      this.roomRef.off();
      if (this.myPlayerId === "host") {
        this.roomRef.remove().catch(() => {});
      }
      this.roomRef = null;
    }
    this.currentRoomId = null;
    this.myPlayerId = null;

    this.clearWaitingTimeout();
    this.stopTimer();

    this.showScreen("s-menu");
    this.renderMenu();
  },

  // --- MENÜ ÉS ADAT ---
  buildQuestionIndex() {
    this.questionIndex = {};
    if (!this.db) return;
    this.topics.forEach((topicMeta) => {
      const topicId = topicMeta.id;
      const topicData = this.db[topicId] || {};
      CONFIG.LEVELS.forEach((lvl) => {
        const arr = topicData[lvl] || [];
        arr.forEach((q) => {
          if (q.id) this.questionIndex[q.id] = q;
        });
      });
    });
  },

  renderMenu() {
    const container = document.getElementById("topic-container");
    if (!container) return;
    container.innerHTML = "";

    this.calculateAndShowGlobalStats();

    this.topics.forEach((topicMeta, index) => {
      const topicId = topicMeta.id;
      const topicName = `${index + 1}) ${topicMeta.name}`;
      const topicData = this.db[topicId] || {};

      let tTotal = 0;
      let tAns = 0;
      let l1Done = false,
        l2Done = false,
        l3Done = false;

      const l1T = (topicData["L1"] || []).length;
      const l1A = (this.user.progress[topicId]?.["L1"] || []).length;
      if (l1T > 0 && l1A >= l1T) l1Done = true;

      const l2T = (topicData["L2"] || []).length;
      const l2A = (this.user.progress[topicId]?.["L2"] || []).length;
      if (l2T > 0 && l2A >= l2T) l2Done = true;

      const l3T = (topicData["L3"] || []).length;
      const l3A = (this.user.progress[topicId]?.["L3"] || []).length;
      if (l3T > 0 && l3A >= l3T) l3Done = true;

      tTotal = l1T + l2T + l3T;
      tAns =
        Math.min(l1A, l1T) + Math.min(l2A, l2T) + Math.min(l3A, l3T);

      const percent = tTotal > 0 ? Math.round((tAns / tTotal) * 100) : 0;
      const mastered = l1Done && l2Done && l3Done && tTotal > 0;

      const card = document.createElement("div");
      card.className = "topic-card";
      if (mastered) card.classList.add("mastered");

      card.innerHTML = `
        <div class="card-top">
          <div class="t-title">${topicName}</div>
          <div class="t-badge ${mastered ? "done" : ""}">${percent}%</div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${percent}%;"></div>
        </div>
        <div class="topic-level-row">
          <img src="img/beginner_badge.png" class="topic-level-badge ${
            l1Done ? "active" : "inactive"
          }">
          <img src="img/intermediate_badge.png" class="topic-level-badge ${
            l2Done ? "active" : "inactive"
          }">
          <img src="img/expert_badge.png" class="topic-level-badge ${
            l3Done ? "active" : "inactive"
          }">
        </div>
      `;
      card.onclick = () => this.showLevels(topicId);
      container.appendChild(card);
    });
  },

  calculateAndShowGlobalStats() {
    let gTotal = 0;
    let gAns = 0;
    let allCompleted = true;

    this.topics.forEach((t) => {
      const tid = t.id;
      const d = this.db[tid] || {};
      let tMastered = true;
      CONFIG.LEVELS.forEach((lvl) => {
        const total = (d[lvl] || []).length;
        const ans = (this.user.progress[tid]?.[lvl] || []).length;
        gTotal += total;
        gAns += Math.min(ans, total);
        if (total > 0 && ans < total) tMastered = false;
      });
      if (!tMastered) allCompleted = false;
    });

    const elAns = document.getElementById("stat-answered");
    const elTot = document.getElementById("stat-total");
    const elStr = document.getElementById("stat-streak");
    const elBadge = document.getElementById("total-badge");
    const elFill = document.getElementById("total-progress-fill");
    const elMaster = document.getElementById("master-info");

    if (elAns) elAns.textContent = gAns;
    if (elTot) elTot.textContent = gTotal;
    if (elStr) elStr.textContent = this.user.streak;

    if (gTotal > 0) {
      const p = Math.round((gAns / gTotal) * 100);
      if (elBadge) elBadge.textContent = `${p}%`;
      if (elFill) elFill.style.width = `${p}%`;
    }
    if (elMaster)
      elMaster.style.display =
        allCompleted && gTotal > 0 ? "flex" : "none";
  },

  showLevels(topicId) {
    const topicMeta = this.topics.find((t) => t.id === topicId);
    if (!topicMeta) return;

    const lvlTitle = document.getElementById("lvl-title");
    if (lvlTitle) lvlTitle.textContent = topicMeta.name;

    const container = document.getElementById("level-container");
    if (!container) return;
    container.innerHTML = "";

    const topicData = this.db[topicId] || {};

    CONFIG.LEVELS.forEach((lvl) => {
      const qArr = topicData[lvl] || [];
      const total = qArr.length;
      const doneCount = (this.user.progress[topicId]?.[lvl] || []).length;
      const answered = Math.min(doneCount, total);

      let unlocked = false;
      if (lvl === "L1") unlocked = true;
      if (lvl === "L2") {
        const l1T = (topicData["L1"] || []).length;
        const l1A = (this.user.progress[topicId]?.["L1"] || []).length;
        if (l1T > 0 && l1A >= l1T) unlocked = true;
      }
      if (lvl === "L3") {
        const l2T = (topicData["L2"] || []).length;
        const l2A = (this.user.progress[topicId]?.["L2"] || []).length;
        if (l2T > 0 && l2A >= l2T) unlocked = true;
      }

      const isDone = total > 0 && answered >= total;
      const label =
        lvl === "L1" ? "Kezdő" : lvl === "L2" ? "Haladó" : "Profi";

      const div = document.createElement("div");
      div.className = "level-card " + (unlocked ? "" : "locked");
      div.innerHTML = `
        <div>
          <div class="l-name">${label}</div>
          <div class="l-stat">${answered} / ${total}</div>
        </div>
        <button class="btn-play ${isDone ? "done" : ""}" ${
        unlocked ? "" : "disabled"
      }>
          ${unlocked ? "Indítás" : "Zárolva"}
        </button>
      `;
      if (unlocked) {
        div.onclick = () => this.start(topicId, lvl, false);
      }
      container.appendChild(div);
    });

    this.showScreen("s-levels");
  },

  // --- GAME ---
  start(topic, level, isMulti = false, qIds = null) {
    let qList = [];

    if (isMulti) {
      if (Array.isArray(qIds)) {
        qList = qIds.map((id) => this.questionIndex[id]).filter(Boolean);
      }
    } else {
      const all = this.db[topic]?.[level] || [];
      qList = [...all];
      shuffleArray(qList);
    }

    if (!isMulti) {
      const solved = this.user.progress[topic]?.[level] || [];
      const toPlay = qList.filter((q) => !solved.includes(q.id));

      if (toPlay.length === 0) {
        if (
          confirm(
            "Már megoldottad az összes kérdést ezen a szinten.\nÚjraindítod gyakorlás módban?"
          )
        ) {
          this.session = {
            topic,
            level,
            qList,
            idx: 0,
            lives: 3,
            isMulti: false
          };
          Analytics.track("single_session_start", {
            topic,
            level,
            count: qList.length
          });
          this.showScreen("s-game");
          this.renderQ();
        }
        return;
      }

      this.session = {
        topic,
        level,
        qList: toPlay,
        idx: 0,
        lives: 3,
        isMulti: false
      };
      Analytics.track("single_session_start", {
        topic,
        level,
        count: toPlay.length
      });
    } else {
      const max = Math.min(CONFIG.MULTI_MAX_QUESTIONS, qList.length);
      qList = qList.slice(0, max);
      this.session = {
        topic: "MULTI",
        level: "MULTI",
        qList,
        idx: 0,
        lives: 3,
        isMulti: true,
        roundNumber: 1,
        totalRounds: max
      };
      Analytics.track("multi_session_start", { totalRounds: max });
    }

    this.hasAnsweredThisRound = false;
    this.lastEvaluatedRound = 0;
    this.showScreen("s-game");
    this.renderQ();
  },

  renderQ() {
    const q = this.session.qList[this.session.idx];
    if (!q) {
      this.end(true);
      return;
    }

    const livesEl = document.getElementById("g-lives");
    const tBar = document.getElementById("timer-bar");
    const mBadge = document.getElementById("multi-badge");
    const rInd = document.getElementById("round-indicator");
    const qRem = document.getElementById("q-remaining");
    const qLabel = document.getElementById("q-label");

    if (this.session.isMulti) {
      if (livesEl) livesEl.style.display = "none";
      if (tBar) tBar.style.display = "block";
      if (mBadge) mBadge.style.display = "block";
      if (rInd) {
        rInd.style.display = "inline";
        rInd.innerText = `Kör: ${this.session.roundNumber}/${this.session.totalRounds}`;
      }
      if (qLabel) qLabel.style.display = "none";
      if (qRem) qRem.style.display = "none";
      this.startTimer();
    } else {
      if (livesEl) {
        livesEl.style.display = "block";
        this.renderLives();
      }
      if (tBar) tBar.style.display = "none";
      if (mBadge) mBadge.style.display = "none";
      if (rInd) rInd.style.display = "none";

      // A "Hátralévő kérdések" indikátort nem használjuk, teljesen elrejtjük
      if (qLabel) qLabel.style.display = "none";
      if (qRem) qRem.style.display = "none";
    }

    const qTextEl = document.getElementById("q-text");
    if (qTextEl) qTextEl.textContent = q.q;

    const cont = document.getElementById("g-opts");
    const feed = document.getElementById("g-feed");
    if (cont) {
      cont.innerHTML = "";
      cont.style.display = "block";
    }
    if (feed) feed.style.display = "none";

    const pEl = document.getElementById("g-prog");
    if (pEl) {
      const pct = Math.round(
        (this.session.idx / this.session.qList.length) * 100
      );
      pEl.style.width = pct + "%";
    }

    let idxs = [0, 1, 2];
    if (this.session.isMulti) {
      const s = this.seed + this.session.idx;
      const r = seededRandom(s);
      for (let i = 2; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
      }
    } else {
      shuffleArray(idxs);
    }

    idxs.forEach((i) => {
      const btn = document.createElement("div");
      btn.className = "btn-opt";
      btn.textContent = q.o[i];
      btn.onclick = () => {
        if (!this.hasAnsweredThisRound) this.check(i, btn);
      };
      cont.appendChild(btn);
    });
  },

  renderLives() {
    const el = document.getElementById("g-lives");
    if (el) el.innerHTML = LIFE_SVG.repeat(Math.max(this.session.lives, 0));
  },

  check(i, btn) {
    const q = this.session.qList[this.session.idx];
    const isOk = i === q.c;

    if (this.session.isMulti) {
      this.hasAnsweredThisRound = true;
      const u = {};
      u[this.myPlayerId === "host" ? "hostAnswer" : "guestAnswer"] = isOk
        ? "correct"
        : "wrong";
      if (this.roomRef) this.roomRef.update(u);
      btn.style.opacity = "0.7";
      btn.innerText += " ⏳";
      this.stopTimer();
    } else {
      if (isOk) {
        this.user.streak++;
        this.saveProgress(q.id);
      } else {
        this.user.streak = 0;
        this.session.lives--;
        const lEl = document.getElementById("g-lives");
        if (lEl) {
          lEl.classList.add("shake");
          setTimeout(() => lEl.classList.remove("shake"), 500);
        }
        if (navigator.vibrate) navigator.vibrate(200);
      }
      this.saveUser();
      this.showFeedback(isOk, q);
    }
  },

  saveProgress(qid) {
    const t = this.session.topic;
    const l = this.session.level;
    if (!this.user.progress[t]) this.user.progress[t] = {};
    if (!this.user.progress[t][l]) this.user.progress[t][l] = [];
    if (!this.user.progress[t][l].includes(qid)) {
      this.user.progress[t][l].push(qid);
    }
  },

  showFeedback(isOk, q) {
    this.renderLives();
    const opts = document.getElementById("g-opts");
    if (opts) opts.style.display = "none";

    const f = document.getElementById("g-feed");
    if (!f) return;
    f.style.display = "block";
    f.className = isOk ? "feedback ok" : "feedback bad";

    let btnHtml = "";
    if (this.session.lives > 0) {
      const last = this.session.qList.length - this.session.idx === 1;
      btnHtml = `<button class="btn-main btn-main--next" onclick="app.next()">${
        last ? "BEFEJEZÉS 🏁" : "KÖVETKEZŐ ➜"
      }</button>`;
    } else {
      setTimeout(() => this.end(false), 2000);
    }

    f.innerHTML = `
      <div style="font-weight:900;font-size:1.2rem;margin-bottom:10px;">
        ${isOk ? "✅ Helyes!" : "❌ Helytelen!"}
      </div>
      <div style="background:rgba(0,0,0,0.05);padding:10px;border-radius:10px;margin-bottom:15px;font-size:0.9rem;color:var(--text-main);">
        <strong>Helyes válasz:</strong><br>${q.o[q.c]}
      </div>
      <div style="line-height:1.5;margin-bottom:10px;color:var(--text-main);">
        ${q.e || ""}
      </div>
      ${q.r ? `<div class="ref-code">SZABÁLY: ${q.r}</div>` : ""}
      ${btnHtml}
    `;
    f.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },

  next() {
    this.session.idx++;
    if (this.session.idx < this.session.qList.length) {
      this.renderQ();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      this.end(true);
    }
  },

  end(win) {
    this.showScreen("s-end");
    const tEl = document.getElementById("end-title");
    const mEl = document.getElementById("end-msg");
    const iEl = document.getElementById("end-icon");
    const sEl = document.getElementById("end-score");

    if (!this.session.isMulti && sEl) {
      sEl.style.display = "block";
      sEl.innerText = `${this.session.idx}/${this.session.qList.length}`;
    } else if (sEl) {
      sEl.style.display = "none";
    }

    if (win) {
      if (iEl) iEl.innerText = "🎉";
      if (tEl) tEl.innerText = "Kör vége";
      if (mEl) {
        mEl.innerText = "Szép munka! Csak így tovább!";
        mEl.style.color = "";
      }
    } else {
      if (iEl) iEl.innerText = "💀";
      const roasts = [
        "A szabálykönyv nem harap!",
        "Ez most nem jött össze.",
        "Próbáld újra!"
      ];
      const roast = roasts[this.user.roastIndex % roasts.length];
      this.user.roastIndex = (this.user.roastIndex + 1) % roasts.length;
      this.saveUser();
      if (tEl) tEl.innerText = roast;
      if (mEl) {
        mEl.innerText = "Game Over";
        mEl.style.color = "var(--error)";
      }
    }

    if (!this.session.isMulti) {
      Analytics.track("single_session_end", {
        topic: this.session.topic,
        level: this.session.level,
        answered: this.session.idx,
        total: this.session.qList.length,
        win: !!win
      });
    }

    const actions = document.getElementById("end-actions");
    if (actions) {
      actions.innerHTML = `
        <button class="btn-main btn-main--secondary" onclick="app.menu()">Vissza a főmenübe</button>
      `;
    }
  },

  // --- MULTI ---
  startChallengeMode() {
    if (typeof firebase === "undefined" || !firebase.apps.length) {
      alert("A Párbaj módhoz internetkapcsolat szükséges.");
      return;
    }
    const rid = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.currentRoomId = rid;
    this.myPlayerId = "host";

    const allIds = Object.keys(this.questionIndex);
    const sh = shuffleArray([...allIds]);
    const qs = sh.slice(0, CONFIG.MULTI_MAX_QUESTIONS);
    const seed = Math.floor(Math.random() * 1e9);

    this.roomRef = firebase.database().ref("rooms/" + rid);
    this.roomRef
      .set({
        status: "waiting",
        seed,
        round: 1,
        hostAnswer: "pending",
        guestAnswer: "pending",
        questions: qs,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      })
      .then(() => {
        const hostModal = document.getElementById("host-modal");
        if (hostModal) hostModal.classList.add("open");
        const input = document.getElementById("share-link-input");
        if (input) {
          input.value = `${window.location.origin}${window.location.pathname}?room=${rid}`;
        }
        this.roomRef.on("value", (s) => this.onRoomUpdate(s.val()));
        Analytics.track("multi_room_created", {
          roomId: rid,
          questionCount: qs.length
        });
      });
  },

  joinGame(rid) {
    if (typeof firebase === "undefined") return;
    this.currentRoomId = rid;
    this.myPlayerId = "guest";
    this.roomRef = firebase.database().ref("rooms/" + rid);
    this.roomRef
      .once("value")
      .then((s) => {
        const d = s.val();
        const modal = document.getElementById("challenge-modal");
        if (d && d.status === "waiting" && modal) {
          modal.classList.add("open");
        } else {
          alert("A szoba nem elérhető.");
          this.menu();
        }
      })
      .catch(() => this.menu());
  },

  acceptChallenge() {
    const modal = document.getElementById("challenge-modal");
    if (modal) modal.classList.remove("open");
    if (!this.roomRef) return;
    this.roomRef.update({ status: "playing" }).then(() => {
      this.roomRef.on("value", (s) => this.onRoomUpdate(s.val()));
    });
  },

  rejectChallenge() {
    const modal = document.getElementById("challenge-modal");
    if (modal) modal.classList.remove("open");
    this.menu();
  },

  cancelHost() {
    if (this.roomRef) this.roomRef.remove();
    const modal = document.getElementById("host-modal");
    if (modal) modal.classList.remove("open");
    this.menu();
  },

  shareLink() {
    const i = document.getElementById("share-link-input");
    if (!i) return;
    i.select();
    document.execCommand("copy");
    alert("Link másolva!");
  },

  onRoomUpdate(d) {
    if (!d) {
      if (this.currentRoomId) {
        alert("A szoba bezárult.");
        this.menu();
      }
      return;
    }

    if (d.status === "playing") {
      const hostModal = document.getElementById("host-modal");
      const waitingModal = document.getElementById("waiting-modal");
      if (hostModal) hostModal.classList.remove("open");
      if (waitingModal) waitingModal.classList.remove("open");
      if (!this.session.isMulti) {
        this.seed = d.seed;
        this.start("MULTI", "MULTI", true, d.questions);
        this.session.roundNumber = d.round || 1;
      }
    }

    if (this.session.isMulti && d.round === this.session.roundNumber) {
      const mA =
        this.myPlayerId === "host" ? d.hostAnswer : d.guestAnswer;
      const oA =
        this.myPlayerId === "host" ? d.guestAnswer : d.hostAnswer;

      const wm = document.getElementById("waiting-modal");
      if (wm) {
        if (mA !== "pending" && oA === "pending") {
          wm.classList.add("open");
        } else {
          wm.classList.remove("open");
        }
      }

      if (d.hostAnswer !== "pending" && d.guestAnswer !== "pending") {
        this.evaluateRound(d.hostAnswer, d.guestAnswer, d.round);
      }
    }

    if (this.session.isMulti && d.round > this.session.roundNumber) {
      this.startNextMultiRound(d.round);
    }
  },

  evaluateRound(h, g, cr) {
    if (this.lastEvaluatedRound === cr) return;
    this.lastEvaluatedRound = cr;
    this.stopTimer();
    setTimeout(() => {
      if (h === "correct" && g === "correct") {
        if (cr >= this.session.totalRounds) {
          this.endMultiGame("draw", "Mindketten hibátlanok voltatok!");
        } else if (this.myPlayerId === "host" && this.roomRef) {
          this.roomRef.update({
            round: cr + 1,
            hostAnswer: "pending",
            guestAnswer: "pending"
          });
        }
      } else if (h === "wrong" && g === "wrong") {
        this.endMultiGame("draw", "Mindketten rontottatok!");
      } else {
        const w = h === "correct" ? "host" : "guest";
        this.endMultiGame(this.myPlayerId === w ? "win" : "lose");
      }
    }, 1500);
  },

  startNextMultiRound(rn) {
    this.session.roundNumber = rn;
    this.session.idx++;
    this.hasAnsweredThisRound = false;
    this.renderQ();
  },

  endMultiGame(res, msg) {
    this.showScreen("s-end");
    this.stopTimer();
    const waitingModal = document.getElementById("waiting-modal");
    if (waitingModal) waitingModal.classList.remove("open");

    const t = document.getElementById("end-title");
    const m = document.getElementById("end-msg");
    const i = document.getElementById("end-icon");
    const s = document.getElementById("end-score");
    if (s) s.style.display = "none";

    if (res === "win") {
      if (t) t.innerText = "GYŐZELEM!";
      if (i) i.innerText = "🏆";
      if (m) m.innerText = "Az ellenfeled hibázott. Te vagy a bajnok!";
    } else if (res === "lose") {
      if (t) t.innerText = "VERESÉG";
      if (i) i.innerText = "💀";
      if (m) m.innerText = "Te hibáztál.";
    } else {
      if (t) t.innerText = "DÖNTETLEN";
      if (i) i.innerText = "🤝";
      if (m) m.innerText = msg || "Döntetlen játék.";
    }

    Analytics.track("multi_session_end", { result: res });

    if (this.roomRef) {
      this.roomRef.update({ status: "finished" });
    }
  },

  startTimer() {
    this.stopTimer();
    const f = document.getElementById("timer-fill");
    if (!f) return;
    f.style.width = "100%";
    f.style.transition = `width ${CONFIG.ROUND_TIME}s linear`;
    void f.offsetWidth;
    f.style.width = "0%";
    this.timerInterval = setTimeout(
      () => this.handleTimeout(),
      CONFIG.ROUND_TIME * 1000
    );
  },

  stopTimer() {
    if (this.timerInterval) clearTimeout(this.timerInterval);
    this.timerInterval = null;
    const f = document.getElementById("timer-fill");
    if (f) {
      f.style.transition = "none";
      f.style.width = getComputedStyle(f).width;
    }
  },

  handleTimeout() {
    if (this.session.isMulti && !this.hasAnsweredThisRound && this.roomRef) {
      this.hasAnsweredThisRound = true;
      const u = {};
      u[this.myPlayerId === "host" ? "hostAnswer" : "guestAnswer"] = "wrong";
      this.roomRef.update(u);
    }
  },

  // --- EGYÉB UI ---
  checkWelcome() {
    if (!localStorage.getItem(CONFIG.WELCOME_KEY)) {
      const m = document.getElementById("welcome-modal");
      if (m) m.classList.add("open");
    }
  },

  toggleWelcome() {
    const m = document.getElementById("welcome-modal");
    if (!m) return;
    if (m.classList.contains("open")) {
      m.classList.remove("open");
      localStorage.setItem(CONFIG.WELCOME_KEY, "1");
    } else {
      m.classList.add("open");
    }
  },

  toggleInfo() {
    const m = document.getElementById("info-modal");
    if (m) m.classList.toggle("open");
  },

  toggleResetModal() {
    const m = document.getElementById("reset-modal");
    if (m) m.classList.toggle("open");
  },

  fullReset() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    localStorage.removeItem(CONFIG.WELCOME_KEY);
    location.reload();
  },

  showRules() {
    window.open("Floorball_Jatekszabalyok_2022_FINAL.pdf", "_blank");
  },

  downloadCert() {
    const el = document.getElementById("certificate");
    if (el && window.html2canvas) {
      window.html2canvas(el).then((c) => {
        const l = document.createElement("a");
        l.download = "floorball_mester.png";
        l.href = c.toDataURL();
        l.click();
      });
    }
  },

  initInstallButton() {
    const b = document.getElementById("install-btn");
    if (!b) return;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      b.style.display = "block";
    });
  },

  triggerInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt = null;
      const b = document.getElementById("install-btn");
      if (b) b.style.display = "none";
    }
  },

  closeIosInstall() {
    const m = document.getElementById("ios-install-modal");
    if (m) m.classList.remove("open");
  }
};

// INDÍTÁS
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => app.init());
} else {
  app.init();
}
