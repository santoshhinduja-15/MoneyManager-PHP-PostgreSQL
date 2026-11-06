<?php

ini_set("display_errors", "0");
ini_set("log_errors", "1");

error_reporting(E_ALL);

// Prevent unwanted output from breaking JSON.

ob_start();

header("Content-Type: application/json; charset=UTF-8");


// ==========================================
// JSON RESPONSE FUNCTION
// ==========================================

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


// ==========================================
// DASHBOARD LOGIC
// ==========================================

try {

    // ======================================
    // SESSION CONFIGURATION
    // ======================================

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


    // ======================================
    // CHECK REQUEST METHOD
    // ======================================

    if ($_SERVER["REQUEST_METHOD"] !== "GET") {

        header("Allow: GET");

        sendResponse(405, [
            "success" => false,
            "message" => "Method not allowed."
        ]);
    }


    // ======================================
    // CHECK LOGIN SESSION
    // ======================================

    if (empty($_SESSION["user_id"])) {

        sendResponse(401, [
            "success" => false,
            "message" => "Please login to continue."
        ]);
    }


    // Get logged-in user ID.

    $userId = $_SESSION["user_id"];


    // ======================================
    // GENERATE CSRF TOKEN
    // ======================================

    if (empty($_SESSION["csrf_token"])) {

        $_SESSION["csrf_token"] = bin2hex(
            random_bytes(32)
        );
    }


    // ======================================
    // DATABASE CONNECTION
    // ======================================

    require_once __DIR__ . "/../config/database.php";


    if (!isset($pdo) || !($pdo instanceof PDO)) {

        throw new Exception(
            "PDO database connection is not available."
        );
    }


    // ======================================
    // FETCH FINANCIAL SUMMARY
    // ======================================

    $summarySql = "

        SELECT

            -- Total Income

            COALESCE(
                SUM(amount) FILTER (
                    WHERE transaction_type = 'income'
                ),
                0
            ) AS total_income,


            -- Total Expenses

            COALESCE(
                SUM(amount) FILTER (
                    WHERE transaction_type = 'expense'
                ),
                0
            ) AS total_expenses,


            -- Net Savings

            COALESCE(
                SUM(
                    CASE
                        WHEN transaction_type = 'income'
                            THEN amount
                        ELSE -amount
                    END
                ),
                0
            ) AS net_savings,


            -- Today's Income

            COALESCE(
                SUM(amount) FILTER (
                    WHERE transaction_type = 'income'
                    AND transaction_date = CURRENT_DATE
                ),
                0
            ) AS today_income,


            -- Today's Expenses

            COALESCE(
                SUM(amount) FILTER (
                    WHERE transaction_type = 'expense'
                    AND transaction_date = CURRENT_DATE
                ),
                0
            ) AS today_expenses,


            -- Monthly Income

            COALESCE(
                SUM(amount) FILTER (
                    WHERE transaction_type = 'income'

                    AND transaction_date >= DATE_TRUNC(
                        'month',
                        CURRENT_DATE
                    )::DATE

                    AND transaction_date < (
                        DATE_TRUNC('month', CURRENT_DATE)
                        + INTERVAL '1 month'
                    )::DATE
                ),
                0
            ) AS monthly_income,


            -- Monthly Expenses

            COALESCE(
                SUM(amount) FILTER (
                    WHERE transaction_type = 'expense'

                    AND transaction_date >= DATE_TRUNC(
                        'month',
                        CURRENT_DATE
                    )::DATE

                    AND transaction_date < (
                        DATE_TRUNC('month', CURRENT_DATE)
                        + INTERVAL '1 month'
                    )::DATE
                ),
                0
            ) AS monthly_expenses,


            -- Monthly Savings

            COALESCE(
                SUM(
                    CASE

                        WHEN transaction_date >= DATE_TRUNC(
                            'month',
                            CURRENT_DATE
                        )::DATE

                        AND transaction_date < (
                            DATE_TRUNC('month', CURRENT_DATE)
                            + INTERVAL '1 month'
                        )::DATE

                        THEN

                            CASE
                                WHEN transaction_type = 'income'
                                    THEN amount
                                ELSE -amount
                            END

                        ELSE 0

                    END
                ),
                0
            ) AS monthly_savings,


            -- Total Transaction Count

            COUNT(*) AS transaction_count


        FROM transactions

        WHERE user_id = :user_id

    ";


    $summaryStmt = $pdo->prepare($summarySql);

    $summaryStmt->execute([
        ":user_id" => $userId
    ]);

    $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);


    if ($summary === false) {

        throw new Exception(
            "Unable to fetch dashboard summary."
        );
    }


    // Add logged-in user's name.

    $summary["full_name"] =
        $_SESSION["full_name"] ?? "User";


    // ======================================
    // FETCH RECENT 5 TRANSACTIONS
    // ======================================

    $transactionsSql = "

        SELECT

            t.id,

            t.title,

            t.transaction_type,

            t.amount,

            t.transaction_date,

            c.category_name,

            c.color AS category_color


        FROM transactions t


        INNER JOIN categories c

            ON t.category_id = c.id

            AND t.user_id = c.user_id

            AND t.transaction_type = c.category_type


        WHERE t.user_id = :user_id


        ORDER BY

            t.transaction_date DESC,

            t.created_at DESC,

            t.id DESC


        LIMIT 5

    ";


    $transactionsStmt = $pdo->prepare(
        $transactionsSql
    );

    $transactionsStmt->execute([
        ":user_id" => $userId
    ]);

    $recentTransactions = $transactionsStmt->fetchAll(
        PDO::FETCH_ASSOC
    );


    // ======================================
    // SUCCESSFUL JSON RESPONSE
    // ======================================

    sendResponse(200, [

        "success" => true,

        "csrf_token" => $_SESSION["csrf_token"],

        "summary" => $summary,

        "recent_transactions" => $recentTransactions

    ]);


} catch (Throwable $e) {

    // Save actual error in PHP error log.

    error_log(
        "Dashboard error: " . $e->getMessage()
    );

    // TEMPORARY DEBUGGING
    // Only use this while developing locally.

    sendResponse(500, [

        "success" => false,

        "message" => "Dashboard Error",

        "debug_error" => $e->getMessage()

    ]);

}

?>