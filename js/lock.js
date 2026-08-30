/* ============ LOCK / PASSKEY ============
   One-time passkey, hashed with SHA-256 and kept in localStorage.
   No "forgot passkey" flow, no in-app data wipe.
   The app re-locks on every full page load/refresh by design.
*/
(function(){
  const PW_KEY = 'recall_pwhash_v1';

  const lockScreen = document.getElementById('lockScreen');
  const appShell    = document.getElementById('appShell');
  const lockTitle   = document.getElementById('lockTitle');
  const lockSub     = document.getElementById('lockSub');
  const lockForm    = document.getElementById('lockForm');
  const pwInput     = document.getElementById('pwInput');
  const pwConfirm   = document.getElementById('pwConfirm');
  const lockBtn     = document.getElementById('lockBtn');
  const lockError   = document.getElementById('lockError');
  const lockCard    = document.querySelector('.lock-card');

  async function sha256(text){
    const enc = new TextEncoder().encode('recall::' + text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function hasPasskey(){ return !!localStorage.getItem(PW_KEY); }

  function renderMode(){
    if (hasPasskey()){
      lockTitle.textContent = 'Enter your passkey';
      lockSub.textContent = 'This browser has a saved tracker. Unlock it to continue.';
      pwConfirm.classList.add('hidden');
      lockBtn.textContent = 'Unlock';
      pwInput.placeholder = 'Passkey';
    } else {
      lockTitle.textContent = 'Set your passkey';
      lockSub.textContent = "This locks the tracker on this device. There's no recovery — write it down somewhere safe.";
      pwConfirm.classList.remove('hidden');
      lockBtn.textContent = 'Set passkey & enter';
      pwInput.placeholder = 'Passkey';
    }
    lockError.textContent = '';
    pwInput.value = '';
    pwConfirm.value = '';
  }

  function showLock(){
    renderMode();
    lockScreen.classList.remove('hidden');
    appShell.classList.add('hidden');
    setTimeout(()=> pwInput.focus(), 50);
  }

  function unlock(){
    lockScreen.classList.add('hidden');
    appShell.classList.remove('hidden');
    document.dispatchEvent(new CustomEvent('recall:unlocked'));
  }

  function shakeError(msg){
    lockError.textContent = msg;
    lockCard.classList.remove('shake');
    void lockCard.offsetWidth;
    lockCard.classList.add('shake');
  }

  lockForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const val = pwInput.value;
    if (!val || val.length < 3){
      shakeError('Passkey must be at least 3 characters.');
      return;
    }

    if (hasPasskey()){
      const hash = await sha256(val);
      if (hash === localStorage.getItem(PW_KEY)){
        unlock();
      } else {
        shakeError('Incorrect passkey.');
      }
    } else {
      if (val !== pwConfirm.value){
        shakeError("Passkeys don't match.");
        return;
      }
      const hash = await sha256(val);
      localStorage.setItem(PW_KEY, hash);
      unlock();
    }
  });

  document.addEventListener('DOMContentLoaded', showLock);

  // exposed so the "Lock now" button in the app can re-trigger the screen
  window.RecallLock = { showLock };
})();
