/* ============ APP ============ */
(function(){
  let topics = RecallData.loadTopics();
  let settings = RecallData.loadSettings();
  let archiveYear = null;

  /* ---------- helpers ---------- */
  function persistTopics(){ RecallData.saveTopics(topics); }
  function persistSettings(){ RecallData.saveSettings(settings); }

  function showToast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(()=> t.classList.remove('show'), 2200);
  }

  function monthLabel(ymKey){
    const [y,m] = ymKey.split('-').map(Number);
    return new Date(y, m-1, 1).toLocaleString(undefined, { month:'long', year:'numeric' });
  }

  /* ---------- settings / theme ---------- */
  function applySettings(){
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--font-body', settings.font);
    document.documentElement.style.setProperty('--font-size-base', settings.fontSize + 'px');

    document.querySelectorAll('#themeSegment .seg-btn').forEach(b=>{
      b.classList.toggle('active', b.dataset.theme === settings.theme);
    });
    document.getElementById('fontSelect').value = settings.font;
    document.getElementById('fontSizeLabel').textContent = settings.fontSize + 'px';
  }

  function setTheme(theme){
    settings.theme = theme;
    persistSettings();
    applySettings();
    try{ RecallCharts.renderAll(topics); } catch(err){ /* chart lib unavailable */ }
  }

  /* ---------- navigation ---------- */
  function switchView(view){
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
    document.getElementById(`view-${view}`).classList.add('active-view');

    if (view === 'dashboard') renderDashboard();
    if (view === 'tasks') renderTopics();
    if (view === 'archive') renderArchive();
  }

  /* ============ DASHBOARD ============ */
  function renderStatRow(flat){
    const total = topics.length;
    const dueToday = flat.filter(cp => cp.display === 'Due Today').length;
    const backlog = flat.filter(cp => cp.display === 'Overdue' || cp.display === 'Due Today' || cp.display === 'Not Done').length;
    const eligible = flat.filter(cp => cp.status !== 'Ignored').length;
    const done = flat.filter(cp => cp.status === 'Done').length;
    const rate = eligible ? Math.round((done/eligible)*100) : 0;

    const cards = [
      { label:'Topics tracked', value: total, sub:`${flat.length} checkpoints total`, accent:'--violet' },
      { label:'Due today', value: dueToday, sub:'Not yet marked done', accent:'--amber' },
      { label:'Backlog', value: backlog, sub:'Excludes ignored items', accent:'--coral' },
      { label:'Completion rate', value: rate + '%', sub:`${done} of ${eligible} done`, accent:'--teal' },
    ];

    document.getElementById('statRow').innerHTML = cards.map(c => `
      <div class="stat-card" style="--stat-accent:var(${c.accent})">
        <div class="stat-label">${c.label}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-sub">${c.sub}</div>
      </div>`).join('');
  }

  function renderSchedulePreview(){
    document.getElementById('scheduleTrack').innerHTML = RecallData.SCHEDULE.map((s,i) => `
      ${i>0 ? '<div class="sched-line"></div>' : ''}
      <div class="sched-node">
        <div class="sched-dot"></div>
        <div class="sched-label">${s.label}</div>
      </div>`).join('');
  }

  function miniItemHTML(cp){
    return `
      <div class="mini-item">
        <div class="mi-main">
          <span class="mi-topic">${escapeHtml(cp.topic)}</span>
          <span class="mi-meta">${escapeHtml(cp.subject)} · ${cp.label} · ${cp.date}</span>
        </div>
        <span class="badge ${RecallData.badgeClass(cp.display)}">${cp.display}</span>
      </div>`;
  }

  function renderTodayAndBacklog(flat){
    const today = flat.filter(cp => cp.display === 'Due Today').sort((a,b)=>a.topic.localeCompare(b.topic));
    const backlog = flat.filter(cp => cp.display === 'Overdue').sort((a,b)=>a.date.localeCompare(b.date));

    document.getElementById('todayCount').textContent = `${today.length} item${today.length!==1?'s':''}`;
    document.getElementById('backlogCount').textContent = `${backlog.length} item${backlog.length!==1?'s':''}`;

    document.getElementById('todayList').innerHTML = today.length
      ? today.map(miniItemHTML).join('')
      : `<div class="empty-mini">Nothing due today. Clear skies.</div>`;

    document.getElementById('backlogList').innerHTML = backlog.length
      ? backlog.slice(0,25).map(miniItemHTML).join('')
      : `<div class="empty-mini">No overdue checkpoints.</div>`;
  }

  function renderDashboard(){
    const flat = RecallData.flatCheckpoints(topics);
    renderStatRow(flat);
    renderSchedulePreview();
    try{ RecallCharts.renderAll(topics); }
    catch(err){ console.error('Chart rendering failed (library may be blocked/offline):', err); }
    renderTodayAndBacklog(flat);
  }

  /* ============ TOPICS ============ */
  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function populateSubjectFilter(){
    const sel = document.getElementById('subjectFilter');
    const current = sel.value;
    const subjects = [...new Set(topics.map(t => t.subject))].sort();
    sel.innerHTML = `<option value="">All subjects</option>` + subjects.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    if (subjects.includes(current)) sel.value = current;
  }

  function topicCardHTML(t){
    const nodes = t.checkpoints.map((cp, idx) => {
      const display = RecallData.displayStatus(cp);
      const cls = display === 'Done' ? 'done' : display === 'Overdue' ? 'overdue' : display === 'Due Today' ? 'due' : display === 'Ignored' ? 'ignored' : '';
      const prevDone = idx > 0 && t.checkpoints[idx-1].status === 'Done';
      const dayNum = cp.label.replace('Day ','');
      return `
        <div class="node">
          ${idx > 0 ? `<div class="node-line ${prevDone ? 'filled' : ''}"></div>` : ''}
          <div class="node-circle ${cls}" title="${cp.label} · ${cp.date} · ${display}">${dayNum}</div>
          <select class="node-select" data-topic="${t.id}" data-key="${cp.key}" aria-label="${cp.label} status">
            <option value="Not Done" ${cp.status==='Not Done'?'selected':''}>Not Done</option>
            <option value="Done" ${cp.status==='Done'?'selected':''}>Done</option>
            <option value="Ignored" ${cp.status==='Ignored'?'selected':''}>Ignored</option>
          </select>
          <div class="node-label">${cp.label}</div>
          <div class="node-date">${cp.date}</div>
        </div>`;
    }).join('');

    return `
      <div class="topic-card" data-id="${t.id}">
        <div class="topic-card-head">
          <div>
            <div class="tc-name">${escapeHtml(t.topic)}</div>
            <div class="tc-subject">${escapeHtml(t.subject)}</div>
            <div class="tc-date">Learned ${t.dateLearned}</div>
          </div>
          <div class="tc-actions">
            <button class="icon-btn edit-btn" title="Edit" data-id="${t.id}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
            </button>
            <button class="icon-btn danger delete-btn" title="Delete" data-id="${t.id}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
        <div class="node-track">${nodes}</div>
      </div>`;
  }

  function renderTopics(){
    populateSubjectFilter();
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const subjectFilter = document.getElementById('subjectFilter').value;

    let list = topics.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    if (search) list = list.filter(t => t.topic.toLowerCase().includes(search) || t.subject.toLowerCase().includes(search));
    if (subjectFilter) list = list.filter(t => t.subject === subjectFilter);

    document.getElementById('topicList').innerHTML = list.map(topicCardHTML).join('');
    document.getElementById('emptyTopics').classList.toggle('hidden', topics.length > 0);
  }

  function openForm(editTopic){
    const card = document.getElementById('addFormCard');
    card.classList.remove('hidden');
    document.getElementById('formTitle').textContent = editTopic ? 'Edit topic' : 'New topic';
    document.getElementById('editId').value = editTopic ? editTopic.id : '';
    document.getElementById('topicInput').value = editTopic ? editTopic.topic : '';
    document.getElementById('subjectInput').value = editTopic ? editTopic.subject : '';
    document.getElementById('dateInput').value = editTopic ? editTopic.dateLearned : RecallData.todayStr();
    document.getElementById('topicInput').focus();
    card.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  function closeForm(){
    document.getElementById('addFormCard').classList.add('hidden');
    document.getElementById('topicForm').reset();
  }

  function handleTopicSubmit(e){
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const topic = document.getElementById('topicInput').value.trim();
    const subject = document.getElementById('subjectInput').value.trim();
    const dateLearned = document.getElementById('dateInput').value;
    if (!topic || !subject || !dateLearned) return;

    if (id){
      const t = topics.find(x => x.id === id);
      if (t){
        t.topic = topic; t.subject = subject; t.dateLearned = dateLearned;
        t.checkpoints.forEach(cp => {
          const sched = RecallData.SCHEDULE.find(s => s.key === cp.key);
          cp.date = RecallData.addDays(dateLearned, sched.offset);
        });
        showToast('Topic updated');
      }
    } else {
      topics.push(RecallData.createTopic(topic, subject, dateLearned));
      showToast('Topic added');
    }
    persistTopics();
    closeForm();
    renderTopics();
  }

  function handleTopicListClick(e){
    const editBtn = e.target.closest('.edit-btn');
    const delBtn = e.target.closest('.delete-btn');
    if (editBtn){
      const t = topics.find(x => x.id === editBtn.dataset.id);
      if (t) openForm(t);
    } else if (delBtn){
      const t = topics.find(x => x.id === delBtn.dataset.id);
      if (t && confirm(`Delete "${t.topic}"? This can't be undone.`)){
        topics = topics.filter(x => x.id !== t.id);
        persistTopics();
        renderTopics();
        showToast('Topic deleted');
      }
    }
  }

  function handleTopicListChange(e){
    if (!e.target.classList.contains('node-select')) return;
    const t = topics.find(x => x.id === e.target.dataset.topic);
    if (!t) return;
    const cp = t.checkpoints.find(c => c.key === e.target.dataset.key);
    if (!cp) return;
    cp.status = e.target.value;
    persistTopics();
    renderTopics();
  }

  /* ============ ARCHIVE ============ */
  function renderArchive(){
    const flat = RecallData.flatCheckpoints(topics);
    if (!flat.length){
      document.getElementById('yearTabs').innerHTML = '';
      document.getElementById('monthGroups').innerHTML = '';
      document.getElementById('emptyArchive').classList.remove('hidden');
      return;
    }
    document.getElementById('emptyArchive').classList.add('hidden');

    const years = [...new Set(flat.map(cp => cp.date.slice(0,4)))].sort().reverse();
    if (!archiveYear || !years.includes(archiveYear)) archiveYear = years[0];

    document.getElementById('yearTabs').innerHTML = years.map(y =>
      `<button class="year-tab ${y===archiveYear?'active':''}" data-year="${y}">${y}</button>`
    ).join('');

    const yearRows = flat.filter(cp => cp.date.slice(0,4) === archiveYear);
    const byMonth = {};
    yearRows.forEach(cp => {
      const key = cp.date.slice(0,7);
      (byMonth[key] = byMonth[key] || []).push(cp);
    });
    const monthKeys = Object.keys(byMonth).sort().reverse();

    document.getElementById('monthGroups').innerHTML = monthKeys.map((key, i) => {
      const rows = byMonth[key].sort((a,b)=>a.date.localeCompare(b.date));
      const rowsHtml = rows.map(r => `
        <tr>
          <td>${escapeHtml(r.topic)}</td>
          <td>${escapeHtml(r.subject)}</td>
          <td>${r.label}</td>
          <td>${r.date}</td>
          <td><span class="badge ${RecallData.badgeClass(r.display)}">${r.display}</span></td>
        </tr>`).join('');

      return `
        <div class="month-block ${i===0?'open':''}" data-month="${key}">
          <div class="month-header">
            <div class="month-title">
              <h3>${monthLabel(key)}</h3>
              <span class="month-count">${rows.length}</span>
            </div>
            <div class="month-toggle-actions">
              <button class="btn ghost export-month-btn" data-month="${key}" data-label="${monthLabel(key)}">Export .xlsx</button>
              <span class="chevron">▾</span>
            </div>
          </div>
          <div class="month-body">
            <div class="month-table-wrap">
              <table class="month-table">
                <thead><tr><th>Topic</th><th>Subject</th><th>Checkpoint</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function handleArchiveClick(e){
    const yearTab = e.target.closest('.year-tab');
    if (yearTab){
      archiveYear = yearTab.dataset.year;
      renderArchive();
      return;
    }
    const exportBtn = e.target.closest('.export-month-btn');
    if (exportBtn){
      e.stopPropagation();
      const key = exportBtn.dataset.month;
      const flat = RecallData.flatCheckpoints(topics).filter(cp => cp.date.startsWith(key));
      RecallExport.exportMonthToExcel(key, exportBtn.dataset.label, flat);
      showToast('Excel file exported');
      return;
    }
    const header = e.target.closest('.month-header');
    if (header){
      header.parentElement.classList.toggle('open');
    }
  }

  /* ============ SETTINGS ============ */
  function wireSettings(){
    document.getElementById('themeSegment').addEventListener('click', (e)=>{
      const btn = e.target.closest('.seg-btn');
      if (btn) setTheme(btn.dataset.theme);
    });
    document.getElementById('themeToggle').addEventListener('click', ()=>{
      setTheme(settings.theme === 'dark' ? 'light' : 'dark');
    });
    document.getElementById('fontSelect').addEventListener('change', (e)=>{
      settings.font = e.target.value;
      persistSettings(); applySettings();
    });
    document.getElementById('fontInc').addEventListener('click', ()=>{
      settings.fontSize = Math.min(20, settings.fontSize + 1);
      persistSettings(); applySettings();
    });
    document.getElementById('fontDec').addEventListener('click', ()=>{
      settings.fontSize = Math.max(13, settings.fontSize - 1);
      persistSettings(); applySettings();
    });
  }

  /* ============ EXPORT / IMPORT WIRES ============ */
  function wireExportImport(){
    const exportHandler = ()=> RecallExport.exportJSON(topics, settings);
    document.getElementById('exportJsonBtn').addEventListener('click', exportHandler);
    document.getElementById('exportJsonBtn2').addEventListener('click', exportHandler);

    async function importHandler(e){
      const file = e.target.files[0];
      if (!file) return;
      try{
        const parsed = await RecallExport.importJSON(file);
        const existingIds = new Set(topics.map(t=>t.id));
        let added = 0;
        parsed.topics.forEach(t => {
          if (!existingIds.has(t.id)){ topics.push(t); added++; }
        });
        persistTopics();
        if (parsed.settings){
          settings = { ...settings, ...parsed.settings };
          persistSettings(); applySettings();
        }
        renderDashboard(); renderTopics(); renderArchive();
        showToast(`Imported ${added} topic${added!==1?'s':''}`);
      }catch(err){
        showToast('Import failed: ' + err.message);
      }
      e.target.value = '';
    }
    document.getElementById('importJsonInput').addEventListener('change', importHandler);
    document.getElementById('importJsonInput2').addEventListener('change', importHandler);
  }

  /* ============ INIT ============ */
  function init(){
    applySettings();
    wireSettings();
    wireExportImport();

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    document.getElementById('addTopicBtn').addEventListener('click', () => openForm(null));
    document.getElementById('cancelFormBtn').addEventListener('click', closeForm);
    document.getElementById('topicForm').addEventListener('submit', handleTopicSubmit);
    document.getElementById('topicList').addEventListener('click', handleTopicListClick);
    document.getElementById('topicList').addEventListener('change', handleTopicListChange);
    document.getElementById('searchInput').addEventListener('input', renderTopics);
    document.getElementById('subjectFilter').addEventListener('change', renderTopics);

    document.getElementById('yearTabs').addEventListener('click', handleArchiveClick);
    document.getElementById('monthGroups').addEventListener('click', handleArchiveClick);

    document.getElementById('lockNowBtn').addEventListener('click', () => {
      window.RecallLock.showLock();
    });

    renderDashboard();
  }

  document.addEventListener('recall:unlocked', init, { once:true });
})();
