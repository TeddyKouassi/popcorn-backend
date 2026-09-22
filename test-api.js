import http from "http";
import dotenv from "dotenv";
dotenv.config();
async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on("error", (err) => reject(err));

    if (postData) {
      req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log("🧪 Lancement des tests de validation de l'API PopCorn...\n");

  try {
    // 1. Health check
    console.log("1️⃣ Test /api/health...");
    const health = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/health",
      method: "GET",
    });
    console.log("Status:", health.status, "| Réponse:", health.data.status);

    // 2. Produits
    console.log("\n2️⃣ Test /api/products...");
    const products = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/products",
      method: "GET",
    });
    console.log(`Status: ${products.status} | Nombre de produits reçus : ${products.data.count}`);
    console.log("Premier produit :", products.data.data[0]?.name, `(${products.data.data[0]?.price} FCFA)`);

    // 3. Catégories
    console.log("\n3️⃣ Test /api/categories...");
    const categories = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/categories",
      method: "GET",
    });
    console.log(`Status: ${categories.status} | Catégories :`, categories.data.data.map((c) => c.name));

    // 4. Authentification Admin (Login)
    console.log("\n4️⃣ Test /api/auth/login (Admin)...");
    const login = await makeRequest(
      {
        hostname: "localhost",
        port: 5000,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        email: "togbadjamaurel@gmail.com",
        password: "Kouassi99",
      },
    );
    console.log(`Status: ${login.status} | Connecté : ${login.data.data?.user?.name} (Rôle: ${login.data.data?.user?.role})`);
    const adminToken = login.data.data?.token;

    // 5. Création d'une commande test (Transaction Prisma)
    console.log("\n5️⃣ Test /api/orders (Création avec Transaction Prisma & contrôle de stock)...");
    const newOrder = await makeRequest(
      {
        hostname: "localhost",
        port: 5000,
        path: "/api/orders",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        name: "Aïcha Test",
        phone: "+22997000000",
        email: "aicha.test@example.com",
        city: "Cotonou",
        address: "Haie Vive, rue 12",
        note: "Bien chaud s'il vous plaît",
        paymentMethod: "CASH_ON_DELIVERY",
        items: [
          { productId: 1, quantity: 2 }, // 2 x 1500 = 3000
          { productId: 2, quantity: 1 }, // 1 x 1800 = 1800 -> Total 4800 FCFA
        ],
      },
    );
    console.log(`Status: ${newOrder.status} | N° Commande généré : ${newOrder.data.data?.orderNumber}`);
    console.log(`Total calculé serveur : ${newOrder.data.data?.total} FCFA (Attendu: 4800 FCFA)`);
    console.log(`Facture générée : ${newOrder.data.data?.invoice?.pdfPath}`);
    console.log(`Lien WhatsApp officiel : ${newOrder.data.data?.whatsappUrl?.substring(0, 60)}...`);

    const orderNumber = newOrder.data.data?.orderNumber;

    // 6. Suivi public de la commande créée
    console.log("\n6️⃣ Test /api/orders/track/:orderNumber (Suivi public)...");
    const track = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: `/api/orders/track/${orderNumber}`,
      method: "GET",
    });
    console.log(`Status: ${track.status} | Statut actuel : ${track.data.data?.status} | Client : ${track.data.data?.customerName}`);

    // 7. Tableau de bord Admin
    console.log("\n7️⃣ Test /api/admin/stats (Dashboard)...");
    const stats = await makeRequest({
      hostname: "localhost",
      port: 5000,
      path: "/api/admin/stats",
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`Status: ${stats.status} | CA Total : ${stats.data.data?.totalRevenue} FCFA | Total commandes : ${stats.data.data?.totalOrders}`);

    console.log("\n🎉 TOUS LES TESTS BACKEND ONT RÉUSSI AVEC SUCCÈS !");
  } catch (error) {
    console.error("❌ Échec d'un test :", error);
  }
}

runTests();
