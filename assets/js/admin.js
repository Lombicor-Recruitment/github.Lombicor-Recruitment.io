// Admin Application Logic
// Dependencies: assets/js/config.js (defines `db` and constants)

/* ── State ── */
let allRecords   = [];   // full filtered set (for pagination / export)
let currentPage  = 1;
const PAGE_SIZE  = 25;
let sortCol      = 'submitted_at';
let sortAsc      = false;
let activeFilters = {};
let selectedIds  = new Set();
let editingId    = null;
let deleteId     = null;

/* ══════════════════════════════════════════
   AUTH
══════════════════════════════════════════ */
async function doLogin() {
  const userInput = document.getElementById('login-email').value.trim();
  const pass      = document.getElementById('login-pass').value;
  const errEl     = document.getElementById('login-err');
  const btn       = document.getElementById('btn-login');

  if (!userInput || !pass) { errEl.textContent = 'Please enter username and password.'; return; }

  btn.disabled = true;
  btn.textContent = 'Signing in…';
  errEl.textContent = '';

  // Construct email from username if not already an email
  // We use a fake domain suffix for admin users derived from GitHub usernames
  const email = userInput.includes('@') ? userInput : `${userInput}@lombicor.admin`;

  const { data, error } = await db.auth.signInWithPassword({ email, password: pass });
  
  if (error) {
    errEl.textContent = 'Login failed. Check credentials.'; // Generic message for security
    console.error('Login error:', error.message);
    btn.disabled = false;
    btn.textContent = 'Sign In';
    return;
  }
  enterApp(data.user.email);
}
document.getElementById('login-pass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });

async function doSignOut() {
  await db.auth.signOut();
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-pass').value = '';
}

function enterApp(email) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  document.getElementById('user-email').textContent = email;
  loadOverview();
  loadApplicants();
}

/* Auto-restore session */
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) enterApp(session.user.email);
})();

/* ══════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════ */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
}

/* ══════════════════════════════════════════
   OVERVIEW PAGE
══════════════════════════════════════════ */
async function loadOverview() {
  // Total
  const { count: total } = await db.from(DB_TABLE).select('*', { count: 'exact', head: true });
  document.getElementById('stat-total').textContent = total ?? '—';

  // This month
  const now  = new Date();
  const ym   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const { count: monthCount } = await db.from(DB_TABLE)
    .select('*', { count: 'exact', head: true })
    .gte('submitted_at', ym + '-01')
    .lt('submitted_at',  ym + '-32');
  document.getElementById('stat-month').textContent = monthCount ?? '0';
  document.getElementById('stat-month-label').textContent = now.toLocaleString('default',{month:'long',year:'numeric'});

  // Packhouse
  const { count: packCount } = await db.from(DB_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('packhouse_exp', true);
  document.getElementById('stat-pack').textContent = packCount ?? '0';

  // Forklift
  const { count: forkCount } = await db.from(DB_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('forklift_licence', true);
  document.getElementById('stat-fork').textContent = forkCount ?? '0';

  // Monthly chart (last 6 months)
  buildMonthlyChart();

  // Recent 10
  const { data: recent } = await db.from(DB_TABLE)
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(10);
  renderRecentTable(recent || []);
}

async function buildMonthlyChart() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString('default', { month: 'short' }),
      from:  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`,
      to:    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-31`,
    });
  }
  const counts = await Promise.all(months.map(async m => {
    const { count } = await db.from(DB_TABLE)
      .select('*', { count: 'exact', head: true })
      .gte('submitted_at', m.from)
      .lte('submitted_at', m.to);
    return count || 0;
  }));
  const max = Math.max(...counts, 1);
  const chart = document.getElementById('monthly-chart');
  chart.innerHTML = counts.map((c, i) => `
    <div class="bar-col">
      <div class="bar-val">${c}</div>
      <div class="bar" style="height:${Math.round((c/max)*80)+2}px" title="${c} applications"></div>
      <div class="bar-label">${months[i].label}</div>
    </div>
  `).join('');
}

