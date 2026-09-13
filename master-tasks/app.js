"use strict";

const STORAGE_KEY = "orbit-master-tasks-v1";
const AREAS = ["Academics","Cyber","Astron","PET","IDF","Traveling","Personal","Other"];
const STATUSES = ["Inbox","Next","In Progress","Waiting","Done"];
const PRIORITY_WEIGHT = {Critical:0,High:1,Medium:2,Low:3};

const QUOTES = [
  ["Start before you're ready.","Daily note"],
  ["Small steps still change the map.","Daily note"],
  ["The work gets lighter once it is named.","Daily note"],
  ["Consistency beats intensity you cannot repeat.","Daily note"],
  ["Make the next step obvious.","Daily note"],
  ["Done is information. Perfect is a delay.","Daily note"],
  ["Momentum likes simple systems.","Daily note"]
];

const BRIGHT_SPOTS = [
  {text:"Reusable rockets have turned orbital launches into something closer to infrastructure than spectacle — a huge shift within a single generation.",meta:"Science & engineering · long-term progress"},
  {text:"Solar and wind keep getting cheaper to deploy in many parts of the world, pushing clean energy from niche technology toward default infrastructure.",meta:"Energy · long-term progress"},
  {text:"Astronomers now routinely study atmospheres of planets around other stars — a capability that was basically science fiction not long ago.",meta:"Space science · perspective"},
  {text:"Global child mortality has fallen dramatically over the past few decades, one of the largest quiet improvements in human wellbeing.",meta:"Health · long-term progress"},
  {text:"Modern weather forecasting can now give useful warnings days ahead for events that once arrived with almost no notice.",meta:"Science serving people · perspective"},
  {text:"Open-source software lets a student with a laptop use tools that once belonged only to universities, governments and large companies.",meta:"Technology · perspective"}
];

const starter = {
  brightIndex: 0,
  tasks: [
    {id:"seed-1",title:"Finish CMake practice page",area:"Cyber",status:"In Progress",date:"2026-09-15",priority:"High",major:false,hours:1.5,notes:"Make sure the executable workflow is clear and documented.",attachments:[],createdAt:"2026-09-13T10:00:00.000Z",completedAt:null},
    {id:"seed-2",title:"Prepare AstroTrack component order",area:"Academics",status:"Next",date:"2026-09-16",priority:"High",major:false,hours:1,notes:"Confirm GPS, LED, buzzer and ambient light sensor with the existing core list.",attachments:[],createdAt:"2026-09-13T10:05:00.000Z",completedAt:null},
    {id:"seed-3",title:"PET full combined mock",area:"PET",status:"Next",date:"2026-09-20",priority:"Medium",major:true,hours:3,notes:"Use a full combined-format practice test and log the result in the PET tracker.",attachments:[],createdAt:"2026-09-13T10:10:00.000Z",completedAt:null},
    {id:"seed-4",title:"Submit IDF preference questionnaire",area:"IDF",status:"Next",date:"2026-10-15",priority:"Critical",major:true,hours:0.5,notes:"Final deadline.",attachments:[],createdAt:"2026-09-13T10:15:00.000Z",completedAt:null}
  ]
};

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const clone = v => JSON.parse(JSON.stringify(v));
const makeId = () => crypto.randomUUID?.() || "t-"+Date.now()+"-"+Math.random().toString(16).slice(2);
const escapeHtml = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const todayISO = () => new Date().toISOString().slice(0,10);
const formatDate = v => v ? new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(new Date(v+"T12:00:00")) : "No date";
const daysUntil = v => {
  if(!v) return null;
  const t=new Date(v+"T12:00:00"), n=new Date(); n.setHours(12,0,0,0);
  return Math.ceil((t-n)/864e5);
};
const validData = v => v && Array.isArray(v.tasks);

let data = load();
let editingId = null;
let pendingAttachments = [];

function load(){
  try{
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return validData(stored) ? stored : clone(starter);
  }catch{return clone(starter);}
}
function save(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); }
function closeMenus(){ $$("details[open]").forEach(x=>x.removeAttribute("open")); }
function fileToDataUrl(file){ return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=reject;r.readAsDataURL(file);}); }

function render(){
  renderSummary();
  renderFilters();
  renderTasks();
  renderDeadlines();
  renderBrightSpot();
  renderAreaChart();
  renderCompletionChart();
  renderStatusMix();
}

