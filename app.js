/* ==========================================================
   여행 플래너 — 앱 로직
   저장: localStorage(일정/서류) + IndexedDB(첨부 파일)
   ========================================================== */
'use strict';

const KEY = 'trip-plan-v1';
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

/* ---------- 상태 ---------- */
let trip = null;      // 여행 데이터
let dayIdx = 0;       // 선택된 일자
let tab = 'overview'; // overview | schedule | docs | more
let map = null, layer = null, mapReady = false;
let showFoodPins = true;

const TYPES = {
  '명소': { e:'📍', c:'var(--accent)' },
  '식당': { e:'🍽️', c:'var(--hot)' },
  '이동': { e:'🚆', c:'#3b82f6' },
  '숙소': { e:'🏨', c:'var(--gold)' },
  '쇼핑': { e:'🛍️', c:'#0ea5e9' },
  '휴식': { e:'🌿', c:'#14b8a6' },
  '기타': { e:'✨', c:'var(--text2)' }
};
const FOOD_KINDS = { '맛집':'🍽️', '카페':'☕', '디저트':'🍰', '바':'🍷', '시장':'🧺', '기타':'✨' };
const DOC_TYPES = {
  '항공권':'✈️', '기차표':'🚄', '입장권':'🎟️', '숙소':'🏨',
  '보험':'🛡️', '렌터카':'🚗', '식당예약':'🍽️', '기타':'📄'
};
const DOW = ['일','월','화','수','목','금','토'];

/* ==========================================================
   저장 / 불러오기
   ========================================================== */
let firstRun = false;

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if (raw){ trip = JSON.parse(raw); }
  }catch(e){ console.warn('저장 데이터 로드 실패', e); }
  if (!trip || !Array.isArray(trip.days) || !trip.days.length){
    /* 처음 여는 경우 — 샘플이 아니라 오늘부터 3일짜리 빈 여행으로 시작 */
    trip = newTrip('나의 여행', todayStr(), addDays(todayStr(), 2), '');
    firstRun = true;
  }
  normalize();
}

/* 빈 여행 만들기 */
function newTrip(title, start, end, city){
  return {
    title: title || '나의 여행',
    subtitle: city || '',
    travelers: [],
    days: dateRange(start, end).map(date => ({ date, city: city || '', memo:'', items:[] })),
    food: [],
    docs: []
  };
}
/* start~end 사이 날짜 배열 (최대 60일) */
function dateRange(start, end){
  const out = [];
  let cur = start;
  for (let i = 0; i < 60; i++){
    out.push(cur);
    if (cur >= end) break;
    cur = addDays(cur, 1);
  }
  return out;
}
function addDays(s, n){
  const d = parseD(s); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(trip)); }
  catch(e){ toast('저장 공간이 부족해요 😢'); }
}
/* id 부여 · 정렬 · 누락 필드 보정 */
function normalize(){
  trip.docs = trip.docs || [];
  trip.food = trip.food || [];
  trip.food.forEach(f => { if (!f.id) f.id = uid(); });
  trip.days.forEach(d => {
    d.items = d.items || [];
    d.items.forEach(it => { if (!it.id) it.id = uid(); if (!it.type) it.type = '기타'; });
    d.items.sort((a,b) => (a.time||'').localeCompare(b.time||''));
  });
  trip.docs.forEach(dc => { if (!dc.id) dc.id = uid(); });
}
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

/* ==========================================================
   첨부 파일 (IndexedDB)
   ========================================================== */
const DB = (() => {
  let p = null;
  const open = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('trip-files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('files', mode);
      const req = fn(t.objectStore('files'));
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
  };
  return {
    put: (k, v) => tx('readwrite', s => s.put(v, k)),
    get: (k)    => tx('readonly',  s => s.get(k)),
    del: (k)    => tx('readwrite', s => s.delete(k))
  };
})();

/* ==========================================================
   날짜 유틸
   ========================================================== */
const parseD = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const fmtMD  = s => { const d = parseD(s); return `${d.getMonth()+1}/${d.getDate()}`; };
const fmtDow = s => DOW[parseD(s).getDay()];
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const dayDiff = (a, b) => Math.round((parseD(a) - parseD(b)) / 86400000);

/* 여행 시작까지 D-day */
function ddayText(){
  const t = todayStr(), s = trip.days[0].date, e = trip.days[trip.days.length-1].date;
  const toStart = dayDiff(s, t);
  if (toStart > 0) return `<b>D-${toStart}</b>`;
  if (dayDiff(e, t) >= 0) return `여행 <b>${dayDiff(t, s)+1}일차</b>`;
  return `<b>${trip.days.length}일 완주</b> 🏁`;
}

/* ==========================================================
   진행률 / 레벨 / 뱃지
   ========================================================== */
function progress(){
  let all = 0, done = 0;
  trip.days.forEach(d => d.items.forEach(i => { all++; if (i.done) done++; }));
  return { all, done, pct: all ? Math.round(done/all*100) : 0 };
}
function dayDone(d){ return d.items.length > 0 && d.items.every(i => i.done); }
const LEVELS = ['여행 새싹','길찾기 초보','동네 탐험가','골목 수집가','미식 사냥꾼','전망대 정복자','로컬 다 됐다','포르투갈 마스터'];
function level(pct){ return LEVELS[Math.min(LEVELS.length-1, Math.floor(pct/100*LEVELS.length))]; }

const BADGES = [
  { e:'🛬', n:'무사 도착',   ok:t => t.days[0].items.some(i => i.done) },
  { e:'🚋', n:'트램 탑승',   ok:t => anyDone(t, i => /트램|tram/i.test(i.title + i.move)) },
  { e:'🥮', n:'에그타르트',  ok:t => anyDone(t, i => /타르트|Manteigaria|Belém/i.test(i.title)) },
  { e:'🌅', n:'전망대 정복', ok:t => cntDone(t, i => /전망대|Miradouro|탑|Torre/i.test(i.title)) >= 2 },
  { e:'🍽️', n:'미식 5회',   ok:t => cntDone(t, i => i.type === '식당') >= 5 },
  { e:'🗺️', n:'하루 완주',   ok:t => t.days.some(dayDone) },
  { e:'🚄', n:'도시 이동',   ok:t => anyDone(t, i => /포르투|기차|AP125/i.test(i.title)) },
  { e:'🏆', n:'전체 완주',   ok:t => progress().pct === 100 }
];
const anyDone = (t, f) => t.days.some(d => d.items.some(i => i.done && f(i)));
const cntDone = (t, f) => t.days.reduce((n, d) => n + d.items.filter(i => i.done && f(i)).length, 0);

/* ==========================================================
   렌더 — 헤더
   ========================================================== */
function renderHero(){
  const p = progress();
  $('#heroTitle').textContent = trip.title || '나의 여행';
  $('#heroSub').innerHTML =
    `<span class="dday">${ddayText()}</span>` +
    `<span>${trip.subtitle || ''}</span>` +
    (trip.travelers?.length ? `<span>· ${trip.travelers.join(', ')}</span>` : '');
  $('#xpLv').textContent  = 'Lv. ' + level(p.pct);
  $('#xpRt').textContent  = `${p.done} / ${p.all} 완료 · ${p.pct}%`;
  $('#xpFill').style.width = p.pct + '%';
}

/* ==========================================================
   렌더 — 날짜 칩
   ========================================================== */
function renderDays(){
  const t = todayStr();
  $('#days').innerHTML = trip.days.map((d, i) => `
    <button class="day-chip ${i === dayIdx ? 'on' : ''} ${d.date === t ? 'today' : ''}" data-day="${i}">
      ${dayDone(d) ? '<span class="stamp">✅</span>' : ''}
      <div class="dow">${fmtDow(d.date)}</div>
      <div class="dt mono">${fmtMD(d.date)}</div>
      <div class="ct">${d.city || ''}</div>
    </button>`).join('');
  const on = $('.day-chip.on');
  if (on) on.scrollIntoView({ inline:'center', block:'nearest', behavior:'smooth' });
}

