import {
  creditWallet,
  fetchActivePrizeSequence,
  fetchWalletBalances,
  generatePrizeSequence,
  getStoredToken,
  getUserIdFromToken,
  login,
  register,
  transferWallet,
  uploadPrizeSequence,
} from "./api";
import { GameSocket, LeaderboardSocket } from "./ws";
import { PenaltyScene } from "./game/PenaltyScene";
import type { GameServerEvent, LeaderboardSnapshot, PenaltyKickResult } from "./types";

const $ = (id: string) => document.getElementById(id)!;
const $input = (id: string) => document.getElementById(id) as HTMLInputElement;
const $button = (id: string) => document.getElementById(id) as HTMLButtonElement;

const gameSocket = new GameSocket();
const leaderboardSocket = new LeaderboardSocket();
let scene: PenaltyScene | null = null;

let matchId = "";
let sequenceId = "";
let kicksRemaining = 0;
let inMatch = false;

function showApp(): void {
  $("app").classList.remove("hidden");
}

function setAuthStatus(message: string, isError = false): void {
  const el = $("auth-status");
  el.textContent = message;
  el.classList.toggle("error", isError);
}

function setCreditStatus(message: string, isError = false): void {
  const el = $("credit-status");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.classList.toggle("ok", !isError && message.length > 0);
}

function setTransferStatus(message: string, isError = false): void {
  const el = $("transfer-status");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.classList.toggle("ok", !isError && message.length > 0);
}

async function loadWalletBalances(): Promise<void> {
  const token = getStoredToken();
  if (!token) {
    $("wallet-balances").textContent = "Login to view balances";
    return;
  }

  try {
    const balances = await fetchWalletBalances();
    updateBalances(balances.mainBalance, balances.gameBalance);
    $("wallet-balances").textContent = `Main: ${balances.mainBalance} · Game: ${balances.gameBalance}`;
    setTransferStatus("");
  } catch (e) {
    $("wallet-balances").textContent = "Failed to load balances";
    setTransferStatus(
      e instanceof Error ? e.message : "Failed to load balances",
      true,
    );
  }
}

function syncCreditUserId(): void {
  const id = getUserIdFromToken();
  if (id !== null && !$input("credit-user-id").value.trim()) {
    $input("credit-user-id").value = String(id);
  }
}

function setHudStatus(text: string, live = false): void {
  const el = $("hud-status");
  el.textContent = text;
  el.classList.toggle("live", live);
}

function showModal(title: string, body: string): void {
  $("modal-title").textContent = title;
  $("modal-body").textContent = body;
  $("modal").classList.remove("hidden");
}

function hideModal(): void {
  $("modal").classList.add("hidden");
}

function setLeaderboardStatus(message: string): void {
  $("lb-updated").textContent = message;
}

function updateLeaderboard(snapshot: LeaderboardSnapshot): void {
  setLeaderboardStatus(
    snapshot.updatedAt
      ? `Updated ${new Date(snapshot.updatedAt).toLocaleTimeString()}`
      : "Live",
  );

  const list = $("leaderboard-list");
  list.innerHTML = "";
  if (!snapshot.entries.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No scores yet — play score-tracking games to rank up";
    list.appendChild(li);
    return;
  }
  for (const entry of snapshot.entries) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="rank">#${entry.rank}</span><span>${escapeHtml(entry.name)}</span><span>${entry.score}</span>`;
    list.appendChild(li);
  }
}

