<?php

// Prevent PHP errors from appearing inside JSON responses

ini_set("display_errors", "0");
ini_set("log_errors", "1");

header("Content-Type: application/json; charset=UTF-8");

// Session Configuration

$isSecure = !empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off";

if (session_status() === PHP_SESSION_NONE) {

    session_set_cookie_params([
        "lifetime" => 0,
        "path" => "/",
        "secure" => $isSecure,
        "httponly" => true,
        "samesite" => "Lax"
    ]);

    session_start();

}


// JSON Response Function

function sendResponse($statusCode, $data) {

    http_response_code($statusCode);

    echo json_encode($data);

    exit;

}


// Only POST Method Allowed

if ($_SERVER["REQUEST_METHOD"] !== "POST") {

    header("Allow: POST");

    sendResponse(405, [
        "success" => false,
        "message" => "Method not allowed."
    ]);

}


// Verify CSRF Token

$csrfToken = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";

if (
    empty($_SESSION["csrf_token"]) ||
    !hash_equals($_SESSION["csrf_token"], $csrfToken)
) {

    sendResponse(403, [
        "success" => false,
        "message" => "Invalid security token. Please refresh the page."
    ]);

}


// Check Login Session

if (empty($_SESSION["user_id"])) {

    sendResponse(401, [
        "success" => false,
        "message" => "You are not logged in."
    ]);

}


// Destroy Session Data

$_SESSION = [];


// Delete Session Cookie

if (ini_get("session.use_cookies")) {

    $cookieParams = session_get_cookie_params();

    setcookie(
        session_name(),
        "",
        [
            "expires" => time() - 42000,
            "path" => $cookieParams["path"],
            "domain" => $cookieParams["domain"],
            "secure" => $cookieParams["secure"],
            "httponly" => $cookieParams["httponly"],
            "samesite" => $cookieParams["samesite"]
        ]
    );

}


// Destroy Session

session_destroy();


// Successful Logout

sendResponse(200, [
    "success" => true,
    "message" => "Logout successful."
]);