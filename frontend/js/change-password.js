document.addEventListener("DOMContentLoaded", () => {

    const API_URL = "../backend/api/auth/change-password.php";

    // ELEMENTS
    const form = document.getElementById("changePasswordForm");

    const currentPassword = document.getElementById("currentPassword");
    const newPassword = document.getElementById("newPassword");
    const confirmPassword = document.getElementById("confirmPassword");

    const updateButton = document.getElementById("updatePasswordButton");
    const clearButton = document.getElementById("resetPasswordFormButton");

    const alertMessage = document.getElementById("alertMessage");

    const fields = {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
    };

    const errorElements = {
        current_password: document.getElementById("currentPasswordError"),
        new_password: document.getElementById("newPasswordError"),
        confirm_password: document.getElementById("confirmPasswordError")
    };

    let csrfToken = "";
    let isSubmitting = false;


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
    // SHOW / HIDE PASSWORD
    // =====================================

    document.querySelectorAll(".password-toggle").forEach(button => {

        button.addEventListener("click", () => {

            const input = document.getElementById(
                button.dataset.target
            );

            const icon = button.querySelector("i");

            if (input.type === "password") {

                input.type = "text";

                icon.className = "bi bi-eye-slash";

                button.setAttribute("aria-label", "Hide password");

            } else {

                input.type = "password";

                icon.className = "bi bi-eye";

                button.setAttribute("aria-label", "Show password");
            }
        });
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

        clearFieldError(fieldName);

        fields[fieldName].classList.add("is-invalid");

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

        errorElements[fieldName].appendChild(alert);
    }


    function clearFieldError(fieldName) {

        fields[fieldName].classList.remove("is-invalid");

        errorElements[fieldName].innerHTML = "";
    }


    function clearAllErrors() {

        Object.keys(fields).forEach(fieldName => {
            clearFieldError(fieldName);
        });
    }


    // =====================================
    // PASSWORD REQUIREMENTS
    // =====================================

    function getPasswordRequirements(password) {

        return {
            length: password.length >= 8 && password.length <= 64,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };
    }


    function updatePasswordRequirements() {

        const requirements = getPasswordRequirements(
            newPassword.value
        );

        document.getElementById("lengthRequirement")
            .classList.toggle("valid", requirements.length);

        document.getElementById("uppercaseRequirement")
            .classList.toggle("valid", requirements.uppercase);

        document.getElementById("lowercaseRequirement")
            .classList.toggle("valid", requirements.lowercase);

        document.getElementById("numberRequirement")
            .classList.toggle("valid", requirements.number);

        document.getElementById("specialRequirement")
            .classList.toggle("valid", requirements.special);
    }


    // =====================================
    // VALIDATION
    // =====================================

    function getFieldError(fieldName) {

        const current = currentPassword.value;
        const newValue = newPassword.value;
        const confirm = confirmPassword.value;

        switch (fieldName) {

            case "current_password":

                if (current.length === 0) {
                    return "Current Password is required.";
                }

                if (current.length > 64) {
                    return "Current Password cannot exceed 64 characters.";
                }

                break;


            case "new_password": {

                if (newValue.length === 0) {
                    return "New Password is required.";
                }

                const requirements =
                    getPasswordRequirements(newValue);

                if (newValue.length < 8 || newValue.length > 64) {
                    return "Password must contain 8 to 64 characters.";
                }

                if (!requirements.uppercase) {
                    return "Password must contain at least one uppercase letter.";
                }

                if (!requirements.lowercase) {
                    return "Password must contain at least one lowercase letter.";
                }

                if (!requirements.number) {
                    return "Password must contain at least one number.";
                }

                if (!requirements.special) {
                    return "Password must contain at least one special character.";
                }

                if (current !== "" && newValue === current) {
                    return "New Password must be different from Current Password.";
                }

                break;
            }


            case "confirm_password":

                if (confirm.length === 0) {
                    return "Please confirm your new password.";
                }

                if (confirm !== newValue) {
                    return "New Password and Confirm Password do not match.";
                }

                break;
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

        const fieldOrder = [
            "current_password",
            "new_password",
            "confirm_password"
        ];

        let firstInvalidField = null;

        fieldOrder.forEach(fieldName => {

            if (!validateField(fieldName) && !firstInvalidField) {
                firstInvalidField = fields[fieldName];
            }
        });

        if (firstInvalidField) {

            firstInvalidField.focus();

            return false;
        }

        return true;
    }


    // =====================================
    // BUTTON STATE
    // =====================================

    function updateButtonState() {

        const allFilled =
            currentPassword.value.length > 0 &&
            newPassword.value.length > 0 &&
            confirmPassword.value.length > 0;

        updateButton.disabled = !allFilled || isSubmitting;
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
    // LOAD CSRF TOKEN
    // =====================================

    async function loadSecurityToken() {

        try {

            const data = await apiRequest("GET");

            csrfToken = data.csrf_token;

            window.moneyManagerCsrfToken = csrfToken;

        } catch (error) {

            console.error("Security token error:", error);

            showAlert(error.message);

            updateButton.disabled = true;
        }
    }


    // =====================================
    // SERVER FIELD ERRORS
    // =====================================

    function displayServerErrors(errors) {

        const fieldNameMap = {
            current_password: "current_password",
            new_password: "new_password",
            confirm_password: "confirm_password"
        };

        let hasErrors = false;

        Object.entries(errors).forEach(([key, message]) => {

            const fieldName = fieldNameMap[key];

            if (fieldName && typeof message === "string") {

                setFieldError(fieldName, message);

                hasErrors = true;
            }
        });

        return hasErrors;
    }


    // =====================================
    // INPUT EVENTS
    // =====================================

    currentPassword.addEventListener("input", () => {

        if (currentPassword.classList.contains("is-invalid")) {
            validateField("current_password");
        }

        if (newPassword.value !== "") {
            validateField("new_password");
        }

        updateButtonState();
    });


    newPassword.addEventListener("input", () => {

        updatePasswordRequirements();

        if (newPassword.classList.contains("is-invalid")) {
            validateField("new_password");
        }

        if (confirmPassword.value !== "") {
            validateField("confirm_password");
        }

        updateButtonState();
    });


    confirmPassword.addEventListener("input", () => {

        if (confirmPassword.classList.contains("is-invalid")) {
            validateField("confirm_password");
        }

        updateButtonState();
    });


    currentPassword.addEventListener("blur", () => {

        if (currentPassword.value !== "") {
            validateField("current_password");
        }
    });


    newPassword.addEventListener("blur", () => {

        if (newPassword.value !== "") {
            validateField("new_password");
        }
    });


    confirmPassword.addEventListener("blur", () => {

        if (confirmPassword.value !== "") {
            validateField("confirm_password");
        }
    });


    // =====================================
    // CLEAR FORM
    // =====================================

    function clearForm() {

        form.reset();

        clearAllErrors();

        clearAlert();

        updatePasswordRequirements();

        updateButtonState();
    }


    clearButton.addEventListener("click", () => {

        if (isSubmitting) return;

        clearForm();
    });


    // =====================================
    // CHANGE PASSWORD
    // =====================================

    form.addEventListener("submit", async event => {

        event.preventDefault();

        clearAlert();

        if (isSubmitting) return;

        if (!validateForm()) {
            return;
        }

        isSubmitting = true;

        updateButton.disabled = true;

        updateButton.textContent = "Updating...";


        const payload = {

            current_password: currentPassword.value,

            new_password: newPassword.value,

            confirm_password: confirmPassword.value
        };


        try {

            const data = await apiRequest("POST", payload);

            csrfToken = data.csrf_token || csrfToken;

            window.moneyManagerCsrfToken = csrfToken;

            clearForm();

            showAlert(data.message, "success");


        } catch (error) {

            const hasFieldErrors =
                displayServerErrors(error.fieldErrors || {});

            if (!hasFieldErrors) {
                showAlert(error.message);
            }

            const firstInvalid =
                form.querySelector(".is-invalid");

            firstInvalid?.focus();

        } finally {

            isSubmitting = false;

            updateButton.innerHTML =
                '<i class="bi bi-lock"></i> Update Password';

            updateButtonState();
        }
    });


    // =====================================
    // INITIALIZATION
    // =====================================

    updatePasswordRequirements();

    loadSecurityToken();

});