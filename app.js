app.js
// --- FIREBASE KONFIGURÁCIÓ ---
const firebaseConfig = {
  apiKey: "AIzaSyCAVPTDjt0nAGrcu-S0XAn87_6g6BfUgvg",
  authDomain: "floorballszabalyok-hu.firebaseapp.com",
  databaseURL: "https://floorballszabalyok-hu-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "floorballszabalyok-hu",
  storageBucket: "floorballszabalyok-hu.appspot.com",
  messagingSenderId: "171694131350",
  appId: "1:171694131350:web:c713d121fd781fe7df9ab7"
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
      if (!fb.apps || !fb.apps.length) {
        fb.initializeApp(firebaseConfig);
      }
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

// --- APP KONFIG ---
const CONFIG = {
  STORAGE_KEY: "fb_v11_lux",
  WELCOME_KEY: "fb_welcome_seen",
  DB_URL: "database.json",
  LEVELS: ["L1", "L2", "L3"],
  MULTI_MAX_QUESTIONS: 10,
  ROUND_TIME: 30 // másodperc / kör a multiplayerben
};

const LIFE_SVG = `
<svg class="life-icon" viewBox="0 0 100 100" fill="none"
     xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
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

// Témakörök szép megnevezése
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

// Seedelt random – hogy multiplayerben ugyanaz legyen a sorrend
function seededRandom(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- APP CORE (Modular structure: State / DB / Network / UI / Game) ---
const App = {
  user: {
    progress: {},
    theme: "light",
    masterShown: false,
    streak: 0,
    roastIndex: 0 // következő roast sorszáma
  },

  session: {
    topic: null,
    level: null,
    qList: [],
    idx: 0,
    lives: 3,
    isMulti: false,
    roundNumber: 0,
    totalRounds: 0,
    answeredCount: 0
  },

  // Multi / adatbázis változók
  db: null,
  topics: [],
  questionIndex: {}, // id -> kérdés objektum
  currentRoomId: null,
  myPlayerId: null, // 'host' vagy 'guest'
  roomRef: null,
  seed: null,
  timerInterval: null,
  hasAnsweredThisRound: false,
  lastEvaluatedRound: 0,
  waitingTimeoutId: null,
  deferredPrompt: null,

  // Rematch segédváltozók
  rematchRequestInProgress: false,
  _rematchStartedToken: null,

  // Auto-scroll guard
  _scrollGuardsBound: false,
  _lastUserInputTs: 0
};

// --- MODULE: State (localStorage + progress) ---
const State = {
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
          roastIndex:
            typeof parsed.roastIndex === "number" ? parsed.roastIndex : 0
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
    const solvedIds = this.user.progress?.[topicId]?.[level] || [];
    return total > 0 && solvedIds.length >= total;
  },

  isLevelUnlocked(topicId, level) {
    if (level === "L1") return true;
    if (level === "L2") return this.isLevelCompleted(topicId, "L1");
    if (level === "L3") return this.isLevelCompleted(topicId, "L2");
    return true;
  },

  // --- KÉRDÉS INDEX ÉPÍTÉSE MULTIHEZ ---

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

// --- MODULE: DB (database.json) ---
const DB = {
  buildQuestionIndex() {
    this.questionIndex = {};
    if (!this.db) return;

    const topicsToUse =
      this.topics && this.topics.length
        ? this.topics.map((t) =>
            typeof t === "string" ? t : t.id || t.code || t.key
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

  // --- SEGÉD: TÉMA NÉV / SZINT CÍMKE ---

  getTopicName(topicId) {
    return TOPIC_LABELS[topicId] || topicId;
  }
};

// --- MODULE: Network (Firebase multiplayer) ---
const Network = {
  startChallengeMode() {
    if (typeof firebase === "undefined" || !firebase.apps.length) {
      alert(
        "A multiplayerhez internet és érvényes Firebase beállítás szükséges!"
      );
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

    // Összes kérdés ID összegyűjtése
    const allQuestionIds = Object.keys(this.questionIndex);
    if (allQuestionIds.length < 2) {
      alert("Nincs elég kérdés a multiplayer módhoz.");
      this.currentRoomId = null;
      this.myPlayerId = null;
      this.roomRef = null;
      return;
    }

    // Keverés
    const shuffledIds = this.shuffle([...allQuestionIds]);
    const totalRounds = Math.min(
      CONFIG.MULTI_MAX_QUESTIONS,
      shuffledIds.length
    );
    const questionsForRoom = shuffledIds.slice(0, totalRounds);

    // Seed (a válaszlehetőségek sorrendjéhez)
    const seed = Math.floor(Math.random() * 1e9);

    const initialRoomState = {
      status: "waiting",
      seed: seed,
      round: 1,
      hostAnswer: "pending",
      guestAnswer: "pending",
      questions: questionsForRoom,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      rematch: {
        status: "none",
        from: null,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      }
    };

    this.roomRef
      .set(initialRoomState)
      .then(() => {
        const hostModal = document.getElementById("host-modal");
        if (hostModal) hostModal.classList.add("open");

        const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        const input = document.getElementById("share-link-input");
        if (input) input.value = link;

        this.roomRef.on("value", (snapshot) =>
          this.onRoomUpdate(snapshot.val())
        );

        this.track("multi_room_created", {
          roomId,
          questionCount: totalRounds
        });
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

    // Ellenőrizzük, hogy létezik-e a szoba
    this.roomRef
      .once("value")
      .then((snapshot) => {
        const data = snapshot.val();
        if (data && data.status === "waiting") {
          const challengeModal = document.getElementById("challenge-modal");
          if (challengeModal) challengeModal.classList.add("open");

          this.track("multi_join_ready", { roomId });
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

    this.roomRef
      .update({ status: "playing" })
      .then(() => {
        this.roomRef.on("value", (snapshot) =>
          this.onRoomUpdate(snapshot.val())
        );
        this.track("multi_join_accepted", {
          roomId: this.currentRoomId
        });
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

    // Játék indítása
    if (data.status === "playing") {
      const hostModal = document.getElementById("host-modal");
      if (hostModal && hostModal.classList.contains("open")) {
        hostModal.classList.remove("open");
      }
      if (!this.session.isMulti) {
        this.startGameFromRoom(data);
      }
    }

    // Kör állapot / várakozás kezelése
    if (this.session.isMulti && data.round === this.session.roundNumber) {
      const myAns =
        this.myPlayerId === "host" ? data.hostAnswer : data.guestAnswer;
      const oppAns =
        this.myPlayerId === "host" ? data.guestAnswer : data.hostAnswer;

      const waitingModal = document.getElementById("waiting-modal");

      // Várakozó ablak
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

      // Kör vége kiértékelés
      if (data.hostAnswer !== "pending" && data.guestAnswer !== "pending") {
        this.clearWaitingTimeout();
        this.evaluateRound(data.hostAnswer, data.guestAnswer, data.round);
      }
    }

    // Új kör indítása
    if (this.session.isMulti && data.round > this.session.roundNumber) {
      this.startNextMultiRound(data.round);
    }

    // --- Rematch állapot figyelése ---
    if (data.rematch && data.rematch.status && data.rematch.status !== "none") {
      const r = data.rematch;
      const infoModal = document.getElementById("rematch-info-modal");
      const requestModal = document.getElementById("rematch-request-modal");

      if (r.status === "pending") {
        if (r.from === this.myPlayerId) {
          // Én kértem új párbajt → várakozó infó
          if (infoModal) infoModal.classList.add("open");
          if (requestModal) requestModal.classList.remove("open");
        } else {
          // A másik játékos kért rematch-et → döntő modál
          if (requestModal) requestModal.classList.add("open");
          if (infoModal) infoModal.classList.remove("open");
        }
      } else if (r.status === "accepted") {
        if (infoModal) infoModal.classList.remove("open");
        if (requestModal) requestModal.classList.remove("open");

        // Csak a kérő indítsa el ténylegesen az új párbajt
        if (r.from === this.myPlayerId && !this._rematchStartedToken) {
          this._rematchStartedToken = Date.now();
          this.prepareRematchGame(data);
        }
      } else if (r.status === "rejected") {
        if (requestModal) requestModal.classList.remove("open");

        // Kérő oldalán jelenik meg az üzenet
        if (r.from === this.myPlayerId) {
          if (infoModal) {
            infoModal.classList.add("open");
            const infoText = document.getElementById("rematch-info-text");
            if (infoText) {
              infoText.textContent =
                "A másik játékos elutasította az új párbajt, menj vissza gyakorolni!";
            }
          } else {
            alert(
              "A másik játékos elutasította az új párbajt, menj vissza gyakorolni!"
            );
          }
        } else if (infoModal) {
          infoModal.classList.remove("open");
        }

        // Host takarít pár másodperc után
        if (this.myPlayerId === "host" && this.roomRef) {
          setTimeout(() => {
            this.roomRef
              .child("rematch")
              .remove()
              .catch((err) =>
                console.error("Rematch törlés hiba (rejected):", err)
              );
          }, 4000);
        }
      }
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

    // Multi duel start event – csak egyszer, a host oldalán
    if (this.myPlayerId === "host") {
      this.track("multi_duel_start", {
        roomId: this.currentRoomId,
        totalRounds: questionIds.length
      });
    }

    this.start("MULTI", "MULTI", true, questionIds);
    this.session.roundNumber = roomData.round || 1;
  },

  evaluateRound(hAns, gAns, currentRound) {
    if (this.lastEvaluatedRound === currentRound) return; // Dupla futás ellen
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

    // Multiplayerben nem mutatjuk a pontszám kártyát
    if (scoreEl) scoreEl.style.display = "none";

    // Csak a felső ikonban van emoji, a cím / szöveg tiszta
    if (result === "win") {
      if (titleEl) titleEl.innerText = "GYŐZELEM!";
      if (msgEl) {
        msgEl.innerText =
          customMsg || "Az ellenfeled hibázott. Te vagy a bajnok!";
        msgEl.style.color = "var(--success)";
      }
      if (iconEl) iconEl.innerText = "🎉";
    } else if (result === "lose") {
      if (titleEl) titleEl.innerText = "VERESÉG";
      if (msgEl) {
        msgEl.innerText = customMsg || "Te hibáztál (vagy lassú voltál).";
        msgEl.style.color = "var(--error)";
      }
      if (iconEl) iconEl.innerText = "💀";
    } else {
      if (titleEl) titleEl.innerText = "DÖNTETLEN";
      if (msgEl) {
        msgEl.innerText = customMsg || "Döntetlen játék.";
        msgEl.style.color = "var(--text-main)";
      }
      if (iconEl) iconEl.innerText = "🤝";
    }

    // Gombok: Új párbaj + Vissza a főmenübe
    const actions = document.getElementById("end-actions");
    if (actions) {
      actions.innerHTML = "";

      const btnRematch = document.createElement("button");
      btnRematch.className = "btn-main";
      btnRematch.innerText = "Új párbaj indítása";
      btnRematch.onclick = () => this.requestRematch();
      actions.appendChild(btnRematch);

      const btnMenu = document.createElement("button");
      btnMenu.className = "btn-main btn-main--secondary";
      btnMenu.innerText = "Vissza a főmenübe";
      btnMenu.onclick = () => this.menu();
      actions.appendChild(btnMenu);

      this.autoScrollToPrimaryAction(actions, btnMenu, true);
    }

    // Umami – párbaj statisztika (host oldaláról elég)
    if (this.myPlayerId === "host") {
      const roundsPlayed = this.session.roundNumber || 1;
      const totalRounds =
        this.session.totalRounds ||
        (this.session.qList ? this.session.qList.length : 0);
      this.track("multi_duel_end", {
        roomId: this.currentRoomId,
        result,
        roundsPlayed,
        totalRounds
      });
    }

    // multi flag reset – hogy új "playing" állapotnál ismét elindulhasson a játék
    this.session.isMulti = false;
  },

  // Rematch indítása (host VAGY guest oldalról, link nélkül)

  requestRematch() {
    if (!this.currentRoomId || !this.roomRef) {
      alert("Technikai hiba: nincs aktív párbaj szoba.");
      return;
    }

    if (this.rematchRequestInProgress) return;
    this.rematchRequestInProgress = true;

    const payload = {
      status: "pending",
      from: this.myPlayerId || "host",
      createdAt:
        typeof firebase !== "undefined" && firebase.database
          ? firebase.database.ServerValue.TIMESTAMP
          : Date.now()
    };

    this.roomRef
      .child("rematch")
      .set(payload)
      .then(() => {
        this.rematchRequestInProgress = false;
        const infoModal = document.getElementById("rematch-info-modal");
        if (infoModal) infoModal.classList.add("open");

        const infoText = document.getElementById("rematch-info-text");
        if (infoText) {
          infoText.textContent =
            "Új párbajt kértél. Várakozás az ellenfél válaszára...";
        }

        this.track("multi_rematch_request_sent", {
          from: this.myPlayerId || "unknown"
        });
      })
      .catch((err) => {
        console.error("Rematch kérés hiba:", err);
        this.rematchRequestInProgress = false;
        alert("Nem sikerült elküldeni az új párbaj kérést.");
      });
  },

  handleRematchResponse(accept) {
    if (!this.roomRef) return;

    this.roomRef
      .child("rematch")
      .once("value")
      .then((snap) => {
        const r = snap.val();
        if (!r || r.status !== "pending") return;
        if (r.from === this.myPlayerId) return; // saját kérést nem mi bíráljuk el

        const newStatus = accept ? "accepted" : "rejected";
        return this.roomRef.child("rematch/status").set(newStatus);
      })
      .then(() => {
        this.track("multi_rematch_response", {
          accepted: !!accept,
          by: this.myPlayerId || "unknown"
        });

        const requestModal = document.getElementById("rematch-request-modal");
        if (requestModal) requestModal.classList.remove("open");
      })
      .catch((err) => {
        console.error("Rematch válasz hiba:", err);
      });
  },

  cancelRematchRequest() {
    if (!this.roomRef) return;

    this.roomRef
      .child("rematch")
      .once("value")
      .then((snap) => {
        const r = snap.val();
        if (!r || r.status !== "pending") return;
        if (r.from !== this.myPlayerId) return;
        return this.roomRef.child("rematch").remove();
      })
      .then(() => {
        const infoModal = document.getElementById("rematch-info-modal");
        if (infoModal) infoModal.classList.remove("open");
      })
      .catch((err) => {
        console.error("Rematch megszakítási hiba:", err);
      });
  },

  closeRematchModals() {
    const m1 = document.getElementById("rematch-request-modal");
    const m2 = document.getElementById("rematch-info-modal");
    if (m1) m1.classList.remove("open");
    if (m2) m2.classList.remove("open");
  },

  prepareRematchGame(roomData) {
    if (!this.roomRef) return;
    if (!this.db || !this.questionIndex) {
      alert("Technikai hiba: kérdésbank nem érhető el az új párbajhoz.");
      this._rematchStartedToken = null;
      return;
    }

    try {
      const allQuestionIds = Object.keys(this.questionIndex || {});
      if (allQuestionIds.length < 2) {
        alert("Nincs elég kérdés az új párbajhoz.");
        this._rematchStartedToken = null;
        return;
      }

      const shuffledIds = this.shuffle([...allQuestionIds]);
      const totalRounds = Math.min(
        CONFIG.MULTI_MAX_QUESTIONS,
        shuffledIds.length
      );
      const questionsForRoom = shuffledIds.slice(0, totalRounds);
      const seed = Math.floor(Math.random() * 1e9);

      const rematchBase = roomData && roomData.rematch ? roomData.rematch : {};

      this.roomRef
        .update({
          status: "playing",
          seed: seed,
          round: 1,
          hostAnswer: "pending",
          guestAnswer: "pending",
          questions: questionsForRoom,
          rematch: {
            status: "none",
            from: rematchBase.from || this.myPlayerId || "host",
            createdAt:
              typeof firebase !== "undefined" && firebase.database
                ? firebase.database.ServerValue.TIMESTAMP
                : Date.now()
          }
        })
        .then(() => {
          this._rematchStartedToken = null;
        })
        .catch((err) => {
          console.error("Új párbaj indítás hiba (rematch):", err);
          this._rematchStartedToken = null;
        });
    } catch (e) {
      console.error("Rematch előkészítés hiba:", e);
      this._rematchStartedToken = null;
    }
  },

  // --- GAME ENGINE ---

  /**
   * Single + Multi közös indító.
   * Multi esetén, ha questionIds adott, akkor abból építjük a qList-et (room.questions).
   */
};

// --- MODULE: UI (DOM + screens + UX helpers) ---
const UI = {
  track(eventName, data) {
    try {
      if (
        typeof window !== "undefined" &&
        window.umami &&
        typeof window.umami.track === "function"
      ) {
        window.umami.track(eventName, data);
      }
    } catch (e) {
      console.warn("Umami track hiba:", e);
    }
  },

  // --- INIT ---

  renderLives() {
    const livesEl = document.getElementById("g-lives");
    if (!livesEl) return;

    const lives = Math.max(this.session.lives, 0);
    livesEl.innerHTML = "";

    for (let i = 0; i < lives; i++) {
      livesEl.insertAdjacentHTML("beforeend", LIFE_SVG);
    }
  },

  updateStatsUI() {
    if (!this.db) return;

    let totalQuestions = 0;
    let totalAnswered = 0;

    (this.topics || []).forEach((topicMeta) => {
      const topicId =
        typeof topicMeta === "string" ? topicMeta : topicMeta.id;
      const topicData = this.db[topicId] || {};

      CONFIG.LEVELS.forEach((level) => {
        const qArr = topicData[level] || [];
        const total = qArr.length;
        const solvedIds = this.user.progress[topicId]?.[level] || [];
        const answered = Math.min(solvedIds.length, total);

        totalQuestions += total;
        totalAnswered += answered;
      });
    });

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
  },

  // --- SZINT ÁLLAPOTOK (LOCK / UNLOCK) ---

  getLevelLabel(level) {
    switch (level) {
      case "L1":
        return "Kezdő";
      case "L2":
        return "Haladó";
      case "L3":
        return "Profi";
      default:
        return level;
    }
  },

  // --- FŐMENÜ / TÉMAKÁRTYÁK ---

  renderMenu() {
    if (!this.db || !this.topics) return;

    const container = document.getElementById("topic-container");
    if (!container) return;

    container.innerHTML = "";

    let totalQuestions = 0;
    let totalAnswered = 0;
    let allCompleted = true;

    (this.topics || []).forEach((topicMeta, index) => {
      const topicId =
        typeof topicMeta === "string" ? topicMeta : topicMeta.id;
      const rawName =
        typeof topicMeta === "string"
          ? topicMeta
          : topicMeta.name || topicMeta.id;

      // számozott cím: "1) Alapfogalmak"
      const topicName = `${index + 1}) ${rawName}`;

      const topicData = this.db[topicId] || {};

      let topicTotal = 0;
      let topicAnswered = 0;
      const levelStats = {};

      CONFIG.LEVELS.forEach((level) => {
        const qArr = topicData[level] || [];
        const total = qArr.length;
        const solvedIds = this.user.progress[topicId]?.[level] || [];
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
            <img src="img/beginner_badge.png" alt="L1 szint"
                 class="topic-level-badge ${l1Done ? "active" : "inactive"}">
            <img src="img/intermediate_badge.png" alt="L2 szint"
                 class="topic-level-badge ${l2Done ? "active" : "inactive"}">
            <img src="img/expert_badge.png" alt="L3 szint"
                 class="topic-level-badge ${l3Done ? "active" : "inactive"}">
          </div>
        `;

      // teljes kártya kattintható → szintválasztó
      card.addEventListener("click", () => this.showLevels(topicId));

      container.appendChild(card);
    });

    // globális statok a fejlécben
    const statAnswered = document.getElementById("stat-answered");
    const statTotal = document.getElementById("stat-total");
    const statStreak = document.getElementById("stat-streak");

    if (statAnswered) statAnswered.textContent = totalAnswered;
    if (statTotal) statTotal.textContent = totalQuestions;
    if (statStreak) statStreak.textContent = this.user.streak || 0;

    // összesített progress badge
    const totalBadge = document.getElementById("total-badge");
    const totalProgressFill = document.getElementById("total-progress-fill");

    if (totalQuestions > 0) {
      const percent = Math.round((totalAnswered / totalQuestions) * 100);
      if (totalBadge) totalBadge.textContent = `${percent}%`;
      if (totalProgressFill) totalProgressFill.style.width = `${percent}%`;
    }

    // master info jelzés
    const masterInfo = document.getElementById("master-info");
    if (masterInfo) {
      masterInfo.style.display =
        allCompleted && totalQuestions > 0 ? "flex" : "none";
    }
  },

  // --- SZINTVÁLASZTÓ KÉPERNYŐ ---

  showLevels(topicId) {
    if (!this.db) return;

    this.track("topic_open", { topicId });

    const topicData = this.db[topicId] || {};
    const lvlTitle = document.getElementById("lvl-title");
    const levelContainer = document.getElementById("level-container");
    if (!lvlTitle || !levelContainer) return;

    const index = (this.topics || []).findIndex(
      (t) => (typeof t === "string" ? t : t.id) === topicId
    );
    const niceName = this.getTopicName(topicId);
    const prefix = index >= 0 ? `${index + 1}) ` : "";

    lvlTitle.textContent = `${prefix}${niceName}`;
    levelContainer.innerHTML = "";

    CONFIG.LEVELS.forEach((level) => {
      const qArr = topicData[level] || [];
      const total = qArr.length;
      const solvedIds = this.user.progress[topicId]?.[level] || [];
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
        <button type="button" class="btn-play ${done ? "done" : ""}" ${
        unlocked ? "" : "disabled"
      }>
          ${unlocked ? "Indítás" : "Zárolva"}
        </button>
      `;

      const btn = card.querySelector(".btn-play");
      if (btn && unlocked) {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.start(topicId, level, false);
        });
      }

      card.addEventListener("click", () => {
        if (unlocked) this.start(topicId, level, false);
      });

      levelContainer.appendChild(card);
    });

    this.showScreen("s-levels");
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

  // --- PWA / INSTALL / SERVICE WORKER ---

  initServiceWorker() {
    // PWA telepíthetőséghez szükséges: Service Worker regisztráció
    if (this._swRegistered) return;
    this._swRegistered = true;

    try {
      if (!("serviceWorker" in navigator)) return;

      navigator.serviceWorker
        .register("./sw.js", { scope: "./" })
        .then((reg) => {
          try {
            if (reg && typeof reg.update === "function") reg.update();
          } catch (e) {}
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker regisztráció sikertelen:", err);
        });
    } catch (e) {
      console.warn("[PWA] Service Worker init hiba:", e);
    }
  },

  // --- MULTIPLAYER (KÖR-ALAPÚ, DETERMINISZTIKUS KÉRDÉSLISTÁVAL) ---

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

    // Telepítés után (ahol támogatott), rejtsük el az install gombot
    window.addEventListener("appinstalled", () => {
      try {
        const b = document.getElementById("install-btn");
        if (b) b.style.display = "none";
      } catch (e) {}
    });
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
    const pdfUrl = "Floorball_Jatekszabalyok_2022_FINAL.pdf";

    // Egyszerű desktop-detektálás: nagyobb nézet + nem érintőkijelzőre optimalizált mobil
    const isDesktop =
      window.innerWidth >= 900 &&
      !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    this.track("rules_open", {
      mode: isDesktop ? "new_tab" : "in_app_inline"
    });

    if (isDesktop) {
      // Laptop / PC: PDF megnyitása teljes fülön
      window.open(pdfUrl, "_blank");
      return;
    }

    // MOBIL/TABLET: in-app (könnyű vissza) — iframe megjelenítése
    document.body.classList.add("rules-inline");

    // Ha van iframe a DOM-ban (.pdf-desktop-view), betöltjük oda a PDF-et
    const frame = document.querySelector(".pdf-desktop-view");
    if (frame) {
      // toolbar=0 trükk néha működik, néha nem – marad tisztán a PDF URL
      frame.setAttribute("src", pdfUrl);
    }

    this.showScreen("s-rules");

    // Injektálunk egy "Vissza" gombot a rules headerbe, ha még nincs
    const header = document.querySelector("#s-rules .rules-header");
    if (header && !header.querySelector(".rules-back-btn")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "icon-btn rules-back-btn";
      btn.setAttribute("aria-label", "Vissza a főmenübe");
      // ikon fallback: ha nincs icon font, akkor is ok
      btn.innerHTML = `<span style="font-size:1.2rem; font-weight:900;">←</span>`;
      btn.onclick = () => this.menu();
      header.insertAdjacentElement("afterbegin", btn);
    }

    // Biztos top pozíció (ne maradjon lent a scroll)
    this._afterDOMUpdate(() => {
      const content = this._getActiveScrollContainer();
      if (content && content.scrollTo) content.scrollTo({ top: 0, behavior: "auto" });
      window.scrollTo(0, 0);
    });
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

    // Multi flag reset, hogy új párbaj esetén ne akadjon el
    this.session.isMulti = false;

    // (1) Garantált felgörgetés: content + window is (view transition + DOM update után is)
    this._afterDOMUpdate(() => {
      const content = this._getActiveScrollContainer();
      try {
        if (content && content.scrollTo) {
          content.scrollTo({ top: 0, behavior: "auto" });
        } else {
          window.scrollTo(0, 0);
        }
        // Biztonsági extra: ha valami mégis beakad, egy második kör
        requestAnimationFrame(() => {
          const c2 = this._getActiveScrollContainer();
          if (c2 && c2.scrollTo) c2.scrollTo({ top: 0, behavior: "auto" });
          window.scrollTo(0, 0);
        });
      } catch (e) {}
    });

    this.track("menu_view");
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

    // Ha kilépünk a szabálykönyvből, állítsuk vissza a normál layoutot
    if (id !== "s-rules") {
      document.body.classList.remove("rules-inline");
    }

    // Scroll container reset – content-et kell görgetni, nem window-t
    const scrollContainer = this._getActiveScrollContainer();
    if (scrollContainer && scrollContainer.scrollTo) {
      scrollContainer.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  },

  initScrollGuards() {
    // Egyszer kötjük be: segít, hogy az auto-scroll ne "harcoljon" a felhasználóval
    if (this._scrollGuardsBound) return;
    this._scrollGuardsBound = true;
    this._lastUserInputTs = 0;

    const mark = () => {
      this._lastUserInputTs = Date.now();
    };

    window.addEventListener("wheel", mark, { passive: true });
    // JAVÍTÁS: A touchstart eseményt kivettük, hogy a sima "tap" (választás) ne tiltsa le a görgetést
    window.addEventListener("touchmove", mark, { passive: true });
    window.addEventListener("keydown", mark);
  },

  _afterDOMUpdate(fn) {
    // DOM frissítés UTÁN futtat (2x rAF), hogy a scroll számítás biztosan jó legyen
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(fn));
    } else {
      setTimeout(fn, 0);
    }
  },

  _prefersReducedMotion() {
    try {
      return (
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (e) {
      return false;
    }
  },

  _getActiveScrollContainer() {
    // A képernyők .content class-szal rendelkeznek és overflow-y: auto
    // A DOM struktúra alapján a <main class="content"> a valódi görgethető elem
    return document.querySelector(".content") || document.documentElement;
  },

  autoScrollToPrimaryAction(contextEl, primaryEl, force = false) {
    // Determinisztikus, mobilbarát auto-scroll
    if (!primaryEl) return;

    // Ha kényszerített (pl. gombnyomás után), akkor ne nézzük a user inputot azonnal
    if (!force) {
        const now = Date.now();
        if (now - (this._lastUserInputTs || 0) < 250) return;
    }

    const behavior = this._prefersReducedMotion() ? "auto" : "smooth";
    const margin = 120; // NAGYOBB margó (120px), hogy hamarabb görgessen

    const performScroll = () => {
      try {
        // Force esetén is ellenőrizzük, de lazábban
        if (!force) {
            const now2 = Date.now();
            if (now2 - (this._lastUserInputTs || 0) < 250) return;
        }

        const container = this._getActiveScrollContainer();
        const cRect =
          container && container.getBoundingClientRect
            ? container.getBoundingClientRect()
            : { top: 0, bottom: window.innerHeight };

        const pRect = primaryEl.getBoundingClientRect();

        // Ellenőrizzük, hogy a gomb kilóg-e a containerből
        const primaryBelow = pRect.bottom > cRect.bottom - margin;
        const primaryAbove = pRect.top < cRect.top + margin;

        if (primaryBelow || primaryAbove || force) {
          // JAVÍTÁS: "center", hogy biztosan látszódjon a gomb, ha kényszerítjük
          const blockPos = force ? "center" : "nearest";
          primaryEl.scrollIntoView({ behavior, block: blockPos });
          return;
        }

        if (contextEl && !force) {
          const ctxRect = contextEl.getBoundingClientRect();
          const ctxAbove = ctxRect.bottom < cRect.top + margin;
          const ctxBelow = ctxRect.top > cRect.bottom - margin;
          if (ctxAbove || ctxBelow) {
            contextEl.scrollIntoView({ behavior, block: "nearest" });
          }
        }
      } catch (e) {
        // Csöndben elengedjük
      }
    };

    // Azonnali próba + késleltetett biztonsági próba
    this._afterDOMUpdate(performScroll);
    if (force) {
      setTimeout(performScroll, 300);
    }
  }
};

// --- MODULE: Game (quiz flow controller) ---
const Game = {
  async init() {
    const container = document.getElementById("topic-container");
    if (container) {
      container.innerHTML =
        '<div style="text-align:center; padding:20px;">Adatok betöltése...</div>';
    }

    // PWA telepíthetőséghez: SW regisztráció minél előbb
    this.initServiceWorker();

    // PWA telepíthetőséghez: install gomb + beforeinstallprompt listener minél előbb
    // (Androidon a beforeinstallprompt esemény "lekéshető", ezért ne várjunk DB fetch-re)
    this.initInstallButton();

    try {
      const response = await fetch(CONFIG.DB_URL);
      if (!response.ok) throw new Error("DB hiba");

      const jsonData = await response.json();
      this.db = jsonData.data;
      this.topics = jsonData.topics || Object.keys(this.db || {});

      this.buildQuestionIndex();
      this.loadUser();
      this.applyTheme();
      this.renderMenu();
      this.checkWelcome();
      this.initScrollGuards();

      // Globális takarító listener (ha host zárja be)
      window.addEventListener("beforeunload", () => {
        if (this.myPlayerId === "host" && this.roomRef) {
          this.roomRef
            .remove()
            .catch((err) =>
              console.error("Szoba törlés hiba beforeunload:", err)
            );
        }
      });

      // Ha URL-ben room paraméter van, vendégként csatlakozunk (alap validálással)
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

      this.track("app_init");
    } catch (error) {
      console.error("Hiba:", error);
      if (container)
        container.innerHTML =
          "Hiba az adatok betöltésekor. Próbáld újra később.";
    }
  },

  // --- USER / LOCALSTORAGE ---

  start(topic, level, isMulti = false, questionIds = null) {
    let qList = [];

    if (isMulti) {
      if (Array.isArray(questionIds) && questionIds.length) {
        qList = questionIds
          .map((id) => this.questionIndex[id])
          .filter(Boolean);
      } else {
        // Fallback: minden kérdés összeöntése (nem ideális, de ne dőljön el az app)
        const allTopicsArr = this.topics || [];
        allTopicsArr.forEach((tMeta) => {
          const tId = typeof tMeta === "string" ? tMeta : tMeta.id;
          CONFIG.LEVELS.forEach((lvl) => {
            if (this.db[tId] && this.db[tId][lvl]) {
              qList = qList.concat(this.db[tId][lvl]);
            }
          });
        });
      }
    } else {
      // SINGLE PLAYER: szintzár ellenőrzése
      if (!this.isLevelUnlocked(topic, level)) {
        alert("Először fejezd be az előző szintet, utána léphetsz tovább.");
        return;
      }

      const topicData = this.db[topic] || {};
      const allQ = topicData[level] || [];
      qList = [...allQ];
    }

    // Keverés
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
      const solvedIDs = this.user.progress[topic]?.[level] || [];
      const toPlay = qList.filter((q) => !solvedIDs.includes(q.id));

      if (toPlay.length === 0) {
        if (
          confirm(
            "Már megoldottad az összes kérdést ezen a szinten.\nIndítsd újra gyakorlás módban?"
          )
        ) {
          const practiceList = this.shuffle([...qList]);
          this.session = {
            topic,
            level,
            qList: practiceList,
            idx: 0,
            lives: 3,
            isMulti: false,
            roundNumber: 0,
            totalRounds: practiceList.length,
            answeredCount: 0
          };
        } else {
          return;
        }
      } else {
        this.session = {
          topic,
          level,
          qList: toPlay,
          idx: 0,
          lives: 3,
          isMulti: false,
          roundNumber: 0,
          totalRounds: toPlay.length,
          answeredCount: 0
        };
      }
    } else {
      // MULTI: dinamikus körszám, ne fogyjon el a kérdés
      const totalRounds = Math.min(
        CONFIG.MULTI_MAX_QUESTIONS,
        qList.length
      );
      qList = qList.slice(0, totalRounds);

      this.session = {
        topic: "MULTI",
        level: "MULTI",
        qList,
        idx: 0,
        lives: 3,
        isMulti: true,
        roundNumber: 1,
        totalRounds,
        answeredCount: 0
      };
    }

    this.hasAnsweredThisRound = false;
    this.lastEvaluatedRound = 0;
    this.session.answeredCount = 0;

    this.showScreen("s-game");
    this.renderQ();

    // Single session start tracking
    if (!isMulti) {
      this.track("single_session_start", {
        topic: this.session.topic,
        level: this.session.level,
        questionCount: this.session.qList.length
      });
    }
  },

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
        this.renderLives();
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

    const qTextEl = document.getElementById("q-text");
    if (qTextEl) qTextEl.textContent = q.q;

    const cont = document.getElementById("g-opts");
    if (!cont) return;
    cont.style.display = "block";
    cont.innerHTML = "";
    const feed = document.getElementById("g-feed");
    if (feed) {
      feed.style.display = "none";
      feed.innerHTML = "";
    }

    const progEl = document.getElementById("g-prog");
    if (progEl && this.session.qList.length) {
      const answered = this.session.idx;
      const total = this.session.qList.length;
      const percent = Math.round((answered / total) * 100);
      progEl.style.width = percent + "%";
    }

    // Válaszok keverése – multi esetén seedelt, hogy mindkét félnek ugyanaz legyen
    let indices = [0, 1, 2];
    const seedBase = this.session.isMulti
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
    if (!q) return;

    // Session szintű kérdésszámláló
    this.session.answeredCount =
      (this.session.answeredCount || 0) + 1;

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

  shakeLives() {
    const livesEl = document.getElementById("g-lives");
    if (!livesEl) return;
    livesEl.classList.add("shake");
    setTimeout(() => livesEl.classList.remove("shake"), 500);
    if (navigator.vibrate) navigator.vibrate(200);
  },

  showFeedback(isOk, q) {
    // SVG-s élet ikonok frissítése, nincs külön ❤️ emoji
    this.renderLives();

    const opts = document.getElementById("g-opts");
    if (opts) opts.style.display = "none";

    const feed = document.getElementById("g-feed");
    if (!feed) return;
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

    // Auto-scroll: magyarázat + Következő/BEFEJEZÉS gomb legyen képernyőn mobilon is
    const nextBtn = feed.querySelector(".btn-main--next");
    setTimeout(() => {
        // Kényszerített görgetés (force=true), mert a felhasználó gombot nyomott
        this.autoScrollToPrimaryAction(feed, nextBtn, true);
    }, 150); // Megnövelt késleltetés a renderelés biztosítására
  },

  end(win) {
    this.showScreen("s-end");

    const iconEl = document.getElementById("end-icon");
    const titleEl = document.getElementById("end-title");
    const msgEl = document.getElementById("end-msg");
    const scoreEl = document.getElementById("end-score");

    const isWin = !!win;

    // Single playernél pontszám látszik, multi esetben nem
    if (!this.session.isMulti && scoreEl) {
      scoreEl.style.display = "block";
    } else if (scoreEl) {
      scoreEl.style.display = "none";
    }

    // Roast message-ek – emoji NINCS bennük
    const roastMessages = [
      "Ne búsulj, focizni még elmehetsz, vár a mennyei megyei!",
      "A szabálykönyv nem harap, nyugodtan kinyithatod néha!",
      "Sebaj! A lelátóról is lehet szépen szurkolni.",
      "A bíró vak volt? Nem, sajnos most te nézted be...",
      "Nyugi, a legjobbak is kezdték valahol. Mondjuk nem ennyire lentről.",
      "Úgy látom szabálykönyvet még nem hozott a Jézuska..."
    ];

    let roastText = roastMessages[0];
    if (roastMessages.length > 0) {
      const currentIndex =
        typeof this.user.roastIndex === "number"
          ? this.user.roastIndex % roastMessages.length
          : 0;

      roastText = roastMessages[currentIndex];

      this.user.roastIndex = (currentIndex + 1) % roastMessages.length;
      this.saveUser();
    }

    // Csak a felső ikonban van emoji
    if (iconEl) iconEl.innerText = isWin ? "🎉" : "💀";

    if (isWin) {
      if (titleEl) titleEl.innerText = "Kör vége";
      if (msgEl) {
        msgEl.innerText = "Szép munka! Csak így tovább!";
        msgEl.style.color = "";
        msgEl.style.fontWeight = "600";
      }
    } else {
      if (titleEl) titleEl.innerText = roastText;
      if (msgEl) {
        msgEl.innerText = "Game Over";
        msgEl.style.fontWeight = "800";
        msgEl.style.color = "var(--error)";
      }
    }

    if (scoreEl && !this.session.isMulti) {
      const solvedCount =
        this.session.answeredCount || this.session.idx;
      const totalCount = this.session.qList.length;
      scoreEl.innerText = `${solvedCount}/${totalCount}`;

      // Umami – single session vége + kérdésszám
      this.track("single_session_end", {
        topic: this.session.topic,
        level: this.session.level,
        answered: solvedCount,
        total: totalCount,
        result: isWin ? "completed" : "game_over"
      });
    }

    const actions = document.getElementById("end-actions");
    if (actions) {
      actions.innerHTML = "";
      const btnMenu = document.createElement("button");
      btnMenu.className = "btn-main btn-main--secondary";
      btnMenu.innerText = "Vissza a főmenübe";
      btnMenu.onclick = () => this.menu();
      actions.appendChild(btnMenu);

      this.autoScrollToPrimaryAction(actions, btnMenu, true);
    }
  },

  next() {
    this.session.idx++;
    if (this.session.idx < this.session.qList.length) {
      this.renderQ();
      const container = this._getActiveScrollContainer();
      if (container && container.scrollTo) {
        container.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      this.end(true);
    }
  },

  // --- EGYÉB & PWA / MULTI SEGÉDEK ---

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
  }
};


// --- WIRING: attach module methods to App (preserves legacy `this.*` calls) ---
function bindModuleMethods(app, moduleObj) {
  Object.keys(moduleObj).forEach((k) => {
    const v = moduleObj[k];
    if (typeof v === "function") {
      // Bound to App so internal `this.*` references remain identical to v1.0 behavior
      app[k] = v.bind(app);
    }
  });
}

// Bind modules in a predictable order
bindModuleMethods(App, State);
bindModuleMethods(App, DB);
bindModuleMethods(App, Network);
bindModuleMethods(App, UI);
bindModuleMethods(App, Game);

// Expose modules for readability / debugging (does not change public API expectations)
App.State = State;
App.DB = DB;
App.Network = Network;
App.UI = UI;
App.Game = Game;

// Keep legacy global name + inline onclick compatibility
const app = (window.app = App);

app.init();