const $ = (s)=>document.querySelector(s);
const normalize = s => (s||"").toString().trim().toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s'-]/g, "").replace(/\s+/g, " ");
const toNormCompare = s => normalize(s).replace(/\s+/g, "");

// bump LS key since scoring rules changed
const LS_KEY="pp_state_scoring_bonuswords_1_13_0";

const State={current:0,solved:{},givenUp:{},hintsUsed:{},guessAttempts:{},total:0,score:0};
let puzzles=[];

const art=$('#art'), guess=$('#guess'), giveup=$('#giveup'), nextBtn=$('#next'), result=$('#result'),
      levelLabel=$('#levelLabel'), scoreLabel=$('#scoreLabel'), cellsWrap=$('#levelCells'), hintBtn=$('#hint');

const levelModal=$('#levelModal'), modalTitle=$('#modalTitle'),
      mTotal=$('#mTotal'), mCorrect=$('#mCorrect'),
      modalNext=$('#modalNext'), unlockNote=$('#unlockNote'),
      modalCloseX=$('#modalCloseX'), thumbGrid=$('#thumbGrid'),
      modalReset=$('#modalReset');

const confirmModal=$('#confirmModal'), confirmCloseX=$('#confirmCloseX'), confirmYes=$('#confirmYes');

let resultTimer=null, resultHideTimer=null;

(function disableMobileKeyboard(){
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!isTouch) return;
  guess.readOnly = true;
  guess.setAttribute('inputmode','none');
  guess.addEventListener('focus', e => e.target.blur());
})();

function loadState(){try{const raw=localStorage.getItem(LS_KEY);if(!raw)return;Object.assign(State,JSON.parse(raw));}catch{}}
function saveState(){try{localStorage.setItem(LS_KEY,JSON.stringify(State));}catch{}}
function resetState(){try{localStorage.removeItem(LS_KEY);}catch{} Object.assign(State,{current:0,solved:{},givenUp:{},hintsUsed:{},guessAttempts:{},score:0}); saveState();}

function getLevel(i){return Math.floor(i/10)+1;}
function levelRange(level){const s=(level-1)*10;return{start:s,end:Math.min(level*10-1,State.total-1)};}
function levelComplete(level){const {start,end}=levelRange(level);for(let i=start;i<=end;i++){if(!State.solved[i]&&!State.givenUp[i])return false;}return true;}

function renderLevelCells(){
  const lvl=getLevel(State.current);
  const {start}=levelRange(lvl);
  const activeIndex=State.current-start;
  cellsWrap.innerHTML="";
  for(let i=0;i<10;i++){
    const idx=start+i;
    const div=document.createElement('div');
    div.className='cell';
    if(idx<State.total){
      if(State.solved[idx]) div.classList.add('ok');
      else if(State.givenUp[idx]) div.classList.add('bad');
    }else{
      div.style.opacity=.3;
    }
    if(i===activeIndex) div.classList.add('active');
    cellsWrap.appendChild(div);
  }
}

function updateLevelLabels(){
  const cur=getLevel(State.current);
  levelLabel.textContent=`Level ${cur}`;
  scoreLabel.textContent=State.score.toFixed(0);
  renderLevelCells();
  const finished = !!(State.solved[State.current] || State.givenUp[State.current]);
  hintBtn.disabled = finished;
  giveup.disabled = finished;
}

function showResult(t,c){
  if(resultTimer){ clearTimeout(resultTimer); resultTimer=null; }
  if(resultHideTimer){ clearTimeout(resultHideTimer); resultHideTimer=null; }
  result.textContent=t;
  result.className="result show "+(c||"");
  result.style.opacity = 1;
  resultTimer = setTimeout(()=>{
    result.classList.add('fading');
    resultHideTimer = setTimeout(()=>{ clearResult(); }, 420);
  }, 10000);
}
function clearResult(){
  if(resultTimer){ clearTimeout(resultTimer); resultTimer=null; }
  if(resultHideTimer){ clearTimeout(resultHideTimer); resultHideTimer=null; }
  result.textContent=""; result.className="result"; result.style.opacity="";
}

