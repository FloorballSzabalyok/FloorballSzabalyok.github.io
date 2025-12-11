// --- FIREBASE KONFIGURÁCIÓ ---
// (AZ ÉLES PROJEKTED ADATAIVAL)
const firebaseConfig = {
    apiKey: "AIzaSyCAVPTDjt0nAGrcu-S0XAn87_6g6BfUgvg",
    authDomain: "floorballszabalyok-hu.firebaseapp.com",
    projectId: "floorballszabalyok-hu",
    storageBucket: "floorballszabalyok-hu.firebasestorage.app",
    messagingSenderId: "171694131350",
    appId: "1:171694131350:web:c713d121fd781fe7df9ab7",
    databaseURL: "https://floorballszabalyok-hu-default-rtdb.europe-west1.firebasedatabase.app"
};

/**
 * Firebase safe init – DOM betöltődés után, window.firebase-t is nézve
 */
function initFirebaseSafe() {
  try {
    const fb =
      (typeof window !== "undefined" && window.firebase)
        ? window.firebase
        : (typeof firebase !== "undefined" ? firebase : null);

    if (fb) {
      fb.initializeApp(firebaseConfig);
      // Biztos, ami biztos: tegyük ki a window-ra is
      if (typeof window !== "undefined") {
        window.firebase = fb;
      }
      console.log("Firebase OK");
    } else {
      console.warn("Firebase SDK továbbra sem érhető el (firebase undefined).");
    }
  } catch (e) {
    console.error("Firebase hiba:", e);
  }
}

// Ha még tölt a DOM, várjunk rá, különben indítsuk azonnal
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initFirebaseSafe);
} else {
  initFirebaseSafe();
}

// --- ALAP KONFIG ---
const CONFIG = {
  STORAGE_KEY: "fb_v11_lux",
  WELCOME_KEY: "fb_welcome_seen",
  DB_URL: "database.json",
  LEVELS: ["L1", "L2", "L3"],
  MULTI_MAX_QUESTIONS: 10,
  ROUND_TIME: 30 // másodperc / kör a multiplayerben
};

