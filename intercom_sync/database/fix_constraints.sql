-- Fix constraints to handle all Intercom user and author types

-- Drop and recreate author_type constraint
ALTER TABLE intercom_messages DROP CONSTRAINT IF EXISTS intercom_messages_author_type_check;
ALTER TABLE intercom_messages ADD CONSTRAINT intercom_messages_author_type_check
CHECK (author_type IN ('admin', 'user', 'contact', 'bot', 'team', 'lead', 'visitor'));

-- Drop and recreate user type constraint
ALTER TABLE intercom_users DROP CONSTRAINT IF EXISTS intercom_users_type_check;
ALTER TABLE intercom_users ADD CONSTRAINT intercom_users_type_check
CHECK (type IN ('user', 'contact', 'lead', 'visitor'));