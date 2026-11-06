<?php

// =====================================
// SESSION
// =====================================

session_start();

header("Content-Type: application/json; charset=UTF-8");


// =====================================
// RESPONSE HELPER
// =====================================

function sendResponse($success, $message, $extra = [], $statusCode = 200)
{
    http_response_code($statusCode);

    echo json_encode(array_merge([
        "success" => $success,
        "message" => $message
    ], $extra));

    exit;
}


// =====================================
// AUTHENTICATION
// =====================================

if (!isset($_SESSION["user_id"])) {

    sendResponse(
        false,
        "Please login to continue.",
        [],
        401
    );
}

$userId = $_SESSION["user_id"];


// =====================================
// DATABASE CONNECTION
// =====================================

try {

    require_once __DIR__ . "/../../config/database.php";

} catch (Throwable $error) {

    error_log("Change password database error: " . $error->getMessage());

    sendResponse(
        false,
        "Unable to connect to the database.",
        [],
        500
    );
}


// =====================================
// CSRF TOKEN
// =====================================

if (empty($_SESSION["csrf_token"])) {

    $_SESSION["csrf_token"] = bin2hex(random_bytes(32));
}


// =====================================
// GET REQUEST: CSRF TOKEN
// =====================================

if ($_SERVER["REQUEST_METHOD"] === "GET") {

    sendResponse(
        true,
        "Security token loaded successfully.",
        [
            "csrf_token" => $_SESSION["csrf_token"]
        ]
    );
}


// =====================================
// CHECK REQUEST METHOD
// =====================================

if ($_SERVER["REQUEST_METHOD"] !== "POST") {

    sendResponse(
        false,
        "Method not allowed.",
        [],
        405
    );
}


// =====================================
// CSRF VALIDATION
// =====================================

$receivedToken = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";

if (
    empty($receivedToken) ||
    !hash_equals($_SESSION["csrf_token"], $receivedToken)
) {

    sendResponse(
        false,
        "Invalid security token. Please refresh the page.",
        [],
        403
    );
}


// =====================================
// READ JSON INPUT
// =====================================

$input = json_decode(file_get_contents("php://input"), true);

if (!is_array($input)) {

    sendResponse(
        false,
        "Invalid request data.",
        [],
        400
    );
}


// =====================================
// GET PASSWORD VALUES
// =====================================

$currentPassword = $input["current_password"] ?? "";

$newPassword = $input["new_password"] ?? "";

$confirmPassword = $input["confirm_password"] ?? "";


// =====================================
// SERVER-SIDE VALIDATION
// =====================================

$errors = [];


// Current Password

if (!is_string($currentPassword) || $currentPassword === "") {

    $errors["current_password"] = "Current Password is required.";

} elseif (strlen($currentPassword) > 64) {

    $errors["current_password"] =
        "Current Password cannot exceed 64 characters.";
}


// New Password

if (!is_string($newPassword) || $newPassword === "") {

    $errors["new_password"] = "New Password is required.";

} elseif (strlen($newPassword) < 8 || strlen($newPassword) > 64) {

    $errors["new_password"] =
        "Password must contain 8 to 64 characters.";

} elseif (!preg_match("/[A-Z]/", $newPassword)) {

    $errors["new_password"] =
        "Password must contain at least one uppercase letter.";

} elseif (!preg_match("/[a-z]/", $newPassword)) {

    $errors["new_password"] =
        "Password must contain at least one lowercase letter.";

} elseif (!preg_match("/[0-9]/", $newPassword)) {

    $errors["new_password"] =
        "Password must contain at least one number.";

} elseif (!preg_match("/[^A-Za-z0-9]/", $newPassword)) {

    $errors["new_password"] =
        "Password must contain at least one special character.";
}


// Confirm Password

if (!is_string($confirmPassword) || $confirmPassword === "") {

    $errors["confirm_password"] =
        "Please confirm your new password.";

} elseif ($confirmPassword !== $newPassword) {

    $errors["confirm_password"] =
        "New Password and Confirm Password do not match.";
}


// New Password must differ from Current Password

if (
    is_string($currentPassword) &&
    is_string($newPassword) &&
    $currentPassword !== "" &&
    $newPassword !== "" &&
    $currentPassword === $newPassword
) {

    $errors["new_password"] =
        "New Password must be different from Current Password.";
}


if (!empty($errors)) {

    sendResponse(
        false,
        "Please correct the highlighted fields.",
        [
            "errors" => $errors
        ],
        422
    );
}


// =====================================
// VERIFY CURRENT PASSWORD
// =====================================

try {

    $selectSql = "
        SELECT password_hash
        FROM users
        WHERE id = :user_id
        LIMIT 1
    ";

    $selectStatement = $pdo->prepare($selectSql);

    $selectStatement->execute([
        ":user_id" => $userId
    ]);

    $user = $selectStatement->fetch(PDO::FETCH_ASSOC);


    if (!$user) {

        sendResponse(
            false,
            "User account not found.",
            [],
            404
        );
    }


    if (!password_verify($currentPassword, $user["password_hash"])) {

        sendResponse(
            false,
            "Current password is incorrect.",
            [
                "errors" => [
                    "current_password" => "Current password is incorrect."
                ]
            ],
            422
        );
    }


    // =====================================
    // HASH NEW PASSWORD
    // =====================================

    $newPasswordHash = password_hash(
        $newPassword,
        PASSWORD_DEFAULT
    );

    if ($newPasswordHash === false) {

        throw new RuntimeException("Password hashing failed.");
    }


    // =====================================
    // UPDATE PASSWORD
    // =====================================

    $updateSql = "
        UPDATE users

        SET
            password_hash = :password_hash,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = :user_id
    ";

    $updateStatement = $pdo->prepare($updateSql);

    $updateStatement->execute([
        ":password_hash" => $newPasswordHash,
        ":user_id" => $userId
    ]);

    if ($updateStatement->rowCount() !== 1) {

        sendResponse(
            false,
            "Unable to update password. Please try again.",
            [],
            500
        );
    }


    // =====================================
    // ROTATE CSRF TOKEN
    // =====================================

    $_SESSION["csrf_token"] = bin2hex(random_bytes(32));


    // =====================================
    // SUCCESS RESPONSE
    // =====================================

    sendResponse(
        true,
        "Password changed successfully.",
        [
            "csrf_token" => $_SESSION["csrf_token"]
        ]
    );


} catch (Throwable $error) {

    error_log("Change password API error: " . $error->getMessage());

    sendResponse(
        false,
        "Unable to change password. Please try again.",
        [],
        500
    );
}

?>