// Seedelt random
function seededRandom(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- APP OBJEKTUM ---
const app = {
  user: { progress: {}, theme: "light", masterShown: false, streak: 0 },
  session: { topic: null, level: null, qList: [], idx: 0, lives: 3 },

  db: null,
  topics: [],
  questionIndex: {},

  currentRoomId: null,
  myPlayerId: null, // 'host' vagy 'guest'
  roomRef: null,
  seed: null,
  timerInterval: null,
  hasAnsweredThisRound: false,
  lastEvaluatedRound: 0,
  waitingTimeoutId: null,
  deferredPrompt: null,

  // --- INIT ---
  async init() {
    const container = document.getElementById("topic-container");
    if (container) {
      container.innerHTML =
        '<div style="text-align:center; padding:20px;">Adatok betöltése...</div>';
    }

    try {
      const response = await fetch(CONFIG.DB_URL);
      if (!response.ok) throw new Error("DB hiba");

      const jsonData = await response.json();
      this.db = jsonData.data;
      this.topics = jsonData.topics || [];

      this.buildQuestionIndex();
      this.loadUser();
      this.applyTheme();
      this.renderMenu();
      this.checkWelcome();
      this.initInstallButton();

      // Host bezárásakor szoba törlése
      window.addEventListener("beforeunload", () => {
        if (this.myPlayerId === "host" && this.roomRef) {
          this.roomRef.remove().catch((err) =>
            console.error("Szoba törlés hiba beforeunload:", err)
          );
        }
      });

      // room param (vendég)
      const urlParams = new URLSearchParams(window.location.search);
      let roomId = urlParams.get("room");
      if (roomId) {
        roomId = roomId.toUpperCase();
        if (/^[A-Z0-9]{4,10}$/.test(roomId)) {
          this.joinGame(roomId);
        } else {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }
      }
    } catch (error) {
      console.error("Hiba:", error);
      if (container)
        container.innerHTML =
          "Hiba az adatok betöltésekor. Próbáld újra később.";
    }
  },

  // --- USER / LOCALSTORAGE ---
  loadUser() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.user = {
          progress: parsed.progress || {},
          theme: parsed.theme || "light",
          masterShown: !!parsed.masterShown,
          streak: parsed.streak || 0
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
    this.updateStatsUI();
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

  // --- KÉRDÉS INDEX MULTIHOZ ---
  buildQuestionIndex() {
    this.questionIndex = {};
    if (!this.db) return;

    const topicsToUse =
      this.topics && this.topics.length
        ? this.topics.map((t) =>
            typeof t === "string" ? t : (t.id || t.code || t.key)
          )
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

    console.log(
      "Question index felépítve, darabszám:",
      Object.keys(this.questionIndex).length
    );
  },

  // --- SEGÉD: TÉMA / SZINT FELIRATOK ---
  getTopicMeta(topicId) {
    if (!this.topics || !Array.isArray(this.topics)) return null;
    return (
      this.topics.find(
        (t) =>
          (typeof t === "string" ? t : t.id) === topicId
      ) || null
    );
  },

  getLevelLabel(level) {
    switch (level) {
      case "L1":
        return "Kezdő (L1)";
      case "L2":
        return "Haladó (L2)";
      case "L3":
        return "Mester (L3)";
      default:
        return level;
    }
  },

  // --- FŐMENÜ / STATISZTIKA ---
    // --- FŐMENÜ / STATISZTIKA ---
    // --- FŐMENÜ / STATISZTIKA ---
  renderMenu() {
    if (!this.db || !this.topics) return;

    const container = document.getElementById("topic-container");
    if (!container) return;

    container.innerHTML = "";

    let totalQuestions = 0;
    let totalAnswered = 0;
    let allCompleted = true;

    (this.topics || []).forEach((topicMeta) => {
      const topicId =
        typeof topicMeta === "string" ? topicMeta : topicMeta.id;
      const topicName =
        typeof topicMeta === "string"
          ? topicMeta
          : (topicMeta.name || topicMeta.id);

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

      totalQuestions += topicTotal;
      totalAnswered += topicAnswered;

      const topicPercent =
        topicTotal > 0
          ? Math.round((topicAnswered / topicTotal) * 100)
          : 0;

      const l1Done =
        levelStats["L1"].total > 0 &&
        levelStats["L1"].answered >= levelStats["L1"].total;
      const l2Done =
        levelStats["L2"].total > 0 &&
        levelStats["L2"].answered >= levelStats["L2"].total;
      const l3Done =
        levelStats["L3"].total > 0 &&
        levelStats["L3"].answered >= levelStats["L3"].total;

      const mastered = l1Done && l2Done && l3Done && topicTotal > 0;
      if (!mastered) allCompleted = false;

      const card = document.createElement("div");
      card.className = "topic-card";
      if (mastered) card.classList.add("mastered");

      // NINCS külön gomb, csak % jobb oldalon
      card.innerHTML = `
        <div class="card-top">
          <div class="t-title">${topicName}</div>
          <div class="t-badge ${mastered ? "done" : ""}">
            ${topicPercent}%
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${topicPercent}%;"></div>
        </div>
        <div class="topic-level-row">
          <img src="img/beginner_badge.png" alt="L1 szint" class="topic-level-badge ${l1Done ? "active" : "inactive"}">
          <img src="img/intermediate_badge.png" alt="L2 szint" class="topic-level-badge ${l2Done ? "active" : "inactive"}">
          <img src="img/expert_badge.png" alt="L3 szint" class="topic-level-badge ${l3Done ? "active" : "inactive"}">
        </div>
      `;

      // Az egész kártya kattintható → szintek
      card.addEventListener("click", () => this.showLevels(topicId));

      container.appendChild(card);
    });

    // Globális stat pill és master jelzés frissítése
    this.updateStatsUIWithTotals(totalAnswered, totalQuestions, allCompleted);
  },

  updateStatsUI() {
    // Akkori állapot alapján újraszámoljuk a globális statokat
    if (!this.db || !this.topics) return;

    let totalQuestions = 0;
    let totalAnswered = 0;
    let allCompleted = true;

    (this.topics || []).forEach((topicMeta) => {
      const topicId =
        typeof topicMeta === "string" ? topicMeta : topicMeta.id;
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

      totalQuestions += topicTotal;
      totalAnswered += topicAnswered;

      const l1Done =
        levelStats["L1"].total > 0 &&
        levelStats["L1"].answered >= levelStats["L1"].total;
      const l2Done =
        levelStats["L2"].total > 0 &&
        levelStats["L2"].answered >= levelStats["L2"].total;
      const l3Done =
        levelStats["L3"].total > 0 &&
        levelStats["L3"].answered >= levelStats["L3"].total;

      const mastered = l1Done && l2Done && l3Done && topicTotal > 0;
      if (!mastered) allCompleted = false;
    });

    this.updateStatsUIWithTotals(totalAnswered, totalQuestions, allCompleted);
  },

  updateStatsUIWithTotals(totalAnswered, totalQuestions, allCompleted) {
    const statAnswered = document.getElementById("stat-answered");
    const statTotal = document.getElementById("stat-total");
    const statStreak = document.getElementById("stat-streak");

    if (statAnswered) statAnswered.textContent = totalAnswered;
    if (statTotal) statTotal.textContent = totalQuestions;
    if (statStreak) statStreak.textContent = this.user.streak || 0;

    const totalBadge = document.getElementById("total-badge");
    const totalProgressFill = document.getElementById("total-progress-fill");

    if (totalQuestions > 0) {
      const percent = Math.round((totalAnswered / totalQuestions) * 100);
      if (totalBadge) totalBadge.textContent = `${percent}%`;
      if (totalProgressFill) totalProgressFill.style.width = `${percent}%`;
    }

    const masterInfo = document.getElementById("master-info");
    if (masterInfo) {
      masterInfo.style.display =
        allCompleted && totalQuestions > 0 ? "flex" : "none";
    }
  },

  // --- WELCOME MODAL ---
  checkWelcome() {
    const seen = localStorage.getItem(CONFIG.WELCOME_KEY);
    const modal = document.getElementById("welcome-modal");
    if (!modal) return;

    if (seen === "1") {
      modal.classList.remove("open");
    } else {
      modal.classList.add("open");
    }
  },

  toggleWelcome() {
    const modal = document.getElementById("welcome-modal");
    if (!modal) return;
    const isOpen = modal.classList.contains("open");
    if (isOpen) {
      modal.classList.remove("open");
      localStorage.setItem(CONFIG.WELCOME_KEY, "1");
    } else {
      modal.classList.add("open");
    }
  },

  // --- MULTIPLAYER ---
  startChallengeMode() {
    if (typeof firebase === "undefined" || !firebase.apps.length) {
      alert("A multiplayerhez internet és érvényes Firebase beállítás szükséges!");
      return;
    }
    if (!this.db || !Object.keys(this.questionIndex).length) {
      alert("Még nem töltődtek be a kérdések. Próbáld meg pár másodperc múlva.");
      return;
    }

    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.currentRoomId = roomId;
    this.myPlayerId = "host";

    const db = firebase.database();
    this.roomRef = db.ref("rooms/" + roomId);

    const allQuestionIds = Object.keys(this.questionIndex);
    if (allQuestionIds.length < 2) {
      alert("Nincs elég kérdés a multiplayer módhoz.");
      this.currentRoomId = null;
      this.myPlayerId = null;
      this.roomRef = null;
      return;
    }

    const shuffledIds = this.shuffle([...allQuestionIds]);
    const totalRounds = Math.min(CONFIG.MULTI_MAX_QUESTIONS, shuffledIds.length);
    const questionsForRoom = shuffledIds.slice(0, totalRounds);

    const seed = Math.floor(Math.random() * 1e9);

    const initialRoomState = {
      status: "waiting",
      seed: seed,
      round: 1,
      hostAnswer: "pending",
      guestAnswer: "pending",
      hostAlive: true,
      guestAlive: true,
      questions: questionsForRoom,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    this.roomRef
      .set(initialRoomState)
      .then(() => {
        try {
          this.roomRef.child("hostAlive").onDisconnect().set(false);
        } catch (e) {
          console.warn("onDisconnect hostAlive hiba:", e);
        }

        const hostModal = document.getElementById("host-modal");
        if (hostModal) hostModal.classList.add("open");

        const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        const input = document.getElementById("share-link-input");
        if (input) input.value = link;

        this.roomRef.on("value", (snapshot) =>
          this.onRoomUpdate(snapshot.val())
        );
      })
      .catch((err) => {
        console.error("Nem sikerült létrehozni a szobát:", err);
        alert("Nem sikerült létrehozni a párbaj szobát. Próbáld újra később.");
        this.currentRoomId = null;
        this.myPlayerId = null;
        this.roomRef = null;
      });
  },

  joinGame(roomId) {
    if (typeof firebase === "undefined" || !firebase.apps.length) return;

    this.currentRoomId = roomId;
    this.myPlayerId = "guest";
    const db = firebase.database();
    this.roomRef = db.ref("rooms/" + roomId);

    this.roomRef
      .once("value")
      .then((snapshot) => {
        const data = snapshot.val();
        if (data && data.status === "waiting") {
          const challengeModal = document.getElementById("challenge-modal");
          if (challengeModal) challengeModal.classList.add("open");
        } else {
          alert("A szoba már nem elérhető.");
          this.currentRoomId = null;
          this.myPlayerId = null;
          this.roomRef = null;
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }
      })
      .catch((err) => {
        console.error("Szoba lekérdezési hiba:", err);
        alert("Nem sikerült csatlakozni a szobához.");
        this.currentRoomId = null;
        this.myPlayerId = null;
        this.roomRef = null;
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      });
  },

  acceptChallenge() {
    const challengeModal = document.getElementById("challenge-modal");
    if (challengeModal) challengeModal.classList.remove("open");

    if (!this.roomRef) return;

    try {
      this.roomRef.child("guestAlive").onDisconnect().set(false);
    } catch (e) {
      console.warn("onDisconnect guestAlive hiba:", e);
    }

    this.roomRef
      .update({ status: "playing", guestAlive: true })
      .then(() => {
        this.roomRef.on("value", (snapshot) =>
          this.onRoomUpdate(snapshot.val())
        );
      })
      .catch((err) => {
        console.error("acceptChallenge update hiba:", err);
        alert("Nem sikerült elindítani a párbajt.");
        this.currentRoomId = null;
        this.myPlayerId = null;
        this.roomRef = null;
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      });
  },

  clearWaitingTimeout() {
    if (this.waitingTimeoutId) {
      clearTimeout(this.waitingTimeoutId);
      this.waitingTimeoutId = null;
    }
  },

  onRoomUpdate(data) {
    if (!data) {
      if (this.currentRoomId) {
        alert("A kapcsolat megszakadt, a szoba bezárult.");
        this.clearWaitingTimeout();
        this.menu();
      }
      return;
    }

    if (this.session.isMulti && data.status === "playing") {
      const otherAlive =
        this.myPlayerId === "host" ? data.guestAlive : data.hostAlive;
      if (otherAlive === false) {
        this.clearWaitingTimeout();
        this.endMultiGame(
          "draw",
          "Az ellenfeled megszakította a kapcsolatot. A párbajt lezártuk."
        );
        return;
      }
    }

    if (data.status === "playing") {
      const hostModal = document.getElementById("host-modal");
      if (hostModal && hostModal.classList.contains("open")) {
        hostModal.classList.remove("open");
      }
      if (!this.session.isMulti) {
        this.startGameFromRoom(data);
      }
    }

    if (this.session.isMulti && data.round === this.session.roundNumber) {
      const myAns =
        this.myPlayerId === "host" ? data.hostAnswer : data.guestAnswer;
      const oppAns =
        this.myPlayerId === "host" ? data.guestAnswer : data.hostAnswer;

      const waitingModal = document.getElementById("waiting-modal");

      if (myAns !== "pending" && oppAns === "pending") {
        if (waitingModal) waitingModal.classList.add("open");

        this.clearWaitingTimeout();
        this.waitingTimeoutId = setTimeout(() => {
          if (!this.session.isMulti || !this.currentRoomId) return;
          this.endMultiGame(
            "draw",
            "Az ellenfeled nem válaszolt időben. A párbajt technikai okból megszakítottuk."
          );
        }, (CONFIG.ROUND_TIME + 15) * 1000);
      } else {
        if (waitingModal) waitingModal.classList.remove("open");
        this.clearWaitingTimeout();
      }

      if (
        data.hostAnswer !== "pending" &&
        data.guestAnswer !== "pending"
      ) {
        this.clearWaitingTimeout();
        this.evaluateRound(data.hostAnswer, data.guestAnswer, data.round);
      }
    }

    if (this.session.isMulti && data.round > this.session.roundNumber) {
      this.startNextMultiRound(data.round);
    }
  },

  startGameFromRoom(roomData) {
    if (!roomData) return;

    const questionIds = Array.isArray(roomData.questions)
      ? roomData.questions
      : [];
    if (!questionIds.length) {
      alert(
        "A szobához nem tartoznak kérdések. A párbajt nem lehet elindítani."
      );
      this.endMultiGame(
        "draw",
        "Technikai hiba a kérdéskészlettel. A párbajt lezártuk."
      );
      return;
    }

    this.seed = roomData.seed || Date.now();

    this.start("MULTI", "MULTI", true, questionIds);
    this.session.roundNumber = roomData.round || 1;
  },

  evaluateRound(hAns, gAns, currentRound) {
    if (this.lastEvaluatedRound === currentRound) return;
    this.lastEvaluatedRound = currentRound;
    this.stopTimer();

    setTimeout(() => {
      if (hAns === "correct" && gAns === "correct") {
        const maxRounds =
          this.session.totalRounds || CONFIG.MULTI_MAX_QUESTIONS;

        if (currentRound >= maxRounds) {
          this.endMultiGame("draw", "Mindketten hibátlanok voltatok!");
        } else {
          if (this.myPlayerId === "host" && this.roomRef) {
            this.roomRef
              .update({
                round: currentRound + 1,
                hostAnswer: "pending",
                guestAnswer: "pending"
              })
              .catch((err) =>
                console.error("Következő kör update hiba:", err)
              );
          }
        }
      } else if (hAns === "wrong" && gAns === "wrong") {
        this.endMultiGame("draw", "Mindketten rontottatok! Döntetlen.");
      } else {
        const winner = hAns === "correct" ? "host" : "guest";
        const isMeWinner = this.myPlayerId === winner;
        this.endMultiGame(isMeWinner ? "win" : "lose");
      }
    }, 1500);
  },

  startNextMultiRound(roundNum) {
    this.session.roundNumber = roundNum;
    this.session.idx++;
    this.hasAnsweredThisRound = false;
    this.renderQ();
  },

  endMultiGame(result, customMsg) {
    this.showScreen("s-end");
    this.stopTimer();
    this.clearWaitingTimeout();

    const titleEl = document.getElementById("end-title");
    const msgEl = document.getElementById("end-msg");
    const iconEl = document.getElementById("end-icon");
    const scoreEl = document.getElementById("end-score");
    if (scoreEl) scoreEl.style.display = "none";

    if (result === "win") {
      titleEl.innerText = "GYŐZELEM! 🏆";
      msgEl.innerText =
        customMsg || "Az ellenfeled hibázott. Te vagy a bajnok!";
      msgEl.style.color = "var(--success)";
      iconEl.innerText = "🎉";
    } else if (result === "lose") {
      titleEl.innerText = "VERESÉG 💀";
      msgEl.innerText =
        customMsg || "Te hibáztál (vagy lassú voltál).";
      msgEl.style.color = "var(--error)";
      iconEl.innerText = "💀";
    } else {
      titleEl.innerText = "DÖNTETLEN 🤝";
      msgEl.innerText = customMsg || "Döntetlen játék.";
      msgEl.style.color = "var(--text-main)";
      iconEl.innerText = "🤝";
    }

    if (this.roomRef) {
      this.roomRef.off();
      if (this.myPlayerId === "host") {
        setTimeout(() => {
          this.roomRef &&
            this.roomRef
              .remove()
              .catch((err) =>
                console.error("Szoba törlés hiba (endMultiGame):", err)
              );
        }, 5000);
      }
      this.roomRef = null;
    }
    this.currentRoomId = null;
    this.myPlayerId = null;
  },

  // --- GAME ENGINE: SINGLE + MULTI ---
  /**
   * start(topic, level, isMulti = false, questionIds = null)
   *  - single: topic + level határozza meg a kérdéslistát
   *  - multi:  questionIds alapján építjük a listát (ha meg van adva)
   */
  start(topic, level, isMulti = false, questionIds = null) {
    let qList = [];

    if (isMulti) {
      if (Array.isArray(questionIds) && questionIds.length) {
        questionIds.forEach((id) => {
          const q = this.questionIndex[id];
          if (q) qList.push(q);
        });
      } else {
        const allTopicsArr = this.topics || [];
        allTopicsArr.forEach((tMeta) => {
          const tId =
            typeof tMeta === "string" ? tMeta : tMeta.id;
          CONFIG.LEVELS.forEach((lvl) => {
            if (this.db[tId] && this.db[tId][lvl]) {
              qList = qList.concat(this.db[tId][lvl]);
            }
          });
        });
      }
    } else {
      if (!this.isLevelUnlocked(topic, level)) {
        alert("Először fejezd be az előző szintet, utána léphetsz tovább.");
        return;
      }

      const topicData = this.db[topic] || {};
      const allQ = topicData[level] || [];
      qList = [...allQ];
    }

    const randomFunc =
      isMulti && this.seed ? seededRandom(this.seed) : Math.random;
    let currentIndex = qList.length,
      randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(randomFunc() * currentIndex);
      currentIndex--;
      [qList[currentIndex], qList[randomIndex]] = [
        qList[randomIndex],
        qList[currentIndex]
      ];
    }

    if (!isMulti) {
      const solvedIDs = (this.user.progress[topic]?.[level]) || [];
      const toPlay = qList.filter((q) => !solvedIDs.includes(q.id));

      if (toPlay.length === 0) {
        if (
          confirm(
            "Már megoldottad az összes kérdést ezen a szinten.\nIndítsd újra gyakorlás módban?"
          )
        ) {
          this.session = {
            topic,
            level,
            qList: this.shuffle([...qList]),
            idx: 0,
            lives: 3
          };
          this.showScreen("s-game");
          this.renderQ();
        }
        return;
      }

      this.session = { topic, level, qList: toPlay, idx: 0, lives: 3 };
    } else {
      const totalRounds = Math.min(CONFIG.MULTI_MAX_QUESTIONS, qList.length);
      qList = qList.slice(0, totalRounds);

      this.session = {
        topic: "MULTI",
        level: "MULTI",
        qList,
        idx: 0,
        lives: 3,
        isMulti: true,
        roundNumber: 1,
        totalRounds
      };
    }

    this.hasAnsweredThisRound = false;
    this.lastEvaluatedRound = 0;
    this.showScreen("s-game");
    this.renderQ();
  },

  // --- SZINTVÁLASZTÓ KÉPERNYŐ ---
    // --- SZINTVÁLASZTÓ KÉPERNYŐ ---
    // --- SZINTVÁLASZTÓ KÉPERNYŐ ---
  showLevels(topicId) {
    const topicMeta = this.getTopicMeta(topicId);
    const topicName =
      typeof topicMeta === "string"
        ? topicMeta
        : (topicMeta?.name || topicId);

    const titleEl = document.getElementById("lvl-title");
    if (titleEl) titleEl.textContent = topicName;

    const cont = document.getElementById("level-container");
    if (!cont) return;
    cont.innerHTML = "";

    const topicData = this.db[topicId] || {};

    CONFIG.LEVELS.forEach((level) => {
      const qArr = topicData[level] || [];
      const total = qArr.length;
      const solvedIds = (this.user.progress[topicId]?.[level] || []);
      const answered = Math.min(solvedIds.length, total);
      const completed = total > 0 && answered >= total;

      let unlocked = false;
      if (level === "L1") unlocked = true;
      if (level === "L2") unlocked = this.isLevelCompleted(topicId, "L1");
      if (level === "L3") unlocked = this.isLevelCompleted(topicId, "L2");

      const levelLabel = this.getLevelLabel(level);

      const card = document.createElement("div");
      card.className = "level-card";
      if (!unlocked) card.classList.add("locked");

      // Szöveg egyszerű: csak 0 / 43
      const btnDisabled = (!unlocked || total === 0);
      const btnLabel = btnDisabled ? "Zárolva" : "Indítás";

      card.innerHTML = `
        <div>
          <div class="l-name">${levelLabel}</div>
          <div class="l-stat">
            ${answered} / ${total}
          </div>
        </div>
        <button type="button"
                class="btn-play ${completed ? "done" : ""}"
                ${btnDisabled ? "disabled" : ""}>
          ${btnLabel}
        </button>
      `;

      if (!btnDisabled) {
        const startLevel = () => this.start(topicId, level, false);
        const playBtn = card.querySelector(".btn-play");
        playBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          startLevel();
        });
        card.addEventListener("click", startLevel);
      }

      cont.appendChild(card);
    });

    this.showScreen("s-levels");
  },

  // --- KÉRDÉSEK KIRAJZOLÁSA ---
  renderQ() {
    const q = this.session.qList[this.session.idx];
    if (!q) {
      if (this.session.isMulti) {
        this.endMultiGame(
          "draw",
          "Elfogytak a kérdések. A párbajt lezártuk."
        );
      } else {
        this.end(true);
      }
      return;
    }

    const qRemEl = document.getElementById("q-remaining");
    const livesEl = document.getElementById("g-lives");

    if (this.session.isMulti) {
      if (livesEl) livesEl.style.display = "none";
      const timerBar = document.getElementById("timer-bar");
      const multiBadge = document.getElementById("multi-badge");
      const qLabel = document.getElementById("q-label");
      const roundEl = document.getElementById("round-indicator");

      if (timerBar) timerBar.style.display = "block";
      if (multiBadge) multiBadge.style.display = "block";
      if (qLabel) qLabel.style.display = "none";

      if (roundEl) {
        roundEl.style.display = "inline";
        roundEl.innerText = `Kör: ${this.session.roundNumber} / ${this.session.totalRounds}`;
      }
      if (qRemEl) qRemEl.style.display = "none";

      this.startTimer();
    } else {
      if (livesEl) {
        livesEl.style.display = "block";
        livesEl.innerText = "❤️".repeat(this.session.lives);
      }
      const timerBar = document.getElementById("timer-bar");
      const multiBadge = document.getElementById("multi-badge");
      const qLabel = document.getElementById("q-label");
      const roundEl = document.getElementById("round-indicator");

      if (timerBar) timerBar.style.display = "none";
      if (multiBadge) multiBadge.style.display = "none";
      if (qLabel) qLabel.style.display = "inline";

      if (roundEl) roundEl.style.display = "none";
      if (qRemEl) {
        qRemEl.style.display = "inline";
        qRemEl.innerText = this.session.qList.length - this.session.idx;
      }
    }

    document.getElementById("q-text").textContent = q.q;
    const cont = document.getElementById("g-opts");
    cont.style.display = "block";
    cont.innerHTML = "";
    const feed = document.getElementById("g-feed");
    feed.style.display = "none";

    const progEl = document.getElementById("g-prog");
    if (progEl && this.session.qList.length) {
      const answered = this.session.idx;
      const total = this.session.qList.length;
      const percent = Math.round((answered / total) * 100);
      progEl.style.width = percent + "%";
    }

    let indices = [0, 1, 2];
    const seedBase =
      this.session.isMulti
        ? this.seed + this.session.idx + 999
        : Math.random();
    const randomFunc = this.session.isMulti
      ? seededRandom(seedBase)
      : Math.random;

    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(randomFunc() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    indices.forEach((originalIndex) => {
      const btn = document.createElement("div");
      btn.className = "btn-opt";
      btn.textContent = q.o[originalIndex];
      btn.onclick = () => {
        if (!this.hasAnsweredThisRound) {
          this.check(originalIndex, btn);
        }
      };
      cont.appendChild(btn);
    });
  },

  startTimer() {
    this.stopTimer();
    const fill = document.getElementById("timer-fill");
    if (!fill) return;

    fill.style.width = "100%";
    fill.style.transition = `width ${CONFIG.ROUND_TIME}s linear`;
    void fill.offsetWidth;
    fill.style.width = "0%";

    this.timerInterval = setTimeout(() => {
      this.handleTimeout();
    }, CONFIG.ROUND_TIME * 1000);
  },

  stopTimer() {
    if (this.timerInterval) clearTimeout(this.timerInterval);
    this.timerInterval = null;
    const fill = document.getElementById("timer-fill");
    if (fill) {
      fill.style.transition = "none";
      fill.style.width = fill.style.width;
    }
  },

  handleTimeout() {
    if (this.session.isMulti && !this.hasAnsweredThisRound && this.roomRef) {
      this.hasAnsweredThisRound = true;
      const update = {};
      update[
        this.myPlayerId === "host" ? "hostAnswer" : "guestAnswer"
      ] = "wrong";
      this.roomRef.update(update).catch((err) =>
        console.error("Timeout update hiba:", err)
      );
    }
  },

  check(i, btn) {
    const q = this.session.qList[this.session.idx];
    const isOk = i === q.c;

    if (this.session.isMulti) {
      this.hasAnsweredThisRound = true;
      const update = {};
      update[
        this.myPlayerId === "host" ? "hostAnswer" : "guestAnswer"
      ] = isOk ? "correct" : "wrong";
      if (this.roomRef) {
        this.roomRef.update(update).catch((err) =>
          console.error("Válasz update hiba:", err)
        );
      }

      btn.style.opacity = "0.7";
      btn.innerText += " ⏳";
      this.stopTimer();
    } else {
      if (isOk) {
        this.user.streak = (this.user.streak || 0) + 1;
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

  shakeLives() {
    const livesEl = document.getElementById("g-lives");
    if (!livesEl) return;
    livesEl.classList.add("shake");
    setTimeout(() => livesEl.classList.remove("shake"), 500);
    if (navigator.vibrate) navigator.vibrate(200);
  },

  showFeedback(isOk, q) {
    const livesEl = document.getElementById("g-lives");
    if (livesEl)
      livesEl.innerText = "❤️".repeat(Math.max(this.session.lives, 0));
    document.getElementById("g-opts").style.display = "none";

    const feed = document.getElementById("g-feed");
    feed.style.display = "block";
    feed.className = isOk ? "feedback ok" : "feedback bad";

    let btnHtml = "";
    if (this.session.lives > 0) {
      btnHtml = `<button class="btn-main btn-main--next" onclick="app.next()">
        ${
          this.session.qList.length - this.session.idx === 1
            ? "BEFEJEZÉS 🏁"
            : "KÖVETKEZŐ ➜"
        }
      </button>`;
    } else {
      setTimeout(() => this.end(false), 2000);
    }

    feed.innerHTML = `
      <div style="font-weight:900; font-size:1.2rem; margin-bottom:10px;">
        ${isOk ? "✅ Helyes!" : "❌ Helytelen!"}
      </div>
      <div style="background:rgba(0,0,0,0.05); padding:10px; border-radius:10px; margin-bottom:15px; font-size:0.9rem; color:var(--text-main);">
        <strong>A helyes válasz:</strong><br>${q.o[q.c]}
      </div>
      <div style="line-height:1.5; margin-bottom:10px; color:var(--text-main);">
        ${q.e || "Nincs külön magyarázat."}
      </div>
      ${q.r ? `<div class="ref-code">SZABÁLYKÖNYV: ${q.r}</div>` : ""}
      ${btnHtml}
    `;

    feed.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },

  end(win) {
    this.showScreen("s-end");
    if (!this.session.isMulti)
      document.getElementById("end-score").style.display = "block";

    const roastMessages = [
      "Ne búsulj, focizni még elmehetsz, vár a mennyei megyei!",
      "A szabálykönyv nem harap, nyugodtan kinyithatod néha!",
      "Sebaj! A lelátóról is lehet szépen szurkolni.",
      "A bíró vak volt? Nem, sajnos most te nézted be...",
      "Nyugi, a legjobbak is kezdték valahol. Mondjuk nem ennyire lentről.",
      "Úgy látom szabálykönyvet még nem hozott a Jézuska..."
    ];

    const randomMsg =
      roastMessages[Math.floor(Math.random() * roastMessages.length)];
    const isWin = !!win;

    document.getElementById("end-icon").innerText = isWin ? "🎉" : "💀";
    const titleEl = document.getElementById("end-title");
    const msgEl = document.getElementById("end-msg");

    if (isWin) {
      titleEl.innerText = "Kör Vége";
      msgEl.innerText = "Szép munka! Csak így tovább!";
      msgEl.style.color = "";
    } else {
      titleEl.innerText = randomMsg;
      msgEl.innerText = "Game Over";
      msgEl.style.fontWeight = "800";
      msgEl.style.color = "var(--error)";
    }

    const solvedCount = this.session.idx;
    const totalCount = this.session.qList.length;
    document.getElementById(
      "end-score"
    ).innerText = `${solvedCount}/${totalCount}`;

    const actions = document.getElementById("end-actions");
    actions.innerHTML = "";
    const btnMenu = document.createElement("button");
    btnMenu.className = "btn-main btn-main--secondary";
    btnMenu.innerText = "Vissza a főmenübe";
    btnMenu.onclick = () => this.menu();
    actions.appendChild(btnMenu);
  },

  next() {
    this.session.idx++;
    if (this.session.idx < this.session.qList.length) {
      this.renderQ();
      window.scrollTo(0, 0);
    } else {
      this.end(true);
    }
  },

  // --- EGYÉB & PWA / MULTI SEGÉDEK ---
  cancelHost() {
    if (this.roomRef) {
      this.roomRef
        .remove()
        .catch((err) =>
          console.error("Szoba törlés hiba (cancelHost):", err)
        );
      this.roomRef.off();
    }
    const modal = document.getElementById("host-modal");
    if (modal) modal.classList.remove("open");
    this.currentRoomId = null;
    this.myPlayerId = null;
    this.clearWaitingTimeout();
  },

  shareLink() {
    const input = document.getElementById("share-link-input");
    const link = input ? input.value : window.location.href;
    const fallback = () => {
      if (input) {
        input.select();
        document.execCommand("copy");
      }
      alert("Link másolva!");
    };
    if (navigator.share) {
      navigator
        .share({ title: "Párbaj", text: "Kihívlak!", url: link })
        .catch(fallback);
    } else {
      fallback();
    }
  },

  rejectChallenge() {
    const modal = document.getElementById("challenge-modal");
    if (modal) modal.classList.remove("open");
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
    if (this.roomRef) this.roomRef.off();
    this.currentRoomId = null;
    this.myPlayerId = null;
    this.clearWaitingTimeout();
  },

  initInstallButton() {
    const btn = document.getElementById("install-btn");
    const isIos =
      /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;
    if (isStandalone) return;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (btn) btn.style.display = "block";
    });
    if (isIos && btn) btn.style.display = "block";
  },

  triggerInstall() {
    const isIos =
      /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIos) {
      const modal = document.getElementById("ios-install-modal");
      if (modal) modal.classList.add("open");
    } else if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          const btn = document.getElementById("install-btn");
          if (btn) btn.style.display = "none";
        }
        this.deferredPrompt = null;
      });
    }
  },

  closeIosInstall() {
    const modal = document.getElementById("ios-install-modal");
    if (modal) modal.classList.remove("open");
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

  toggleResetModal() {
    const modal = document.getElementById("reset-modal");
    if (modal) modal.classList.toggle("open");
  },

  fullReset() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    localStorage.removeItem(CONFIG.WELCOME_KEY);
    location.reload();
  },

  toggleInfo() {
    const modal = document.getElementById("info-modal");
    if (modal) modal.classList.toggle("open");
  },

  showRules() {
    this.showScreen("s-rules");
  },

  showMasterScreen() {
    this.showScreen("s-master");
  },

  downloadCert() {
    const el = document.getElementById("certificate");
    if (!el) return;
    html2canvas(el).then((canvas) => {
      const link = document.createElement("a");
      link.download = "floorball_mester.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  },

  menu() {
    this.showScreen("s-menu");
    this.renderMenu();
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
    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.remove("active"));
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
    window.scrollTo(0, 0);
  },

  shuffle(array) {
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
  },

  resetLevel(t, l) {
    if (confirm("Törlöd ennek a szintnek az eredményét?")) {
      if (this.user.progress[t]) {
        this.user.progress[t][l] = [];
        this.saveUser();
        this.showLevels(t);
      }
    }
  }
};

app.init();
