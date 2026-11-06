# MoneyManager - Your Money, Your Income, Your Expenses, All in One Place.
MoneyManager is a full-stack personal expense tracking application that helps users manage their income, expenses, and financial activities in one place. It provides secure user authentication, user-specific transaction tracking, category management, and financial summaries through an interactive and responsive dashboard.

## Features
### Authentication & Security
- User Registration and Login
- Secure password hashing
- Session-based authentication
- CSRF protection
- Change Password functionality
- User-specific data access
- Case-insensitive unique usernames
- Server-side input validation

### Dashboard
- Total Income Summary
- Total Expenses Summary
- Net Savings Calculation
- Today's Expenses
- Monthly Financial Summary
- Recent Transactions
- Transaction Count

### Transaction Management
- Add, View, Edit, and Delete Transactions
- Income and Expense Tracking
- Category-based Transactions
- Search Transactions by Title
- Filter by Transaction Type
- Filter by Category and Date
- Sort Transactions
- Pagination
- Prevent Future Transaction Dates

### Category Management
- Create, View, Edit, and Delete Categories
- Separate Income and Expense Categories
- Custom Category Colors
- Optional Category Descriptions
- Duplicate Category Validation
- Prevent Deletion of Categories Used in Transactions

### Reports
- Financial Reports
- Income and Expense Analysis
- Transaction-based Financial Insights

### Profile Management
- View and Update Profile Details
- Update Full Name and Username
- Change Password
- Account Information

### User Interface
- Responsive Design
- Light Mode and Dark Mode
- Reusable Sidebar and Footer Components
- Bootstrap 5 UI Components
- Form Validation and Error Handling

## Technology Stack
### Frontend
- HTML5
- CSS3
- Bootstrap 5
- JavaScript
- Fetch API

### Backend
- PHP
- RESTful API

### Database
- PostgreSQL
- PDO (PHP Data Objects)

### Tools
- Visual Studio Code
- Git
- GitHub

## Installation & Setup
Follow these steps to run MoneyManager locally.

1. Clone the Repository: git clone https://github.com/santoshhinduja-15/MoneyManager-PHP-PostgreSQL.git
2. Navigate to the Project Directory: cd MoneyManager-PHP-PostgreSQL

3. Set Up the Database
- Install PostgreSQL.
- Create a database named moneymanager_db.
- Execute the SQL commands provided in the sql/moneymanager.sql file.
- Verify that the required tables and indexes have been created.

4. Configure Database Connection <br>
Open the backend/config/database.php and Configure your PostgreSQL connection details

5. Start the PHP Development Server <br>
Open the terminal in the project root directory and execute: php -S localhost:8000

6. Open the Application <br>
Visit the following URL in your browser: http://localhost:8000
Register a new account to start using MoneyManager.

### API Overview
MoneyManager uses PHP-based RESTful API endpoints to handle authentication, transactions, categories, dashboard data, reports, and profile management. API requests and responses use JSON, with Fetch API handling frontend communication.

## Security
- Passwords are securely hashed using PHP password hashing functions.
- Prepared statements are used for database queries.
- Session-based authentication protects user-specific resources.
- CSRF tokens help protect state-changing requests.
- Server-side validation prevents invalid data submission.
- Database constraints maintain data integrity.
- Users can access only their own financial records.

## Future Enhancements
- Download Financial Reports as PDF
- Monthly Budget Planning
- Expense Trends and Insights
- Recurring Transactions

## Author: Santosh Hinduja
GitHub: [@santoshhinduja-15](https://github.com/santoshhinduja-15)
## License

This project is developed for educational and learning purposes.