function openTasks(){ return data.tasks.filter(t=>t.status!=="Done"); }

function renderSummary(){
  const open=openTasks();
  const dueSoon=open.filter(t=>{const d=daysUntil(t.date);return d!==null&&d>=0&&d<=7;}).length;
  const done=data.tasks.filter(t=>t.status==="Done").length;
  const rate=data.tasks.length?Math.round(done/data.tasks.length*100):0;
  $("#openCount").textContent=open.length;
  $("#openNote").textContent=open.length ? (open.filter(t=>daysUntil(t.date)<0).length+" overdue") : "Nothing waiting";
  $("#dueSoonCount").textContent=dueSoon;
  $("#completedCount").textContent=done;
  $("#completionRate").textContent=rate+"% overall";
  const idx = new Date().getDate()%QUOTES.length;
  $("#quoteText").textContent=QUOTES[idx][0];
  $("#quoteSource").textContent=QUOTES[idx][1];
}

function renderFilters(){
  const current=$("#areaFilter").value||"all";
  const used=[...new Set(data.tasks.map(t=>t.area).filter(Boolean))];
  const options=["all",...AREAS.filter(a=>used.includes(a)),...used.filter(a=>!AREAS.includes(a))];
  $("#areaFilter").innerHTML=options.map(a=>'<option value="'+escapeHtml(a)+'">'+(a==="all"?"All areas":escapeHtml(a))+'</option>').join("");
  $("#areaFilter").value=options.includes(current)?current:"all";
}

