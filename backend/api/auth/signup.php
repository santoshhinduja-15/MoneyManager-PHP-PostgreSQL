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

$fullName = trim($input["full_name"] ?? "");

$username = trim($input["username"] ?? "");

$password = $input["password"] ?? "";

$confirmPassword = $input["confirm_password"] ?? "";

$errors = [];


// Full Name Validation

if ($fullName === "") {

    $errors["full_name"] = "Full Name is required.";

} elseif (
    mb_strlen($fullName, "UTF-8") < 3 ||
    mb_strlen($fullName, "UTF-8") > 50
) {

    $errors["full_name"] = "Full Name must contain 3 to 50 characters.";

} elseif (
    !preg_match("/^[\p{L}][\p{L}\s'-]{1,48}[\p{L}]$/u", $fullName)
) {

    $errors["full_name"] = "Enter a valid name using letters only.";

}


// Username Validation

if ($username === "") {

    $errors["username"] = "Username is required.";

} elseif (!preg_match("/^[A-Za-z0-9_.-]{3,30}$/", $username)) {

    $errors["username"] = "Username must contain 3 to 30 valid characters.";

}


// Password Validation

if ($password === "") {

    $errors["password"] = "Password is required.";

} elseif (strlen($password) < 8 || strlen($password) > 64) {

    $errors["password"] = "Password must contain 8 to 64 characters.";

} elseif (
    !preg_match("/[A-Z]/", $password) ||
    !preg_match("/[a-z]/", $password) ||
    !preg_match("/[0-9]/", $password) ||
    !preg_match("/[^A-Za-z0-9]/", $password)
) {

    $errors["password"] = "Include uppercase, lowercase, number and special character.";

}


// Confirm Password Validation

if ($confirmPassword === "") {

    $errors["confirm_password"] = "Please confirm your password.";

} elseif ($password !== $confirmPassword) {

    $errors["confirm_password"] = "Passwords do not match.";

}


// Return Validation Errors

if (!empty($errors)) {

    sendResponse(422, [
        "success" => false,
        "message" => "Please correct the highlighted fields.",
        "errors" => $errors
    ]);

}


// Database Connection and Signup Operation

try {

    // Connect to PostgreSQL

    require_once __DIR__ . "/../../config/database.php";


    // Hash Password

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);


    // Insert User into Database

    $sql = "INSERT INTO users (full_name, username, password_hash)
            VALUES (:full_name, :username, :password_hash)
            RETURNING id, full_name, username";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ":full_name" => $fullName,
        ":username" => $username,
        ":password_hash" => $passwordHash
    ]);

    $user = $stmt->fetch();


    // Create User Session

    session_regenerate_id(true);

    $_SESSION["user_id"] = $user["id"];

    $_SESSION["full_name"] = $user["full_name"];

    $_SESSION["username"] = $user["username"];


    // Generate New CSRF Token

    $_SESSION["csrf_token"] = bin2hex(random_bytes(32));


    // Successful Signup

    sendResponse(201, [
        "success" => true,
        "message" => "Your account has been created successfully.",
        "user" => [
            "id" => $user["id"],
            "full_name" => $user["full_name"],
            "username" => $user["username"]
        ]
    ]);


} catch (PDOException $e) {

    // Case-Insensitive Duplicate Username

    if ($e->getCode() === "23505") {

        sendResponse(409, [
            "success" => false,
            "message" => "This username is already taken.",
            "errors" => [
                "username" => "This username is already taken."
            ]
        ]);

    }


    // Log Database Error

    error_log("Signup error: " . $e->getMessage());

    sendResponse(500, [
        "success" => false,
        "message" => "Something went wrong. Please try again later."
    ]);


} catch (Throwable $e) {

    // Log Unexpected Error

    error_log("Signup unexpected error: " . $e->getMessage());

    sendResponse(500, [
        "success" => false,
        "message" => "Something went wrong. Please try again later."
    ]);

}

?>