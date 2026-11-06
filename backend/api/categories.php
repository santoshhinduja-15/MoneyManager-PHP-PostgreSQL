<?php

ini_set("display_errors", "0");
ini_set("log_errors", "1");

error_reporting(E_ALL);

ob_start();

header("Content-Type: application/json; charset=UTF-8");

// =====================================
// JSON RESPONSE
// =====================================

function sendResponse($statusCode, $data)
{
    if (ob_get_level() > 0) {
        ob_clean();
    }

    http_response_code($statusCode);

    echo json_encode(
        $data,
        JSON_INVALID_UTF8_SUBSTITUTE
    );

    exit;
}

// =====================================
// READ JSON INPUT
// =====================================

function getJsonInput()
{
    $input = file_get_contents("php://input");

    $data = json_decode($input, true);

    if (!is_array($data)) {

        sendResponse(400, [
            "success" => false,
            "message" => "Invalid JSON request."
        ]);
    }

    return $data;
}

// =====================================
// ALLOWED CATEGORY COLORS
// =====================================

function getAllowedColors()
{
    return [
        "#EF4444",
        "#22C55E",
        "#3B82F6",
        "#EAB308",
        "#EC4899",
        "#A855F7",
        "#F97316",
        "#14B8A6",
        "#06B6D4",
        "#6B7280"
    ];
}

// =====================================
// MAIN API
// =====================================

