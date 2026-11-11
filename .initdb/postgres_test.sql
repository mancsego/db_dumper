-- PostgreSQL test schema and seed data for DB Dumper integration tests
-- Tables mirror the MySQL test.sql schema adapted to PostgreSQL conventions

CREATE TABLE IF NOT EXISTS users (
    "userId"    SERIAL PRIMARY KEY,
    "firstName" VARCHAR(255),
    "lastName"  VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    "roleId"    SERIAL PRIMARY KEY,
    "roleName"  VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "userToRole" (
    "userId"    INTEGER NOT NULL,
    "roleId"    INTEGER NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("userId", "roleId"),
    CONSTRAINT fk_userToRole_users FOREIGN KEY ("userId") REFERENCES users("userId") ON DELETE CASCADE,
    CONSTRAINT fk_userToRole_roles FOREIGN KEY ("roleId") REFERENCES roles("roleId") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS items (
    "itemId"    SERIAL PRIMARY KEY,
    "userId"    INTEGER NOT NULL,
    "itemName"  VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_items_users FOREIGN KEY ("userId") REFERENCES users("userId") ON DELETE CASCADE
);

INSERT INTO users ("firstName", "lastName")
VALUES
  ('Istvan', 'Abraham'),
  ('Lukas', 'Chodorski'),
  ('Stefano', 'Formicola'),
  ('Sina', 'Fischer');

INSERT INTO roles ("roleName")
VALUES ('administrator'), ('developer'), ('manager'), ('user');

INSERT INTO "userToRole" ("userId", "roleId")
VALUES (1, 1), (1, 2), (2, 2), (2, 3), (3, 2), (4, 3);

INSERT INTO items ("userId", "itemName")
VALUES
  (1, 'Expensive tech stuff'),
  (2, '4000 Eur bike'),
  (3, 'Italian sausage'),
  (4, 'Dyson Airwrap');