function renderRecentTable(rows) {
  const tbody = document.getElementById('recent-tbody');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No applications yet</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr onclick="openModal('${r.id}')">
      <td><span class="badge new">${r.ref_id || '—'}</span></td>
      <td>${esc(r.first_name)} ${esc(r.surname)}</td>
      <td>${esc(r.contact_number)}</td>
      <td><span class="badge ${r.packhouse_exp ? 'yes':'no'}">${r.packhouse_exp ? 'Yes':'No'}</span></td>
      <td><span class="badge ${r.forklift_licence ? 'yes':'no'}">${r.forklift_licence ? 'Yes':'No'}</span></td>
      <td>${fmtDate(r.submitted_at)}</td>
      <td><button class="btn" onclick="event.stopPropagation();openModal('${r.id}')">View</button></td>
    </tr>
  `).join('');
}

/* ══════════════════════════════════════════
   APPLICANTS PAGE
══════════════════════════════════════════ */
async function loadApplicants() {
  renderLoadingRows();
  let q = db.from(DB_TABLE).select('*', { count: 'exact' });

  // Apply filters
  const search = (document.getElementById('search-input')?.value || '').trim();
  const pack   = document.getElementById('filter-pack')?.value;
  const fork   = document.getElementById('filter-fork')?.value;
  const gender = document.getElementById('filter-gender')?.value;
  const race   = document.getElementById('filter-race')?.value;
  const from   = document.getElementById('filter-from')?.value;
  const to     = document.getElementById('filter-to')?.value;

  if (pack !== '')   q = q.eq('packhouse_exp', pack === 'true');
  if (fork !== '')   q = q.eq('forklift_licence', fork === 'true');
  if (gender)        q = q.eq('gender', gender);
  if (race)          q = q.eq('race', race);
  if (from)          q = q.gte('submitted_at', from);
  if (to)            q = q.lte('submitted_at', to + 'T23:59:59');

  if (search) {
    q = q.or(
      `first_name.ilike.%${search}%,surname.ilike.%${search}%,id_number.ilike.%${search}%,` +
      `contact_number.ilike.%${search}%,ref_id.ilike.%${search}%`
    );
  }

  q = q.order(sortCol, { ascending: sortAsc });

  const { data, error, count } = await q;
  if (error) { showToast('Error loading data: ' + error.message, 'error'); return; }

  allRecords = data || [];
  renderTable(allRecords, count || 0);
}

function renderLoadingRows() {
  document.getElementById('main-tbody').innerHTML = `
    <tr class="loading-row"><td colspan="11" style="text-align:center;color:var(--muted)">
      <span class="spinner"></span> Loading…
    </td></tr>`;
}

function renderTable(rows, total) {
  const tbody = document.getElementById('main-tbody');
  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = rows.slice(start, start + PAGE_SIZE);

  document.getElementById('table-count').textContent =
    `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, rows.length)} of ${rows.length} result${rows.length !== 1 ? 's':''}`;

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  document.getElementById('pg-info').textContent = `Page ${currentPage} / ${totalPages || 1}`;
  document.getElementById('pg-prev').disabled = currentPage <= 1;
  document.getElementById('pg-next').disabled = currentPage >= totalPages;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">No results found</div>
      <div class="empty-sub">Try adjusting your search or filters</div>
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = slice.map(r => `
    <tr class="${selectedIds.has(r.id) ? 'selected' : ''}" onclick="openModal(${r.id})">
      <td class="cb-col" onclick="event.stopPropagation()">
        <input type="checkbox" ${selectedIds.has(r.id)?'checked':''} onchange="toggleSelect(${r.id}, this.checked)"/>
      </td>
      <td><span class="badge new">${esc(r.ref_id)||'—'}</span></td>
      <td>${esc(r.first_name)} ${esc(r.surname)}</td>
      <td class="truncate">${esc(r.id_number)}</td>
      <td>${esc(r.gender)||'—'}</td>
      <td>${esc(r.race)||'—'}</td>
      <td>${esc(r.contact_number)}</td>
      <td><span class="badge ${r.packhouse_exp?'yes':'no'}">${r.packhouse_exp?'Yes':'No'}</span></td>
      <td><span class="badge ${r.forklift_licence?'yes':'no'}">${r.forklift_licence?'Yes':'No'}</span></td>
      <td>${fmtDate(r.submitted_at)}</td>
      <td onclick="event.stopPropagation()">
        <button class="btn" style="padding:5px 10px" onclick="openModal(${r.id})">View</button>
      </td>
    </tr>
  `).join('');
}

function onSearch() { currentPage = 1; loadApplicants(); }
function onFilter() { currentPage = 1; loadApplicants(); }
function clearFilters() {
  ['search-input','filter-pack','filter-fork','filter-gender','filter-race','filter-from','filter-to']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  currentPage = 1; selectedIds.clear(); loadApplicants();
}

function sortBy(col) {
  if (sortCol === col) sortAsc = !sortAsc; else { sortCol = col; sortAsc = true; }
  document.querySelectorAll('[id^="sort-"]').forEach(el => el.textContent = '↕');
  const arrow = document.getElementById('sort-' + col);
  if (arrow) arrow.textContent = sortAsc ? '↑' : '↓';
  loadApplicants();
}

function changePage(dir) {
  const totalPages = Math.ceil(allRecords.length / PAGE_SIZE);
  currentPage = Math.max(1, Math.min(totalPages, currentPage + dir));
  renderTable(allRecords, allRecords.length);
}

/* Selection */
function toggleSelect(id, checked) {
  if (checked) selectedIds.add(id); else selectedIds.delete(id);
  document.getElementById('btn-export-sel').disabled = selectedIds.size === 0;
  document.querySelectorAll('#main-tbody tr').forEach(tr => {
    const cb = tr.querySelector('input[type=checkbox]');
    if (cb) tr.classList.toggle('selected', cb.checked);
  });
}
function toggleAll(cb) {
  const start = (currentPage-1)*PAGE_SIZE;
  allRecords.slice(start, start+PAGE_SIZE).forEach(r => {
    if(cb.checked) selectedIds.add(r.id); else selectedIds.delete(r.id);
  });
  document.getElementById('btn-export-sel').disabled = selectedIds.size === 0;
  renderTable(allRecords, allRecords.length);
}

/* ══════════════════════════════════════════
   MODAL
══════════════════════════════════════════ */
async function openModal(id) {
  editingId = id;
  const rec = allRecords.find(r => r.id == id);
  if (!rec) {
    // Fetch directly
    const { data } = await db.from(DB_TABLE).select('*').eq('id', id).single();
    if (!data) { showToast('Could not load record', 'error'); return; }
    populateModal(data);
  } else {
    populateModal(rec);
  }
  document.getElementById('modal-overlay').classList.add('open');
}

function populateModal(r) {
  document.getElementById('modal-title').textContent = `${r.first_name} ${r.surname}`;
  document.getElementById('modal-ref').textContent = r.ref_id || '';
  ['first_name','surname','id_number','contact_number','address'].forEach(f => {
    const el = document.getElementById('mf-' + f);
    if(el) el.value = r[f] || '';
  });
  ['gender','race'].forEach(f => {
    const el = document.getElementById('mf-' + f);
    if(el) el.value = r[f] || '';
  });
  document.getElementById('mf-packhouse_exp').value = String(r.packhouse_exp);
  document.getElementById('mf-forklift_licence').value = String(r.forklift_licence);

  // Documents
  const docs = [
    { path: r.id_copy_path,       label: 'ID Copy',       icon: '🪪' },
    { path: r.proof_sars_path,    label: 'SARS Proof',    icon: '📋' },
    { path: r.proof_bank_path,    label: 'Bank Proof',    icon: '🏦' },
    { path: r.payslip_path,       label: 'Payslip',       icon: '💼' },
    { path: r.forklift_doc_path,  label: 'Forklift Lic.', icon: '🏗️' },
  ].filter(d => d.path);

  document.getElementById('modal-docs').innerHTML = docs.length
    ? docs.map(d => `
        <div class="doc-item" onclick="viewDoc('${d.path}')">
          <div class="doc-icon">${d.icon}</div>
          <div class="doc-name">${d.label}</div>
          <div style="font-size:10px;color:var(--accent);margin-top:4px;">Click to open ↗</div>
        </div>
      `).join('')
    : `<div style="font-size:12px;color:var(--muted)">No documents on file.</div>`;
}

async function viewDoc(path) {
  const { data } = db.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (data?.publicUrl) {
    window.open(data.publicUrl, '_blank');
  } else {
    // Try signed URL
    const { data: signed, error } = await db.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60);
    if (signed) window.open(signed.signedUrl, '_blank');
    else showToast('Could not open document', 'error');
  }
}

function closeModal(force) {
  if (force === true || (force && force.target === document.getElementById('modal-overlay'))) {
    document.getElementById('modal-overlay').classList.remove('open');
    editingId = null;
  }
}

async function saveEdit() {
  if (!editingId) return;
  const payload = {
    first_name:       document.getElementById('mf-first_name').value.trim(),
    surname:          document.getElementById('mf-surname').value.trim(),
    id_number:        document.getElementById('mf-id_number').value.trim(),
    contact_number:   document.getElementById('mf-contact_number').value.trim(),
    address:          document.getElementById('mf-address').value.trim(),
    gender:           document.getElementById('mf-gender').value,
    race:             document.getElementById('mf-race').value,
    packhouse_exp:    document.getElementById('mf-packhouse_exp').value === 'true',
    forklift_licence: document.getElementById('mf-forklift_licence').value === 'true',
  };
  const { error } = await db.from(DB_TABLE).update(payload).eq('id', editingId);
  if (error) { showToast('Save failed: ' + error.message, 'error'); return; }
  showToast('Changes saved successfully', 'success');
  closeModal(true);
  loadApplicants();
  loadOverview();
}

/* ══════════════════════════════════════════
   DELETE
══════════════════════════════════════════ */
function confirmDelete() {
  deleteId = editingId;
  document.getElementById('confirm-title').textContent = 'Delete Application?';
  document.getElementById('confirm-msg').textContent = 'This will permanently delete this applicant record. This action cannot be undone.';
  document.getElementById('confirm-overlay').classList.add('open');
}
function confirmNo() { document.getElementById('confirm-overlay').classList.remove('open'); deleteId = null; }
async function confirmYes() {
  if (!deleteId) return;
  const { error } = await db.from(DB_TABLE).delete().eq('id', deleteId);
  if (error) { showToast('Delete failed: ' + error.message, 'error'); return; }
  showToast('Record deleted', 'success');
  document.getElementById('confirm-overlay').classList.remove('open');
  closeModal(true);
  loadApplicants();
  loadOverview();
  deleteId = null;
}

/* ══════════════════════════════════════════
   PDF EXPORT HELPERS
══════════════════════════════════════════ */
function buildPDF(rows, title, subtitle) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFillColor(8, 12, 10);
  doc.rect(0, 0, 297, 30, 'F');
  doc.setTextColor(45, 255, 122);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECRUITMENT ADMIN PORTAL', 14, 12);
  doc.setTextColor(212, 232, 216);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 20);
  doc.text(subtitle, 14, 26);
  doc.setTextColor(74, 99, 80);
  doc.text('Generated: ' + new Date().toLocaleString(), 200, 26);

  const cols = [
    { header: 'Ref',         dataKey: 'ref_id' },
    { header: 'First Name',  dataKey: 'first_name' },
    { header: 'Surname',     dataKey: 'surname' },
    { header: 'ID Number',   dataKey: 'id_number' },
    { header: 'Gender',      dataKey: 'gender' },
    { header: 'Race',        dataKey: 'race' },
    { header: 'Contact',     dataKey: 'contact_number' },
    { header: 'Address',     dataKey: 'address' },
    { header: 'Pack. Exp',   dataKey: 'packhouse_exp' },
    { header: 'Forklift',    dataKey: 'forklift_licence' },
    { header: 'Date',        dataKey: 'submitted_at' },
  ];

  const tableData = rows.map(r => ({
    ...r,
    packhouse_exp:   r.packhouse_exp   ? 'Yes' : 'No',
    forklift_licence: r.forklift_licence ? 'Yes' : 'No',
    submitted_at:    fmtDate(r.submitted_at),
  }));

  doc.autoTable({
    startY: 34,
    columns: cols,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [14, 20, 16], textColor: [45, 255, 122], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fillColor: [17, 24, 16], textColor: [212, 232, 216], fontSize: 8 },
    alternateRowStyles: { fillColor: [11, 16, 12] },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 24 }, 1: { cellWidth: 24 }, 2: { cellWidth: 24 },
      3: { cellWidth: 28 }, 7: { cellWidth: 38 },
    },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(74,99,80);
    doc.text(`Page ${i} of ${pageCount} · Confidential`, 14, doc.internal.pageSize.height - 8);
  }

  return doc;
}

function exportSinglePDF() {
  const rec = allRecords.find(r => r.id == editingId);
  if (!rec) return;
  const doc = buildPDF([rec], 'Single Applicant Report', `${rec.first_name} ${rec.surname} · ${rec.ref_id}`);
  doc.save(`applicant-${rec.ref_id || rec.id}.pdf`);
  showToast('PDF downloaded', 'success');
}

function exportSelectedPDF() {
  const rows = allRecords.filter(r => selectedIds.has(r.id));
  if (!rows.length) { showToast('No applicants selected', 'info'); return; }
  const doc = buildPDF(rows, 'Selected Applicants Report', `${rows.length} applicant(s) · Generated ${new Date().toLocaleDateString()}`);
  doc.save(`selected-applicants-${Date.now()}.pdf`);
  showToast(`PDF with ${rows.length} records downloaded`, 'success');
}

async function exportPDFDateRange() {
  const from = document.getElementById('exp-from').value;
  const to   = document.getElementById('exp-to').value;
  if (!from || !to) { showToast('Please select both From and To dates', 'info'); return; }
  let q = db.from(DB_TABLE).select('*').gte('submitted_at', from).lte('submitted_at', to + 'T23:59:59').order('submitted_at');
  const { data, error } = await q;
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  if (!data?.length) { showToast('No records found in that date range', 'info'); return; }
  const doc = buildPDF(data, 'Date Range Report', `${fmtDate(from)} – ${fmtDate(to)} · ${data.length} record(s)`);
  doc.save(`report-${from}-to-${to}.pdf`);
  showToast(`PDF with ${data.length} records downloaded`, 'success');
}

async function exportPDFByType() {
  const pack = document.getElementById('exp-pack').value;
  const fork = document.getElementById('exp-fork').value;
  let q = db.from(DB_TABLE).select('*');
  if (pack !== '') q = q.eq('packhouse_exp', pack === 'true');
  if (fork !== '') q = q.eq('forklift_licence', fork === 'true');
  q = q.order('submitted_at');
  const { data, error } = await q;
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  if (!data?.length) { showToast('No records match those filters', 'info'); return; }
  const packLabel = pack === '' ? 'Any' : (pack === 'true' ? 'Yes' : 'No');
  const forkLabel = fork === '' ? 'Any' : (fork === 'true' ? 'Yes' : 'No');
  const doc = buildPDF(data, 'Applicant Type Report',
    `Packhouse: ${packLabel} · Forklift: ${forkLabel} · ${data.length} record(s)`);
  doc.save(`report-type-${Date.now()}.pdf`);
  showToast(`PDF with ${data.length} records downloaded`, 'success');
}

/* ══════════════════════════════════════════
   CSV EXPORT
══════════════════════════════════════════ */
function rowsToCSV(rows) {
  const headers = ['ref_id','first_name','surname','id_number','race','gender',
    'contact_number','address','packhouse_exp','forklift_licence','submitted_at'];
  const lines = [headers.join(',')];
  rows.forEach(r => {
    lines.push(headers.map(h => {
      const v = r[h] ?? '';
      const s = String(v).replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    }).join(','));
  });
  return lines.join('\n');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function exportFullCSV() {
  showToast('Fetching all records…', 'info');
  const { data, error } = await db.from(DB_TABLE).select('*').order('submitted_at');
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  downloadCSV(rowsToCSV(data || []), `full-export-${new Date().toISOString().slice(0,10)}.csv`);
  showToast(`CSV with ${data.length} records downloaded`, 'success');
}

function exportFilteredCSV() {
  if (!allRecords.length) { showToast('No records to export. Apply filters on the Applicants page first.', 'info'); return; }
  downloadCSV(rowsToCSV(allRecords), `filtered-export-${new Date().toISOString().slice(0,10)}.csv`);
  showToast(`CSV with ${allRecords.length} records downloaded`, 'success');
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg, type = 'info') {
  const wrap = document.getElementById('toast-wrap');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]||'ℹ'}</span> ${msg}`;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3500);
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString('en-ZA', { day:'2-digit', month:'short', year:'numeric' });
}
