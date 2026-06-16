/* global state, document, refs, uiState, regState, handleVoterLogin, handleAdminLogin, renderVoter, renderAll, renderLogin, renderRegistrationWizard, renderAdmin, handleIdCardUpload, goToRegisterStep, startRegistrationCamera, captureRegistrationSelfie, handleManualSelfieUpload, submitBiometricRegistration, stopAuthCamera, startAuthBiometricScan, sha256, saveState, toast, showLoading, applyLoginRole, wireEvents */

function wireEvents() {
  document.querySelectorAll("[data-login-role]").forEach((tab) => {
    tab.addEventListener("click", () => {
      applyLoginRole(tab.getAttribute("data-login-role"));
    });
  });

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const shell = button.closest(".password-shell");
      const input = shell?.querySelector("input");
      if (!input) return;
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.classList.toggle("is-revealed", reveal);
      button.setAttribute("aria-pressed", reveal ? "true" : "false");
    });
  });

  refs.voterLoginForm?.addEventListener("submit", handleVoterLogin);
  refs.adminLoginForm?.addEventListener("submit", handleAdminLogin);

  refs.clearSelectionsBtn?.addEventListener("click", () => {
    uiState.voterSelections = {};
    renderVoter();
  });

  refs.openReviewBtn?.addEventListener("click", () => {
    if (!isVoterBallotComplete()) {
      toast("Please complete all positions first.", "error");
      return;
    }
    openReviewModal();
  });

  refs.voterLogoutBtn?.addEventListener("click", () => {
    state.currentUser = null;
    state.activeView = "login";
    uiState.voterSelections = {};
    saveState();
    window.location.href = "index.html";
  });

  refs.adminLogoutBtn?.addEventListener("click", () => {
    state.currentUser = null;
    state.activeView = "login";
    state.adminTab = "dashboard";
    saveState();
    window.location.href = "index.html";
  });

  document.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("button[data-admin-tab]");
    if (!btn) return;
    const tab = btn.getAttribute("data-admin-tab");
    if (!tab) return;
    state.adminTab = tab;
    saveState();
    renderAdmin();
  });

  refs.startRegisterBtn?.addEventListener("click", () => {
    state.activeView = "register";
    regState.extractedData = null;
    
    if (refs.govIdUpload) refs.govIdUpload.value = "";
    if (refs.idScanContainer) refs.idScanContainer.style.display = "none";
    if (refs.regFullName) refs.regFullName.value = "";
    if (refs.regCourse) refs.regCourse.value = "";
    if (refs.regVoterId) refs.regVoterId.value = "";
    if (refs.regSchoolName) refs.regSchoolName.value = "";

    renderAll();
  });

  const handleCancelRegister = () => {
    state.activeView = "login";
    renderAll();
  };
  refs.cancelRegisterBtn?.addEventListener("click", handleCancelRegister);
  document.getElementById("cancelRegisterFormBtn")?.addEventListener("click", handleCancelRegister);

  refs.govIdUpload?.addEventListener("change", handleIdCardUpload);

  refs.regFullName?.addEventListener("input", checkInputsValid);
  refs.regCourse?.addEventListener("input", checkInputsValid);
  refs.regVoterId?.addEventListener("input", checkInputsValid);
  refs.regSchoolName?.addEventListener("input", checkInputsValid);

  refs.nextStep1Btn?.addEventListener("click", () => goToRegisterStep(2));
  refs.prevStep2Btn?.addEventListener("click", () => goToRegisterStep(1));
  refs.nextStep2Btn?.addEventListener("click", () => goToRegisterStep(3));
  refs.prevStep3Btn?.addEventListener("click", () => goToRegisterStep(2));

  refs.startCamBtn?.addEventListener("click", startRegistrationCamera);
  refs.captureSelfieBtn?.addEventListener("click", captureRegistrationSelfie);
  refs.chooseSelfieFileBtn?.addEventListener("click", () => refs.selfieUpload?.click());
  refs.selfieUpload?.addEventListener("change", handleManualSelfieUpload);

  refs.submitRegisterBtn?.addEventListener("click", submitBiometricRegistration);

  refs.cancelBioAuthBtn?.addEventListener("click", () => {
    stopAuthCamera();
    refs.biometricAuthModal.close();
  });

  refs.startBioAuthCamBtn?.addEventListener("click", startAuthBiometricScan);
}

async function bootstrap() {
  try {
    if (!state.adminUsers?.[0]?.passwordHash) {
      state.adminUsers[0].passwordHash = await sha256("admin123");
      saveState();
    }

    wireEvents();
    renderAll();
  } catch (err) {
    showLoading(false);
    toast("Failed to initialize app. Check console for details.", "error");
    console.error(err);
  }
}

function renderAll() {
  const pathname = window.location.pathname.toLowerCase();

  if (pathname.endsWith("voter.html")) {
    renderVoter();
  } else if (pathname.endsWith("admin.html")) {
    renderAdmin();
  } else {
    // index.html or root directory
    if (state.currentUser?.voterId) {
      window.location.href = "voter.html";
      return;
    }
    if (state.currentUser?.username === "admin") {
      window.location.href = "admin.html";
      return;
    }

    if (state.activeView !== "login" && state.activeView !== "register") {
      state.activeView = "login";
      saveState();
    }

    document.body.classList.toggle("login-screen", state.activeView === "login");
    document.body.classList.toggle("register-screen", state.activeView === "register");

    refs.loginView?.classList.toggle("active-view", state.activeView === "login");
    refs.registrationView?.classList.toggle("active-view", state.activeView === "register");

    if (state.activeView === "login") renderLogin();
    if (state.activeView === "register") renderRegistrationWizard();
  }
}

window.renderAll = renderAll;

bootstrap().catch((e) => {
  console.error(e);
  toast("Failed to initialize the app.", "error");
});