function lockNext(x){ nextBtn.disabled=x; nextBtn.classList.toggle("active", !x); }

function renderPuzzle(){
  if(State.current>=puzzles.length){
    showResult("All levels complete.","good");
    guess.disabled=true; giveup.disabled=true; hintBtn.disabled=true;
    updateLevelLabels(); return;
  }
  const p=puzzles[State.current];
  art.src=p.image; guess.value=""; clearResult();
  const finished = !!(State.solved[State.current] || State.givenUp[State.current]);
  hintBtn.disabled = finished; giveup.disabled = finished;
  lockNext(!finished); updateLevelLabels(); guess.blur(); art.style.opacity = 1;
}

function fadeTransitionTo(nextIndex){
  const nextP = puzzles[nextIndex]; if(!nextP) return;
  const img = new Image();
  img.onload = () => {
    art.style.opacity = 0;
    setTimeout(() => {
      art.src = nextP.image; guess.value = ""; clearResult();
      const finished = !!(State.solved[nextIndex] || State.givenUp[nextIndex]);
      hintBtn.disabled = finished; giveup.disabled = finished;
      lockNext(!finished); updateLevelLabels();
      requestAnimationFrame(() => { art.style.opacity = 1; });
    }, 200);
  };
  img.src = nextP.image;
}

function buildThumbGrid(level){
  const {start,end}=levelRange(level);
  thumbGrid.innerHTML = "";
  for(let i=start;i<=end && i<State.total;i++){
    const solved = !!State.solved[i];
    const failed = !!State.givenUp[i];
    const locked = !solved && !failed;

    const th = document.createElement('div');
    th.className = 'thumb' + (solved ? ' ok' : (failed ? ' bad' : '')) + (locked ? ' locked' : '');
    const img = document.createElement('img'); img.src = puzzles[i].image; img.alt = puzzles[i].name || `Puzzle ${i+1}`;
    const cap = document.createElement('div'); cap.className = 'cap'; cap.textContent = locked ? "???" : puzzles[i].name;
    th.appendChild(img); th.appendChild(cap); thumbGrid.appendChild(th);
  }
}

// ----- Scoring helpers -----
function normEq(a,b){ return toNormCompare(a) === toNormCompare(b); }
function matchAny(cands, g){
  if (!cands) return false;
  if (Array.isArray(cands)) return cands.some(c => normEq(c, g));
  if (typeof cands === "string") return normEq(cands, g);
  return false;
}

/**
 * Returns one of: 'bonus' | 'name' | 'answer' | null
 */
function classifyGuess(p, guessStr){
  const g = guessStr || "";
  if (!g.trim()) return null;
  // bonus first (highest value)
  if (matchAny(p.bonus, g)) return "bonus";
  // primary name
  if (p.name && normEq(p.name, g)) return "name";
  // alt answers
  if (Array.isArray(p.answers) && p.answers.some(c => normEq(c, g))) return "answer";
  return null;
}
// ----------------------------

function correctProgressForLevel(level){
  const { end } = levelRange(level);
  const total = Math.min(level * 10, State.total);
  let correct = 0;
  for(let i=0; i<=end && i<State.total; i++){ if (State.solved[i]) correct++; }
  return { correct, total };
}

function openLevelModal(level,final=false){
  const { correct, total } = correctProgressForLevel(level);
  if (mCorrect) mCorrect.textContent = `${correct}/${total}`;
  mTotal.textContent = State.score;
  modalTitle.textContent = final ? "All Levels Complete" : `Level ${level}`;
  const complete=levelComplete(level);
  unlockNote.style.display=!final&&!complete?"block":"none";
  modalNext.textContent=final?"Play Again":"Start Next Level";
  modalNext.disabled=!final&&!complete;
  buildThumbGrid(level);
  levelLabel.setAttribute('aria-expanded','true');
  levelModal.classList.add('show');
  setTimeout(()=>{(!modalNext.disabled?modalNext:modalCloseX).focus();},0);
}

