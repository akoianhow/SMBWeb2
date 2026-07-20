(() => {
  const grid = document.querySelector("[data-appointment-grid]");
  if (!grid) return;
  const alertBox = document.querySelector("[data-appointment-alert]");
  const myContainer = document.querySelector("[data-my-appointments]");
  const weekLabel = document.querySelector("[data-week-label]");
  const preselectedProductId=new URLSearchParams(window.location.search).get("service");
  const pendingAppointmentKey="smbweb2.pendingAppointment";
  const pendingAppointment=readPendingAppointment();
  const refinementStyle=document.createElement("style");refinementStyle.textContent=`.appointment-shell>header{display:grid;grid-template-columns:auto minmax(220px,1fr) auto;align-items:center;gap:14px}.appointment-header-chips{position:relative;min-width:0;color:var(--muted);font-size:10px}.appointment-header-chips .appointment-chips{margin:0;justify-content:center}.appointment-header-chips .appointment-chip{padding:5px 9px}.scheduled-appointments-tooltip{position:absolute;z-index:60;top:calc(100% + 15px);left:50%;width:max-content;max-width:min(280px,90vw);padding:10px 14px;border-radius:4px;background:#202020;color:#fff;font-size:12px;font-weight:800;letter-spacing:.1px;box-shadow:0 10px 28px rgba(0,0,0,.28);opacity:0;pointer-events:none;transform:translate(-50%,-8px);transition:opacity .45s ease,transform .45s ease}.scheduled-appointments-tooltip:before{content:"";position:absolute;bottom:100%;left:50%;border:8px solid transparent;border-bottom-color:#202020;transform:translateX(-50%)}.scheduled-appointments-tooltip.is-visible{opacity:1;transform:translate(-50%,0)}.appointment-day.today{background:#fff2d8;box-shadow:inset 0 -3px 0 #df2027;color:#202020}.appointment-day.today mark{display:block;margin-top:3px;padding:1px 5px;border-radius:10px;background:#df2027;color:#fff;font-size:8px;font-weight:900;letter-spacing:.6px}.appointment-striped-key:before{content:"";width:11px;height:11px;border:1px solid var(--line);background:repeating-linear-gradient(135deg,#eceeef 0,#eceeef 4px,#cfd3d6 4px,#cfd3d6 6px)}.appointment-grid-wrap{position:relative;max-height:calc(100vh - 170px);min-height:420px;overflow:auto;overscroll-behavior:contain}.appointment-day{position:sticky;top:0;z-index:20;box-shadow:0 1px 0 rgba(0,0,0,.08)}.appointment-day:first-child{left:0;z-index:30}.appointment-time{position:sticky;left:0;z-index:15;box-shadow:1px 0 0 rgba(0,0,0,.08)}.reservation-cost{font-weight:800;color:#fff!important}.appointment-contact-modal,.appointment-lock-modal{position:fixed;z-index:10000;inset:0;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.62)}.appointment-contact-modal[hidden],.appointment-lock-modal[hidden]{display:none}.appointment-contact-modal section,.appointment-lock-modal section{width:min(460px,100%);border-top:5px solid var(--red);border-radius:8px;background:#fff;padding:22px;box-shadow:0 18px 60px rgba(0,0,0,.35)}.appointment-contact-modal h2,.appointment-lock-modal h2{margin:0 0 6px}.appointment-contact-modal p,.appointment-lock-modal p{color:var(--muted)}.appointment-contact-modal label{display:grid;gap:5px;margin:12px 0;font-size:11px;font-weight:800;text-transform:uppercase}.appointment-contact-modal input{height:40px;border:1px solid var(--line);padding:0 10px;font:inherit}.appointment-contact-actions,.appointment-lock-actions{display:flex;gap:8px;margin-top:16px}.appointment-contact-actions button,.appointment-lock-actions button{min-height:38px;padding:0 14px;border:0;border-radius:4px;background:var(--red);color:#fff;font-weight:800}.appointment-contact-actions button[type=button],.appointment-lock-actions [data-lock-cancel]{background:#303030}.appointment-contact-message{min-height:18px;color:#a52127!important}.appointment-lock-modal section{width:min(390px,100%)}.appointment-lock-eyebrow{margin:0 0 4px!important;color:var(--red)!important;font-size:11px;font-weight:900;letter-spacing:.7px;text-transform:uppercase}.appointment-lock-summary{display:grid;gap:4px;margin:16px 0;padding:13px 14px;border-left:4px solid var(--red);background:#f4f4f4}.appointment-lock-summary strong{font-size:15px}.appointment-lock-summary span{color:#555;font-size:13px}.appointment-lock-actions button{flex:1}.appointment-lock-actions button:disabled{opacity:.65}@media(max-width:820px){.appointment-shell>header{grid-template-columns:1fr auto}.appointment-header-chips{grid-column:1/-1;grid-row:2}.appointment-header-chips .appointment-chips{justify-content:flex-start}.scheduled-appointments-tooltip{left:14px;transform:translateY(-8px)}.scheduled-appointments-tooltip:before{left:32px}.scheduled-appointments-tooltip.is-visible{transform:translateY(0)}.appointment-grid-wrap{max-height:calc(100vh - 130px);min-height:360px}.appointment-lock-modal section{padding:18px}.appointment-lock-actions{flex-direction:column}.appointment-lock-actions button{width:100%}}@media(prefers-reduced-motion:reduce){.scheduled-appointments-tooltip{transition:none}}`;document.head.appendChild(refinementStyle);
  const state = { weekStart: pendingAppointment?.weekStart?startOfDay(new Date(pendingAppointment.weekStart)):startOfDay(new Date()), data: null, selected: null, session: null, activeAppointments: null, focusAppointmentId: null };
  let scheduledTooltipTimer=null;

  function startOfWeek(value) { const date=new Date(value);date.setHours(0,0,0,0);const day=date.getDay()||7;date.setDate(date.getDate()-day+1);return date; }
  function startOfDay(value) { const date=new Date(value);date.setHours(0,0,0,0);return date; }
  function addDays(value,count) { const date=new Date(value);date.setDate(date.getDate()+count);return date; }
  function dateKey(value) { return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`; }
  function localStart(day,hour) { const whole=Math.floor(hour),minute=hour%1?30:0;return new Date(`${dateKey(day)}T${String(whole).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00+08:00`); }
  function timeLabel(hour) { const whole=Math.floor(hour),minute=hour%1?"30":"00",suffix=whole>=12?"PM":"AM";return `${whole>12?whole-12:whole}:${minute} ${suffix}`; }
  function shortTime(value) { return new Date(value).toLocaleTimeString("en-PH",{timeZone:"Asia/Manila",hour:"numeric",minute:"2-digit"}); }
  function estimatedCostLabel(value) { return value==null?"Price to be confirmed":`₱${Number(value).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
  function serviceDisplayName(offering){return String(offering?.serviceName||"Mechanic Service").replace(/\s+/g," ").trim();}
  function getDatabaseServiceCategory(offering){return String(offering?.serviceCategory||"").trim()||"Uncategorized Services";}
  function getGroupedOfferings(){
    const groups=new Map();
    state.data.offerings.forEach(offering=>{const category=getDatabaseServiceCategory(offering);if(!groups.has(category))groups.set(category,[]);groups.get(category).push(offering);});
    return [...groups.entries()].map(([category,offerings])=>({category,offerings}));
  }
  function workshopCloseFor(start){
    const [hour,minute]=String(state.data?.closesAt||"19:00").split(":").map(Number);
    const close=new Date(start);close.setHours(hour,minute,0,0);return close;
  }
  function offeringAvailability(start,offering){
    const minutes=Number(offering.estimatedDurationMinutes),end=new Date(start.getTime()+minutes*60000);
    if(end>workshopCloseFor(start))return{available:false,end,reason:"Does not fit before closing"};
    if(overlaps(start,end,state.data.busy))return{available:false,end,reason:"Overlaps an existing appointment"};
    return{available:true,end,reason:""};
  }
  function show(message,success=false) { alertBox.textContent=message;alertBox.className=`appointment-alert${success?" success":""}`;alertBox.hidden=false; }
  function overlaps(start,end,busy) { return busy.some(item=>start<new Date(item.endsAt)&&end>new Date(item.startsAt)); }
  function clearSelection() { closeServiceModal(false);grid.querySelectorAll(".covered,.selected").forEach(cell=>cell.classList.remove("covered","selected"));grid.querySelector(".appointment-picker")?.remove();state.selected=null; }
  function appointmentLimit(){return Math.max(1,Number(state.data?.maxActiveAppointmentsPerCustomer)||3);}
  function hasReachedAppointmentLimit(){return Boolean(state.session)&&Array.isArray(state.activeAppointments)&&state.activeAppointments.length>=appointmentLimit();}
  function dayRestriction(day) { const today=startOfDay(new Date()),latest=addDays(today,15),candidate=startOfDay(day);if(candidate<today)return{className:"past-date",label:"PAST DATE"};if(candidate>latest)return{className:"advance-closed",label:"BOOKING CLOSED"};if(candidate.getDay()===1)return{className:"shop-closed",label:"SHOP CLOSED"};return null; }

  async function load() {
    grid.setAttribute("aria-busy","true");const end=addDays(state.weekStart,6);
    try {
      await window.smbPublicLocationReady;
      const location=window.getSelectedPublicLocationSlug();
      try { state.session=await apiRequest("/api/public/customer-account/session"); } catch { state.session=null; }
      state.data=await apiRequest(`/api/public/service-appointments/availability?location=${encodeURIComponent(location)}&from=${dateKey(state.weekStart)}&to=${dateKey(end)}`);
      render();await loadMine();restorePendingAppointment();
    } catch(error) { show(error.message||"Unable to load workshop availability.");grid.innerHTML='<p class="appointment-empty">Schedule unavailable.</p>'; }
    finally { grid.setAttribute("aria-busy","false"); }
  }

  function render() {
    clearSelection();grid.innerHTML='<div class="appointment-day"></div>';
    const days=Array.from({length:7},(_,i)=>addDays(state.weekStart,i));
    const todayKey=dateKey(new Date());
    days.forEach(day=>{const restriction=dayRestriction(day),isToday=dateKey(day)===todayKey,head=document.createElement("div");head.className=`appointment-day${restriction?` ${restriction.className}`:""}${isToday?" today":""}`;head.innerHTML=`${day.toLocaleDateString("en-PH",{weekday:"short"})}<small>${day.toLocaleDateString("en-PH",{month:"short",day:"numeric"})}</small>${isToday?'<mark>TODAY</mark>':restriction?`<em>${restriction.label}</em>`:""}`;grid.appendChild(head)});
    const hours=Array.from({length:18},(_,i)=>10+i*.5);
    hours.forEach(hour=>{const label=document.createElement("div");label.className="appointment-time";label.textContent=timeLabel(hour);grid.appendChild(label);days.forEach(day=>{const start=localStart(day,hour),end=new Date(start.getTime()+30*60000),restriction=dayRestriction(day),pastTime=start<=new Date(),busy=overlaps(start,end,state.data.busy);const cell=document.createElement("div");cell.className=`appointment-cell${busy?" busy":""}${restriction?` disabled-date ${restriction.className}`:""}${pastTime&&!restriction?" disabled-time":""}`;cell.dataset.start=start.toISOString();if(!busy&&!restriction&&!pastTime){cell.tabIndex=0;cell.setAttribute("role","button");cell.setAttribute("aria-label",`Choose a service for ${start.toLocaleString("en-PH",{timeZone:"Asia/Manila",weekday:"long",month:"long",day:"numeric",hour:"numeric",minute:"2-digit"})}`);cell.addEventListener("click",()=>void selectCell(cell,start));cell.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();void selectCell(cell,start)}})}grid.appendChild(cell)})});
    renderReservations();
    weekLabel.textContent=`${days[0].toLocaleDateString("en-PH",{month:"short",day:"numeric"})}–${days[6].toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"})}`;
  }

  function renderReservations() {
    state.data.busy.forEach(item=>{const startIso=new Date(item.startsAt).toISOString(),cell=grid.querySelector(`.appointment-cell[data-start="${startIso}"]`);if(!cell)return;const slots=Math.max(1,Math.round((new Date(item.endsAt)-new Date(item.startsAt))/1800000)),card=document.createElement("div");card.className=`reservation-card${item.isMine?" mine":" other"}${state.focusAppointmentId===item.id?" focused":""}`;card.style.setProperty("--reserved-slots",String(slots));const service=escapeHtml(item.serviceName),times=`${shortTime(item.startsAt)}–${shortTime(item.endsAt)}`;if(item.isMine){const avatar=item.customerAvatarUrl?`<img src="${escapeHtml(resolveUrl(item.customerAvatarUrl))}" alt="Your avatar">`:`<span>${escapeHtml(customerInitials(state.session?.username||"Customer"))}</span>`;card.innerHTML=`<div class="reservation-avatar">${avatar}</div><div><strong>${service}</strong><small>${times}</small><small class="reservation-cost">Estimated Cost: ${estimatedCostLabel(item.estimatedCost)}</small></div>`;}else{card.innerHTML=`<div><b>RESERVED</b><strong>${service}</strong><small>${times}</small></div>`;}cell.appendChild(card);if(state.focusAppointmentId===item.id){window.setTimeout(()=>card.scrollIntoView({behavior:"smooth",block:"center"}),50);state.focusAppointmentId=null;}});
  }

  async function selectCell(cell,start) {
    if(state.session&&state.activeAppointments===null)await loadMine();
    if(hasReachedAppointmentLimit()){openAppointmentLimitModal();return;}
    const requested=state.data.offerings.find(item=>String(item.productId)===preselectedProductId);
    const retainedOfferingId=state.selected?.cell===cell?state.selected.offeringId:requested?.id;
    clearSelection();cell.classList.add("selected");openServiceModal(cell,start,retainedOfferingId);
  }

  function ensureAppointmentLimitModal(){
    let modal=document.querySelector("[data-appointment-limit-modal]");
    if(modal)return modal;
    modal=document.createElement("div");modal.className="appointment-limit-modal";modal.dataset.appointmentLimitModal="";modal.hidden=true;
    modal.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="appointment-limit-title" aria-describedby="appointment-limit-message"><button class="appointment-limit-close" type="button" data-appointment-limit-close aria-label="Close appointment limit message">×</button><p class="appointment-limit-eyebrow">Appointment limit</p><div class="appointment-limit-count" data-appointment-limit-count></div><h2 id="appointment-limit-title">Maximum appointments reached</h2><p id="appointment-limit-message" data-appointment-limit-message></p><p class="appointment-limit-help">Cancel one of your existing appointments before booking another service.</p><button class="appointment-limit-action" type="button" data-appointment-limit-action>Okay</button></section>';
    document.body.appendChild(modal);
    modal.addEventListener("click",event=>{if(event.target===modal)closeAppointmentLimitModal()});
    modal.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();closeAppointmentLimitModal()}});
    modal.querySelectorAll("[data-appointment-limit-close],[data-appointment-limit-action]").forEach(button=>button.addEventListener("click",()=>closeAppointmentLimitModal()));
    return modal;
  }

  function openAppointmentLimitModal(){
    clearSelection();closeLockConfirmation();clearPendingAppointment();
    const limit=appointmentLimit(),count=Math.min(state.activeAppointments?.length||limit,limit),modal=ensureAppointmentLimitModal();
    modal.querySelector("[data-appointment-limit-count]").textContent=`${count} / ${limit} active appointments`;
    modal.querySelector("[data-appointment-limit-message]").textContent=`You already have ${count} active appointments. The maximum appointment allowed is ${limit}.`;
    modal.hidden=false;document.body.classList.add("service-modal-open");
    modal.querySelector("[data-appointment-limit-action]").focus();
  }

  function closeAppointmentLimitModal(){
    const modal=document.querySelector("[data-appointment-limit-modal]");
    if(!modal||modal.hidden)return;
    modal.hidden=true;document.body.classList.remove("service-modal-open");
  }

  function applyOfferingSelection(cell,start,offering) {
    const availability=offeringAvailability(start,offering);
    if(!availability.available)return false;
    grid.querySelectorAll(".covered").forEach(item=>item.classList.remove("covered"));
    grid.querySelectorAll(".appointment-cell[data-start]").forEach(item=>{const slot=new Date(item.dataset.start);if(slot>=start&&slot<availability.end)item.classList.add("covered")});
    state.selected={cell,start,end:availability.end,offeringId:String(offering.id),serviceName:serviceDisplayName(offering),durationMinutes:Number(offering.estimatedDurationMinutes)};
    return true;
  }

  function ensureServiceModal() {
    let modal=document.querySelector("[data-service-category-modal]");
    if(modal)return modal;
    modal=document.createElement("div");modal.className="service-category-modal";modal.dataset.serviceCategoryModal="";modal.hidden=true;
    modal.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="service-category-title"><header class="service-category-modal-header"><div><h2 id="service-category-title">Choose a Service</h2><p data-service-slot-summary></p></div><button class="service-category-close" type="button" data-service-modal-close aria-label="Close service selection">×</button></header><div class="service-tree" data-service-category-list role="tree" aria-label="Service categories and services"></div><div class="service-selection-summary" data-service-selection-summary hidden></div><footer class="service-category-actions"><button class="service-category-cancel" type="button" data-service-modal-cancel>Cancel</button><button class="service-category-continue" type="button" data-service-modal-continue disabled>Continue</button></footer></section>';
    document.body.appendChild(modal);
    modal.addEventListener("click",event=>{if(event.target===modal)closeServiceModal()});
    modal.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();closeServiceModal()}});
    modal.querySelector("[data-service-modal-close]").addEventListener("click",()=>closeServiceModal());
    modal.querySelector("[data-service-modal-cancel]").addEventListener("click",()=>closeServiceModal());
    modal.querySelector("[data-service-modal-continue]").addEventListener("click",()=>{
      if(!state.selected)return;
      closeServiceModal(false);
      show(`Available: ${state.selected.serviceName} • ${state.selected.durationMinutes} min.`,true);
      openLockConfirmation();
    });
    return modal;
  }

  function renderServiceCategories(modal,cell,start,preselectedOfferingId) {
    const list=modal.querySelector("[data-service-category-list]"),summary=modal.querySelector("[data-service-selection-summary]"),continueButton=modal.querySelector("[data-service-modal-continue]");
    list.innerHTML="";summary.hidden=true;summary.textContent="";continueButton.disabled=true;
    const grouped=getGroupedOfferings(),preselected=state.data.offerings.find(item=>String(item.id)===String(preselectedOfferingId));
    grouped.forEach(group=>{
      const details=document.createElement("details");details.className="service-tree-category";details.open=Boolean(preselected&&group.offerings.includes(preselected));details.setAttribute("role","treeitem");details.setAttribute("aria-expanded",String(details.open));
      const heading=document.createElement("summary");heading.className="service-tree-branch";heading.innerHTML=`<span>${escapeHtml(group.category)}</span><small>${group.offerings.length}</small>`;
      const options=document.createElement("div");options.className="service-tree-services";options.setAttribute("role","group");
      group.offerings.forEach(offering=>{
        const availability=offeringAvailability(start,offering),label=document.createElement("label");label.className=`service-tree-service${availability.available?"":" unavailable"}`;label.setAttribute("role","treeitem");
        const input=document.createElement("input");input.type="radio";input.name="appointment-service";input.value=String(offering.id);input.disabled=!availability.available;
        input.setAttribute("aria-describedby",`service-meta-${offering.id}`);
        const copy=document.createElement("span");copy.className="service-tree-service-copy";
        const name=document.createElement("strong");name.textContent=serviceDisplayName(offering);
        const meta=document.createElement("small");meta.id=`service-meta-${offering.id}`;meta.textContent=availability.available?`${estimatedCostLabel(offering.estimatedCost)} • ${offering.estimatedDurationMinutes} min`:`${offering.estimatedDurationMinutes} min • ${availability.reason}`;
        const duration=document.createElement("b");duration.textContent=`${offering.estimatedDurationMinutes} min`;
        copy.append(name,meta);label.append(input,copy,duration);options.appendChild(label);
        input.addEventListener("change",()=>{
          if(!applyOfferingSelection(cell,start,offering))return;
          summary.textContent=`Selected: ${state.selected.serviceName} • Ends at ${shortTime(state.selected.end)}`;
          summary.hidden=false;continueButton.disabled=false;
        });
        if(preselected&&String(preselected.id)===String(offering.id)&&availability.available){input.checked=true;applyOfferingSelection(cell,start,offering);summary.textContent=`Selected: ${state.selected.serviceName} • Ends at ${shortTime(state.selected.end)}`;summary.hidden=false;continueButton.disabled=false;}
      });
      details.append(heading,options);
      details.addEventListener("toggle",()=>{details.setAttribute("aria-expanded",String(details.open));if(!details.open)return;list.querySelectorAll("details[open]").forEach(item=>{if(item!==details)item.open=false})});
      list.appendChild(details);
    });
  }

  function openServiceModal(cell,start,preselectedOfferingId=null) {
    if(hasReachedAppointmentLimit()){openAppointmentLimitModal();return;}
    const modal=ensureServiceModal();
    modal.dataset.returnStart=cell.dataset.start||"";
    modal.querySelector("[data-service-slot-summary]").textContent=start.toLocaleString("en-PH",{timeZone:"Asia/Manila",weekday:"long",month:"long",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
    renderServiceCategories(modal,cell,start,preselectedOfferingId);
    modal.hidden=false;document.body.classList.add("service-modal-open");
    modal.querySelector(".service-tree-category[open] input:not(:disabled), .service-tree-branch, [data-service-modal-close]")?.focus();
  }

  function closeServiceModal(restoreFocus=true) {
    const modal=document.querySelector("[data-service-category-modal]");
    if(!modal||modal.hidden)return;
    const returnStart=modal.dataset.returnStart;
    modal.hidden=true;document.body.classList.remove("service-modal-open");
    if(restoreFocus&&returnStart)grid.querySelector(`.appointment-cell[data-start="${returnStart}"]`)?.focus();
  }

  function openLockConfirmation() {
    if(!state.selected)return;
    if(!state.session){requestAppointmentAuthentication();return;}
    if(hasReachedAppointmentLimit()){openAppointmentLimitModal();return;}
    clearPendingAppointment();
    let modal=document.querySelector("[data-appointment-lock-modal]");
    if(!modal){
      modal=document.createElement("div");modal.className="appointment-lock-modal";modal.dataset.appointmentLockModal="";modal.hidden=true;
      modal.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="appointment-lock-title"><p class="appointment-lock-eyebrow">Confirm appointment</p><h2 id="appointment-lock-title">Lock this appointment?</h2><div class="appointment-lock-summary"><strong data-lock-service></strong><span data-lock-date></span><span data-lock-time></span></div><p>This will reserve the selected workshop time for you.</p><div class="appointment-lock-actions"><button type="button" data-lock-confirm>Lock Appointment</button><button type="button" data-lock-cancel>Go Back</button></div></section>';
      document.body.appendChild(modal);
      modal.addEventListener("click",event=>{if(event.target===modal)closeLockConfirmation(modal)});
      modal.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();closeLockConfirmation(modal)}});
      modal.querySelector("[data-lock-cancel]").addEventListener("click",()=>closeLockConfirmation(modal));
      modal.querySelector("[data-lock-confirm]").addEventListener("click",async event=>{const confirmButton=event.currentTarget;confirmButton.disabled=true;confirmButton.textContent="Locking…";closeLockConfirmation(modal);await lockSelected();confirmButton.disabled=false;confirmButton.textContent="Lock Appointment";});
    }
    const selected=state.selected;
    modal.querySelector("[data-lock-service]").textContent=selected.serviceName;
    modal.querySelector("[data-lock-date]").textContent=selected.start.toLocaleDateString("en-PH",{timeZone:"Asia/Manila",weekday:"long",month:"long",day:"numeric",year:"numeric"});
    modal.querySelector("[data-lock-time]").textContent=`${shortTime(selected.start)}–${shortTime(selected.end)} • ${selected.durationMinutes} minutes`;
    modal.hidden=false;
    modal.querySelector("[data-lock-confirm]").focus();
  }

  function closeLockConfirmation(modal=document.querySelector("[data-appointment-lock-modal]")){if(modal)modal.hidden=true;}

  function readPendingAppointment(){try{return JSON.parse(sessionStorage.getItem(pendingAppointmentKey)||"null")}catch{return null}}
  function clearPendingAppointment(){try{sessionStorage.removeItem(pendingAppointmentKey)}catch{}}
  function savePendingAppointment(){
    if(!state.selected)return;
    try{sessionStorage.setItem(pendingAppointmentKey,JSON.stringify({startsAt:state.selected.start.toISOString(),offeringId:state.selected.offeringId,weekStart:state.weekStart.toISOString(),location:window.getSelectedPublicLocationSlug()}))}catch{}
  }
  function getAppointmentReturnUrl(){return `${window.location.pathname.split("/").pop()||"appointments.html"}${window.location.search}`;}
  function requestAppointmentAuthentication(){
    savePendingAppointment();closeLockConfirmation();
    const prompt=document.querySelector("[data-community-auth-prompt]");
    if(!prompt){show("Log in or create an account before locking this appointment.");return}
    const title=prompt.querySelector("#customer-auth-title"),description=title?.nextElementSibling,register=prompt.querySelector("[data-open-register]");
    if(title)title.textContent="Log in to lock your appointment";
    if(description)description.textContent="Your selected service and time will be kept while you log in or create an account.";
    if(register&&register.dataset.appointmentReturnBound!=="true"){
      register.dataset.appointmentReturnBound="true";
      register.addEventListener("click",event=>{event.preventDefault();event.stopImmediatePropagation();savePendingAppointment();window.location.href=`index.html?returnTo=${encodeURIComponent(getAppointmentReturnUrl())}#profile-register`;},{capture:true});
    }
    openCommunityLoginForm();
  }
  function restorePendingAppointment(){
    const pending=readPendingAppointment();
    if(!pending||!state.session||pending.location!==window.getSelectedPublicLocationSlug())return;
    if(hasReachedAppointmentLimit()){openAppointmentLimitModal();return;}
    const start=new Date(pending.startsAt),cell=grid.querySelector(`.appointment-cell[data-start="${start.toISOString()}"]`);
    const offering=state.data.offerings.find(item=>String(item.id)===String(pending.offeringId));
    if(!cell||!offering)return;
    clearSelection();cell.classList.add("selected");
    if(applyOfferingSelection(cell,start,offering))openLockConfirmation();
  }
  async function handleCustomerSessionChanged(){
    try{state.session=await apiRequest("/api/public/customer-account/session")}catch{state.session=null}
    if(!state.data)return;
    if(state.session&&state.selected&&readPendingAppointment()){hideCommunityAuthPrompt();await loadMine();openLockConfirmation();return}
    if(state.session){await loadMine();restorePendingAppointment();return}
    closeLockConfirmation();await load();
  }

  async function lockSelected() {
    if(!state.selected)return;
    if(hasReachedAppointmentLimit()){openAppointmentLimitModal();return;}
    try { await apiRequest("/api/public/service-appointments",{method:"POST",body:JSON.stringify({location:window.getSelectedPublicLocationSlug(),offeringId:state.selected.offeringId,startsAt:state.selected.start.toISOString(),customerNotes:null,website:""})});show("Appointment confirmed and locked. Please arrive at least 5 minutes early.",true);await load();showScheduledAppointmentsTooltip(); }
    catch(error){if(error.status===401){show("Sign in or register to lock this selected appointment. Your slot is not saved yet.");document.querySelector('[data-customer-login-form] input[name="username"]')?.focus();}else if(error.status===409&&/active appointments/i.test(error.message||"")){await loadMine();openAppointmentLimitModal();}else if(error.status===422&&error.details?.contactRequired){openAppointmentContactModal();}else show(error.message||"Unable to lock appointment.");}
  }

  async function loadMine() {
    if(!state.session){state.activeAppointments=[];myContainer.innerHTML='<span>Sign in to view confirmed appointments.</span>';return;}
    try { const rows=await apiRequest("/api/public/service-appointments/mine"),confirmed=rows.filter(item=>item.status==="confirmed"&&new Date(item.endsAt)>new Date());state.activeAppointments=confirmed;myContainer.innerHTML=confirmed.length?`<div class="appointment-chips">${confirmed.map(item=>`<div class="appointment-chip-wrap"><button class="appointment-chip" type="button" data-focus-id="${item.id}" data-focus-start="${item.startsAt}"><strong>${escapeHtml(item.serviceName)}</strong><small>${new Date(item.startsAt).toLocaleString("en-PH",{timeZone:"Asia/Manila",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</small><small>Estimated Cost: ${estimatedCostLabel(item.estimatedCost)}</small></button><button class="appointment-chip-cancel" type="button" data-cancel-id="${item.id}" aria-label="Cancel ${escapeHtml(item.serviceName)}">×</button></div>`).join("")}</div>`:'<span>No confirmed appointments.</span>';myContainer.querySelectorAll("[data-focus-id]").forEach(button=>button.addEventListener("click",()=>focusAppointment(button.dataset.focusId,button.dataset.focusStart)));myContainer.querySelectorAll("[data-cancel-id]").forEach(button=>button.addEventListener("click",()=>void cancel(button.dataset.cancelId))); }
    catch(error){state.activeAppointments=null;show(error.message||"Unable to load your appointments.");}
  }

  function showScheduledAppointmentsTooltip(){window.clearTimeout(scheduledTooltipTimer);myContainer.querySelector(".scheduled-appointments-tooltip")?.remove();const tooltip=document.createElement("div");tooltip.className="scheduled-appointments-tooltip";tooltip.setAttribute("role","status");tooltip.textContent="Your scheduled appointments.";myContainer.appendChild(tooltip);window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{tooltip.classList.add("is-visible");scheduledTooltipTimer=window.setTimeout(()=>{tooltip.classList.remove("is-visible");window.setTimeout(()=>tooltip.remove(),500)},10000)}));}

  function focusAppointment(id,startsAt) { state.focusAppointmentId=id;state.weekStart=startOfDay(new Date(startsAt));void load();document.querySelector(".appointment-shell")?.scrollIntoView({behavior:"smooth",block:"start"}); }
  async function cancel(id){if(!confirm("Cancel this appointment and release the slot?"))return;try{await apiRequest(`/api/public/service-appointments/${id}`,{method:"DELETE"});show("Appointment cancelled and slot released.",true);await load();}catch(error){show(error.message||"Unable to cancel appointment.");}}
  function openAppointmentContactModal(){let modal=document.querySelector("[data-appointment-contact-modal]");if(!modal){modal=document.createElement("div");modal.className="appointment-contact-modal";modal.dataset.appointmentContactModal="";modal.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="appointment-contact-title"><h2 id="appointment-contact-title">Add appointment contact</h2><p>To prevent bogus reservations, add either a Philippine mobile number or your Facebook account before locking this slot.</p><form data-appointment-contact-form><label>Mobile number<input type="tel" name="mobileNumber" inputmode="tel" autocomplete="tel" placeholder="0917 123 4567"></label><label>Facebook account<input type="text" name="facebookAccount" autocomplete="url" placeholder="Profile URL, username, or Messenger name"></label><input class="website-field" name="website" tabindex="-1" aria-hidden="true"><div class="appointment-contact-actions"><button type="submit">Save and Lock Slot</button><button type="button" data-contact-cancel>Cancel</button></div><p class="appointment-contact-message" data-contact-message role="status"></p></form></section>';document.body.appendChild(modal);modal.querySelector("[data-contact-cancel]").addEventListener("click",()=>{modal.hidden=true});modal.querySelector("[data-appointment-contact-form]").addEventListener("submit",event=>void saveAppointmentContact(event,modal));}modal.hidden=false;modal.querySelector('input[name="mobileNumber"]').focus();}
  async function saveAppointmentContact(event,modal){event.preventDefault();const form=event.currentTarget,message=form.querySelector("[data-contact-message]"),mobile=form.elements.mobileNumber.value.trim(),facebook=form.elements.facebookAccount.value.trim();message.textContent="";if(!mobile&&!facebook){message.textContent="Add a mobile number or Facebook account.";return}if(mobile&&!/^(?:\+639|09)\d{9}$/.test(mobile.replace(/[\s()-]/g,""))){message.textContent="Enter a valid Philippine mobile number, such as 09171234567.";return}try{await apiRequest("/api/public/customer-account/appointment-contact",{method:"PATCH",body:JSON.stringify({mobileNumber:mobile,facebookAccount:facebook,website:form.elements.website.value})});modal.hidden=true;show("Contact saved. Locking your appointment…",true);await lockSelected();}catch(error){message.textContent=error.message||"Unable to save appointment contact.";}}
  function resolveUrl(value){return /^(https?:)?\/\//.test(value)?value:`${getApiBaseUrl()}${value.startsWith("/")?value:`/${value}`}`;}
  function customerInitials(name){return name.split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join("")||"CU";}
  function escapeHtml(value){const div=document.createElement("div");div.textContent=value??"";return div.innerHTML;}
  document.querySelector("[data-week-prev]").addEventListener("click",()=>{state.weekStart=addDays(state.weekStart,-7);void load()});document.querySelector("[data-week-next]").addEventListener("click",()=>{state.weekStart=addDays(state.weekStart,7);void load()});document.querySelector("[data-week-today]").addEventListener("click",()=>{state.weekStart=startOfDay(new Date());void load()});window.addEventListener("customer-session-changed",()=>void handleCustomerSessionChanged());void load();
})();
