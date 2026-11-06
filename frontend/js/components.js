
document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // CONFIGURATION
    // =====================================

    const COMPONENTS_PATH = "components/";

    const SIDEBAR_URL = COMPONENTS_PATH + "sidebar.html";

    const FOOTER_URL = COMPONENTS_PATH + "footer.html";

    const LOGOUT_URL = "../backend/api/auth/logout.php";


    // =====================================
    // LOAD HTML COMPONENT
    // =====================================

    async function loadComponent(url, containerId) {

        const container = document.getElementById(containerId);

        if (!container) {

            console.error(`Container not found: ${containerId}`);

            return false;

        }

        try {

            const response = await fetch(url, {

                method: "GET",

                credentials: "same-origin"

            });


            if (!response.ok) {

                throw new Error(`Unable to load ${url}`);

            }


            const html = await response.text();

            container.innerHTML = html;

            return true;


        } catch (error) {

            console.error("Component loading error:", error);

            return false;

        }

    }


    // =====================================
    // THEME HANDLING
    // =====================================

    function applySidebarTheme() {

        const currentTheme =
            document.documentElement.getAttribute("data-theme") || "light";


        const sidebarLogo = document.getElementById("sidebarLogo");


        if (sidebarLogo) {

            sidebarLogo.src = currentTheme === "dark"

                ? "images/logo-dark.jpg"

                : "images/logo-light.jpg";

        }

    }


    // Update sidebar logo whenever another page changes theme.

    document.addEventListener(
        "moneyManagerThemeChanged",
        applySidebarTheme
    );


    // =====================================
    // ACTIVE PAGE HANDLING
    // =====================================

    function setActivePage() {

        const currentPage = window.location.pathname

            .split("/")

            .pop()

            .replace(".html", "");


        const sidebarLinks = document.querySelectorAll(".sidebar-link");


        sidebarLinks.forEach(link => {

            const pageName = link.dataset.page;


            if (pageName === currentPage) {

                link.classList.add("active");

                link.setAttribute("aria-current", "page");

            } else {

                link.classList.remove("active");

                link.removeAttribute("aria-current");

            }

        });

    }


    // =====================================
    // MOBILE SIDEBAR HANDLING
    // =====================================

    function initializeSidebar() {

        const sidebar = document.getElementById("appSidebar");

        const overlay = document.getElementById("sidebarOverlay");

        const closeButton = document.getElementById("sidebarClose");

        const menuButton = document.getElementById("sidebarMenuToggle");


        if (!sidebar || !overlay) {

            console.error("Sidebar or overlay not found.");

            return;

        }


        function openSidebar() {

            sidebar.classList.add("sidebar-open");

            overlay.classList.add("sidebar-overlay-visible");

            document.body.style.overflow = "hidden";

        }


        function closeSidebar() {

            sidebar.classList.remove("sidebar-open");

            overlay.classList.remove("sidebar-overlay-visible");

            document.body.style.overflow = "";

        }


        if (menuButton) {

            menuButton.addEventListener("click", openSidebar);

        }


        if (closeButton) {

            closeButton.addEventListener("click", closeSidebar);

        }


        overlay.addEventListener("click", closeSidebar);


        // Close sidebar after selecting a navigation link.

        sidebar.querySelectorAll(".sidebar-link").forEach(link => {

            link.addEventListener("click", closeSidebar);

        });


        // Close sidebar using Escape key.

        document.addEventListener("keydown", event => {

            if (event.key === "Escape") {

                closeSidebar();

            }

        });

    }


    // =====================================
    // LOGOUT HANDLING
    // =====================================

    function initializeLogout() {

        const logoutButton = document.getElementById(
            "sidebarLogoutButton"
        );


        if (!logoutButton) {

            console.error("Sidebar logout button not found.");

            return;

        }


        logoutButton.addEventListener("click", async () => {

            // Read the latest token at click time.

            const csrfToken = window.moneyManagerCsrfToken || "";


            if (!csrfToken) {

                alert("Security token is missing. Please refresh the page.");

                return;

            }


            logoutButton.disabled = true;


            try {

                const response = await fetch(LOGOUT_URL, {

                    method: "POST",

                    credentials: "same-origin",

                    headers: {

                        "Accept": "application/json",

                        "X-CSRF-Token": csrfToken

                    }

                });


                const data = await response.json();


                if (response.status === 401) {

                    window.location.replace("login.html");

                    return;

                }


                if (!response.ok || !data.success) {

                    throw new Error(
                        data.message || "Unable to logout."
                    );

                }


                // Redirect after successful logout.

                window.location.replace("login.html");


            } catch (error) {

                console.error("Logout error:", error);

                alert(
                    error.message ||
                    "Unable to logout. Please try again."
                );

                logoutButton.disabled = false;

            }

        });

    }


    // =====================================
    // FOOTER YEAR
    // =====================================

    function initializeFooter() {

        const footerYear = document.getElementById("footerYear");


        if (footerYear) {

            footerYear.textContent = new Date().getFullYear();

        }

    }


    // =====================================
    // INITIALIZE COMPONENTS
    // =====================================

    async function initializeComponents() {

        // Load Sidebar and Footer.

        const [sidebarLoaded, footerLoaded] = await Promise.all([

            loadComponent(SIDEBAR_URL, "sidebarContainer"),

            loadComponent(FOOTER_URL, "footerContainer")

        ]);


        // Initialize Sidebar.

        if (sidebarLoaded) {

            applySidebarTheme();

            setActivePage();

            initializeSidebar();

            initializeLogout();

        }


        // Initialize Footer.

        if (footerLoaded) {

            initializeFooter();

        }

    }


    // Start initialization.

    initializeComponents();

});
