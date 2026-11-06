
document.addEventListener("DOMContentLoaded", () => {

    const API_URL = "../backend/api/dashboard.php";

    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");

    const alertMessage = document.getElementById("alertMessage");

    const transactionsLoading = document.getElementById("transactionsLoading");
    const emptyTransactions = document.getElementById("emptyTransactions");
    const transactionsTableContainer = document.getElementById("transactionsTableContainer");
    const transactionsTableBody = document.getElementById("transactionsTableBody");

    let csrfToken = "";


    // =====================================
    // THEME HANDLING
    // =====================================

    function applyTheme(theme) {

        document.documentElement.setAttribute("data-theme", theme);

        localStorage.setItem("moneyManagerTheme", theme);

        if (theme === "dark") {

            themeIcon.className = "bi bi-sun-fill";

        } else {

            themeIcon.className = "bi bi-moon-stars-fill";

        }

        // Notify shared components about theme change.

        document.dispatchEvent(
            new CustomEvent("moneyManagerThemeChanged", {
                detail: { theme: theme }
            })
        );

    }


    const savedTheme = localStorage.getItem("moneyManagerTheme") || "light";

    applyTheme(savedTheme);


    themeToggle.addEventListener("click", () => {

        const currentTheme =
            document.documentElement.getAttribute("data-theme");

        applyTheme(currentTheme === "dark" ? "light" : "dark");

    });


    // =====================================
    // GENERAL ALERT
    // =====================================

    function showAlert(message, type = "danger") {

        alertMessage.innerHTML = "";

        alertMessage.className =
            `alert alert-${type} alert-dismissible fade show`;

        const messageText = document.createElement("span");

        messageText.textContent = message;

        const closeButton = document.createElement("button");

        closeButton.type = "button";

        closeButton.className = "btn-close";

        closeButton.setAttribute("data-bs-dismiss", "alert");

        closeButton.setAttribute("aria-label", "Close");

        alertMessage.appendChild(messageText);

        alertMessage.appendChild(closeButton);

    }


    // =====================================
    // CURRENCY FORMATTING
    // =====================================

    function formatCurrency(amount) {

        const value = Number(amount || 0);

        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);

    }


    // =====================================
    // DATE FORMATTING
    // =====================================

    function formatDate(dateValue) {

        if (!dateValue) {

            return "-";

        }

        const date = new Date(dateValue + "T00:00:00");

        if (Number.isNaN(date.getTime())) {

            return dateValue;

        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

    }


    // =====================================
    // CURRENT DATE
    // =====================================

    function displayCurrentDate() {

        const today = new Date();

        document.getElementById("currentDate").textContent =
            today.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric"
            });

    }


    // =====================================
    // DISPLAY DASHBOARD SUMMARY
    // =====================================

    function displaySummary(summary) {

        document.getElementById("userFullName").textContent =
            summary.full_name || "User";

        document.getElementById("totalIncome").textContent =
            formatCurrency(summary.total_income);

        document.getElementById("totalExpenses").textContent =
            formatCurrency(summary.total_expenses);

        document.getElementById("netSavings").textContent =
            formatCurrency(summary.net_savings);

        document.getElementById("todayExpenses").textContent =
            formatCurrency(summary.today_expenses);

        document.getElementById("monthlyIncome").textContent =
            formatCurrency(summary.monthly_income);

        document.getElementById("monthlyExpenses").textContent =
            formatCurrency(summary.monthly_expenses);

        document.getElementById("monthlySavings").textContent =
            formatCurrency(summary.monthly_savings);

        document.getElementById("transactionCount").textContent =
            Number(summary.transaction_count || 0).toLocaleString("en-IN");

    }


    // =====================================
    // DISPLAY RECENT TRANSACTIONS
    // =====================================

    function displayTransactions(transactions) {

        transactionsTableBody.innerHTML = "";

        transactionsLoading.classList.add("d-none");


        if (!transactions || transactions.length === 0) {

            emptyTransactions.classList.remove("d-none");

            transactionsTableContainer.classList.add("d-none");

            return;

        }


        emptyTransactions.classList.add("d-none");

        transactionsTableContainer.classList.remove("d-none");


        transactions.forEach(transaction => {

            const row = document.createElement("tr");


            // Title

            const titleCell = document.createElement("td");

            const title = document.createElement("span");

            title.className = "transaction-title";

            title.textContent = transaction.title;

            titleCell.appendChild(title);


            // Category

            const categoryCell = document.createElement("td");

            const categoryBadge = document.createElement("span");

            categoryBadge.className = "category-badge";

            categoryBadge.textContent = transaction.category_name;

            const categoryColor =
                /^#[0-9A-Fa-f]{6}$/.test(transaction.category_color)
                    ? transaction.category_color
                    : "#087f70";

            categoryBadge.style.color = categoryColor;

            categoryBadge.style.backgroundColor = categoryColor + "20";

            categoryCell.appendChild(categoryBadge);


            // Type

            const typeCell = document.createElement("td");

            const typeBadge = document.createElement("span");

            const isIncome = transaction.transaction_type === "income";

            typeBadge.className = isIncome
                ? "type-badge type-income"
                : "type-badge type-expense";

            typeBadge.textContent = isIncome ? "Income" : "Expense";

            typeCell.appendChild(typeBadge);


            // Date

            const dateCell = document.createElement("td");

            dateCell.textContent = formatDate(
                transaction.transaction_date
            );


            // Amount

            const amountCell = document.createElement("td");

            amountCell.className = "text-end";

            amountCell.textContent =
                (isIncome ? "+ " : "- ") +
                formatCurrency(transaction.amount);

            amountCell.classList.add(
                isIncome ? "amount-income" : "amount-expense"
            );


            row.appendChild(titleCell);

            row.appendChild(categoryCell);

            row.appendChild(typeCell);

            row.appendChild(dateCell);

            row.appendChild(amountCell);

            transactionsTableBody.appendChild(row);

        });

    }


    // =====================================
    // LOAD DASHBOARD DATA
    // =====================================

    async function loadDashboard() {

        try {

            const response = await fetch(API_URL, {

                method: "GET",

                credentials: "same-origin",

                headers: {
                    "Accept": "application/json"
                }

            });


            const data = await response.json();


            // User Not Logged In

            if (response.status === 401) {

                window.location.replace("login.html");

                return;

            }


            if (!response.ok || !data.success) {

                console.error("Dashboard API Error:", data);

                throw new Error(
                    data.message || "Unable to load dashboard."
                );

            }


            // Store CSRF token for shared logout component.

            csrfToken = data.csrf_token;

            window.moneyManagerCsrfToken = csrfToken;


            // Display Dashboard Data

            displaySummary(data.summary);

            displayTransactions(data.recent_transactions);


        } catch (error) {

            transactionsLoading.classList.add("d-none");

            console.error("Dashboard loading error:", error);

            showAlert(
                error.message || "Unable to connect to the server."
            );

        }

    }


    // =====================================
    // INITIALIZE DASHBOARD
    // =====================================

    displayCurrentDate();

    loadDashboard();

});
