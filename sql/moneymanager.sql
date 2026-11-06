CREATE DATABASE moneymanager_db;

-- Users Table
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(50) NOT NULL,
    username VARCHAR(30) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_full_name_length
        CHECK (CHAR_LENGTH(BTRIM(full_name)) BETWEEN 3 AND 50),

    CONSTRAINT users_username_length
        CHECK (CHAR_LENGTH(username) BETWEEN 3 AND 30),

    CONSTRAINT users_username_no_whitespace
        CHECK (username !~ '[[:space:]]')
);


-- Ensures that each username is unique regardless of uppercase or lowercase letters. 
-- For example, 'Santosh', 'santosh' and 'SANTOSH' are treated as the same username.
CREATE UNIQUE INDEX unique_username_lowercase
ON users (LOWER(username));
CREATE UNIQUE INDEX unique_username_lowercase ON users (LOWER(username));

-- Categories Table
CREATE TABLE categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    category_name VARCHAR(50) NOT NULL,
    category_type VARCHAR(10) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#6C757D',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_categories_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT categories_name_not_empty
        CHECK (CHAR_LENGTH(BTRIM(category_name)) BETWEEN 1 AND 50),

    CONSTRAINT categories_type_check
        CHECK (category_type IN ('income', 'expense')),

    CONSTRAINT categories_color_check
        CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),

    CONSTRAINT unique_category_user_type
        UNIQUE (id, user_id, category_type)
);

-- Prevents duplicate category names for the same user and category type, even if the letters are uppercase or lowercase.
CREATE UNIQUE INDEX unique_user_category_name_type
ON categories (user_id, LOWER(category_name), category_type);

-- Transactions Table
CREATE TABLE transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_transactions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    -- Ensures the category belongs to the same user and its type matches the transaction type.
    CONSTRAINT fk_transactions_category
        FOREIGN KEY (category_id, user_id, transaction_type)
        REFERENCES categories(id, user_id, category_type)
        ON DELETE RESTRICT,

    CONSTRAINT transactions_title_not_empty
        CHECK (CHAR_LENGTH(BTRIM(title)) BETWEEN 1 AND 100),

    CONSTRAINT transactions_type_check
        CHECK (transaction_type IN ('income', 'expense')),

    CONSTRAINT transactions_amount_check
        CHECK (amount > 0)
);

-- Indexes for performance optimization

-- Fetch transactions belonging to a user.
CREATE INDEX idx_transactions_user ON transactions(user_id);

-- Fetch transactions according to date.
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);

-- Fetch transactions according to category.
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category_id);

-- Fetch categories belonging to a user.
    CREATE INDEX idx_categories_user ON categories(user_id);