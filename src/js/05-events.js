function isEventsPage() {
  return Boolean(document.querySelector("[data-events-view]"));
}

function getEventTypeLabel(value) {
  const labels = {
    ride: "Ride",
    workshop: "Workshop",
    get_together: "Get-together"
  };
  return labels[value] || "Event";
}

function getEventStatusLabel(value) {
  const labels = {
    published: "Published",
    open: "Open",
    full: "Full",
    closed: "Closed",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  return labels[value] || "Event";
}

function getEventStatusClass(value) {
  if (value === "open" || value === "published") {
    return "open";
  }
  if (value === "full") {
    return "full";
  }
  if (value === "cancelled") {
    return "cancelled";
  }
  return "closed";
}

function formatEventDate(value) {
  if (!value) {
    return "Date TBA";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date TBA";
  }

  return date.toLocaleDateString("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatEventTime(value) {
  if (!value) {
    return "Time TBA";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time TBA";
  }

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatEventDateTime(value) {
  if (!value) {
    return "TBA";
  }

  return `${formatEventDate(value)} | ${formatEventTime(value)}`;
}

function getEventPosterUrl(eventItem) {
  const url = normalizeApiUrl(eventItem?.posterImageUrl || eventItem?.posterUrl || eventItem?.imageUrl || "");
  if (!url) {
    return "";
  }
  const parsed = new URL(url, window.location.origin);
  parsed.searchParams.set("location", getSelectedPublicLocationSlug());
  return parsed.toString();
}

function getEventRegisteredCount(eventItem) {
  return Number(eventItem?.registeredCount ?? eventItem?.participantCount ?? eventItem?.participants?.filter((participant) => participant.status !== "cancelled").length ?? 0);
}

function getEventCapacityLabel(eventItem) {
  const registeredCount = getEventRegisteredCount(eventItem);
  const capacity = eventItem?.capacity;
  if (capacity === null || capacity === undefined || capacity === "") {
    return `${registeredCount} registered`;
  }
  return `${registeredCount} / ${capacity} slots`;
}

function getEventSlotsProgress(eventItem) {
  const registeredCount = Math.max(0, getEventRegisteredCount(eventItem));
  const capacity = Number(eventItem?.capacity);

  if (!Number.isFinite(capacity) || capacity <= 0) {
    return {
      label: `${registeredCount} slots taken`,
      percent: 0
    };
  }

  const displayCount = Math.min(registeredCount, capacity);
  return {
    label: `${displayCount} / ${capacity} slots taken`,
    percent: Math.min(100, Math.round((registeredCount / capacity) * 100))
  };
}

function createEventMetaItem(label, value, className = "") {
  const item = document.createElement("div");
  if (className) {
    item.className = className;
  }
  item.append(createTextElement("span", label), createTextElement("strong", value));
  return item;
}

function createEventSlotsProgress(eventItem) {
  const progress = getEventSlotsProgress(eventItem);
  const item = document.createElement("div");
  item.className = "event-meta-full event-slots-progress";
  item.append(createTextElement("span", "Slots"));

  const bar = document.createElement("div");
  bar.className = "event-slots-bar";
  bar.style.setProperty("--event-slots-percent", `${progress.percent}%`);
  const fill = document.createElement("span");
  fill.setAttribute("aria-hidden", "true");
  bar.append(fill, createTextElement("strong", progress.label));

  item.append(bar);
  return item;
}

function isEventRegistrationOpen(eventItem) {
  if (!eventItem) {
    return false;
  }

  if (eventItem.status !== "open" && eventItem.status !== "published") {
    return false;
  }

  const now = Date.now();
  if (eventItem.registrationOpensAt && new Date(eventItem.registrationOpensAt).getTime() > now) {
    return false;
  }
  if (eventItem.registrationClosesAt && new Date(eventItem.registrationClosesAt).getTime() < now) {
    return false;
  }

  const capacity = Number(eventItem.capacity);
  return !Number.isFinite(capacity) || capacity <= 0 || getEventRegisteredCount(eventItem) < capacity;
}

function getEventCurrentRegistration(eventItem) {
  if (eventItem?.currentRegistration) {
    return eventItem.currentRegistration;
  }

  const accountId = customerState.account?.id || customerState.profile?.id;
  if (!accountId || !Array.isArray(eventItem?.participants)) {
    return null;
  }

  return eventItem.participants.find((participant) =>
    (participant.publicCustomerAccountId || participant.customerAccountId || participant.accountId) === accountId &&
    participant.status !== "cancelled"
  ) || null;
}

function getEventParticipantAvatar(participant) {
  return normalizeApiUrl(participant.profilePictureUrl || participant.avatarUrl || participant.participantAvatarUrl || "");
}

function getEventParticipantName(participant) {
  return participant.displayName || participant.username || participant.participantName || "SMB Rider";
}

function getEventInitials(name) {
  return String(name || "SMB")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SMB";
}

function createEventAvatar(participant) {
  const name = getEventParticipantName(participant);
  const avatar = document.createElement("span");
  avatar.className = "event-avatar";
  const imageUrl = getEventParticipantAvatar(participant);
  if (imageUrl) {
    const image = document.createElement("img");
    image.alt = `${name} profile picture`;
    image.loading = "lazy";
    image.src = imageUrl;
    avatar.append(image);
  } else {
    avatar.textContent = getEventInitials(name);
  }
  return avatar;
}

function setEventsState(title, detail, actionLabel) {
  const list = document.querySelector("[data-events-list]");
  if (!list) {
    return;
  }

  const card = document.createElement("article");
  card.className = "events-state-card";
  card.append(
    createTextElement("h2", title),
    createTextElement("p", detail)
  );
  if (actionLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = actionLabel;
    button.addEventListener("click", () => loadEventsPageEvents());
    card.append(button);
  }
  list.replaceChildren(card);
}

function buildEventsQuery() {
  const params = new URLSearchParams();
  params.set("location", getSelectedPublicLocationSlug());
  params.set("v", "20260803-past-events");
  return params.toString();
}

async function loadEventsPageEvents() {
  if (!isEventsPage() || eventsState.isLoading) {
    return;
  }

  eventsState.isLoading = true;
  setEventsState("Loading events", "Checking SMBSystem for public rides, workshops, and get-togethers.");

  try {
    const query = buildEventsQuery();
    const rows = await apiRequest(`/api/public/events${query ? `?${query}` : ""}`);
    eventsState.events = Array.isArray(rows) ? rows : [];
    renderEventsList();
    const selectedId = new URLSearchParams(window.location.search).get("event");
    const selectedEvent = eventsState.events.find((eventItem) => String(eventItem.id) === selectedId);
    if (selectedId && selectedEvent && !isPastEvent(selectedEvent)) {
      await openEventDetail(selectedId, { updateUrl: false });
    } else if (selectedId) {
      window.history.replaceState({ view: "events" }, "", "events.html");
    }
  } catch (error) {
    const missingEndpoint = error.status === 404 || error.status === 405;
    setEventsState(
      missingEndpoint ? "Events API not ready" : "Events unavailable",
      missingEndpoint
        ? "SMBWeb2 is ready for /api/public/events, but SMBSystem still needs the public events API slice."
        : (error.message || "SMBSystem public events could not be loaded."),
      "Try Again"
    );
  } finally {
    eventsState.isLoading = false;
  }
}

function renderEventsList() {
  const list = document.querySelector("[data-events-list]");
  if (!list) {
    return;
  }

  if (eventsState.events.length === 0) {
    setEventsState("No public events", "There are no upcoming or past public events for this branch right now.");
    return;
  }

  const upcoming = eventsState.events
    .filter((eventItem) => !isPastEvent(eventItem))
    .sort((left, right) => getEventEffectiveTime(left) - getEventEffectiveTime(right));
  const past = eventsState.events
    .filter(isPastEvent)
    .sort((left, right) => getEventEffectiveTime(right) - getEventEffectiveTime(left));

  const sections = [];
  if (upcoming.length > 0) {
    sections.push(createEventsSection("Upcoming Events", upcoming.map((eventItem) => renderEventCard(eventItem, false))));
  } else {
    sections.push(createEventsSection("Upcoming Events", [createEventDetailState("No upcoming events", "There are no upcoming public events for this branch right now.")]));
  }
  if (past.length > 0) {
    sections.push(createEventsSection("Past Events", past.map((eventItem) => renderEventCard(eventItem, true))));
  }
  list.replaceChildren(...sections);
}

function createEventsSection(title, cards) {
  const section = document.createElement("section");
  section.className = "events-public-section";
  section.append(createTextElement("h2", title, "events-public-section-title"));
  const grid = document.createElement("div");
  grid.className = "events-public-section-grid";
  grid.append(...cards);
  section.append(grid);
  return section;
}

function getEventEffectiveTime(eventItem) {
  const value = eventItem?.endsAt || eventItem?.startsAt || eventItem?.assemblyAt;
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

function isPastEvent(eventItem) {
  if (typeof eventItem?.isPast === "boolean") {
    return eventItem.isPast;
  }
  return eventItem?.status === "completed" || getEventEffectiveTime(eventItem) < Date.now();
}

function getYouTubeVideoUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (host === "youtu.be") return url.pathname.replace(/^\/+|\/+$/g, "") ? url.href : "";
    if (host !== "youtube.com" && !host.endsWith(".youtube.com")) return "";
    if (url.pathname.toLowerCase().startsWith("/shorts/")) return url.pathname.slice(8).replace(/^\/+|\/+$/g, "") ? url.href : "";
    return url.pathname.toLowerCase() === "/watch" && url.searchParams.get("v") ? url.href : "";
  } catch {
    return "";
  }
}

function getEventCardSummary(eventItem) {
  const text = String(eventItem.summary || "Tap to view event details, participants, and registration status.").replace(/\s+/g, " ").trim();
  return text.length > 110 ? `${text.slice(0, 107).trim()}...` : text;
}

function renderEventCard(eventItem, isPast = isPastEvent(eventItem)) {
  const card = document.createElement("article");
  card.className = `event-public-card${isPast ? " is-past" : ""}`;

  const poster = document.createElement("div");
  poster.className = "event-public-poster";
  if (!isPast) {
    poster.tabIndex = 0;
    poster.setAttribute("role", "button");
    poster.setAttribute("aria-label", `View details for ${eventItem.title || "this event"}`);
    poster.addEventListener("click", () => openEventDetail(eventItem.id));
    poster.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openEventDetail(eventItem.id);
      }
    });
  }
  const posterUrl = getEventPosterUrl(eventItem);
  if (posterUrl) {
    const image = document.createElement("img");
    image.alt = eventItem.title || "SarapMagBike event poster";
    image.loading = "lazy";
    image.src = posterUrl;
    poster.append(image);
  } else {
    poster.append(createTextElement("span", getEventTypeLabel(eventItem.eventType)));
  }
  poster.append(createTextElement("strong", getEventTypeLabel(eventItem.eventType), "event-type-badge"));

  const body = document.createElement("div");
  body.className = "event-public-card-body";
  const statusRow = document.createElement("div");
  statusRow.className = "event-status-row";
  statusRow.append(
    createTextElement("span", isPast ? "Completed" : getEventStatusLabel(eventItem.status), `event-status ${isPast ? "completed" : getEventStatusClass(eventItem.status)}`),
    createTextElement("strong", getEventTypeLabel(eventItem.eventType))
  );

  const title = createTextElement("h2", eventItem.title || "SarapMagBike Event");
  if (isPast) {
    const message = createTextElement("p", "This event was already done.", "event-past-message");
    const date = createTextElement("p", formatEventDate(eventItem.assemblyAt), "event-past-date");
    const videoUrl = getYouTubeVideoUrl(eventItem.youtubeVideoUrl);
    const video = videoUrl ? document.createElement("a") : createTextElement("span", "YouTube video coming soon.", "event-youtube-pending");
    if (videoUrl) {
      video.href = videoUrl;
      video.target = "_blank";
      video.rel = "noopener noreferrer";
      video.className = "event-youtube-link";
      video.textContent = "Watch on YouTube ↗";
    }
    body.append(statusRow, title, date, message, video);
    card.append(poster, body);
    return card;
  }

  const summary = createTextElement("p", getEventCardSummary(eventItem), "event-card-summary");
  const meta = document.createElement("div");
  meta.className = "event-meta-grid";
  meta.append(
    createEventMetaItem("Date", formatEventDate(eventItem.assemblyAt)),
    createEventMetaItem("Assembly", formatEventTime(eventItem.assemblyAt)),
    createEventMetaItem("Meetup", eventItem.meetupPlace || `SarapMagBike ${getSelectedPublicLocationName()}`, "event-meta-full"),
    createEventMetaItem("Slots", getEventCapacityLabel(eventItem), "event-meta-full")
  );

  const action = document.createElement("button");
  action.type = "button";
  action.textContent = isEventRegistrationOpen(eventItem) ? "View / Join Event" : "View Details";
  action.addEventListener("click", () => openEventDetail(eventItem.id));

  body.append(statusRow, title, summary, meta, action);
  card.append(poster, body);
  return card;
}

