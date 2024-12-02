CREATE TABLE users (
    userId INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
    firstName VARCHAR(255),
    lastName VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    roleId INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
    roleName VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE userToRole (
    userId INT UNSIGNED NOT NULL,
    roleId INT UNSIGNED NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (userId, roleId),
    CONSTRAINT fk_userToRole_users FOREIGN KEY (userId)REFERENCES users(userId),
    CONSTRAINT fk_userToRole_roles FOREIGN KEY (roleId)REFERENCES roles(roleId)
);

CREATE TABLE items (
    itemId INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
    userId INT UNSIGNED NOT NULL,
    itemName VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_items_users FOREIGN KEY (userId)REFERENCES users(userId)
);

INSERT INTO users (firstName, lastName)
VALUES
('Istvan', 'Abraham'),
('Lukas', 'Chodorski'),
('Stefano', 'Formicola'),
('Sina', 'Fischer');

INSERT INTO roles (roleName)
VALUES ('administrator'), ('developer'), ('manager'),('user');

INSERT INTO userToRole (userId, roleId)
VALUES (1, 1), (1, 2), (2, 2), (2, 3), (3, 2), (4, 3);

INSERT INTO items (userId, itemName)
VALUES
(1, 'Expensive tech stuff'),
(2, '4000 Eur bike'),
(3, 'Italian sausage'),
(4, 'Dyson Airwrap');