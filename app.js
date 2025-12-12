// --- APP.JS vFixed (FloorballSzabályok) ---

// --- KONFIGURÁCIÓ ---
const CONFIG = {
  STORAGE_KEY: "fb_v11_lux",
  WELCOME_KEY: "fb_welcome_seen",
  DB_URL: "database.json", // Fontos: ez a fájlnév legyen a gyökérkönyvtárban
  LEVELS: ["L1", "L2", "L3"],
  MULTI_MAX_QUESTIONS: 10,
  ROUND_TIME: 30, // másodperc / kör
  FIREBASE_URL: "https://floorball-duel-default-rtdb.firebaseio.com/" // Ha nem a teljes configot használod
};

// --- SEGÉDFÜGGVÉNYEK ---
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Seedelt random – multiplayer szinkronhoz
function seededRandom(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Egyszerű shuffle
function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// --- ANALYTICS (UMAMI) ---
const Analytics = {
  track(eventName, eventData) {
    try {
      if (typeof window !== "undefined" && window.umami && typeof window.umami.track === "function") {
        window.umami.track(eventName, eventData);
      }
    } catch (e) {
      console.warn("Umami track hiba:", e);
    }
  }
};

// --- FIREBASE KONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyCAVPTDjt0nAGrcu-S0XAn87_6g6BfUgvg",
  authDomain: "floorballszabalyok-hu.firebaseapp.com",
  databaseURL: "https://floorballszabalyok-hu-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "floorballszabalyok-hu",
  storageBucket: "floorballszabalyok-hu.appspot.com",
  messagingSenderId: "171694131350",
  appId: "1:171694131350:web:c713d121fd781fe7df9ab7"
};

function initFirebaseSafe() {
  try {
    const fb = (typeof window !== "undefined" && window.firebase) ? window.firebase : (typeof firebase !== "undefined" ? firebase : null);
    if (fb) {
      if (!fb.apps || !fb.apps.length) fb.initializeApp(firebaseConfig);
      console.log("Firebase OK");
    } else {
      console.warn("Firebase SDK nem érhető el.");
    }
  } catch (e) {
    console.error("Firebase init hiba:", e);
  }
}

// Init futtatása
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initFirebaseSafe);
} else {
  initFirebaseSafe();
}

// --- KONSTANSOK ÉS HTML ELEMEK ---
const LIFE_SVG = `<svg class="life-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="6"/><circle cx="50" cy="50" r="9" fill="currentColor"/><circle cx="50" cy="18" r="7" fill="currentColor"/><circle cx="50" cy="82" r="7" fill="currentColor"/><circle cx="18" cy="50" r="7" fill="currentColor"/><circle cx="82" cy="50" r="7" fill="currentColor"/><circle cx="73" cy="27" r="6" fill="currentColor"/><circle cx="27" cy="27" r="6" fill="currentColor"/><circle cx="73" cy="73" r="6" fill="currentColor"/><circle cx="27" cy="73" r="6" fill="currentColor"/></svg>`;

const TOPIC_LABELS = {
  T00_BASE: "Alapfogalmak",
  T01_RINK: "Játéktér",
  T02_TIME: "Játékidő",
  T03_PART: "Résztvevők",
  T04_EQUI: "Felszerelés",
  T05_RST: "Rögzített helyzetek",
  T06_PEN: "Büntetések",
  T07_GOAL: "Gólok"
};

