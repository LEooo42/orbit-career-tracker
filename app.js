"use strict";

const STORAGE_KEY = "orbit-career-tracker-v1";
const categories = [
  ["academic", "Academic", "A"], ["engineering", "Engineering", "E"],
  ["research", "Research", "R"], ["observing", "Observing", "O"],
  ["conference", "Talks", "T"], ["teaching", "Mentorship", "M"],
  ["awards", "Awards", "W"]
];
const seedRows = [
  ["research", "Archive Berkeley coursework and write a one-page academic reflection", "2026-08-31", "Save the astronomy syllabus, transcript, history paper, assignments, and ten specific memories."],
  ["academic", "Take one full digital SAT diagnostic without preparation", "2026-08-31", "Record section scores and classify errors; intensive SAT preparation comes after the PET decision."],
  ["academic", "Confirm the Caltech chemistry requirement path", "2026-09-15", "Check the official transcript and create a documented remediation plan if chemistry is missing."],
  ["engineering", "Create the optical pointing project proposal, architecture, and GitHub repository", "2026-08-31", "Define measurable questions around exposure, blur, noise, jitter, and centroid accuracy."],
  ["conference", "Register for NASA Space Apps and monitor Israel or virtual options", "2026-08-26", "Participation remains optional; proceed only with a strong challenge and team."],
  ["engineering", "Secure a school supervisor and approve the flagship project scope", "2026-09-15", "Ask whether it can serve as the electronics final project and a competition entry."],
  ["awards", "Start the Young Scientists and Developers Competition submission", "2026-09-30", "Confirm eligibility, the nomination process, abstract requirements, and school responsibility."],
  ["academic", "Register for the winter PET", "2026-10-07", "Keep the official confirmation in the academic archive."],
  ["engineering", "Build the minimum viable optical image and centroid pipeline", "2026-10-31", "Capture images, save metadata, correct dark frames, detect points, and measure repeatability."],
  ["observing", "Complete an authentic exoplanet-transit analysis tutorial", "2026-10-31", "Produce the first light curve and document each reduction stage in your own words."],
  ["conference", "Make the final NASA Space Apps go/no-go decision", "2026-10-31", "Proceed only if the challenge fits scientific space work and preparation remains limited."],
  ["awards", "Submit Young Scientists abstract or selection materials", "2026-11-15", "State the problem, method, variables, metrics, and exact personal contribution without hype."],
  ["conference", "Complete NASA Space Apps if it passes the strategic gate", "2026-11-15", "Build one technically credible solution; skip this if the team or challenge is weak."],
  ["engineering", "Complete three controlled optical-system experiments", "2026-11-30", "Test exposure, blur, and simulated jitter against defined performance metrics."],
  ["academic", "Sit the winter PET", "2026-12-06", "Pause major project work five days before the test and protect sleep."],
  ["research", "Write a four-to-six-page preliminary technical report", "2026-12-31", "Include methods, early graphs, raw-data organization, failures, and next experiments."],
  ["academic", "Review PET results and choose the SAT, April PET, or combined branch", "2027-01-20", "Use a strict stopping rule so PET preparation does not consume the full year."],
  ["conference", "Attend at least one serious Israel Space Week event", "2027-01-28", "Prepare a 30-second introduction, three questions, and a simple project page."],
  ["engineering", "Finish project beta with calibration and jitter or temperature testing", "2027-01-31", "Prepare a one-page technical brief for external feedback."],
  ["teaching", "Request narrow technical feedback from relevant researchers or engineers", "2027-02-15", "Share a working prototype, preliminary data, repository, and three precise questions."],
  ["observing", "Collect at least half of the final experimental dataset", "2027-02-28", "Freeze core features and focus on controls, repetitions, uncertainty, and reproducibility."],
  ["observing", "Analyze at least five authentic exoplanet-transit datasets", "2027-02-28", "Compare data quality, reference-star choices, uncertainty, and failed reductions."],
  ["research", "Incorporate at least one external technical review", "2027-02-28", "Record the criticism, changes made, and limitations that remain."],
  ["academic", "Take the March SAT only if practice scores justify it", "2027-03-06", "Target 1550+ overall and 790–800 Math; otherwise move to a later date."],
  ["awards", "Present at Young Scientists or arrange equivalent external evaluation", "2027-03-31", "Prepare technical and nontechnical explanations, limitations, and contribution boundaries."],
  ["engineering", "Publish the optical project GitHub version 1.0", "2027-03-31", "Include setup, diagrams, data format, example analysis, results, and limitations."],
  ["academic", "Enter Bagrut protection mode and freeze extracurricular expansion", "2027-04-01", "No new hardware, clubs, certificates, or major redesigns through the exam period."],
  ["research", "Complete the final technical report and data archive", "2027-05-31", "Use controlled measurements, uncertainty, reproducible analysis, and honest limitations."],
  ["teaching", "Archive Magshimim work, collaboration, and mentorship examples", "2027-05-31", "Explain technologies, individual responsibility, difficult problems, and impact."],
  ["teaching", "Secure two future recommenders and preserve continuity notes", "2027-06-30", "One math or physics teacher and one electronics or computing teacher."],
  ["academic", "Archive transcripts, Bagrut records, course descriptions, and grading context", "2027-06-30", "Preserve official records and English explanations before systems or staff change."],
  ["engineering", "Publish the final project package", "2027-07-31", "Complete the report, repository, poster, demonstration video, and one-page summary."],
  ["research", "Create the end-of-grade-12 application evidence archive", "2027-07-31", "Document activities, hours, awards, project history, essay scenes, contacts, and open questions."]
];
const starter = { active: "2026–2027", years: {
  "2025–2026": { items: [
    { id: "berkeley", cat: "academic", title: "Complete the six-week UC Berkeley astrophysics program", date: "2026-08-14", notes: "Archive the syllabus, grade, assignments, and strongest work.", type: "achievement", done: true },
    { id: "physics97", cat: "academic", title: "Earn 97 on the Physics Bagrut", date: "2026-06-18", notes: "Evidence of sustained strength in advanced physics.", type: "achievement", done: true },
    { id: "price-paper", cat: "research", title: "Complete research paper on Derek de Solla Price and ancient computers", date: "2026-08-10", notes: "Preserve the final paper and instructor feedback.", type: "achievement", done: true }
  ]},
  "2026–2027": { items: seedRows.map((row, index) => ({ id: `seed-${index}`, cat: row[0], title: row[1], date: row[2], notes: row[3], type: "goal", done: false })) }
}};

