const $ = (s)=>document.querySelector(s);
const normalize = s => (s||"").toString().trim().toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s'-]/g, "").replace(/\s+/g, " ");
const toNormCompare = s => normalize(s).replace(/\s+/g, "");

// Local storage key base and season info
const BASE_LS_KEY = "pp_state_scoring_bonuswords_1_13_0";

// these get filled once the puzzle file has run
let CURRENT_SEASON = 1;
let NEXT_SEASON_URL = "";
let HAS_NEXT_SEASON = false;

// LS key will be updated in init()
let LS_KEY = BASE_LS_KEY + "_s1";

const COFFEE_URL = "https://buymeacoffee.com/pixelpeople"; // change to your real link

const State={current:0,solved:{},givenUp:{},hintsUsed:{},guessAttempts:{},total:0,score:0};
let puzzles=[];

const art=$('#art'), guess=$('#guess'), giveup=$('#giveup'), nextBtn=$('#next'), result=$('#result'),
      levelLabel=$('#levelLabel'), scoreLabel=$('#scoreLabel'), cellsWrap=$('#levelCells'), hintBtn=$('#hint');

const stage=$('#stage'), homeScreen=$('#homeScreen'), homeBtn=$('#homeBtn'),
      homePlay=$('#homePlay'), homeHowTo=$('#homeHowTo'), homeShare=$('#homeShare'),
      homeCoffee=$('#homeCoffee'), homeArt=$('#homeArt'), homeNum=$('#homePuzzleNum'),

      seasonSplash=$('#seasonSplash'), seasonNumber=$('#seasonNumber'),
      seasonSummary=$('#seasonSummary'), seasonPlayNext=$('#seasonPlayNext'),
      seasonHome=$('#seasonHome'), seasonHowTo=$('#seasonHowTo'),
      seasonShare=$('#seasonShare'), seasonCoffee=$('#seasonCoffee'),
      seasonArt=$('#seasonArt');

// Prevent saving or dragging puzzle image on mobile
['contextmenu','dragstart','gesturestart','selectstart'].forEach(evt=>{
  art.addEventListener(evt, e => e.preventDefault(), { passive:false });
});
art.addEventListener('touchstart', e => e.preventDefault(), { passive:false });

const artbox = document.getElementById('artbox');
['contextmenu','gesturestart'].forEach(evt=>{
  artbox.addEventListener(evt, e => e.preventDefault(), { passive:false });
});

// Also block context menu / drag on any images inside the stage and modal thumbs
const blockIfGameImage = (e) => {
  if (e.target.closest('#artbox, .thumb-grid')) e.preventDefault();
};
document.addEventListener('contextmenu', blockIfGameImage, { passive:false });
document.addEventListener('dragstart',  blockIfGameImage, { passive:false });
document.addEventListener('selectstart', blockIfGameImage, { passive:false });
document.addEventListener('gesturestart',blockIfGameImage, { passive:false });

const levelModal=$('#levelModal'), modalTitle=$('#modalTitle'),
      mTotal=$('#mTotal'), mCorrect=$('#mCorrect'),
      modalNext=$('#modalNext'), unlockNote=$('#unlockNote'),
      modalCloseX=$('#modalCloseX'), thumbGrid=$('#thumbGrid'),
      modalReset=$('#modalReset');

const confirmModal=$('#confirmModal'), confirmCloseX=$('#confirmCloseX'), confirmYes=$('#confirmYes');

const howToModal=$('#howToModal'), howToCloseX=$('#howToCloseX'), howToOk=$('#howToOk');

let resultTimer=null, resultHideTimer=null;

// Boot coordination flags
window.PP_DOM_READY = window.PP_DOM_READY || false;
window.PP_PUZZLES_READY = window.PP_PUZZLES_READY || false;

(function disableMobileKeyboard(){
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!isTouch) return;
  guess.readOnly = true;
  guess.setAttribute('inputmode','none');
  guess.addEventListener('focus', e => e.target.blur());
})();

// Levels: 9 puzzles per level
const PUZZLES_PER_LEVEL = 9;

function getLevel(i){ return Math.floor(i / PUZZLES_PER_LEVEL) + 1; }
function levelRange(level){
  const s = (level - 1) * PUZZLES_PER_LEVEL;
  const e = Math.min(level * PUZZLES_PER_LEVEL - 1, State.total - 1);
  return { start: s, end: e };
}
function levelComplete(level){
  const { start, end } = levelRange(level);
  for (let i = start; i <= end; i++) {
    if (!State.solved[i] && !State.givenUp[i]) return false;
  }
  return true;
}
function seasonIsComplete(){
  for (let i = 0; i < State.total; i++){
    if (!State.solved[i] && !State.givenUp[i]) return false;
  }
  return true;
}

