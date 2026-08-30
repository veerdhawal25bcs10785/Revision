/* ============ DATA MODEL ============ */
const RecallData = (function(){
  const TOPICS_KEY = 'recall_topics_v1';
  const SETTINGS_KEY = 'recall_settings_v1';

  const SCHEDULE = [
    { key:'d1',  label:'Day 1',  offset:1  },
    { key:'d3',  label:'Day 3',  offset:3  },
    { key:'d7',  label:'Day 7',  offset:7  },
    { key:'d16', label:'Day 16', offset:16 },
    { key:'d35', label:'Day 35', offset:35 },
  ];

  const DEFAULT_SETTINGS = { theme:'dark', font:'Inter', fontSize:16 };

  function todayStr(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function addDays(dateStr, days){
    const [y,m,d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    dt.setDate(dt.getDate() + days);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }

  function uid(){
    return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  }

  function loadTopics(){
    try{
      const raw = localStorage.getItem(TOPICS_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ console.error('Failed to load topics', e); return []; }
  }

  function saveTopics(topics){
    localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
  }

  function loadSettings(){
    try{
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    }catch(e){ return { ...DEFAULT_SETTINGS }; }
  }

  function saveSettings(settings){
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function createTopic(topic, subject, dateLearned){
    return {
      id: uid(),
      topic, subject, dateLearned,
      checkpoints: SCHEDULE.map(s => ({
        key: s.key,
        label: s.label,
        date: addDays(dateLearned, s.offset),
        status: 'Not Done' // 'Not Done' | 'Done' | 'Ignored'
      })),
      createdAt: new Date().toISOString()
    };
  }

  // Manual status -> display status (adds computed Overdue / Due Today)
  function displayStatus(checkpoint){
    if (checkpoint.status === 'Done') return 'Done';
    if (checkpoint.status === 'Ignored') return 'Ignored';
    const today = todayStr();
    if (checkpoint.date < today) return 'Overdue';
    if (checkpoint.date === today) return 'Due Today';
    return 'Not Done';
  }

  function badgeClass(display){
    switch(display){
      case 'Done': return 'badge-done';
      case 'Overdue': return 'badge-overdue';
      case 'Due Today': return 'badge-due';
      case 'Ignored': return 'badge-ignored';
      default: return 'badge-notdone';
    }
  }

  // Flatten every checkpoint across every topic into one list, with topic context attached.
  function flatCheckpoints(topics){
    const out = [];
    topics.forEach(t => {
      t.checkpoints.forEach(cp => {
        out.push({
          topicId: t.id, topic: t.topic, subject: t.subject,
          dateLearned: t.dateLearned,
          key: cp.key, label: cp.label, date: cp.date, status: cp.status,
          display: displayStatus(cp)
        });
      });
    });
    return out;
  }

  return {
    SCHEDULE, DEFAULT_SETTINGS,
    todayStr, addDays, uid,
    loadTopics, saveTopics, loadSettings, saveSettings,
    createTopic, displayStatus, badgeClass, flatCheckpoints
  };
})();