const $ = selector => document.querySelector(selector);
const clone = value => JSON.parse(JSON.stringify(value));
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
const makeId = () => crypto.randomUUID?.() || `i-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const formatDate = value => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`)) : "No date";
const daysUntil = value => { if (!value) return null; const date = new Date(`${value}T12:00:00`); const today = new Date(); today.setHours(12, 0, 0, 0); return Math.ceil((date - today) / 864e5); };
const validData = value => value && typeof value.active === "string" && value.years && typeof value.years === "object" && Object.values(value.years).every(year => Array.isArray(year.items));

let data = load();
let activeCategory = "academic";
let showDone = false;

function load() {
  try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); return validData(stored) ? stored : clone(starter); }
  catch { return clone(starter); }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function currentItems() { return data.years[data.active]?.items || []; }

function render() {
  const items = currentItems();
  const complete = items.filter(item => item.done).length;
  const progress = items.length ? Math.round(complete / items.length * 100) : 0;
  const achievements = items.filter(item => item.type === "achievement").length;
  const nextItem = items.filter(item => !item.done && item.date).sort((a, b) => a.date.localeCompare(b.date)).find(item => (daysUntil(item.date) ?? -1) >= 0);

  $("#year").innerHTML = Object.keys(data.years).sort().map(year => `<option ${year === data.active ? "selected" : ""}>${escapeHtml(year)}</option>`).join("");
  $("#progressRing").style.setProperty("--progress", `${progress * 3.6}deg`);
  $("#progress").textContent = `${progress}%`;
  $("#progressNote").textContent = `${complete} / ${items.length} complete`;
  $("#nextDate").textContent = nextItem ? formatDate(nextItem.date) : "None";
  $("#nextTitle").textContent = nextItem?.title || "No upcoming goals";
  $("#achievements").textContent = achievements;

  $("#categoryTabs").innerHTML = categories.map(([id, name, letter]) => {
    const count = items.filter(item => item.cat === id && !item.done).length;
    return `<button data-category="${id}" class="${activeCategory === id ? "active" : ""}"><span>${letter}</span>${escapeHtml(name)}<small>${count}</small></button>`;
  }).join("");

  const category = categories.find(entry => entry[0] === activeCategory);
  const total = items.filter(item => item.cat === activeCategory).length;
  const done = items.filter(item => item.cat === activeCategory && item.done).length;
  const visible = items.filter(item => item.cat === activeCategory && (showDone || !item.done)).sort((a, b) => Number(a.done) - Number(b.done) || (a.date || "9999").localeCompare(b.date || "9999"));
  $("#categoryLabel").textContent = category[1];
  $("#categoryProgress").textContent = `${done} of ${total} complete`;
  $("#visibleCount").textContent = visible.length > 5 ? `Showing 5 of ${visible.length}` : `${visible.length} visible`;
  $("#taskList").innerHTML = visible.length ? visible.slice(0, 5).map(taskHtml).join("") : `<div class="empty-state">No ${showDone ? "items" : "open items"} in this category.</div>`;
}

function taskHtml(item) {
  const distance = daysUntil(item.date);
  const status = item.done ? "Done" : distance === null ? "Open" : distance < 0 ? "Overdue" : distance === 0 ? "Today" : `${distance}d`;
  return `<article class="task-row ${item.done ? "is-done" : ""}">
    <input class="task-check" type="checkbox" data-toggle="${escapeHtml(item.id)}" ${item.done ? "checked" : ""} aria-label="Toggle ${escapeHtml(item.title)}">
    <div class="task-copy"><h3>${escapeHtml(item.title)}</h3>${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ""}</div>
    <time datetime="${escapeHtml(item.date || "")}">${formatDate(item.date)}</time>
    <span class="status ${status === "Overdue" ? "late" : ""}">${status}</span>
    <button class="delete-button" data-delete="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.title)}">×</button>
  </article>`;
}

