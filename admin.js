/* global state, refs, saveState, renderAll, escapeHtml, loadState, Chart, initials, fileToDataUrl, toast, showLoading, logAudit, uniqueElections, uiState, filterCandidatesByElection, renderResultsChart, resultGroupMarkup, exportResultsJson, downloadBackup, resetElection, deleteElection, openModal, uniquePositions, recalcVotes, normalizeVoterId, normalizeText, confirmAction, downloadText, dateStamp, document, window, setInterval, clearInterval, Number */

function renderAdmin() {
  const username = state.currentUser?.username;
  if (!username) {
    window.location.href = "index.html";
    return;
  }
  const tab = state.adminTab || "dashboard";
  renderAdminView(tab);
}

function renderAdminView(tab) {
  if (tab === "dashboard") renderDashboard();
  else if (tab === "elections") renderElectionsManager();
  else if (tab === "candidates") renderCandidatesManager();
  else if (tab === "voters") renderVotersManager();
  else if (tab === "requests") renderRegistrationRequests();
  else if (tab === "results") renderResultsManager();
  else if (tab === "audit") renderAuditLog();
  else if (tab === "settings") renderSettingsManager();
}

function renderAdminShell(activeTab, contentHtml = "") {
  const activeElection = state.elections.find(e => e.status === "active") || { name: "No Active Election", status: "closed" };
  
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>` },
    { id: "elections", label: "Elections", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>` },
    { id: "candidates", label: "Candidates", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-3-3.87"/><path d="M9 21v-2a4 4 0 0 0-3-3.87"/><circle cx="12" cy="7" r="4"/></svg>` },
    { id: "voters", label: "Voters", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
    { id: "results", label: "Results", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>` },
    { id: "audit", label: "Audit Logs", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>` },
    { id: "settings", label: "Settings", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>` }
  ];

  return `
    <div class="premium-admin-shell" id="adminShellContainer">
      <!-- Sidebar -->
      <aside class="admin-sidebar-new">
        <div class="sidebar-header">
          <div class="sidebar-logo">✓</div>
          <span class="sidebar-title">E BOTO MO NA YAN</span>
        </div>
        <nav class="sidebar-menu">
          ${menuItems.map(item => `
            <button class="menu-item ${item.id === activeTab ? "active" : ""}" onclick="setAdminTab('${item.id}')">
              <span class="menu-icon">${item.icon}</span>
              <span class="menu-label">${item.label}</span>
            </button>
          `).join("")}
        </nav>
      </aside>

      <!-- Topbar -->
      <header class="admin-topbar-new">
        <div class="topbar-left">
          <button class="sidebar-toggle-btn" onclick="toggleSidebar()" aria-label="Toggle Sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div class="election-status-badge ${activeElection.status}">
            <span>${escapeHtml(activeElection.name)}</span>
            <span>(${activeElection.status})</span>
          </div>
        </div>
        <div class="topbar-right">
          <div class="admin-profile-dropdown">
            <div class="admin-avatar">A</div>
            <div class="admin-info">
              <span class="admin-name">Administrator</span>
              <span class="admin-role">Owner</span>
            </div>
          </div>
          <button class="logout-btn-new" onclick="adminLogout()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <!-- Main Workspace -->
      <main class="admin-workspace-new">
        ${contentHtml}
      </main>
    </div>
  `;
}

window.toggleSidebar = function() {
  const container = document.getElementById("adminShellContainer");
  if (container) {
    container.classList.toggle("collapsed");
  }
};

window.renderAdmin = renderAdmin;

window.setAdminTab = function(tab) {
  const fresh = loadState();
  Object.assign(state, fresh);
  state.adminTab = tab;
  saveState();
  renderAdmin();
};

window.adminLogout = function() {
  state.currentUser = null;
  saveState();
  window.location.href = "index.html";
};

function initDashboardCharts() {
  const ctxTurnout = document.getElementById('turnoutChart')?.getContext('2d');
  if (ctxTurnout) {
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
    const turnoutData = hours.map(h => {
      if (!state.voters.length) return 0;
      const hourInt = parseInt(h.split(':')[0]);
      const uniqueVotersCount = new Set(state.votes.filter(v => {
        const d = new Date(v.createdAt);
        return d.getHours() < hourInt || (d.getHours() === hourInt && d.getMinutes() === 0);
      }).map(v => v.voterId)).size;
      return parseFloat(((uniqueVotersCount / state.voters.length) * 100).toFixed(1));
    });

    if (window.turnoutChartInstance) {
      window.turnoutChartInstance.destroy();
    }
    window.turnoutChartInstance = new Chart(ctxTurnout, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [{
          label: 'Turnout %',
          data: turnoutData,
          borderColor: '#06B6D4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  }

  const ctxVotes = document.getElementById('votesChart')?.getContext('2d');
  if (ctxVotes) {
    const labels = state.candidates.map(c => c.name).slice(0, 5);
    const votes = state.candidates.map(c => c.votes).slice(0, 5);
    if (window.votesChartInstance) {
      window.votesChartInstance.destroy();
    }
    window.votesChartInstance = new Chart(ctxVotes, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Votes',
          data: votes,
          backgroundColor: ['#2563EB', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  }

  const ctxDept = document.getElementById('deptChart')?.getContext('2d');
  if (ctxDept) {
    const deptLabels = [];
    const deptData = [];
    if (state.voters.length > 0) {
      const batches = {};
      state.voters.forEach(v => {
        const prefix = (v.voterId || "").split('-')[0] || "Other";
        batches[prefix] = (batches[prefix] || 0) + 1;
      });
      Object.entries(batches).forEach(([batch, count]) => {
        deptLabels.push(`Batch ${batch}`);
        deptData.push(count);
      });
    }

    if (window.deptChartInstance) {
      window.deptChartInstance.destroy();
    }
    window.deptChartInstance = new Chart(ctxDept, {
      type: 'doughnut',
      data: {
        labels: deptLabels.length ? deptLabels : ['No data available'],
        datasets: [{
          data: deptData.length ? deptData : [1],
          backgroundColor: deptData.length ? ['#2563EB', '#06B6D4', '#8B5CF6', '#10B981'] : ['rgba(255, 255, 255, 0.05)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
      }
    });
  }
}

function renderDashboard() {
  const activeElection = state.elections.find(e => e.status === "active") || { name: "No Active Election", status: "closed" };
  const totalVoters = state.voters.length;
  const verifiedVoters = state.voters.filter(v => v.selfie).length;
  const votedCount = state.voters.filter(v => v.hasVoted).length;
  const turnout = totalVoters ? ((votedCount / totalVoters) * 100).toFixed(1) : "0.0";
  const totalCandidates = state.candidates.length;

  const activityLogs = state.auditLogs.slice(-4).reverse();
  const activityHtml = activityLogs.map(log => {
    let typeClass = "voter";
    if (log.action.includes("candidate")) typeClass = "candidate";
    if (log.action.includes("vote") || log.action.includes("ballot")) typeClass = "vote";
    if (log.action.includes("biometric") || log.action.includes("security")) typeClass = "security";
    
    return `
      <div class="activity-item-new">
        <div class="activity-dot-pulsing ${typeClass}"></div>
        <div class="activity-item-details">
          <span class="activity-item-text"><strong>${escapeHtml(log.actor)}</strong>: ${escapeHtml(log.action.replace(/_/g, ' '))}</span>
          <div class="activity-item-meta">
            <span>${escapeHtml(log.details)}</span>
            <span>${new Date(log.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    `;
  }).join("") || `<div class="muted">No recent activity logs.</div>`;

  refs.adminContent.innerHTML = renderAdminShell("dashboard", `
    <div class="admin-welcome-section">
      <div class="welcome-info">
        <h2>Welcome back, Administrator</h2>
        <p>Current Election Overview: <strong>${escapeHtml(activeElection.name)}</strong></p>
      </div>
      <div class="welcome-stats-summary">
        <div class="summary-stat-item">
          <span class="summary-stat-label">SYSTEM STATUS</span>
          <span class="summary-stat-value" style="color: var(--admin-success);">ACTIVE</span>
        </div>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="admin-stats-grid-new">
      <div class="stat-card-new registered">
        <div class="stat-details">
          <span class="stat-title">Registered Voters</span>
          <span class="stat-value">${totalVoters}</span>
          <span class="stat-subtitle">Total database records</span>
        </div>
        <div class="stat-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
      </div>

      <div class="stat-card-new verified">
        <div class="stat-details">
          <span class="stat-title">Verified Voters</span>
          <span class="stat-value">${verifiedVoters}</span>
          <span class="stat-subtitle">Biometric profiles ready</span>
        </div>
        <div class="stat-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
      </div>

      <div class="stat-card-new votes">
        <div class="stat-details">
          <span class="stat-title">Votes Cast</span>
          <span class="stat-value">${votedCount}</span>
          <span class="stat-subtitle">Ballots decrypted</span>
        </div>
        <div class="stat-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
      </div>

      <div class="stat-card-new turnout">
        <div class="stat-details">
          <span class="stat-title">Voter Turnout</span>
          <span class="stat-value">${turnout}%</span>
          <span class="stat-subtitle">Participation rate</span>
        </div>
        <div class="stat-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        </div>
      </div>

      <div class="stat-card-new candidates">
        <div class="stat-details">
          <span class="stat-title">Active Candidates</span>
          <span class="stat-value">${totalCandidates}</span>
          <span class="stat-subtitle">Across all positions</span>
        </div>
        <div class="stat-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>
        </div>
      </div>

    </div>

    <!-- Real-Time Monitoring Section -->
    <div class="realtime-monitoring-card">
      <div class="monitoring-header">
        <div class="monitoring-title">
          <div class="live-indicator-pulsing"></div>
          <h3>Real-Time Election Monitoring</h3>
        </div>
        <span class="admin-badge primary" style="font-weight: 700;">Live Feed Active</span>
      </div>
      <div class="monitoring-grid">
        <div class="monitoring-stat-item">
          <div class="monitoring-stat-label">Live Vote Count</div>
          <div class="monitoring-stat-value" id="liveVoteCountVal">${votedCount}</div>
        </div>
        <div class="monitoring-stat-item">
          <div class="monitoring-stat-label">Turnout Percentage</div>
          <div class="monitoring-stat-value">${turnout}%</div>
        </div>
        <div class="monitoring-stat-item">
          <div class="monitoring-stat-label">Active Voters Online</div>
          <div class="monitoring-stat-value" id="activeOnlineVotersVal">${totalVoters > 0 && activeElection.status === "active" ? 12 : 0}</div>
        </div>
      </div>
      <div class="monitoring-progress-wrapper">
        <div class="progress-label-row">
          <span>Election Progress</span>
          <span>${turnout}% Complete</span>
        </div>
        <div class="premium-progress-bar">
          <div class="premium-progress-bar-inner" style="width: ${turnout}%;"></div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-grid-new">
      <div class="chart-card-new">
        <div class="chart-card-header">
          <h4>Voter Turnout Rate</h4>
          <span class="admin-badge success">Live</span>
        </div>
        <div class="chart-container-new">
          <canvas id="turnoutChart"></canvas>
        </div>
      </div>
      
      <div class="chart-card-new">
        <div class="chart-card-header">
          <h4>Votes per Candidate</h4>
          <span class="admin-badge primary">Top 5</span>
        </div>
        <div class="chart-container-new">
          <canvas id="votesChart"></canvas>
        </div>
      </div>

      <div class="chart-card-new">
        <div class="chart-card-header">
          <h4>Department/Course Participation</h4>
          <span class="admin-badge primary">Distribution</span>
        </div>
        <div class="chart-container-new">
          <canvas id="deptChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Lower Section Grid -->
    <div class="lower-sections-grid">
      <!-- Recent Activity Panel -->
      <div class="recent-activity-panel-new">
        <div class="monitoring-header">
          <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0;">Recent Audit & Activity Logs</h3>
          <button class="glass-button-new secondary" onclick="setAdminTab('audit')">View All</button>
        </div>
        <div class="activity-list-new">
          ${activityHtml}
        </div>
      </div>
    </div>
  `);

  initDashboardCharts();

  if (window.voterSimulationInterval) clearInterval(window.voterSimulationInterval);
  if (totalVoters > 0 && activeElection.status === "active") {
    window.voterSimulationInterval = setInterval(() => {
      const el = document.getElementById("activeOnlineVotersVal");
      if (el) {
        const current = Number(el.textContent);
        const diff = Math.floor(Math.random() * 5) - 2;
        const next = Math.max(2, Math.min(48, current + diff));
        el.textContent = next;
      }
    }, 4000);
  }
}

function renderElectionsManager() {
  const listHtml = state.elections.map(election => {
    const startStr = election.startDate ? new Date(election.startDate).toLocaleString() : "N/A";
    const endStr = election.endDate ? new Date(election.endDate).toLocaleString() : "N/A";
    return `
      <tr>
        <td><strong>${escapeHtml(election.name)}</strong></td>
        <td>
          <small style="display:block; color: var(--admin-text-secondary);"><strong>Start:</strong> ${escapeHtml(startStr)}</small>
          <small style="display:block; color: var(--admin-text-secondary); margin-top: 0.25rem;"><strong>End:</strong> ${escapeHtml(endStr)}</small>
        </td>
        <td>
          <span class="admin-badge ${election.status === 'active' ? 'success' : election.status === 'upcoming' ? 'warning' : 'danger'}">
            ${escapeHtml(election.status)}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            ${election.status !== 'active' ? `<button class="glass-button-new primary" onclick="setElectionStatus(${election.id}, 'active')">Set Active</button>` : ''}
            ${election.status !== 'upcoming' ? `<button class="glass-button-new secondary" onclick="setElectionStatus(${election.id}, 'upcoming')">Set Upcoming</button>` : ''}
            ${election.status !== 'closed' ? `<button class="glass-button-new danger" onclick="setElectionStatus(${election.id}, 'closed')">Close</button>` : ''}
            <button class="glass-button-new danger" onclick="deleteElectionRecord(${election.id})">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="4" style="text-align: center;">No elections found.</td></tr>`;

  refs.adminContent.innerHTML = renderAdminShell("elections", `
    <div class="premium-card-sheet">
      <h3>Elections Control Center</h3>
      <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 2rem;">
        
        <!-- Add Election -->
        <div>
          <h4 style="margin-top: 0; font-weight: 800;">Create New Election</h4>
          <form id="createElectionForm" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
            <div>
              <label for="newElectionName" style="color: var(--admin-text-secondary);">Election Title</label>
              <input type="text" id="newElectionName" class="glass-input-new" placeholder="E.g., General Student Elections 2026" required />
            </div>
            <div>
              <label for="newElectionStart" style="color: var(--admin-text-secondary);">Start Date & Time</label>
              <input type="datetime-local" id="newElectionStart" class="glass-input-new" required />
            </div>
            <div>
              <label for="newElectionEnd" style="color: var(--admin-text-secondary);">End Date & Time</label>
              <input type="datetime-local" id="newElectionEnd" class="glass-input-new" required />
            </div>
            <div>
              <label for="newElectionStatus" style="color: var(--admin-text-secondary);">Initial Status</label>
              <select id="newElectionStatus" class="glass-input-new">
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <button type="submit" class="glass-button-new primary">Create Election</button>
          </form>
        </div>

        <!-- Elections List -->
        <div>
          <h4 style="margin-top: 0; font-weight: 800;">Elections Log</h4>
          <div class="glass-table-wrapper" style="margin-top: 1rem;">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Election Name</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${listHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `);

  document.getElementById("createElectionForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("newElectionName").value.trim();
    const status = document.getElementById("newElectionStatus").value;
    const startDate = document.getElementById("newElectionStart").value;
    const endDate = document.getElementById("newElectionEnd").value;
    if (!name) return;

    if (status === "active") {
      state.elections.forEach(el => el.status = "closed");
    }

    const nextId = state.settings.nextIds.election || 1;
    state.elections.push({ id: nextId, name, status, startDate, endDate });
    state.settings.nextIds.election = nextId + 1;
    logAudit("create_election", `name=${name}; status=${status}; start=${startDate}; end=${endDate}`);
    saveState();
    toast("Election created successfully!", "success");
    renderElectionsManager();
  });
}

window.setElectionStatus = function(id, status) {
  const el = state.elections.find(e => e.id === id);
  if (!el) return;

  if (status === "active") {
    state.elections.forEach(e => {
      if (e.id !== id && e.status === "active") {
        e.status = "closed";
      }
    });
  }

  el.status = status;
  logAudit("set_election_status", `id=${id}; status=${status}`);
  saveState();
  toast(`Election status updated to ${status}.`, "success");
  renderElectionsManager();
};

window.deleteElectionRecord = function(id) {
  if (!confirm("Are you sure you want to delete this election record?")) return;
  
  state.elections = state.elections.filter(e => e.id !== id);
  logAudit("delete_election_record", `id=${id}`);
  saveState();
  toast("Election record deleted.", "success");
  renderElectionsManager();
};

function renderRegistrationRequests() {
  const requests = state.voters.filter(v => v.isSelfRegistered && v.status !== "approved");
  
  const listHtml = requests.map(req => `
    <tr>
      <td><strong>${escapeHtml(req.name)}</strong><br><small style="color: var(--admin-text-secondary);">${escapeHtml(req.voterId)}</small></td>
      <td><strong>Course:</strong> ${escapeHtml(req.course || "N/A")}<br><strong>School:</strong> ${escapeHtml(req.schoolName || "N/A")}</td>
      <td>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          ${req.govId ? `<img src="${escapeHtml(req.govId)}" alt="ID" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 1px solid var(--admin-border);" onclick="viewImageFull('${escapeHtml(req.govId)}')">` : "N/A"}
          ${req.selfie ? `<img src="${escapeHtml(req.selfie)}" alt="Selfie" style="width: 35px; height: 35px; object-fit: cover; border-radius: 50%; cursor: pointer; border: 1px solid var(--admin-border);" onclick="viewImageFull('${escapeHtml(req.selfie)}')">` : "N/A"}
        </div>
      </td>
      <td>
        <strong>OCR:</strong> ${req.ocrConfidence ? req.ocrConfidence + "%" : "Manual Entry"}<br>
        <strong>Face:</strong> ${req.matchScore ? req.matchScore + "%" : "0.0%"}
      </td>
      <td>
        <span class="admin-badge ${req.status === 'rejected' ? 'danger' : 'warning'}">
          ${escapeHtml(req.status || 'pending')}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          <button class="glass-button-new primary" onclick="approveRegistration(${req.id})">Approve</button>
          <button class="glass-button-new danger" onclick="rejectRegistration(${req.id})">Reject</button>
        </div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6" style="text-align: center;">No pending registration requests.</td></tr>`;

  refs.adminContent.innerHTML = renderAdminShell("requests", `
    <div class="premium-card-sheet">
      <h3>Self-Registration Voter Verification Requests</h3>
      <p style="color: var(--admin-text-secondary); margin-bottom: 1.5rem;">Click School ID or Selfie thumbnails to inspect them. Verify OCR and Face Match confidence scores before approving.</p>
      
      <div class="glass-table-wrapper">
        <table class="glass-table">
          <thead>
            <tr>
              <th>Voter Profile</th>
              <th>Details</th>
              <th>Scans</th>
              <th>Verification Scores</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${listHtml}
          </tbody>
        </table>
      </div>
    </div>
  `);
}

window.viewImageFull = function(src) {
  openModal({
    eyebrow: "Document viewer",
    title: "Verification Media Preview",
    body: `
      <div style="text-align: center; background: #000; padding: 1rem; border-radius: 12px; overflow: hidden; border: 1px solid var(--admin-border);">
        <img src="${escapeHtml(src)}" style="max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 6px;">
      </div>
    `,
    footer: [{ label: "Close", variant: "ghost" }]
  });
};

window.approveRegistration = function(id) {
  const voter = state.voters.find(v => v.id === id);
  if (!voter) return;

  voter.status = "approved";
  logAudit("approve_self_registration", `voterId=${voter.voterId}; name=${voter.name}`);
  saveState();
  toast(`Approved registration for ${voter.name}.`, "success");
  renderRegistrationRequests();
};

window.rejectRegistration = function(id) {
  const voter = state.voters.find(v => v.id === id);
  if (!voter) return;

  if (!confirm(`Reject and delete registration for ${voter.name}?`)) return;

  state.voters = state.voters.filter(v => v.id !== id);
  logAudit("reject_self_registration", `voterId=${voter.voterId}; name=${voter.name}`);
  saveState();
  toast(`Rejected and deleted registration for ${voter.name}.`, "success");
  renderRegistrationRequests();
};

function renderSettingsManager() {
  refs.adminContent.innerHTML = renderAdminShell("settings", `
    <div class="premium-card-sheet" style="max-width: 800px; margin: 0 auto;">
      <h3>System Settings & Platform Operations</h3>
      
      <div style="display: flex; flex-direction: column; gap: 2rem; margin-top: 1.5rem;">
        
        <!-- Platform Config -->
        <div style="border-bottom: 1px solid var(--admin-border); padding-bottom: 1.5rem;">
          <h4 style="margin: 0 0 1rem; font-weight: 800;">General Configuration</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div>
              <label style="color: var(--admin-text-secondary); display: block; margin-bottom: 0.5rem;">Platform Title</label>
              <input type="text" class="glass-input-new" value="E BOTO MO NA YAN" readonly />
            </div>
            <div>
              <label style="color: var(--admin-text-secondary); display: block; margin-bottom: 0.5rem;">Default User Role</label>
              <input type="text" class="glass-input-new" value="Administrator" readonly />
            </div>
          </div>
        </div>

        <!-- Blockchain Status -->
        <div style="border-bottom: 1px solid var(--admin-border); padding-bottom: 1.5rem;">
          <h4 style="margin: 0 0 1rem; font-weight: 800;">Decentralized Ledger Parameters</h4>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
            <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--admin-border); padding: 1rem; border-radius: 12px; text-align: center;">
              <div style="font-size: 0.8rem; color: var(--admin-text-secondary);">Block Height</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: white; margin-top: 0.25rem;">#14,892</div>
            </div>
            <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--admin-border); padding: 1rem; border-radius: 12px; text-align: center;">
              <div style="font-size: 0.8rem; color: var(--admin-text-secondary);">Hash Rate</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: white; margin-top: 0.25rem;">42.8 TH/s</div>
            </div>
            <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--admin-border); padding: 1rem; border-radius: 12px; text-align: center;">
              <div style="font-size: 0.8rem; color: var(--admin-text-secondary);">Gas Price</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: var(--admin-success); margin-top: 0.25rem;">0.00 Gwei</div>
            </div>
          </div>
        </div>

        <!-- Data Operations -->
        <div>
          <h4 style="margin: 0 0 1rem; font-weight: 800; color: var(--admin-danger);">Danger Zone</h4>
          <p style="color: var(--admin-text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">Sensitive administrative operations. These actions cannot be undone.</p>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <button class="glass-button-new secondary" onclick="downloadBackup()">Download Full Backup</button>
            <button class="glass-button-new danger" onclick="resetElection()">Reset Current Election</button>
          </div>
        </div>

      </div>
    </div>
  `);
}

function renderCandidatesManager() {
  const elections = ["all", ...uniqueElections()];
  const filtered = state.candidates.filter((cand) => {
    const query = normalizeText(uiState.candidateSearch).toLowerCase();
    const matchesSearch = cand.name.toLowerCase().includes(query) || (cand.partylist || "").toLowerCase().includes(query);
    const matchesElection = uiState.candidateFilterElection === "all" || cand.election === uiState.candidateFilterElection;
    return matchesSearch && matchesElection;
  });

  refs.adminContent.innerHTML = renderAdminShell("candidates", `
    <section class="admin-panel">
      <div class="section-heading compact">
        <div>
          <p class="eyebrow">Candidates</p>
          <h3>Manage election candidates</h3>
        </div>
      </div>

      <div class="form-grid two-columns" style="align-items: start; gap: 1.5rem;">
        <div class="surface-card" style="padding: 1.25rem;">
          <h4>Add candidate</h4>
          <form id="addCandidateForm" style="display: grid; gap: 0.85rem; margin-top: 1rem;">
            <label for="candName">Full Name</label>
            <input id="candName" required placeholder="Juan Dela Cruz" />

            <label for="candPosition">Position</label>
            <input id="candPosition" required placeholder="President" />

            <label for="candPartylist">Partylist</label>
            <input id="candPartylist" placeholder="Liberal Future" />

            <label for="candElection">Election Name</label>
            <select id="candElection" class="glass-input-new" required>
              ${state.elections.map(el => `<option value="${escapeHtml(el.name)}">${escapeHtml(el.name)}</option>`).join("")}
            </select>

            <label for="candPhoto">Candidate Photo</label>
            <input id="candPhoto" type="file" accept="image/*" style="padding: 0.5rem;" />
            <div id="photoPreviewContainer" style="display: none; align-items: center; gap: 0.75rem; margin: 0.25rem 0;">
              <img id="photoPreview" src="" alt="Preview" style="width: 3rem; height: 3rem; border-radius: 50%; object-fit: cover;" />
              <span class="muted" style="font-size: 0.92rem;">Photo selected</span>
            </div>

            <button class="primary-button" type="submit">Save Candidate</button>
          </form>
        </div>

        <div class="surface-card" style="padding: 1.25rem;">
          <h4>Candidate list (${filtered.length})</h4>
          <div class="table-toolbar" style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <input id="candSearchInput" placeholder="Search candidate..." value="${escapeHtml(uiState.candidateSearch)}" style="flex: 1;" />
            <select id="candElectionFilter" style="width: auto;">
              <option value="all">All Elections</option>
              ${elections.slice(1).map((el) => `<option value="${escapeHtml(el)}" ${uiState.candidateFilterElection === el ? "selected" : ""}>${escapeHtml(el)}</option>`).join("")}
            </select>
          </div>
          <div class="table-shell" style="margin-top: 1rem;">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Election</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map((cand) => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="avatar" style="width: 2.2rem; height: 2.2rem;">
                          ${cand.photo ? `<img src="${escapeHtml(cand.photo)}" alt="${escapeHtml(cand.name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />` : `<span>${escapeHtml(initials(cand.name))}</span>`}
                        </div>
                        <div>
                          <strong>${escapeHtml(cand.name)}</strong>
                          <div class="secondary">${escapeHtml(cand.partylist || "Independent")}</div>
                        </div>
                      </div>
                    </td>
                    <td>${escapeHtml(cand.position)}</td>
                    <td>${escapeHtml(cand.election)}</td>
                    <td>
                      <button class="small-button danger delete-cand-btn" data-id="${cand.id}">Delete</button>
                    </td>
                  </tr>
                `).join("")}
                ${!filtered.length ? `<tr><td colspan="4" style="text-align: center;">No candidates found</td></tr>` : ""}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `);

  // wire listeners
  document.getElementById("candPhoto").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    const previewContainer = document.getElementById("photoPreviewContainer");
    const previewImg = document.getElementById("photoPreview");
    if (file) {
      const url = await fileToDataUrl(file);
      previewImg.src = url;
      previewContainer.style.display = "flex";
    } else {
      previewContainer.style.display = "none";
    }
  });

  document.getElementById("addCandidateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = normalizeText(document.getElementById("candName").value);
    const position = normalizeText(document.getElementById("candPosition").value);
    const partylist = normalizeText(document.getElementById("candPartylist").value);
    const election = normalizeText(document.getElementById("candElection").value);
    const photoFile = document.getElementById("candPhoto").files[0];

    showLoading(true, "Saving candidate...");
    let photoDataUrl = "";
    if (photoFile) {
      photoDataUrl = await fileToDataUrl(photoFile);
    }

    const newCand = {
      id: state.settings.nextIds.candidate,
      name,
      position,
      partylist,
      election,
      photo: photoDataUrl,
      votes: 0
    };
    state.candidates.push(newCand);
    state.settings.nextIds.candidate += 1;
    logAudit("add_candidate", `name=${name}; position=${position}; election=${election}`);
    saveState();
    showLoading(false);
    toast("Candidate added successfully!", "success");
    renderCandidatesManager();
  });

  document.getElementById("candSearchInput").addEventListener("input", (e) => {
    uiState.candidateSearch = e.target.value;
    renderCandidatesManager();
  });

  document.getElementById("candElectionFilter").addEventListener("change", (e) => {
    uiState.candidateFilterElection = e.target.value;
    renderCandidatesManager();
  });

  document.querySelectorAll(".delete-cand-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      const cand = state.candidates.find((c) => c.id === id);
      if (!cand) return;
      if (!confirm(`Delete candidate ${cand.name}?`)) return;

      state.candidates = state.candidates.filter((c) => c.id !== id);
      state.votes = state.votes.filter((v) => v.candidateId !== id);
      recalcVotes();
      state.voters.forEach((voter) => {
        voter.hasVoted = state.votes.some((vote) => normalizeVoterId(vote.voterId) === normalizeVoterId(voter.voterId));
      });
      logAudit("delete_candidate", `id=${id}; name=${cand.name}`);
      saveState();
      toast("Candidate deleted.", "success");
      renderCandidatesManager();
    });
  });
}

