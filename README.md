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

## Screenshots
1. Index Page <br>
<img width="1816" height="877" alt="image" src="https://github.com/user-attachments/assets/49a3dc7c-80bd-4b6a-b846-75ad5fe9d762" /> <br> <br>

2. SignUp Page and their Validations <br> <br>
A. Normal Signup Form <br> <br>
<img width="845" height="807" alt="image" src="https://github.com/user-attachments/assets/f34121a8-9eaf-4de0-a90d-eca2aaff1064" /> <br> <br>
<img width="823" height="405" alt="image" src="https://github.com/user-attachments/assets/44c2aea9-f193-4407-a335-ad8e5c2f765e" /> <br> <br> <br>

B. Required Field Validation <br> <br>
<img width="582" height="824" alt="image" src="https://github.com/user-attachments/assets/a240a27d-3a6a-4a11-814f-dcb3681383cd" /> <br> <br> <br>

C. Full Name and Username Validation <br> <br>
<img width="579" height="729" alt="image" src="https://github.com/user-attachments/assets/f14fcd21-4960-483b-b40d-9fd514e35fb1" /> <br> <br> <br>

D. Password Validation <br> <br>
<img width="597" height="757" alt="image" src="https://github.com/user-attachments/assets/08c132f5-45e6-447e-af6d-30a246246f35" /> <br> <br> <br>

E. Confirm Password Validation <br> <br>
<img width="572" height="654" alt="image" src="https://github.com/user-attachments/assets/8080959d-f2f5-4e66-afb2-eda881384909" /> <br> <br> <br>

F. Successfull Registration <br> <br>
<img width="577" height="765" alt="image" src="https://github.com/user-attachments/assets/d234a873-841d-4f86-b162-153ece688495" /> <br> <br> <br>

3. Login Page and their Validations <br> <br>
A. Normal Login Page <br> <br>
<img width="546" height="775" alt="image" src="https://github.com/user-attachments/assets/50be1f28-3049-4357-bf5e-5e7619368181" /> <br> <br> <br>

B. Required Field Validation <br> <br>
<img width="554" height="820" alt="image" src="https://github.com/user-attachments/assets/ec8bcfdc-2eb2-4407-a5d8-fd6691262921" /> <br> <br> <br>

C. Invalid Credentials <br> <br>
<img width="536" height="845" alt="image" src="https://github.com/user-attachments/assets/0bb3b911-607c-4334-b950-37671e5e6e90" /> <br> <br> <br>

D. Successful Login(Redirected to the Dashboard) <br> <br>
<img width="1919" height="687" alt="image" src="https://github.com/user-attachments/assets/74634734-2b7c-4a6f-92e2-0cde7f1fa049" /> <br> <br> <br>

4. Dashboard Page <br> <br>
<img width="1919" height="687" alt="image" src="https://github.com/user-attachments/assets/3542fecd-0a86-4eb2-8550-3cf91e4e767a" /> <br> <br>
<img width="1525" height="594" alt="image" src="https://github.com/user-attachments/assets/b6f03745-4baa-4cd5-ba8c-198b9fed12e7" /> <br> <br>
<img width="1530" height="607" alt="image" src="https://github.com/user-attachments/assets/491d00f0-733b-4f47-98b3-99f48364a73a" /> <br> <br> <br>

5. Categories and their Validations <br> <br>
A. Normal Category Page <br> <br>
<img width="1526" height="619" alt="image" src="https://github.com/user-attachments/assets/2e352389-948a-49ce-96e0-051dc2d97680" /> <br> <br> <br>

B. All Validations of Category Page <br> <br>
<img width="557" height="812" alt="image" src="https://github.com/user-attachments/assets/c2ce2b06-9cac-4846-971b-c01b818cc021" /> <br> <br> <br>

C. Successful Categories <br> <br>
<img width="705" height="826" alt="image" src="https://github.com/user-attachments/assets/7391769e-c5ce-4b26-ad9e-f1f80201253a" /> <br> <br>
<img width="691" height="823" alt="image" src="https://github.com/user-attachments/assets/f0afc224-c5e8-4d7a-bf01-f923695dd1aa" /> <br> <br>
<img width="1479" height="605" alt="image" src="https://github.com/user-attachments/assets/412852cc-29a9-4114-9dd2-380a8156b5d1" /> <br> <br> <br>

6. Transactions and their Validations <br> <br>
A. Normal Transactions Page <br> <br>
<img width="519" height="815" alt="image" src="https://github.com/user-attachments/assets/114369a0-b33e-4dc4-b702-36eb5a476407" /> <br> <br>

B. All Validations of Transcations Page <br> <br>
<img width="684" height="579" alt="image" src="https://github.com/user-attachments/assets/385e17ff-eaff-45ab-928d-389cf9794397" /> <br> <br>
<img width="691" height="349" alt="image" src="https://github.com/user-attachments/assets/d7efc88b-f1d6-4b58-938b-981490de698a" /> <br> <br> <br>

C.Successful Transcations <br> <br>
<img width="556" height="851" alt="image" src="https://github.com/user-attachments/assets/db737938-15ee-40a5-865c-e8558f8b6b33" /> <br> <br>
<img width="1432" height="538" alt="image" src="https://github.com/user-attachments/assets/e0d85150-c466-4d30-b33a-e4602affe595" /> <br> <br> <br>

7. Reports & Analytics <br> <br>
<img width="1478" height="743" alt="image" src="https://github.com/user-attachments/assets/cf18569d-8648-48ba-a3e4-f4a6b5bede16" /> <br> <br>
<img width="1489" height="625" alt="image" src="https://github.com/user-attachments/assets/3cf4b810-05a9-4f4d-8682-0d19af182cca" /> <br> <br>
<img width="1508" height="759" alt="image" src="https://github.com/user-attachments/assets/138dcca7-a68e-4210-a9ae-4153b5faac0d" /> <br> <br> <br>

8. My Profile <br> <br>
A. Old Details <br> <br>
<img width="857" height="714" alt="image" src="https://github.com/user-attachments/assets/bd6ea987-b460-4dc8-b0de-def001ee7116" /> <br> <br>

B. New Details <br> <br>
<img width="877" height="693" alt="image" src="https://github.com/user-attachments/assets/d9d3bc0c-f124-4267-a12e-e659debc840f" /> <br> <br> <br>
## Author: Santosh Hinduja
GitHub: [@santoshhinduja-15](https://github.com/santoshhinduja-15)

## License
This project is developed for educational and learning purposes.
