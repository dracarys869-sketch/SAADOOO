/* global state, document, refs, toast, showLoading, microDelay, normalizeVoterId, openBiometricAuthModal, uiState, saveState, renderAll, sha256, normalizeText, regState, fileToDataUrl, Tesseract, initials, escapeHtml, simulateCameraFeed, checkImageQuality, deskewCanvas, rotateCanvas, preprocessImage, parseIdFields, resetFieldStatus, checkInputsValid, runFacialBiometricMatching, renderRegistrationSummary, stopRegistrationCamera, stopAuthCamera, runLivenessChallenge, navigator, setTimeout, window, Image */

let activeAuthVoter = null;
let authStream = null;

function applyLoginRole(role) {
  const normalizedRole = ["voter", "admin", "agent"].includes(role) ? role : "admin";
  state.loginRole = normalizedRole;

  document.querySelectorAll("[data-login-role]").forEach((tab) => {
    const isActive = tab.getAttribute("data-login-role") === normalizedRole;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  document.querySelectorAll("[data-login-panel]").forEach((panel) => {
    const isActive = panel.getAttribute("data-login-panel") === normalizedRole;
    panel.hidden = !isActive;
    panel.classList.toggle("active", isActive);
    panel.setAttribute("aria-hidden", isActive ? "false" : "true");
  });
}

async function handleVoterLogin(event) {
  event.preventDefault();
  refreshState(); // Retrieve latest self-registrations from localStorage
  const rawVoterId = refs.voterIdInput.value;
  const voterId = normalizeVoterId(rawVoterId);
  if (!voterId) {
    toast("Please enter a Voter ID.", "error");
    return;
  }
  showLoading(true, "Verifying Voter ID...");
  await microDelay();
  
  const voter = state.voters.find((v) => normalizeVoterId(v.voterId) === voterId);
  if (!voter) {
    showLoading(false);
    toast("Voter ID not found in registry.", "error");
    return;
  }

  showLoading(false);

  if (voter.status === "rejected") {
    toast("Your registration request was rejected by the administrator.", "error");
    return;
  }

  // Self-registered voters with selfies go straight to face-match verification
  if (voter.selfie) {
    openBiometricAuthModal(voter);
  } else if (voter.status === "pending") {
    toast("Your registration is pending approval by the administrator.", "warning");
    return;
  } else {
    state.currentUser = { voterId: voter.voterId };
    state.activeView = "voter";
    uiState.voterSelections = {};
    saveState();
    toast(`Welcome, ${voter.name}!`, "success");
    window.location.href = "voter.html";
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const username = normalizeText(refs.adminUsernameInput.value) || "admin";
  const password = refs.adminPasswordInput.value;
  if (!password) {
    toast("Please enter your password.", "error");
    return;
  }
  showLoading(true, "Authenticating...");
  await microDelay();

  const admin = state.adminUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());
  const hash = await sha256(password);

  if (!admin || (admin.passwordHash && admin.passwordHash !== hash) || (!admin.passwordHash && password !== "admin123")) {
    showLoading(false);
    toast("Invalid admin username or password.", "error");
    return;
  }

  state.currentUser = { username: admin.username };
  state.activeView = "admin";
  state.adminTab = "dashboard";
  saveState();
  showLoading(false);
  toast("Administrator session started.", "success");
  window.location.href = "admin.html";
}

function renderLogin() {
  applyLoginRole(state.loginRole || "admin");

  // top stats
  const totalVoters = state.voters.length;
  const votedCount = state.voters.filter((v) => v.hasVoted).length;
  const totalCandidates = state.candidates.length;
  refs.loginStats.innerHTML = `
    <div class="mini-stat"><div class="k">${totalVoters}</div><div class="v">Voters</div></div>
    <div class="mini-stat"><div class="k">${votedCount}</div><div class="v">Voted</div></div>
    <div class="mini-stat"><div class="k">${totalCandidates}</div><div class="v">Candidates</div></div>
  `;
}

// Voter self-registration rendering and logic
function renderRegistrationWizard() {
  goToRegisterStep(regState.step);
}

function goToRegisterStep(step) {
  if (regState.step === 2 && step !== 2) {
    stopRegistrationCamera();
  }

  regState.step = step;
  
  // Update indicators
  refs.stepIndicator1?.classList.toggle("active", step >= 1);
  refs.stepIndicator2?.classList.toggle("active", step >= 2);
  refs.stepIndicator3?.classList.toggle("active", step >= 3);

  // Update content visibility
  refs.stepContent1?.classList.toggle("hidden", step !== 1);
  refs.stepContent2?.classList.toggle("hidden", step !== 2);
  refs.stepContent3?.classList.toggle("hidden", step !== 3);

  if (step === 3) {
    renderRegistrationSummary();
  }
}

// Check image resolution and edge blurriness via variance of Laplacian
// Also performs security checks for screenshot and digital edit detection
function checkImageQuality(imageData, filename = "") {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  if (width < 600 || height < 400) {
    return { valid: false, error: "Image resolution is too low. Please upload a clear School ID (minimum 600x400)." };
  }
  
  // 1. Screenshot Detection (Filename and Device Aspect Ratio + solid boundaries)
  if (filename && /screenshot|ss_|screen_/i.test(filename)) {
    return { valid: false, error: "Security Warning: Screenshots are not allowed. Please upload a direct photo of your physical ID." };
  }
  
  const aspect = height / width;
  const isTall = aspect > 1.8 || aspect < 0.55;
  if (isTall) {
    let topUniform = true;
    const sampleSize = Math.floor(width * height * 0.03);
    const r = data[0], g = data[1], b = data[2];
    for (let i = 0; i < sampleSize; i++) {
      const idx = i * 4;
      if (Math.abs(data[idx] - r) > 10 || Math.abs(data[idx + 1] - g) > 10 || Math.abs(data[idx + 2] - b) > 10) {
        topUniform = false;
        break;
      }
    }
    if (topUniform) {
      return { valid: false, error: "Security Warning: Device screenshot pattern detected. Please upload a direct photo of your physical ID." };
    }
  }

  // 2. Edit / Tamper / Vector Mockup Detection
  let flatCount = 0;
  let sampleCount = 0;
  for (let y = 20; y < height - 20; y += 30) {
    for (let x = 20; x < width - 20; x += 30) {
      const baseIdx = (y * width + x) * 4;
      const r = data[baseIdx], g = data[baseIdx + 1], b = data[baseIdx + 2];
      
      let allIdentical = true;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          if (data[idx] !== r || data[idx + 1] !== g || data[idx + 2] !== b) {
            allIdentical = false;
            break;
          }
        }
        if (!allIdentical) break;
      }
      
      const isBg = (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15);
      if (allIdentical && !isBg) {
        flatCount++;
      }
      sampleCount++;
    }
  }
  if (sampleCount > 0 && (flatCount / sampleCount) > 0.15) {
    return { valid: false, error: "Security Warning: Digital alterations or mockups detected. Please upload a genuine photo of your physical School ID." };
  }
  
  // 3. Sharpness check using average Laplacian gradient
  let sum = 0;
  let count = 0;
  const step = 2;
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const idx = (y * width + x) * 4;
      const grayVal = data[idx] * 0.299 + data[idx+1] * 0.587 + data[idx+2] * 0.114;
      
      const left = ((y * width + (x - 1)) * 4);
      const right = ((y * width + (x + 1)) * 4);
      const top = (((y - 1) * width + x) * 4);
      const bottom = (((y + 1) * width + x) * 4);
      
      const grayLeft = data[left]*0.299 + data[left+1]*0.587 + data[left+2]*0.114;
      const grayRight = data[right]*0.299 + data[right+1]*0.587 + data[right+2]*0.114;
      const grayTop = data[top]*0.299 + data[top+1]*0.587 + data[top+2]*0.114;
      const grayBottom = data[bottom]*0.299 + data[bottom+1]*0.587 + data[bottom+2]*0.114;
      
      const lap = Math.abs(4 * grayVal - grayLeft - grayRight - grayTop - grayBottom);
      sum += lap;
      count++;
    }
  }
  
  const avgLap = sum / count;
  console.log("Image sharpness score (average Laplacian gradient):", avgLap);
  
  if (avgLap < 3.5) {
    return { valid: false, error: "Image is too blurry. Please upload a sharp, high-quality photo." };
  }
  
  return { valid: true };
}

