# PopCorn Backend API

API REST complète pour l'application e-commerce PopCorn, propulsée par Node.js, Express, Prisma ORM, et SQLite/PostgreSQL.

---

## 🚀 Fonctionnalités Implémentées

* **Catalogue de Produits & Catégories** : Synchronisé avec les saveurs, formats et tarifs en FCFA du frontend.

* **Authentification & Sécurité** : Inscription, connexion, hachage bcrypt, tokens JWT et contrôle des rôles (`CUSTOMER` et `ADMIN`).

* **Moteur de Commande Sécurisé** :

  * **Transactions atomiques Prisma** pour la création de commande et la décrémentation des stocks.
  * Calcul et vérification stricte des prix côté serveur.
  * Génération de références de commande uniques (ex: `POP-2026-1001`).

* **Génération Automatique de Factures PDF** : Moteur PDFKit créant des factures conformes avec articles, prix FCFA et coordonnées client.

* **Suivi de Commande en Ligne** : Endpoint public permettant de suivre l'avancement d'une livraison via son numéro de commande.

* **Système de Notification** :

  * Préparation du lien WhatsApp officiel avec la référence réelle de commande.
  * Architecture d'e-mails transactionnels, actuellement en simulation locale sans clé API obligatoire.

* **Tableau de Bord Administrateur** : Statistiques de vente, chiffre d'affaires, nombre de commandes et alertes de stock faible.

* **Messages de Contact** : Enregistrement et consultation des demandes de contact.

---

## 🛠️ Commandes Disponibles


# Démarrer le serveur en mode développement
npm run dev

# Démarrer le serveur en production
npm start

# Mettre à jour la base de données après modification du schéma
npx prisma migrate dev --name <nom_migration>

# Ré-initialiser et injecter les données initiales
node prisma/seed.js

# Ouvrir l'interface graphique d'administration Prisma Studio
npx prisma studio


---

## 🔐 Configuration administrateur

L'utilisateur administrateur est créé lors de l'initialisation de la base de données.

Les identifiants administrateur doivent être configurés via les variables d'environnement du fichier `.env`.

Pour des raisons de sécurité, aucun identifiant, mot de passe, secret JWT ou clé d'API ne doit être publié dans le dépôt Git.

Consultez le fichier `.env.example` pour connaître les variables nécessaires à la configuration.

---

## ⚙️ Variables d'environnement

Le projet utilise un fichier `.env` pour les paramètres sensibles et les configurations locales.

Exemples de variables utilisées :

* `DATABASE_URL`
* `JWT_SECRET`
* `JWT_EXPIRES_IN`
* `ADMIN_DEFAULT_NAME`
* `ADMIN_DEFAULT_EMAIL`
* `ADMIN_DEFAULT_PASSWORD`
* `ADMIN_DEFAULT_PHONE`
* `OFFICIAL_WHATSAPP_NUMBER`
* `OFFICIAL_CONTACT_EMAIL`

Le fichier `.env` ne doit jamais être commit ou publié sur GitHub.

---

## 📁 Structure du projet


popcorn-backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── ...
├── uploads/
├── invoices/
├── .env
├── .env.example
├── .gitignore
├── package.json
└── server.js


---

## 🔒 Sécurité

Les informations sensibles doivent être stockées uniquement dans les variables d'environnement.

Ne publiez jamais :

* mots de passe administrateur ;
* secrets JWT ;
* clés API ;
* clés de paiement ;
* identifiants SMTP ;
* informations d'accès à la base de données.

Avant tout déploiement en production, remplacez les valeurs de développement par des secrets sécurisés et spécifiques à l'environnement de production.

---

## 📌 Statut du projet

Le backend PopCorn est actuellement développé en environnement local et évolue progressivement vers une architecture complète pour la gestion des produits, commandes, paiements, factures, notifications et administration.
: on doit également vérifier `prisma/seed.js` et changer l'ancien mot de passe administrateur puisqu'il a déjà été exposé publiquement.