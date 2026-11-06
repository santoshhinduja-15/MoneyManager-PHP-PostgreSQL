
document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    const usernameError = document.getElementById("usernameError");
    const passwordError = document.getElementById("passwordError");

    const loginButton = document.getElementById("loginButton");
    const loginButtonText = document.getElementById("loginButtonText");
    const loginSpinner = document.getElementById("loginSpinner");

    const alertMessage = document.getElementById("alertMessage");

    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");
    const brandLogo = document.getElementById("brandLogo");

    const API_URL = "../backend/api/auth/login.php";

    let csrfToken = "";

    let isSubmitting = false;


    // Field States

    const fieldStates = {
        username: {
            touched: false,
            invalid: false
        },

        password: {
            touched: false,
            invalid: false
        }
    };


    // Theme Handling

    function applyTheme(theme) {

        document.documentElement.setAttribute("data-theme", theme);

        localStorage.setItem("theme", theme);

        if (theme === "dark") {

            themeIcon.className = "bi bi-sun-fill";

            brandLogo.src = "images/logo-dark.jpg";

        } else {

            themeIcon.className = "bi bi-moon-stars-fill";

            brandLogo.src = "images/logo-light.jpg";

        }

    }


    const savedTheme = localStorage.getItem("theme") || "light";

    applyTheme(savedTheme);


    themeToggle.addEventListener("click", () => {

        const currentTheme =
            document.documentElement.getAttribute("data-theme");

        applyTheme(currentTheme === "dark" ? "light" : "dark");

    });


    // General Alert

    function showGeneralAlert(message, type = "danger") {

        alertMessage.innerHTML = "";

        alertMessage.className = `alert alert-${type} alert-dismissible fade show`;

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


    function hideGeneralAlert() {

        alertMessage.classList.add("d-none");

        alertMessage.innerHTML = "";

    }


    // Field Alert Handling

    function removeFieldAlert(errorElement) {

        const existingAlert = errorElement.querySelector(".alert");

        if (existingAlert) {

            const alertInstance =
                bootstrap.Alert.getInstance(existingAlert);

            if (alertInstance) {
                alertInstance.dispose();
            }

            existingAlert.remove();

        }

    }


    function showFieldAlert(errorElement, message) {

        removeFieldAlert(errorElement);

        const alert = document.createElement("div");

        alert.className =
            "alert alert-danger alert-dismissible fade show py-2 mt-2";

        alert.setAttribute("role", "alert");

        const messageText = document.createElement("span");

        messageText.textContent = message;

        const closeButton = document.createElement("button");

        closeButton.type = "button";
        closeButton.className = "btn-close";
        closeButton.setAttribute("data-bs-dismiss", "alert");
        closeButton.setAttribute("aria-label", "Close");

        alert.appendChild(messageText);

        alert.appendChild(closeButton);

        errorElement.appendChild(alert);

    }


    // Clear Field Error

    function clearFieldError(input, errorElement, fieldName) {

        input.classList.remove("is-invalid");

        removeFieldAlert(errorElement);

        fieldStates[fieldName].invalid = false;

    }


    // Username Validation

    function validateUsername() {

        const username = usernameInput.value.trim();

        let error = "";


        if (username === "") {

            error = "Username is required.";

        } else if (username.length < 3 || username.length > 30) {

            error = "Username must contain 3 to 30 characters.";

        } else if (!/^[A-Za-z0-9_.-]+$/.test(username)) {

            error = "Username can contain letters, numbers, underscore, dot and hyphen only.";

        }


        if (error) {

            usernameInput.classList.add("is-invalid");

            fieldStates.username.invalid = true;

            showFieldAlert(usernameError, error);

            return false;

        }


        clearFieldError(
            usernameInput,
            usernameError,
            "username"
        );

        return true;

    }


    // Password Validation

    function validatePassword() {

        const password = passwordInput.value;

        let error = "";


        if (password === "") {

            error = "Password is required.";

        } else if (password.length > 64) {

            error = "Password cannot exceed 64 characters.";

        }


        if (error) {

            passwordInput.classList.add("is-invalid");

            fieldStates.password.invalid = true;

            showFieldAlert(passwordError, error);

            return false;

        }


        clearFieldError(
            passwordInput,
            passwordError,
            "password"
        );

        return true;

    }


    // Username Blur Validation

    usernameInput.addEventListener("blur", () => {

        fieldStates.username.touched = true;

        validateUsername();

    });


    // Password Blur Validation

    passwordInput.addEventListener("blur", () => {

        fieldStates.password.touched = true;

        validatePassword();

    });


    // Username Input Validation

    usernameInput.addEventListener("input", () => {

        if (
            fieldStates.username.touched ||
            fieldStates.username.invalid
        ) {

            validateUsername();

        }

    });


    // Password Input Validation

    passwordInput.addEventListener("input", () => {

        if (
            fieldStates.password.touched ||
            fieldStates.password.invalid
        ) {

            validatePassword();

        }

    });


    // Password Show / Hide

    document.querySelectorAll(".password-toggle").forEach(button => {

        button.addEventListener("click", () => {

            const targetId = button.dataset.target;

            const input = document.getElementById(targetId);

            const icon = button.querySelector("i");

            if (input.type === "password") {

                input.type = "text";

                icon.classList.remove("bi-eye");

                icon.classList.add("bi-eye-slash");

                button.setAttribute("aria-label", "Hide password");

            } else {

                input.type = "password";

                icon.classList.remove("bi-eye-slash");

                icon.classList.add("bi-eye");

                button.setAttribute("aria-label", "Show password");

            }

        });

    });


    // Focus First Invalid Field

    function focusFirstInvalidField() {

        if (fieldStates.username.invalid) {

            usernameInput.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            usernameInput.focus();

            return;

        }


        if (fieldStates.password.invalid) {

            passwordInput.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            passwordInput.focus();

        }

    }


    // Button Loading State

    function setLoading(loading) {

        isSubmitting = loading;

        loginButton.disabled = loading;

        loginButtonText.textContent =
            loading ? "Logging in..." : "Login";

        loginSpinner.classList.toggle("d-none", !loading);

    }


    // Get CSRF Token

    async function getCsrfToken() {

        loginButton.disabled = true;

        try {

            const response = await fetch(API_URL, {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json"
                }
            });


            const data = await response.json();


            if (!response.ok || !data.csrf_token) {

                throw new Error("Unable to initialize secure login.");

            }


            csrfToken = data.csrf_token;

            loginButton.disabled = false;

        } catch (error) {

            showGeneralAlert(
                "Unable to connect to the server. Please refresh the page."
            );

            loginButton.disabled = true;

        }

    }


    // Login Form Submission

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();


        if (isSubmitting) {
            return;
        }


        hideGeneralAlert();


        // Validate All Fields

        fieldStates.username.touched = true;

        fieldStates.password.touched = true;


        const usernameValid = validateUsername();

        const passwordValid = validatePassword();


        if (!usernameValid || !passwordValid) {

            focusFirstInvalidField();

            return;

        }


        if (!csrfToken) {

            showGeneralAlert(
                "Security token is missing. Please refresh the page."
            );

            return;

        }


        setLoading(true);


        try {

            const response = await fetch(API_URL, {

                method: "POST",

                credentials: "same-origin",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-CSRF-Token": csrfToken
                },

                body: JSON.stringify({

                    username: usernameInput.value.trim(),

                    password: passwordInput.value

                })

            });


            const data = await response.json();


            // Server Validation Errors

            if (response.status === 422 && data.errors) {

                if (data.errors.username) {

                    fieldStates.username.touched = true;

                    usernameInput.classList.add("is-invalid");

                    fieldStates.username.invalid = true;

                    showFieldAlert(
                        usernameError,
                        data.errors.username
                    );

                }


                if (data.errors.password) {

                    fieldStates.password.touched = true;

                    passwordInput.classList.add("is-invalid");

                    fieldStates.password.invalid = true;

                    showFieldAlert(
                        passwordError,
                        data.errors.password
                    );

                }


                focusFirstInvalidField();

                return;

            }


            // Invalid Credentials

            if (response.status === 401) {

                showGeneralAlert(
                    "Invalid username or password."
                );

                passwordInput.value = "";

                passwordInput.focus();

                return;

            }


            // Other Errors

            if (!response.ok || !data.success) {

                showGeneralAlert(
                    data.message || "Something went wrong. Please try again."
                );

                return;

            }


            // Successful Login
            window.location.href = "dashboard.html";


        } catch (error) {

            showGeneralAlert(
                "Unable to connect to the server. Please try again."
            );

        } finally {

            setLoading(false);

        }

    });


    // Initialize Login Page

    getCsrfToken();

});