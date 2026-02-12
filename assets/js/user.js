// User Application Logic
// Dependencies: assets/js/config.js (defines `db` and constants)

/* ──────────── File state ──────────── */
const files = {};

/* ──────────── Drag-and-drop helpers ──────────── */
function handleDragOver(e, areaId) {
  e.preventDefault();
  document.getElementById(areaId).classList.add('drag-over');
}
function handleDragLeave(areaId) {
  document.getElementById(areaId).classList.remove('drag-over');
}
function handleDrop(e, fieldId, areaId) {
  e.preventDefault();
  document.getElementById(areaId).classList.remove('drag-over');
  const dt = e.dataTransfer;
  if (dt && dt.files.length) {
    const input = document.getElementById(fieldId);
    // Attach to the hidden input via DataTransfer
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(dt.files[0]);
    input.files = dataTransfer.files;
    handleFileChange(fieldId, areaId);
  }
}

/* ──────────── File change handler ──────────── */
function handleFileChange(fieldId, areaId) {
  const input  = document.getElementById(fieldId);
  const area   = document.getElementById(areaId);
  const label  = document.getElementById('fn-' + fieldId);
  const errEl  = document.getElementById('err-' + fieldId);
  const file   = input.files[0];

  area.classList.remove('has-file', 'invalid');
  label.textContent = '';
  if (!file) { files[fieldId] = null; return; }

  // Validate size (5 MB)
  if (file.size > 5 * 1024 * 1024) {
    showError(fieldId, 'File is too large. Maximum allowed size is 5 MB.');
    area.classList.add('invalid');
    input.value = '';
    files[fieldId] = null;
    return;
  }

  // Validate type
  const allowed = ['application/pdf','image/jpeg','image/png'];
  if (!allowed.includes(file.type)) {
    showError(fieldId, 'Invalid file type. Please upload PDF, JPG, or PNG.');
    area.classList.add('invalid');
    input.value = '';
    files[fieldId] = null;
    return;
  }

  files[fieldId] = file;
  area.classList.add('has-file');
  label.textContent = '✓ ' + file.name;
  if (errEl) { errEl.classList.remove('visible'); }
  updateProgress();
}

/* ──────────── Conditional section toggle ──────────── */
function toggleConditional(sectionId, show) {
  const el = document.getElementById(sectionId);
  if (show) {
    el.classList.add('visible');
  } else {
    el.classList.remove('visible');
    // Clear conditional file if hidden
    if (sectionId === 'packhouse-conditional') {
      clearConditionalFile('payslip', 'area-payslip');
    } else if (sectionId === 'forklift-conditional') {
      clearConditionalFile('forklift_doc', 'area-forklift_doc');
    }
  }
  updateProgress();
}
function clearConditionalFile(fieldId, areaId) {
  const input = document.getElementById(fieldId);
  input.value = '';
  files[fieldId] = null;
  document.getElementById('fn-' + fieldId).textContent = '';
  document.getElementById('area-' + fieldId.replace('_doc','_doc')).classList.remove('has-file');
  hideError(fieldId);
}

/* ──────────── SA ID Luhn-style validation ──────────── */
function isValidSAID(id) {
  if (!/^\d{13}$/.test(id)) return false;
  // Check date portion YYMMDD
  const yy = parseInt(id.substring(0,2));
  const mm = parseInt(id.substring(2,4));
  const dd = parseInt(id.substring(4,6));
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  // Luhn check
  let odd = 0, even = 0;
  for (let i = 0; i < 12; i += 2) odd  += parseInt(id[i]);
  for (let i = 1; i < 12; i += 2) {
    let d = parseInt(id[i]) * 2;
    even += d > 9 ? d - 9 : d;
  }
  const total = odd + even;
  const check = (10 - (total % 10)) % 10;
  return check === parseInt(id[12]);
}

/* ──────────── Phone validation ──────────── */
function isValidSAPhone(num) {
  return /^0[6-8][0-9]{8}$/.test(num);
}