/* ==========================================================
   렌더 — 오버뷰
   ========================================================== */
function renderOverview(){
  const d = trip.days[dayIdx];
  const items = d.items;
  const c = t => items.filter(i => i.type === t).length;
  const docsToday = trip.docs.filter(dc => (dc.title + dc.sub).includes(fmtMD(d.date)));
  const food = d.city ? trip.food.filter(f => f.city === d.city) : [];
  const hasGeo = items.some(i => i.lat != null && i.lng != null);

  $('#viewOverview').innerHTML = `
    ${hasGeo ? `<div class="map-box">
      <div id="map" class="map"></div>
      <div class="map-bar">
        <div class="cur" id="mapCur">지도에서 핀을 눌러보세요</div>
        <button class="mini" id="btnFit">전체</button>
        <button class="mini" id="btnBig">크게</button>
        <button class="mini" id="btnFood">🍽️ 맛집</button>
        <button class="mini solid" id="btnGmap">구글맵</button>
      </div>
    </div>` : `<div class="map-box"><div class="empty" style="padding:26px 20px">
      <span class="em">🗺️</span>일정에 <b>좌표</b>를 넣으면<br>여기에 오늘의 동선이 그려져요
    </div></div>`}

    <div class="stats">
      <div class="stat"><div class="n mono">${items.length}</div><div class="l">일정</div></div>
      <div class="stat"><div class="n mono">${c('명소')}</div><div class="l">명소</div></div>
      <div class="stat"><div class="n mono">${c('식당')}</div><div class="l">식사</div></div>
      <div class="stat"><div class="n mono">${items.filter(i=>i.done).length}</div><div class="l">완료</div></div>
    </div>

    ${d.memo ? `<div class="wrap"><div class="card"><div class="card-h"><span class="dot"></span>오늘의 메모</div>
      <div class="card-note"><span>📝</span><span>${esc(d.memo)}</span></div></div></div>` : ''}

    <div class="wrap">
      <div class="card">
        <div class="card-h"><span class="dot"></span>예약 서류<span class="sub">${trip.docs.length}건</span></div>
        <div class="card-note"><span>📎</span><span>탭하면 바로 열려요 · 파일을 첨부하면 오프라인에서도 볼 수 있어요</span></div>
        <div>${(docsToday.length ? docsToday : trip.docs.slice(0,5)).map(docRow).join('') || emptyBox('등록된 서류가 없어요')}</div>
      </div>
    </div>

    <div class="wrap">
      <div class="card">
        <div class="card-h"><span class="dot"></span>${d.city ? esc(d.city) + ' 맛집' : '맛집 리스트'}<span class="sub">${food.length}곳</span></div>
        <div class="card-note"><span>🍽️</span><span>${d.city
          ? '내가 저장해둔 <b>' + esc(d.city) + '</b> 맛집이에요 · 탭하면 지도로'
          : '이 날의 <b>도시를 먼저 지정</b>하면 그 도시 맛집만 모아서 보여줘요'}</span></div>
        <div>${food.map(foodRow).join('') || emptyBox(d.city
            ? esc(d.city) + ' 맛집이 아직 없어요' : '도시를 지정해주세요', '🍜')}</div>
        <button class="add-btn" id="btnAddFood" style="width:calc(100% - 24px);margin:10px 12px 12px">＋ ${d.city ? esc(d.city) + ' ' : ''}맛집 추가</button>
      </div>
    </div>`;

  $('#btnAddFood').onclick = () => openFood(null, d.city);
  if (!hasGeo) return;   /* 지도가 없는 날은 여기까지 */
  const fb = $('#btnFood');
  fb.classList.toggle('warm', showFoodPins);
  fb.onclick = () => { showFoodPins = !showFoodPins; fb.classList.toggle('warm', showFoodPins); plotDay(); };
  $('#btnGmap').onclick = () => {
    const pts = d.items.filter(i => i.lat != null);
    if (!pts.length) return toast('좌표가 있는 일정이 없어요');
    /* 구글맵 앱에서 그날 전체 동선을 경유지로 열기 (최대 10곳) */
    const p = pts.slice(0, 10).map(i => `${i.lat},${i.lng}`);
    const url = p.length === 1
      ? `https://www.google.com/maps/search/?api=1&query=${p[0]}`
      : `https://www.google.com/maps/dir/${p.join('/')}`;
    window.open(url, '_blank', 'noopener');
  };
  $('#btnFit').onclick = () => fitMap();
  $('#btnBig').onclick = () => { $('#map').classList.toggle('tall'); setTimeout(() => map && map.invalidateSize(), 260); };
  drawMap();
}

/* ==========================================================
   렌더 — 일정 타임라인
   ========================================================== */
function renderSchedule(){
  const d = trip.days[dayIdx];
  const nowId = currentItemId();

  const html = d.items.map((it, n) => {
    const T = TYPES[it.type] || TYPES['기타'];
    const nav = it.lat != null ? gmapDir(it) : null;
    const view = it.lat != null ? gmapView(it) : null;
    return `
      ${n > 0 && it.move ? `<div class="leg">${esc(it.move)}</div>` : ''}
      <div class="ev ${it.done ? 'done' : ''} ${it.id === nowId ? 'now' : ''}" data-type="${esc(it.type)}" data-id="${it.id}" id="ev-${it.id}">
        <div class="ev-top">
          <div class="ev-time mono">${esc(it.time || '--:--')}</div>
          <div class="ev-body">
            <div class="ev-t">${esc(it.title)}</div>
            <div class="ev-meta">
              <span class="chip">${T.e} ${esc(it.type)}</span>
              ${it.move ? `<span class="chip mv">${esc(it.move)}</span>` : ''}
              ${it.place ? `<span>${esc(it.place)}</span>` : ''}
            </div>
            ${it.note ? `<div class="ev-note">${esc(it.note)}</div>` : ''}
            ${it.warn ? `<div class="ev-warn"><span>⚠️</span><span>${esc(it.warn)}</span></div>` : ''}
            <div class="ev-btns">
              ${nav  ? `<a class="mini warm" href="${nav}"  target="_blank" rel="noopener">🧭 길찾기</a>` : ''}
              ${view ? `<a class="mini"      href="${view}" target="_blank" rel="noopener">📍 지도보기</a>` : ''}
              <button class="mini cool" data-ics="${it.id}">📅 캘린더</button>
            </div>
            <div class="ev-btns2">
              <button data-edit="${it.id}">✏️ 편집</button>
              <button data-del="${it.id}">🗑️ 삭제</button>
            </div>
          </div>
          <button class="ev-check" data-check="${it.id}" aria-label="완료">✓</button>
        </div>
      </div>`;
  }).join('');

  $('#viewSchedule').innerHTML =
    `<div class="tl">${html || emptyBox('아직 일정이 없어요.<br>아래 버튼으로 추가해보세요!','🗓️')}</div>
     <button class="add-btn" id="btnAdd">＋ 일정 추가</button>`;

  $('#btnAdd').onclick = () => openItem(null);
}

/* ==========================================================
   렌더 — 서류
   ========================================================== */
function docRow(dc){
  const ic = DOC_TYPES[dc.type] || '📄';
  const has = dc.fileId || dc.url;
  return `<button class="doc" data-doc="${dc.id}">
    <div class="doc-ic">${ic}</div>
    <div class="doc-b">
      <div class="doc-t">${esc(dc.title)}</div>
      <div class="doc-s">${esc(dc.sub || dc.type)}${dc.fileName ? ' · ' + esc(dc.fileName) : ''}</div>
    </div>
    <div class="doc-go ${has ? '' : 'none'}">${has ? '열기 ›' : '첨부 ›'}</div>
  </button>`;
}
function renderDocs(){
  const groups = {};
  trip.docs.forEach(d => (groups[d.type] = groups[d.type] || []).push(d));
  $('#viewDocs').innerHTML = `
    <div class="wrap">
      ${Object.keys(groups).map(t => `
        <div class="card">
          <div class="card-h"><span class="dot"></span>${DOC_TYPES[t] || '📄'} ${esc(t)}<span class="sub">${groups[t].length}건</span></div>
          <div style="height:8px"></div>
          <div>${groups[t].map(docRow).join('')}</div>
        </div>`).join('') || emptyBox('등록된 서류가 없어요','📄')}
    </div>
    <button class="add-btn" id="btnAddDoc">＋ 서류 추가</button>`;
  $('#btnAddDoc').onclick = () => openDoc(null);
}