function closeMenus() { document.querySelectorAll("details[open]").forEach(menu => menu.removeAttribute("open")); }

function askConfirm(message, actionLabel = "Confirm") {
  return new Promise(resolve => {
    const confirmDialog = $("#confirmDialog");
    $("#confirmMessage").textContent = message;
    $("#confirmAccept").textContent = actionLabel;

    const cleanup = () => {
      $("#confirmForm").removeEventListener("submit", onSubmit);
      $("#confirmCancel").removeEventListener("click", onCancel);
      $("#confirmClose").removeEventListener("click", onCancel);
      confirmDialog.removeEventListener("cancel", onCancel);
    };
    const finish = value => {
      cleanup();
      if (confirmDialog.open) confirmDialog.close();
      resolve(value);
    };
    const onSubmit = event => { event.preventDefault(); finish(true); };
    const onCancel = event => { if (event) event.preventDefault(); finish(false); };

    $("#confirmForm").addEventListener("submit", onSubmit);
    $("#confirmCancel").addEventListener("click", onCancel);
    $("#confirmClose").addEventListener("click", onCancel);
    confirmDialog.addEventListener("cancel", onCancel);
    confirmDialog.showModal();
  });
}

$("#year").addEventListener("change", event => { data.active = event.target.value; save(); render(); });
$("#newYear").addEventListener("click", () => {
  const latest = Math.max(...Object.keys(data.years).map(year => parseInt(year, 10) || 0));
  const entered = prompt("Academic year", `${latest + 1}–${latest + 2}`);
  if (!entered) return;
  const year = entered.trim().replace(/\s/g, "").replace("-", "–");
  const match = year.match(/^(\d{4})–(\d{4})$/);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) return alert("Use a consecutive year, for example 2027–2028.");
  data.years[year] ||= { items: [] }; data.active = year; save(); render();
});

$("#categoryTabs").addEventListener("click", event => { const button = event.target.closest("[data-category]"); if (!button) return; activeCategory = button.dataset.category; render(); });
$("#showDone").addEventListener("change", event => { showDone = event.target.checked; render(); });
$("#taskList").addEventListener("change", event => {
  const input = event.target.closest("[data-toggle]"); if (!input) return;
  const item = currentItems().find(entry => entry.id === input.dataset.toggle);
  if (item) { item.done = !item.done; item.completedAt = item.done ? new Date().toISOString() : null; save(); render(); }
});
$("#taskList").addEventListener("click", async event => {
  const button = event.target.closest("[data-delete]"); if (!button) return;
  if (!await askConfirm("Delete this item?", "Delete")) return;
  data.years[data.active].items = currentItems().filter(item => item.id !== button.dataset.delete); save(); render();
});

const dialog = $("#itemDialog");
$("#addItem").addEventListener("click", () => { $("#itemCategory").value = activeCategory; dialog.showModal(); });
$("#closeDialog").addEventListener("click", () => dialog.close());
$("#cancelDialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
$("#itemForm").addEventListener("submit", event => {
  event.preventDefault(); const form = new FormData(event.currentTarget); const title = String(form.get("title") || "").trim(); if (!title) return;
  const type = String(form.get("type"));
  currentItems().push({ id: makeId(), cat: String(form.get("category")), title, date: String(form.get("date") || ""), notes: String(form.get("notes") || "").trim(), type, done: type === "achievement" });
  save(); event.currentTarget.reset(); dialog.close(); render();
});

$("#clearYear").addEventListener("click", async () => { closeMenus(); if (!currentItems().length) return; if (await askConfirm(`Delete all ${currentItems().length} items from ${data.active}?`, "Delete all")) { data.years[data.active].items = []; save(); render(); } });
$("#exportData").addEventListener("click", () => {
  closeMenus(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "astron-tracker-data.json"; link.click(); URL.revokeObjectURL(url);
});
$("#importData").addEventListener("click", () => { closeMenus(); $("#importFile").click(); });
$("#importFile").addEventListener("change", async event => {
  const file = event.target.files[0]; if (!file) return;
  try { const imported = JSON.parse(await file.text()); if (!validData(imported)) throw new Error(); if (!await askConfirm("Replace this browser's tracker data with the imported file?", "Replace")) return; data = imported; save(); render(); }
  catch { alert("This does not appear to be a valid Astron Tracker backup."); }
  finally { event.target.value = ""; }
});

window.addEventListener("storage", event => { if (event.key === STORAGE_KEY && event.newValue) { try { const next = JSON.parse(event.newValue); if (validData(next)) { data = next; render(); } } catch {} } });
$("#itemCategory").innerHTML = categories.map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`).join("");
render();
