/* ============ EXPORT / IMPORT ============ */
const RecallExport = (function(){

  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 1000);
  }

  function exportMonthToExcel(yearMonthKey, monthLabel, rows){
    const data = rows.map(r => ({
      Topic: r.topic,
      Subject: r.subject,
      Checkpoint: r.label,
      'Revision Date': r.date,
      Status: r.display,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{wch:26},{wch:18},{wch:12},{wch:14},{wch:12}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, monthLabel.replace(/[\\/*?:[\]]/g,''));
    XLSX.writeFile(wb, `recall_${yearMonthKey}.xlsx`);
  }

  function exportAllToExcel(topics){
    const flat = RecallData.flatCheckpoints(topics);
    const data = flat.map(r => ({
      Topic: r.topic, Subject: r.subject, Checkpoint: r.label,
      'Date Learned': r.dateLearned, 'Revision Date': r.date, Status: r.display,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{wch:26},{wch:18},{wch:12},{wch:14},{wch:14},{wch:12}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All checkpoints');
    XLSX.writeFile(wb, `recall_all.xlsx`);
  }

  function exportJSON(topics, settings){
    const payload = { version:1, exportedAt:new Date().toISOString(), topics, settings };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    downloadBlob(blob, `recall_backup_${RecallData.todayStr()}.json`);
  }

  function importJSON(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = (e) => {
        try{
          const parsed = JSON.parse(e.target.result);
          if (!parsed || !Array.isArray(parsed.topics)) throw new Error('Not a Recall backup file.');
          resolve(parsed);
        }catch(err){ reject(err); }
      };
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsText(file);
    });
  }

  return { exportMonthToExcel, exportAllToExcel, exportJSON, importJSON };
})();