function renderLevelCells(){
  const lvl=getLevel(State.current);
  const {start}=levelRange(lvl);
  const activeIndex=State.current-start;
  cellsWrap.innerHTML="";
  for(let i=0;i<PUZZLES_PER_LEVEL;i++){
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
  const globalOffset = window.PP_GLOBAL_OFFSET || 0;
  const globalPuzzleNum = State.current + 1 + globalOffset;

  // Top bar: [SVG ICON] 1-27
  levelLabel.innerHTML = `
    <span class="season-icon" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
        <path d="M256 144C256 117.5 277.5 96 304 96L336 96C362.5 96 384 117.5 384 144L384 496C384 522.5 362.5 544 336 544L304 544C277.5 544 256 522.5 256 496L256 144zM64 336C64 309.5 85.5 288 112 288L144 288C170.5 288 192 309.5 192 336L192 496C192 522.5 170.5 544 144 544L112 544C85.5 544 64 522.5 64 496L64 336zM496 160L528 160C554.5 160 576 181.5 576 208L576 496C576 522.5 554.5 544 528 544L496 544C469.5 544 448 522.5 448 496L448 208C448 181.5 469.5 160 496 160z"/>
      </svg>
    </span>
    <span class="season-code">${CURRENT_SEASON}-${globalPuzzleNum}</span>
  `;

  renderLevelCells();
  const finished = !!(State.solved[State.current] || State.givenUp[State.current]);
  hintBtn.disabled = finished;
  giveup.disabled = finished;

  // Update home preview bits
  homeNum.textContent = String(globalPuzzleNum);
  if (puzzles[State.current]) homeArt.src = puzzles[State.current].image;
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
  if(!puzzles || !Array.isArray(puzzles) || puzzles.length === 0){
    showResult("Puzzle data missing. Check puzzles file is loaded.", "bad");
    guess.disabled=true; giveup.disabled=true; hintBtn.disabled=true;
    return;
  }

  if(State.current>=puzzles.length){
    showResult("All levels complete.","good");
    guess.disabled=true; giveup.disabled=true; hintBtn.disabled=true;
    updateLevelLabels(); return;
  }
  const p=puzzles[State.current];
  art.src=p.image; guess.value=""; clearResult();
  const finished = !!(State.solved[State.current] || State.givenUp[State.current]);
  hintBtn.disabled = finished; giveup.disabled = finished;
  lockNext(!finished); guess.blur(); art.style.opacity = 1;

  // keep home preview in sync (global numbering)
  const globalOffset = window.PP_GLOBAL_OFFSET || 0;
  const globalPuzzleNum = State.current + 1 + globalOffset;
  homeArt.src = p.image;
  homeNum.textContent = String(globalPuzzleNum);

  updateLevelLabels();
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
    img.setAttribute('draggable','false');
    img.setAttribute('oncontextmenu','return false;');
    const cap = document.createElement('div'); cap.className = 'cap'; cap.textContent = locked ? "???" : puzzles[i].name;
    th.appendChild(img); th.appendChild(cap); thumbGrid.appendChild(th);
  }
}

// Scoring helpers
function normEq(a,b){ return toNormCompare(a) === toNormCompare(b); }
function matchAny(cands, g){
  if (!cands) return false;
  if (Array.isArray(cands)) return cands.some(c => normEq(c, g));
  if (typeof cands === "string") return normEq(cands, g);
  return false;
}
/** Returns one of: 'bonus' | 'name' | 'answer' | null */
function classifyGuess(p, guessStr){
  const g = guessStr || "";
  if (!g.trim()) return null;
  if (matchAny(p.bonus, g)) return "bonus";
  if (p.name && normEq(p.name, g)) return "name";
  if (Array.isArray(p.answers) && p.answers.some(c => normEq(c, g))) return "answer";
  return null;
}

function correctProgressForLevel(level){
  const { end } = levelRange(level);
  const total = Math.min(level * PUZZLES_PER_LEVEL, State.total);
  let correct = 0;
  for(let i=0; i<=end && i<State.total; i++){ if (State.solved[i]) correct++; }
  return { correct, total };
}

