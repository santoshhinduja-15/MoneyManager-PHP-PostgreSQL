document.addEventListener("DOMContentLoaded", () => {

    const API_URL = "../backend/api/profile.php";

    // ELEMENTS
    const profileForm = document.getElementById("profileForm");

    const fullNameInput = document.getElementById("fullName");
    const usernameInput = document.getElementById("username");

    const fullNameError = document.getElementById("fullNameError");
    const usernameError = document.getElementById("usernameError");

    const saveButton = document.getElementById("saveProfileButton");
    const cancelButton = document.getElementById("cancelChangesButton");

    const loading = document.getElementById("profileLoading");
    const profileContent = document.getElementById("profileContent");
    const alertMessage = document.getElementById("alertMessage");

    const displayFullName = document.getElementById("displayFullName");
    const displayUsername = document.getElementById("displayUsername");
    const profileAvatar = document.getElementById("profileAvatar");
    const accountCreated = document.getElementById("accountCreated");


    // STATE
    let csrfToken = "";

    let originalProfile = {
        full_name: "",
        username: ""
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


    function clearAlert() {

        alertMessage.className = "alert d-none";

        alertMessage.innerHTML = "";
    }


    // =====================================
    // FIELD ERRORS
    // =====================================

    function setFieldError(fieldName, message) {

        const input =
            fieldName === "full_name"
                ? fullNameInput
                : usernameInput;

        const errorContainer =
            fieldName === "full_name"
                ? fullNameError
                : usernameError;

        clearFieldError(fieldName);

        input.classList.add("is-invalid");

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


    function clearFieldError(fieldName) {

        const input =
            fieldName === "full_name"
                ? fullNameInput
                : usernameInput;

        const errorContainer =
            fieldName === "full_name"
                ? fullNameError
                : usernameError;

        input.classList.remove("is-invalid");

        errorContainer.innerHTML = "";
    }


    function clearAllErrors() {

        clearFieldError("full_name");

        clearFieldError("username");
    }


    // =====================================
    // VALIDATION
    // =====================================

    function getFieldError(fieldName) {

        if (fieldName === "full_name") {

            const fullName = fullNameInput.value.trim();

            if (!fullName) {
                return "Full Name is required.";
            }

            if (fullName.length < 3 || fullName.length > 50) {
                return "Full Name must contain 3 to 50 characters.";
            }

            if (!/^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u.test(fullName)) {
                return "Enter a valid name using letters, spaces, apostrophes or hyphens.";
            }
        }


        if (fieldName === "username") {

            const username = usernameInput.value.trim();

            if (!username) {
                return "Username is required.";
            }

            if (username.length < 3 || username.length > 30) {
                return "Username must contain 3 to 30 characters.";
            }

            if (!/^[A-Za-z0-9_.-]+$/.test(username)) {
                return "Username can contain only letters, numbers, dots, underscores and hyphens.";
            }
        }

        return "";
    }


    function validateField(fieldName) {

        const errorMessage = getFieldError(fieldName);

        if (errorMessage) {

            setFieldError(fieldName, errorMessage);

            return false;
        }

        clearFieldError(fieldName);

        return true;
    }


    function validateForm() {

        clearAllErrors();

        const isFullNameValid = validateField("full_name");

        const isUsernameValid = validateField("username");

        if (!isFullNameValid) {

            fullNameInput.focus();

            return false;
        }

        if (!isUsernameValid) {

            usernameInput.focus();

            return false;
        }

        return true;
    }


    // =====================================
    // CHECK FOR CHANGES
    // =====================================

    function hasChanges() {

        const currentFullName = fullNameInput.value.trim();

        const currentUsername = usernameInput.value.trim();

        return (
            currentFullName !== originalProfile.full_name ||
            currentUsername !== originalProfile.username
        );
    }


    function updateSaveButton() {

        saveButton.disabled = !hasChanges();
    }


    // =====================================
    // DISPLAY PROFILE
    // =====================================

    function displayProfile(profile) {

        originalProfile = {
            full_name: profile.full_name,
            username: profile.username
        };

        fullNameInput.value = profile.full_name;

        usernameInput.value = profile.username;

        displayFullName.textContent = profile.full_name;

        displayUsername.textContent = "@" + profile.username;

        const firstLetter = profile.full_name.trim().charAt(0);

        profileAvatar.textContent = firstLetter || "U";

        accountCreated.textContent =
            formatAccountDate(profile.created_at);

        updateSaveButton();
    }


    function formatAccountDate(value) {

        if (!value) {
            return "Not available";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    }


    // =====================================
    // API REQUEST
    // =====================================

    async function apiRequest(method, body = null) {

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

        const response = await fetch(API_URL, options);

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

            error.fieldErrors = data.errors || {};

            throw error;
        }

        return data;
    }


    // =====================================
    // LOAD PROFILE
    // =====================================

    async function loadProfile() {

        loading.classList.remove("d-none");

        profileContent.classList.add("d-none");

        clearAlert();

        try {

            const data = await apiRequest("GET");

            csrfToken = data.csrf_token;

            window.moneyManagerCsrfToken = csrfToken;

            displayProfile(data.profile);

            profileContent.classList.remove("d-none");

        } catch (error) {

            console.error("Profile loading error:", error);

            showAlert(error.message);

        } finally {

            loading.classList.add("d-none");
        }
    }


    // =====================================
    // INPUT EVENTS
    // =====================================

    fullNameInput.addEventListener("input", () => {

        if (fullNameInput.classList.contains("is-invalid")) {
            validateField("full_name");
        }

        updateSaveButton();
    });


    usernameInput.addEventListener("input", () => {

        if (usernameInput.classList.contains("is-invalid")) {
            validateField("username");
        }

        updateSaveButton();
    });


    fullNameInput.addEventListener("blur", () => {

        if (fullNameInput.value.trim() !== "") {
            validateField("full_name");
        }
    });


    usernameInput.addEventListener("blur", () => {

        if (usernameInput.value.trim() !== "") {
            validateField("username");
        }
    });


    // =====================================
    // CANCEL CHANGES
    // =====================================

    cancelButton.addEventListener("click", () => {

        fullNameInput.value = originalProfile.full_name;

        usernameInput.value = originalProfile.username;

        clearAllErrors();

        clearAlert();

        updateSaveButton();
    });


    // =====================================
    // SERVER FIELD ERRORS
    // =====================================

    function displayServerErrors(errors) {

        let hasErrors = false;

        if (typeof errors.full_name === "string") {

            setFieldError("full_name", errors.full_name);

            hasErrors = true;
        }

        if (typeof errors.username === "string") {

            setFieldError("username", errors.username);

            hasErrors = true;
        }

        return hasErrors;
    }


    // =====================================
    // UPDATE PROFILE
    // =====================================

    profileForm.addEventListener("submit", async event => {

        event.preventDefault();

        clearAlert();

        if (!validateForm()) {
            return;
        }

        if (!hasChanges()) {
            saveButton.disabled = true;
            return;
        }

        saveButton.disabled = true;

        saveButton.textContent = "Saving...";

        const payload = {

            full_name: fullNameInput.value.trim(),

            username: usernameInput.value.trim()
        };


        try {

            const data = await apiRequest("PUT", payload);

            csrfToken = data.csrf_token || csrfToken;

            window.moneyManagerCsrfToken = csrfToken;

            displayProfile(data.profile);

            showAlert(data.message, "success");


        } catch (error) {

            const hasFieldErrors =
                displayServerErrors(error.fieldErrors || {});

            if (!hasFieldErrors) {

                showAlert(error.message);
            }

            const firstInvalid =
                profileForm.querySelector(".is-invalid");

            firstInvalid?.focus();

        } finally {

            saveButton.textContent = "Save Changes";

            updateSaveButton();
        }
    });


    // =====================================
    // INITIAL LOAD
    // =====================================

    loadProfile();

});