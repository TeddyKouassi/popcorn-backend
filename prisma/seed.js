import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
console.log("🌱 Démarrage du seed de la base de données PopCorn...");

// 1. Création ou mise à jour de l'administrateur
const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || "[admin@popcorn.bj](mailto:admin@popcorn.bj)";
const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
const adminName =
process.env.ADMIN_DEFAULT_NAME || "Administrateur PopCorn";
const adminPhone = process.env.ADMIN_DEFAULT_PHONE || "+2290161655462";

if (!adminPassword) {
throw new Error(
"ADMIN_DEFAULT_PASSWORD est obligatoire pour initialiser le compte administrateur.",
);
}

const passwordHash = await bcrypt.hash(adminPassword, 10);

const admin = await prisma.user.upsert({
where: { email: adminEmail },
update: {
name: adminName,
phone: adminPhone,
password: passwordHash,
role: "ADMIN",
},
create: {
name: adminName,
email: adminEmail,
phone: adminPhone,
password: passwordHash,
role: "ADMIN",
},
});

console.log(
`👤 Compte administrateur configuré : ${admin.email} (Rôle: ${admin.role})`,
);

// 2. Création des catégories existantes
const categoriesData = [
{
name: "Sucré",
slug: "sucre",
description: "Saveurs douces, sucrées et fondantes",
},
{
name: "Salé",
slug: "sale",
description: "Recettes salées, fromagées et relevées",
},
{
name: "Classique",
slug: "classique",
description: "Le goût intemporel et croustillant du popcorn nature",
},
];

const categories = {};

for (const cat of categoriesData) {
const createdCat = await prisma.category.upsert({
where: { slug: cat.slug },
update: {
name: cat.name,
description: cat.description,
},
create: cat,
});

```
categories[cat.name] = createdCat.id;
```

}

console.log("📁 Catégories créées :", Object.keys(categories));

// 3. Création des 6 produits réels du frontend
const productsData = [
{
id: 1,
name: "Popcorn Caramel",
slug: "popcorn-caramel",
categoryName: "Sucré",
price: 1500,
format: "Grand format",
description: "Un popcorn généreusement enrobé d'un délicieux caramel.",
image: "pop11.jpg",
badge: "Best-seller",
stock: 60,
},
{
id: 2,
name: "Popcorn Chocolat",
slug: "popcorn-chocolat",
categoryName: "Sucré",
price: 1800,
format: "Grand format",
description: "Un popcorn gourmand au délicieux goût de chocolat.",
image: "pop13.jpg",
badge: "Gourmand",
stock: 45,
},
{
id: 3,
name: "Popcorn Fromage",
slug: "popcorn-fromage",
categoryName: "Salé",
price: 1500,
format: "Grand format",
description: "Une saveur fromagée généreuse pour les amateurs de salé.",
image: "pop2.jpg",
badge: null,
stock: 40,
},
{
id: 4,
name: "Popcorn Nature",
slug: "popcorn-nature",
categoryName: "Classique",
price: 1200,
format: "Grand format",
description: "Le popcorn classique, simple et croustillant.",
image: "pop19.jpg",
badge: null,
stock: 80,
},
{
id: 5,
name: "Popcorn Caramel Beurre",
slug: "popcorn-caramel-beurre",
categoryName: "Sucré",
price: 1700,
format: "Grand format",
description: "Une recette douce et fondante au caramel et au beurre.",
image: "pop10.jpg",
badge: null,
stock: 35,
},
{
id: 6,
name: "Popcorn Épicé",
slug: "popcorn-epice",
categoryName: "Salé",
price: 1600,
format: "Grand format",
description: "Une recette relevée pour ceux qui aiment les saveurs intenses.",
image: "pop9.jpg",
badge: null,
stock: 30,
},
];

for (const item of productsData) {
await prisma.product.upsert({
where: { slug: item.slug },
update: {
name: item.name,
price: item.price,
format: item.format,
description: item.description,
image: item.image,
badge: item.badge,
stock: item.stock,
categoryId: categories[item.categoryName],
},
create: {
name: item.name,
slug: item.slug,
price: item.price,
format: item.format,
description: item.description,
image: item.image,
badge: item.badge,
stock: item.stock,
categoryId: categories[item.categoryName],
},
});
}

console.log("🍿 6 produits importés avec succès.");
console.log("✅ Seed terminé avec succès !");
}

main()
.catch((e) => {
console.error("❌ Erreur pendant le seed:", e);
process.exit(1);
})
.finally(async () => {
await prisma.$disconnect();
});
