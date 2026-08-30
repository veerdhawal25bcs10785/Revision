/* ============ CHARTS ============ */
const RecallCharts = (function(){
  let statusChart, monthlyChart, subjectChart;

  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function commonColors(){
    return {
      text: cssVar('--text-dim'),
      grid: cssVar('--border'),
      teal: cssVar('--teal'),
      amber: cssVar('--amber'),
      coral: cssVar('--coral'),
      slate: cssVar('--slate'),
      violet: cssVar('--violet'),
    };
  }

  function renderStatusChart(flat){
    const el = document.getElementById('chartStatus');
    if (!el) return;
    const c = commonColors();
    const counts = { 'Done':0, 'Overdue':0, 'Due Today':0, 'Not Done':0, 'Ignored':0 };
    flat.forEach(cp => counts[cp.display] = (counts[cp.display]||0) + 1);

    if (statusChart) statusChart.destroy();
    statusChart = new Chart(el, {
      type:'doughnut',
      data:{
        labels:Object.keys(counts),
        datasets:[{
          data:Object.values(counts),
          backgroundColor:[c.teal, c.coral, c.amber, c.slate, cssVar('--surface-2')],
          borderColor: cssVar('--surface'),
          borderWidth:3,
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        cutout:'62%',
        plugins:{
          legend:{ position:'bottom', labels:{ color:c.text, font:{ family:"Inter", size:11 }, boxWidth:10, padding:14 } }
        }
      }
    });
  }

  function lastNMonths(n){
    const out = [];
    const d = new Date();
    d.setDate(1);
    for (let i=n-1; i>=0; i--){
      const dt = new Date(d.getFullYear(), d.getMonth()-i, 1);
      out.push({ key:`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`, label:dt.toLocaleString(undefined,{month:'short'}) });
    }
    return out;
  }

  function renderMonthlyChart(flat){
    const el = document.getElementById('chartMonthly');
    if (!el) return;
    const c = commonColors();
    const months = lastNMonths(6);
    const counts = months.map(m => flat.filter(cp => cp.status === 'Done' && cp.date.startsWith(m.key)).length);

    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(el, {
      type:'bar',
      data:{
        labels: months.map(m=>m.label),
        datasets:[{
          label:'Completed',
          data: counts,
          backgroundColor: c.violet,
          borderRadius:6,
          maxBarThickness:34,
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false } },
        scales:{
          x:{ ticks:{ color:c.text, font:{family:'JetBrains Mono', size:11} }, grid:{ display:false } },
          y:{ beginAtZero:true, ticks:{ color:c.text, precision:0 }, grid:{ color:c.grid } }
        }
      }
    });
  }

  function renderSubjectChart(topics){
    const el = document.getElementById('chartSubject');
    if (!el) return;
    const c = commonColors();
    const bySubject = {};
    topics.forEach(t => { bySubject[t.subject] = (bySubject[t.subject]||0) + t.checkpoints.length; });
    const labels = Object.keys(bySubject);
    const data = Object.values(bySubject);

    if (subjectChart) subjectChart.destroy();
    subjectChart = new Chart(el, {
      type:'bar',
      data:{
        labels,
        datasets:[{
          data,
          backgroundColor: c.teal,
          borderRadius:6,
          maxBarThickness:28,
        }]
      },
      options:{
        indexAxis:'y',
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false } },
        scales:{
          x:{ beginAtZero:true, ticks:{ color:c.text, precision:0 }, grid:{ color:c.grid } },
          y:{ ticks:{ color:c.text, font:{size:11} }, grid:{ display:false } }
        }
      }
    });
  }

  function renderHeatmap(flat){
    const el = document.getElementById('heatmap');
    if (!el) return;
    el.innerHTML = '';
    const days = 84; // 12 weeks
    const today = new Date();
    const counts = {};
    flat.forEach(cp => {
      if (cp.status === 'Done') counts[cp.date] = (counts[cp.date]||0) + 1;
    });

    const cells = [];
    for (let i = days - 1; i >= 0; i--){
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      cells.push({ key, count: counts[key] || 0 });
    }

    const max = Math.max(1, ...cells.map(c=>c.count));
    cells.forEach(c => {
      const div = document.createElement('div');
      div.className = 'hm-cell';
      div.title = `${c.key}: ${c.count} completed`;
      if (c.count > 0){
        const ratio = c.count / max;
        div.style.background = `color-mix(in srgb, var(--teal) ${20 + ratio*70}%, var(--surface-2))`;
      }
      el.appendChild(div);
    });
  }

  function renderAll(topics){
    const flat = RecallData.flatCheckpoints(topics);
    renderStatusChart(flat);
    renderMonthlyChart(flat);
    renderSubjectChart(topics);
    renderHeatmap(flat);
  }

  return { renderAll };
})();
