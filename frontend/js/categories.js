document.addEventListener("DOMContentLoaded", () => {

    const API_URL = "../backend/api/categories.php";

    // Bootstrap modals
    const categoryModalElement = document.getElementById("categoryModal");
    const deleteModalElement = document.getElementById("deleteCategoryModal");

    const categoryModal = new bootstrap.Modal(categoryModalElement);
    const deleteModal = new bootstrap.Modal(deleteModalElement);

    // Form elements
    const categoryForm = document.getElementById("categoryForm");
    const categoryName = document.getElementById("categoryName");
    const categoryType = document.getElementById("categoryType");
    const categoryDescription = document.getElementById("categoryDescription");
    const saveButton = document.getElementById("saveCategoryButton");

    // Display elements
    const categoriesGrid = document.getElementById("categoriesGrid");
    const loading = document.getElementById("categoriesLoading");
    const emptyState = document.getElementById("emptyCategories");
    const alertMessage = document.getElementById("alertMessage");
    const formAlertMessage = document.getElementById("formAlertMessage");

    // Filter elements
    const searchInput = document.getElementById("searchInput");
    const typeFilter = document.getElementById("typeFilter");

    // State
    let csrfToken = "";
    let categories = [];
    let editingCategoryId = null;
    let deletingCategoryId = null;
    let searchTimer = null;

    const allowedColors = {
        "#EF4444": "Red",
        "#22C55E": "Green",
        "#3B82F6": "Blue",
        "#EAB308": "Yellow",
        "#EC4899": "Pink",
        "#A855F7": "Purple",
        "#F97316": "Orange",
        "#14B8A6": "Teal",
        "#06B6D4": "Cyan",
        "#6B7280": "Gray"
    };


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
    // GENERAL ALERT
    // =====================================

    function showAlert(message, type = "danger") {

        alertMessage.replaceChildren();

        alertMessage.className =
            `alert alert-${type} alert-dismissible fade show`;

        alertMessage.setAttribute("role", "alert");

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
    // FORM ALERT
    // =====================================

    function showFormAlert(message) {

        formAlertMessage.replaceChildren();

        formAlertMessage.className =
            "alert alert-danger alert-dismissible fade show";

        const text = document.createElement("span");
        text.textContent = message;

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "btn-close";
        closeButton.setAttribute("data-bs-dismiss", "alert");
        closeButton.setAttribute("aria-label", "Close");

        formAlertMessage.append(text, closeButton);

    }

    function clearFormAlert() {

        formAlertMessage.replaceChildren();
        formAlertMessage.className = "alert d-none";

    }


    // =====================================
    // FORM FIELD REFERENCES
    // =====================================

    const fields = {
        name: categoryName,
        type: categoryType,
        description: categoryDescription
    };

    const errorElements = {
        name: document.getElementById("nameError"),
        type: document.getElementById("typeError"),
        description: document.getElementById("descriptionError"),
        color: document.getElementById("colorError")
    };


    // =====================================
    // BOOTSTRAP FIELD ERROR HANDLING
    // =====================================

    function setFieldError(field, message) {

        clearFieldError(field);

        let input;

        if (field === "color") {

            input = document.getElementById("colorOptions");

            input.classList.add("is-invalid");

        } else {

            input = fields[field];

            input.classList.add("is-invalid");

        }

        const container = errorElements[field];

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

        container.appendChild(alert);

    }


    function clearFieldError(field) {

        if (field === "color") {

            document.getElementById("colorOptions")
                .classList.remove("is-invalid");

        } else {

            fields[field].classList.remove("is-invalid");

        }

        errorElements[field].replaceChildren();

    }


    function clearAllErrors() {

        Object.keys(errorElements).forEach(field => {
            clearFieldError(field);
        });

        clearFormAlert();

    }


    // =====================================
    // API REQUEST
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

        const responseText = await response.text();

        let data;

        try {

            data = JSON.parse(responseText);

        } catch (error) {

            console.error("Invalid API response:", responseText);

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

            // Backend field validation errors, if supplied.
            error.fieldErrors = data.errors || data.field_errors || {};

            throw error;

        }

        return data;

    }


    // =====================================
    // LOAD CATEGORIES
    // =====================================

    async function loadCategories() {

        loading.classList.remove("d-none");

        categoriesGrid.classList.add("d-none");

        emptyState.classList.add("d-none");

        try {

            const data = await apiRequest("GET", null, {

                search: searchInput.value.trim(),

                type: typeFilter.value

            });

            csrfToken = data.csrf_token;

            window.moneyManagerCsrfToken = csrfToken;

            categories = data.categories;

            displaySummary(data.summary);

            displayCategories(categories);

        } catch (error) {

            console.error("Categories error:", error);

            showAlert(error.message);

        } finally {

            loading.classList.add("d-none");

        }

    }


    // =====================================
    // SUMMARY
    // =====================================

    function displaySummary(summary) {

        document.getElementById("totalCategories").textContent =
            Number(summary.total_categories || 0);

        document.getElementById("incomeCategories").textContent =
            Number(summary.income_categories || 0);

        document.getElementById("expenseCategories").textContent =
            Number(summary.expense_categories || 0);

    }


    // =====================================
    // DISPLAY CATEGORIES
    // =====================================

    function displayCategories(categoryList) {

        categoriesGrid.replaceChildren();

        if (!categoryList || categoryList.length === 0) {

            categoriesGrid.classList.add("d-none");

            emptyState.classList.remove("d-none");

            return;

        }

        emptyState.classList.add("d-none");

        categoriesGrid.classList.remove("d-none");

        categoryList.forEach(category => {

            const card = document.createElement("article");

            card.className = "category-card";

            const top = document.createElement("div");

            top.className = "category-card-top";

            const info = document.createElement("div");

            info.className = "category-card-info";

            const colorDot = document.createElement("div");

            colorDot.className = "category-color-dot";

            const color = allowedColors[category.color]
                ? category.color
                : "#6B7280";

            colorDot.style.backgroundColor = color;

            const details = document.createElement("div");

            const title = document.createElement("h3");

            title.textContent = category.category_name;

            const typeBadge = document.createElement("span");

            typeBadge.className =
                category.category_type === "income"
                    ? "category-type-badge category-type-income"
                    : "category-type-badge category-type-expense";

            typeBadge.textContent =
                category.category_type === "income"
                    ? "Income"
                    : "Expense";

            details.append(title, typeBadge);

            info.append(colorDot, details);

            const actions = document.createElement("div");

            actions.className = "category-actions";

            const editButton = document.createElement("button");

            editButton.type = "button";

            editButton.className =
                "category-action-btn category-edit-btn";

            editButton.title = "Edit Category";

            editButton.setAttribute("aria-label", "Edit Category");

            editButton.innerHTML = '<i class="bi bi-pencil"></i>';

            editButton.addEventListener("click", () => {
                openEditModal(category);
            });

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";

            deleteButton.className =
                "category-action-btn category-delete-btn";

            deleteButton.title = "Delete Category";

            deleteButton.setAttribute("aria-label", "Delete Category");

            deleteButton.innerHTML = '<i class="bi bi-trash"></i>';

            deleteButton.addEventListener("click", () => {
                openDeleteModal(category.id);
            });

            actions.append(editButton, deleteButton);

            top.append(info, actions);

            const description = document.createElement("p");

            description.className = "category-description";

            description.textContent =
                category.description || "No description added.";

            const bottom = document.createElement("div");

            bottom.className = "category-card-bottom";

            const colorName = document.createElement("span");

            colorName.className = "category-color-name";

            colorName.textContent = allowedColors[color] || "Gray";

            bottom.appendChild(colorName);

            card.append(top, description, bottom);

            categoriesGrid.appendChild(card);

        });

    }


    // =====================================
    // COLOR SELECTION
    // =====================================

    function getSelectedColor() {

        const selected = document.querySelector(
            'input[name="categoryColor"]:checked'
        );

        return selected ? selected.value : "";

    }


    function setSelectedColor(color) {

        document.querySelectorAll(
            'input[name="categoryColor"]'
        ).forEach(input => {

            input.checked =
                input.value.toUpperCase() === String(color).toUpperCase();

        });

    }


    document.querySelectorAll(
        'input[name="categoryColor"]'
    ).forEach(input => {

        input.addEventListener("change", () => {

            clearFieldError("color");

        });

    });


    // =====================================
    // VALIDATE INDIVIDUAL FIELD
    // =====================================

    function validateField(field) {

        let value;

        if (field === "name") {

            value = categoryName.value.trim();

            if (value.length < 2 || value.length > 50) {

                setFieldError(
                    "name",
                    "Category name must contain 2 to 50 characters."
                );

                return false;

            }

        }

        if (field === "type") {

            value = categoryType.value;

            if (!["income", "expense"].includes(value)) {

                setFieldError(
                    "type",
                    "Please select a valid category type."
                );

                return false;

            }

        }

        if (field === "description") {

            value = categoryDescription.value.trim();

            if (value.length > 250) {

                setFieldError(
                    "description",
                    "Description cannot exceed 250 characters."
                );

                return false;

            }

        }

        if (field === "color") {

            value = getSelectedColor();

            if (!Object.prototype.hasOwnProperty.call(allowedColors, value)) {

                setFieldError(
                    "color",
                    "Please select a category color."
                );

                return false;

            }

        }

        clearFieldError(field);

        return true;

    }


    // =====================================
    // VALIDATE COMPLETE FORM
    // =====================================

    function validateForm() {

        clearFormAlert();

        const results = [

            validateField("name"),

            validateField("type"),

            validateField("color"),

            validateField("description")

        ];

        const isValid = results.every(result => result);

        if (!isValid) {

            const firstInvalid = categoryForm.querySelector(".is-invalid");

            firstInvalid?.focus();

        }

        return isValid;

    }


    // =====================================
    // SERVER FIELD ERRORS
    // =====================================

    function displayServerFieldErrors(errors) {

        const fieldMapping = {
            category_name: "name",
            name: "name",
            category_type: "type",
            type: "type",
            color: "color",
            description: "description"
        };

        let hasFieldError = false;

        Object.entries(errors).forEach(([key, message]) => {

            const field = fieldMapping[key];

            if (field && typeof message === "string") {

                setFieldError(field, message);

                hasFieldError = true;

            }

        });

        return hasFieldError;

    }


    // =====================================
    // RESET FORM
    // =====================================

    function resetForm() {

        categoryForm.reset();

        editingCategoryId = null;

        clearAllErrors();

        setSelectedColor("");

        saveButton.disabled = false;

        saveButton.textContent = "Save Category";

        document.getElementById("categoryModalTitle").textContent =
            "Add Category";

    }


    // =====================================
    // ADD CATEGORY
    // =====================================

    document.getElementById("addCategoryButton").addEventListener(
        "click",
        () => {

            resetForm();

            categoryModal.show();

        }
    );


    // =====================================
    // EDIT CATEGORY
    // =====================================

    function openEditModal(category) {

        resetForm();

        editingCategoryId = category.id;

        document.getElementById("categoryModalTitle").textContent =
            "Edit Category";

        categoryName.value = category.category_name;

        categoryType.value = category.category_type;

        categoryDescription.value = category.description || "";

        setSelectedColor(category.color);

        saveButton.textContent = "Update Category";

        categoryModal.show();

    }


    // =====================================
    // SAVE / UPDATE CATEGORY
    // =====================================

    categoryForm.addEventListener("submit", async event => {

        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        const payload = {

            category_name: categoryName.value.trim(),

            category_type: categoryType.value,

            color: getSelectedColor(),

            description: categoryDescription.value.trim()

        };

        const currentCategory = categories.find(category =>
            String(category.id) === String(editingCategoryId)
        );

        // Do not send request if nothing has changed.

        if (editingCategoryId && currentCategory) {

            const unchanged =

                currentCategory.category_name === payload.category_name &&

                currentCategory.category_type === payload.category_type &&

                currentCategory.color.toUpperCase() === payload.color.toUpperCase() &&

                (currentCategory.description || "") === payload.description;

            if (unchanged) {

                categoryModal.hide();

                return;

            }

        }

        saveButton.disabled = true;

        saveButton.textContent = editingCategoryId
            ? "Updating..."
            : "Saving...";

        try {

            const method = editingCategoryId ? "PUT" : "POST";

            if (editingCategoryId) {
                payload.id = editingCategoryId;
            }

            const data = await apiRequest(method, payload);

            categoryModal.hide();

            resetForm();

            showAlert(data.message, "success");

            await loadCategories();

        } catch (error) {

            const hasFieldErrors =
                error.fieldErrors &&
                Object.keys(error.fieldErrors).length > 0;

            if (hasFieldErrors) {

                const mapped = displayServerFieldErrors(error.fieldErrors);

                if (!mapped) {
                    showFormAlert(error.message);
                }

            } else {

                showFormAlert(error.message);

            }

        } finally {

            saveButton.disabled = false;

            saveButton.textContent = editingCategoryId
                ? "Update Category"
                : "Save Category";

        }

    });


    // =====================================
    // DELETE CATEGORY
    // =====================================

    function openDeleteModal(id) {

        deletingCategoryId = id;

        deleteModal.show();

    }


    document.getElementById("confirmDeleteButton").addEventListener(
        "click",
        async () => {

            if (!deletingCategoryId) {
                return;
            }

            const button = document.getElementById("confirmDeleteButton");

            button.disabled = true;

            button.textContent = "Deleting...";

            try {

                const data = await apiRequest("DELETE", {
                    id: deletingCategoryId
                });

                deleteModal.hide();

                deletingCategoryId = null;

                showAlert(data.message, "success");

                await loadCategories();

            } catch (error) {

                deleteModal.hide();

                showAlert(error.message);

            } finally {

                button.disabled = false;

                button.textContent = "Delete";

            }

        }
    );


    // =====================================
    // FIELD VALIDATION EVENTS
    // =====================================

    categoryName.addEventListener("blur", () => {
        validateField("name");
    });

    categoryType.addEventListener("change", () => {
        validateField("type");
    });

    categoryDescription.addEventListener("blur", () => {
        validateField("description");
    });

    // Correcting a field removes only that field's error.
    // If the field is still invalid, its alert remains.

    categoryName.addEventListener("input", () => {

        if (categoryName.classList.contains("is-invalid")) {
            validateField("name");
        }

    });

    categoryDescription.addEventListener("input", () => {

        if (categoryDescription.classList.contains("is-invalid")) {
            validateField("description");
        }

    });

    categoryType.addEventListener("change", () => {

        if (categoryType.classList.contains("is-invalid")) {
            validateField("type");
        }

    });


    // =====================================
    // FILTERS
    // =====================================

    searchInput.addEventListener("input", () => {

        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {

            loadCategories();

        }, 350);

    });


    typeFilter.addEventListener("change", loadCategories);


    document.getElementById("resetFiltersButton").addEventListener(
        "click",
        () => {

            searchInput.value = "";

            typeFilter.value = "";

            loadCategories();

        }
    );


    // =====================================
    // MODAL RESET
    // =====================================

    categoryModalElement.addEventListener(
        "hidden.bs.modal",
        resetForm
    );


    // =====================================
    // INITIAL LOAD
    // =====================================

    loadCategories();

});