function filteredTasks(){
  const q=$("#searchInput").value.trim().toLowerCase();
  const status=$("#statusFilter").value;
  const area=$("#areaFilter").value;
  const sort=$("#sortSelect").value;
  let rows=data.tasks.filter(t=>{
    if(status==="open"&&t.status==="Done") return false;
    if(status!=="open"&&status!=="all"&&t.status!==status) return false;
    if(area!=="all"&&t.area!==area) return false;
    if(q){
      const hay=[t.title,t.notes,t.area,t.status,t.priority].join(" ").toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  const smart=(a,b)=>{
    const ad=daysUntil(a.date), bd=daysUntil(b.date);
    const aLate=ad!==null&&ad<0?0:1, bLate=bd!==null&&bd<0?0:1;
    return Number(a.status==="Done")-Number(b.status==="Done")
      || aLate-bLate
      || Number(!a.major)-Number(!b.major)
      || (PRIORITY_WEIGHT[a.priority]??9)-(PRIORITY_WEIGHT[b.priority]??9)
      || (a.date||"9999").localeCompare(b.date||"9999")
      || (b.createdAt||"").localeCompare(a.createdAt||"");
  };
  const sorters={
    smart,
    due:(a,b)=>(a.date||"9999").localeCompare(b.date||"9999"),
    priority:(a,b)=>(PRIORITY_WEIGHT[a.priority]??9)-(PRIORITY_WEIGHT[b.priority]??9),
    created:(a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""),
    area:(a,b)=>(a.area||"").localeCompare(b.area||"")||(a.date||"9999").localeCompare(b.date||"9999")
  };
  rows.sort(sorters[sort]||smart);
  return rows;
}

function renderTasks(){
  const rows=filteredTasks();
  $("#visibleCount").textContent=rows.length+" task"+(rows.length===1?"":"s");
  $("#taskList").innerHTML=rows.length?rows.map(taskRow).join(""):'<div class="task-empty">No tasks match this view.</div>';
}

function taskRow(t){
  const d=daysUntil(t.date);
  const dateClass=d!==null&&d<0&&t.status!=="Done"?"late":"";
  const note=t.notes||((t.attachments||[]).length?((t.attachments||[]).length+" attachment"+((t.attachments||[]).length===1?"":"s")):"");
  return '<article class="task-row '+(t.status==="Done"?"done":"")+'" data-row="'+escapeHtml(t.id)+'">'+
    '<div class="task-main"><input class="task-check" type="checkbox" data-toggle="'+escapeHtml(t.id)+'" '+(t.status==="Done"?"checked":"")+' aria-label="Complete '+escapeHtml(t.title)+'"><div class="task-copy"><strong class="priority-'+escapeHtml(String(t.priority||"").toLowerCase())+'">'+(t.major?'<i class="major-dot"></i>':'')+escapeHtml(t.title)+'</strong>'+(note?'<small>'+escapeHtml(note)+'</small>':'')+'</div></div>'+
    '<span class="area-pill">'+escapeHtml(t.area||"Other")+'</span>'+
    '<time class="task-date '+dateClass+'" datetime="'+escapeHtml(t.date||"")+'">'+(t.date?formatDate(t.date):"—")+'</time>'+
    '<select class="inline-status" data-status="'+escapeHtml(t.id)+'">'+STATUSES.map(s=>'<option '+(s===t.status?"selected":"")+'>'+escapeHtml(s)+'</option>').join("")+'</select>'+
    '<button class="icon-button row-menu" data-edit="'+escapeHtml(t.id)+'" aria-label="Edit '+escapeHtml(t.title)+'">›</button>'+
  '</article>';
}

function renderDeadlines(){
  const items=openTasks().filter(t=>t.major&&t.date).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6);
  $("#deadlineList").innerHTML=items.length?items.map(t=>{
    const d=daysUntil(t.date), label=d===0?"Today":d===1?"1 day":d!=null&&d>1?d+" days":d!=null&&d<0?Math.abs(d)+"d late":"";
    return '<div class="deadline-row"><div class="deadline-date">'+escapeHtml(formatDate(t.date))+'</div><div class="deadline-copy"><strong>'+escapeHtml(t.title)+'</strong><small>'+escapeHtml(t.area)+' · '+escapeHtml(label)+'</small></div></div>';
  }).join(""):'<div class="empty-rail">Flag important dated tasks as major deadlines.</div>';
}

function renderBrightSpot(){
  if(!BRIGHT_SPOTS.length)return;
  const i=((data.brightIndex||0)%BRIGHT_SPOTS.length+BRIGHT_SPOTS.length)%BRIGHT_SPOTS.length;
  $("#brightText").textContent=BRIGHT_SPOTS[i].text;
  $("#brightMeta").textContent=BRIGHT_SPOTS[i].meta;
}

function renderAreaChart(){
  const counts={};
  openTasks().forEach(t=>counts[t.area]=(counts[t.area]||0)+1);
  const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!entries.length){$("#areaChart").innerHTML='<div class="empty-rail">No open workload yet.</div>';return;}
  const width=220,height=150,left=68,right=14,top=8,rowH=22,max=Math.max(...entries.map(x=>x[1]));
  let s='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Open tasks by area">';
  entries.forEach(([name,count],i)=>{
    const y=top+i*rowH,w=(width-left-right)*(count/max);
    s+='<text class="chart-axis" x="0" y="'+(y+12)+'">'+escapeHtml(name.slice(0,10))+'</text>';
    s+='<rect class="chart-grid" x="'+left+'" y="'+(y+3)+'" width="'+(width-left-right)+'" height="9"></rect>';
    s+='<rect class="chart-bar" x="'+left+'" y="'+(y+3)+'" width="'+w+'" height="9"></rect>';
    s+='<text class="chart-axis" x="'+(width-2)+'" y="'+(y+12)+'" text-anchor="end">'+count+'</text>';
  });
  s+='</svg>';$("#areaChart").innerHTML=s;
}

function renderCompletionChart(){
  const days=[];
  for(let i=13;i>=0;i--){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);days.push(d.toISOString().slice(0,10));}
  const vals=days.map(day=>data.tasks.filter(t=>t.completedAt&&t.completedAt.slice(0,10)===day).length);
  const width=220,height=150,pad={l:12,r:12,t:15,b:25},max=Math.max(1,...vals);
  const x=i=>pad.l+i*(width-pad.l-pad.r)/(days.length-1), y=v=>pad.t+(max-v)*(height-pad.t-pad.b)/max;
  let path=vals.map((v,i)=>(i?"L":"M")+x(i)+","+y(v)).join(" ");
  let s='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Tasks completed over the last 14 days">';
  for(let i=0;i<=3;i++){const yy=pad.t+i*(height-pad.t-pad.b)/3;s+='<line class="chart-grid" x1="'+pad.l+'" x2="'+(width-pad.r)+'" y1="'+yy+'" y2="'+yy+'"></line>';}
  s+='<path class="chart-line" d="'+path+'"></path>';
  vals.forEach((v,i)=>s+='<circle class="chart-dot" cx="'+x(i)+'" cy="'+y(v)+'" r="3"><title>'+days[i]+': '+v+'</title></circle>');
  s+='<text class="chart-axis" x="'+pad.l+'" y="'+(height-7)+'">'+days[0].slice(5)+'</text><text class="chart-axis" x="'+(width-pad.r)+'" y="'+(height-7)+'" text-anchor="end">'+days[days.length-1].slice(5)+'</text></svg>';
  $("#completionChart").innerHTML=s;
}

