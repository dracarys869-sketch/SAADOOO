/* global refs, crypto, state, saveState, FileReader, Blob, URL, document, window */

function toast(message, variant = "success") {
  const el = refs.toastRegion;
  if (!el) return;
  el.textContent = message;
  el.dataset.variant = variant;
  el.classList.remove("show");
  // force reflow
  void el.offsetHeight;
  el.classList.add("show");
}

function showLoading(show, text = "Processing...") {
  if (!refs.loadingOverlay) return;
  refs.loadingOverlay.hidden = !show;
  refs.loadingOverlay.setAttribute("aria-busy", show ? "true" : "false");
  if (show && refs.loadingText) refs.loadingText.textContent = text;
} 

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function groupBy(array, keyFn) {
  return array.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {});
}

function normalizeText(s) {
  return String(s ?? "").trim();
}

function normalizeVoterId(voterId) {
  return String(voterId ?? "").trim().toUpperCase();
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function microDelay() {
  return new Promise((resolve) => window.setTimeout(resolve, 180));
}

function initials(name) {
  if (!name) return "";
  return name
    .split(/\s+/)
    .map((p) => (p ? p[0] : ""))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function candidateInitials(name) {
  return initials(name);
}

function uniqueElections() {
  return [...new Set(state.candidates.map((c) => c.election).filter(Boolean))];
}

function uniquePositions() {
  return [...new Set(state.candidates.map((c) => c.position).filter(Boolean))];
}

function filterCandidatesByElection(selection) {
  return selection === "all" ? [...state.candidates] : state.candidates.filter((candidate) => candidate.election === selection);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function dateStamp() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
}

function downloadText(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function openModal({ eyebrow = "", title = "", body = "", footer = [] }) {
  refs.modalEyebrow.textContent = eyebrow;
  refs.modalTitle.textContent = title;
  refs.modalBody.innerHTML = body;
  refs.modalFooter.innerHTML = "";

  footer.forEach((buttonConfig) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = buttonConfig.variant === "primary" ? "primary-button" : "ghost-button subtle";
    button.textContent = buttonConfig.label;
    button.addEventListener("click", () => {
      if (buttonConfig.action) buttonConfig.action();
      if (buttonConfig.variant !== "primary") refs.modalDialog.close();
    });
    refs.modalFooter.appendChild(button);
  });

  if (!refs.modalDialog.open) refs.modalDialog.showModal();
}

function confirmAction(title, message) {
  return new Promise((resolve) => {
    openModal({
      eyebrow: "Confirm action",
      title,
      body: `<p>${escapeHtml(message)}</p>`,
      footer: [
        { label: "Cancel", variant: "ghost", action: () => resolve(false) },
        { label: "Confirm", variant: "primary", action: () => resolve(true) },
      ],
    });
  });
}

function recalcVotes() {
  state.candidates.forEach((candidate) => {
    candidate.votes = state.votes.filter((vote) => vote.candidateId === candidate.id).length;
  });
}

function logAudit(action, details = "") {
  state.auditLogs.push({
    id: state.auditLogs.length + 1,
    actor: state.currentUser?.username || state.currentUser?.voterId || "admin",
    action,
    details,
    createdAt: new Date().toISOString(),
  });
  saveState();
}
