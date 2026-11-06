document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "../backend/api/transactions.php";
    const transactionForm = document.getElementById("transactionForm");
    const transactionModalElement = document.getElementById("transactionModal");
    const deleteModalElement = document.getElementById("deleteTransactionModal");
    const transactionModal = new bootstrap.Modal(transactionModalElement);
    const deleteModal = new bootstrap.Modal(deleteModalElement);

    // ELEMENTS
    const searchInput = document.getElementById("searchInput");
    const typeFilter = document.getElementById("typeFilter");
    const categoryFilter = document.getElementById("categoryFilter");
    const startDate = document.getElementById("startDate");
    const endDate = document.getElementById("endDate");
    const sortFilter = document.getElementById("sortFilter");

    const transactionType = document.getElementById("transactionType");
    const transactionCategory = document.getElementById("transactionCategory");

    const transactionTitle = document.getElementById("transactionTitle");
    const transactionAmount = document.getElementById("transactionAmount");
    const transactionDate = document.getElementById("transactionDate");
    const transactionDescription = document.getElementById("transactionDescription");
    const saveButton = document.getElementById("saveTransactionButton");
    const tableBody = document.getElementById("transactionsTableBody");
    const loading = document.getElementById("transactionsLoading");
    const emptyState = document.getElementById("emptyTransactions");
    const tableContainer = document.getElementById("transactionsTableContainer");
    const paginationContainer = document.getElementById("paginationContainer");
    const alertMessage = document.getElementById("alertMessage");
    const formAlertMessage = document.getElementById("formAlertMessage");

    // STATE
    let csrfToken = "";
    let categories = [];
    let currentPage = 1;
    let totalPages = 1;
    let editingTransactionId = null;
    let deletingTransactionId = null;
    const perPage = 10;
    let searchTimer = null;

    // THEME
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
        const currentTheme = document.documentElement.getAttribute("data-theme");
        applyTheme(currentTheme === "dark" ? "light" : "dark");
    });


    // ALERT
    function showAlert(message, type = "danger") {
        alertMessage.innerHTML = "";
        alertMessage.className = `alert alert-${type} alert-dismissible fade show`;

        const text = document.createElement("span");
        text.textContent = message;

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "btn-close";
        closeButton.setAttribute("data-bs-dismiss", "alert");
        closeButton.setAttribute("aria-label", "Close");

        alertMessage.append(text, closeButton);
    }

    function showFormAlert(message, type = "danger") {
        formAlertMessage.innerHTML = "";
        formAlertMessage.className =
            `alert alert-${type} alert-dismissible fade show`;

        const text = document.createElement("span");
        text.textContent = message;

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "btn-close";
        closeButton.setAttribute("data-bs-dismiss", "alert");
        closeButton.setAttribute("aria-label", "Close");

        formAlertMessage.append(text, closeButton);
    }


    // CURRENCY
    function formatCurrency(amount) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(amount || 0));
    }


    // DATE
    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value + "T00:00:00");

        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function getToday() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    // Disable future dates in transaction date picker
    transactionDate.max = getToday();


    // FIELD VALIDATION HELPERS
    const fields = {
        title: transactionTitle,
        type: transactionType,
        category: transactionCategory,
        amount: transactionAmount,
        date: transactionDate,
        description: transactionDescription
    };

    const errorElements = {
        title: document.getElementById("titleError"),
        type: document.getElementById("typeError"),
        category: document.getElementById("categoryError"),
        amount: document.getElementById("amountError"),
        date: document.getElementById("dateError"),
        description: document.getElementById("descriptionError")
    };


    // SHOW FIELD ERROR
    function setFieldError(fieldName, message) {
        const field = fields[fieldName];
        const errorContainer = errorElements[fieldName];

        if (!field || !errorContainer) return;

        // Remove previous error for this field only
        errorContainer.innerHTML = "";

        // Add red border
        field.classList.add("is-invalid");

        // Date field: show simple red text instead of Bootstrap alert
        if (fieldName === "date") {
            errorContainer.textContent = message;
            return;
        }

        // Create Bootstrap dismissible alert for other fields
        const alert = document.createElement("div");
        alert.className =
            "alert alert-danger alert-dismissible fade show field-error-alert";
        alert.setAttribute("role", "alert");

        const errorText = document.createElement("span");
        errorText.className = "error-message";
        errorText.textContent = message;

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "btn-close";
        closeButton.setAttribute("data-bs-dismiss", "alert");
        closeButton.setAttribute("aria-label", "Close");

        alert.append(errorText, closeButton);
        errorContainer.appendChild(alert);
    }


    // CLEAR ONE FIELD ERROR
    function clearFieldError(fieldName) {
        const field = fields[fieldName];
        const errorContainer = errorElements[fieldName];

        if (!field || !errorContainer) return;

        field.classList.remove("is-invalid");
        errorContainer.innerHTML = "";
    }


    // CLEAR ALL FIELD ERRORS
    function clearAllErrors() {
        Object.keys(fields).forEach(fieldName => {
            clearFieldError(fieldName);
        });

        formAlertMessage.className = "alert d-none";
        formAlertMessage.innerHTML = "";
    }


    // LOAD CATEGORIES
    function populateCategories() {
        const selectedType = transactionType.value;
        const selectedValue = transactionCategory.value;

        transactionCategory.innerHTML =
            '<option value="">Select Category</option>';

        const filteredCategories = categories.filter(category =>
            category.category_type === selectedType
        );

        filteredCategories.forEach(category => {
            const option = document.createElement("option");
            option.value = category.id;
            option.textContent = category.category_name;
            transactionCategory.appendChild(option);
        });

        transactionCategory.disabled = !selectedType;

        if (
            selectedValue &&
            filteredCategories.some(category =>
                String(category.id) === String(selectedValue)
            )
        ) {
            transactionCategory.value = selectedValue;
        }
    }


    function populateCategoryFilter() {
        const selectedType = typeFilter.value;
        const selectedValue = categoryFilter.value;

        categoryFilter.innerHTML =
            '<option value="">All Categories</option>';

        categories
            .filter(category =>
                !selectedType ||
                category.category_type === selectedType
            )
            .forEach(category => {
                const option = document.createElement("option");

                option.value = category.id;

                option.textContent =
                    `${category.category_name} (${category.category_type})`;

                categoryFilter.appendChild(option);
            });

        if (
            selectedValue &&
            Array.from(categoryFilter.options).some(option =>
                option.value === selectedValue
            )
        ) {
            categoryFilter.value = selectedValue;
        }
    }


    transactionType.addEventListener("change", () => {
        transactionCategory.value = "";

        populateCategories();

        validateField("type");
        validateField("category");
    });


    // =====================================
    // FETCH API HELPER
    // =====================================

    async function apiRequest(method, body = null, params = {}) {
        const url = new URL(API_URL, window.location.href);

        Object.entries(params).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
                url.searchParams.set(key, value);
            }
        });

        const options = {
            method,
            credentials: "same-origin",
            headers: {
                "Accept": "application/json"
            }
        };

        if (body !== null) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }

        if (method !== "GET") {
            options.headers["X-CSRF-Token"] = csrfToken;
        }

        const response = await fetch(url, options);
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
            throw new Error("Please login to continue.");
        }

        if (!response.ok || !data.success) {
            const error = new Error(
                data.message || "Something went wrong."
            );

            error.fieldErrors = data.errors || data.field_errors || {};

            throw error;
        }

        return data;
    }


    // =====================================
    // LOAD TRANSACTIONS
    // =====================================

    async function loadTransactions() {
        loading.classList.remove("d-none");
        emptyState.classList.add("d-none");
        tableContainer.classList.add("d-none");
        paginationContainer.classList.add("d-none");

        try {
            const data = await apiRequest("GET", null, {
                page: currentPage,
                limit: perPage,
                search: searchInput.value.trim(),
                type: typeFilter.value,
                category_id: categoryFilter.value,
                start_date: startDate.value,
                end_date: endDate.value,
                sort: sortFilter.value
            });

            loading.classList.add("d-none");

            csrfToken = data.csrf_token;
            window.moneyManagerCsrfToken = csrfToken;

            categories = data.categories;

            populateCategoryFilter();
            displaySummary(data.summary);
            displayTransactions(data.transactions);
            displayPagination(data.pagination);

        } catch (error) {
            loading.classList.add("d-none");

            console.error("Transactions error:", error);

            showAlert(error.message);
        }
    }


    // =====================================
    // DISPLAY SUMMARY
    // =====================================

    function displaySummary(summary) {
        document.getElementById("totalTransactions").textContent =
            Number(summary.total_transactions || 0).toLocaleString("en-IN");

        document.getElementById("filteredIncome").textContent =
            formatCurrency(summary.total_income);

        document.getElementById("filteredExpenses").textContent =
            formatCurrency(summary.total_expenses);
    }


    // =====================================
    // DISPLAY TRANSACTIONS
    // =====================================

    function displayTransactions(transactions) {
        tableBody.innerHTML = "";

        if (!transactions || transactions.length === 0) {
            emptyState.classList.remove("d-none");
            tableContainer.classList.add("d-none");
            return;
        }

        emptyState.classList.add("d-none");
        tableContainer.classList.remove("d-none");

        transactions.forEach(transaction => {
            const row = document.createElement("tr");

            const isIncome =
                transaction.transaction_type === "income";


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

            const color =
                /^#[0-9A-Fa-f]{6}$/.test(transaction.category_color)
                    ? transaction.category_color
                    : "#087f70";

            categoryBadge.style.color = color;
            categoryBadge.style.backgroundColor = color + "20";

            categoryCell.appendChild(categoryBadge);


            // Type
            const typeCell = document.createElement("td");
            const typeBadge = document.createElement("span");

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


            // Actions
            const actionCell = document.createElement("td");
            const actionWrapper = document.createElement("div");

            actionWrapper.className = "action-buttons";

            const editButton = document.createElement("button");

            editButton.type = "button";
            editButton.className = "action-btn edit-btn";
            editButton.title = "Edit Transaction";
            editButton.innerHTML = '<i class="bi bi-pencil"></i>';

            editButton.addEventListener("click", () => {
                openEditModal(transaction);
            });

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.className = "action-btn delete-btn";
            deleteButton.title = "Delete Transaction";
            deleteButton.innerHTML = '<i class="bi bi-trash"></i>';

            deleteButton.addEventListener("click", () => {
                openDeleteModal(transaction.id);
            });

            actionWrapper.append(editButton, deleteButton);
            actionCell.appendChild(actionWrapper);

            row.append(
                titleCell,
                categoryCell,
                typeCell,
                dateCell,
                amountCell,
                actionCell
            );

            tableBody.appendChild(row);
        });
    }


    // =====================================
    // PAGINATION
    // =====================================

    function displayPagination(pagination) {
        currentPage = Number(pagination.current_page);
        totalPages = Number(pagination.total_pages);

        const totalRecords = Number(pagination.total_records);

        if (totalRecords === 0) {
            paginationContainer.classList.add("d-none");
            return;
        }

        paginationContainer.classList.remove("d-none");

        const start = ((currentPage - 1) * perPage) + 1;

        const end = Math.min(
            currentPage * perPage,
            totalRecords
        );

        document.getElementById("paginationInfo").textContent =
            `Showing ${start} to ${end} of ${totalRecords} transactions`;

        document.getElementById("currentPageNumber").textContent =
            `${currentPage} / ${totalPages}`;

        document.getElementById("previousPageButton").disabled =
            currentPage <= 1;

        document.getElementById("nextPageButton").disabled =
            currentPage >= totalPages;
    }


    document.getElementById("previousPageButton").addEventListener(
        "click",
        () => {
            if (currentPage > 1) {
                currentPage--;
                loadTransactions();
            }
        }
    );


    document.getElementById("nextPageButton").addEventListener(
        "click",
        () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadTransactions();
            }
        }
    );


    // =====================================
    // FILTER EVENTS
    // =====================================

    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {
            currentPage = 1;
            loadTransactions();
        }, 350);
    });


    [
        typeFilter,
        categoryFilter,
        startDate,
        endDate,
        sortFilter
    ].forEach(element => {
        element.addEventListener("change", () => {
            if (
                startDate.value &&
                endDate.value &&
                startDate.value > endDate.value
            ) {
                showAlert("From Date cannot be later than To Date.");
                return;
            }

            currentPage = 1;

            if (element === typeFilter) {
                populateCategoryFilter();
            }

            loadTransactions();
        });
    });


    document.getElementById("resetFiltersButton").addEventListener(
        "click",
        () => {
            searchInput.value = "";
            typeFilter.value = "";
            categoryFilter.value = "";
            startDate.value = "";
            endDate.value = "";
            sortFilter.value = "newest";

            populateCategoryFilter();

            currentPage = 1;

            loadTransactions();
        }
    );


    // =====================================
    // RESET FORM
    // =====================================

    function resetForm() {
        transactionForm.reset();

        editingTransactionId = null;

        clearAllErrors();

        transactionCategory.innerHTML =
            '<option value="">Select Category</option>';

        transactionCategory.disabled = true;

        saveButton.disabled = false;
        saveButton.textContent = "Save Transaction";

        document.getElementById("transactionModalTitle").textContent =
            "Add Transaction";
    }


    // =====================================
    // ADD TRANSACTION
    // =====================================

    document.getElementById("addTransactionButton").addEventListener(
        "click",
        () => {
            resetForm();

            populateCategories();

            transactionModal.show();
        }
    );


    // =====================================
    // EDIT TRANSACTION
    // =====================================

    function openEditModal(transaction) {
        resetForm();

        editingTransactionId = transaction.id;

        document.getElementById("transactionModalTitle").textContent =
            "Edit Transaction";

        saveButton.textContent = "Update Transaction";

        transactionTitle.value = transaction.title;

        transactionType.value = transaction.transaction_type;

        populateCategories();

        transactionCategory.value = transaction.category_id;

        transactionAmount.value = transaction.amount;

        transactionDate.value = transaction.transaction_date;

        transactionDescription.value =
            transaction.description || "";

        transactionModal.show();
    }


    // =====================================
    // CLIENT-SIDE FIELD VALIDATION
    // =====================================

    function getFieldError(fieldName) {
        const title = transactionTitle.value.trim();
        const type = transactionType.value;
        const category = transactionCategory.value;
        const amount = transactionAmount.value.trim();
        const date = transactionDate.value;
        const description = transactionDescription.value.trim();

        switch (fieldName) {
            case "title":
                if (title.length < 2 || title.length > 100) {
                    return "Title must contain 2 to 100 characters.";
                }
                break;

            case "type":
                if (!["income", "expense"].includes(type)) {
                    return "Please select a valid transaction type.";
                }
                break;

            case "category":
                if (!category) {
                    return "Please select a category.";
                }

                const selectedCategory = categories.find(item =>
                    String(item.id) === String(category)
                );

                if (
                    !selectedCategory ||
                    selectedCategory.category_type !== type
                ) {
                    return "Please select a valid category for this transaction type.";
                }
                break;

            case "amount":
                if (
                    !/^\d{1,10}(\.\d{1,2})?$/.test(amount) ||
                    Number(amount) <= 0 ||
                    Number(amount) > 9999999999.99
                ) {
                    return "Enter a valid amount with maximum 2 decimal places.";
                }
                break;

            case "date":
                if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    return "Please select a valid date.";
                }

                const [year, month, day] = date.split("-").map(Number);

                const parsedDate = new Date(year, month - 1, day);

                // Validate date without timezone conversion
                if (
                    parsedDate.getFullYear() !== year ||
                    parsedDate.getMonth() !== month - 1 ||
                    parsedDate.getDate() !== day
                ) {
                    return "Please select a valid date.";
                }

                // Prevent future dates
                if (date > getToday()) {
                    return "Future dates are not allowed.";
                }

                break;

            case "description":
                if (description.length > 500) {
                    return "Description cannot exceed 500 characters.";
                }
                break;
        }

        return "";
    }


    // VALIDATE ONE FIELD
    function validateField(fieldName) {
        const errorMessage = getFieldError(fieldName);

        if (errorMessage) {
            setFieldError(fieldName, errorMessage);
            return false;
        }

        clearFieldError(fieldName);
        return true;
    }


    // VALIDATE ALL FIELDS
    function validateForm() {
        formAlertMessage.className = "alert d-none";
        formAlertMessage.innerHTML = "";

        let isValid = true;

        Object.keys(fields).forEach(fieldName => {
            if (!validateField(fieldName)) {
                isValid = false;
            }
        });

        if (!isValid) {
            const firstInvalid = transactionForm.querySelector(".is-invalid");
            firstInvalid?.focus();
        }

        return isValid;
    }


    // =====================================
    // FIELD VALIDATION EVENTS
    // =====================================

    // Validate after leaving a field
    transactionTitle.addEventListener("blur", () => {
        validateField("title");
    });

    transactionType.addEventListener("blur", () => {
        validateField("type");
    });

    transactionCategory.addEventListener("blur", () => {
        validateField("category");
    });

    transactionAmount.addEventListener("blur", () => {
        validateField("amount");
    });

    transactionDate.addEventListener("blur", () => {
        validateField("date");
    });

    transactionDescription.addEventListener("blur", () => {
        if (transactionDescription.classList.contains("is-invalid")) {
            validateField("description");
        }
    });


    // Remove error immediately when the field is corrected
    transactionTitle.addEventListener("input", () => {
        if (transactionTitle.classList.contains("is-invalid")) {
            validateField("title");
        }
    });

    transactionCategory.addEventListener("change", () => {
        if (transactionCategory.classList.contains("is-invalid")) {
            validateField("category");
        }
    });

    transactionAmount.addEventListener("input", () => {
        if (transactionAmount.classList.contains("is-invalid")) {
            validateField("amount");
        }
    });

    transactionDate.addEventListener("change", () => {
        validateField("date");
    });

    transactionDescription.addEventListener("input", () => {
        if (transactionDescription.classList.contains("is-invalid")) {
            validateField("description");
        }
    });


    // =====================================
    // SERVER-SIDE FIELD ERRORS
    // =====================================

    function displayServerFieldErrors(serverErrors) {
        const fieldNameMap = {
            title: "title",
            transaction_title: "title",
            type: "type",
            transaction_type: "type",
            category: "category",
            category_id: "category",
            amount: "amount",
            date: "date",
            transaction_date: "date",
            description: "description"
        };

        let hasFieldErrors = false;

        Object.entries(serverErrors).forEach(([key, message]) => {
            const fieldName = fieldNameMap[key];

            if (fieldName && typeof message === "string") {
                setFieldError(fieldName, message);
                hasFieldErrors = true;
            }
        });

        return hasFieldErrors;
    }


    // =====================================
    // SAVE / UPDATE TRANSACTION
    // =====================================

    transactionForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        saveButton.disabled = true;

        saveButton.textContent = editingTransactionId
            ? "Updating..."
            : "Saving...";

        const payload = {
            title: transactionTitle.value.trim(),
            transaction_type: transactionType.value,
            category_id: transactionCategory.value,
            amount: transactionAmount.value.trim(),
            transaction_date: transactionDate.value,
            description: transactionDescription.value.trim()
        };

        try {
            const method = editingTransactionId ? "PUT" : "POST";

            if (editingTransactionId) {
                payload.id = editingTransactionId;
            }

            const data = await apiRequest(method, payload);

            transactionModal.hide();

            resetForm();

            currentPage = 1;

            showAlert(data.message, "success");

            await loadTransactions();

        } catch (error) {
            const hasFieldErrors =
                displayServerFieldErrors(error.fieldErrors || {});

            if (!hasFieldErrors) {
                showFormAlert(error.message);
            } else {
                formAlertMessage.className = "alert d-none";
                formAlertMessage.innerHTML = "";
            }

            const firstInvalid =
                transactionForm.querySelector(".is-invalid");

            firstInvalid?.focus();

        } finally {
            saveButton.disabled = false;

            saveButton.textContent = editingTransactionId
                ? "Update Transaction"
                : "Save Transaction";
        }
    });


    // =====================================
    // DELETE TRANSACTION
    // =====================================

    function openDeleteModal(id) {
        deletingTransactionId = id;
        deleteModal.show();
    }


    document.getElementById("confirmDeleteButton").addEventListener(
        "click",
        async () => {
            if (!deletingTransactionId) return;

            const button = document.getElementById("confirmDeleteButton");

            button.disabled = true;
            button.textContent = "Deleting...";

            try {
                await apiRequest("DELETE", {
                    id: deletingTransactionId
                });

                deleteModal.hide();

                deletingTransactionId = null;

                showAlert("Transaction deleted successfully.", "success");

                if (currentPage > 1 && tableBody.children.length === 1) {
                    currentPage--;
                }

                await loadTransactions();

            } catch (error) {
                showAlert(error.message);

            } finally {
                button.disabled = false;
                button.textContent = "Delete";
            }
        }
    );


    transactionModalElement.addEventListener(
        "hidden.bs.modal",
        resetForm
    );

    loadTransactions();

});