function handleGuess(){
  const idx=State.current, p=puzzles[idx], val=guess.value;
  if(!val.trim()) return;
  if(State.solved[idx]||State.givenUp[idx]) return;

  const kind = classifyGuess(p, val);

  if(kind){
    State.solved[idx]=true;

    // score rules
    let points = 0;
    if (State.hintsUsed[idx]) {
      points = 3; // hint overrides all
    } else if (kind === "bonus") {
      points = 20;
    } else if (kind === "answer") {
      points = 8;
    } else if (kind === "name") {
      points = 10;
    }
    State.score += points;
    saveState();

    // feedback copy
    if (kind === "bonus" && !State.hintsUsed[idx]) {
      showResult(`Bonus found. ${p.name} (+${points})`,"good");
    } else if (kind === "answer" && !State.hintsUsed[idx]) {
      showResult(`Accepted. ${p.name} (+${points})`,"good");
    } else if (kind === "name" && !State.hintsUsed[idx]) {
      showResult(`Correct. ${p.name} (+${points})`,"good");
    } else {
      showResult(`Correct with hint. ${p.name} (+${points})`,"good");
    }

    hintBtn.disabled = true; giveup.disabled = true; lockNext(false);
    updateLevelLabels();
  }else{
    State.guessAttempts[idx] = (State.guessAttempts[idx] || 0) + 1;
    saveState();
    if (State.guessAttempts[idx] >= 3) {
      State.givenUp[idx] = true;
      delete State.solved[idx];
      showResult(`Answer: ${p.name}`, "revealed");
      hintBtn.disabled = true; giveup.disabled = true; lockNext(false);
      saveState(); updateLevelLabels();
    } else {
      showResult(`Not quite. Try again (${State.guessAttempts[idx]}/3).`, "bad");
      guess.value = "";
    }
  }
}

function handleGiveUp(){
  const idx=State.current;
  if(State.solved[idx]||State.givenUp[idx]) return;
  State.givenUp[idx]=true; saveState();
  showResult(`Answer: ${puzzles[idx].name}`,"revealed");
  hintBtn.disabled = true; giveup.disabled = true; lockNext(false);
  updateLevelLabels();
}

function atEndOfLevel(i){const lvl=getLevel(i),{end}=levelRange(lvl);return i===end;}
function handleNext(){
  if(nextBtn.disabled) { showResult("Solve to continue.","revealed"); return; }
  if(atEndOfLevel(State.current)){
    const lvl=getLevel(State.current);
    const final=State.current>=puzzles.length-1;
    openLevelModal(lvl,final); return;
  }
  const nextIndex = Math.min(State.current+1, puzzles.length-1);
  fadeTransitionTo(nextIndex);
  State.current = nextIndex; saveState();
}

// Events
document.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&document.activeElement===guess){e.preventDefault();handleGuess();}
  else if(e.key==="Escape"){guess.blur();}
  else if((e.key==="n"||e.key==="N")&&!nextBtn.disabled){handleNext();}
  if((document.activeElement===levelLabel) && (e.key==="Enter" || e.key===" ")){
    e.preventDefault();
    openLevelModal(getLevel(State.current), State.current>=puzzles.length-1 && levelComplete(getLevel(State.current)));
  }
});

giveup.addEventListener("click", ()=>{
  if(giveup.disabled) return;
  if(State.solved[State.current] || State.givenUp[State.current]) return;
  levelLabel.setAttribute('aria-expanded','false');
  confirmModal.classList.add('show');
  setTimeout(()=>{ confirmYes.focus(); },0);
});
confirmCloseX.addEventListener("click", ()=>{ confirmModal.classList.remove('show'); });
confirmYes.addEventListener("click", ()=>{ confirmModal.classList.remove('show'); handleGiveUp(); });

