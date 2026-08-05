async function startCatalog() {
  await initializePublicLocations();
  if (await enforcePublicWebsiteMode()) {
    return;
  }

  bindScrambleLabels();
  ensureConsistentSiteHeader();
  renderCategoryNav();
  setupMobileNavigationBelt();
  initializeStoryUpdateBadge();
  removeLegacyHeaderTools();
  ensureStandardCustomerHeaderActions();
  ensureStandardMobileHeaderActions();
  ensureStandardProductSearchActions();
  ensureCustomerLoginPrompt();
  initializeHeroLeaderboardCarousel();
  initializeRecentPurchases();
  initializeLeaderboardPage();
  initializeNotifications();
  initializeCartUi();
  bindCustomerAccountUi();
  initializeKapotpotFinder();
  bindCatalogUi();
  bindProductSearchUi();
  bindProductSearchPageUi();
  setupFeatureTileBelt();
  bindServiceFilters();
  bindCommunityUi();
  bindEventsUi();
  bindSocialPreviewLinks();
  loadProductDetailPage();
  loadServiceDetailPage();
  loadProductSearchPage();
  const requestedCatalogKey = getRequestedCatalogKey();
  if (requestedCatalogKey && document.querySelector("[data-web-items-grid]")) {
    await openCategoryCatalog(requestedCatalogKey);
  } else if (isEventsPage()) {
    await loadEventsPageEvents();
  } else if (document.querySelector("[data-services-grid]")) {
    await loadManagedServices();
  } else {
    loadHomeProductItems();
  }
  if (document.body.classList.contains("is-coming-soon-page") && document.querySelector("[data-community-view]")) {
    updateCommunityAuthState();
    await loadCommunityDiscussions();
  }
  if (window.location.pathname === "/community" || window.location.hash === "#community") {
    openCommunityPage(false);
    await loadCommunityDiscussions();
    const requestedThreadId = new URLSearchParams(window.location.search).get("thread");
    if (requestedThreadId) {
      openCommunityThreadModal(requestedThreadId);
    }
    if (new URLSearchParams(window.location.search).get("login") === "1") {
      openCommunityLoginForm();
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startCatalog);
} else {
  startCatalog();
}

// ============================================================================
// PROGRESSIVE WEB APP (PWA) REGISTRATION AND CUSTOM INSTALLER
// ============================================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=20260805-location-check-v7')
      .then((reg) => {
        console.log('SMBWeb2 Service Worker registered successfully on scope:', reg.scope);
      })
      .catch((err) => {
        console.error('SMBWeb2 Service Worker registration failed:', err);
      });
  });
}

let deferredPrompt;
const installButtons = document.querySelectorAll('[data-install-pwa-btn]');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  installButtons.forEach(btn => {
    btn.removeAttribute('hidden');
    btn.style.display = 'inline-flex';
  });
});

installButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA installation outcome: ${outcome}`);
    deferredPrompt = null;
    installButtons.forEach(b => {
      b.setAttribute('hidden', '');
      b.style.display = 'none';
    });
  });
});

window.addEventListener('appinstalled', (evt) => {
  console.log('SarapMagBike PWA was successfully installed.');
});
