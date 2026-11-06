<?php

// =====================================
// SESSION
// =====================================

session_start();

header("Content-Type: application/json; charset=UTF-8");


// =====================================
// HELPER FUNCTION
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
// REQUEST METHOD
// =====================================

if ($_SERVER["REQUEST_METHOD"] !== "GET") {

    sendResponse(
        false,
        "Method not allowed.",
        [],
        405
    );
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

    error_log("Reports database connection error: " . $error->getMessage());

    sendResponse(
        false,
        "Unable to connect to the database.",
        [],
        500
    );
}


// =====================================
// DATE VALIDATION
// =====================================

$timezone = new DateTimeZone("Asia/Kolkata");

$today = new DateTimeImmutable("today", $timezone);

$startDate = $_GET["start_date"] ?? $today->modify("first day of this month")->format("Y-m-d");

$endDate = $_GET["end_date"] ?? $today->format("Y-m-d");


function isValidDate($date)
{
    if (!is_string($date)) {
        return false;
    }

    $parsedDate = DateTime::createFromFormat("!Y-m-d", $date);

    return $parsedDate !== false &&
        $parsedDate->format("Y-m-d") === $date;
}


if (!isValidDate($startDate) || !isValidDate($endDate)) {

    sendResponse(
        false,
        "Please provide valid dates.",
        [],
        400
    );
}


if ($startDate > $endDate) {

    sendResponse(
        false,
        "From Date cannot be later than To Date.",
        [],
        400
    );
}


if ($startDate > $today->format("Y-m-d") ||
    $endDate > $today->format("Y-m-d")) {

    sendResponse(
        false,
        "Future dates are not allowed.",
        [],
        400
    );
}


// =====================================
// TRANSACTION TYPE VALIDATION
// =====================================

$type = $_GET["type"] ?? "";

if (!in_array($type, ["", "income", "expense"], true)) {

    sendResponse(
        false,
        "Invalid transaction type.",
        [],
        400
    );
}


// =====================================
// TYPE FILTER
// =====================================

$typeCondition = "";

if ($type !== "") {
    $typeCondition = " AND t.transaction_type = :transaction_type ";
}


// =====================================
// GENERATE REPORT
// =====================================

try {

    // ---------------------------------
    // 1. SUMMARY REPORT
    // ---------------------------------

    $summarySql = "
        SELECT

            COALESCE(
                SUM(t.amount) FILTER (
                    WHERE t.transaction_type = 'income'
                ),
                0
            ) AS total_income,

            COALESCE(
                SUM(t.amount) FILTER (
                    WHERE t.transaction_type = 'expense'
                ),
                0
            ) AS total_expenses,

            COALESCE(
                SUM(
                    CASE
                        WHEN t.transaction_type = 'income'
                            THEN t.amount
                        ELSE -t.amount
                    END
                ),
                0
            ) AS net_savings,

            COUNT(t.id) AS total_transactions

        FROM transactions t

        WHERE
            t.user_id = :user_id
            AND t.transaction_date BETWEEN :start_date AND :end_date

            $typeCondition
    ";


    $summaryStatement = $pdo->prepare($summarySql);

    $summaryStatement->bindValue(":user_id", $userId);
    $summaryStatement->bindValue(":start_date", $startDate);
    $summaryStatement->bindValue(":end_date", $endDate);

    if ($type !== "") {
        $summaryStatement->bindValue(":transaction_type", $type);
    }

    $summaryStatement->execute();

    $summary = $summaryStatement->fetch(PDO::FETCH_ASSOC);


    // ---------------------------------
    // 2. MONTHLY REPORT
    // ---------------------------------

    $monthlySql = "
        SELECT

            TO_CHAR(
                DATE_TRUNC('month', t.transaction_date),
                'YYYY-MM'
            ) AS month,

            COALESCE(
                SUM(t.amount) FILTER (
                    WHERE t.transaction_type = 'income'
                ),
                0
            ) AS income,

            COALESCE(
                SUM(t.amount) FILTER (
                    WHERE t.transaction_type = 'expense'
                ),
                0
            ) AS expenses,

            COALESCE(
                SUM(
                    CASE
                        WHEN t.transaction_type = 'income'
                            THEN t.amount
                        ELSE -t.amount
                    END
                ),
                0
            ) AS savings

        FROM transactions t

        WHERE
            t.user_id = :user_id
            AND t.transaction_date BETWEEN :start_date AND :end_date

            $typeCondition

        GROUP BY DATE_TRUNC('month', t.transaction_date)

        ORDER BY DATE_TRUNC('month', t.transaction_date) ASC
    ";


    $monthlyStatement = $pdo->prepare($monthlySql);

    $monthlyStatement->bindValue(":user_id", $userId);
    $monthlyStatement->bindValue(":start_date", $startDate);
    $monthlyStatement->bindValue(":end_date", $endDate);

    if ($type !== "") {
        $monthlyStatement->bindValue(":transaction_type", $type);
    }

    $monthlyStatement->execute();

    $monthlyReport = $monthlyStatement->fetchAll(PDO::FETCH_ASSOC);


    // ---------------------------------
    // 3. CATEGORY-WISE REPORT
    // ---------------------------------

    $categorySql = "
        SELECT

            c.id AS category_id,

            c.category_name,

            c.category_type,

            c.color,

            COUNT(t.id) AS transaction_count,

            COALESCE(SUM(t.amount), 0) AS total_amount

        FROM transactions t

        INNER JOIN categories c
            ON c.id = t.category_id
            AND c.user_id = t.user_id
            AND c.category_type = t.transaction_type

        WHERE
            t.user_id = :user_id
            AND t.transaction_date BETWEEN :start_date AND :end_date

            $typeCondition

        GROUP BY
            c.id,
            c.category_name,
            c.category_type,
            c.color

        ORDER BY
            total_amount DESC
    ";


    $categoryStatement = $pdo->prepare($categorySql);

    $categoryStatement->bindValue(":user_id", $userId);
    $categoryStatement->bindValue(":start_date", $startDate);
    $categoryStatement->bindValue(":end_date", $endDate);

    if ($type !== "") {
        $categoryStatement->bindValue(":transaction_type", $type);
    }

    $categoryStatement->execute();

    $categoryReport = $categoryStatement->fetchAll(PDO::FETCH_ASSOC);


    // ---------------------------------
    // 4. SEND RESPONSE
    // ---------------------------------

    sendResponse(
        true,
        "Report generated successfully.",
        [
            "filters" => [
                "start_date" => $startDate,
                "end_date" => $endDate,
                "type" => $type
            ],

            "summary" => $summary,

            "monthly_report" => $monthlyReport,

            "category_report" => $categoryReport
        ]
    );


} catch (Throwable $error) {

    error_log("Reports API error: " . $error->getMessage());

    sendResponse(
        false,
        "Unable to generate report. Please try again.",
        [],
        500
    );
}

?>