nextBtn.addEventListener("click",handleNext);
hintBtn.addEventListener("click", ()=>{
  const idx=State.current, p=puzzles[idx]; if(!p) return;
  if(State.solved[idx]||State.givenUp[idx]) return;
  State.hintsUsed[idx]=true; saveState();
  const text=p.hint&&p.hint.trim()?p.hint:`Starts with "${(p.name||"").trim().charAt(0)}"`;
  showResult(`Hint: ${text}`,"revealed");
});

levelLabel.addEventListener("click", ()=>{
  openLevelModal(getLevel(State.current), State.current>=puzzles.length-1 && levelComplete(getLevel(State.current)));
});
modalCloseX.addEventListener("click", () => { levelModal.classList.remove('show'); levelLabel.setAttribute('aria-expanded','false'); });
modalNext.addEventListener("click", ()=>{
  if(modalNext.disabled) return;
  const lvl=Math.floor(State.current/10)+1;
  const final=modalTitle.textContent.includes("All Levels Complete");
  levelModal.classList.remove('show');
  levelLabel.setAttribute('aria-expanded','false');
  if(final){
    State.current=0;
    State.solved={}; State.givenUp={}; State.hintsUsed={}; State.guessAttempts={};
    State.score=0; renderPuzzle();
  }else{
    const { end } = levelRange(lvl);
    const nextIndex = Math.min(end+1, puzzles.length-1);
    fadeTransitionTo(nextIndex);
    State.current = nextIndex; saveState();
  }
});

modalReset.addEventListener("click", ()=>{
  if(!confirm('Reset all progress for this game?')) return;
  resetState();
  levelModal.classList.remove('show');
  levelLabel.setAttribute('aria-expanded','false');
  puzzles = window.LIVE_PUZZLES || [];
  State.total = puzzles.length;
  renderPuzzle(); updateLevelLabels();
  showResult('Progress reset.','revealed');
});

// Build keyboard
const KB_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["-","Z","X","C","V","B","N","M",".","'"],
  ["Enter","Space","Delete"],
];
function addKey(rowEl,label,extraClass="",displayHTML=null){
  const b=document.createElement("button");
  b.className="kb-key"+(extraClass?(" "+extraClass):"");
  if(displayHTML){ b.innerHTML = displayHTML; } else { b.textContent = label; }
  b.addEventListener("click",()=>pressKey(label));
  rowEl.appendChild(b);
}
function pressKey(label){
  if(!puzzles.length) return;
  switch(label){
    case "Delete": guess.value = guess.value.slice(0, -1); break;
    case "Enter":  handleGuess(); break;
    case "Space":  guess.value += " "; break;
    case "'":      guess.value += "'"; break;
    case "-":      guess.value += "-"; break;
    case ".":      guess.value += "."; break;
    default:       guess.value += label.toLowerCase();
  }
  guess.blur();
}
(function buildKeyboard(){
  const r1=$("#kb-r1"), r2=$("#kb-r2"), r3=$("#kb-r3"), r4=$("#kb-r4");
  KB_ROWS[0].forEach(k=>addKey(r1,k));
  KB_ROWS[1].forEach(k=>addKey(r2,k));
  KB_ROWS[2].forEach(k=>addKey(r3,k));
  addKey(r4,"Enter","enter");
  addKey(r4,"Space","space","&nbsp;Space&nbsp;");
  addKey(r4,"Delete","delete");
})();

// Init
function init(){
  loadState();
  puzzles = window.LIVE_PUZZLES || [];
  if(!Array.isArray(puzzles) || puzzles.length===0){
    showResult("Puzzle data missing. Check puzzles.js is loaded.", "bad");
  }
  State.total = puzzles.length;
  if(State.current >= puzzles.length) State.current = 0;
  renderPuzzle();
  updateLevelLabels();
}
// Ensure puzzles.js (defer) has run first
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}