function showEventListView() {
  document.querySelector("[data-events-list-layout]")?.removeAttribute("hidden");
  document.querySelector("[data-events-toolbar]")?.removeAttribute("hidden");
  document.querySelector("[data-event-detail]")?.setAttribute("hidden", "");
  eventsState.activeEvent = null;
  window.history.pushState({ view: "events" }, "", "events.html");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function openEventDetail(eventId, { updateUrl = true } = {}) {
  const detail = document.querySelector("[data-event-detail]");
  const content = document.querySelector("[data-event-detail-content]");
  if (!detail || !content || !eventId) {
    return;
  }

  document.querySelector("[data-events-list-layout]")?.setAttribute("hidden", "");
  document.querySelector("[data-events-toolbar]")?.setAttribute("hidden", "");
  detail.hidden = false;
  content.replaceChildren(createEventDetailState("Loading event details", "Checking SMBSystem for the latest event information."));

  try {
    const eventItem = await apiRequest(withPublicLocation(`/api/public/events/${eventId}`));
    if (isPastEvent(eventItem)) {
      document.querySelector("[data-events-list-layout]")?.removeAttribute("hidden");
      document.querySelector("[data-events-toolbar]")?.removeAttribute("hidden");
      detail.setAttribute("hidden", "");
      window.history.replaceState({ view: "events" }, "", "events.html");
      return;
    }
    eventsState.activeEvent = eventItem;
    renderEventDetail(eventItem);
    if (updateUrl) {
      window.history.pushState({ view: "event-detail", eventId }, "", `events.html?event=${encodeURIComponent(eventId)}`);
    }
  } catch (error) {
    content.replaceChildren(createEventDetailState("Event unavailable", error.message || "This event could not be loaded from SMBSystem."));
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function createEventDetailState(title, detail) {
  const card = document.createElement("article");
  card.className = "events-state-card";
  card.append(createTextElement("h2", title), createTextElement("p", detail));
  return card;
}

function sanitizeEventHtml(value) {
  return sanitizeRichText(value);
}

function renderEventDetail(eventItem) {
  const content = document.querySelector("[data-event-detail-content]");
  if (!content) {
    return;
  }

  const shell = document.createElement("div");
  shell.className = "event-detail-shell";

  const main = document.createElement("article");
  main.className = "event-detail-main";
  const posterUrl = getEventPosterUrl(eventItem);
  const poster = document.createElement("div");
  poster.className = "event-detail-poster";
  if (posterUrl) {
    const image = document.createElement("img");
    image.alt = eventItem.title || "SarapMagBike event poster";
    image.src = posterUrl;
    poster.append(image);
  } else {
    poster.append(createTextElement("span", getEventTypeLabel(eventItem.eventType)));
  }

  const copy = document.createElement("div");
  copy.className = "event-detail-copy";
  const statusRow = document.createElement("div");
  statusRow.className = "event-status-row";
  statusRow.append(
    createTextElement("span", getEventStatusLabel(eventItem.status), `event-status ${getEventStatusClass(eventItem.status)}`),
    createTextElement("strong", eventItem.isPaid ? pesoFormatter.format(Number(eventItem.feeAmount || 0)) : "Free event")
  );
  const title = createTextElement("h1", eventItem.title || "SarapMagBike Event");
  const summary = createTextElement("p", eventItem.summary || "Full event details and registration are managed through SMBSystem.");
  const description = document.createElement("div");
  description.className = "event-description";
  description.innerHTML = sanitizeEventHtml(eventItem.descriptionHtml || eventItem.description || "");
  copy.append(statusRow, title, summary, description);
  main.append(poster, copy);

  const aside = document.createElement("aside");
  aside.className = "event-detail-side";
  aside.append(renderEventFacts(eventItem), renderEventActionPanel(eventItem), renderEventParticipants(eventItem));
  shell.append(main, aside);
  content.replaceChildren(shell);
}

function renderEventFacts(eventItem) {
  const panel = document.createElement("section");
  panel.className = "event-info-panel";
  panel.append(createTextElement("h2", "Event information"));
  const facts = document.createElement("div");
  facts.className = "event-facts";
  [
    ["Assembly", formatEventDateTime(eventItem.assemblyAt)],
    ["Starts", eventItem.startsAt ? formatEventDateTime(eventItem.startsAt) : "TBA"],
    ["Ends", eventItem.endsAt ? formatEventDateTime(eventItem.endsAt) : "TBA"],
    ["Meetup", eventItem.meetupPlace || `SarapMagBike ${getSelectedPublicLocationName()}`],
    ["Slots", getEventCapacityLabel(eventItem)],
    ["Registration closes", eventItem.registrationClosesAt ? formatEventDateTime(eventItem.registrationClosesAt) : "Not set"]
  ].forEach(([label, value]) => {
    const fact = document.createElement("div");
    fact.append(createTextElement("span", label), createTextElement("strong", value));
    facts.append(fact);
  });
  panel.append(facts);
  if (eventItem.mapUrl) {
    const map = document.createElement("a");
    map.href = eventItem.mapUrl;
    map.target = "_blank";
    map.rel = "noreferrer";
    map.textContent = "Open Map";
    map.className = "event-panel-link";
    panel.append(map);
  }
  return panel;
}

function renderEventParticipants(eventItem) {
  const panel = document.createElement("section");
  panel.className = "event-info-panel";
  panel.append(createTextElement("h2", "Participants"));
  const participants = Array.isArray(eventItem.participants)
    ? eventItem.participants.filter((participant) => participant.status !== "cancelled")
    : [];
  const participantCount = eventItem.isPaid ? participants.length : (participants.length || getEventRegisteredCount(eventItem));
  panel.append(createTextElement("p", `${participantCount} ${eventItem.isPaid ? "confirmed" : "registered"} participant${participantCount === 1 ? "" : "s"}.`));

  if (eventItem.isPaid) {
    panel.append(createTextElement("p", "Only participants with confirmed proof of payment appear on this list. Check the status of your registration below.", "event-muted"));
  }

  if (participants.length === 0) {
    panel.append(createTextElement("p", eventItem.isPaid ? "Confirmed participants will appear here after staff reviews payment." : "Participant names will appear here after riders register.", "event-muted"));
    return panel;
  }

  const stack = document.createElement("div");
  stack.className = "event-avatar-stack";
  participants.slice(0, 5).forEach((participant) => stack.append(createEventAvatar(participant)));
  if (participants.length > 5) {
    const more = document.createElement("span");
    more.className = "event-avatar";
    more.textContent = `+${participants.length - 5}`;
    stack.append(more);
  }

  const list = document.createElement("ul");
  list.className = "event-participant-list";
  participants.slice(0, 8).forEach((participant) => {
    const item = document.createElement("li");
    const text = document.createElement("div");
    text.append(
      createTextElement("strong", getEventParticipantName(participant)),
      createTextElement("span", participant.status === "waitlisted" ? "Waitlisted" : "Registered")
    );
    item.append(createEventAvatar(participant), text);
    list.append(item);
  });

  panel.append(stack, list);
  return panel;
}

function renderEventActionPanel(eventItem) {
  const panel = document.createElement("section");
  panel.className = "event-info-panel event-action-panel";
  panel.append(createTextElement("h2", "Your registration"));

  const currentRegistration = getEventCurrentRegistration(eventItem);
  if (!customerState.account) {
    panel.append(createTextElement("p", "Log in or create a public customer profile to register for this event."));
    const actions = document.createElement("div");
    actions.className = "event-action-row";
    const login = document.createElement("button");
    login.type = "button";
    login.textContent = "Log in to Register";
    login.addEventListener("click", openCommunityLoginForm);
    const register = document.createElement("button");
    register.type = "button";
    register.textContent = "Create Account";
    register.addEventListener("click", openRegisterForm);
    actions.append(login, register);
    panel.append(actions);
    return panel;
  }

  if (currentRegistration) {
    const isCheckedIn = currentRegistration.status === "checked_in";
    const isWaitlisted = currentRegistration.status === "waitlisted";
    const paymentStatus = String(currentRegistration.paymentStatus || "unpaid").toLowerCase();
    const paymentConfirmed = !eventItem.isPaid || paymentStatus === "paid" || paymentStatus === "waived";
    const registrationNotice = document.createElement("div");
    registrationNotice.className = "event-registration-notice";
    const ticketIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    ticketIcon.setAttribute("aria-hidden", "true");
    ticketIcon.setAttribute("viewBox", "0 0 24 24");
    ticketIcon.innerHTML = '<path d="M2 9a3 3 0 0 0 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 0 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path>';
    const registrationNoticeCopy = document.createElement("div");
    registrationNoticeCopy.append(
      createTextElement("span", "You registered to this event."),
      createTextElement("strong", `Reg No: ${currentRegistration.registrationNumber || "Pending"}`)
    );
    registrationNotice.append(ticketIcon, registrationNoticeCopy);
    panel.append(registrationNotice);
    if (isCheckedIn) {
      panel.append(createTextElement("p", "Your attendance is confirmed.", "event-muted"));
    } else if (isWaitlisted) {
      panel.append(createTextElement("p", "Your registration is currently waitlisted.", "event-muted"));
    }
    panel.append(renderEventRegistrationRecord(currentRegistration));
    const registrationControls = document.createElement("div");
    registrationControls.className = "event-registration-controls";
    let registrationHelp = null;
    if (isCheckedIn) {
      const confirmed = document.createElement("button");
      confirmed.type = "button";
      confirmed.className = "event-attendance-confirmed";
      confirmed.textContent = "ATTENDANCE CONFIRMED";
      confirmed.disabled = true;
      registrationControls.append(confirmed);
    } else if (eventItem.isPaid && !paymentConfirmed) {
      const paymentAction = document.createElement("button");
      paymentAction.type = "button";
      paymentAction.className = paymentStatus === "pending_review" ? "event-payment-review-action" : "event-payment-proof-action";
      paymentAction.textContent = paymentStatus === "pending_review"
        ? "PROOF AWAITING REVIEW"
        : paymentStatus === "rejected"
          ? "UPLOAD NEW PROOF OF PAYMENT"
          : "UPLOAD PROOF OF PAYMENT";
      paymentAction.disabled = paymentStatus === "pending_review";
      if (!paymentAction.disabled) {
        paymentAction.addEventListener("click", openEventPaymentProofModal);
      }
      registrationControls.append(paymentAction);
      registrationHelp = createTextElement(
        "p",
        paymentStatus === "pending_review"
          ? "Your proof of payment is being reviewed by SarapMagBike staff."
          : paymentStatus === "rejected"
            ? "Your previous proof was rejected. Upload a new, clear screenshot for review."
            : "Upload proof of payment. Attendance confirmation appears after staff confirms payment.",
        "event-muted"
      );
    } else if (isWaitlisted) {
      const waitlisted = document.createElement("button");
      waitlisted.type = "button";
      waitlisted.className = "event-waitlisted-action";
      waitlisted.textContent = "WAITLISTED";
      waitlisted.disabled = true;
      registrationControls.append(waitlisted);
    } else {
      const confirmAttendance = document.createElement("button");
      confirmAttendance.type = "button";
      confirmAttendance.className = "event-confirm-attendance-action";
      confirmAttendance.textContent = "CONFIRM ATTENDANCE";
      confirmAttendance.disabled = eventItem.attendanceConfirmationEnabled === false;
      if (eventItem.attendanceConfirmationEnabled === false) {
        confirmAttendance.title = "The organizer has not enabled attendance confirmation yet.";
      }
      confirmAttendance.addEventListener("click", openEventAttendanceModal);
      registrationControls.append(confirmAttendance);
      if (eventItem.attendanceConfirmationEnabled === false) {
        registrationHelp = createTextElement("p", "Attendance confirmation will open after the organizer sets the event code.", "event-muted");
      }
    }
    if (!isCheckedIn) {
      const withdraw = document.createElement("button");
      withdraw.type = "button";
      withdraw.className = "event-danger-action";
      withdraw.textContent = "Withdraw Registration";
      withdraw.addEventListener("click", () => withdrawEventRegistration(eventItem.id));
      registrationControls.append(withdraw);
    }
    if (registrationControls.children.length > 0) {
      panel.append(registrationControls);
    }
    if (registrationHelp) {
      panel.append(registrationHelp);
    }
    return panel;
  }

  if (!isEventRegistrationOpen(eventItem)) {
    panel.append(createTextElement("p", eventItem.status === "full" ? "This event is full." : "Registration is not open for this event."));
    return panel;
  }

  panel.append(createTextElement("p", "Register using your public customer profile. Staff can review registrations in SMBSystem."));
  const register = document.createElement("button");
  register.type = "button";
  register.textContent = "Register for Event";
  register.addEventListener("click", openEventRegistrationModal);
  panel.append(register);
  return panel;
}

function getEventRegistrationStatusLabel(registration, eventItem) {
  const paymentStatus = String(registration?.paymentStatus || "").toLowerCase();
  if (eventItem?.isPaid) {
    if (paymentStatus === "paid" || paymentStatus === "waived") {
      return "CONFIRMED";
    }
    if (paymentStatus === "rejected") {
      return "REJECTED";
    }
    return "AWAITING CONFIRMATION";
  }

  return registration?.status === "waitlisted" ? "Waitlisted" : "Registered";
}

function renderEventRegistrationRecord(registration) {
  const record = document.createElement("dl");
  record.className = "event-registration-record";
  const accountName = customerState.profile?.username || customerState.account?.username || "Customer";
  const accountEmail = customerState.profile?.email || customerState.account?.email || "Not set";
  const eventItem = eventsState.activeEvent;
  const rows = [
    ["Registrant", accountName],
    ["Email", accountEmail],
    ["Status", getEventRegistrationStatusLabel(registration, eventItem)],
    ["Registered", registration.registeredAt ? formatEventDateTime(registration.registeredAt) : "Just now"],
    ["Attendance", registration.checkedInAt ? `Confirmed ${formatEventDateTime(registration.checkedInAt)}` : "Not confirmed"]
  ];

  if (eventItem?.isPaid) {
    rows.push(["Fee", pesoFormatter.format(Number(eventItem.feeAmount || 0))]);
    rows.push(["Payment", String(registration.paymentStatus || "unpaid").replace(/_/g, " ")]);
  }

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.append(createTextElement("dt", label), createTextElement("dd", value));
    record.append(row);
  });
  return record;
}

function openEventRegistrationModal() {
  const eventItem = eventsState.activeEvent;
  const modal = document.querySelector("[data-event-registration-modal]");
  const form = document.querySelector("[data-event-registration-form]");
  const title = document.querySelector("#event-registration-title");
  const message = document.querySelector("[data-event-registration-message]");
  const paymentFields = document.querySelector("[data-event-payment-fields]");
  const waiver = document.querySelector("[data-event-waiver]");
  const feeLabel = document.querySelector("[data-event-registration-fee]");
  if (!eventItem || !modal || !form) {
    return;
  }

  if (title) {
    title.textContent = `Register for ${eventItem.title || "event"}`;
  }
  setMessage(message, "");
  form.elements.participantName.value = customerState.profile?.username || customerState.account?.username || "";
  form.elements.participantEmail.value = customerState.profile?.email || customerState.account?.email || "";
  form.elements.bikeType.value = customerState.profile?.riderTypes?.[0] || "";
  form.elements.emergencyContactName.value = "";
  form.elements.emergencyContactPhone.value = "";
  if (form.elements.paymentProof) {
    form.elements.paymentProof.value = "";
  }
  form.elements.notes.value = "";
  const isRide = eventItem.eventType === "ride";
  form.elements.waiverAccepted.checked = false;
  form.elements.waiverAccepted.required = isRide;
  if (waiver) {
    waiver.hidden = !isRide;
  }
  const submit = document.querySelector("[data-event-registration-submit]");
  if (submit) {
    submit.disabled = isRide;
  }
  if (paymentFields) {
    paymentFields.hidden = !eventItem.isPaid;
  }
  if (feeLabel) {
    feeLabel.textContent = pesoFormatter.format(Number(eventItem.feeAmount || 0));
  }
  modal.hidden = false;
  form.elements.bikeType.focus();
}

function closeEventRegistrationModal() {
  document.querySelector("[data-event-registration-modal]")?.setAttribute("hidden", "");
}

function openEventAttendanceModal() {
  const eventItem = eventsState.activeEvent;
  const modal = document.querySelector("[data-event-attendance-modal]");
  const form = document.querySelector("[data-event-attendance-form]");
  const title = document.querySelector("#event-attendance-title");
  const message = document.querySelector("[data-event-attendance-message]");
  if (!eventItem || !modal || !form || eventItem.attendanceConfirmationEnabled === false) {
    return;
  }
  title.textContent = `Confirm attendance for ${eventItem.title || "event"}`;
  setMessage(message, "");
  form.reset();
  modal.hidden = false;
  form.elements.attendanceCode.focus();
}

function closeEventAttendanceModal() {
  document.querySelector("[data-event-attendance-modal]")?.setAttribute("hidden", "");
}

function openEventPaymentProofModal() {
  const eventItem = eventsState.activeEvent;
  const modal = document.querySelector("[data-event-payment-proof-modal]");
  const form = document.querySelector("[data-event-payment-proof-form]");
  const title = document.querySelector("#event-payment-proof-title");
  const fee = document.querySelector("[data-event-payment-proof-fee]");
  const message = document.querySelector("[data-event-payment-proof-message]");
  if (!eventItem?.isPaid || !modal || !form) {
    return;
  }
  title.textContent = `Upload payment proof for ${eventItem.title || "event"}`;
  fee.textContent = pesoFormatter.format(Number(eventItem.feeAmount || 0));
  setMessage(message, "");
  form.reset();
  modal.hidden = false;
  form.elements.paymentProof.focus();
}

function closeEventPaymentProofModal() {
  document.querySelector("[data-event-payment-proof-modal]")?.setAttribute("hidden", "");
}

async function submitEventPaymentProof(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const file = form.elements.paymentProof.files?.[0] || null;
  const message = document.querySelector("[data-event-payment-proof-message]");
  const submit = document.querySelector("[data-event-payment-proof-submit]");
  if (!eventsState.activeEvent || !file) {
    setMessage(message, "Select a proof of payment screenshot.", "error");
    return;
  }
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    setMessage(message, "Upload a JPG, PNG, WebP, or GIF screenshot.", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setMessage(message, "Proof of payment must be 5 MB or smaller.", "error");
    return;
  }

  submit.disabled = true;
  setMessage(message, "Uploading proof of payment...");
  try {
    const updated = await apiRequest(withPublicLocation(`/api/public/events/${eventsState.activeEvent.id}/payment-proof`), {
      method: "POST",
      body: JSON.stringify({
        paymentProofBase64: await readFileAsBase64(file),
        paymentProofContentType: file.type,
        paymentProofFileName: file.name
      })
    });
    eventsState.activeEvent = updated;
    closeEventPaymentProofModal();
    renderEventDetail(updated);
  } catch (error) {
    setMessage(message, error.message || "Unable to upload proof of payment.", "error");
  } finally {
    submit.disabled = false;
  }
}

async function submitEventAttendance(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("[data-event-attendance-message]");
  if (!eventsState.activeEvent) {
    return;
  }

  setMessage(message, "Confirming attendance...");
  try {
    const updated = await apiRequest(withPublicLocation(`/api/public/events/${eventsState.activeEvent.id}/attendance-confirmation`), {
      body: JSON.stringify({ attendanceCode: form.elements.attendanceCode.value.trim() }),
      method: "POST"
    });
    eventsState.activeEvent = updated;
    closeEventAttendanceModal();
    renderEventDetail(updated);
  } catch (error) {
    setMessage(message, error.message || "Unable to confirm attendance.", "error");
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() : result);
    });
    reader.addEventListener("error", () => reject(reader.error || new Error("Unable to read file.")));
    reader.readAsDataURL(file);
  });
}