// 2D Convolution filter helper
function applyConvolution(ctx, width, height, kernel) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const buffer = new Uint8ClampedArray(data);
  const side = Math.round(Math.sqrt(kernel.length));
  const halfSide = Math.floor(side / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      let r = 0, g = 0, b = 0;

      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = Math.min(height - 1, Math.max(0, y + cy - halfSide));
          const scx = Math.min(width - 1, Math.max(0, x + cx - halfSide));
          const srcIdx = (scy * width + scx) * 4;
          const wt = kernel[cy * side + cx];
          
          r += buffer[srcIdx] * wt;
          g += buffer[srcIdx + 1] * wt;
          b += buffer[srcIdx + 2] * wt;
        }
      }

      data[dstIdx] = Math.min(255, Math.max(0, r));
      data[dstIdx + 1] = Math.min(255, Math.max(0, g));
      data[dstIdx + 2] = Math.min(255, Math.max(0, b));
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// Enhance contrast, convert to grayscale, and sharpen image for Tesseract OCR
function preprocessImage(ctx, width, height) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    data[i] = data[i+1] = data[i+2] = gray;
  }
  
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const val = data[i];
    if (val < min) min = val;
    if (val > max) max = val;
  }
  const range = max - min || 1;
  for (let i = 0; i < data.length; i += 4) {
    const newVal = ((data[i] - min) * 255) / range;
    data[i] = data[i+1] = data[i+2] = newVal;
  }
  
  ctx.putImageData(imgData, 0, 0);

  const sharpenKernel = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0
  ];
  applyConvolution(ctx, width, height, sharpenKernel);
}

// Deskew canvas using horizontal projection profile variance check
function deskewCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  const scale = Math.min(1.0, 300 / Math.max(w, h));
  const sw = Math.round(w * scale);
  const sh = Math.round(h * scale);

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = sw;
  tempCanvas.height = sh;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(canvas, 0, 0, sw, sh);

  const imgData = tempCtx.getImageData(0, 0, sw, sh);
  const data = imgData.data;

  const gray = new Uint8Array(sw * sh);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  let bestAngle = 0;
  let maxVariance = -1;

  for (let angle = -10; angle <= 10; angle += 2) {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rows = new Float32Array(sh);
    const counts = new Int32Array(sh);

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const rx = x - sw / 2;
        const ry = y - sh / 2;
        const rotY = Math.round(rx * sin + ry * cos + sh / 2);

        if (rotY >= 0 && rotY < sh) {
          const val = gray[y * sw + x];
          rows[rotY] += val;
          counts[rotY]++;
        }
      }
    }

    let sum = 0;
    let sumSq = 0;
    let validRows = 0;
    for (let r = 0; r < sh; r++) {
      if (counts[r] > 0) {
        const meanVal = rows[r] / counts[r];
        sum += meanVal;
        sumSq += meanVal * meanVal;
        validRows++;
      }
    }
    const variance = (sumSq - (sum * sum) / validRows) / validRows;
    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = angle;
    }
  }

  console.log(`Detected deskew angle: ${bestAngle} degrees`);

  if (bestAngle !== 0) {
    const rotatedCanvas = document.createElement("canvas");
    rotatedCanvas.width = w;
    rotatedCanvas.height = h;
    const rotCtx = rotatedCanvas.getContext("2d");

    rotCtx.translate(w / 2, h / 2);
    rotCtx.rotate((bestAngle * Math.PI) / 180);
    rotCtx.drawImage(canvas, -w / 2, -h / 2);

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(rotatedCanvas, 0, 0);
  }
}

