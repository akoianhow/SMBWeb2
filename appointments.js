(() => {
  const grid = document.querySelector("[data-appointment-grid]");
  if (!grid) return;
  const alertBox = document.querySelector("[data-appointment-alert]");
  const myContainer = document.querySelector("[data-my-appointments]");
  const weekLabel = document.querySelector("[data-week-label]");
  const preselectedProductId=new URLSearchParams(window.location.search).get("service");
  const refinementStyle=document.createElement("style");refinementStyle.textContent=`.appointment-shell>header{display:grid;grid-template-columns:auto minmax(220px,1fr) auto;align-items:center;gap:14px}.appointment-header-chips{min-width:0;color:var(--muted);font-size:10px}.appointment-header-chips .appointment-chips{margin:0;justify-content:center}.appointment-header-chips .appointment-chip{padding:5px 9px}.appointment-day.today{background:#fff2d8;box-shadow:inset 0 -3px 0 #df2027;color:#202020}.appointment-day.today mark{display:block;margin-top:3px;padding:1px 5px;border-radius:10px;background:#df2027;color:#fff;font-size:8px;font-weight:900;letter-spacing:.6px}.appointment-striped-key:before{content:"";width:11px;height:11px;border:1px solid var(--line);background:repeating-linear-gradient(135deg,#eceeef 0,#eceeef 4px,#cfd3d6 4px,#cfd3d6 6px)}.appointment-grid-wrap{position:relative;max-height:calc(100vh - 170px);min-height:420px;overflow:auto;overscroll-behavior:contain}.appointment-day{position:sticky;top:0;z-index:20;box-shadow:0 1px 0 rgba(0,0,0,.08)}.appointment-day:first-child{left:0;z-index:30}.appointment-time{position:sticky;left:0;z-index:15;box-shadow:1px 0 0 rgba(0,0,0,.08)}@media(max-width:820px){.appointment-shell>header{grid-template-columns:1fr auto}.appointment-header-chips{grid-column:1/-1;grid-row:2}.appointment-header-chips .appointment-chips{justify-content:flex-start}.appointment-grid-wrap{max-height:calc(100vh - 130px);min-height:360px}}`;document.head.appendChild(refinementStyle);
  const state = { weekStart: startOfDay(new Date()), data: null, selected: null, session: null, focusAppointmentId: null };

  function startOfWeek(value) { const date=new Date(value);date.setHours(0,0,0,0);const day=date.getDay()||7;date.setDate(date.getDate()-day+1);return date; }
  function startOfDay(value) { const date=new Date(value);date.setHours(0,0,0,0);return date; }
  function addDays(value,count) { const date=new Date(value);date.setDate(date.getDate()+count);return date; }
  function dateKey(value) { return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`; }
  function localStart(day,hour) { const whole=Math.floor(hour),minute=hour%1?30:0;return new Date(`${dateKey(day)}T${String(whole).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00+08:00`); }
  function timeLabel(hour) { const whole=Math.floor(hour),minute=hour%1?"30":"00",suffix=whole>=12?"PM":"AM";return `${whole>12?whole-12:whole}:${minute} ${suffix}`; }
  function shortTime(value) { return new Date(value).toLocaleTimeString("en-PH",{timeZone:"Asia/Manila",hour:"numeric",minute:"2-digit"}); }
  function show(message,success=false) { alertBox.textContent=message;alertBox.className=`appointment-alert${success?" success":""}`;alertBox.hidden=false; }
  function overlaps(start,end,busy) { return busy.some(item=>start<new Date(item.endsAt)&&end>new Date(item.startsAt)); }
  function clearSelection() { grid.querySelectorAll(".covered,.selected").forEach(cell=>cell.classList.remove("covered","selected"));grid.querySelector(".appointment-picker")?.remove();state.selected=null; }
  function dayRestriction(day) { const today=startOfDay(new Date()),latest=addDays(today,15),candidate=startOfDay(day);if(candidate<today)return{className:"past-date",label:"PAST DATE"};if(candidate>latest)return{className:"advance-closed",label:"BOOKING CLOSED"};if(candidate.getDay()===1)return{className:"shop-closed",label:"SHOP CLOSED"};return null; }

  async function load() {
    grid.setAttribute("aria-busy","true");const end=addDays(state.weekStart,6);
    try {
      try { state.session=await apiRequest("/api/public/customer-account/session"); } catch { state.session=null; }
      state.data=await apiRequest(`/api/public/service-appointments/availability?branch=${encodeURIComponent("Quezon City")}&from=${dateKey(state.weekStart)}&to=${dateKey(end)}`);
      render();await loadMine();
    } catch(error) { show(error.message||"Unable to load workshop availability.");grid.innerHTML='<p class="appointment-empty">Schedule unavailable.</p>'; }
    finally { grid.setAttribute("aria-busy","false"); }
  }

  function render() {
    clearSelection();grid.innerHTML='<div class="appointment-day"></div>';
    const days=Array.from({length:7},(_,i)=>addDays(state.weekStart,i));
    const todayKey=dateKey(new Date());
    days.forEach(day=>{const restriction=dayRestriction(day),isToday=dateKey(day)===todayKey,head=document.createElement("div");head.className=`appointment-day${restriction?` ${restriction.className}`:""}${isToday?" today":""}`;head.innerHTML=`${day.toLocaleDateString("en-PH",{weekday:"short"})}<small>${day.toLocaleDateString("en-PH",{month:"short",day:"numeric"})}</small>${isToday?'<mark>TODAY</mark>':restriction?`<em>${restriction.label}</em>`:""}`;grid.appendChild(head)});
    const hours=Array.from({length:18},(_,i)=>10+i*.5);
    hours.forEach(hour=>{const label=document.createElement("div");label.className="appointment-time";label.textContent=timeLabel(hour);grid.appendChild(label);days.forEach(day=>{const start=localStart(day,hour),end=new Date(start.getTime()+30*60000),restriction=dayRestriction(day),pastTime=start<=new Date(),busy=overlaps(start,end,state.data.busy);const cell=document.createElement("div");cell.className=`appointment-cell${busy?" busy":""}${restriction?` disabled-date ${restriction.className}`:""}${pastTime&&!restriction?" disabled-time":""}`;cell.dataset.start=start.toISOString();if(!busy&&!restriction&&!pastTime)cell.addEventListener("click",()=>selectCell(cell,start));grid.appendChild(cell)})});
    renderReservations();
    weekLabel.textContent=`${days[0].toLocaleDateString("en-PH",{month:"short",day:"numeric"})}–${days[6].toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"})}`;
  }

  function renderReservations() {
    state.data.busy.forEach(item=>{const startIso=new Date(item.startsAt).toISOString(),cell=grid.querySelector(`.appointment-cell[data-start="${startIso}"]`);if(!cell)return;const slots=Math.max(1,Math.round((new Date(item.endsAt)-new Date(item.startsAt))/1800000)),card=document.createElement("div");card.className=`reservation-card${item.isMine?" mine":" other"}${state.focusAppointmentId===item.id?" focused":""}`;card.style.setProperty("--reserved-slots",String(slots));const service=escapeHtml(item.serviceName),times=`${shortTime(item.startsAt)}–${shortTime(item.endsAt)}`;if(item.isMine){const avatar=item.customerAvatarUrl?`<img src="${escapeHtml(resolveUrl(item.customerAvatarUrl))}" alt="Your avatar">`:`<span>${escapeHtml(customerInitials(state.session?.username||"Customer"))}</span>`;card.innerHTML=`<div class="reservation-avatar">${avatar}</div><div><strong>${service}</strong><small>${times}</small></div>`;}else{card.innerHTML=`<div><b>RESERVED</b><strong>${service}</strong><small>${times}</small></div>`;}cell.appendChild(card);if(state.focusAppointmentId===item.id){window.setTimeout(()=>card.scrollIntoView({behavior:"smooth",block:"center"}),50);state.focusAppointmentId=null;}});
  }

  function selectCell(cell,start) {
    clearSelection();cell.classList.add("selected");const picker=document.createElement("div");picker.className="appointment-picker";const select=document.createElement("select");select.innerHTML='<option value="">Select service…</option>'+state.data.offerings.map(item=>`<option value="${item.id}" data-minutes="${item.estimatedDurationMinutes}">${escapeHtml(item.serviceName)} — ${item.estimatedDurationMinutes} min</option>`).join("");const button=document.createElement("button");button.type="button";button.textContent="Lock";button.disabled=true;picker.append(select,button);cell.appendChild(picker);picker.addEventListener("click",event=>event.stopPropagation());
    select.addEventListener("change",()=>{grid.querySelectorAll(".covered").forEach(item=>item.classList.remove("covered"));button.disabled=true;const option=select.selectedOptions[0];if(!option?.value)return;const minutes=Number(option.dataset.minutes),end=new Date(start.getTime()+minutes*60000);if(end.getHours()>19||(end.getHours()===19&&end.getMinutes()>0)||overlaps(start,end,state.data.busy)){show("Not allowed: this service overlaps an existing appointment or extends beyond workshop hours.");return}grid.querySelectorAll(".appointment-cell[data-start]").forEach(item=>{const slot=new Date(item.dataset.start);if(slot>=start&&slot<end)item.classList.add("covered")});state.selected={cell,start,end,offeringId:option.value,serviceName:option.textContent};button.disabled=false;show(`Available: ${option.textContent} fits without overlapping another appointment.`,true)});button.addEventListener("click",()=>void lockSelected());const requested=state.data.offerings.find(item=>String(item.productId)===preselectedProductId);if(requested){select.value=requested.id;select.dispatchEvent(new Event("change"));}
  }

  async function lockSelected() {
    if(!state.selected)return;
    try { await apiRequest("/api/public/service-appointments",{method:"POST",body:JSON.stringify({branch:"Quezon City",offeringId:state.selected.offeringId,startsAt:state.selected.start.toISOString(),customerNotes:null})});show("Appointment confirmed and locked. Please arrive at least 5 minutes early.",true);await load(); }
    catch(error){if(error.status===401){show("Sign in or register to lock this selected appointment. Your slot is not saved yet.");document.querySelector('[data-customer-login-form] input[name="username"]')?.focus();}else show(error.message||"Unable to lock appointment.");}
  }

  async function loadMine() {
    if(!state.session){myContainer.innerHTML='<span>Sign in to view confirmed appointments.</span>';return;}
    try { const rows=await apiRequest("/api/public/service-appointments/mine"),confirmed=rows.filter(item=>item.status==="confirmed"&&new Date(item.endsAt)>new Date());myContainer.innerHTML=confirmed.length?`<div class="appointment-chips">${confirmed.map(item=>`<div class="appointment-chip-wrap"><button class="appointment-chip" type="button" data-focus-id="${item.id}" data-focus-start="${item.startsAt}"><strong>${escapeHtml(item.serviceName)}</strong><small>${new Date(item.startsAt).toLocaleString("en-PH",{timeZone:"Asia/Manila",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</small></button><button class="appointment-chip-cancel" type="button" data-cancel-id="${item.id}" aria-label="Cancel ${escapeHtml(item.serviceName)}">×</button></div>`).join("")}</div>`:'<span>No confirmed appointments.</span>';myContainer.querySelectorAll("[data-focus-id]").forEach(button=>button.addEventListener("click",()=>focusAppointment(button.dataset.focusId,button.dataset.focusStart)));myContainer.querySelectorAll("[data-cancel-id]").forEach(button=>button.addEventListener("click",()=>void cancel(button.dataset.cancelId))); }
    catch(error){show(error.message||"Unable to load your appointments.");}
  }

  function focusAppointment(id,startsAt) { state.focusAppointmentId=id;state.weekStart=startOfDay(new Date(startsAt));void load();document.querySelector(".appointment-shell")?.scrollIntoView({behavior:"smooth",block:"start"}); }
  async function cancel(id){if(!confirm("Cancel this appointment and release the slot?"))return;try{await apiRequest(`/api/public/service-appointments/${id}`,{method:"DELETE"});show("Appointment cancelled and slot released.",true);await load();}catch(error){show(error.message||"Unable to cancel appointment.");}}
  function resolveUrl(value){return /^(https?:)?\/\//.test(value)?value:`${getApiBaseUrl()}${value.startsWith("/")?value:`/${value}`}`;}
  function customerInitials(name){return name.split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join("")||"CU";}
  function escapeHtml(value){const div=document.createElement("div");div.textContent=value??"";return div.innerHTML;}
  document.querySelector("[data-week-prev]").addEventListener("click",()=>{state.weekStart=addDays(state.weekStart,-7);void load()});document.querySelector("[data-week-next]").addEventListener("click",()=>{state.weekStart=addDays(state.weekStart,7);void load()});document.querySelector("[data-week-today]").addEventListener("click",()=>{state.weekStart=startOfDay(new Date());void load()});window.addEventListener("customer-session-changed",()=>void load());void load();
})();