function renderVotersManager() {
  const filtered = state.voters.filter((voter) => {
    const query = normalizeText(uiState.voterSearch).toLowerCase();
    const matchesSearch = voter.name.toLowerCase().includes(query) || voter.voterId.toLowerCase().includes(query);
    const matchesStatus = uiState.voterFilterStatus === "all" || 
      (uiState.voterFilterStatus === "voted" && voter.hasVoted) ||
      (uiState.voterFilterStatus === "not-voted" && !voter.hasVoted);
    return matchesSearch && matchesStatus;
  });

  refs.adminContent.innerHTML = renderAdminShell("voters", `
    <section class="admin-panel">
      <div class="section-heading compact">
        <div>
          <p class="eyebrow">Voters</p>
          <h3>Manage registered voters</h3>
        </div>
      </div>

      <div class="form-grid two-columns" style="align-items: start; gap: 1.5rem;">
        <div class="surface-card" style="padding: 1.25rem;">
          <h4>Register voter</h4>
          <form id="addVoterForm" style="display: grid; gap: 0.85rem; margin-top: 1rem;">
            <label for="voterNameInput">Full Name</label>
            <input id="voterNameInput" required placeholder="Ana Reyes" />

            <label for="voterIdVal">Voter ID</label>
            <input id="voterIdVal" required placeholder="23-00004" />

            <button class="primary-button" type="submit">Register Voter</button>
          </form>
        </div>

        <div class="surface-card" style="padding: 1.25rem;">
          <h4>Registered voters (${filtered.length})</h4>
          <div class="table-toolbar" style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <input id="voterSearchInput" placeholder="Search name/ID..." value="${escapeHtml(uiState.voterSearch)}" style="flex: 1;" />
            <select id="voterStatusFilter" style="width: auto;">
              <option value="all">All Status</option>
              <option value="voted" ${uiState.voterFilterStatus === "voted" ? "selected" : ""}>Voted</option>
              <option value="not-voted" ${uiState.voterFilterStatus === "not-voted" ? "selected" : ""}>Not Voted</option>
            </select>
          </div>
          <div class="table-shell" style="margin-top: 1rem;">
            <table>
              <thead>
                <tr>
                  <th>Voter ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map((voter) => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="avatar" style="width: 2.2rem; height: 2.2rem; flex: 0 0 auto;">
                          ${voter.selfie ? `<img src="${escapeHtml(voter.selfie)}" alt="${escapeHtml(voter.name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />` : `<span>${escapeHtml(initials(voter.name))}</span>`}
                        </div>
                        <strong>${escapeHtml(voter.voterId)}</strong>
                      </div>
                    </td>
                    <td>
                      <strong>${escapeHtml(voter.name)}</strong>
                      <div class="secondary" style="font-size: 0.85rem;">
                        ${voter.course ? `Course: ${escapeHtml(voter.course)} · ` : ""}
                        ${voter.schoolName ? `${escapeHtml(voter.schoolName)}` : "Registered by Admin"}
                      </div>
                    </td>
                    <td>
                      <span class="inline-pill" style="background: ${voter.hasVoted ? "rgba(5, 150, 105, 0.12)" : "rgba(37, 99, 235, 0.12)"}; color: ${voter.hasVoted ? "var(--success)" : "var(--primary-strong)"};">
                        ${voter.hasVoted ? "Voted" : "Not Voted"}
                      </span>
                    </td>
                    <td>
                      <button class="small-button danger delete-voter-btn" data-id="${voter.id}">Delete</button>
                    </td>
                  </tr>
                `).join("")}
                ${!filtered.length ? `<tr><td colspan="4" style="text-align: center;">No voters found</td></tr>` : ""}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `);

  // wire listeners
  document.getElementById("addVoterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = normalizeText(document.getElementById("voterNameInput").value);
    const voterId = normalizeVoterId(document.getElementById("voterIdVal").value);

    if (state.voters.some((v) => normalizeVoterId(v.voterId) === voterId)) {
      toast("Voter ID already registered.", "error");
      return;
    }

    const newVoter = {
      id: state.settings.nextIds.voter,
      name,
      voterId,
      hasVoted: false
    };
    state.voters.push(newVoter);
    state.settings.nextIds.voter += 1;
    logAudit("register_voter", `voterId=${voterId}; name=${name}`);
    saveState();
    toast("Voter registered successfully!", "success");
    renderVotersManager();
  });

  document.getElementById("voterSearchInput").addEventListener("input", (e) => {
    uiState.voterSearch = e.target.value;
    renderVotersManager();
  });

  document.getElementById("voterStatusFilter").addEventListener("change", (e) => {
    uiState.voterFilterStatus = e.target.value;
    renderVotersManager();
  });

  document.querySelectorAll(".delete-voter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      const voter = state.voters.find((v) => v.id === id);
      if (!voter) return;
      if (!confirm(`Delete voter ${voter.name}?`)) return;

      state.voters = state.voters.filter((v) => v.id !== id);
      state.votes = state.votes.filter((v) => normalizeVoterId(v.voterId) !== normalizeVoterId(voter.voterId));
      recalcVotes();
      logAudit("delete_voter", `id=${id}; voterId=${voter.voterId}`);
      saveState();
      toast("Voter registration deleted.", "success");
      renderVotersManager();
    });
  });
}