try {

    // SESSION CONFIGURATION

    $isSecure = !empty($_SERVER["HTTPS"])
        && $_SERVER["HTTPS"] !== "off";

    session_set_cookie_params([
        "lifetime" => 0,
        "path" => "/",
        "secure" => $isSecure,
        "httponly" => true,
        "samesite" => "Lax"
    ]);

    session_start();

    // CHECK LOGIN

    if (empty($_SESSION["user_id"])) {

        sendResponse(401, [
            "success" => false,
            "message" => "Please login to continue."
        ]);
    }

    $userId = $_SESSION["user_id"];

    // CSRF TOKEN

    if (empty($_SESSION["csrf_token"])) {

        $_SESSION["csrf_token"] = bin2hex(
            random_bytes(32)
        );
    }

    // HTTP METHOD

    $method = $_SERVER["REQUEST_METHOD"];

    if (!in_array($method, ["GET", "POST", "PUT", "DELETE"], true)) {

        header("Allow: GET, POST, PUT, DELETE");

        sendResponse(405, [
            "success" => false,
            "message" => "Method not allowed."
        ]);
    }

    // CSRF CHECK

    if ($method !== "GET") {

        $requestToken = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";

        if (
            empty($requestToken) ||
            !hash_equals($_SESSION["csrf_token"], $requestToken)
        ) {

            sendResponse(403, [
                "success" => false,
                "message" => "Invalid security token. Refresh the page."
            ]);
        }
    }

    // DATABASE CONNECTION

    require_once __DIR__ . "/../config/database.php";

    if (!isset($pdo) || !($pdo instanceof PDO)) {

        throw new Exception("Database connection is unavailable.");
    }

    // =====================================
    // GET: FETCH CATEGORIES
    // =====================================

    if ($method === "GET") {

        $search = trim($_GET["search"] ?? "");

        $type = $_GET["type"] ?? "";

        if (
            $type !== "" &&
            !in_array($type, ["income", "expense"], true)
        ) {

            sendResponse(400, [
                "success" => false,
                "message" => "Invalid category type filter."
            ]);
        }

        if (strlen($search) > 50) {

            sendResponse(400, [
                "success" => false,
                "message" => "Search text cannot exceed 50 characters."
            ]);
        }

        // FETCH ALL USER CATEGORIES FOR SUMMARY

        $summarySql = "

            SELECT

                COUNT(*) AS total_categories,

                COUNT(*) FILTER (
                    WHERE category_type = 'income'
                ) AS income_categories,

                COUNT(*) FILTER (
                    WHERE category_type = 'expense'
                ) AS expense_categories

            FROM categories

            WHERE user_id = :user_id

        ";

        $summaryStmt = $pdo->prepare($summarySql);

        $summaryStmt->execute([
            ":user_id" => $userId
        ]);

        $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

        // FILTERED CATEGORY LIST

        $where = [
            "user_id = :user_id"
        ];

        $params = [
            ":user_id" => $userId
        ];

        if ($search !== "") {

            $where[] = "category_name ILIKE :search";

            $params[":search"] = "%" . $search . "%";
        }

        if ($type !== "") {

            $where[] = "category_type = :type";

            $params[":type"] = $type;
        }

        $whereSql = implode(" AND ", $where);

        $categorySql = "

            SELECT

                id,

                category_name,

                category_type,

                description,

                color,

                created_at,

                updated_at

            FROM categories

            WHERE $whereSql

            ORDER BY category_name ASC, id DESC

        ";

        $categoryStmt = $pdo->prepare($categorySql);

        $categoryStmt->execute($params);

        $categories = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);

        sendResponse(200, [

            "success" => true,

            "csrf_token" => $_SESSION["csrf_token"],

            "summary" => $summary,

            "categories" => $categories

        ]);
    }

    // =====================================
    // READ WRITE REQUEST BODY
    // =====================================

    $data = getJsonInput();

    // =====================================
    // POST / PUT VALIDATION
    // =====================================

    if ($method === "POST" || $method === "PUT") {

        $name = trim($data["category_name"] ?? "");

        $type = $data["category_type"] ?? "";

        $description = trim($data["description"] ?? "");

        $color = strtoupper(trim($data["color"] ?? ""));

        if (
            !is_string($data["category_name"] ?? null) ||
            strlen($name) < 2 ||
            strlen($name) > 50
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Category name must contain 2 to 50 characters."
            ]);
        }

        if (
            !in_array($type, ["income", "expense"], true)
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Please select a valid category type."
            ]);
        }

        if (
            !is_string($data["description"] ?? "") ||
            strlen($description) > 250
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Description cannot exceed 250 characters."
            ]);
        }

        if (!in_array($color, getAllowedColors(), true)) {

            sendResponse(422, [
                "success" => false,
                "message" => "Please select one of the available category colors."
            ]);
        }
    }

    // =====================================
    // POST: CREATE CATEGORY
    // =====================================

    if ($method === "POST") {

        $insertSql = "

            INSERT INTO categories (

                user_id,

                category_name,

                category_type,

                description,

                color

            )

            VALUES (

                :user_id,

                :category_name,

                :category_type,

                :description,

                :color

            )

            RETURNING id

        ";

        try {

            $insertStmt = $pdo->prepare($insertSql);

            $insertStmt->execute([

                ":user_id" => $userId,

                ":category_name" => $name,

                ":category_type" => $type,

                ":description" => $description !== ""
                    ? $description
                    : null,

                ":color" => $color

            ]);

            $newId = $insertStmt->fetchColumn();

            sendResponse(201, [

                "success" => true,

                "message" => "Category created successfully.",

                "category_id" => $newId

            ]);

        } catch (PDOException $e) {

            if ($e->getCode() === "23505") {

                sendResponse(409, [
                    "success" => false,
                    "message" => "A category with this name and type already exists."
                ]);
            }

            throw $e;
        }
    }

    // =====================================
    // PUT: UPDATE CATEGORY
    // =====================================

    if ($method === "PUT") {

        $id = $data["id"] ?? "";

        if (
            !is_scalar($id) ||
            !ctype_digit((string) $id) ||
            (int) $id < 1
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Invalid category ID."
            ]);
        }

        $id = (int) $id;

        // CHECK CATEGORY OWNERSHIP

        $checkSql = "

            SELECT id, category_type

            FROM categories

            WHERE id = :id

            AND user_id = :user_id

        ";

        $checkStmt = $pdo->prepare($checkSql);

        $checkStmt->execute([
            ":id" => $id,
            ":user_id" => $userId
        ]);

        $existingCategory = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existingCategory) {

            sendResponse(404, [
                "success" => false,
                "message" => "Category not found."
            ]);
        }

        // CHECK WHETHER TYPE CHANGE IS ALLOWED

        if ($existingCategory["category_type"] !== $type) {

            $usageStmt = $pdo->prepare("

                SELECT EXISTS (

                    SELECT 1

                    FROM transactions

                    WHERE category_id = :category_id

                    AND user_id = :user_id

                )

            ");

            $usageStmt->execute([
                ":category_id" => $id,
                ":user_id" => $userId
            ]);

            if ($usageStmt->fetchColumn()) {

                sendResponse(409, [
                    "success" => false,
                    "message" => "Category type cannot be changed because transactions are linked to this category."
                ]);
            }
        }

        // UPDATE ONLY IF VALUES HAVE CHANGED

        $updateSql = "

            UPDATE categories

            SET

                category_name = :category_name,

                category_type = :category_type,

                description = :description,

                color = :color,

                updated_at = CURRENT_TIMESTAMP

            WHERE id = :id

            AND user_id = :user_id

            AND (

                category_name IS DISTINCT FROM :compare_name

                OR category_type IS DISTINCT FROM :compare_type

                OR description IS DISTINCT FROM :compare_description

                OR color IS DISTINCT FROM :compare_color

            )

            RETURNING id

        ";

        try {

            $updateStmt = $pdo->prepare($updateSql);

            $updateStmt->execute([

                ":category_name" => $name,

                ":category_type" => $type,

                ":description" => $description !== ""
                    ? $description
                    : null,

                ":color" => $color,

                ":id" => $id,

                ":user_id" => $userId,

                ":compare_name" => $name,

                ":compare_type" => $type,

                ":compare_description" => $description !== ""
                    ? $description
                    : null,

                ":compare_color" => $color

            ]);

            $updatedId = $updateStmt->fetchColumn();

            if (!$updatedId) {

                sendResponse(200, [
                    "success" => true,
                    "message" => "No changes were made.",
                    "changed" => false
                ]);
            }

            sendResponse(200, [
                "success" => true,
                "message" => "Category updated successfully.",
                "changed" => true
            ]);

        } catch (PDOException $e) {

            if ($e->getCode() === "23505") {

                sendResponse(409, [
                    "success" => false,
                    "message" => "A category with this name and type already exists."
                ]);
            }

            throw $e;
        }
    }

    // =====================================
    // DELETE: REMOVE CATEGORY
    // =====================================

    if ($method === "DELETE") {

        $id = $data["id"] ?? "";

        if (
            !is_scalar($id) ||
            !ctype_digit((string) $id) ||
            (int) $id < 1
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Invalid category ID."
            ]);
        }

        $id = (int) $id;

        // CHECK CATEGORY OWNERSHIP

        $checkStmt = $pdo->prepare("

            SELECT id

            FROM categories

            WHERE id = :id

            AND user_id = :user_id

        ");

        $checkStmt->execute([
            ":id" => $id,
            ":user_id" => $userId
        ]);

        if (!$checkStmt->fetchColumn()) {

            sendResponse(404, [
                "success" => false,
                "message" => "Category not found."
            ]);
        }

        // CHECK LINKED TRANSACTIONS

        $usageStmt = $pdo->prepare("

            SELECT EXISTS (

                SELECT 1

                FROM transactions

                WHERE category_id = :category_id

                AND user_id = :user_id

            )

        ");

        $usageStmt->execute([
            ":category_id" => $id,
            ":user_id" => $userId
        ]);

        if ($usageStmt->fetchColumn()) {

            sendResponse(409, [
                "success" => false,
                "message" => "This category cannot be deleted because transactions are linked to it."
            ]);
        }

        // DELETE CATEGORY

        $deleteStmt = $pdo->prepare("

            DELETE FROM categories

            WHERE id = :id

            AND user_id = :user_id

            RETURNING id

        ");

        $deleteStmt->execute([
            ":id" => $id,
            ":user_id" => $userId
        ]);

        if (!$deleteStmt->fetchColumn()) {

            sendResponse(404, [
                "success" => false,
                "message" => "Category not found."
            ]);
        }

        sendResponse(200, [
            "success" => true,
            "message" => "Category deleted successfully."
        ]);
    }

} catch (Throwable $e) {

    error_log(
        "Categories API error: " . $e->getMessage()
    );

    sendResponse(500, [
        "success" => false,
        "message" => "Unable to process category. Please try again later."
    ]);
}

?>