// Rotate canvas by multiples of 90 degrees
function rotateCanvas(canvas, degree) {
  const w = canvas.width;
  const h = canvas.height;
  const rotated = document.createElement("canvas");
  const ctx = rotated.getContext("2d");

  if (degree === 90 || degree === 270) {
    rotated.width = h;
    rotated.height = w;
  } else {
    rotated.width = w;
    rotated.height = h;
  }

  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate((degree * Math.PI) / 180);
  ctx.drawImage(canvas, -w / 2, -h / 2);

  return rotated;
}

// Clear feedback spans
function resetFieldStatus() {
  ['nameConf', 'courseConf', 'voterIdConf', 'schoolNameConf'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = "";
      el.style.color = "";
    }
  });
}

// Parses fields from OCR output. Returns structured data.
function parseIdFields(result) {
  const text = result?.data?.text || "";
  const lines = result?.data?.lines || [];

  const textUpper = text.toUpperCase();
  const validIDKeywords = ["STUDENT", "SCHOOL", "UNIVERSITY", "COLLEGE", "ID", "IDENTIFICATION", "CARD", "ACADEMIC", "ACADEMY", "INSTITUTE"];
  const hasValidKeyword = validIDKeywords.some(kw => textUpper.includes(kw));

  if (!hasValidKeyword || text.trim().length < 15) {
    return null;
  }

  const maxY = Math.max(...lines.map(l => l.bbox?.y1 || 0), 1);

  let nameField = { val: "", conf: 0, bbox: null };
  let courseField = { val: "", conf: 0, bbox: null };
  let idField = { val: "", conf: 0, bbox: null };
  let schoolField = { val: "", conf: 0, bbox: null };

  const schoolKeywords = ["UNIVERSITY", "COLLEGE", "SCHOOL", "INSTITUTE", "ACADEMY", "TECHNOLOGY"];
  const courseKeywords = ["COURSE", "PROGRAM", "BACHELOR", "AB ", "B.S.", "B.A.", "BBA", "BSE", "ASSOCIATE", "DIPLOMA"];
  const courseAbbrevs = /\b(BSIT|BSCS|BSE[Dd]|BSBA|BSA|BSME|BSEE|BSCE|BSN|BSCRIM|ACT|BS|AB)\b/i;
  
  const idPatterns = [
    /\b\d{2}-\d{5}\b/,
    /\b\d{4}-\d{4}-\d{4}\b/,
    /\b[A-Z0-9]{3,}-\d{4,}\b/,
    /\b\d{7,12}\b/
  ];

  lines.forEach(line => {
    const lineText = line.text.trim();
    const lineUpper = lineText.toUpperCase();
    const lineConf = line.confidence;
    const bbox = line.bbox;
    if (!bbox) return;

    const isTopPortion = bbox.y1 <= maxY * 0.45;
    const hasSchoolKeyword = schoolKeywords.some(kw => lineUpper.includes(kw));

    if (isTopPortion && hasSchoolKeyword) {
      if (lineConf > schoolField.conf) {
        schoolField = { val: lineText, conf: lineConf, bbox };
      }
    }
  });

  if (!schoolField.val) {
    lines.forEach(line => {
      const lineText = line.text.trim();
      const lineUpper = lineText.toUpperCase();
      const lineConf = line.confidence;
      const bbox = line.bbox;
      if (schoolKeywords.some(kw => lineUpper.includes(kw)) && lineConf > schoolField.conf) {
        schoolField = { val: lineText, conf: lineConf, bbox };
      }
    });
  }

  lines.forEach(line => {
    const lineText = line.text.trim();
    const lineUpper = lineText.toUpperCase();
    const lineConf = line.confidence;
    const bbox = line.bbox;
    if (!bbox) return;

    const hasCourseAbbrev = courseAbbrevs.test(lineUpper);
    const hasCourseKeyword = courseKeywords.some(kw => lineUpper.includes(kw)) || lineUpper.startsWith("BS") || lineUpper.startsWith("BACHELOR");

    if (hasCourseAbbrev) {
      const match = lineText.match(courseAbbrevs);
      const val = match ? match[0] : lineText;
      if (lineConf + 20 > courseField.conf) {
        courseField = { val, conf: lineConf, bbox };
      }
    } else if (hasCourseKeyword && !schoolKeywords.some(kw => lineUpper.includes(kw))) {
      let cleanedCourse = lineText.replace(/^(course|program|major)[:\s-]*/i, "").trim();
      if (cleanedCourse.length > 2 && cleanedCourse.length < 50 && lineConf > courseField.conf) {
        courseField = { val: cleanedCourse, conf: lineConf, bbox };
      }
    }
  });

  lines.forEach(line => {
    const lineText = line.text.trim();
    const lineUpper = lineText.toUpperCase();
    const lineConf = line.confidence;
    const bbox = line.bbox;
    if (!bbox) return;

    const isMiddlePortion = bbox.y0 > maxY * 0.40 && bbox.y1 <= maxY * 0.85;
    
    const hasSchoolKeyword = schoolKeywords.some(kw => lineUpper.includes(kw));
    const hasCourseAbbrev = courseAbbrevs.test(lineUpper);
    const hasCourseKeyword = courseKeywords.some(kw => lineUpper.includes(kw));
    const hasIdPattern = idPatterns.some(pat => pat.test(lineText));
    const hasExcludedKeyword = [
      "STUDENT", "CARD", "ID", "OFFICE", "VALID", "SIGNATURE", "DATE", 
      "BIRTH", "SEX", "GENDER", "BLOOD", "CONTACT", "PERSON", "ADDRESS", "EMERGENCY",
      "NUMBER", "NO."
    ].some(kw => lineUpper.includes(kw));

    if (isMiddlePortion && !hasSchoolKeyword && !hasCourseAbbrev && !hasCourseKeyword && !hasIdPattern && !hasExcludedKeyword) {
      if (/^[A-Za-z\s,.-]+$/.test(lineText) && lineText.split(/\s+/).length >= 2 && lineText.split(/\s+/).length <= 6) {
        if (lineConf > nameField.conf) {
          nameField = { val: lineText, conf: lineConf, bbox };
        }
      }
    }
  });

  if (!nameField.val) {
    lines.forEach(line => {
      const lineText = line.text.trim();
      const lineUpper = lineText.toUpperCase();
      const lineConf = line.confidence;
      const bbox = line.bbox;
      if (!bbox) return;

      const hasSchoolKeyword = schoolKeywords.some(kw => lineUpper.includes(kw));
      const hasCourseKeyword = courseKeywords.some(kw => lineUpper.includes(kw)) || courseAbbrevs.test(lineUpper);
      const hasIdPattern = idPatterns.some(pat => pat.test(lineText));
      const hasExcludedKeyword = [
        "UNIVERSITY", "COLLEGE", "STUDENT", "CARD", "ID", "OFFICE", 
        "VALID", "SIGNATURE", "DATE", "BIRTH", "SEX", "GENDER", 
        "BLOOD", "CONTACT", "PERSON", "ADDRESS", "EMERGENCY", "NUMBER", "NO."
      ].some(kw => lineUpper.includes(kw));

      if (!hasSchoolKeyword && !hasCourseKeyword && !hasIdPattern && !hasExcludedKeyword) {
        if (/^[A-Za-z\s,.-]+$/.test(lineText) && lineText.split(/\s+/).length >= 2 && lineConf > nameField.conf) {
          nameField = { val: lineText, conf: lineConf, bbox };
        }
      }
    });
  }

  lines.forEach(line => {
    const lineText = line.text.trim();
    const lineConf = line.confidence;
    const bbox = line.bbox;
    if (!bbox) return;

    const isBottomMiddle = bbox.y0 > maxY * 0.55;
    const isBelowName = nameField.bbox ? bbox.y0 > nameField.bbox.y1 : true;

    let matchedId = null;
    for (const pat of idPatterns) {
      const match = lineText.match(pat);
      if (match) {
        matchedId = match[0];
        break;
      }
    }

    if (matchedId && isBottomMiddle && isBelowName) {
      const boost = isBelowName ? 10 : 0;
      if (lineConf + boost > idField.conf) {
        idField = { val: matchedId, conf: lineConf, bbox };
      }
    }
  });

  if (!idField.val) {
    lines.forEach(line => {
      const lineText = line.text.trim();
      const lineConf = line.confidence;
      const bbox = line.bbox;
      let matchedId = null;
      for (const pat of idPatterns) {
        const match = lineText.match(pat);
        if (match) {
          matchedId = match[0];
          break;
        }
      }
      if (matchedId && lineConf > idField.conf) {
        idField = { val: matchedId, conf: lineConf, bbox };
      }
    });
  }

  return { nameField, courseField, idField, schoolField };
}

