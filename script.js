const year = document.querySelector("#year");
const menuButton = document.querySelector(".menu-button");
const navLinks = document.querySelector(".nav-links");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuButton && navLinks) {
  menuButton.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navLinks.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}
