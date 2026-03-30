-- =====================================================
-- SCRIPT SQL - Gestion de Comptabilité
-- =====================================================

CREATE TABLE IF NOT EXISTS utilisateurs (
    id_utilisateur INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50),
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS articles (
    id_article INTEGER PRIMARY KEY AUTOINCREMENT,
    id_utilisateur INTEGER NOT NULL,
    nom_article VARCHAR(100) NOT NULL,
    description TEXT,
    prix_unitaire DECIMAL(10, 2) NOT NULL,
    quantite_stock INTEGER DEFAULT 0,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contacts (
    id_contact INTEGER PRIMARY KEY AUTOINCREMENT,
    id_utilisateur INTEGER NOT NULL,
    nom_contact VARCHAR(100) NOT NULL,
    type_contact VARCHAR(20) NOT NULL,
    email_contact VARCHAR(100),
    telephone VARCHAR(20),
    adresse TEXT,
    code_postal VARCHAR(10),
    ville VARCHAR(50),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS factures (
    id_facture INTEGER PRIMARY KEY AUTOINCREMENT,
    id_utilisateur INTEGER NOT NULL,
    numero_facture VARCHAR(20) NOT NULL,
    id_contact INTEGER NOT NULL,
    date_facture DATE NOT NULL,
    date_echeance DATE,
    montant_ht DECIMAL(10, 2) NOT NULL,
    montant_tva DECIMAL(10, 2) DEFAULT 0,
    montant_ttc DECIMAL(10, 2) NOT NULL,
    etat_facture VARCHAR(20) DEFAULT 'brouillon',
    est_payee BOOLEAN DEFAULT FALSE,
    date_paiement DATE,
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (id_contact) REFERENCES contacts(id_contact) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lignes_facture (
    id_ligne INTEGER PRIMARY KEY AUTOINCREMENT,
    id_facture INTEGER NOT NULL,
    id_article INTEGER,
    description VARCHAR(255),
    quantite INTEGER NOT NULL DEFAULT 1,
    prix_unitaire DECIMAL(10, 2) NOT NULL,
    montant DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (id_facture) REFERENCES factures(id_facture) ON DELETE CASCADE,
    FOREIGN KEY (id_article) REFERENCES articles(id_article) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS devis (
    id_devis INTEGER PRIMARY KEY AUTOINCREMENT,
    id_utilisateur INTEGER NOT NULL,
    numero_devis VARCHAR(20) NOT NULL,
    id_contact INTEGER NOT NULL,
    date_devis DATE NOT NULL,
    date_validite DATE,
    montant_ht DECIMAL(10, 2) NOT NULL,
    montant_tva DECIMAL(10, 2) DEFAULT 0,
    montant_ttc DECIMAL(10, 2) NOT NULL,
    etat_devis VARCHAR(20) DEFAULT 'brouillon',
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (id_contact) REFERENCES contacts(id_contact) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lignes_devis (
    id_ligne INTEGER PRIMARY KEY AUTOINCREMENT,
    id_devis INTEGER NOT NULL,
    id_article INTEGER,
    description VARCHAR(255),
    quantite INTEGER NOT NULL DEFAULT 1,
    prix_unitaire DECIMAL(10, 2) NOT NULL,
    montant DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (id_devis) REFERENCES devis(id_devis) ON DELETE CASCADE,
    FOREIGN KEY (id_article) REFERENCES articles(id_article) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id_categorie INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_categorie VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS articles_categories (
    id_article INTEGER NOT NULL,
    id_categorie INTEGER NOT NULL,
    PRIMARY KEY (id_article, id_categorie),
    FOREIGN KEY (id_article) REFERENCES articles(id_article) ON DELETE CASCADE,
    FOREIGN KEY (id_categorie) REFERENCES categories(id_categorie) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_articles_utilisateur ON articles(id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_contacts_utilisateur ON contacts(id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_factures_utilisateur ON factures(id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_factures_contact ON factures(id_contact);
CREATE INDEX IF NOT EXISTS idx_devis_utilisateur ON devis(id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_devis_contact ON devis(id_contact);
CREATE INDEX IF NOT EXISTS idx_articles_categories_article ON articles_categories(id_article);
CREATE INDEX IF NOT EXISTS idx_articles_categories_categorie ON articles_categories(id_categorie);