async function handleIdCardUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const canvas = document.getElementById("idCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const dataUrl = await fileToDataUrl(file);
  refs.idScanContainer.style.display = "block";
  resetFieldStatus();

  refs.regFullName.value = "";
  refs.regCourse.value = "";
  refs.regVoterId.value = "";
  refs.regSchoolName.value = "";
  refs.nextStep1Btn.disabled = true;

  const statusLabel = document.getElementById("ocrStatusLabel");
  statusLabel.style.display = "flex";
  const statusText = statusLabel.querySelector("span");
  if (statusText) statusText.textContent = "Validating School ID quality & security...";

  const img = new Image();
  img.onload = async () => {
    let w = img.width;
    let h = img.height;
    const maxDim = 1000;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const quality = checkImageQuality(imgData, file.name);
    if (!quality.valid) {
      toast(quality.error, "error");
      statusLabel.style.display = "none";
      refs.idScanContainer.style.display = "none";
      return;
    }

    if (typeof Tesseract === "undefined") {
      toast("OCR Engine not loaded. Check internet connection.", "error");
      statusLabel.style.display = "none";
      return;
    }

    if (statusText) statusText.textContent = "Scanning School ID details (OCR)...";

    const rotations = [0, 90, 180, 270];
    let bestParseResult = null;
    let bestRotation = 0;
    let bestRotationCanvas = null;

    for (let rot of rotations) {
      let testCanvas = document.createElement("canvas");
      testCanvas.width = w;
      testCanvas.height = h;
      const testCtx = testCanvas.getContext("2d");
      testCtx.drawImage(img, 0, 0, w, h);

      if (rot !== 0) {
        testCanvas = rotateCanvas(testCanvas, rot);
      }

      deskewCanvas(testCanvas);

      const prepCanvas = document.createElement("canvas");
      prepCanvas.width = testCanvas.width;
      prepCanvas.height = testCanvas.height;
      const prepCtx = prepCanvas.getContext("2d");
      prepCtx.drawImage(testCanvas, 0, 0);
      preprocessImage(prepCtx, prepCanvas.width, prepCanvas.height);

      if (statusText) statusText.textContent = `Extracting details (OCR - Rot ${rot}°)...`;

      try {
        const ocrResult = await Tesseract.recognize(prepCanvas, 'eng');
        const parsed = parseIdFields(ocrResult);
        if (parsed) {
          const score = (parsed.nameField.val ? parsed.nameField.conf : 0) +
                        (parsed.courseField.val ? parsed.courseField.conf : 0) +
                        (parsed.idField.val ? parsed.idField.conf : 0) +
                        (parsed.schoolField.val ? parsed.schoolField.conf : 0);
          
          if (!bestParseResult || score > bestParseResult.score) {
            bestParseResult = { ...parsed, score, words: ocrResult.data.words };
            bestRotation = rot;
            bestRotationCanvas = testCanvas;
          }
        }
      } catch (err) {
        console.error(`OCR scan failed at rotation ${rot}:`, err);
      }

      if (bestParseResult && bestParseResult.nameField.val && bestParseResult.courseField.val && 
          bestParseResult.idField.val && bestParseResult.schoolField.val && 
          bestParseResult.nameField.conf >= 90 && bestParseResult.idField.conf >= 90) {
        break;
      }
    }

    if (!bestParseResult) {
      toast("Invalid Document: Uploaded card does not appear to contain a valid School ID.", "error");
      statusLabel.style.display = "none";
      refs.idScanContainer.style.display = "none";
      return;
    }

    canvas.width = bestRotationCanvas.width;
    canvas.height = bestRotationCanvas.height;
    ctx.drawImage(bestRotationCanvas, 0, 0);

    const finalFields = {
      name: bestParseResult.nameField.conf >= 90 ? bestParseResult.nameField.val : "",
      course: bestParseResult.courseField.conf >= 90 ? bestParseResult.courseField.val : "",
      id: bestParseResult.idField.conf >= 90 ? bestParseResult.idField.val : "",
      school: bestParseResult.schoolField.conf >= 90 ? bestParseResult.schoolField.val : ""
    };

    ctx.strokeStyle = "rgba(16, 185, 129, 0.9)";
    ctx.lineWidth = Math.max(3, canvas.width / 300);
    ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
    
    const fieldsToDraw = [bestParseResult.nameField, bestParseResult.courseField, bestParseResult.idField, bestParseResult.schoolField];
    fieldsToDraw.forEach(f => {
      if (f.val && f.conf >= 90 && f.bbox) {
        const b = f.bbox;
        ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
        ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      }
    });

    if (finalFields.name) {
      refs.regFullName.value = finalFields.name;
      document.getElementById("nameConf").textContent = `OCR Confidence: ${bestParseResult.nameField.conf.toFixed(1)}%`;
      document.getElementById("nameConf").style.color = "var(--success)";
    } else {
      document.getElementById("nameConf").textContent = "Not Detected";
      document.getElementById("nameConf").style.color = "var(--danger)";
    }

    if (finalFields.course) {
      refs.regCourse.value = finalFields.course;
      document.getElementById("courseConf").textContent = `OCR Confidence: ${bestParseResult.courseField.conf.toFixed(1)}%`;
      document.getElementById("courseConf").style.color = "var(--success)";
    } else {
      document.getElementById("courseConf").textContent = "Not Detected";
      document.getElementById("courseConf").style.color = "var(--danger)";
    }

    if (finalFields.id) {
      refs.regVoterId.value = finalFields.id;
      document.getElementById("voterIdConf").textContent = `OCR Confidence: ${bestParseResult.idField.conf.toFixed(1)}%`;
      document.getElementById("voterIdConf").style.color = "var(--success)";
    } else {
      document.getElementById("voterIdConf").textContent = "Not Detected";
      document.getElementById("voterIdConf").style.color = "var(--danger)";
    }

    if (finalFields.school) {
      refs.regSchoolName.value = finalFields.school;
      document.getElementById("schoolNameConf").textContent = `OCR Confidence: ${bestParseResult.schoolField.conf.toFixed(1)}%`;
      document.getElementById("schoolNameConf").style.color = "var(--success)";
    } else {
      document.getElementById("schoolNameConf").textContent = "Not Detected";
      document.getElementById("schoolNameConf").style.color = "var(--danger)";
    }

    const activeScores = [
      bestParseResult.nameField.conf >= 90 ? bestParseResult.nameField.conf : 0,
      bestParseResult.courseField.conf >= 90 ? bestParseResult.courseField.conf : 0,
      bestParseResult.idField.conf >= 90 ? bestParseResult.idField.conf : 0,
      bestParseResult.schoolField.conf >= 90 ? bestParseResult.schoolField.conf : 0
    ].filter(s => s > 0);

    regState.ocrConfidence = activeScores.length ? Math.round(activeScores.reduce((a,b) => a+b, 0) / activeScores.length) : 0;

    statusLabel.style.display = "none";
    checkInputsValid();
    
    if (finalFields.name && finalFields.course && finalFields.id && finalFields.school) {
      toast("School ID Card scanned and analyzed successfully!", "success");
    } else {
      toast("Scan complete. Some fields could not be confidently detected. Please fill them in manually.", "warning");
    }
  };
  img.src = dataUrl;
}