/* ==========================================================
   렌더 — 더보기 / 설정
   ========================================================== */
function renderMore(){
  const p = progress();
  $('#viewMore').innerHTML = `
    <div class="wrap">
      <div class="card">
        <div class="card-h"><span class="dot"></span>여행 정보</div>
        <div style="height:8px"></div>
        <button class="set-row" id="mTrip"><span class="e">🧳</span>여행 제목 · 동행 수정<span class="ar">${esc(trip.title)} ›</span></button>
        <button class="set-row" id="mDay"><span class="e">📅</span>날짜 · 도시 · 일수 편집<span class="ar">${trip.days.length}일 ›</span></button>
      </div>

      <div class="card">
        <div class="card-h"><span class="dot"></span>맛집<span class="sub">${trip.food.length}곳</span></div>
        <div style="height:8px"></div>
        <button class="set-row" id="mFood"><span class="e">🍽️</span>맛집 추가<span class="ar">›</span></button>
        <div class="card-note"><span>💡</span><span>맛집에 적은 <b>도시</b>와 같은 도시로 지정된 날의 오버뷰에 자동으로 뜹니다.</span></div>
      </div>

      <div class="card">
        <div class="card-h"><span class="dot"></span>획득한 뱃지<span class="sub">${BADGES.filter(b=>b.ok(trip)).length} / ${BADGES.length}</span></div>
        <div class="badges">${BADGES.map(b => `
          <div class="badge ${b.ok(trip) ? 'got' : ''}">
            <div class="e">${b.e}</div><div class="n">${b.n}</div>
          </div>`).join('')}</div>
        <div style="height:12px"></div>
      </div>

      <div class="card">
        <div class="card-h"><span class="dot"></span>데이터</div>
        <div style="height:8px"></div>
        <button class="set-row" id="mExport"><span class="e">📤</span>내보내기 (JSON 백업)<span class="ar">›</span></button>
        <button class="set-row" id="mImport"><span class="e">📥</span>가져오기 (JSON 복원)<span class="ar">›</span></button>
        <button class="set-row" id="mIcsAll"><span class="e">🗓️</span>전체 일정 캘린더로 (.ics)<span class="ar">›</span></button>
        <button class="set-row" id="mUncheck"><span class="e">♻️</span>완료 체크 전부 해제<span class="ar">${p.done}개 ›</span></button>
        <button class="set-row" id="mSample"><span class="e">🇵🇹</span>샘플 여행 둘러보기<span class="ar">포르투갈 8일 ›</span></button>
        <button class="set-row" id="mReset" style="color:var(--hot)"><span class="e">⚠️</span>싹 비우고 새 여행 시작<span class="ar">›</span></button>
      </div>

      <div class="card">
        <div class="card-h"><span class="dot"></span>화면</div>
        <div style="height:8px"></div>
        <button class="set-row" id="mTheme"><span class="e">🌗</span>테마<span class="ar">${themeLabel()} ›</span></button>
        <div class="card-note"><span>💡</span><span>사파리 공유 → “홈 화면에 추가”를 하면 앱처럼 전체화면으로 열리고, 비행기 모드에서도 동작해요.</span></div>
      </div>
    </div>
    <input type="file" id="fileImport" accept="application/json,.json" class="hidden">`;

  $('#mTrip').onclick    = openTripEdit;
  $('#mDay').onclick     = openDayEdit;
  $('#mExport').onclick  = exportJSON;
  $('#mImport').onclick  = () => $('#fileImport').click();
  $('#fileImport').onchange = importJSON;
  $('#mIcsAll').onclick  = () => downloadICS(trip.days.flatMap(d => d.items.map(i => [d, i])), trip.title);
  $('#mUncheck').onclick = () => { if (confirm('완료 체크를 전부 해제할까요?')){ trip.days.forEach(d => d.items.forEach(i => i.done = false)); save(); render(); toast('체크를 모두 해제했어요'); } };
  $('#mFood').onclick    = () => openFood(null, trip.days[dayIdx].city);
  $('#mSample').onclick  = () => {
    if (!confirm('지금 여행 내용이 샘플로 바뀝니다. 먼저 백업하셨나요?')) return;
    trip = structuredClone(SAMPLE_TRIP);
    dayIdx = 0; normalize(); save(); render(); setTab('overview'); toast('샘플 여행을 불러왔어요');
  };
  $('#mReset').onclick   = () => {
    if (!confirm('지금 일정 · 맛집 · 서류가 모두 지워지고 새 여행을 만듭니다. 계속할까요?')) return;
    localStorage.removeItem(KEY);
    trip = newTrip('나의 여행', todayStr(), addDays(todayStr(), 2), '');
    dayIdx = 0; normalize(); save(); render(); setTab('overview'); openSetup();
  };
  $('#mTheme').onclick   = cycleTheme;
}

/* ==========================================================
   지도 (Leaflet)
   ========================================================== */
function drawMap(){
  const el = $('#map');
  if (!el || typeof L === 'undefined'){
    if (el) el.innerHTML = '<div class="empty"><span class="em">🗺️</span>지도를 불러올 수 없어요<br>(오프라인이거나 네트워크 차단)</div>';
    return;
  }
  if (map){ map.remove(); map = null; }
  map = L.map(el, { zoomControl:true, attributionControl:true, scrollWheelZoom:false, tap:true });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom:19, attribution:'&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);
  layer = L.layerGroup().addTo(map);
  mapReady = true;
  plotDay();
}

function plotDay(){
  if (!mapReady) return;
  layer.clearLayers();
  const pts = trip.days[dayIdx].items.filter(i => i.lat != null && i.lng != null);
  if (!pts.length){ map.setView([38.7139, -9.1394], 12); return; }

  const nowId = currentItemId();
  const line = [];
  pts.forEach((it, n) => {
    const cls = it.done ? 'done' : (it.id === nowId ? 'now' : '');
    const icon = L.divIcon({
      className:'', iconSize:[26,26], iconAnchor:[13,26], popupAnchor:[0,-24],
      html:`<div class="pin ${cls}"><span>${n+1}</span></div>`
    });
    const m = L.marker([it.lat, it.lng], { icon }).addTo(layer);
    m.bindPopup(`
      <div class="pop-t">${esc(it.time)} ${esc(it.title)}</div>
      <div class="pop-s">${esc(it.place || it.type)}${it.move ? ' · ' + esc(it.move) : ''}</div>
      <div class="pop-b">
        <a href="${gmapDir(it)}" target="_blank" rel="noopener">구글맵 길찾기</a>
        <a class="alt" href="${gmapView(it)}" target="_blank" rel="noopener">위치보기</a>
      </div>`);
    m.on('click', () => { const c = $('#mapCur'); if (c) c.innerHTML = `<i>${n+1}</i>${esc(it.time)} ${esc(it.title)}`; });
    line.push([it.lat, it.lng]);
  });
  L.polyline(line, { color:'#5b4bd6', weight:3, opacity:.55, dashArray:'7 8' }).addTo(layer);

  /* 그 도시에 저장해둔 맛집도 같이 — 구글지도엔 없는, 내 리스트 기준의 그림 */
  if (showFoodPins){
    const city = trip.days[dayIdx].city;
    trip.food.filter(f => f.city === city && f.lat != null).forEach(f => {
      const icon = L.divIcon({
        className:'', iconSize:[24,24], iconAnchor:[12,12], popupAnchor:[0,-14],
        html:`<div class="fpin ${f.tried ? 'tried' : ''}">${FOOD_KINDS[f.kind] || '🍽️'}</div>`
      });
      L.marker([f.lat, f.lng], { icon }).addTo(layer).bindPopup(`
        <div class="pop-t">${esc(f.name)}</div>
        <div class="pop-s">${esc(f.kind || '맛집')}${f.note ? ' · ' + esc(f.note) : ''}</div>
        <div class="pop-b">
          <a href="${gmapDir({ ...f, move:'도보' })}" target="_blank" rel="noopener">길찾기</a>
          <a class="alt" href="#" onclick="foodToSchedule('${f.id}');return false;">일정에 추가</a>
        </div>`);
    });
  }
  fitMap(line);
}
function fitMap(line){
  if (!mapReady) return;
  const pts = line || trip.days[dayIdx].items.filter(i => i.lat != null).map(i => [i.lat, i.lng]);
  if (!pts.length) return;
  if (pts.length === 1) map.setView(pts[0], 15);
  else map.fitBounds(L.latLngBounds(pts).pad(0.18));
}