function renderStatusMix(){
  const counts=Object.fromEntries(STATUSES.map(s=>[s,data.tasks.filter(t=>t.status===s).length]));
  const max=Math.max(1,...Object.values(counts));
  $("#statusMix").innerHTML=STATUSES.map(s=>'<div class="status-row"><span>'+escapeHtml(s)+'</span><div class="status-track"><div class="status-fill" style="width:'+Math.round(counts[s]/max*100)+'%"></div></div><strong>'+counts[s]+'</strong></div>').join("");
}

function openDialogFor(task){
  editingId=task?.id||null;
  pendingAttachments=[];
  const f=$("#taskForm");
  f.reset();
  f.id.value=task?.id||"";
  f.title.value=task?.title||"";
  f.area.value=task?.area||"Academics";
  f.status.value=task?.status||"Inbox";
  f.date.value=task?.date||"";
  f.priority.value=task?.priority||"Medium";
  f.major.checked=Boolean(task?.major);
  f.hours.value=task?.hours??"";
  f.notes.value=task?.notes||"";
  $("#dialogTitle").textContent=task?"Edit task":"New task";
  $("#dialogEyebrow").textContent=task?"Task details":"Quick detail";
  $("#deleteTaskButton").style.visibility=task?"visible":"hidden";
  renderAttachments(task?.attachments||[]);
  $("#taskDialog").showModal();
}

function renderAttachments(existing){
  const all=[...existing,...pendingAttachments];
  $("#attachmentList").innerHTML=all.map((a,i)=>{
    const existingCount=existing.length;
    const isPending=i>=existingCount;
    return '<div class="attachment-row"><span>'+escapeHtml(a.name)+'</span><a href="'+escapeHtml(a.data)+'" download="'+escapeHtml(a.name)+'">Open</a><button type="button" data-remove-attachment="'+i+'" data-pending="'+(isPending?"1":"0")+'">×</button></div>';
  }).join("");
}

function closeDialog(id){const d=$("#"+id);if(d?.open)d.close();}

function askConfirm(message,label="Delete"){
  return new Promise(resolve=>{
    const d=$("#confirmDialog");$("#confirmMessage").textContent=message;$("#confirmAccept").textContent=label;
    const done=v=>{cleanup();if(d.open)d.close();resolve(v);};
    const submit=e=>{e.preventDefault();done(true);}, cancel=e=>{e?.preventDefault();done(false);};
    const cleanup=()=>{$("#confirmForm").removeEventListener("submit",submit);$("#confirmCancel").removeEventListener("click",cancel);$("#confirmClose").removeEventListener("click",cancel);d.removeEventListener("cancel",cancel);};
    $("#confirmForm").addEventListener("submit",submit);$("#confirmCancel").addEventListener("click",cancel);$("#confirmClose").addEventListener("click",cancel);d.addEventListener("cancel",cancel);d.showModal();
  });
}

$("#quickForm").addEventListener("submit",e=>{
  e.preventDefault();
  const f=new FormData(e.currentTarget),title=String(f.get("title")||"").trim();if(!title)return;
  data.tasks.push({id:makeId(),title,area:String(f.get("area")||"Other"),status:"Inbox",date:String(f.get("date")||""),priority:"Medium",major:false,hours:"",notes:"",attachments:[],createdAt:new Date().toISOString(),completedAt:null});
  save();e.currentTarget.reset();render();$("#quickTitle").focus();
});

$("#addDetailedTask").addEventListener("click",()=>openDialogFor(null));
$("#taskList").addEventListener("change",e=>{
  const toggle=e.target.closest("[data-toggle]");
  if(toggle){const t=data.tasks.find(x=>x.id===toggle.dataset.toggle);if(t){t.status=toggle.checked?"Done":"Next";t.completedAt=toggle.checked?new Date().toISOString():null;save();render();}return;}
  const status=e.target.closest("[data-status]");
  if(status){const t=data.tasks.find(x=>x.id===status.dataset.status);if(t){t.status=status.value;t.completedAt=status.value==="Done"?(t.completedAt||new Date().toISOString()):null;save();render();}}
});
$("#taskList").addEventListener("click",e=>{
  const b=e.target.closest("[data-edit]");if(!b)return;
  const t=data.tasks.find(x=>x.id===b.dataset.edit);if(t)openDialogFor(t);
});