// --- FŐ ALKALMAZÁS OBJEKTUM ---
const app = {
  // Állapotváltozók
  user: {
    progress: {},
    theme: "light",
    masterShown: false,
    streak: 0,
    roastIndex: 0
  },
  session: { topic: null, level: null, qList: [], idx: 0, lives: 3 },
  
  // Adatbázis
  db: null,
  topics: [],
  questionIndex: {},

  // Multi
  currentRoomId: null,
  myPlayerId: null,
  roomRef: null,
  seed: null,
  timerInterval: null,
  hasAnsweredThisRound: false,
  lastEvaluatedRound: 0,
  waitingTimeoutId: null,
  deferredPrompt: null,

  // --- INIT ---
  async init() {
    console.log("App indítása...");
    const container = document.getElementById("topic-container");
    if (container) {
      container.innerHTML = '<div style="text-align:center; padding:20px;">Adatok betöltése...</div>';
    }

    try {
      // 1. Felhasználó betöltése LocalStorage-ból
      this.loadUser();
      
      // 2. UI Bindolása (gombok, események)
      this.bindUI();
      
      // 3. Téma alkalmazása
      this.applyTheme();

      // 4. Adatbázis letöltése
      const response = await fetch(CONFIG.DB_URL);
      if (!response.ok) throw new Error(`DB hiba: ${response.status}`);

      const jsonData = await response.json();
      this.db = jsonData.data;
      // Ha a JSON-ban 'topics' tömb van objektumokkal, azt használjuk, ha nincs, akkor a db kulcsait
      this.topics = jsonData.topics || Object.keys(this.db || {});

      // 5. Index építése multihoz
      this.buildQuestionIndex();

      // 6. Menü renderelése
      this.renderMenu();
      
      // 7. Welcome modal ellenőrzés
      this.checkWelcome();
      
      // 8. PWA install gomb
      this.initInstallButton();

      // 9. URL paraméter ellenőrzés (meghívásos játék)
      const urlParams = new URLSearchParams(window.location.search);
      let roomId = urlParams.get("room");
      if (roomId) {
        roomId = roomId.toUpperCase();
        if (/^[A-Z0-9]{4,10}$/.test(roomId)) {
          this.joinGame(roomId);
        } else {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      Analytics.track("app_loaded");

    } catch (error) {
      console.error("Kritikus hiba az init során:", error);
      if (container) {
        container.innerHTML = `Hiba az adatok betöltésekor (${error.message}). <br><br> Ellenőrizd, hogy fut-e a szerver (ha helyben vagy), vagy van-e internetkapcsolat.`;
      }
    }
  },

  // --- UI ESEMÉNYKEZELŐK ---
  bindUI() {
    // Biztonsági ellenőrzés, hogy léteznek-e az elemek
    const safeAddListener = (id, func) => {
        const el = document.getElementById(id);
        if(el) el.addEventListener("click", func);
    };

    // Navigáció és gombok
    // Mivel a HTML-ben inline 'onclick' attribútumok vannak (pl. onclick="app.menu()"),
    // itt nem feltétlenül kell mindent újra bindolni, de a tisztaság kedvéért a HTML-ből
    // érdemes lenne kivenni az inline JS-t. A jelenlegi HTML struktúráddal az inline működik,
    // de a "Share Link" és egyéb dinamikus elemekhez kellenek a függvények.
    
    // Globális esemény a bezárásra (multiplayer miatt)
    window.addEventListener("beforeunload", () => {
      if (this.myPlayerId === "host" && this.roomRef) {
        this.roomRef.remove().catch((err) => console.error("Szoba törlés hiba beforeunload:", err));
      }
    });
  },

  // --- LOCALSTORAGE KEZELÉS ---
  loadUser() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.user = {
          progress: parsed.progress || {},
          theme: parsed.theme || "light",
          masterShown: !!parsed.masterShown,
          streak: parsed.streak || 0,
          roastIndex: typeof parsed.roastIndex === "number" ? parsed.roastIndex : 0
        };
      }
    } catch (e) {
      console.warn("Nem sikerült beolvasni a mentett adatokat:", e);
    }
  },

  saveUser() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.user));
    } catch (e) {
      console.warn("Nem sikerült menteni az adatokat:", e);
    }
    this.renderMenuStats(); // Frissítsük a statisztikákat mentéskor
  },

  // --- TÉMA ---
  toggleTheme() {
    this.user.theme = this.user.theme === "light" ? "dark" : "light";
    this.saveUser();
    this.applyTheme();
    Analytics.track("toggle_theme", { theme: this.user.theme });
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

  // --- MENÜ ÉS NAVIGÁCIÓ ---
  toggleScreen(id) {
    this.showScreen(id); // Kompatibilitás
  },

  showScreen(id) {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        this._switchScreenInternal(id);
      });
    } else {
      this._switchScreenInternal(id);
    }
  },

  _switchScreenInternal(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
    window.scrollTo(0, 0);
    this.stateCurrentScreen = id;
  },

  menu() {
    // Takarítás, ha játékból jövünk vissza
    if (this.roomRef) {
      this.roomRef.off();
      if (this.myPlayerId === "host") {
        this.roomRef.remove().catch((err) => console.error("Szoba törlés hiba (menu):", err));
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

  // --- ADAT ÉS RENDERELÉS ---
  buildQuestionIndex() {
    this.questionIndex = {};
    if (!this.db) return;

    const topicsToUse = this.topics && this.topics.length
        ? this.topics.map((t) => (typeof t === "string" ? t : t.id))
        : Object.keys(this.db);

    topicsToUse.forEach((topicId) => {
      const topicData = this.db[topicId] || {};
      CONFIG.LEVELS.forEach((level) => {
        const arr = topicData[level] || [];
        if (!Array.isArray(arr)) return;
        arr.forEach((q) => {
          if (q && q.id) {
            this.questionIndex[q.id] = q;
          }
        });
      });
    });
  },

  getTopicName(topicId) {
    return TOPIC_LABELS[topicId] || topicId;
  },

  getLevelLabel(level) {
    switch (level) {
      case "L1": return "Kezdő";
      case "L2": return "Haladó";
      case "L3": return "Profi";
      default: return level;
    }
  },

  isLevelCompleted(topicId, level) {
    const topicData = this.db?.[topicId] || {};
    const total = (topicData[level] || []).length;
    const solvedIds = (this.user.progress?.[topicId]?.[level] || []);
    return total > 0 && solvedIds.length >= total;
  },

  isLevelUnlocked(topicId, level) {
    if (level === "L1") return true;
    if (level === "L2") return this.isLevelCompleted(topicId, "L1");
    if (level === "L3") return this.isLevelCompleted(topicId, "L2");
    return true;
  },

  renderMenu() {
    if (!this.db || !this.topics) return;

    const container = document.getElementById("topic-container");
    if (!container) return;

    container.innerHTML = "";
    let allCompleted = true;
    let globalTotal = 0;
    let globalAnswered = 0;

    (this.topics || []).forEach((topicMeta, index) => {
      const topicId = typeof topicMeta === "string" ? topicMeta : topicMeta.id;
      const rawName = typeof topicMeta === "string" ? topicMeta : (topicMeta.name || topicMeta.id);
      const topicName = `${index + 1}) ${rawName}`;
      
      const topicData = this.db[topicId] || {};
      let topicTotal = 0;
      let topicAnswered = 0;
      const levelStats = {};

      CONFIG.LEVELS.forEach((level) => {
        const qArr = topicData[level] || [];
        const total = qArr.length;
        const solvedIds = (this.user.progress[topicId]?.[level] || []);
        const answered = Math.min(solvedIds.length, total);

        levelStats[level] = { total, answered };
        topicTotal += total;
        topicAnswered += answered;
      });

      globalTotal += topicTotal;
      globalAnswered += topicAnswered;

      const topicPercent = topicTotal > 0 ? Math.round((topicAnswered / topicTotal) * 100) : 0;
      
      const l1Done = levelStats["L1"].total > 0 && levelStats["L1"].answered >= levelStats["L1"].total;
      const l2Done = levelStats["L2"].total > 0 && levelStats["L2"].answered >= levelStats["L2"].total;
      const l3Done = levelStats["L3"].total > 0 && levelStats["L3"].answered >= levelStats["L3"].total;
      
      const mastered = l1Done && l2Done && l3Done && topicTotal > 0;
      if (!mastered) allCompleted = false;

      const card = document.createElement("div");
      card.className = "topic-card";
      if (mastered) card.classList.add("mastered");

      card.innerHTML = `
        <div class="card-top">
          <div class="t-title">${topicName}</div>
          <div class="t-badge ${mastered ? "done" : ""}">${topicPercent}%</div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${topicPercent}%;"></div>
        </div>
        <div class="topic-level-row">
          <img src="img/beginner_badge.png" alt="L1" class="topic-level-badge ${l1Done ? "active" : "inactive"}">
          <img src="img/intermediate_badge.png" alt="L2" class="topic-level-badge ${l2Done ? "active" : "inactive"}">
          <img src="img/expert_badge.png" alt="L3" class="topic-level-badge ${l3Done ? "active" : "inactive"}">
        </div>
      `;

      card.addEventListener("click", () => {
        this.showLevels(topicId);
      });

      container.appendChild(card);
    });

    // Globális statisztikák frissítése
    this.updateGlobalStats(globalAnswered, globalTotal, allCompleted);
  },

  updateGlobalStats(answered, total, allCompleted) {
    const statAnswered = document.getElementById("stat-answered");
    const statTotal = document.getElementById("stat-total");
    const statStreak = document.getElementById("stat-streak");
    
    if (statAnswered) statAnswered.textContent = answered;
    if (statTotal) statTotal.textContent = total;
    if (statStreak) statStreak.textContent = this.user.streak || 0;

    const totalBadge = document.getElementById("total-badge");
    const totalProgressFill = document.getElementById("total-progress-fill");
    
    if (total > 0) {
      const percent = Math.round((answered / total) * 100);
      if (totalBadge) totalBadge.textContent = `${percent}%`;
      if (totalProgressFill) totalProgressFill.style.width = `${percent}%`;
    }

    const masterInfo = document.getElementById("master-info");
    if (masterInfo) {
      masterInfo.style.display = (allCompleted && total > 0) ? "flex" : "none";
    }
  },
  
  // Segédfüggvény statisztikák frissítésére mentéskor (ha nincs teljes újrarajzolás)
  renderMenuStats() {
      // Ezt hívhatjuk meg saveUser után, hogy ne kelljen az egész menüt újrarenderelni,
      // ha csak a fejléc számait akarjuk frissíteni. 
      // Egyszerűsítés végett most újrahívjuk a renderMenu-t a menüben, de játékközben elég a statokat.
      // A renderMenu megcsinálja a számítást.
  },

  showLevels(topicId) {
    const topicData = this.db[topicId] || {};
    const lvlTitle = document.getElementById("lvl-title");
    const levelContainer = document.getElementById("level-container");
    if (!lvlTitle || !levelContainer) return;

    const niceName = this.getTopicName(topicId);
    lvlTitle.textContent = niceName;
    levelContainer.innerHTML = "";

    CONFIG.LEVELS.forEach((level) => {
      const qArr = topicData[level] || [];
      const total = qArr.length;
      const solvedIds = (this.user.progress[topicId]?.[level] || []);
      const answered = Math.min(solvedIds.length, total);
      
      const unlocked = this.isLevelUnlocked(topicId, level);
      const done = this.isLevelCompleted(topicId, level);

      const card = document.createElement("div");
      card.className = "level-card";
      if (!unlocked) card.classList.add("locked");

      card.innerHTML = `
        <div>
          <div class="l-name">${this.getLevelLabel(level)}</div>
          <div class="l-stat">${answered} / ${total}</div>
        </div>
        <button type="button" class="btn-play ${done ? "done" : ""}" ${unlocked ? "" : "disabled"}>
          ${unlocked ? "Indítás" : "Zárolva"}
        </button>
      `;

      card.addEventListener("click", () => {
        if (unlocked) this.start(topicId, level, false);
      });

      levelContainer.appendChild(card);
    });

    this.showScreen("s-levels");
  },

  // --- JÁTÉK LOGIKA ---
  start(topic, level, isMulti = false, questionIds = null) {
    let qList = [];

    if (isMulti) {
      if (Array.isArray(questionIds) && questionIds.length) {
        qList = questionIds.map((id) => this.questionIndex[id]).filter(Boolean);
      }
    } else {
      if (!this.isLevelUnlocked(topic, level)) {
        alert("Először fejezd be az előző szintet!");
        return;
      }
      const allQ = this.db[topic][level] || [];
      qList = [...allQ];
    }

    // Keverés
    const randomFunc = (isMulti && this.seed) ? seededRandom(this.seed) : Math.random;
    // Saját shuffle logika adaptálása a randomFunc-hoz, vagy egyszerű tömbkeverés single-ben
    // Single-ben jó a sima shuffleArray
    if (!isMulti) {
        shuffleArray(qList);
    } else {
        // Multi shuffle (determinisztikus)
        let currentIndex = qList.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(randomFunc() * currentIndex);
            currentIndex--;
            [qList[currentIndex], qList[randomIndex]] = [qList[randomIndex], qList[currentIndex]];
        }
    }

    if (!isMulti) {
      const solvedIDs = this.user.progress[topic]?.[level] || [];
      const toPlay = qList.filter((q) => !solvedIDs.includes(q.id));

      if (toPlay.length === 0) {
        if (confirm("Már megoldottad az összes kérdést ezen a szinten.\nIndítsd újra gyakorlás módban?")) {
          // Újraindítás teljes listával
          this.session = {
            topic, level, qList: shuffleArray([...qList]), idx: 0, lives: 3, isMulti: false
          };
          this.showScreen("s-game");
          this.renderQ();
        }
        return;
      }
      this.session = { topic, level, qList: toPlay, idx: 0, lives: 3, isMulti: false };
    } else {
      // Multi setup
      const totalRounds = Math.min(CONFIG.MULTI_MAX_QUESTIONS, qList.length);
      qList = qList.slice(0, totalRounds);
      this.session = {
        topic: "MULTI", level: "MULTI", qList, idx: 0, lives: 3, isMulti: true,
        roundNumber: 1, totalRounds
      };
    }

    this.hasAnsweredThisRound = false;
    this.lastEvaluatedRound = 0;
    this.showScreen("s-game");
    this.renderQ();
  },

  renderQ() {
    const q = this.session.qList[this.session.idx];
    if (!q) {
      this.end(true); // vagy endMultiGame
      return;
    }

    // UI elemek beállítása (Timer, Lives, stb.)
    const livesEl = document.getElementById("g-lives");
    const timerBar = document.getElementById("timer-bar");
    const multiBadge = document.getElementById("multi-badge");
    const roundEl = document.getElementById("round-indicator");
    const qRemEl = document.getElementById("q-remaining");

    if (this.session.isMulti) {
      if (livesEl) livesEl.style.display = "none";
      if (timerBar) timerBar.style.display = "block";
      if (multiBadge) multiBadge.style.display = "block";
      if (roundEl) {
        roundEl.style.display = "inline";
        roundEl.innerText = `Kör: ${this.session.roundNumber} / ${this.session.totalRounds}`;
      }
      if (qRemEl) qRemEl.style.display = "none";
      this.startTimer();
    } else {
      if (livesEl) {
        livesEl.style.display = "block";
        this.renderLives();
      }
      if (timerBar) timerBar.style.display = "none";
      if (multiBadge) multiBadge.style.display = "none";
      if (roundEl) roundEl.style.display = "none";
      if (qRemEl) {
        qRemEl.style.display = "inline";
        qRemEl.innerText = this.session.qList.length - this.session.idx;
      }
    }

    document.getElementById("q-text").textContent = q.q;
    const cont = document.getElementById("g-opts");
    cont.innerHTML = "";
    cont.style.display = "block";
    document.getElementById("g-feed").style.display = "none";

    // Progress bar
    const progEl = document.getElementById("g-prog");
    if(progEl && this.session.qList.length) {
        const percent = Math.round((this.session.idx / this.session.qList.length) * 100);
        progEl.style.width = percent + "%";
    }

    // Válaszok keverése
    let indices = [0, 1, 2];
    const seedBase = this.session.isMulti ? (this.seed + this.session.idx) : Math.random();
    // Egyszerűsített keverés:
    if(this.session.isMulti) {
        // Multi esetén ugyanaz a sorrend kell
        const rnd = seededRandom(seedBase);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
    } else {
        shuffleArray(indices);
    }

    indices.forEach((idx) => {
      const btn = document.createElement("div");
      btn.className = "btn-opt";
      btn.textContent = q.o[idx];
      btn.onclick = () => {
        if (!this.hasAnsweredThisRound) this.check(idx, btn);
      };
      cont.appendChild(btn);
    });
  },

  renderLives() {
    const livesEl = document.getElementById("g-lives");
    if(!livesEl) return;
    livesEl.innerHTML = LIFE_SVG.repeat(Math.max(this.session.lives, 0));
  },

  check(i, btn) {
    const q = this.session.qList[this.session.idx];
    const isOk = (i === q.c);

    if (this.session.isMulti) {
      this.hasAnsweredThisRound = true;
      const update = {};
      update[this.myPlayerId === "host" ? "hostAnswer" : "guestAnswer"] = isOk ? "correct" : "wrong";
      if (this.roomRef) this.roomRef.update(update);
      
      btn.style.opacity = "0.7";
      btn.innerText += " ⏳";
      this.stopTimer();
    } else {
      // Single player
      if (isOk) {
        this.user.streak++;
        this.saveProgress(q.id);
      } else {
        this.user.streak = 0;
        this.session.lives--;
        this.shakeLives();
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
      this.saveUser();
    }
  },

  showFeedback(isOk, q) {
    this.renderLives();
    document.getElementById("g-opts").style.display = "none";
    
    const feed = document.getElementById("g-feed");
    feed.style.display = "block";
    feed.className = isOk ? "feedback ok" : "feedback bad";
    
    let btnHtml = "";
    if (this.session.lives > 0) {
        const isLast = (this.session.qList.length - this.session.idx === 1);
        btnHtml = `<button class="btn-main btn-main--next" onclick="app.next()">${isLast ? "BEFEJEZÉS 🏁" : "KÖVETKEZŐ ➜"}</button>`;
    } else {
        setTimeout(() => this.end(false), 2000);
    }

    feed.innerHTML = `
      <div style="font-weight:900; font-size:1.2rem; margin-bottom:10px;">${isOk ? "✅ Helyes!" : "❌ Helytelen!"}</div>
      <div style="background:rgba(0,0,0,0.05); padding:10px; border-radius:10px; margin-bottom:15px; font-size:0.9rem; color:var(--text-main);">
        <strong>A helyes válasz:</strong><br>${q.o[q.c]}
      </div>
      <div style="line-height:1.5; margin-bottom:10px; color:var(--text-main);">${q.e || ""}</div>
      ${q.r ? `<div class="ref-code">SZABÁLYKÖNYV: ${q.r}</div>` : ""}
      ${btnHtml}
    `;
    
    feed.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
    const titleEl = document.getElementById("end-title");
    const msgEl = document.getElementById("end-msg");
    const scoreEl = document.getElementById("end-score");
    const iconEl = document.getElementById("end-icon");

    if (this.session.isMulti) {
        // Multi end handled in endMultiGame, but safeguard here
        if(scoreEl) scoreEl.style.display = "none";
    } else {
        if(scoreEl) {
            scoreEl.style.display = "block";
            scoreEl.innerText = `${this.session.idx}/${this.session.qList.length}`;
        }
    }

    if (win) {
      iconEl.innerText = "🎉";
      titleEl.innerText = "Kör vége";
      msgEl.innerText = "Szép munka! Csak így tovább!";
      msgEl.style.color = "";
    } else {
      iconEl.innerText = "💀";
      const roasts = [
        "A szabálykönyv nem harap, nyugodtan kinyithatod!",
        "A bíró vak volt? Nem, most te nézted be...",
        "Irány a lelátó, ott könnyebb okosnak lenni!",
        "Ez most nem jött össze. Újra?"
      ];
      titleEl.innerText = roasts[this.user.roastIndex % roasts.length];
      this.user.roastIndex++;
      this.saveUser();
      
      msgEl.innerText = "Game Over";
      msgEl.style.color = "var(--error)";
    }

    const actions = document.getElementById("end-actions");
    actions.innerHTML = `
        <button class="btn-main btn-main--secondary" onclick="app.menu()">Vissza a főmenübe</button>
    `;
  },

  shakeLives() {
    const livesEl = document.getElementById("g-lives");
    if (livesEl) {
      livesEl.classList.add("shake");
      setTimeout(() => livesEl.classList.remove("shake"), 500);
    }
    if (navigator.vibrate) navigator.vibrate(200);
  },

  // --- MODALOK ÉS EGYÉB ---
  checkWelcome() {
    const seen = localStorage.getItem(CONFIG.WELCOME_KEY);
    if (!seen) {
      document.getElementById("welcome-modal").classList.add("open");
    }
  },
  toggleWelcome() {
    const m = document.getElementById("welcome-modal");
    if(m.classList.contains("open")) {
        m.classList.remove("open");
        localStorage.setItem(CONFIG.WELCOME_KEY, "1");
    } else {
        m.classList.add("open");
    }
  },
  toggleInfo() {
    document.getElementById("info-modal").classList.toggle("open");
  },
  toggleResetModal() {
    document.getElementById("reset-modal").classList.toggle("open");
  },
  fullReset() {
    localStorage.clear();
    location.reload();
  },
  
  showRules() {
    // PDF megnyitás logika
    const isDesktop = window.innerWidth >= 900 && !/Android|iPhone/i.test(navigator.userAgent);
    if (isDesktop) {
        window.open("Floorball_Jatekszabalyok_2022_FINAL.pdf", "_blank");
    } else {
        this.showScreen("s-rules");
    }
  },

  downloadCert() {
    const el = document.getElementById("certificate");
    if(el && window.html2canvas) {
        window.html2canvas(el).then(canvas => {
            const link = document.createElement("a");
            link.download = "floorball_mester.png";
            link.href = canvas.toDataURL();
            link.click();
        });
    }
  },

  // --- MULTIPLAYER (RÖVIDÍTVE, HOGY MŰKÖDJÖN) ---
  startChallengeMode() {
    if (typeof firebase === "undefined" || !firebase.apps.length) {
      alert("A multiplayerhez internet szükséges!");
      return;
    }
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.currentRoomId = roomId;
    this.myPlayerId = "host";
    
    // Kérdések kiválasztása
    const allIds = Object.keys(this.questionIndex);
    const shuffledIds = shuffleArray([...allIds]);
    const questionsForRoom = shuffledIds.slice(0, CONFIG.MULTI_MAX_QUESTIONS);
    const seed = Math.floor(Math.random() * 1e9);

    this.roomRef = firebase.database().ref("rooms/" + roomId);
    this.roomRef.set({
        status: "waiting",
        seed: seed,
        round: 1,
        hostAnswer: "pending",
        guestAnswer: "pending",
        questions: questionsForRoom,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        document.getElementById("host-modal").classList.add("open");
        const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        document.getElementById("share-link-input").value = link;
        
        this.roomRef.on("value", (snap) => this.onRoomUpdate(snap.val()));
    });
  },

  joinGame(roomId) {
    if (typeof firebase === "undefined" || !firebase.apps.length) return;
    this.currentRoomId = roomId;
    this.myPlayerId = "guest";
    this.roomRef = firebase.database().ref("rooms/" + roomId);
    
    this.roomRef.once("value").then(snap => {
        const data = snap.val();
        if(data && data.status === "waiting") {
            document.getElementById("challenge-modal").classList.add("open");
        } else {
            alert("A szoba nem elérhető.");
            this.menu();
        }
    });
  },

  acceptChallenge() {
    document.getElementById("challenge-modal").classList.remove("open");
    this.roomRef.update({ status: "playing" }).then(() => {
        this.roomRef.on("value", (snap) => this.onRoomUpdate(snap.val()));
    });
  },

  rejectChallenge() {
      document.getElementById("challenge-modal").classList.remove("open");
      this.menu();
  },

  cancelHost() {
      if(this.roomRef) this.roomRef.remove();
      document.getElementById("host-modal").classList.remove("open");
      this.menu();
  },

  shareLink() {
      const input = document.getElementById("share-link-input");
      input.select();
      document.execCommand("copy");
      alert("Link másolva!");
  },

  onRoomUpdate(data) {
      if(!data) {
          if(this.currentRoomId) { alert("A szoba bezárult."); this.menu(); }
          return;
      }
      
      if(data.status === "playing") {
          document.getElementById("host-modal").classList.remove("open");
          document.getElementById("waiting-modal").classList.remove("open");
          
          if(!this.session.isMulti) {
              this.seed = data.seed;
              this.start("MULTI", "MULTI", true, data.questions);
              this.session.roundNumber = data.round || 1;
          }
      }

      if(this.session.isMulti && data.round === this.session.roundNumber) {
          const myAns = this.myPlayerId === "host" ? data.hostAnswer : data.guestAnswer;
          const oppAns = this.myPlayerId === "host" ? data.guestAnswer : data.hostAnswer;
          
          if(myAns !== "pending" && oppAns === "pending") {
              document.getElementById("waiting-modal").classList.add("open");
          } else {
              document.getElementById("waiting-modal").classList.remove("open");
          }

          if(data.hostAnswer !== "pending" && data.guestAnswer !== "pending") {
              this.evaluateRound(data.hostAnswer, data.guestAnswer, data.round);
          }
      }
      
      if(this.session.isMulti && data.round > this.session.roundNumber) {
          this.startNextMultiRound(data.round);
      }
      
      if(data.status === "finished") {
          // Itt lehetne kezelni a rematch-et, most egyszerűsítve:
      }
  },

  evaluateRound(hAns, gAns, currentRound) {
      if(this.lastEvaluatedRound === currentRound) return;
      this.lastEvaluatedRound = currentRound;
      this.stopTimer();

      setTimeout(() => {
          if(hAns === "correct" && gAns === "correct") {
              if(currentRound >= this.session.totalRounds) {
                  this.endMultiGame("draw", "Mindketten hibátlanok voltatok!");
              } else if(this.myPlayerId === "host") {
                  this.roomRef.update({ round: currentRound + 1, hostAnswer: "pending", guestAnswer: "pending" });
              }
          } else if(hAns === "wrong" && gAns === "wrong") {
              this.endMultiGame("draw", "Mindketten rontottatok!");
          } else {
              const winner = hAns === "correct" ? "host" : "guest";
              this.endMultiGame(this.myPlayerId === winner ? "win" : "lose");
          }
      }, 1500);
  },

  startNextMultiRound(roundNum) {
      this.session.roundNumber = roundNum;
      this.session.idx++;
      this.hasAnsweredThisRound = false;
      this.renderQ();
  },

  endMultiGame(result, msg) {
      this.showScreen("s-end");
      this.stopTimer();
      document.getElementById("waiting-modal").classList.remove("open");
      
      const title = document.getElementById("end-title");
      const message = document.getElementById("end-msg");
      const icon = document.getElementById("end-icon");
      
      if(result === "win") {
          title.innerText = "GYŐZELEM!";
          icon.innerText = "🏆";
          message.innerText = "Az ellenfél hibázott.";
      } else if (result === "lose") {
          title.innerText = "VERESÉG";
          icon.innerText = "💀";
          message.innerText = "Te hibáztál (vagy lassú voltál).";
      } else {
          title.innerText = "DÖNTETLEN";
          icon.innerText = "🤝";
          message.innerText = msg || "Döntetlen játék.";
      }
      
      if(this.roomRef) this.roomRef.update({ status: "finished" });
  },

  startTimer() {
      this.stopTimer();
      const fill = document.getElementById("timer-fill");
      if(!fill) return;
      fill.style.width = "100%";
      fill.style.transition = `width ${CONFIG.ROUND_TIME}s linear`;
      // Force reflow
      void fill.offsetWidth;
      fill.style.width = "0%";
      
      this.timerInterval = setTimeout(() => {
          this.handleTimeout();
      }, CONFIG.ROUND_TIME * 1000);
  },

  stopTimer() {
      if(this.timerInterval) clearTimeout(this.timerInterval);
      const fill = document.getElementById("timer-fill");
      if(fill) {
          fill.style.transition = "none";
          fill.style.width = getComputedStyle(fill).width;
      }
  },

  handleTimeout() {
      if(this.session.isMulti && !this.hasAnsweredThisRound && this.roomRef) {
          this.hasAnsweredThisRound = true;
          const upd = {};
          upd[this.myPlayerId === "host" ? "hostAnswer" : "guestAnswer"] = "wrong";
          this.roomRef.update(upd);
      }
  },

  // PWA Install
  initInstallButton() {
      const btn = document.getElementById("install-btn");
      window.addEventListener("beforeinstallprompt", (e) => {
          e.preventDefault();
          this.deferredPrompt = e;
          if(btn) btn.style.display = "block";
      });
  },
  triggerInstall() {
      if(this.deferredPrompt) {
          this.deferredPrompt.prompt();
          this.deferredPrompt = null;
          document.getElementById("install-btn").style.display = "none";
      }
  }
};

// --- APP INDÍTÁSA ---
// Ha már betöltődött a DOM, indítsuk, ha nem, várjunk
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => app.init());
} else {
    app.init();
}