/* ──────────── Error helpers ──────────── */
function showError(fieldId, msg) {
  const el = document.getElementById('err-' + fieldId);
  const input = document.getElementById(fieldId);
  if (el) { el.textContent = msg || el.dataset.default; el.classList.add('visible'); }
  if (input) input.classList.add('invalid');
}
function hideError(fieldId) {
  const el = document.getElementById('err-' + fieldId);
  const input = document.getElementById(fieldId);
  if (el) el.classList.remove('visible');
  if (input) input.classList.remove('invalid');
}

/* ──────────── Progress bar ──────────── */
function updateProgress() {
  const fields = ['first_name','surname','id_number','contact_number','race','gender','address'];
  let filled = 0;
  const total = 12; // approx total required steps

  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el && el.value.trim()) filled++;
  });
  ['id_copy','proof_sars','proof_bank'].forEach(f => { if (files[f]) filled++; });
  if (document.querySelector('input[name="packhouse_exp"]:checked')) filled++;
  if (document.querySelector('input[name="forklift_licence"]:checked')) filled++;

  const pct = Math.min(100, Math.round((filled / total) * 100));
  document.getElementById('progress').style.width = pct + '%';
}

/* ──────────── Live field validation ──────────── */
document.getElementById('first_name').addEventListener('input', function() {
  this.value.trim() ? hideError('first_name') : null;
  updateProgress();
});
document.getElementById('surname').addEventListener('input', function() {
  this.value.trim() ? hideError('surname') : null;
  updateProgress();
});
document.getElementById('id_number').addEventListener('input', function() {
  this.value = this.value.replace(/\D/g,'');
  if (this.value.length === 13 && isValidSAID(this.value)) hideError('id_number');
  updateProgress();
});
document.getElementById('contact_number').addEventListener('input', function() {
  this.value = this.value.replace(/\D/g,'');
  if (isValidSAPhone(this.value)) hideError('contact_number');
  updateProgress();
});
document.getElementById('race').addEventListener('change', function() {
  this.value ? hideError('race') : null; updateProgress();
});
document.getElementById('gender').addEventListener('change', function() {
  this.value ? hideError('gender') : null; updateProgress();
});
document.getElementById('address').addEventListener('input', function() {
  this.value.trim() ? hideError('address') : null; updateProgress();
});

/* ──────────── Validate entire form ──────────── */
function validateForm() {
  let valid = true;

  // Name
  if (!document.getElementById('first_name').value.trim()) {
    showError('first_name', 'Please enter your name.'); valid = false;
  } else hideError('first_name');

  // Surname
  if (!document.getElementById('surname').value.trim()) {
    showError('surname', 'Please enter your surname.'); valid = false;
  } else hideError('surname');

  // ID Number
  const idVal = document.getElementById('id_number').value.trim();
  if (!isValidSAID(idVal)) {
    showError('id_number', 'Please enter a valid 13-digit SA ID number.'); valid = false;
  } else hideError('id_number');

  // Contact
  const phone = document.getElementById('contact_number').value.trim();
  if (!isValidSAPhone(phone)) {
    showError('contact_number', 'Please enter a valid 10-digit SA phone number (starting with 06x, 07x, or 08x).'); valid = false;
  } else hideError('contact_number');

  // Race
  if (!document.getElementById('race').value) {
    showError('race', 'Please select your race.'); valid = false;
  } else hideError('race');

  // Gender
  if (!document.getElementById('gender').value) {
    showError('gender', 'Please select your gender.'); valid = false;
  } else hideError('gender');

  // Address
  if (!document.getElementById('address').value.trim()) {
    showError('address', 'Please enter your address.'); valid = false;
  } else hideError('address');

  // Compulsory files
  ['id_copy','proof_sars','proof_bank'].forEach(f => {
    if (!files[f]) {
      showError(f, 'This document is required.'); valid = false;
    } else hideError(f);
  });

  // Packhouse
  const packVal = document.querySelector('input[name="packhouse_exp"]:checked');
  if (!packVal) {
    showError('packhouse_exp', 'Please indicate your packhouse experience.'); valid = false;
  } else {
    hideError('packhouse_exp');
    if (packVal.value === 'yes' && !files['payslip']) {
      showError('payslip', 'Please upload your payslip as proof of experience.'); valid = false;
    } else hideError('payslip');
  }

  // Forklift
  const forkVal = document.querySelector('input[name="forklift_licence"]:checked');
  if (!forkVal) {
    showError('forklift_licence', 'Please indicate your forklift licence status.'); valid = false;
  } else {
    hideError('forklift_licence');
    if (forkVal.value === 'yes' && !files['forklift_doc']) {
      showError('forklift_doc', 'Please upload your forklift licence document.'); valid = false;
    } else hideError('forklift_doc');
  }

  return valid;
}