function openLevelModal(level,final=false){
  const { correct, total } = correctProgressForLevel(level);
  if (mCorrect) mCorrect.textContent = `${correct}/${total}`;
  mTotal.textContent = State.score;

  if (final) {
    modalTitle.textContent = "All Levels Complete";
  } else {
    const globalOffset = window.PP_GLOBAL_OFFSET || 0;
    const currentGlobal = globalOffset + State.current + 1;
    // Season X · Puzzle Y
    modalTitle.textContent = `Season ${CURRENT_SEASON} · Puzzle ${currentGlobal}`;
  }

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
      points = 4; // hint overrides all
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
    const lvl = getLevel(State.current);
    const final = State.current >= puzzles.length - 1;

    // If this is the final puzzle in the season and all puzzles are solved or given up
    if (final && seasonIsComplete()) {
      showSeasonSplash();
      return;
    }

    // Otherwise, the regular level summary modal
    openLevelModal(lvl, final);
    return;
  }

  const nextIndex = Math.min(State.current + 1, puzzles.length - 1);
  fadeTransitionTo(nextIndex);
  State.current = nextIndex; saveState();
}

// HOME AND SEASON SCREENS
function showHome(){
  // Hide season splash if visible
  if (seasonSplash) {
    seasonSplash.classList.remove('show');
    seasonSplash.setAttribute('aria-hidden','true');
  }

  homeScreen.classList.add('show');
  homeScreen.setAttribute('aria-hidden','false');
  stage.style.display = 'none';
  homeBtn.setAttribute('aria-expanded','true');
  if (puzzles[State.current]) {
    const globalOffset = window.PP_GLOBAL_OFFSET || 0;
    const globalPuzzleNum = State.current + 1 + globalOffset;
    homeArt.src = puzzles[State.current].image;
    homeNum.textContent = String(globalPuzzleNum);
  }
}
function showGame(){
  if (seasonSplash) {
    seasonSplash.classList.remove('show');
    seasonSplash.setAttribute('aria-hidden','true');
  }
  homeScreen.classList.remove('show');
  homeScreen.setAttribute('aria-hidden','true');
  stage.style.display = '';
  homeBtn.setAttribute('aria-expanded','false');
}

function showSeasonSplash(){
  // Hide game and home
  stage.style.display = 'none';
  homeScreen.classList.remove('show');
  homeScreen.setAttribute('aria-hidden', 'true');
  homeBtn.setAttribute('aria-expanded','false');

  if (seasonSplash) {
    seasonSplash.classList.add('show');
    seasonSplash.setAttribute('aria-hidden', 'false');
  }

  // Display season number and summary
  if (seasonNumber) seasonNumber.textContent = String(CURRENT_SEASON);
  if (seasonSummary) {
    const globalOffset = window.PP_GLOBAL_OFFSET || 0;
    const firstGlobal = globalOffset + 1;
    const lastGlobal = globalOffset + State.total;
    seasonSummary.textContent = `You've Finished Season ${CURRENT_SEASON}! Score: ${State.score.toFixed(0)}.`;
  }

  // Coffee link
  if (seasonCoffee) seasonCoffee.setAttribute('href', COFFEE_URL);

  // Button text and enabled state
  if (seasonPlayNext) {
    if (HAS_NEXT_SEASON) {
      seasonPlayNext.textContent = `Play Season ${CURRENT_SEASON + 1}`;
      seasonPlayNext.disabled = false;
    } else {
      seasonPlayNext.textContent = `Season ${CURRENT_SEASON + 1} Coming Soon`;
      seasonPlayNext.disabled = true;
    }
  }
}

// Home button now always goes Home
homeBtn.addEventListener('click', showHome);
homeBtn.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showHome(); }
});

// Play Now returns to game
homePlay.addEventListener('click', showGame);

// How To Play modal from Home
homeHowTo.addEventListener('click', ()=>{
  howToModal.classList.add('show');
  setTimeout(()=>{ howToOk.focus(); },0);
});
howToOk.addEventListener('click', ()=> howToModal.classList.remove('show'));
howToCloseX.addEventListener('click', ()=> howToModal.classList.remove('show'));

// Share from Home
homeShare.addEventListener('click', async ()=>{
  const url = window.location.href;
  try{
    if (navigator.share) {
      await navigator.share({ title: "Pixel People", text: "Play Pixel People", url });
      showResult("Shared successfully.","good");
    } else if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      showResult("Link copied to clipboard.","good");
    } else {
      const tmp=document.createElement('input');
      tmp.value=url; document.body.appendChild(tmp); tmp.select(); document.execCommand('copy'); document.body.removeChild(tmp);
      showResult("Link copied to clipboard.","good");
    }
  }catch{
    showResult("Share canceled.","bad");
  }
});

