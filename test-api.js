import assert from "node:assert/strict";
import test from "node:test";

const runIntegration = process.env.RUN_API_INTEGRATION === "true";
const host = process.env.TEST_API_HOST || "localhost";
const port = Number(process.env.TEST_API_PORT || 5000);

async function request(path, options = {}) {
  const response = await fetch(`http://${host}:${port}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

test(
  "API locale : création et suivi d'une commande à la livraison",
  { skip: !runIntegration && "Définissez RUN_API_INTEGRATION=true pour exécuter ce test contre une API locale dédiée." },
  async () => {
    const health = await request("/api/health");
    assert.equal(health.response.status, 200, health.data.message);

    const products = await request("/api/products");
    assert.equal(products.response.status, 200, products.data.message);
    const product = products.data.data?.find((item) => item.isActive && item.stock > 0);
    assert.ok(product, "Un produit actif en stock est requis pour ce test.");

    const created = await request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test intégration local",
        phone: "+22997000000",
        email: "test.integration@example.invalid",
        city: "Cotonou",
        address: "Adresse de test locale",
        note: "Commande de test automatisé",
        paymentMethod: "CASH_ON_DELIVERY",
        items: [{ productId: product.id, quantity: 1 }],
      }),
    });

    assert.equal(created.response.status, 201, JSON.stringify(created.data));
    assert.equal(created.data.success, true, JSON.stringify(created.data));
    assert.equal(created.data.data?.paymentMethod, "CASH_ON_DELIVERY");
    assert.ok(created.data.data?.orderNumber, "La commande doit avoir une référence.");
    assert.ok(created.data.data?.total > 0, "Le total doit être calculé côté serveur.");

    const tracked = await request(
      `/api/orders/track/${encodeURIComponent(created.data.data.orderNumber)}`,
      {
        headers: {
          "X-Payment-Access-Token": created.data.data.paymentAccessToken,
        },
      },
    );
    assert.equal(tracked.response.status, 200, JSON.stringify(tracked.data));
    assert.equal(tracked.data.data?.orderNumber, created.data.data.orderNumber);
  },
);