/* 구글 지도 링크 */
const gmapView = it => it.place
  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.place)}&center=${it.lat},${it.lng}`
  : `https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lng}`;
function gmapDir(it){
  const mode = /도보|walk|🚶/.test(it.move || '') ? 'walking'
             : /트램|버스|지하철|메트로|기차|🚆|🚋|🚇|🚌/.test(it.move || '') ? 'transit'
             : 'driving';
  return `https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lng}&travelmode=${mode}`;
}

/* ==========================================================
   "지금" — 현재 시각에 가장 가까운 일정
   ========================================================== */
function currentItemId(){
  const d = trip.days[dayIdx];
  if (d.date !== todayStr()) return null;
  const now = new Date();
  const hm = now.getHours()*60 + now.getMinutes();
  let best = null;
  d.items.forEach(it => {
    const [h, m] = (it.time || '00:00').split(':').map(Number);
    const t = h*60 + m;
    if (t <= hm + 20) best = it.id;   // 20분 뒤 것까지 "지금"으로
  });
  return best || (d.items[0] && d.items[0].id);
}
function goNow(){
  const t = todayStr();
  const i = trip.days.findIndex(d => d.date === t);
  if (i >= 0) dayIdx = i;
  setTab('schedule');
  render();
  setTimeout(() => {
    const id = currentItemId();
    const el = id && $('#ev-' + id);
    if (el){ el.scrollIntoView({ block:'center', behavior:'smooth' }); }
    else toast(i >= 0 ? '오늘 일정이 없어요' : '오늘은 여행 기간이 아니에요 🙂');
  }, 120);
}

/* ==========================================================
   위치 고르기 — 이름 검색 · 붙여넣기 · 현재 위치
   좌표를 직접 타이핑할 일이 없도록.
   검색은 OpenStreetMap(Nominatim) — 무료, API 키 없음.
   ========================================================== */
let locState = { lat:null, lng:null, place:'' };

function locHTML(){
  return `
  <div class="f">
    <label>위치</label>
    <div class="loc">
      <div class="loc-cur" id="locCur"></div>
      <div class="loc-search">
        <input id="locQ" placeholder="장소 이름으로 검색" enterkeyhint="search" autocomplete="off">
        <button type="button" id="locGo">검색</button>
      </div>
      <div id="locRes"></div>
      <div class="loc-alt">
        <button type="button" id="locPaste">📋 좌표 붙여넣기</button>
        <button type="button" id="locHere">📍 현재 위치</button>
        <button type="button" id="locClear">✕ 지우기</button>
      </div>
      <div id="locPasteBox" class="hidden">
        <input id="locPasteIn" placeholder="여기에 붙여넣기" autocomplete="off">
        <div class="f-hint">구글 지도에서 장소를 <b>길게 눌러</b> 나오는 좌표(<code>34.6687, 135.5013</code>)를
        복사해 붙여넣거나, 지도 <b>주소창 전체</b>를 그대로 붙여넣어도 됩니다.</div>
      </div>
    </div>
  </div>`;
}

/* 붙여넣은 글자에서 좌표 뽑아내기 */
function parseLatLng(t){
  const pats = [
    /@(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/,          // 구글맵 주소 @lat,lng
    /!3d(-?\d{1,3}\.\d{3,})!4d(-?\d{1,3}\.\d{3,})/,           // 구글맵 내부 형식
    /[?&](?:q|query|ll|sll|daddr|destination)=(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/,
    /(-?\d{1,3}\.\d{3,})\s*[,/]\s*(-?\d{1,3}\.\d{3,})/       // 그냥 "34.66, 135.50"
  ];
  for (const p of pats){
    const m = String(t).match(p);
    if (m){
      const a = +m[1], b = +m[2];
      if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return [a, b];
    }
  }
  return null;
}

/* opts: { nameSel: 이름 input 셀렉터, city: 검색에 덧붙일 도시 } */
function bindLoc(init, opts = {}){
  locState = { lat: init.lat ?? null, lng: init.lng ?? null, place: init.place || '' };
  drawLoc();

  const search = async () => {
    const raw = ($('#locQ').value || (opts.nameSel && $(opts.nameSel).value) || '').trim();
    if (!raw) return toast('찾을 장소 이름을 적어주세요');
    /* 도시를 덧붙여 정확도 올리기 */
    const q = (opts.city && !raw.includes(opts.city)) ? `${raw} ${opts.city}` : raw;
    $('#locRes').innerHTML = '<div class="loc-msg">찾는 중…</div>';
    try{
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1'
        + '&accept-language=ko&q=' + encodeURIComponent(q));
      const list = await r.json();
      if (!list.length){
        $('#locRes').innerHTML = `<div class="loc-msg">결과가 없어요. 이름을 바꾸거나
          <b>영어 이름</b>으로 해보세요. 안 되면 좌표를 붙여넣어도 됩니다.</div>`;
        return;
      }
      $('#locRes').innerHTML = list.map((x, i) => `
        <button type="button" class="loc-hit" data-i="${i}">
          <b>${esc(x.name || x.display_name.split(',')[0])}</b>
          <span>${esc(x.display_name)}</span>
        </button>`).join('');
      $('#locRes').onclick = e => {
        const b = e.target.closest('[data-i]'); if (!b) return;
        const x = list[+b.dataset.i];
        locState = { lat:+x.lat, lng:+x.lon, place: x.name || x.display_name.split(',')[0] };
        if (opts.nameSel && !$(opts.nameSel).value.trim()) $(opts.nameSel).value = locState.place;
        $('#locRes').innerHTML = ''; $('#locQ').value = '';
        drawLoc(); toast('위치를 넣었어요 📍');
      };
    }catch(_){
      $('#locRes').innerHTML = `<div class="loc-msg">검색에 실패했어요 (인터넷 확인).
        좌표 붙여넣기를 쓰세요.</div>`;
    }
  };

  $('#locGo').onclick = search;
  $('#locQ').onkeydown = e => { if (e.key === 'Enter'){ e.preventDefault(); search(); } };

  $('#locPaste').onclick = () => $('#locPasteBox').classList.toggle('hidden');
  $('#locPasteIn').oninput = e => {
    const p = parseLatLng(e.target.value);
    if (!p) return;
    locState.lat = p[0]; locState.lng = p[1];
    if (!locState.place && opts.nameSel) locState.place = $(opts.nameSel).value.trim();
    e.target.value = ''; $('#locPasteBox').classList.add('hidden');
    drawLoc(); toast('좌표를 넣었어요 📍');
  };

  $('#locHere').onclick = () => {
    if (!navigator.geolocation) return toast('이 브라우저는 위치를 못 가져와요');
    toast('현재 위치 확인 중…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        locState.lat = +pos.coords.latitude.toFixed(6);
        locState.lng = +pos.coords.longitude.toFixed(6);
        drawLoc(); toast('현재 위치로 지정했어요 📍');
      },
      () => toast('위치 권한이 필요해요'),
      { enableHighAccuracy:true, timeout:8000 }
    );
  };

  $('#locClear').onclick = () => {
    locState = { lat:null, lng:null, place: locState.place };
    drawLoc(); toast('위치를 지웠어요');
  };
}

function drawLoc(){
  const el = $('#locCur'); if (!el) return;
  if (locState.lat == null){
    el.className = 'loc-cur none';
    el.innerHTML = '아직 위치가 없어요 — 아래에서 검색하거나 좌표를 붙여넣으세요';
    return;
  }
  el.className = 'loc-cur';
  el.innerHTML = `<span class="pin-em">📍</span>
    <span class="loc-name">${esc(locState.place || '지정한 위치')}</span>
    <span class="mono loc-xy">${locState.lat.toFixed(4)}, ${locState.lng.toFixed(4)}</span>
    <a class="loc-see" href="https://www.google.com/maps/search/?api=1&query=${locState.lat},${locState.lng}"
       target="_blank" rel="noopener">확인 ›</a>`;
}

/* ==========================================================
   일정 편집 시트
   ========================================================== */
function openItem(id){
  const d = trip.days[dayIdx];
  const it = id ? d.items.find(x => x.id === id) : { time:'09:00', type:'명소' };
  let type = it.type || '명소';

  sheet(id ? '일정 편집' : '일정 추가', `
    <div class="f-row">
      <div class="f" style="flex:0 0 118px"><label>시간</label><input type="time" id="iTime" value="${esc(it.time || '09:00')}"></div>
      <div class="f"><label>제목</label><input id="iTitle" placeholder="예: 렐루 서점" value="${esc(it.title || '')}"></div>
    </div>
    <div class="f"><label>종류</label><div class="type-pick" id="iType">
      ${Object.keys(TYPES).map(t => `<button data-t="${t}" class="${t===type?'on':''}">${TYPES[t].e} ${t}</button>`).join('')}
    </div></div>
    <div class="f"><label>이동수단 / 교통 메모</label><input id="iMove" placeholder="예: 🚶 도보 10분 / 🚋 트램 28" value="${esc(it.move || '')}"></div>
    <div class="f"><label>장소 이름</label><input id="iPlace" placeholder="예: Livraria Lello" value="${esc(it.place || '')}"></div>
    ${locHTML()}
    <div class="f"><label>메모</label><textarea id="iNote" placeholder="예약번호, 팁, 메뉴 등">${esc(it.note || '')}</textarea></div>
    <div class="f"><label>⚠️ 주의사항</label><input id="iWarn" placeholder="예: 시간지정 입장권 · 늦으면 무효" value="${esc(it.warn || '')}"></div>
    <div class="btn-row">
      ${id ? '<button class="btn danger" id="iDel">삭제</button>' : ''}
      <button class="btn" id="iSave">저장</button>
    </div>`);

  $('#iType').onclick = e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    type = b.dataset.t;
    $$('#iType button').forEach(x => x.classList.toggle('on', x === b));
  };
  bindLoc({ lat: it.lat, lng: it.lng, place: it.place }, { nameSel:'#iPlace', city: d.city });
  $('#iSave').onclick = () => {
    const title = $('#iTitle').value.trim();
    if (!title) return toast('제목을 입력해주세요');
    const obj = {
      id: it.id || uid(), done: it.done || false,
      time: $('#iTime').value || '09:00', title, type,
      move: $('#iMove').value.trim(), place: $('#iPlace').value.trim() || locState.place,
      note: $('#iNote').value.trim(), warn: $('#iWarn').value.trim(),
      lat: locState.lat, lng: locState.lng
    };
    if (id) Object.assign(it, obj); else d.items.push(obj);
    d.items.sort((a,b) => a.time.localeCompare(b.time));
    save(); closeSheet(); render(); toast(id ? '수정했어요 ✏️' : '일정을 추가했어요 ✨');
  };
  if (id) $('#iDel').onclick = () => delItem(id);
}

function delItem(id){
  const d = trip.days[dayIdx];
  if (!confirm('이 일정을 삭제할까요?')) return;
  d.items = d.items.filter(x => x.id !== id);
  save(); closeSheet(); render(); toast('삭제했어요');
}

/* ==========================================================
   맛집 리스트
   ========================================================== */
function foodRow(f){
  const ic = FOOD_KINDS[f.kind] || '🍽️';
  return `<div class="food ${f.tried ? 'tried' : ''}" data-food="${f.id}">
    <button class="food-ic" data-food-try="${f.id}" title="가봤어요">${f.tried ? '✅' : ic}</button>
    <div class="food-b">
      <div class="food-t">${esc(f.name)}</div>
      <div class="food-s">${esc(f.kind || '맛집')}${f.note ? ' · ' + esc(f.note) : ''}</div>
      <div class="food-btns">
        ${f.lat != null ? `<a class="mini" href="${gmapView(f.name ? { ...f, place:f.name } : f)}" target="_blank" rel="noopener">📍 지도</a>` : ''}
        ${f.lat != null ? `<a class="mini warm" href="${gmapDir({ ...f, move:'도보' })}" target="_blank" rel="noopener">🧭 길찾기</a>` : ''}
        ${f.url ? `<a class="mini" href="${esc(f.url)}" target="_blank" rel="noopener">🔗 링크</a>` : ''}
        <button class="mini cool" data-food-add="${f.id}">＋ 일정에</button>
        <button class="mini" data-food-edit="${f.id}">✏️</button>
      </div>
    </div>
  </div>`;
}

function openFood(id, defaultCity){
  const f = id ? trip.food.find(x => x.id === id) : { kind:'맛집', city: defaultCity || '' };
  let kind = f.kind || '맛집';
  const cities = [...new Set([...trip.days.map(d => d.city), ...trip.food.map(x => x.city)].filter(Boolean))];

  sheet(id ? '맛집 편집' : '맛집 추가', `
    <div class="f"><label>가게 이름</label><input id="fName" placeholder="예: 이치란 라멘" value="${esc(f.name || '')}"></div>
    <div class="f"><label>도시</label><input id="fCity" list="foodCities" placeholder="예: 오사카" value="${esc(f.city || '')}">
      <datalist id="foodCities">${cities.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
      <div class="f-hint">여기 적은 도시와 <b>같은 도시로 지정된 날</b>의 오버뷰에 나타납니다.</div>
    </div>
    <div class="f"><label>종류</label><div class="type-pick" id="fKind">
      ${Object.keys(FOOD_KINDS).map(k => `<button data-t="${k}" class="${k===kind?'on':''}">${FOOD_KINDS[k]} ${k}</button>`).join('')}
    </div></div>
    <div class="f"><label>메모</label><input id="fNote" placeholder="예: 웨이팅 김 · 오후 3시 노려" value="${esc(f.note || '')}"></div>
    ${locHTML()}
    <div class="f"><label>링크 (선택)</label><input id="fUrl" inputmode="url" placeholder="블로그 · 인스타 주소" value="${esc(f.url || '')}"></div>
    <div class="btn-row">
      ${id ? '<button class="btn danger" id="fDel">삭제</button>' : ''}
      <button class="btn" id="fSave">저장</button>
    </div>`);

  $('#fKind').onclick = e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    kind = b.dataset.t;
    $$('#fKind button').forEach(x => x.classList.toggle('on', x === b));
  };
  bindLoc({ lat: f.lat, lng: f.lng, place: f.name }, { nameSel:'#fName', city: f.city || defaultCity || '' });
  $('#fSave').onclick = () => {
    const name = $('#fName').value.trim();
    if (!name) return toast('가게 이름을 입력해주세요');
    const obj = {
      id: f.id || uid(), tried: f.tried || false,
      name, city: $('#fCity').value.trim(), kind,
      note: $('#fNote').value.trim(), url: $('#fUrl').value.trim(),
      lat: locState.lat, lng: locState.lng
    };
    if (id) Object.assign(f, obj); else trip.food.push(obj);
    save(); closeSheet(); render(); toast(id ? '수정했어요 ✏️' : '맛집을 저장했어요 🍽️');
  };
  if (id) $('#fDel').onclick = () => {
    if (!confirm('이 맛집을 삭제할까요?')) return;
    trip.food = trip.food.filter(x => x.id !== id);
    save(); closeSheet(); render(); toast('삭제했어요');
  };
}

/* 맛집 → 그날 일정으로 */
function foodToSchedule(id){
  const f = trip.food.find(x => x.id === id);
  const d = trip.days[dayIdx];
  sheet('일정에 추가', `
    <div class="f-hint" style="margin-bottom:14px">
      <b>${esc(f.name)}</b> 를 ${fmtMD(d.date)} (${fmtDow(d.date)}) 일정에 넣습니다.
    </div>
    <div class="f-row">
      <div class="f" style="flex:0 0 130px"><label>시간</label><input type="time" id="fsTime" value="12:30"></div>
      <div class="f"><label>이동수단 (선택)</label><input id="fsMove" placeholder="예: 🚶 도보 10분"></div>
    </div>
    <button class="btn" id="fsGo">추가</button>`);
  $('#fsGo').onclick = () => {
    d.items.push({
      id: uid(), time: $('#fsTime').value || '12:30', title: f.name, type:'식당',
      move: $('#fsMove').value.trim(), place: f.name, note: f.note || '',
      lat: f.lat ?? null, lng: f.lng ?? null, done:false
    });
    d.items.sort((a,b) => a.time.localeCompare(b.time));
    save(); closeSheet(); setTab('schedule'); render(); toast('일정에 넣었어요 ✨');
  };
}

/* ==========================================================
   서류 편집 시트
   ========================================================== */
function openDoc(id){
  const dc = id ? trip.docs.find(x => x.id === id) : { type:'항공권' };
  let type = dc.type || '항공권';

  sheet(id ? '서류 편집' : '서류 추가', `
    <div class="f"><label>종류</label><div class="type-pick" id="dType">
      ${Object.keys(DOC_TYPES).map(t => `<button data-t="${t}" class="${t===type?'on':''}">${DOC_TYPES[t]} ${t}</button>`).join('')}
    </div></div>
    <div class="f"><label>제목</label><input id="dTitle" placeholder="예: 항공권 · 홍길동 (KE921)" value="${esc(dc.title || '')}"></div>
    <div class="f"><label>부가 설명</label><input id="dSub" placeholder="예: 7/31 인천 13:30 → 리스본 19:40" value="${esc(dc.sub || '')}"></div>
    <div class="f"><label>링크 (선택)</label><input id="dUrl" inputmode="url" placeholder="https://..." value="${esc(dc.url || '')}"></div>
    <div class="f">
      <label>파일 첨부 (선택) — PDF · 이미지</label>
      <input type="file" id="dFile" accept="image/*,application/pdf">
      <div class="f-hint">${dc.fileName ? `현재 첨부: <b>${esc(dc.fileName)}</b> · 새로 고르면 교체돼요` : '첨부하면 <b>비행기 모드에서도</b> 열 수 있어요. (휴대폰 저장공간에 보관)'}</div>
      ${dc.fileId ? '<button class="btn ghost" id="dFileDel" style="margin-top:8px">첨부 파일 삭제</button>' : ''}
    </div>
    <div class="btn-row">
      ${id ? '<button class="btn danger" id="dDel">삭제</button>' : ''}
      <button class="btn" id="dSave">저장</button>
    </div>`);

  $('#dType').onclick = e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    type = b.dataset.t;
    $$('#dType button').forEach(x => x.classList.toggle('on', x === b));
  };
  if (dc.fileId) $('#dFileDel').onclick = async () => {
    await DB.del(dc.fileId); delete dc.fileId; delete dc.fileName;
    save(); closeSheet(); render(); toast('첨부를 삭제했어요');
  };
  $('#dSave').onclick = async () => {
    const title = $('#dTitle').value.trim();
    if (!title) return toast('제목을 입력해주세요');
    const obj = { id: dc.id || uid(), type, title, sub: $('#dSub').value.trim(), url: $('#dUrl').value.trim(),
                  fileId: dc.fileId, fileName: dc.fileName };
    const f = $('#dFile').files[0];
    if (f){
      if (f.size > 12 * 1024 * 1024) return toast('파일이 너무 커요 (12MB 이하)');
      const key = obj.fileId || uid();
      try{ await DB.put(key, f); obj.fileId = key; obj.fileName = f.name; }
      catch(e){ return toast('첨부 저장 실패 😢'); }
    }
    if (id) Object.assign(dc, obj); else trip.docs.push(obj);
    save(); closeSheet(); render(); toast(id ? '수정했어요 ✏️' : '서류를 추가했어요 📎');
  };
  if (id) $('#dDel').onclick = async () => {
    if (!confirm('이 서류를 삭제할까요?')) return;
    if (dc.fileId) await DB.del(dc.fileId);
    trip.docs = trip.docs.filter(x => x.id !== id);
    save(); closeSheet(); render(); toast('삭제했어요');
  };
}

/* 서류 열기: 파일 > 링크 > (없으면) 편집 */
async function openDocFile(id){
  const dc = trip.docs.find(x => x.id === id);
  if (!dc) return;
  if (dc.fileId){
    try{
      const blob = await DB.get(dc.fileId);
      if (blob){ const u = URL.createObjectURL(blob); window.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 60000); return; }
    }catch(e){ /* fall through */ }
  }
  if (dc.url){ window.open(dc.url, '_blank', 'noopener'); return; }
  openDoc(id);
}

/* ==========================================================
   여행/날짜 편집
   ========================================================== */
function openTripEdit(){
  sheet('여행 정보', `
    <div class="f"><label>여행 제목</label><input id="tT" value="${esc(trip.title || '')}" placeholder="예: 포르투갈 8일"></div>
    <div class="f"><label>부제 (도시 등)</label><input id="tS" value="${esc(trip.subtitle || '')}" placeholder="예: 리스본 · 포르투"></div>
    <div class="f"><label>동행 (쉼표로 구분)</label><input id="tP" value="${esc((trip.travelers || []).join(', '))}" placeholder="예: 나, 짝꿍"></div>
    <button class="btn" id="tSave">저장</button>`);
  $('#tSave').onclick = () => {
    trip.title = $('#tT').value.trim();
    trip.subtitle = $('#tS').value.trim();
    trip.travelers = $('#tP').value.split(',').map(s => s.trim()).filter(Boolean);
    save(); closeSheet(); render(); toast('저장했어요');
  };
}
function openDayEdit(){
  const cities = [...new Set(trip.days.map(d => d.city).filter(Boolean))];

  const rows = () => trip.days.map((d, i) => `
    <div class="day-row">
      <div class="day-row-n">
        <b>${i+1}일차</b>
        <span class="mono">${fmtMD(d.date)} (${fmtDow(d.date)})</span>
        ${d.items.length ? `<em>일정 ${d.items.length}</em>` : '<em class="mute">비어있음</em>'}
        <button class="row-x" data-rm="${i}" title="이 날 삭제">✕</button>
      </div>
      <input class="dCity" data-d="${i}" list="cityList" value="${esc(d.city || '')}" placeholder="도시 (예: 파리)">
      <input class="dMemo" data-d="${i}" value="${esc(d.memo || '')}" placeholder="그날 한 줄 메모 (선택)">
    </div>`).join('');

  sheet('날짜 / 도시', `
    <div class="f-hint" style="margin-bottom:12px">
      여행 기간을 바꾸면 날짜가 <b>시작일부터 순서대로</b> 다시 매겨집니다.
      늘리면 빈 날이 추가되고, 줄이면 뒤쪽 날이 사라져요.
    </div>
    <div class="f-row">
      <div class="f"><label>시작일</label><input type="date" id="rgStart" value="${trip.days[0].date}"></div>
      <div class="f"><label>종료일</label><input type="date" id="rgEnd" value="${trip.days[trip.days.length-1].date}"></div>
    </div>
    <button class="btn ghost" id="rgApply" style="margin-bottom:6px">기간 적용</button>

    <div class="f-row" style="margin:14px 0 4px">
      <div class="f" style="margin:0"><label>도시 일괄 지정 (선택)</label>
        <div class="f-row">
          <input id="bulkCity" list="cityList" placeholder="예: 오사카" style="flex:1">
          <button class="btn ghost" id="bulkGo" style="width:auto;padding:11px 14px;margin:0">전체 적용</button>
        </div>
      </div>
    </div>

    <datalist id="cityList">${cities.map(c => `<option value="${esc(c)}">`).join('')}</datalist>

    <div style="height:8px"></div>
    <div id="dayRows">${rows()}</div>

    <button class="btn ghost" id="dyAdd">＋ 마지막에 하루 추가</button>
    <button class="btn" id="dySave">저장</button>`);

  const readInputs = () => {
    $$('#dayRows .dCity').forEach(i => { const d = trip.days[+i.dataset.d]; if (d) d.city = i.value.trim(); });
    $$('#dayRows .dMemo').forEach(i => { const d = trip.days[+i.dataset.d]; if (d) d.memo = i.value.trim(); });
  };
  const redraw = () => { $('#dayRows').innerHTML = rows(); };

  /* 기간 적용 — 날짜 다시 매기고 개수 맞추기 */
  $('#rgApply').onclick = () => {
    readInputs();
    const a = $('#rgStart').value, b = $('#rgEnd').value;
    if (!a || !b) return toast('시작일과 종료일을 골라주세요');
    if (b < a) return toast('종료일이 시작일보다 빨라요');
    const dates = dateRange(a, b);
    if (dates.length > 60) return toast('최대 60일까지만 됩니다');

    const cut = trip.days.slice(dates.length).filter(d => d.items.length);
    if (cut.length && !confirm(`일정이 들어있는 ${cut.length}일이 삭제됩니다. 계속할까요?`)) return;

    const last = trip.days[trip.days.length-1];
    trip.days = dates.map((date, i) => trip.days[i]
      ? { ...trip.days[i], date }
      : { date, city: last.city || '', memo:'', items:[] });
    dayIdx = Math.min(dayIdx, trip.days.length-1);
    save(); redraw(); render();
    toast(`${trip.days.length}일 여행으로 바꿨어요`);
  };

  $('#bulkGo').onclick = () => {
    const c = $('#bulkCity').value.trim();
    if (!c) return toast('도시를 입력해주세요');
    readInputs();
    trip.days.forEach(d => d.city = c);
    save(); redraw(); render(); toast(`전부 "${c}" 로 지정했어요`);
  };

  $('#dyAdd').onclick = () => {
    readInputs();
    const last = trip.days[trip.days.length-1];
    trip.days.push({ date: addDays(last.date, 1), city: last.city || '', memo:'', items:[] });
    save(); redraw(); render(); toast('하루 추가했어요');
  };

  $('#dayRows').onclick = e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    if (trip.days.length <= 1) return toast('최소 하루는 있어야 해요');
    const i = +b.dataset.rm, d = trip.days[i];
    if (d.items.length && !confirm(`${fmtMD(d.date)} 의 일정 ${d.items.length}개도 함께 삭제됩니다. 계속할까요?`)) return;
    readInputs();
    trip.days.splice(i, 1);
    /* 남은 날짜를 시작일부터 다시 순서대로 */
    const s0 = trip.days[0].date;
    trip.days.forEach((x, n) => x.date = addDays(s0, n));
    dayIdx = Math.min(dayIdx, trip.days.length-1);
    save(); redraw(); render(); toast('삭제했어요');
  };

  $('#dySave').onclick = () => {
    readInputs();
    save(); closeSheet(); render(); toast('저장했어요');
  };
}

/* 첫 실행 — 여행 만들기 */
function openSetup(){
  sheet('여행 만들기 ✈️', `
    <div class="f-hint" style="margin-bottom:14px">
      먼저 큰 틀만 정해요. 세부 일정은 나중에 얼마든지 바꿀 수 있습니다.
    </div>
    <div class="f"><label>여행 이름</label><input id="suT" placeholder="예: 오사카 4일" value=""></div>
    <div class="f-row">
      <div class="f"><label>시작일</label><input type="date" id="suS" value="${todayStr()}"></div>
      <div class="f"><label>종료일</label><input type="date" id="suE" value="${addDays(todayStr(), 3)}"></div>
    </div>
    <div class="f"><label>도시 (선택 — 나중에 날짜별로 다르게 지정 가능)</label><input id="suC" placeholder="예: 오사카"></div>
    <div class="f"><label>동행 (선택 · 쉼표로 구분)</label><input id="suP" placeholder="예: 나, 짝꿍"></div>
    <button class="btn" id="suGo">이 여행으로 시작</button>
    <button class="btn ghost" id="suSample">샘플 여행 둘러보기 (포르투갈 8일)</button>`);

  $('#suGo').onclick = () => {
    const a = $('#suS').value, b = $('#suE').value;
    if (!a || !b) return toast('날짜를 골라주세요');
    if (b < a) return toast('종료일이 시작일보다 빨라요');
    if (dateRange(a, b).length > 60) return toast('최대 60일까지만 됩니다');
    const city = $('#suC').value.trim();
    trip = newTrip($('#suT').value.trim() || '나의 여행', a, b, city);
    trip.travelers = $('#suP').value.split(',').map(x => x.trim()).filter(Boolean);
    dayIdx = 0; normalize(); save(); closeSheet(); render();
    toast('시작해볼까요 ✈️');
  };
  $('#suSample').onclick = () => {
    trip = structuredClone(SAMPLE_TRIP);
    dayIdx = 0; normalize(); save(); closeSheet(); render();
    toast('샘플 여행을 불러왔어요');
  };
}

/* ==========================================================
   내보내기 / 가져오기 / 캘린더
   ========================================================== */
function download(name, blob){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
function exportJSON(){
  download(`${(trip.title || 'trip').replace(/\s+/g,'_')}.json`,
    new Blob([JSON.stringify(trip, null, 2)], { type:'application/json' }));
  toast('백업 파일을 저장했어요 📤');
}
function importJSON(e){
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try{
      const j = JSON.parse(r.result);
      if (!j.days || !Array.isArray(j.days)) throw 0;
      if (!confirm('현재 데이터를 덮어씁니다. 계속할까요?')) return;
      trip = j; dayIdx = 0; normalize(); save(); render(); toast('복원했어요 📥');
    }catch(_){ toast('올바른 백업 파일이 아니에요'); }
  };
  r.readAsText(f);
  e.target.value = '';
}
/* .ics 생성 — pairs: [day, item][] */
function downloadICS(pairs, name){
  const pad = n => String(n).padStart(2, '0');
  const stamp = (date, time, addMin=0) => {
    const [y, m, d] = date.split('-').map(Number);
    const [h, mi]   = (time || '09:00').split(':').map(Number);
    const dt = new Date(y, m-1, d, h, mi + addMin);
    return `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
  };
  const enc = s => String(s || '').replace(/[\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const body = pairs.map(([d, it]) => [
    'BEGIN:VEVENT',
    `UID:${it.id}@trip-plan`,
    `DTSTART:${stamp(d.date, it.time)}`,
    `DTEND:${stamp(d.date, it.time, 60)}`,
    `SUMMARY:${enc(it.title)}`,
    `LOCATION:${enc(it.place || '')}`,
    `DESCRIPTION:${enc([it.move, it.note, it.warn && '⚠️ ' + it.warn].filter(Boolean).join('\n'))}`,
    it.lat != null ? `GEO:${it.lat};${it.lng}` : '',
    'END:VEVENT'
  ].filter(Boolean).join('\r\n')).join('\r\n');

  download(`${(name || 'trip').replace(/\s+/g,'_')}.ics`, new Blob(
    ['BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//trip-plan//KO\r\nCALSCALE:GREGORIAN\r\n' + body + '\r\nEND:VCALENDAR'],
    { type:'text/calendar' }));
  toast('캘린더 파일을 저장했어요 🗓️');
}

/* ==========================================================
   테마
   ========================================================== */
const THEMES = ['auto', 'light', 'dark'];
const themeLabel = () => ({ auto:'시스템 따라', light:'라이트', dark:'다크' })[localStorage.getItem('trip-theme') || 'auto'];
function applyTheme(){
  const t = localStorage.getItem('trip-theme') || 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
function cycleTheme(){
  const cur = localStorage.getItem('trip-theme') || 'auto';
  localStorage.setItem('trip-theme', THEMES[(THEMES.indexOf(cur) + 1) % 3]);
  applyTheme(); render(); toast('테마: ' + themeLabel());
}

/* ==========================================================
   UI 헬퍼
   ========================================================== */
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
const emptyBox = (msg, em='📭') => `<div class="empty"><span class="em">${em}</span>${msg}</div>`;

let toastT;
function toast(msg){
  const el = $('#toast');
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 1900);
}
function sheet(title, html){
  closeSheet();
  const el = document.createElement('div');
  el.className = 'sheet'; el.id = 'sheet';
  el.innerHTML = `<div class="sheet-bg"></div>
    <div class="sheet-in">
      <div class="sheet-grab"></div>
      <h3 class="sheet-t">${esc(title)}<button class="x" id="sheetX">✕</button></h3>
      ${html}
    </div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  $('.sheet-bg', el).onclick = closeSheet;
  $('#sheetX', el).onclick = closeSheet;
}
function closeSheet(){
  const el = $('#sheet');
  if (el) el.remove();
  document.body.style.overflow = '';
}
function confetti(){
  const box = $('#fx');
  const cols = ['#ffd23f','#5b4bd6','#d6336c','#14b8a6','#3b82f6','#ff8fb5'];
  for (let i = 0; i < 26; i++){
    const c = document.createElement('div');
    c.className = 'cf';
    c.style.left = Math.random()*100 + 'vw';
    c.style.top = '-20px';
    c.style.background = cols[i % cols.length];
    c.style.animationDuration = (1.1 + Math.random()*0.9) + 's';
    c.style.animationDelay = (Math.random()*0.25) + 's';
    box.appendChild(c);
    setTimeout(() => c.remove(), 2400);
  }
}

/* ==========================================================
   탭 / 렌더
   ========================================================== */
function setTab(t){
  tab = t;
  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  ['overview','schedule','docs','more'].forEach(v =>
    $('#view' + v[0].toUpperCase() + v.slice(1)).classList.toggle('hidden', v !== t));
  $('#days').classList.toggle('hidden', t === 'docs' || t === 'more');
}
function render(){
  renderHero();
  renderDays();
  if (tab === 'overview') renderOverview();
  if (tab === 'schedule') renderSchedule();
  if (tab === 'docs')     renderDocs();
  if (tab === 'more')     renderMore();
  $('#navPrev').disabled = dayIdx === 0;
  $('#navNext').disabled = dayIdx === trip.days.length - 1;
}

/* ==========================================================
   이벤트 바인딩
   ========================================================== */
function bind(){
  $('#tabs').onclick = e => {
    const b = e.target.closest('.tab'); if (!b) return;
    setTab(b.dataset.tab); render();
    window.scrollTo({ top:0, behavior:'smooth' });
  };
  $('#days').onclick = e => {
    const b = e.target.closest('.day-chip'); if (!b) return;
    dayIdx = +b.dataset.day; render();
  };
  $('#navPrev').onclick = () => { if (dayIdx > 0){ dayIdx--; render(); } };
  $('#navNext').onclick = () => { if (dayIdx < trip.days.length-1){ dayIdx++; render(); } };
  $('#navNow').onclick  = goNow;
  $('#btnMore').onclick = () => { setTab('more'); render(); window.scrollTo({top:0,behavior:'smooth'}); };
  $('#btnShare').onclick = shareOrCopy;

  /* 위임: 일정/서류 버튼 */
  document.addEventListener('click', e => {
    const chk = e.target.closest('[data-check]');
    if (chk){
      const d = trip.days[dayIdx];
      const it = d.items.find(x => x.id === chk.dataset.check);
      it.done = !it.done;
      save();
      if (it.done){
        confetti();
        toast(dayDone(d) ? `${fmtMD(d.date)} 완주! 🎉 도장 획득` : '완료! ✅');
      }
      render();
      return;
    }
    const ed = e.target.closest('[data-edit]'); if (ed) return openItem(ed.dataset.edit);
    const dl = e.target.closest('[data-del]');  if (dl) return delItem(dl.dataset.del);
    const ic = e.target.closest('[data-ics]');
    if (ic){
      const d = trip.days[dayIdx];
      const it = d.items.find(x => x.id === ic.dataset.ics);
      return downloadICS([[d, it]], it.title);
    }
    const dc = e.target.closest('[data-doc]'); if (dc) return openDocFile(dc.dataset.doc);

    const fe = e.target.closest('[data-food-edit]'); if (fe) return openFood(fe.dataset.foodEdit);
    const fa = e.target.closest('[data-food-add]');  if (fa) return foodToSchedule(fa.dataset.foodAdd);
    const ft = e.target.closest('[data-food-try]');
    if (ft){
      const f = trip.food.find(x => x.id === ft.dataset.foodTry);
      f.tried = !f.tried; save(); render();
      if (f.tried) toast('가봤어요 표시 ✅');
      return;
    }
  });

  /* 좌우 스와이프로 날짜 이동 */
  let sx = 0, sy = 0;
  document.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive:true });
  document.addEventListener('touchend', e => {
    if ($('#sheet') || tab === 'docs' || tab === 'more') return;
    if (e.target.closest('.map, .days, .leaflet-container')) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 65 || Math.abs(dy) > 55) return;
    if (dx < 0 && dayIdx < trip.days.length-1){ dayIdx++; render(); }
    if (dx > 0 && dayIdx > 0){ dayIdx--; render(); }
  }, { passive:true });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSheet();
    if ($('#sheet')) return;
    if (e.key === 'ArrowLeft'  && dayIdx > 0){ dayIdx--; render(); }
    if (e.key === 'ArrowRight' && dayIdx < trip.days.length-1){ dayIdx++; render(); }
  });
}

async function shareOrCopy(){
  const d = trip.days[dayIdx];
  const txt = `📅 ${trip.title} · ${fmtMD(d.date)}(${fmtDow(d.date)}) ${d.city}\n\n` +
    d.items.map(i => `${i.time} ${i.title}${i.place ? ' @' + i.place : ''}`).join('\n');
  try{
    if (navigator.share) await navigator.share({ title: trip.title, text: txt });
    else { await navigator.clipboard.writeText(txt); toast('일정을 복사했어요 📋'); }
  }catch(_){ /* 사용자가 취소 */ }
}

/* ==========================================================
   시작
   ========================================================== */
function start(){
  applyTheme();
  load();
  /* 오늘이 여행 기간이면 그 날로 */
  const i = trip.days.findIndex(d => d.date === todayStr());
  dayIdx = i >= 0 ? i : 0;
  bind();
  setTab('overview');
  render();
  if (firstRun) openSetup();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}
document.addEventListener('DOMContentLoaded', start);
