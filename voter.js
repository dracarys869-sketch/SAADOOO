/* global state, refs, normalizeVoterId, toast, renderAll, groupBy, uiState, ABSENT, escapeHtml, initials, updateVoterControls, renderVoterSummary, isVoterBallotComplete, openReviewModal, openModal, submitVote, showLoading, recalcVotes, logAudit, saveState, microDelay */

function renderVoter() {
  const voterId = state.currentUser?.voterId;
  if (!voterId) {
    window.location.href = "index.html";
    return;
  }

  const voter = state.voters.find((v) => normalizeVoterId(v.voterId) === normalizeVoterId(voterId));
  if (!voter) {
    toast("Voter not found.", "error");
    state.currentUser = null;
    saveState();
    window.location.href = "index.html";
    return;
  }

  if (voter.hasVoted) {
    refs.ballotArea.innerHTML = `<div class="empty-state">This voter ID already voted.</div>`;
    refs.openReviewBtn.disabled = true;
    refs.clearSelectionsBtn.disabled = true;
    refs.ballotProgress.textContent = "Completion: 100%";
    refs.voterHeaderStats.innerHTML = `<span class="status-pill">Already voted</span>`;
    return;
  }

  refs.voterHeaderStats.innerHTML = `<span class="status-pill">Signed in as voter</span>`;

  const byPosition = groupBy(state.candidates, (c) => c.position);
  const positions = Object.keys(byPosition).sort((a, b) => a.localeCompare(b));

  if (!Object.keys(uiState.voterSelections).length) {
    positions.forEach((p) => {
      uiState.voterSelections[p] = ABSENT;
    });
  }

  refs.ballotArea.innerHTML = positions.map((pos, idx) => {
    const candidates = [...byPosition[pos]].sort((a, b) => a.name.localeCompare(b.name));
    const selectedId = uiState.voterSelections[pos];
    const completion = selectedId !== ABSENT;

    return `
      <section class="position-section" data-position="${escapeHtml(pos)}">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Position</p>
            <h3>${idx + 1}. ${escapeHtml(pos)}</h3>
          </div>
          <div class="inline-stats">
            <span class="inline-pill">${completion ? "✓ Selected" : "Not selected"}</span>
          </div>
        </div>

        <div class="candidate-list">
          ${candidates.map((cand) => {
            const checked = selectedId === cand.id;
            return `
              <label class="candidate-card ${checked ? "selected" : ""}" data-candidate-id="${cand.id}">
                <input type="radio" name="pos-${escapeHtml(pos)}" value="${cand.id}" ${checked ? "checked" : ""} />
                <div class="avatar" style="width: 2.7rem; height: 2.7rem; flex: 0 0 auto;">
                  ${cand.photo ? `<img src="${escapeHtml(cand.photo)}" alt="${escapeHtml(cand.name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />` : `<span>${escapeHtml(initials(cand.name))}</span>`}
                </div>
                <div class="candidate-meta">
                  <div class="candidate-name">${escapeHtml(cand.name)}</div>
                  <div class="candidate-sub">${escapeHtml(cand.partylist || "Independent")} · ${escapeHtml(cand.election || "General")}</div>
                </div>
              </label>
            `;
          }).join("")}

          <label class="candidate-card abstain ${selectedId === ABSENT ? "selected" : ""}" data-abstain>
            <input type="radio" name="pos-${escapeHtml(pos)}" value="abstain" ${selectedId === ABSENT ? "checked" : ""} />
            <div class="avatar" style="width: 2.7rem; height: 2.7rem; flex: 0 0 auto;"><span>—</span></div>
            <div class="candidate-meta">
              <div class="candidate-name">Abstain</div>
              <div class="candidate-sub">No candidate selected for this position</div>
            </div>
          </label>
        </div>
      </section>
    `;
  }).join("");

  updateVoterControls(positions);

  refs.ballotArea.querySelectorAll("section.position-section").forEach((sec) => {
    const pos = sec.getAttribute("data-position");
    sec.querySelectorAll("input[type='radio']").forEach((radio) => {
      radio.addEventListener("change", () => {
        if (!pos) return;
        if (radio.value === "abstain") {
          uiState.voterSelections[pos] = ABSENT;
        } else {
          uiState.voterSelections[pos] = Number(radio.value);
        }
        renderVoter();
      });
    });
  });

  renderVoterSummary(positions);
}