// Coffee link
homeCoffee.setAttribute('href', COFFEE_URL);

// Season complete splash actions
if (seasonHome) {
  seasonHome.addEventListener('click', ()=>{
    if (seasonSplash) {
      seasonSplash.classList.remove('show');
      seasonSplash.setAttribute('aria-hidden', 'true');
    }
    showHome();
  });
}
if (seasonHowTo) {
  seasonHowTo.addEventListener('click', ()=>{
    howToModal.classList.add('show');
    setTimeout(()=>{ howToOk.focus(); },0);
  });
}
if (seasonShare) {
  seasonShare.addEventListener('click', ()=>{
    // reuse same sharing logic
    homeShare.click();
  });
}
if (seasonPlayNext) {
  seasonPlayNext.addEventListener('click', ()=>{
    // use live values that init() filled in
    if (!HAS_NEXT_SEASON || !NEXT_SEASON_URL) return;
    window.location.href = NEXT_SEASON_URL;
  });
}

// Global key events
document.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&document.activeElement===guess){e.preventDefault();handleGuess();}
  else if(e.key==="Escape"){
    if (howToModal.classList.contains('show')) { howToModal.classList.remove('show'); return; }
    if (confirmModal.classList.contains('show')) { confirmModal.classList.remove('show'); return; }
    if (levelModal.classList.contains('show')) { levelModal.classList.remove('show'); levelLabel.setAttribute('aria-expanded','false'); return; }
    if (seasonSplash && seasonSplash.classList.contains('show')) {
      seasonSplash.classList.remove('show');
      seasonSplash.setAttribute('aria-hidden','true');
      showHome();
      return;
    }
    guess.blur();
  }
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
  const lvl=getLevel(State.current);
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

function resetAllProgressAndGoToSeason1(){
  // remove all season save slots for this game
  try{
    const keys = [];
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.indexOf(BASE_LS_KEY) === 0) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }catch{}
  // hard jump back to Season 1 entry page
  window.location.href = "index.html";
}

modalReset.addEventListener("click", ()=>{
  if (!confirm('Reset all progress and return to Season 1?')) return;
  resetAllProgressAndGoToSeason1();
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

// State helpers
function loadState(){try{const raw=localStorage.getItem(LS_KEY);if(!raw)return;Object.assign(State,JSON.parse(raw));}catch{}}
function saveState(){try{localStorage.setItem(LS_KEY,JSON.stringify(State));}catch{}}
function resetState(){try{localStorage.removeItem(LS_KEY);}catch{} Object.assign(State,{current:0,solved:{},givenUp:{},hintsUsed:{},guessAttempts:{},score:0}); saveState();}

// Main init
function init(){
  // read season info from puzzle file (set at bottom of puzzles-1.js / puzzles-2.js)
  CURRENT_SEASON = (typeof window !== "undefined" && window.PP_SEASON) ? window.PP_SEASON : 1;
  NEXT_SEASON_URL = (typeof window !== "undefined" && window.PP_NEXT_SEASON_URL) ? window.PP_NEXT_SEASON_URL : "";
  HAS_NEXT_SEASON = !!NEXT_SEASON_URL;

  // update LS key now that we know the season
  LS_KEY = BASE_LS_KEY + "_s" + CURRENT_SEASON;

  // now it is safe to load / restore state
  loadState();

  puzzles = window.LIVE_PUZZLES || [];
  if(!Array.isArray(puzzles) || puzzles.length===0){
    showResult("Puzzle data missing. Check puzzles file is loaded.", "bad");
  }
  State.total = puzzles.length;
  if(State.current >= puzzles.length) State.current = 0;

  renderPuzzle();
  updateLevelLabels();

  // Start on Home screen
  showHome();

  // If this season is already complete, show the season splash
  if (seasonIsComplete() && puzzles.length > 0) {
    showSeasonSplash();
  }
}

// Bootstrap that waits for both DOM and puzzles
function bootstrapPixelPeople(){
  if (!window.PP_DOM_READY || !window.PP_PUZZLES_READY) return;
  // Avoid double init
  if (bootstrapPixelPeople._done) return;
  bootstrapPixelPeople._done = true;
  init();
}
window.PP_BOOTSTRAP = bootstrapPixelPeople;

// DOM ready hook
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.PP_DOM_READY = true;
    if (window.PP_BOOTSTRAP) window.PP_BOOTSTRAP();
  });
} else {
  window.PP_DOM_READY = true;
  if (window.PP_BOOTSTRAP) window.PP_BOOTSTRAP();
}