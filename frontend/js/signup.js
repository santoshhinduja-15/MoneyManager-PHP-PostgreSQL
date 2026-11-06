
document.addEventListener("DOMContentLoaded", () => {

    // Form Elements

    const signupForm = document.getElementById("signupForm");

    const fullNameInput = document.getElementById("fullName");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");

    const signupButton = document.getElementById("signupButton");
    const signupButtonText = document.getElementById("signupButtonText");
    const signupSpinner = document.getElementById("signupSpinner");

    const alertMessage = document.getElementById("alertMessage");

    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");
    const brandLogo = document.getElementById("brandLogo");

    let csrfToken = "";
    let isSubmitting = false;


    // Field Configuration

    const fields = [
        {
            input: fullNameInput,
            errorContainer: document.getElementById("fullNameError"),
            validate: validateFullName
        },
        {
            input: usernameInput,
            errorContainer: document.getElementById("usernameError"),
            validate: validateUsername
        },
        {
            input: passwordInput,
            errorContainer: document.getElementById("passwordError"),
            validate: validatePassword
        },
        {
            input: confirmPasswordInput,
            errorContainer: document.getElementById("confirmPasswordError"),
            validate: validateConfirmPassword
        }
    ];

    const fieldStates = new Map();

    fields.forEach(field => {
        fieldStates.set(field.input, {
            touched: false,
            invalid: false,
            message: ""
        });
    });


    // Theme Management

    function applyTheme(theme) {

        document.documentElement.setAttribute("data-theme", theme);

        localStorage.setItem("moneyManagerTheme", theme);

        if (theme === "dark") {

            themeIcon.className = "bi bi-sun-fill";

            brandLogo.src = "images/logo-dark.jpg";

            themeToggle.setAttribute("aria-label", "Switch to light mode");

            themeToggle.title = "Switch to light mode";

        } else {

            themeIcon.className = "bi bi-moon-stars-fill";

            brandLogo.src = "images/logo-light.jpg";

            themeToggle.setAttribute("aria-label", "Switch to dark mode");

            themeToggle.title = "Switch to dark mode";

        }

    }


    const savedTheme = localStorage.getItem("moneyManagerTheme") || "light";

    applyTheme(savedTheme);


    themeToggle.addEventListener("click", () => {

        const currentTheme = document.documentElement.getAttribute("data-theme");

        applyTheme(currentTheme === "dark" ? "light" : "dark");

    });


    // General Bootstrap Alert

    function showAlert(type, message) {

        alertMessage.replaceChildren();

        alertMessage.className = `alert alert-${type} alert-dismissible fade show`;

        const messageText = document.createElement("span");

        messageText.textContent = message;

        const closeButton = document.createElement("button");

        closeButton.type = "button";
        closeButton.className = "btn-close";
        closeButton.setAttribute("data-bs-dismiss", "alert");
        closeButton.setAttribute("aria-label", "Close");

        alertMessage.append(messageText, closeButton);

    }


    function hideGeneralAlert() {

        if (alertMessage.classList.contains("show")) {

            const alertInstance = bootstrap.Alert.getOrCreateInstance(alertMessage);

            alertInstance.close();

        }

        alertMessage.className = "alert d-none";

        alertMessage.replaceChildren();

    }


    // Field-Specific Bootstrap Alert

    function showFieldAlert(field, message) {

        const container = field.errorContainer;

        // Remove any previous alert for this field

        container.replaceChildren();

        const alert = document.createElement("div");

        alert.className = "alert alert-danger alert-dismissible fade show";

        alert.setAttribute("role", "alert");

        const messageText = document.createElement("span");

        messageText.textContent = message;

        const closeButton = document.createElement("button");

        closeButton.type = "button";

        closeButton.className = "btn-close";

        closeButton.setAttribute("data-bs-dismiss", "alert");

        closeButton.setAttribute("aria-label", "Close error message");

        alert.append(messageText, closeButton);

        container.appendChild(alert);

    }


    // Remove Field Alert

    function removeFieldAlert(field) {

        const container = field.errorContainer;

        const existingAlert = container.querySelector(".alert");

        if (existingAlert) {

            // Dispose Bootstrap Alert instance if available

            const alertInstance = bootstrap.Alert.getInstance(existingAlert);

            if (alertInstance) {
                alertInstance.dispose();
            }

        }

        container.replaceChildren();

    }


    // Set Field Error

    function setFieldError(field, message) {

        const state = fieldStates.get(field.input);

        state.invalid = true;

        state.message = message;

        field.input.classList.add("is-invalid");

        field.input.setAttribute("aria-invalid", "true");

        field.input.setAttribute(
            "aria-describedby",
            field.errorContainer.id
        );

        showFieldAlert(field, message);

    }


    // Clear Field Error

    function clearFieldError(field) {

        const state = fieldStates.get(field.input);

        state.invalid = false;

        state.message = "";

        field.input.classList.remove("is-invalid");

        field.input.removeAttribute("aria-invalid");

        field.input.removeAttribute("aria-describedby");

        removeFieldAlert(field);

    }


    // Clear All Field Errors

    function clearAllFieldErrors() {

        fields.forEach(field => {

            const state = fieldStates.get(field.input);

            state.touched = false;

            clearFieldError(field);

        });

    }


    // Validation Result Handler

    function validateField(field, showError = true) {

        const state = fieldStates.get(field.input);

        const error = field.validate();

        if (error) {

            if (showError) {
                setFieldError(field, error);
            }

            return false;

        }

        clearFieldError(field);

        return true;

    }


    // Full Name Validation

    function validateFullName() {

        const fullName = fullNameInput.value.trim();

        const namePattern = /^[\p{L}][\p{L}\s'-]{1,48}[\p{L}]$/u;

        if (!fullName) {

            return "Full Name is required.";

        }

        if (fullName.length < 3 || fullName.length > 50) {

            return "Full Name must contain 3 to 50 characters.";

        }

        if (!namePattern.test(fullName)) {

            return "Enter a valid name using letters only.";

        }

        return "";

    }


    // Username Validation

    function validateUsername() {

        const username = usernameInput.value.trim();

        const usernamePattern = /^[A-Za-z0-9_.-]{3,30}$/;

        if (!username) {

            return "Username is required.";

        }

        if (!usernamePattern.test(username)) {

            return "Username must be 3-30 characters. Use letters, numbers, dot, underscore or hyphen.";

        }

        return "";

    }


    // Password Validation

    function validatePassword() {

        const password = passwordInput.value;

        if (!password) {

            return "Password is required.";

        }

        if (password.length < 8 || password.length > 64) {

            return "Password must contain 8 to 64 characters.";

        }

        if (
            !/[A-Z]/.test(password) ||
            !/[a-z]/.test(password) ||
            !/[0-9]/.test(password) ||
            !/[^A-Za-z0-9]/.test(password)
        ) {

            return "Include uppercase, lowercase, number and special character.";

        }

        return "";

    }


    // Confirm Password Validation

    function validateConfirmPassword() {

        const password = passwordInput.value;

        const confirmPassword = confirmPasswordInput.value;

        if (!confirmPassword) {

            return "Please confirm your password.";

        }

        if (password !== confirmPassword) {

            return "Passwords do not match.";

        }

        return "";

    }


    // Validate Field When User Leaves It

    fields.forEach(field => {

        field.input.addEventListener("blur", () => {

            const state = fieldStates.get(field.input);

            state.touched = true;

            validateField(field);

        });

    });


    // Validate Again While User Corrects an Error

    fields.forEach(field => {

        field.input.addEventListener("input", () => {

            const state = fieldStates.get(field.input);

            if (state.touched || state.invalid) {

                validateField(field);

            }


            // Password change can affect Confirm Password

            if (
                field.input === passwordInput &&
                fieldStates.get(confirmPasswordInput).touched
            ) {

                const confirmField = fields.find(
                    item => item.input === confirmPasswordInput
                );

                validateField(confirmField);

            }

        });

    });


    // Password Show / Hide

    document.querySelectorAll(".password-toggle").forEach(button => {

        button.addEventListener("click", () => {

            const target = document.getElementById(button.dataset.target);

            const icon = button.querySelector("i");

            if (target.type === "password") {

                target.type = "text";

                icon.className = "bi bi-eye-slash";

                button.setAttribute("aria-label", "Hide password");

            } else {

                target.type = "password";

                icon.className = "bi bi-eye";

                button.setAttribute("aria-label", "Show password");

            }

        });

    });


    // Focus and Scroll to First Invalid Field

    function focusFirstInvalidField() {

        const firstInvalidField = fields.find(field => {

            return fieldStates.get(field.input).invalid;

        });

        if (!firstInvalidField) {
            return;
        }

        firstInvalidField.input.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        setTimeout(() => {

            firstInvalidField.input.focus({
                preventScroll: true
            });

        }, 350);

    }


    // Apply Server-Side Field Errors

    function applyServerErrors(errors) {

        let hasFieldErrors = false;

        const serverFieldNames = {
            full_name: fullNameInput,
            username: usernameInput,
            password: passwordInput,
            confirm_password: confirmPasswordInput
        };

        fields.forEach(field => {

            const state = fieldStates.get(field.input);

            state.touched = true;

        });


        Object.entries(serverFieldNames).forEach(([key, input]) => {

            if (errors[key]) {

                const field = fields.find(item => item.input === input);

                setFieldError(field, errors[key]);

                hasFieldErrors = true;

            }

        });

        return hasFieldErrors;

    }


    // Get CSRF Token

    async function getCsrfToken() {

        try {

            const response = await fetch("../backend/api/auth/signup.php", {

                method: "GET",

                credentials: "same-origin"

            });

            const result = await response.json();

            if (!response.ok || !result.success) {

                throw new Error(
                    result.message || "Unable to initialize signup."
                );

            }

            csrfToken = result.csrf_token;

            signupButton.disabled = false;

        } catch (error) {

            showAlert(
                "danger",
                error.message || "Unable to initialize signup. Please refresh the page."
            );

            signupButton.disabled = true;

        }

    }


    // Signup Form Submission

    signupForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        hideGeneralAlert();


        // Validate Every Field on Submit

        let isFormValid = true;

        fields.forEach(field => {

            const state = fieldStates.get(field.input);

            state.touched = true;

            const isValid = validateField(field);

            if (!isValid) {
                isFormValid = false;
            }

        });


        // Stop Submission and Focus First Invalid Field

        if (!isFormValid) {

            focusFirstInvalidField();

            return;

        }


        // Check CSRF Token

        if (!csrfToken) {

            showAlert(
                "danger",
                "Signup could not be initialized. Please refresh the page."
            );

            return;

        }


        // Disable Button While Submitting

        isSubmitting = true;

        signupButton.disabled = true;

        signupButtonText.textContent = "Creating Account...";

        signupSpinner.classList.remove("d-none");


        // Signup Data

        const signupData = {

            full_name: fullNameInput.value.trim(),

            username: usernameInput.value.trim(),

            password: passwordInput.value,

            confirm_password: confirmPasswordInput.value

        };


        try {

            const response = await fetch("../backend/api/auth/signup.php", {

                method: "POST",

                credentials: "same-origin",

                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken
                },

                body: JSON.stringify(signupData)

            });


            const result = await response.json();


            // Handle Server Errors

            if (!response.ok || !result.success) {

                if (result.errors) {

                    applyServerErrors(result.errors);

                }

                if (result.errors && result.errors.username) {

                    focusFirstInvalidField();

                } else if (result.errors) {

                    focusFirstInvalidField();

                }

                showAlert(
                    "danger",
                    result.message || "Unable to create account. Please try again."
                );

                return;

            }


            // Successful Signup

            clearAllFieldErrors();

            showAlert(
                "success",
                "Congratulations! Your MoneyManager account has been created successfully. You can now start managing your income and expenses."
            );

            signupForm.reset();


        } catch (error) {

            showAlert(
                "danger",
                "Something went wrong. Please try again."
            );

        } finally {

            isSubmitting = false;

            signupButton.disabled = false;

            signupButtonText.textContent = "Create Account";

            signupSpinner.classList.add("d-none");

        }

    });


    // Initialize Signup Page

    signupButton.disabled = true;

    getCsrfToken();

});
