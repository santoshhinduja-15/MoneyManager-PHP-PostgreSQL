document.addEventListener("DOMContentLoaded", () => {

    const API_URL = "../backend/api/reports.php";

    // ELEMENTS
    const startDate = document.getElementById("startDate");
    const endDate = document.getElementById("endDate");
    const typeFilter = document.getElementById("typeFilter");

    const applyFilterButton = document.getElementById("applyFilterButton");
    const resetFiltersButton = document.getElementById("resetFiltersButton");

    const loading = document.getElementById("reportsLoading");
    const reportContent = document.getElementById("reportContent");
    const reportEmpty = document.getElementById("reportEmpty");
    const alertMessage = document.getElementById("alertMessage");

    const monthlyReportBody = document.getElementById("monthlyReportBody");
    const categoryReportBody = document.getElementById("categoryReportBody");

    let incomeExpenseChart = null;
    let categoryChart = null;


    // =====================================
    // THEME
    // =====================================

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);

        localStorage.setItem("moneyManagerTheme", theme);

        document.getElementById("themeIcon").className =
            theme === "dark"
                ? "bi bi-sun-fill"
                : "bi bi-moon-stars-fill";

        document.dispatchEvent(
            new CustomEvent("moneyManagerThemeChanged", {
                detail: { theme }
            })
        );
    }

    applyTheme(
        localStorage.getItem("moneyManagerTheme") || "light"
    );

    document.getElementById("themeToggle").addEventListener("click", () => {
        const currentTheme =
            document.documentElement.getAttribute("data-theme");

        applyTheme(currentTheme === "dark" ? "light" : "dark");
    });


    // =====================================
    // DATE HELPERS
    // =====================================

    function getToday() {
        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function getFirstDayOfMonth() {
        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");

        return `${year}-${month}-01`;
    }

    startDate.max = getToday();
    endDate.max = getToday();

    startDate.value = getFirstDayOfMonth();
    endDate.value = getToday();


    // =====================================
    // ALERT
    // =====================================

    function showAlert(message, type = "danger") {
        alertMessage.innerHTML = "";

        alertMessage.className =
            `alert alert-${type} alert-dismissible fade show`;

        const text = document.createElement("span");
        text.textContent = message;

        const closeButton = document.createElement("button");

        closeButton.type = "button";
        closeButton.className = "btn-close";
        closeButton.setAttribute("data-bs-dismiss", "alert");
        closeButton.setAttribute("aria-label", "Close");

        alertMessage.append(text, closeButton);
    }


    // =====================================
    // CURRENCY
    // =====================================

    function formatCurrency(amount) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(amount || 0));
    }


    // =====================================
    // DATE FORMAT
    // =====================================

    function formatMonth(value) {
        const date = new Date(value + "-01T00:00:00");

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric"
        });
    }


    // =====================================
    // FETCH API
    // =====================================

    async function loadReports() {

        if (!startDate.value || !endDate.value) {
            showAlert("Please select both From Date and To Date.");
            return;
        }

        if (startDate.value > endDate.value) {
            showAlert("From Date cannot be later than To Date.");
            return;
        }

        if (
            startDate.value > getToday() ||
            endDate.value > getToday()
        ) {
            showAlert("Future dates are not allowed.");
            return;
        }

        loading.classList.remove("d-none");
        reportContent.classList.add("d-none");
        reportEmpty.classList.add("d-none");
        alertMessage.className = "alert d-none";

        applyFilterButton.disabled = true;
        applyFilterButton.textContent = "Generating...";

        try {

            const params = new URLSearchParams({
                start_date: startDate.value,
                end_date: endDate.value,
                type: typeFilter.value
            });

            const response = await fetch(
                `${API_URL}?${params.toString()}`,
                {
                    method: "GET",
                    credentials: "same-origin",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

            const text = await response.text();

            let data;

            try {
                data = JSON.parse(text);
            } catch (error) {
                console.error("Invalid API response:", text);

                throw new Error(
                    "Server returned an invalid response. Check PHP error logs."
                );
            }

            if (response.status === 401) {
                window.location.replace("login.html");
                return;
            }

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to generate report."
                );
            }

            loading.classList.add("d-none");

            if (Number(data.summary.total_transactions) === 0) {

                reportEmpty.classList.remove("d-none");

                destroyCharts();

                return;
            }

            reportContent.classList.remove("d-none");

            displaySummary(data.summary);

            displayMonthlyReport(data.monthly_report);

            displayCategoryReport(data.category_report);

            displayCharts(data);

        } catch (error) {

            loading.classList.add("d-none");

            console.error("Reports error:", error);

            showAlert(error.message);

        } finally {

            applyFilterButton.disabled = false;

            applyFilterButton.innerHTML =
                '<i class="bi bi-funnel"></i> Apply Filters';

        }
    }


    // =====================================
    // DISPLAY SUMMARY
    // =====================================

    function displaySummary(summary) {

        document.getElementById("totalIncome").textContent =
            formatCurrency(summary.total_income);

        document.getElementById("totalExpenses").textContent =
            formatCurrency(summary.total_expenses);

        document.getElementById("netSavings").textContent =
            formatCurrency(summary.net_savings);

        document.getElementById("totalTransactions").textContent =
            Number(summary.total_transactions || 0).toLocaleString("en-IN");
    }


    // =====================================
    // MONTHLY REPORT
    // =====================================

    function displayMonthlyReport(monthlyData) {

        monthlyReportBody.innerHTML = "";

        document.getElementById("monthlyEmpty").classList.add("d-none");

        if (!monthlyData || monthlyData.length === 0) {

            document.getElementById("monthlyEmpty").classList.remove("d-none");

            return;
        }

        monthlyData.forEach(item => {

            const row = document.createElement("tr");

            const monthCell = document.createElement("td");
            monthCell.textContent = formatMonth(item.month);

            const incomeCell = document.createElement("td");
            incomeCell.className = "text-end report-income";
            incomeCell.textContent = formatCurrency(item.income);

            const expenseCell = document.createElement("td");
            expenseCell.className = "text-end report-expense";
            expenseCell.textContent = formatCurrency(item.expenses);

            const savingsCell = document.createElement("td");
            savingsCell.className = "text-end report-savings";
            savingsCell.textContent = formatCurrency(item.savings);

            row.append(
                monthCell,
                incomeCell,
                expenseCell,
                savingsCell
            );

            monthlyReportBody.appendChild(row);
        });
    }


    // =====================================
    // CATEGORY REPORT
    // =====================================

    function displayCategoryReport(categoryData) {

        categoryReportBody.innerHTML = "";

        document.getElementById("categoryEmpty").classList.add("d-none");

        if (!categoryData || categoryData.length === 0) {

            document.getElementById("categoryEmpty").classList.remove("d-none");

            return;
        }

        categoryData.forEach(item => {

            const row = document.createElement("tr");

            const nameCell = document.createElement("td");

            const categoryName = document.createElement("span");

            categoryName.textContent = item.category_name;

            const color =
                /^#[0-9A-Fa-f]{6}$/.test(item.color)
                    ? item.color
                    : "#087f70";

            categoryName.className = "category-report-badge";

            categoryName.style.color = color;
            categoryName.style.backgroundColor = color + "20";

            nameCell.appendChild(categoryName);


            const typeCell = document.createElement("td");

            const typeBadge = document.createElement("span");

            typeBadge.className =
                item.category_type === "income"
                    ? "type-badge type-income"
                    : "type-badge type-expense";

            typeBadge.textContent =
                item.category_type === "income"
                    ? "Income"
                    : "Expense";

            typeCell.appendChild(typeBadge);


            const countCell = document.createElement("td");

            countCell.className = "text-end";

            countCell.textContent =
                Number(item.transaction_count).toLocaleString("en-IN");


            const amountCell = document.createElement("td");

            amountCell.className =
                item.category_type === "income"
                    ? "text-end report-income"
                    : "text-end report-expense";

            amountCell.textContent = formatCurrency(item.total_amount);


            row.append(
                nameCell,
                typeCell,
                countCell,
                amountCell
            );

            categoryReportBody.appendChild(row);
        });
    }


    // =====================================
    // DESTROY EXISTING CHARTS
    // =====================================

    function destroyCharts() {

        if (incomeExpenseChart) {
            incomeExpenseChart.destroy();
            incomeExpenseChart = null;
        }

        if (categoryChart) {
            categoryChart.destroy();
            categoryChart = null;
        }
    }


    // =====================================
    // DISPLAY CHARTS
    // =====================================

    function displayCharts(data) {

        destroyCharts();

        const isDark =
            document.documentElement.getAttribute("data-theme") === "dark";

        const textColor = isDark ? "#e5e7eb" : "#475569";

        const gridColor = isDark ? "#374151" : "#e2e8f0";


        // Income vs Expenses Chart

        const income = Number(data.summary.total_income || 0);

        const expenses = Number(data.summary.total_expenses || 0);

        const incomeExpenseContext =
            document.getElementById("incomeExpenseChart").getContext("2d");

        incomeExpenseChart = new Chart(incomeExpenseContext, {

            type: "bar",

            data: {
                labels: ["Income", "Expenses"],

                datasets: [{
                    label: "Amount",
                    data: [income, expenses],
                    backgroundColor: ["#22C55E", "#EF4444"],
                    borderRadius: 7,
                    maxBarThickness: 75
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label: context =>
                                formatCurrency(context.raw)
                        }
                    }
                },

                scales: {
                    x: {
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            display: false
                        }
                    },

                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                }
            }
        });


        // Category Chart

        const categoryData = data.category_report || [];

        const expenseCategories = categoryData.filter(item =>
            item.category_type === "expense"
        );

        const categoryCanvas =
            document.getElementById("categoryChart");

        const categoryEmpty =
            document.getElementById("categoryChartEmpty");

        if (expenseCategories.length === 0) {

            categoryCanvas.classList.add("d-none");

            categoryEmpty.classList.remove("d-none");

            return;
        }

        categoryCanvas.classList.remove("d-none");

        categoryEmpty.classList.add("d-none");

        const categoryContext = categoryCanvas.getContext("2d");

        categoryChart = new Chart(categoryContext, {

            type: "doughnut",

            data: {
                labels: expenseCategories.map(item =>
                    item.category_name
                ),

                datasets: [{
                    data: expenseCategories.map(item =>
                        Number(item.total_amount)
                    ),

                    backgroundColor: expenseCategories.map(item =>
                        /^#[0-9A-Fa-f]{6}$/.test(item.color)
                            ? item.color
                            : "#087f70"
                    ),

                    borderWidth: 2,
                    borderColor: isDark ? "#1f2937" : "#ffffff"
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        position: "bottom",

                        labels: {
                            color: textColor,
                            padding: 15
                        }
                    },

                    tooltip: {
                        callbacks: {
                            label: context =>
                                `${context.label}: ${formatCurrency(context.raw)}`
                        }
                    }
                }
            }
        });
    }


    // =====================================
    // APPLY FILTER
    // =====================================

    applyFilterButton.addEventListener("click", () => {
        loadReports();
    });


    // =====================================
    // RESET FILTERS
    // =====================================

    resetFiltersButton.addEventListener("click", () => {

        startDate.value = getFirstDayOfMonth();

        endDate.value = getToday();

        typeFilter.value = "";

        loadReports();
    });


    // =====================================
    // INITIAL LOAD
    // =====================================

    loadReports();

});