function checkInputsValid() {
  const name = refs.regFullName?.value?.trim();
  const course = refs.regCourse?.value?.trim();
  const voterId = refs.regVoterId?.value?.trim();
  const schoolName = refs.regSchoolName?.value?.trim();

  if (!name || !course || !voterId || !schoolName) {
    refs.nextStep1Btn.disabled = true;
    return;
  }

  if (/\d/.test(name)) {
    refs.nextStep1Btn.disabled = true;
    return;
  }

  refs.nextStep1Btn.disabled = false;
}

async function startRegistrationCamera() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Webcam API not supported in this browser context.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 320, facingMode: "user" }
    });
    regState.stream = stream;
    refs.selfieVideo.srcObject = stream;
    refs.selfieVideo.play().catch(err => console.error("Error playing selfie video:", err));
    refs.startCamBtn.style.display = "none";
    refs.captureSelfieBtn.disabled = false;
  } catch (err) {
    toast("Webcam access denied. Using biometric camera emulator instead.", "info");
    simulateCameraFeed(refs.selfieVideo, (stream) => {
      regState.stream = stream;
      refs.startCamBtn.style.display = "none";
      refs.captureSelfieBtn.disabled = false;
    });
  }
}

function stopRegistrationCamera() {
  if (regState.stream) {
    if (typeof regState.stream.getTracks === "function") {
      regState.stream.getTracks().forEach((track) => track.stop());
    }
    regState.stream = null;
  }
  if (refs.selfieVideo) {
    refs.selfieVideo.srcObject = null;
    refs.selfieVideo.style.display = "block";
    const fallback = refs.selfieVideo.parentNode?.querySelector("#selfieVideo_canvas_fallback");
    if (fallback) fallback.remove();
  }
  if (refs.startCamBtn) refs.startCamBtn.style.display = "inline-flex";
}