["searchInput","statusFilter","areaFilter","sortSelect"].forEach(id=>$("#"+id).addEventListener(id==="searchInput"?"input":"change",renderTasks));
$("#nextBrightSpot").addEventListener("click",()=>{data.brightIndex=((data.brightIndex||0)+1)%BRIGHT_SPOTS.length;save();renderBrightSpot();});
$$("[data-close]").forEach(b=>b.addEventListener("click",()=>closeDialog(b.dataset.close)));
$$("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close();}));

$("#taskForm").files.addEventListener("change",async e=>{
  for(const file of Array.from(e.target.files||[])){
    if(file.size>1.25*1024*1024){alert(file.name+" is larger than 1.25 MB.");continue;}
    try{pendingAttachments.push({id:makeId(),name:file.name,type:file.type||"application/octet-stream",size:file.size,data:await fileToDataUrl(file)});}catch{}
  }
  const existing=editingId?(data.tasks.find(x=>x.id===editingId)?.attachments||[]):[];
  renderAttachments(existing);e.target.value="";
});

$("#attachmentList").addEventListener("click",e=>{
  const b=e.target.closest("[data-remove-attachment]");if(!b)return;
  const idx=Number(b.dataset.removeAttachment);
  if(editingId){
    const t=data.tasks.find(x=>x.id===editingId),existing=t?.attachments||[];
    if(idx<existing.length){existing.splice(idx,1);save();renderAttachments(existing);return;}
    pendingAttachments.splice(idx-existing.length,1);renderAttachments(existing);
  }else{pendingAttachments.splice(idx,1);renderAttachments([]);}
});

$("#taskForm").addEventListener("submit",e=>{
  e.preventDefault();
  const f=new FormData(e.currentTarget), title=String(f.get("title")||"").trim();if(!title)return;
  let t=editingId?data.tasks.find(x=>x.id===editingId):null;
  if(!t){t={id:makeId(),createdAt:new Date().toISOString(),attachments:[],completedAt:null};data.tasks.push(t);}
  const oldStatus=t.status;
  Object.assign(t,{title,area:String(f.get("area")||"Other"),status:String(f.get("status")||"Inbox"),date:String(f.get("date")||""),priority:String(f.get("priority")||"Medium"),major:f.get("major")==="on",hours:f.get("hours")===""?"":Number(f.get("hours")),notes:String(f.get("notes")||"").trim()});
  t.attachments=[...(t.attachments||[]),...pendingAttachments];
  if(t.status==="Done"&&oldStatus!=="Done")t.completedAt=new Date().toISOString();
  if(t.status!=="Done")t.completedAt=null;
  save();closeDialog("taskDialog");render();
});

$("#deleteTaskButton").addEventListener("click",async()=>{
  if(!editingId)return;
  const t=data.tasks.find(x=>x.id===editingId);
  if(!t||!await askConfirm('Delete "'+t.title+'"?',"Delete"))return;
  data.tasks=data.tasks.filter(x=>x.id!==editingId);save();closeDialog("taskDialog");render();
});

$("#exportData").addEventListener("click",()=>{
  closeMenus();const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="master-tasks-data.json";a.click();URL.revokeObjectURL(url);
});
$("#importData").addEventListener("click",()=>{closeMenus();$("#importFile").click();});
$("#importFile").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{const imported=JSON.parse(await file.text());if(!validData(imported))throw new Error();if(!await askConfirm("Replace this browser's Master Tasks data with the imported backup?","Replace"))return;data=imported;save();render();}
  catch{alert("This does not appear to be a valid Master Tasks backup.");}
  finally{e.target.value="";}
});
$("#resetData").addEventListener("click",async()=>{closeMenus();if(!await askConfirm("Reset all Master Tasks data in this browser?","Reset"))return;data=clone(starter);save();render();});
window.addEventListener("storage",e=>{if(e.key!==STORAGE_KEY||!e.newValue)return;try{const n=JSON.parse(e.newValue);if(validData(n)){data=n;render();}}catch{}});

$("#dialogArea").innerHTML=AREAS.map(a=>'<option>'+escapeHtml(a)+'</option>').join("");
render();