async function buildEventRegistrationPayload(form) {
  const paymentProof = form.elements.paymentProof?.files?.[0] || null;
  const payload = {
    participantName: form.elements.participantName.value.trim(),
    participantEmail: form.elements.participantEmail.value.trim() || null,
    emergencyContactName: form.elements.emergencyContactName.value.trim() || null,
    emergencyContactPhone: form.elements.emergencyContactPhone.value.trim() || null,
    bikeType: form.elements.bikeType.value.trim() || null,
    notes: form.elements.notes.value.trim() || null,
    waiverAccepted: eventsState.activeEvent?.eventType !== "ride" || form.elements.waiverAccepted.checked
  };

  if (paymentProof) {
    payload.paymentProofBase64 = await readFileAsBase64(paymentProof);
    payload.paymentProofFileName = paymentProof.name;
    payload.paymentProofContentType = paymentProof.type;
  }

  return payload;
}

async function submitEventRegistration(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("[data-event-registration-message]");
  if (!eventsState.activeEvent) {
    return;
  }
  if (eventsState.activeEvent.eventType === "ride" && !form.elements.waiverAccepted.checked) {
    setMessage(message, "Accept the bike ride waiver before registering.", "error");
    return;
  }
  if (!form.elements.emergencyContactName.value.trim() || !form.elements.emergencyContactPhone.value.trim()) {
    setMessage(message, "Enter an emergency contact name and phone number.", "error");
    return;
  }

  setMessage(message, "Saving registration...");
  try {
    const payload = await buildEventRegistrationPayload(form);
    const updated = await apiRequest(withPublicLocation(`/api/public/events/${eventsState.activeEvent.id}/registration`), {
      body: JSON.stringify(payload),
      method: "POST"
    });
    eventsState.activeEvent = updated;
    closeEventRegistrationModal();
    renderEventDetail(updated);
  } catch (error) {
    setMessage(message, error.message || "Unable to register for this event.", "error");
  }
}