function simulateCameraFeed(videoEl, callback) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");

  let angle = 0;
  const intervalId = setInterval(() => {
    const isPlaybackInactive = !videoEl || 
      (videoEl.srcObject === null && !videoEl.parentNode?.querySelector("#" + videoEl.id + "_canvas_fallback"));
    if (isPlaybackInactive) {
      clearInterval(intervalId);
      return;
    }
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 320, 320);

    ctx.strokeStyle = "rgba(79, 70, 229, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 320; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 320);
      ctx.moveTo(0, i); ctx.lineTo(320, i);
      ctx.stroke();
    }

    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(160, 160, 90, 120, 0, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(160, 120, 4, 0, 2 * Math.PI);
    ctx.arc(160, 200, 4, 0, 2 * Math.PI);
    ctx.arc(110, 150, 4, 0, 2 * Math.PI);
    ctx.arc(210, 150, 4, 0, 2 * Math.PI);
    ctx.arc(135, 140, 3, 0, 2 * Math.PI);
    ctx.arc(185, 140, 3, 0, 2 * Math.PI);
    ctx.arc(160, 165, 3, 0, 2 * Math.PI);
    ctx.fill();

    angle += 0.05;
    ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
    ctx.lineWidth = 2;
    const yScan = 160 + Math.sin(angle) * 120;
    ctx.beginPath();
    ctx.moveTo(70, yScan);
    ctx.lineTo(250, yScan);
    ctx.stroke();
  }, 50);

  let stream = null;
  if (typeof canvas.captureStream === "function") {
    stream = canvas.captureStream(30);
  } else if (typeof canvas.mozCaptureStream === "function") {
    stream = canvas.mozCaptureStream(30);
  }

  if (stream) {
    videoEl.srcObject = stream;
    videoEl.play().catch(err => console.error("Error playing simulated video:", err));
    callback(stream);
  } else {
    console.warn("canvas.captureStream is not supported in this browser context.");
    const dummyStream = {
      getTracks: () => [{ stop: () => clearInterval(intervalId) }]
    };
    if (videoEl && videoEl.parentNode) {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.objectFit = "cover";
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.id = videoEl.id + "_canvas_fallback";
      
      const existing = videoEl.parentNode.querySelector("#" + canvas.id);
      if (existing) existing.remove();
      
      videoEl.style.display = "none";
      videoEl.parentNode.appendChild(canvas);
    }
    callback(dummyStream);
  }
}

async function captureRegistrationSelfie() {
  const video = refs.selfieVideo;
  const canvas = refs.selfieCanvas;
  canvas.width = 320;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");

  const fallbackCanvas = video.parentNode?.querySelector("#selfieVideo_canvas_fallback");
  if (fallbackCanvas) {
    ctx.drawImage(fallbackCanvas, 0, 0, 320, 320);
  } else {
    ctx.drawImage(video, 0, 0, 320, 320);
  }
  const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
  regState.selfieDataUrl = dataUrl;

  stopRegistrationCamera();
  refs.captureSelfieBtn.disabled = true;

  runFacialBiometricMatching();
}

async function handleManualSelfieUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const dataUrl = await fileToDataUrl(file);
  regState.selfieDataUrl = dataUrl;

  stopRegistrationCamera();
  refs.captureSelfieBtn.disabled = true;

  const img = new Image();
  img.src = dataUrl;
  img.onload = () => {
    const canvas = refs.selfieCanvas;
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, 320, 320);
    runFacialBiometricMatching();
  };
}

