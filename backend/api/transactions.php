<?php

ini_set("display_errors", "0");
ini_set("log_errors", "1");

error_reporting(E_ALL);

ob_start();

header("Content-Type: application/json; charset=UTF-8");

// JSON RESPONSE
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



// READ JSON INPUT


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



// VALIDATE DATE


function isValidDate($date)
{
    if (
        !is_string($date) ||
        !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
    ) {
        return false;
    }

    $dateObject = DateTime::createFromFormat("!Y-m-d", $date);

    return $dateObject !== false
        && $dateObject->format("Y-m-d") === $date;
}



// DASHBOARD API LOGIC


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


    // GENERATE CSRF TOKEN

    if (empty($_SESSION["csrf_token"])) {

        $_SESSION["csrf_token"] = bin2hex(
            random_bytes(32)
        );

    }


    // CHECK HTTP METHOD

    $method = $_SERVER["REQUEST_METHOD"];

    if (!in_array($method, ["GET", "POST", "PUT", "DELETE"], true)) {

        header("Allow: GET, POST, PUT, DELETE");

        sendResponse(405, [
            "success" => false,
            "message" => "Method not allowed."
        ]);

    }


    // CHECK CSRF FOR WRITE OPERATIONS

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


    
    // GET: FETCH TRANSACTIONS AND CATEGORIES
    

    if ($method === "GET") {

        // READ FILTERS

        $search = trim($_GET["search"] ?? "");

        $type = $_GET["type"] ?? "";

        $categoryId = $_GET["category_id"] ?? "";

        $startDate = $_GET["start_date"] ?? "";

        $endDate = $_GET["end_date"] ?? "";

        $sort = $_GET["sort"] ?? "newest";

        $page = filter_var(
            $_GET["page"] ?? 1,
            FILTER_VALIDATE_INT
        );

        $limit = filter_var(
            $_GET["limit"] ?? 10,
            FILTER_VALIDATE_INT
        );


        if ($page === false || $page < 1) {
            $page = 1;
        }

        if ($limit === false || $limit < 1) {
            $limit = 10;
        }

        // Limit maximum records per page.

        $limit = min($limit, 50);


        // VALIDATE FILTERS

        if (
            $type !== "" &&
            !in_array($type, ["income", "expense"], true)
        ) {

            sendResponse(400, [
                "success" => false,
                "message" => "Invalid transaction type filter."
            ]);

        }


        if ($categoryId !== "") {

            if (
                !ctype_digit((string) $categoryId) ||
                (int) $categoryId < 1
            ) {

                sendResponse(400, [
                    "success" => false,
                    "message" => "Invalid category filter."
                ]);

            }

        }


        if ($startDate !== "" && !isValidDate($startDate)) {

            sendResponse(400, [
                "success" => false,
                "message" => "Invalid start date."
            ]);

        }


        if ($endDate !== "" && !isValidDate($endDate)) {

            sendResponse(400, [
                "success" => false,
                "message" => "Invalid end date."
            ]);

        }


        if (
            $startDate !== "" &&
            $endDate !== "" &&
            $startDate > $endDate
        ) {

            sendResponse(400, [
                "success" => false,
                "message" => "Start date cannot be later than end date."
            ]);

        }


        $sortOptions = [

            "newest" => "t.transaction_date DESC, t.created_at DESC, t.id DESC",

            "oldest" => "t.transaction_date ASC, t.created_at ASC, t.id ASC",

            "highest" => "t.amount DESC, t.transaction_date DESC, t.id DESC",

            "lowest" => "t.amount ASC, t.transaction_date DESC, t.id DESC"

        ];


        if (!isset($sortOptions[$sort])) {

            $sort = "newest";

        }


        // FETCH USER CATEGORIES

        $categorySql = "

            SELECT

                id,

                category_name,

                category_type,

                color

            FROM categories

            WHERE user_id = :user_id

            ORDER BY category_name ASC

        ";


        $categoryStmt = $pdo->prepare($categorySql);

        $categoryStmt->execute([
            ":user_id" => $userId
        ]);

        $categories = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);


        // BUILD FILTER QUERY

        $where = [
            "t.user_id = :user_id"
        ];

        $params = [
            ":user_id" => $userId
        ];


        if ($search !== "") {

            $where[] = "t.title ILIKE :search";

            $params[":search"] = "%" . $search . "%";

        }


        if ($type !== "") {

            $where[] = "t.transaction_type = :type";

            $params[":type"] = $type;

        }


        if ($categoryId !== "") {

            $where[] = "t.category_id = :category_id";

            $params[":category_id"] = (int) $categoryId;

        }


        if ($startDate !== "") {

            $where[] = "t.transaction_date >= :start_date";

            $params[":start_date"] = $startDate;

        }


        if ($endDate !== "") {

            $where[] = "t.transaction_date <= :end_date";

            $params[":end_date"] = $endDate;

        }


        $whereSql = implode(" AND ", $where);


        // FILTERED SUMMARY

        $summarySql = "

            SELECT

                COUNT(*) AS total_transactions,

                COALESCE(
                    SUM(amount) FILTER (
                        WHERE transaction_type = 'income'
                    ),
                    0
                ) AS total_income,

                COALESCE(
                    SUM(amount) FILTER (
                        WHERE transaction_type = 'expense'
                    ),
                    0
                ) AS total_expenses

            FROM transactions t

            WHERE $whereSql

        ";


        $summaryStmt = $pdo->prepare($summarySql);

        $summaryStmt->execute($params);

        $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);


        $totalRecords = (int) $summary["total_transactions"];

        $totalPages = max(
            1,
            (int) ceil($totalRecords / $limit)
        );


        // Keep page within valid range.

        $page = min($page, $totalPages);

        $offset = ($page - 1) * $limit;


        // FETCH TRANSACTIONS

        $transactionsSql = "

            SELECT

                t.id,

                t.title,

                t.transaction_type,

                t.category_id,

                t.amount,

                t.transaction_date,

                t.description,

                t.created_at,

                c.category_name,

                c.color AS category_color

            FROM transactions t

            INNER JOIN categories c

                ON t.category_id = c.id

                AND t.user_id = c.user_id

                AND t.transaction_type = c.category_type

            WHERE $whereSql

            ORDER BY {$sortOptions[$sort]}

            LIMIT :limit

            OFFSET :offset

        ";


        $transactionsStmt = $pdo->prepare($transactionsSql);


        foreach ($params as $key => $value) {

            $transactionsStmt->bindValue($key, $value);

        }


        $transactionsStmt->bindValue(
            ":limit",
            $limit,
            PDO::PARAM_INT
        );

        $transactionsStmt->bindValue(
            ":offset",
            $offset,
            PDO::PARAM_INT
        );


        $transactionsStmt->execute();


        $transactions = $transactionsStmt->fetchAll(
            PDO::FETCH_ASSOC
        );


        sendResponse(200, [

            "success" => true,

            "csrf_token" => $_SESSION["csrf_token"],

            "categories" => $categories,

            "summary" => $summary,

            "transactions" => $transactions,

            "pagination" => [

                "current_page" => $page,

                "total_pages" => $totalPages,

                "total_records" => $totalRecords,

                "per_page" => $limit

            ]

        ]);

    }


    
    // READ JSON BODY FOR WRITE OPERATIONS
    

    $data = getJsonInput();


    
    // VALIDATE COMMON TRANSACTION FIELDS
    

    if ($method === "POST" || $method === "PUT") {

        $title = trim($data["title"] ?? "");

        $type = $data["transaction_type"] ?? "";

        $categoryId = $data["category_id"] ?? "";

        $amount = $data["amount"] ?? "";

        $date = $data["transaction_date"] ?? "";

        $description = trim($data["description"] ?? "");


        if (
            !is_string($data["title"] ?? null) ||
            strlen($title) < 2 ||
            strlen($title) > 100
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Title must contain 2 to 100 characters."
            ]);

        }


        if (
            !in_array($type, ["income", "expense"], true)
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Please select a valid transaction type."
            ]);

        }


        if (
            !is_scalar($categoryId) ||
            !ctype_digit((string) $categoryId) ||
            (int) $categoryId < 1
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Please select a valid category."
            ]);

        }


        // Validate amount without converting it to a float.

        if (
            !is_string($amount) &&
            !is_int($amount)
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Please enter a valid amount."
            ]);

        }


        $amount = (string) $amount;


        if (
            !preg_match('/^\d{1,10}(\.\d{1,2})?$/', $amount) ||
            (float) $amount <= 0
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Amount must be positive and have maximum 2 decimal places."
            ]);

        }


        if (!isValidDate($date)) {

            sendResponse(422, [
                "success" => false,
                "message" => "Please enter a valid transaction date."
            ]);

        }


        if (
            !is_string($data["description"] ?? "") ||
            strlen($description) > 500
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Description cannot exceed 500 characters."
            ]);

        }


        // CHECK CATEGORY OWNERSHIP AND TYPE

        $categorySql = "

            SELECT id

            FROM categories

            WHERE id = :category_id

            AND user_id = :user_id

            AND category_type = :category_type

        ";


        $categoryStmt = $pdo->prepare($categorySql);

        $categoryStmt->execute([

            ":category_id" => (int) $categoryId,

            ":user_id" => $userId,

            ":category_type" => $type

        ]);


        if (!$categoryStmt->fetchColumn()) {

            sendResponse(422, [
                "success" => false,
                "message" => "Selected category does not belong to this transaction type."
            ]);

        }

    }


    
    // POST: CREATE TRANSACTION
    

    if ($method === "POST") {

        $insertSql = "

            INSERT INTO transactions (

                user_id,

                category_id,

                title,

                transaction_type,

                amount,

                transaction_date,

                description

            )

            VALUES (

                :user_id,

                :category_id,

                :title,

                :transaction_type,

                CAST(:amount AS NUMERIC(12,2)),

                :transaction_date,

                :description

            )

            RETURNING id

        ";


        $insertStmt = $pdo->prepare($insertSql);

        $insertStmt->execute([

            ":user_id" => $userId,

            ":category_id" => (int) $categoryId,

            ":title" => $title,

            ":transaction_type" => $type,

            ":amount" => $amount,

            ":transaction_date" => $date,

            ":description" => $description !== ""
                ? $description
                : null

        ]);


        $newId = $insertStmt->fetchColumn();


        sendResponse(201, [

            "success" => true,

            "message" => "Transaction added successfully.",

            "transaction_id" => $newId

        ]);

    }


    
    // PUT: UPDATE TRANSACTION
    

    if ($method === "PUT") {

        $id = $data["id"] ?? "";


        if (
            !is_scalar($id) ||
            !ctype_digit((string) $id) ||
            (int) $id < 1
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Invalid transaction ID."
            ]);

        }


        $updateSql = "

            UPDATE transactions

            SET

                category_id = :category_id,

                title = :title,

                transaction_type = :transaction_type,

                amount = CAST(:amount AS NUMERIC(12,2)),

                transaction_date = :transaction_date,

                description = :description,

                updated_at = CURRENT_TIMESTAMP

            WHERE id = :id

            AND user_id = :user_id

            AND (

                title IS DISTINCT FROM :compare_title

                OR category_id IS DISTINCT FROM :compare_category

                OR transaction_type IS DISTINCT FROM :compare_type

                OR amount IS DISTINCT FROM CAST(:compare_amount AS NUMERIC(12,2))

                OR transaction_date IS DISTINCT FROM :compare_date

                OR description IS DISTINCT FROM :compare_description

            )

            RETURNING id

        ";


        $updateStmt = $pdo->prepare($updateSql);

        $updateStmt->execute([

            ":category_id" => (int) $categoryId,

            ":title" => $title,

            ":transaction_type" => $type,

            ":amount" => $amount,

            ":transaction_date" => $date,

            ":description" => $description !== ""
                ? $description
                : null,

            ":id" => (int) $id,

            ":user_id" => $userId,

            ":compare_title" => $title,

            ":compare_category" => (int) $categoryId,

            ":compare_type" => $type,

            ":compare_amount" => $amount,

            ":compare_date" => $date,

            ":compare_description" => $description !== ""
                ? $description
                : null

        ]);


        $updatedId = $updateStmt->fetchColumn();


        if (!$updatedId) {

            // Check whether transaction exists and belongs to user.

            $checkStmt = $pdo->prepare("

                SELECT id

                FROM transactions

                WHERE id = :id

                AND user_id = :user_id

            ");

            $checkStmt->execute([

                ":id" => (int) $id,

                ":user_id" => $userId

            ]);


            if (!$checkStmt->fetchColumn()) {

                sendResponse(404, [
                    "success" => false,
                    "message" => "Transaction not found."
                ]);

            }


            sendResponse(200, [

                "success" => true,

                "message" => "No changes were made.",

                "changed" => false

            ]);

        }


        sendResponse(200, [

            "success" => true,

            "message" => "Transaction updated successfully.",

            "changed" => true

        ]);

    }


    
    // DELETE: DELETE TRANSACTION
    

    if ($method === "DELETE") {

        $id = $data["id"] ?? "";


        if (
            !is_scalar($id) ||
            !ctype_digit((string) $id) ||
            (int) $id < 1
        ) {

            sendResponse(422, [
                "success" => false,
                "message" => "Invalid transaction ID."
            ]);

        }


        $deleteSql = "

            DELETE FROM transactions

            WHERE id = :id

            AND user_id = :user_id

            RETURNING id

        ";


        $deleteStmt = $pdo->prepare($deleteSql);

        $deleteStmt->execute([

            ":id" => (int) $id,

            ":user_id" => $userId

        ]);


        if (!$deleteStmt->fetchColumn()) {

            sendResponse(404, [
                "success" => false,
                "message" => "Transaction not found."
            ]);

        }


        sendResponse(200, [

            "success" => true,

            "message" => "Transaction deleted successfully."

        ]);

    }


} catch (Throwable $e) {

    error_log(
        "Transactions API error: " . $e->getMessage()
    );


    sendResponse(500, [

        "success" => false,

        "message" => "Unable to process transaction. Please try again later."

    ]);

}

?>