async function withdrawEventRegistration(eventId) {
  if (!eventId || !window.confirm("Withdraw your registration for this event?")) {
    return;
  }

  try {
    const updated = await apiRequest(withPublicLocation(`/api/public/events/${eventId}/registration`), { method: "DELETE" });
    eventsState.activeEvent = updated;
    renderEventDetail(updated);
  } catch (error) {
    window.alert(error.message || "Unable to withdraw registration.");
  }
}

function bindEventsUi() {
  if (!isEventsPage()) {
    return;
  }

  document.querySelector("[data-events-back]")?.addEventListener("click", showEventListView);
  document.querySelector("[data-event-registration-form]")?.addEventListener("submit", submitEventRegistration);
  document.querySelector("[data-event-waiver-checkbox]")?.addEventListener("change", (event) => {
    const submit = document.querySelector("[data-event-registration-submit]");
    if (submit) {
      submit.disabled = !event.currentTarget.checked;
    }
  });
  document.querySelector("[data-event-registration-close]")?.addEventListener("click", closeEventRegistrationModal);
  document.querySelector("[data-event-registration-cancel]")?.addEventListener("click", closeEventRegistrationModal);
  document.querySelector("[data-event-registration-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeEventRegistrationModal();
    }
  });
  document.querySelector("[data-event-attendance-form]")?.addEventListener("submit", submitEventAttendance);
  document.querySelector("[data-event-attendance-close]")?.addEventListener("click", closeEventAttendanceModal);
  document.querySelector("[data-event-attendance-cancel]")?.addEventListener("click", closeEventAttendanceModal);
  document.querySelector("[data-event-attendance-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeEventAttendanceModal();
    }
  });
  document.querySelector("[data-event-payment-proof-form]")?.addEventListener("submit", submitEventPaymentProof);
  document.querySelector("[data-event-payment-proof-close]")?.addEventListener("click", closeEventPaymentProofModal);
  document.querySelector("[data-event-payment-proof-cancel]")?.addEventListener("click", closeEventPaymentProofModal);
  document.querySelector("[data-event-payment-proof-modal]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeEventPaymentProofModal();
    }
  });
  window.addEventListener("popstate", () => {
    const eventId = new URLSearchParams(window.location.search).get("event");
    if (eventId) {
      openEventDetail(eventId, { updateUrl: false });
    } else {
      document.querySelector("[data-event-detail]")?.setAttribute("hidden", "");
      document.querySelector("[data-events-list-layout]")?.removeAttribute("hidden");
    }
  });
}
