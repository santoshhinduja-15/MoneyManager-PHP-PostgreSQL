
document.addEventListener("DOMContentLoaded", () => {

    const logoutButton = document.getElementById("logoutButton");

    const API_URL = "../backend/api/auth/logout.php";

    let csrfToken = "";


    // Read JSON Response Safely

    async function readJsonResponse(response) {

        const responseText = await response.text();

        try {

            return JSON.parse(responseText);

        } catch (error) {

            console.error("Invalid JSON Response:", responseText);

            throw new Error(
                "Server returned an invalid response. Check the browser console."
            );

        }

    }


    // Get CSRF Token

    async function getCsrfToken() {

        try {

            const response = await fetch(
                "../backend/api/auth/login.php",
                {
                    method: "GET",
                    credentials: "same-origin",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

            const data = await readJsonResponse(response);

            if (!response.ok || !data.csrf_token) {

                throw new Error(
                    data.message || "Unable to get security token."
                );

            }

            csrfToken = data.csrf_token;

        } catch (error) {

            logoutButton.disabled = true;

            console.error("CSRF Error:", error);

        }

    }


    // Logout

    logoutButton.addEventListener("click", async () => {

        if (!csrfToken) {

            alert("Security token is missing. Please refresh the page.");

            return;

        }

        logoutButton.disabled = true;

        try {

            const response = await fetch(API_URL, {

                method: "POST",

                credentials: "same-origin",

                headers: {
                    "Accept": "application/json",
                    "X-CSRF-Token": csrfToken
                }

            });

            const data = await readJsonResponse(response);

            if (!response.ok || !data.success) {

                throw new Error(
                    data.message || "Unable to logout."
                );

            }

            // Direct Redirect

            window.location.replace("login.html");

        } catch (error) {

            console.error("Logout Error:", error);

            alert(error.message);

            logoutButton.disabled = false;

        }

    });


    // Initialize

    getCsrfToken();

});
