/* global document, window, localStorage */

const STORAGE_KEY = "eboto-web-state-v3";

const defaultState = () => ({
  version: 2,
  activeView: "login", // login | voter | admin
  loginRole: "admin", // voter | admin | agent
  adminTab: "dashboard", // dashboard | candidates | voters | results | audit
  currentUser: null, // { username } or { voterId }
  adminUsers: [{ username: "admin", passwordHash: "" }],

  voters: [],

  candidates: [],

  votes: [], // { id, voterId, candidateId, position, createdAt }
  auditLogs: [],
  
  elections: [],

  settings: {
    nextIds: { voter: 1, candidate: 1, vote: 1, election: 1 }
  }
});

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = defaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed = JSON.parse(raw);
    const migrated = { ...defaultState(), ...parsed, settings: { ...defaultState().settings, ...(parsed.settings || {}) } };
    return migrated;
  } catch {
    const initial = defaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state to localStorage:", e);
    if (typeof toast === "function") {
      toast("Storage limit exceeded! Please clear older voters or results.", "error");
    }
  }
}

function refreshState() {
  const fresh = loadState();
  Object.assign(state, fresh);
}

const state = loadState();
window.state = state;
window.saveState = saveState;

const refs = {
  app: document.getElementById("app"),
  loginView: document.getElementById("loginView"),
  voterView: document.getElementById("voterView"),
  adminView: document.getElementById("adminView"),
  adminContent: document.getElementById("adminContent"),
  toastRegion: document.getElementById("toastRegion"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  loadingText: document.getElementById("loadingText"),

  _loadingTextFallback: document.getElementById("loadingText"),
  modalDialog: document.getElementById("modalDialog"),
  modalEyebrow: document.getElementById("modalEyebrow"),
  modalTitle: document.getElementById("modalTitle"),
  modalBody: document.getElementById("modalBody"),
  modalFooter: document.getElementById("modalFooter"),

  loginStats: document.getElementById("loginStats"),
  voterHeaderStats: document.getElementById("voterHeaderStats"),
  ballotArea: document.getElementById("ballotArea"),
  ballotProgress: document.getElementById("ballotProgress"),
  selectionSummary: document.getElementById("selectionSummary"),
  openReviewBtn: document.getElementById("openReviewBtn"),
  clearSelectionsBtn: document.getElementById("clearSelectionsBtn"),
  voterLoginForm: document.getElementById("voterLoginForm"),

  adminLoginForm: document.getElementById("adminLoginForm"),
  voterIdInput: document.getElementById("voterIdInput"),
  adminUsernameInput: document.getElementById("adminUsernameInput"),
  adminPasswordInput: document.getElementById("adminPasswordInput"),

  voterLogoutBtn: document.getElementById("voterLogoutBtn"),
  adminLogoutBtn: document.getElementById("adminLogoutBtn"),

  // Biometric Self-Registration Wizard elements
  registrationView: document.getElementById("registrationView"),
  startRegisterBtn: document.getElementById("startRegisterBtn"),
  cancelRegisterBtn: document.getElementById("cancelRegisterBtn"),
  stepIndicator1: document.getElementById("stepIndicator1"),
  stepIndicator2: document.getElementById("stepIndicator2"),
  stepIndicator3: document.getElementById("stepIndicator3"),
  stepContent1: document.getElementById("stepContent1"),
  stepContent2: document.getElementById("stepContent2"),
  stepContent3: document.getElementById("stepContent3"),
  govIdUpload: document.getElementById("govIdUpload"),
  idScanContainer: document.getElementById("idScanContainer"),
  idPreviewImg: document.getElementById("idPreviewImg"),
  nextStep1Btn: document.getElementById("nextStep1Btn"),
  regFullName: document.getElementById("regFullName"),
  regCourse: document.getElementById("regCourse"),
  regVoterId: document.getElementById("regVoterId"),
  regSchoolName: document.getElementById("regSchoolName"),
  selfieVideo: document.getElementById("selfieVideo"),
  selfieCanvas: document.getElementById("selfieCanvas"),
  startCamBtn: document.getElementById("startCamBtn"),
  captureSelfieBtn: document.getElementById("captureSelfieBtn"),
  selfieUpload: document.getElementById("selfieUpload"),
  chooseSelfieFileBtn: document.getElementById("chooseSelfieFileBtn"),
  matchingStatus: document.getElementById("matchingStatus"),
  matchProgressTitle: document.getElementById("matchProgressTitle"),
  matchResultBox: document.getElementById("matchResultBox"),
  matchScoreVal: document.getElementById("matchScoreVal"),
  matchResultPill: document.getElementById("matchResultPill"),
  matchingPlaceholder: document.getElementById("matchingPlaceholder"),
  nextStep2Btn: document.getElementById("nextStep2Btn"),
  prevStep2Btn: document.getElementById("prevStep2Btn"),
  prevStep3Btn: document.getElementById("prevStep3Btn"),
  submitRegisterBtn: document.getElementById("submitRegisterBtn"),
  regSummaryList: document.getElementById("regSummaryList"),

  // Biometric Auth modal elements
  biometricAuthModal: document.getElementById("biometricAuthModal"),
  authVideo: document.getElementById("authVideo"),
  authCanvas: document.getElementById("authCanvas"),
  livenessChallengeContainer: document.getElementById("livenessChallengeContainer"),
  livenessInstruction: document.getElementById("livenessInstruction"),
  livenessProgressBar: document.getElementById("livenessProgressBar"),
  authStatusText: document.getElementById("authStatusText"),
  cancelBioAuthBtn: document.getElementById("cancelBioAuthBtn"),
  startBioAuthCamBtn: document.getElementById("startBioAuthCamBtn"),
};

const uiState = {
  voterSelections: {},
  candidateSearch: "",
  candidateSort: "name-asc",
  candidateFilterElection: "all",
  voterSearch: "",
  voterFilterStatus: "all",
  voterSort: "name-asc",
  resultElection: "all",
  auditSearch: ""
};

const regState = {
  step: 1,
  idCardDataUrl: "",
  selfieDataUrl: "",
  extractedData: null,
  stream: null,
  biometricMatched: false,
  matchScore: 0
};

const ABSENT = Symbol("absent");

function requiredDomIdsPresent() {
  const pathname = window.location.pathname.toLowerCase();
  const isLoginPage = pathname.endsWith("index.html") || pathname.endsWith("/") || (!pathname.endsWith("admin.html") && !pathname.endsWith("voter.html"));
  if (!isLoginPage) return [];

  const required = [
    "loginView",
    "adminLoginForm",
    "adminUsernameInput",
    "adminPasswordInput",
    "voterLoginForm",
    "voterIdInput",
  ];
  const requiredSelectors = [
    '[data-login-role="admin"]',
    '[data-login-panel="admin"]'
  ];
  const missing = [];
  for (const id of required) {
    if (!document.getElementById(id)) missing.push(`#${id}`);
  }
  for (const sel of requiredSelectors) {
    if (!document.querySelector(sel)) missing.push(sel);
  }
  return missing;
}

function safeToastCriticalMissing(missing) {
  const msg = `Web login broken (missing DOM): ${missing.join(", ")}`;
  if (refs.toastRegion) {
    refs.toastRegion.textContent = msg;
    refs.toastRegion.dataset.variant = "error";
    refs.toastRegion.classList.add("show");
  }
  console.error(msg);
}

const __missingDomForLogin = requiredDomIdsPresent();
if (__missingDomForLogin.length) {
  safeToastCriticalMissing(__missingDomForLogin);
}
