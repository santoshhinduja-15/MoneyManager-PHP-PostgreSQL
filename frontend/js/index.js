
// =====================================
// MoneyManager Landing Page JavaScript
// =====================================


// Navbar Toggle

const navbarToggler = document.getElementById("navbarToggler");

const navbarMenu = document.getElementById("navbarMenu");


navbarToggler.addEventListener("click", function () {

    navbarMenu.classList.toggle("show");

    const isExpanded = navbarMenu.classList.contains("show");

    navbarToggler.setAttribute("aria-expanded", isExpanded);

});


// Close Navbar After Clicking a Link

const navbarLinks = document.querySelectorAll(".navbar-nav .nav-link");

navbarLinks.forEach(function (link) {

    link.addEventListener("click", function () {

        navbarMenu.classList.remove("show");

        navbarToggler.setAttribute("aria-expanded", "false");

    });

});


// =====================================
// Dark Mode and Light Mode
// =====================================

const themeToggle = document.getElementById("themeToggle");

const themeIcon = document.getElementById("themeIcon");

const navbarLogo = document.getElementById("navbarLogo");

const heroLogo = document.getElementById("heroLogo");

const footerLogo = document.getElementById("footerLogo");

const favicon = document.querySelector('link[rel="icon"]');


// Change Theme

function applyTheme(theme) {

    document.documentElement.setAttribute("data-theme", theme);


    // Change Logos According to Theme

    if (theme === "dark") {

        navbarLogo.src = "frontend/images/logo-dark.jpg";

        heroLogo.src = "frontend/images/logo-dark.jpg";

        footerLogo.src = "frontend/images/logo-dark.jpg";

        favicon.href = "frontend/images/logo-dark.jpg";

        themeIcon.className = "bi bi-sun-fill";

        themeToggle.setAttribute("aria-label", "Switch to light mode");

        themeToggle.setAttribute("title", "Switch to light mode");

    } else {

        navbarLogo.src = "frontend/images/logo-light.jpg";

        heroLogo.src = "frontend/images/logo-light.jpg";

        footerLogo.src = "frontend/images/logo-light.jpg";

        favicon.href = "frontend/images/logo-light.jpg";

        themeIcon.className = "bi bi-moon-stars-fill";

        themeToggle.setAttribute("aria-label", "Switch to dark mode");

        themeToggle.setAttribute("title", "Switch to dark mode");

    }


    // Save Selected Theme

    try {

        localStorage.setItem("moneyManagerTheme", theme);

    } catch (error) {

        console.error("Unable to save theme preference:", error);

    }

}


// Load Saved Theme

let savedTheme = "light";

try {

    const storedTheme = localStorage.getItem("moneyManagerTheme");

    if (storedTheme === "dark" || storedTheme === "light") {

        savedTheme = storedTheme;

    }

} catch (error) {

    console.error("Unable to load saved theme:", error);

}


// Apply Theme When Page Loads

applyTheme(savedTheme);


// Toggle Between Dark Mode and Light Mode

themeToggle.addEventListener("click", function () {

    const currentTheme = document.documentElement.getAttribute("data-theme");

    const newTheme = currentTheme === "dark" ? "light" : "dark";

    applyTheme(newTheme);

});


// =====================================
// Current Year in Footer
// =====================================

const currentYear = document.getElementById("currentYear");

currentYear.textContent = new Date().getFullYear();


// =====================================
// FAQ: Allow Only One Question Open
// at a Time
// =====================================

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(function (item) {

    item.addEventListener("toggle", function () {

        if (item.open) {

            faqItems.forEach(function (otherItem) {

                if (otherItem !== item) {

                    otherItem.open = false;

                }

            });

        }

    });

});