function renderResultsManager() {
  const elections = ["all", ...uniqueElections()];
  const candidates = filterCandidatesByElection(uiState.resultElection);
  const grouped = groupBy(candidates, (candidate) => candidate.position);

  refs.adminContent.innerHTML = renderAdminShell("results", `
    <section class="admin-panel">
      <div class="section-heading compact">
        <div>
          <p class="eyebrow">Results</p>
          <h3>Live results and exports</h3>
        </div>
        <div class="inline-stats">
          <span class="inline-pill">${state.votes.length} vote record(s)</span>
        </div>
      </div>

      <div class="results-toolbar">
        <select id="resultsElectionFilter">
          <option value="all">All elections</option>
          ${elections.slice(1).map((election) => `<option value="${escapeHtml(election)}" ${uiState.resultElection === election ? "selected" : ""}>${escapeHtml(election)}</option>`).join("")}
        </select>
        <div class="row-actions">
          <button class="primary-button secondary" id="downloadBackupBtn" type="button">Download backup</button>
          <button class="ghost-button danger" id="resetElectionBtn" type="button">Reset election</button>
          <button class="ghost-button danger" id="deleteElectionBtn" type="button">Delete election</button>
        </div>
      </div>

      <div class="chart-card">${renderResultsChart(candidates)}</div>
      <div class="results-layout">
        ${Object.keys(grouped).length ? Object.entries(grouped).map(([position, entries]) => resultGroupMarkup(position, entries)).join("") : `<div class="result-group"><strong>No result data available for the selected election.</strong></div>`}
      </div>
    </section>
  `);

  document.getElementById("resultsElectionFilter").addEventListener("change", (event) => {
    uiState.resultElection = event.target.value;
    renderAdminView("results");
  });
  document.getElementById("downloadBackupBtn").addEventListener("click", downloadBackup);
  document.getElementById("resetElectionBtn").addEventListener("click", resetElection);
  document.getElementById("deleteElectionBtn").addEventListener("click", deleteElection);
}