function connectLeaderboard(): void {
  const token = getStoredToken();
  if (!token) {
    leaderboardSocket.disconnect();
    setLeaderboardStatus("Login to view live rankings");
    $("leaderboard-list").innerHTML = "";
    return;
  }

  setLeaderboardStatus("Connecting…");
  leaderboardSocket.connect(token, updateLeaderboard, (status) => {
    if (status === "connected") {
      setLeaderboardStatus("Connected — loading…");
    } else if (status === "error") {
      setLeaderboardStatus("Connection failed — is the API running?");
    } else {
      setLeaderboardStatus("Disconnected");
    }
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function updateBalances(main: number, game: number): void {
  $("hud-main").textContent = String(main);
  $("hud-game").textContent = String(game);
}

function currentSequenceId(): string {
  return $input("sequence-id").value.trim();
}

function setSequenceStatus(message: string, isError = false): void {
  const el = $("sequence-status");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.classList.toggle("ok", !isError && message.length > 0);
}

function applyLinkedSequence(
  sequenceIdValue: string,
  stepCount: number,
  isActive = true,
): void {
  sequenceId = sequenceIdValue;
  $input("sequence-id").value = sequenceIdValue;
  localStorage.setItem("penalty-sequence-id", sequenceIdValue);
  setSequenceStatus(
    isActive
      ? `Linked to game: ${stepCount} kicks`
      : `Loaded ${stepCount} kicks (not active)`,
  );
  $("sequence-id-display").textContent = `ID: ${sequenceIdValue}`;
}

async function loadLinkedSequence(): Promise<void> {
  const token = getStoredToken();
  if (!token) {
    setSequenceStatus("Login to load the linked sequence");
    return;
  }

  try {
    const data = await fetchActivePrizeSequence();
    applyLinkedSequence(
      data.sequenceId,
      data.stepCount,
      data.isActive !== false,
    );
    updatePlayControls();
  } catch (e) {
    setSequenceStatus(
      e instanceof Error ? e.message : "Failed to load linked sequence",
      true,
    );
    $("sequence-id-display").textContent = "";
  }
}

function updatePlayControls(): void {
  const token = getStoredToken();
  const hasSequence = Boolean(currentSequenceId());
  $button("btn-upload").disabled = !token;
  $button("btn-generate-sequence").disabled = !token;
  $button("btn-refresh-sequence").disabled = !token;
  $button("btn-play").disabled = !token || !hasSequence;
  $button("btn-credit").disabled = !token;
  $button("btn-to-game").disabled = !token;
  $button("btn-to-main").disabled = !token;
  $button("btn-refresh-balances").disabled = !token;
  if (token) syncCreditUserId();
}

function onGameEvent(event: GameServerEvent): void {
  if (event.type === "connected") {
    setHudStatus("Socket ready — joining match…", true);
    return;
  }

  if (event.type === "WS_ERROR") {
    const msg = "message" in event && event.message ? String(event.message) : event.code;
    setHudStatus(`Error: ${msg}`, false);
    inMatch = false;
    scene?.setInteractive(false);
    return;
  }

  if (event.type === "player.joined" && event.gameType === "penalty-kicks") {
    kicksRemaining =
      typeof event.totalSteps === "number" ? event.totalSteps : kicksRemaining;
    $("hud-kicks").textContent = String(kicksRemaining);
    inMatch = true;
    scene?.setInteractive(true);
    setHudStatus("In match — pick a zone", true);
    return;
  }

  if (event.type === "penalty-kick.result") {
    void handleKickResult(event);
  }
}

async function handleKickResult(result: PenaltyKickResult): Promise<void> {
  kicksRemaining = result.remainingSteps;
  $("hud-kicks").textContent = String(kicksRemaining);
  updateBalances(result.mainBalance, result.gameBalance);

  await scene?.playKick(result.directionIndex, result.won);

  if (result.won) {
    showModal("Goal!", `You won ${result.amount} coins!`);
  } else if (kicksRemaining <= 0) {
    showModal("Match over", `Missed. Stake lost: ${result.amount}.`);
    endMatch();
  } else {
    setHudStatus(`Miss −${result.amount}. ${kicksRemaining} kick(s) left`, true);
  }

  if (result.won && kicksRemaining <= 0) {
    setTimeout(() => {
      showModal("Match complete", "You finished the prize sequence.");
      endMatch();
    }, 500);
  }
}

function endMatch(): void {
  if (inMatch && matchId) {
    try {
      gameSocket.leave(matchId);
    } catch {
      /* socket may be closed */
    }
  }
  inMatch = false;
  scene?.setInteractive(false);
  setHudStatus("Sequence complete", false);
}

async function startMatch(): Promise<void> {
  const token = getStoredToken();
  if (!token) {
    setAuthStatus("Login first", true);
    return;
  }

  if (!currentSequenceId()) {
    setSequenceStatus("Load a linked sequence first", true);
    return;
  }

  inMatch = false;
  scene?.setInteractive(false);

  matchId = `match-${Date.now()}`;
  $("hud-match").textContent = matchId;

  const joinMatch = (): void => {
    gameSocket.joinPenaltyMatch(matchId);
    setHudStatus("Joining match…", true);
  };

  gameSocket.connect(token, onGameEvent, (connected) => {
    if (!connected) {
      setHudStatus("Disconnected", false);
      inMatch = false;
      scene?.setInteractive(false);
      return;
    }
    joinMatch();
  });

  if (!leaderboardSocket.isConnected()) {
    connectLeaderboard();
  }
}

async function init(): Promise<void> {
  showApp();

  scene = new PenaltyScene($("pixi-host"), (directionIndex) => {
    if (!inMatch || !matchId) return;
    try {
      gameSocket.kick(matchId, directionIndex);
      scene?.setInteractive(false);
      setHudStatus("Kick sent…", true);
    } catch (e) {
      setHudStatus(e instanceof Error ? e.message : "Kick failed");
    }
  });
  await scene.init();
  scene.setInteractive(false);

  $("modal-close").addEventListener("click", hideModal);

  $("btn-login").addEventListener("click", async () => {
    try {
      await login($input("email").value.trim(), $input("password").value);
      setAuthStatus("Logged in");
      syncCreditUserId();
      await loadWalletBalances();
      await loadLinkedSequence();
      updatePlayControls();
      connectLeaderboard();
    } catch (e) {
      setAuthStatus(e instanceof Error ? e.message : "Login failed", true);
    }
  });

  $("btn-register").addEventListener("click", async () => {
    const email = $input("email").value.trim();
    try {
      await register(
        email.split("@")[0] || "Player",
        email,
        $input("password").value,
      );
      setAuthStatus("Registered");
      syncCreditUserId();
      await loadWalletBalances();
      await loadLinkedSequence();
      updatePlayControls();
      connectLeaderboard();
    } catch (e) {
      setAuthStatus(e instanceof Error ? e.message : "Register failed", true);
    }
  });

  const doTransfer = async (direction: "main-to-game" | "game-to-main") => {
    if (!getStoredToken()) {
      setTransferStatus("Login required", true);
      return;
    }

    const amount = Number.parseInt($input("transfer-amount").value, 10);
    if (!Number.isInteger(amount) || amount < 1) {
      setTransferStatus("Enter a positive transfer amount", true);
      return;
    }

    const btnId = direction === "main-to-game" ? "btn-to-game" : "btn-to-main";
    $button(btnId).disabled = true;
    setTransferStatus("Transferring…");
    try {
      const result = await transferWallet({
        amount,
        direction,
        gameType: "penalty-kicks",
      });
      updateBalances(result.mainBalance, result.gameBalance);
      $("wallet-balances").textContent = `Main: ${result.mainBalance} · Game: ${result.gameBalance}`;
      setTransferStatus(
        direction === "main-to-game"
          ? `Moved ${amount} to game wallet`
          : `Moved ${amount} to main wallet`,
      );
    } catch (e) {
      setTransferStatus(
        e instanceof Error ? e.message : "Transfer failed",
        true,
      );
    } finally {
      updatePlayControls();
    }
  };

  $("btn-to-game").addEventListener("click", () => void doTransfer("main-to-game"));
  $("btn-to-main").addEventListener("click", () => void doTransfer("game-to-main"));
  $("btn-refresh-balances").addEventListener("click", () => void loadWalletBalances());

  $("btn-refresh-sequence").addEventListener("click", () => void loadLinkedSequence());

  $("btn-generate-sequence").addEventListener("click", async () => {
    const stepCount = Number.parseInt($input("generate-step-count").value, 10);
    if (!Number.isInteger(stepCount) || stepCount < 1) {
      setSequenceStatus("Enter a valid kick count (1–500)", true);
      return;
    }
    $button("btn-generate-sequence").disabled = true;
    setSequenceStatus("Generating…");
    try {
      const data = await generatePrizeSequence({ stepCount, activate: true });
      applyLinkedSequence(data.sequenceId, data.stepCount, true);
    } catch (e) {
      setSequenceStatus(
        e instanceof Error ? e.message : "Generate failed",
        true,
      );
    } finally {
      updatePlayControls();
    }
  });

  $("btn-upload").addEventListener("click", async () => {
    const file = $input("prize-file").files?.[0];
    if (!file) return;
    $button("btn-upload").disabled = true;
    setSequenceStatus("Uploading…");
    try {
      const data = await uploadPrizeSequence(file);
      applyLinkedSequence(data.sequenceId, data.stepCount, data.isActive !== false);
    } catch (e) {
      setSequenceStatus(e instanceof Error ? e.message : "Upload failed", true);
    } finally {
      updatePlayControls();
    }
  });

  $("btn-play").addEventListener("click", () => void startMatch());

  $("btn-credit").addEventListener("click", async () => {
    const userId = Number.parseInt($input("credit-user-id").value, 10);
    const amount = Number.parseInt($input("credit-amount").value, 10);
    const reference = $input("credit-reference").value.trim();

    if (!Number.isInteger(userId) || userId < 1) {
      setCreditStatus("Enter a valid user ID", true);
      return;
    }
    if (!Number.isInteger(amount) || amount < 1) {
      setCreditStatus("Enter a positive amount", true);
      return;
    }

    $button("btn-credit").disabled = true;
    setCreditStatus("Crediting…");
    try {
      const result = await creditWallet({
        userId,
        amount,
        ...(reference ? { reference } : {}),
      });
      const selfId = getUserIdFromToken();
      if (selfId === result.userId) {
        await loadWalletBalances();
      }
      setCreditStatus(
        `Credited ${result.amount} → main balance ${result.mainBalance}`,
      );
    } catch (e) {
      setCreditStatus(e instanceof Error ? e.message : "Credit failed", true);
    } finally {
      updatePlayControls();
    }
  });

  if (getStoredToken()) {
    setAuthStatus("Session restored — start a match when ready");
    syncCreditUserId();
    void loadWalletBalances();
    void loadLinkedSequence();
    updatePlayControls();
    connectLeaderboard();
  } else {
    setAuthStatus("Login or register to play");
    setLeaderboardStatus("Login to view live rankings");
  }

  updatePlayControls();
}

void init();
