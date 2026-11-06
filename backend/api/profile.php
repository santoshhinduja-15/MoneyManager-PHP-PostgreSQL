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

    require_once __DIR__ . "/../config/database.php";

} catch (Throwable $error) {

    error_log("Profile database error: " . $error->getMessage());

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
// GET PROFILE
// =====================================

if ($_SERVER["REQUEST_METHOD"] === "GET") {

    try {

        $sql = "
            SELECT
                id,
                full_name,
                username,
                created_at
            FROM users
            WHERE id = :user_id
            LIMIT 1
        ";

        $statement = $pdo->prepare($sql);

        $statement->execute([
            ":user_id" => $userId
        ]);

        $profile = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$profile) {

            sendResponse(
                false,
                "User profile not found.",
                [],
                404
            );
        }

        sendResponse(
            true,
            "Profile loaded successfully.",
            [
                "csrf_token" => $_SESSION["csrf_token"],

                "profile" => $profile
            ]
        );

    } catch (Throwable $error) {

        error_log("Profile GET error: " . $error->getMessage());

        sendResponse(
            false,
            "Unable to load profile.",
            [],
            500
        );
    }
}


// =====================================
// CHECK REQUEST METHOD
// =====================================

if ($_SERVER["REQUEST_METHOD"] !== "PUT") {

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
// GET FORM VALUES
// =====================================

$fullName = trim($input["full_name"] ?? "");

$username = trim($input["username"] ?? "");


// =====================================
// SERVER-SIDE VALIDATION
// =====================================

$errors = [];


// Full Name Validation

if ($fullName === "") {

    $errors["full_name"] = "Full Name is required.";

} elseif (mb_strlen($fullName) < 3 || mb_strlen($fullName) > 50) {

    $errors["full_name"] =
        "Full Name must contain 3 to 50 characters.";

} elseif (
    !preg_match(
        "/^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u",
        $fullName
    )
) {

    $errors["full_name"] =
        "Enter a valid name using letters, spaces, apostrophes or hyphens.";
}


// Username Validation

if ($username === "") {

    $errors["username"] = "Username is required.";

} elseif (strlen($username) < 3 || strlen($username) > 30) {

    $errors["username"] =
        "Username must contain 3 to 30 characters.";

} elseif (!preg_match("/^[A-Za-z0-9_.-]+$/", $username)) {

    $errors["username"] =
        "Username can contain only letters, numbers, dots, underscores and hyphens.";
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
// CHECK USERNAME AVAILABILITY
// =====================================

try {

    $usernameSql = "
        SELECT id
        FROM users
        WHERE LOWER(username) = LOWER(:username)
        AND id <> :user_id
        LIMIT 1
    ";

    $usernameStatement = $pdo->prepare($usernameSql);

    $usernameStatement->execute([
        ":username" => $username,
        ":user_id" => $userId
    ]);

    if ($usernameStatement->fetch()) {

        sendResponse(
            false,
            "This username is already taken.",
            [
                "errors" => [
                    "username" => "This username is already taken."
                ]
            ],
            409
        );
    }


    // =====================================
    // UPDATE PROFILE
    // =====================================

    $updateSql = "
        UPDATE users

        SET
            full_name = :full_name,
            username = :username,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = :user_id

        RETURNING
            id,
            full_name,
            username,
            created_at
    ";

    $updateStatement = $pdo->prepare($updateSql);

    $updateStatement->execute([
        ":full_name" => $fullName,
        ":username" => $username,
        ":user_id" => $userId
    ]);

    $updatedProfile = $updateStatement->fetch(PDO::FETCH_ASSOC);

    if (!$updatedProfile) {

        sendResponse(
            false,
            "User profile not found.",
            [],
            404
        );
    }


    // =====================================
    // UPDATE SESSION DETAILS
    // =====================================

    $_SESSION["full_name"] = $updatedProfile["full_name"];

    $_SESSION["username"] = $updatedProfile["username"];


    // =====================================
    // ROTATE CSRF TOKEN
    // =====================================

    $_SESSION["csrf_token"] = bin2hex(random_bytes(32));


    // =====================================
    // SUCCESS RESPONSE
    // =====================================

    sendResponse(
        true,
        "Profile updated successfully.",
        [
            "csrf_token" => $_SESSION["csrf_token"],

            "profile" => $updatedProfile
        ]
    );


} catch (PDOException $error) {

    // PostgreSQL unique violation
    if ($error->getCode() === "23505") {

        sendResponse(
            false,
            "This username is already taken.",
            [
                "errors" => [
                    "username" => "This username is already taken."
                ]
            ],
            409
        );
    }

    error_log("Profile update database error: " . $error->getMessage());

    sendResponse(
        false,
        "Unable to update profile. Please try again.",
        [],
        500
    );

} catch (Throwable $error) {

    error_log("Profile update error: " . $error->getMessage());

    sendResponse(
        false,
        "Unable to update profile. Please try again.",
        [],
        500
    );
}

?>