/* ──────────── Upload a single file to Supabase Storage ──────────── */
async function uploadFile(fieldId, refId) {
  const file = files[fieldId];
  if (!file) return null;
  const ext  = file.name.split('.').pop();
  const path = `${refId}/${fieldId}.${ext}`;
  const { data, error } = await db.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(`Upload failed for ${fieldId}: ${error.message}`);
  return path;
}

/* ──────────── Form submit ──────────── */
document.getElementById('app-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  hideGlobalError();

  if (!validateForm()) {
    // Scroll to first error
    const firstErr = document.querySelector('.error-msg.visible');
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = document.getElementById('btn-submit');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    // Generate a short reference ID
    const refId = 'APP-' + Date.now().toString(36).toUpperCase();

    // Upload files in parallel
    const packVal  = document.querySelector('input[name="packhouse_exp"]:checked').value;
    const forkVal  = document.querySelector('input[name="forklift_licence"]:checked').value;

    const uploadTasks = [
      uploadFile('id_copy', refId),
      uploadFile('proof_sars', refId),
      uploadFile('proof_bank', refId),
    ];
    if (packVal === 'yes') uploadTasks.push(uploadFile('payslip', refId));
    if (forkVal === 'yes') uploadTasks.push(uploadFile('forklift_doc', refId));

    const [idCopyPath, sarsPath, bankPath, ...extra] = await Promise.all(uploadTasks);

    let payslipPath = null, forkliftPath = null;
    if (packVal === 'yes' && forkVal === 'yes') { payslipPath = extra[0]; forkliftPath = extra[1]; }
    else if (packVal === 'yes') { payslipPath = extra[0]; }
    else if (forkVal === 'yes') { forkliftPath = extra[0]; }

    // Insert record to DB
    const { error: dbErr } = await db.from(DB_TABLE).insert({
      ref_id:             refId,
      first_name:         document.getElementById('first_name').value.trim(),
      surname:            document.getElementById('surname').value.trim(),
      id_number:          document.getElementById('id_number').value.trim(),
      race:               document.getElementById('race').value,
      gender:             document.getElementById('gender').value,
      contact_number:     document.getElementById('contact_number').value.trim(),
      address:            document.getElementById('address').value.trim(),
      id_copy_path:       idCopyPath,
      proof_sars_path:    sarsPath,
      proof_bank_path:    bankPath,
      packhouse_exp:      packVal === 'yes',
      payslip_path:       payslipPath,
      forklift_licence:   forkVal === 'yes',
      forklift_doc_path:  forkliftPath,
      submitted_at:       new Date().toISOString(),
    });

    if (dbErr) throw new Error(dbErr.message);

    // Success!
    document.getElementById('form-wrapper').style.display = 'none';
    const ty = document.getElementById('thank-you');
    ty.style.display = 'block';
    document.getElementById('ty-ref').textContent = 'Reference: ' + refId;

  } catch (err) {
    showGlobalError('Submission failed: ' + err.message + '. Please try again or contact us directly.');
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

function showGlobalError(msg) {
  const el = document.getElementById('global-error');
  el.textContent = msg;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function hideGlobalError() {
  document.getElementById('global-error').style.display = 'none';
}