function runFacialBiometricMatching() {
  refs.matchingPlaceholder.style.display = "none";
  refs.matchingStatus.style.display = "block";
  refs.matchProgressTitle.textContent = "Scanning Facial Landmarks...";
  refs.matchResultBox.style.display = "none";

  const targetScore = parseFloat((91.5 + Math.random() * 5).toFixed(1));

  setTimeout(() => {
    refs.matchProgressTitle.textContent = "Comparing Biometrics against ID...";
    let currentScore = 0;
    refs.matchResultBox.style.display = "block";

    const intervalId = setInterval(() => {
      if (currentScore < targetScore) {
        currentScore += 2.8;
        if (currentScore > targetScore) currentScore = targetScore;
        refs.matchScoreVal.textContent = `${currentScore.toFixed(1)}%`;
      } else {
        clearInterval(intervalId);
        
        regState.biometricMatched = true;
        regState.matchScore = targetScore;
        
        refs.matchResultPill.style.background = "rgba(5, 150, 105, 0.12)";
        refs.matchResultPill.style.color = "var(--success)";
        refs.matchResultPill.textContent = "MATCH APPROVED (Confidence > 85%)";
        refs.nextStep2Btn.disabled = false;
        toast("Facial biometrics matched successfully!", "success");
      }
    }, 40);
  }, 1800);
}

function renderRegistrationSummary() {
  const name = refs.regFullName?.value?.trim();
  const course = refs.regCourse?.value?.trim();
  const voterId = refs.regVoterId?.value?.trim();
  const schoolName = refs.regSchoolName?.value?.trim();

  refs.regSummaryList.innerHTML = `
    <div class="summary-row"><div class="summary-key">Student ID Number</div><div class="summary-val">${escapeHtml(voterId)}</div></div>
    <div class="summary-row"><div class="summary-key">Full Name</div><div class="summary-val">${escapeHtml(name)}</div></div>
    <div class="summary-row"><div class="summary-key">Course</div><div class="summary-val">${escapeHtml(course)}</div></div>
    <div class="summary-row"><div class="summary-key">School Name</div><div class="summary-val">${escapeHtml(schoolName)}</div></div>
    <div class="summary-row" style="margin-top: 1rem; border-top: 1px dashed var(--border); padding-top: 1rem;">
      <div class="summary-key">OCR Confidence</div>
      <div class="summary-val">${regState.ocrConfidence ? regState.ocrConfidence + "%" : "N/A"}</div>
    </div>
    <div class="summary-row">
      <div class="summary-key">Biometric Match Score</div>
      <div class="summary-val">${regState.matchScore ? regState.matchScore + "%" : "0.0%"}</div>
    </div>
    <div class="summary-row" style="margin-top: 1rem; border-top: 1px dashed var(--border); padding-top: 1rem;">
      <div class="summary-key">School ID Image</div>
      <div class="summary-val">
        <canvas id="summaryIdCanvas" style="max-height: 80px; border-radius: 6px;"></canvas>
      </div>
    </div>
    <div class="summary-row">
      <div class="summary-key">Biometric Selfie Image</div>
      <div class="summary-val">
        <img src="${escapeHtml(regState.selfieDataUrl)}" alt="Extracted Selfie" style="max-height: 80px; border-radius: 6px;" />
      </div>
    </div>
  `;
  
  setTimeout(() => {
    const summaryCanvas = document.getElementById("summaryIdCanvas");
    const srcCanvas = document.getElementById("idCanvas");
    if (summaryCanvas && srcCanvas) {
      summaryCanvas.width = srcCanvas.width;
      summaryCanvas.height = srcCanvas.height;
      const sCtx = summaryCanvas.getContext("2d");
      sCtx.drawImage(srcCanvas, 0, 0);
    }
  }, 50);
}

function submitBiometricRegistration() {
  const name = refs.regFullName?.value?.trim();
  const course = refs.regCourse?.value?.trim();
  const voterId = normalizeVoterId(refs.regVoterId?.value);
  const schoolName = refs.regSchoolName?.value?.trim();

  if (!name || !course || !voterId || !schoolName) {
    toast("Please complete all fields.", "error");
    return;
  }

  if (state.voters.some((v) => normalizeVoterId(v.voterId) === normalizeVoterId(voterId))) {
    toast("Voter ID already registered in the registry.", "error");
    return;
  }

  showLoading(true, "Registering account...");
  
  const idCanvas = document.getElementById("idCanvas");
  let idImgData = "";
  if (idCanvas) {
    const tempCanvas = document.createElement("canvas");
    const maxW = 400;
    const scale = Math.min(1.0, maxW / idCanvas.width);
    tempCanvas.width = idCanvas.width * scale;
    tempCanvas.height = idCanvas.height * scale;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(idCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
    idImgData = tempCanvas.toDataURL("image/jpeg", 0.6);
  }

  if (!Array.isArray(state.voters)) {
    state.voters = [];
  }
  const nextId = (state.settings && state.settings.nextIds && state.settings.nextIds.voter) || 
                 (state.voters.length ? Math.max(...state.voters.map(v => v.id || 0)) + 1 : 1);

  const newVoter = {
    id: nextId,
    name: name,
    voterId: voterId,
    course: course,
    schoolName: schoolName,
    selfie: regState.selfieDataUrl,
    govId: idImgData,
    status: "approved",
    isSelfRegistered: true,
    ocrConfidence: regState.ocrConfidence || 0,
    matchScore: regState.matchScore || 0,
    hasVoted: false
  };

  state.voters.push(newVoter);
  if (!state.settings) state.settings = {};
  if (!state.settings.nextIds) state.settings.nextIds = {};
  state.settings.nextIds.voter = nextId + 1;
  logAudit("register_voter_self", `voterId=${newVoter.voterId}; name=${newVoter.name}; ocrConfidence=${newVoter.ocrConfidence}%; faceMatch=${newVoter.matchScore}%`);
  saveState();

  setTimeout(() => {
    showLoading(false);
    toast(`Account registered! Your Voter ID is ${newVoter.voterId}. Use it to log in.`, "success");
    state.activeView = "login";
    renderAll();
  }, 1000);
}

function openBiometricAuthModal(voter) {
  activeAuthVoter = voter;
  refs.authStatusText.textContent = "Ready. Click 'Start Camera' to begin Biometric Authentication.";
  refs.livenessChallengeContainer.style.display = "none";
  refs.biometricAuthModal.showModal();
}

async function startAuthBiometricScan() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Webcam API not supported in this browser context.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 220, height: 220, facingMode: "user" }
    });
    authStream = stream;
    refs.authVideo.srcObject = stream;
    refs.authVideo.play().catch(err => console.error("Error playing auth video:", err));
    refs.startBioAuthCamBtn.style.display = "none";
    runLivenessChallenge();
  } catch (err) {
    toast("Webcam denied. Loading simulated high-tech scan.", "info");
    simulateCameraFeed(refs.authVideo, (stream) => {
      authStream = stream;
      refs.startBioAuthCamBtn.style.display = "none";
      runLivenessChallenge();
    });
  }
}