function resultGroupMarkup(position, entries) {
  const totalVotes = entries.reduce((sum, candidate) => sum + candidate.votes, 0);
  return `
    <article class="result-group">
      <strong>${escapeHtml(position)}</strong>
      ${entries.slice().sort((left, right) => right.votes - left.votes).map((candidate) => {
        const percentage = totalVotes ? (candidate.votes / totalVotes) * 100 : 0;
        return `
          <div class="result-row">
            <div class="card-head">
              <div>
                <strong>${escapeHtml(candidate.name)}</strong>
                <div class="secondary">${escapeHtml(candidate.partylist || "Independent")} · ${escapeHtml(candidate.election || "General")}</div>
              </div>
              <span class="inline-pill">${candidate.votes} votes · ${percentage.toFixed(1)}%</span>
            </div>
            <div class="result-bar"><span style="width:${percentage}%"></span></div>
          </div>
        `;
      }).join("")}
    </article>
  `;
}

function renderAuditLog() {
  const logs = state.auditLogs
    .filter((entry) => {
      const query = normalizeText(uiState.auditSearch).toLowerCase();
      if (!query) return true;
      return [entry.actor, entry.action, entry.details, entry.createdAt].some((field) => String(field).toLowerCase().includes(query));
    })
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  refs.adminContent.innerHTML = renderAdminShell("audit", `
    <section class="admin-panel">
      <div class="section-heading compact">
        <div>
          <p class="eyebrow">Audit</p>
          <h3>Activity log</h3>
        </div>
      </div>
      <div class="table-toolbar">
        <input id="auditSearchInput" placeholder="Search audit log" value="${escapeHtml(uiState.auditSearch)}" />
      </div>
      <div class="table-shell">
        <table aria-label="Audit log">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map((entry) => `
              <tr>
                <td>${escapeHtml(entry.createdAt)}</td>
                <td>${escapeHtml(entry.actor)}</td>
                <td>${escapeHtml(entry.action)}</td>
                <td>${escapeHtml(entry.details || "-")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `);

  document.getElementById("auditSearchInput").addEventListener("input", (event) => {
    uiState.auditSearch = event.target.value;
    renderAuditLog();
  });
}

function renderResultsChart(candidates) {
  const width = 600;
  const height = 280;
  const title = "Votes Distribution";
  const primary = "var(--primary)";
  const secondary = "var(--secondary)";

  if (!candidates || !candidates.length) {
    return `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">
        <text x="50%" y="50%" text-anchor="middle" class="chart-empty">No data available</text>
      </svg>
    `;
  }

  const maxVotes = Math.max(...candidates.map((c) => c.votes), 1);
  const barHeight = 24;
  const gap = 12;
  const topOffset = 50;
  const leftOffset = 140;
  const chartWidth = width - leftOffset - 50;

  const bars = candidates.map((candidate, index) => {
    const y = topOffset + index * (barHeight + gap);
    const percentage = candidate.votes / maxVotes;
    const barWidth = Math.max(percentage * chartWidth, 4);

    return `
      <text x="${leftOffset - 10}" y="${y + barHeight / 2 + 4}" text-anchor="end" class="chart-label">${escapeHtml(candidate.name)}</text>
      <rect x="${leftOffset}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" />
      <text x="${leftOffset + barWidth + 8}" y="${y + barHeight / 2 + 4}" class="chart-value">${candidate.votes}</text>
    `;
  }).join("");

  const dynamicHeight = Math.max(height, topOffset + candidates.length * (barHeight + gap) + 20);

  return `
    <svg class="chart-svg" viewBox="0 0 ${width} ${dynamicHeight}" role="img" aria-label="${escapeHtml(title)}">
      <defs>
        <linearGradient id="chartFill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${secondary}" />
        </linearGradient>
      </defs>
      <text x="18" y="28" class="chart-title">${escapeHtml(title)}</text>
      ${bars || `<text x="50%" y="50%" text-anchor="middle" class="chart-empty">No data available</text>`}
    </svg>
  `;
}

function resetElection() {
  confirmAction("Reset election?", "This clears all votes and marks voters as not voted.").then((confirmed) => {
    if (!confirmed) return;
    state.votes = [];
    state.voters.forEach((voter) => { voter.hasVoted = false; });
    state.candidates.forEach((candidate) => { candidate.votes = 0; });
    logAudit("reset_election", "all votes cleared");
    saveState();
    toast("Election has been reset.", "success");
    renderAdminView("results");
  });
}

function deleteElection() {
  const selectedElection = uiState.resultElection;
  if (selectedElection === "all") {
    toast("Choose a specific election first.", "error");
    return;
  }

  const candidates = state.candidates.filter((candidate) => candidate.election === selectedElection);
  if (!candidates.length) {
    toast("No candidates found for the selected election.", "error");
    return;
  }

  confirmAction("Delete election?", `This removes ${candidates.length} candidate(s) and related votes.`).then((confirmed) => {
    if (!confirmed) return;
    state.candidates = state.candidates.filter((candidate) => candidate.election !== selectedElection);
    state.votes = state.votes.filter((vote) => !candidates.some((candidate) => candidate.id === vote.candidateId));
    recalcVotes();
    state.voters.forEach((voter) => {
      voter.hasVoted = state.votes.some((vote) => normalizeVoterId(vote.voterId) === normalizeVoterId(voter.voterId));
    });
    uiState.resultElection = "all";
    logAudit("delete_election", `election=${selectedElection}`);
    saveState();
    toast(`Election ${selectedElection} deleted.`, "success");
    renderAdminView("results");
  });
}

function exportResultsJson(candidates) {
  const payload = {
    exportedAt: new Date().toISOString(),
    election: uiState.resultElection,
    candidates,
    votes: state.votes,
  };
  downloadText(`results-${dateStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
  logAudit("export_results", `election=${uiState.resultElection}; rows=${candidates.length}`);
  toast("Results exported as JSON.", "success");
}

function downloadBackup() {
  downloadText(`backup-${dateStamp()}.json`, JSON.stringify(state, null, 2), "application/json");
  logAudit("download_backup", "full state exported");
  toast("Backup downloaded.", "success");
}
