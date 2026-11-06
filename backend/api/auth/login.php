<?php

header("Content-Type: application/json; charset=UTF-8");


// Session Configuration

$isSecure = !empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off";

session_set_cookie_params([
    "lifetime" => 0,
    "path" => "/",
    "secure" => $isSecure,
    "httponly" => true,
    "samesite" => "Lax"
]);

session_start();


// JSON Response Function

function sendResponse($statusCode, $data) {

    http_response_code($statusCode);

    echo json_encode($data);

    exit;

}


// Generate CSRF Token

if ($_SERVER["REQUEST_METHOD"] === "GET") {

    if (empty($_SESSION["csrf_token"])) {

        $_SESSION["csrf_token"] = bin2hex(random_bytes(32));

    }

    sendResponse(200, [
        "success" => true,
        "csrf_token" => $_SESSION["csrf_token"]
    ]);

}


// Only POST Method Allowed

if ($_SERVER["REQUEST_METHOD"] !== "POST") {

    header("Allow: GET, POST");

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


// Read JSON Data

$input = json_decode(file_get_contents("php://input"), true);

if (!is_array($input)) {

    sendResponse(400, [
        "success" => false,
        "message" => "Invalid request data."
    ]);

}


// Get Form Values

$username = trim($input["username"] ?? "");

$password = $input["password"] ?? "";

$errors = [];


// Username Validation

if ($username === "") {

    $errors["username"] = "Username is required.";

} elseif (!preg_match("/^[A-Za-z0-9_.-]{3,30}$/", $username)) {

    $errors["username"] = "Username must contain 3 to 30 valid characters.";

}


// Password Validation

if ($password === "") {

    $errors["password"] = "Password is required.";

} elseif (strlen($password) > 64) {

    $errors["password"] = "Password cannot exceed 64 characters.";

}


// Return Validation Errors

if (!empty($errors)) {

    sendResponse(422, [
        "success" => false,
        "message" => "Please correct the highlighted fields.",
        "errors" => $errors
    ]);

}


// Database Connection and Login

try {

    require_once __DIR__ . "/../../config/database.php";


    // Find User Using Case-Insensitive Username

    $sql = "SELECT id, full_name, username, password_hash
            FROM users
            WHERE LOWER(username) = LOWER(:username)
            LIMIT 1";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ":username" => $username
    ]);

    $user = $stmt->fetch();


    // Verify Username and Password

    if (!$user || !password_verify($password, $user["password_hash"])) {

        sendResponse(401, [
            "success" => false,
            "message" => "Invalid username or password."
        ]);

    }


    // Regenerate Session ID

    session_regenerate_id(true);


    // Store User Information in Session

    $_SESSION["user_id"] = $user["id"];

    $_SESSION["full_name"] = $user["full_name"];

    $_SESSION["username"] = $user["username"];


    // Generate New CSRF Token

    $_SESSION["csrf_token"] = bin2hex(random_bytes(32));


    // Successful Login

    sendResponse(200, [
        "success" => true,
        "message" => "Login successful.",
        "user" => [
            "id" => $user["id"],
            "full_name" => $user["full_name"],
            "username" => $user["username"]
        ]
    ]);


} catch (Throwable $e) {

    error_log("Login error: " . $e->getMessage());

    sendResponse(500, [
        "success" => false,
        "message" => "Something went wrong. Please try again later."
    ]);

}

?>