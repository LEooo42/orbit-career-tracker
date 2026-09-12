"use strict";

const STORAGE_KEY = "orbit-pet-prep-tracker-v1";
const DEFAULT_DATA = {
  exam: { name: "PET — April 2027", date: "", targetScore: 690 },
  mocks: [],
  goals: [
    { id: "goal-target", title: "Reach 690+ on a full timed mock", metric: "overall", target: 690, date: "2027-03-20", notes: "Aim to hit target more than once before exam day.", done: false }
  ],
  todos: [
    { id: "todo-diagnostic", title: "Complete one full Russian PET diagnostic", category: "Mock", date: "", notes: "Record score and classify errors before changing the study plan.", done: false },
    { id: "todo-review", title: "Build an error log from every mock", category: "Review", date: "", notes: "Track concept gaps, careless errors, timing issues, and unknown vocabulary.", done: false }
  ],
  resources: []
};

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const clone = v => JSON.parse(JSON.stringify(v));
const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : "i-" + Date.now() + "-" + Math.random().toString(16).slice(2));
const escapeHtml = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
const safeUrl = v => { try { const u = new URL(String(v || "")); return ["http:","https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } };
const formatDate = v => v ? new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(new Date(v + "T12:00:00")) : "No date";
const shortDate = v => formatDate(v).replace(/,\s\d{4}$/, "");
const daysUntil = v => { if (!v) return null; const t = new Date(v + "T12:00:00"); const n = new Date(); n.setHours(12,0,0,0); return Math.ceil((t-n)/864e5); };
const validData = v => v && v.exam && Array.isArray(v.mocks) && Array.isArray(v.goals) && Array.isArray(v.todos) && Array.isArray(v.resources);
const numberOrNull = v => (v === "" || v == null || !Number.isFinite(Number(v))) ? null : Number(v);
const signed = v => !Number.isFinite(v) ? "—" : (v > 0 ? "+" + v : String(v));
const cap = v => v ? v.charAt(0).toUpperCase() + v.slice(1) : "";
const average = a => { const c = a.filter(Number.isFinite); return c.length ? Math.round(c.reduce((x,y)=>x+y,0)/c.length) : null; };

let data = load();

function load(){
  try{
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return validData(stored) ? stored : clone(DEFAULT_DATA);
  }catch{
    return clone(DEFAULT_DATA);
  }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function render(){
  renderSummary();
  renderTabs();
  renderOverview();
  renderMocks();
  renderGoals();
  renderTodos();
  renderResources();
}

function renderSummary(){
  const sorted = data.mocks.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const latest = sorted[sorted.length-1];
  const target = Number(data.exam.targetScore) || 690;
  const distance = daysUntil(data.exam.date);
  $("#targetScore").textContent = target;
  $("#latestScore").textContent = latest ? latest.total : "—";
  $("#mockCount").textContent = data.mocks.length;
  if(latest){
    const gap = latest.total-target;
    $("#targetGap").textContent = gap===0 ? "Target reached" : (gap>0 ? gap+" above target" : Math.abs(gap)+" points to target");
    $("#latestMeta").textContent = latest.name + " · " + formatDate(latest.date);
  }else{
    $("#targetGap").textContent = "No mock logged yet";
    $("#latestMeta").textContent = "No attempts yet";
  }
  if(!data.exam.date){
    $("#countdown").textContent = "Set date";
    $("#examDateNote").textContent = "Open exam setup to add the official date";
  }else if(distance<0){
    $("#countdown").textContent = "Exam passed";
    $("#examDateNote").textContent = (data.exam.name || "PET") + " · " + formatDate(data.exam.date);
  }else if(distance===0){
    $("#countdown").textContent = "Today";
    $("#examDateNote").textContent = data.exam.name || "PET";
  }else{
    $("#countdown").textContent = distance + " day" + (distance===1 ? "" : "s");
    $("#examDateNote").textContent = (data.exam.name || "PET") + " · " + formatDate(data.exam.date);
  }
  const completed = data.todos.filter(x=>x.done).length;
  $("#taskCompletion").textContent = completed + " of " + data.todos.length + " tasks complete";
}

function renderTabs(){
  $("#mockTabCount").textContent = data.mocks.length;
  $("#goalTabCount").textContent = data.goals.filter(x=>!x.done).length;
  $("#todoTabCount").textContent = data.todos.filter(x=>!x.done).length;
  $("#resourceTabCount").textContent = data.resources.length;
}

function renderOverview(){
  const sorted = data.mocks.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const totals = sorted.map(x=>Number(x.total)).filter(Number.isFinite);
  $("#bestScore").textContent = totals.length ? Math.max.apply(null,totals) : "—";
  $("#averageScore").textContent = totals.length ? average(totals.slice(-3)) : "—";
  $("#improvementScore").textContent = totals.length>=2 ? signed(totals[totals.length-1]-totals[0]) : "—";
  $("#openTasks").textContent = data.todos.filter(x=>!x.done).length;
  renderOverallChart(sorted);
  renderSectionChart(sorted);
  const upcoming = data.todos.filter(x=>!x.done).map(x=>Object.assign({},x,{kind:"To-Do"}))
    .concat(data.goals.filter(x=>!x.done).map(x=>Object.assign({},x,{kind:"Goal"})))
    .filter(x=>x.date).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6);
  $("#upcomingList").innerHTML = upcoming.length ? upcoming.map(x =>
    '<div class="upcoming-row"><span class="kind">'+escapeHtml(x.kind)+'</span><strong>'+escapeHtml(x.title)+'</strong><time datetime="'+escapeHtml(x.date)+'">'+shortDate(x.date)+'</time></div>'
  ).join("") : '<div class="empty-state">No dated goals or tasks yet.</div>';
}

function chartSvg(seriesList, options){
  options = options || {};
  const points = [];
  seriesList.forEach(s=>s.values.forEach((v,i)=>{ if(Number.isFinite(v)) points.push({value:v,index:i}); }));
  if(!points.length) return '<div class="chart-empty">Log a mock to start your progression graph.</div>';
  const width=680, height=220, pad={left:42,right:18,top:16,bottom:28};
  const n = Math.max.apply(null, seriesList.map(s=>s.values.length));
  const minY = options.fixedMin!=null ? options.fixedMin : Math.floor((Math.min.apply(null,points.map(p=>p.value))-10)/10)*10;
  const maxY = options.fixedMax!=null ? options.fixedMax : Math.ceil((Math.max.apply(null,points.map(p=>p.value))+10)/10)*10;
  const usableW=width-pad.left-pad.right, usableH=height-pad.top-pad.bottom;
  const x = i => n<=1 ? pad.left+usableW/2 : pad.left+i*usableW/(n-1);
  const y = v => pad.top+(maxY-v)*usableH/Math.max(1,maxY-minY);
  let grid="";
  for(let i=0;i<=4;i++){
    const val=Math.round(maxY-(maxY-minY)*i/4), yy=y(val);
    grid += '<line class="chart-grid" x1="'+pad.left+'" x2="'+(width-pad.right)+'" y1="'+yy+'" y2="'+yy+'"></line>';
    grid += '<text class="chart-axis-label" x="'+(pad.left-7)+'" y="'+(yy+3)+'" text-anchor="end">'+val+'</text>';
  }
  let target="";
  if(Number.isFinite(options.target) && options.target>=minY && options.target<=maxY){
    const ty=y(options.target);
    target='<line class="series-target" x1="'+pad.left+'" x2="'+(width-pad.right)+'" y1="'+ty+'" y2="'+ty+'"></line>';
  }
  let paths="";
  seriesList.forEach(series=>{
    const pts=series.values.map((v,i)=>Number.isFinite(v)?[x(i),y(v),v]:null).filter(Boolean);
    if(!pts.length) return;
    const d=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
    paths += '<path class="series-'+series.className+'" d="'+d+'"></path>';
    pts.forEach(p=>{ paths += '<circle class="chart-dot '+series.className+'" cx="'+p[0]+'" cy="'+p[1]+'" r="4"><title>'+escapeHtml(series.label)+': '+p[2]+'</title></circle>'; });
  });
  let labels="";
  (options.labels||[]).forEach((label,i)=>{
    if(i===0 || i===n-1 || n<=6 || i%Math.ceil(n/5)===0){
      labels += '<text class="chart-axis-label" x="'+x(i)+'" y="'+(height-8)+'" text-anchor="middle">'+escapeHtml(label)+'</text>';
    }
  });
  return '<svg viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none" role="img" aria-label="Score progression chart">'+grid+target+paths+labels+'</svg>';
}

function renderOverallChart(sorted){
  $("#overallChart").innerHTML = chartSvg(
    [{label:"Total",className:"total",values:sorted.map(x=>Number(x.total))}],
    {fixedMin:200,fixedMax:800,target:Number(data.exam.targetScore),labels:sorted.map(x=>x.date?x.date.slice(5):"")}
  );
}
function renderSectionChart(sorted){
  $("#sectionChart").innerHTML = chartSvg([
    {label:"Quantitative",className:"quant",values:sorted.map(x=>numberOrNull(x.quantitative))},
    {label:"Verbal",className:"verbal",values:sorted.map(x=>numberOrNull(x.verbal))},
    {label:"English",className:"english",values:sorted.map(x=>numberOrNull(x.english))}
  ],{fixedMin:50,fixedMax:150,labels:sorted.map(x=>x.date?x.date.slice(5):"")});
}

function renderMocks(){
  const sorted = data.mocks.slice().sort((a,b)=>b.date.localeCompare(a.date));
  const chronological = data.mocks.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const delta={};
  chronological.forEach((x,i)=>delta[x.id]=i?x.total-chronological[i-1].total:null);
  $("#mockRows").innerHTML = sorted.map(x=>{
    const d=delta[x.id], url=safeUrl(x.sourceUrl);
    return '<tr><td>'+shortDate(x.date)+'</td><td>'+(url?'<a class="resource-link" href="'+escapeHtml(url)+'" target="_blank" rel="noopener">'+escapeHtml(x.name)+'</a>':escapeHtml(x.name))+'</td><td class="score">'+escapeHtml(x.total)+'</td><td>'+(x.quantitative||"—")+'</td><td>'+(x.verbal||"—")+'</td><td>'+(x.english||"—")+'</td><td class="delta '+(d>0?"up":d<0?"down":"")+'">'+(d==null?"—":signed(d))+'</td><td><button class="icon-button" data-delete-mock="'+escapeHtml(x.id)+'" aria-label="Delete mock">×</button></td></tr>';
  }).join("");
  $("#mockEmpty").parentElement.classList.toggle("is-empty",sorted.length===0);
}

function recordRow(x,kind){
  const badge = kind==="goal" ? cap(x.metric||"custom")+(x.target?" · "+x.target:"") : (x.category||"Other");
  return '<article class="record-row '+(x.done?"is-done":"")+'"><input class="record-check" type="checkbox" data-toggle-'+kind+'="'+escapeHtml(x.id)+'" '+(x.done?"checked":"")+' aria-label="Toggle '+escapeHtml(x.title)+'"><div class="record-copy"><h3>'+escapeHtml(x.title)+'</h3>'+(x.notes?'<p>'+escapeHtml(x.notes)+'</p>':"")+'</div><span class="badge">'+escapeHtml(badge)+'</span><time datetime="'+escapeHtml(x.date||"")+'">'+(x.date?shortDate(x.date):"No date")+'</time><button class="icon-button" data-delete-'+kind+'="'+escapeHtml(x.id)+'" aria-label="Delete '+escapeHtml(x.title)+'">×</button></article>';
}
function renderGoals(){
  const sorted=data.goals.slice().sort((a,b)=>Number(a.done)-Number(b.done)||(a.date||"9999").localeCompare(b.date||"9999"));
  $("#goalList").innerHTML=sorted.length?sorted.map(x=>recordRow(x,"goal")).join(""):'<div class="empty-state">No goals yet. Add a milestone for the score or habit you want to reach.</div>';
}
function renderTodos(){
  const sorted=data.todos.slice().sort((a,b)=>Number(a.done)-Number(b.done)||(a.date||"9999").localeCompare(b.date||"9999"));
  $("#todoList").innerHTML=sorted.length?sorted.map(x=>recordRow(x,"todo")).join(""):'<div class="empty-state">Nothing on the To-Do list yet.</div>';
}
function renderResources(){
  const sorted=data.resources.slice().sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
  $("#resourceGrid").innerHTML=sorted.length?sorted.map(x=>{
    const url=safeUrl(x.url), image=x.imageData||safeUrl(x.imageUrl);
    return '<article class="resource-card '+(image?"":"no-image")+'">'+(image?'<img class="resource-image" src="'+escapeHtml(image)+'" alt="" loading="lazy">':"")+'<div class="resource-copy"><span class="label">'+escapeHtml(x.kind||"Resource")+'</span><h3>'+escapeHtml(x.title)+'</h3>'+(x.notes?'<p>'+escapeHtml(x.notes)+'</p>':"")+'<div class="resource-actions">'+(url?'<a class="resource-link" href="'+escapeHtml(url)+'" target="_blank" rel="noopener">Open source ↗</a>':'<span></span>')+'<button class="icon-button" data-delete-resource="'+escapeHtml(x.id)+'" aria-label="Delete '+escapeHtml(x.title)+'">×</button></div></div></article>';
  }).join(""):'<div class="empty-state">Save practice tests, theory pages, course links, images, and useful PET references here.</div>';
}

function openDialog(id){ const d=$("#"+id); if(d&&!d.open)d.showModal(); }
function closeDialog(id){ const d=$("#"+id); if(d&&d.open)d.close(); }
function closeMenus(){ $$("details[open]").forEach(x=>x.removeAttribute("open")); }
function openMockDialog(){ const f=$("#mockForm"); if(!f.date.value)f.date.value=new Date().toISOString().slice(0,10); openDialog("mockDialog"); }
function optionalScore(v){ if(v==null||String(v).trim()==="")return ""; return Math.max(50,Math.min(150,Number(v)||50)); }
function fileToDataUrl(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(String(r.result||"")); r.onerror=reject; r.readAsDataURL(file); }); }

$("#mainTabs").addEventListener("click",e=>{
  const b=e.target.closest("[data-tab]"); if(!b)return;
  $$("#mainTabs button").forEach(x=>x.classList.toggle("active",x===b));
  $$(".view").forEach(v=>v.classList.toggle("active",v.dataset.view===b.dataset.tab));
});
$("#settingsButton").addEventListener("click",()=>{
  const f=$("#settingsForm"); f.examName.value=data.exam.name||""; f.examDate.value=data.exam.date||""; f.targetScore.value=data.exam.targetScore||690; openDialog("settingsDialog");
});
$("#quickMock").addEventListener("click",openMockDialog);
$("#addMock").addEventListener("click",openMockDialog);
$("#addGoal").addEventListener("click",()=>openDialog("goalDialog"));
$("#addTodo").addEventListener("click",()=>openDialog("todoDialog"));
$("#addResource").addEventListener("click",()=>openDialog("resourceDialog"));
$$("[data-close]").forEach(b=>b.addEventListener("click",()=>closeDialog(b.dataset.close)));
$$("dialog").forEach(d=>d.addEventListener("click",e=>{ if(e.target===d)d.close(); }));

$("#settingsForm").addEventListener("submit",e=>{
  e.preventDefault(); const f=new FormData(e.currentTarget);
  data.exam.name=String(f.get("examName")||"").trim()||"PET";
  data.exam.date=String(f.get("examDate")||"");
  data.exam.targetScore=Math.max(200,Math.min(800,Number(f.get("targetScore"))||690));
  save(); closeDialog("settingsDialog"); render();
});
$("#mockForm").addEventListener("submit",e=>{
  e.preventDefault(); const f=new FormData(e.currentTarget);
  data.mocks.push({id:makeId(),date:String(f.get("date")||""),name:String(f.get("name")||"").trim(),total:Math.max(200,Math.min(800,Number(f.get("total"))||200)),quantitative:optionalScore(f.get("quantitative")),verbal:optionalScore(f.get("verbal")),english:optionalScore(f.get("english")),sourceUrl:String(f.get("sourceUrl")||"").trim(),notes:String(f.get("notes")||"").trim(),createdAt:new Date().toISOString()});
  save(); e.currentTarget.reset(); closeDialog("mockDialog"); render();
});
$("#goalForm").addEventListener("submit",e=>{
  e.preventDefault(); const f=new FormData(e.currentTarget);
  data.goals.push({id:makeId(),title:String(f.get("title")||"").trim(),metric:String(f.get("metric")||"custom"),target:f.get("target")===""?"":Number(f.get("target")),date:String(f.get("date")||""),notes:String(f.get("notes")||"").trim(),done:false,createdAt:new Date().toISOString()});
  save(); e.currentTarget.reset(); closeDialog("goalDialog"); render();
});
$("#todoForm").addEventListener("submit",e=>{
  e.preventDefault(); const f=new FormData(e.currentTarget);
  data.todos.push({id:makeId(),title:String(f.get("title")||"").trim(),category:String(f.get("category")||"Other"),date:String(f.get("date")||""),notes:String(f.get("notes")||"").trim(),done:false,createdAt:new Date().toISOString()});
  save(); e.currentTarget.reset(); closeDialog("todoDialog"); render();
});
$("#resourceForm").addEventListener("submit",async e=>{
  e.preventDefault(); const formEl=e.currentTarget, f=new FormData(formEl), file=formEl.imageFile.files[0]; let imageData="";
  if(file){ if(file.size>1.25*1024*1024){ alert("Please keep uploaded images under 1.25 MB so browser storage does not fill up."); return; } imageData=await fileToDataUrl(file); }
  data.resources.push({id:makeId(),title:String(f.get("title")||"").trim(),kind:String(f.get("kind")||"Other"),url:String(f.get("url")||"").trim(),imageUrl:String(f.get("imageUrl")||"").trim(),imageData:imageData,notes:String(f.get("notes")||"").trim(),createdAt:new Date().toISOString()});
  save(); formEl.reset(); closeDialog("resourceDialog"); render();
});

$("#mockRows").addEventListener("click",e=>{ const b=e.target.closest("[data-delete-mock]"); if(!b||!confirm("Delete this mock attempt?"))return; data.mocks=data.mocks.filter(x=>x.id!==b.dataset.deleteMock); save(); render(); });
$("#goalList").addEventListener("change",e=>{ const i=e.target.closest("[data-toggle-goal]"); if(!i)return; const x=data.goals.find(g=>g.id===i.dataset.toggleGoal); if(x){x.done=i.checked;x.completedAt=x.done?new Date().toISOString():null;save();render();} });
$("#todoList").addEventListener("change",e=>{ const i=e.target.closest("[data-toggle-todo]"); if(!i)return; const x=data.todos.find(t=>t.id===i.dataset.toggleTodo); if(x){x.done=i.checked;x.completedAt=x.done?new Date().toISOString():null;save();render();} });
$("#goalList").addEventListener("click",e=>{ const b=e.target.closest("[data-delete-goal]"); if(!b||!confirm("Delete this goal?"))return; data.goals=data.goals.filter(x=>x.id!==b.dataset.deleteGoal);save();render(); });
$("#todoList").addEventListener("click",e=>{ const b=e.target.closest("[data-delete-todo]"); if(!b||!confirm("Delete this task?"))return; data.todos=data.todos.filter(x=>x.id!==b.dataset.deleteTodo);save();render(); });
$("#resourceGrid").addEventListener("click",e=>{ const b=e.target.closest("[data-delete-resource]"); if(!b||!confirm("Delete this resource?"))return; data.resources=data.resources.filter(x=>x.id!==b.dataset.deleteResource);save();render(); });

$("#exportData").addEventListener("click",()=>{
  closeMenus(); const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}), url=URL.createObjectURL(blob), a=document.createElement("a"); a.href=url; a.download="pet-prep-tracker-data.json"; a.click(); URL.revokeObjectURL(url);
});
$("#importData").addEventListener("click",()=>{ closeMenus(); $("#importFile").click(); });
$("#importFile").addEventListener("change",async e=>{
  const file=e.target.files[0]; if(!file)return;
  try{ const imported=JSON.parse(await file.text()); if(!validData(imported))throw new Error(); if(!confirm("Replace this browser's PET tracker data with the imported file?"))return; data=imported;save();render(); }
  catch{ alert("This does not appear to be a valid PET tracker backup."); }
  finally{ e.target.value=""; }
});
$("#resetData").addEventListener("click",()=>{ closeMenus(); if(!confirm("Reset all PET tracker data in this browser?"))return; data=clone(DEFAULT_DATA);save();render(); });
window.addEventListener("storage",e=>{ if(e.key!==STORAGE_KEY||!e.newValue)return; try{ const n=JSON.parse(e.newValue); if(validData(n)){data=n;render();} }catch{} });

render();