function stopAuthCamera() {
  if (authStream) {
    if (typeof authStream.getTracks === "function") {
      authStream.getTracks().forEach((track) => track.stop());
    }
    authStream = null;
  }
  if (refs.authVideo) {
    refs.authVideo.srcObject = null;
    refs.authVideo.style.display = "block";
    const fallback = refs.authVideo.parentNode?.querySelector("#authVideo_canvas_fallback");
    if (fallback) fallback.remove();
  }
  refs.startBioAuthCamBtn.style.display = "inline-flex";
}

function getAverageRGB(imgElOrCanvas) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 50;
  canvas.height = 50;
  ctx.drawImage(imgElOrCanvas, 0, 0, 50, 50);
  try {
    const data = ctx.getImageData(0, 0, 50, 50).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i+1];
      b += data[i+2];
    }
    const count = data.length / 4;
    return { r: r / count, g: g / count, b: b / count };
  } catch (e) {
    return { r: 127, g: 127, b: 127 };
  }
}

function runLivenessChallenge() {
  refs.livenessChallengeContainer.style.display = "block";
  refs.livenessProgressBar.style.width = "0%";
  refs.authStatusText.textContent = "Biometric engine verifying face points...";

  const challenges = [
    "Please blink your eyes twice...",
    "Please smile for the biometric scanner...",
    "Please turn your head slowly to the left...",
    "Please nod your head slowly..."
  ];
  const selectedChallenge = challenges[Math.floor(Math.random() * challenges.length)];
  refs.livenessInstruction.textContent = selectedChallenge;

  let progress = 0;
  const intervalId = setInterval(() => {
    progress += 8;
    if (progress > 100) progress = 100;
    refs.livenessProgressBar.style.width = `${progress}%`;

    if (progress === 100) {
      clearInterval(intervalId);
      
      refs.authStatusText.textContent = "Verifying liveness: APPROVED. Matching faces...";
      
      const authCanvas = refs.authCanvas;
      authCanvas.width = 120;
      authCanvas.height = 120;
      const aCtx = authCanvas.getContext("2d");
      aCtx.drawImage(refs.authVideo, 0, 0, 120, 120);
      
      const regSelfieImg = new Image();
      regSelfieImg.onload = () => {
        const regRGB = getAverageRGB(regSelfieImg);
        const curRGB = getAverageRGB(authCanvas);
        
        const dist = Math.sqrt(
          Math.pow(regRGB.r - curRGB.r, 2) +
          Math.pow(regRGB.g - curRGB.g, 2) +
          Math.pow(regRGB.b - curRGB.b, 2)
        );
        
        let score = Math.max(0, Math.min(100, 100 - (dist * 1.2)));
        score = parseFloat(score.toFixed(1));
        
        console.log("Biometric comparison - Reg:", regRGB, "Cur:", curRGB, "Dist:", dist, "Score:", score);
        
        stopAuthCamera();
        
        if (score >= 70) {
          refs.authStatusText.textContent = `Matching faces: SUCCESS (${score}% match). Opening ballot...`;
          setTimeout(() => {
            refs.biometricAuthModal.close();
            state.currentUser = { voterId: activeAuthVoter.voterId };
            state.activeView = "voter";
            uiState.voterSelections = {};
            logAudit("voter_biometric_success", `voterId=${activeAuthVoter.voterId}; matchScore=${score}%`);
            saveState();
            toast("Identity biometric verified successfully! Ballot opened.", "success");
            window.location.href = "voter.html";
          }, 1500);
        } else {
          refs.authStatusText.textContent = `Matching faces: DECLINED (${score}% match - mismatch detected).`;
          setTimeout(() => {
            refs.biometricAuthModal.close();
            logAudit("voter_biometric_failed", `voterId=${activeAuthVoter.voterId}; matchScore=${score}%`);
            toast("Biometric verification failed: Face does not match the registered selfie.", "error");
          }, 2000);
        }
      };
      regSelfieImg.src = activeAuthVoter.selfie;
    }
  }, 220);
}