function updateVoterControls(positions) {
  const selectedCount = positions.reduce((acc, pos) => (uiState.voterSelections[pos] !== ABSENT ? acc + 1 : acc), 0);

  const percent = positions.length ? Math.round((selectedCount / positions.length) * 100) : 0;
  refs.ballotProgress.textContent = `Completion: ${percent}%`;

  const complete = selectedCount === positions.length;
  refs.openReviewBtn.disabled = !complete;
  refs.clearSelectionsBtn.disabled = false;
}

function isVoterBallotComplete() {
  const positions = Object.keys(groupBy(state.candidates, (c) => c.position));
  return positions.every((pos) => uiState.voterSelections[pos] !== ABSENT);
}

function renderVoterSummary(positions) {
  refs.selectionSummary.innerHTML = positions.map((pos) => {
    const selectedId = uiState.voterSelections[pos];
    if (selectedId === ABSENT) {
      return `<div class="summary-row not-selected"><div class="summary-key">${escapeHtml(pos)}</div><div class="summary-val">Not selected</div></div>`;
    }
    const cand = state.candidates.find((c) => c.id === selectedId);
    return `<div class="summary-row"><div class="summary-key">${escapeHtml(pos)}</div><div class="summary-val">${escapeHtml(cand?.name || "Unknown")}</div></div>`;
  }).join("");
}

function openReviewModal() {
  const positions = Object.keys(groupBy(state.candidates, (c) => c.position));
  const selections = positions.map((pos) => ({ pos, candidateId: uiState.voterSelections[pos] }));

  const summaryHtml = selections.map(({ pos, candidateId }) => {
    if (candidateId === ABSENT) {
      return `<div class="review-row"><div class="review-key">${escapeHtml(pos)}</div><div class="review-val">Abstain</div></div>`;
    }
    const cand = state.candidates.find((c) => c.id === candidateId);
    return `<div class="review-row"><div class="review-key">${escapeHtml(pos)}</div><div class="review-val">${escapeHtml(cand?.name || "Unknown")}</div></div>`;
  }).join("");

  openModal({
    eyebrow: "Review ballot",
    title: "Submit your vote?",
    body: `
      <div class="review-summary">
        ${summaryHtml}
        <p class="help-text">After submission, this voter ID cannot vote again.</p>
      </div>
    `,
    footer: [
      {
        label: "Cancel",
        variant: "ghost",
        action: () => {}
      },
      {
        label: "Submit",
        variant: "primary",
        action: () => submitVote(selections),
      },
    ],
  });
}

function submitVote(selections) {
  const voterId = state.currentUser?.voterId;
  if (!voterId) return;

  showLoading(true, "Submitting ballot...");
  
  const voter = state.voters.find((v) => normalizeVoterId(v.voterId) === normalizeVoterId(voterId));
  if (voter) {
    voter.hasVoted = true;
  }

  selections.forEach(({ pos, candidateId }) => {
    const voteEntry = {
      id: state.settings.nextIds.vote,
      voterId: voterId,
      candidateId: candidateId === ABSENT ? null : candidateId,
      position: pos,
      createdAt: new Date().toISOString()
    };
    state.votes.push(voteEntry);
    state.settings.nextIds.vote += 1;
  });

  recalcVotes();
  logAudit("cast_ballot", `voterId=${voterId}; selections=${selections.length}`);
  
  state.currentUser = null;
  uiState.voterSelections = {};
  saveState();

  refs.modalDialog.close();
  showLoading(false);
  toast("Thank you! Your ballot has been cast.", "success");
  window.location.href = "index.html";
}
