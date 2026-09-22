import { prisma } from "../config/db.js";

export async function getProducts({ category, search, sort, isActive }) {
  const where = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  } else {
    // Par défaut, ne renvoie que les produits actifs pour les clients
    where.isActive = true;
  }

  if (category && category !== "Tous") {
    where.category = {
      OR: [
        { name: { equals: category } },
        { slug: { equals: category.toLowerCase() } },
      ],
    };
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s } },
      { description: { contains: s } },
    ];
  }

  let orderBy = { id: "asc" };
  if (sort === "price-asc") {
    orderBy = { price: "asc" };
  } else if (sort === "price-desc") {
    orderBy = { price: "desc" };
  } else if (sort === "name") {
    orderBy = { name: "asc" };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  // Formater la réponse pour qu'elle corresponde exactement à la structure attendue par le frontend
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category.name,
    categoryId: p.categoryId,
    price: p.price,
    format: p.format,
    description: p.description,
    image: p.image,
    badge: p.badge,
    stock: p.stock,
    isActive: p.isActive,
    inStock: p.stock > 0,
  }));
}

export async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: { category: true },
  });

  if (!product) {
    const error = new Error("Produit introuvable.");
    error.statusCode = 404;
    throw error;
  }

  return {
    ...product,
    category: product.category.name,
  };
}

export async function createProduct(data) {
  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    const error = new Error("Un produit avec ce nom ou slug existe déjà.");
    error.statusCode = 409;
    throw error;
  }

  return prisma.product.create({
    data: {
      name: data.name,
      slug,
      price: data.price,
      format: data.format || "Grand format",
      description: data.description,
      image: data.image,
      badge: data.badge || null,
      stock: data.stock !== undefined ? data.stock : 50,
      isActive: data.isActive !== undefined ? data.isActive : true,
      categoryId: data.categoryId,
    },
    include: { category: true },
  });
}

export async function updateProduct(id, data) {
  const product = await prisma.product.findUnique({ where: { id: Number(id) } });
  if (!product) {
    const error = new Error("Produit introuvable.");
    error.statusCode = 404;
    throw error;
  }

  return prisma.product.update({
    where: { id: Number(id) },
    data,
    include: { category: true },
  });
}

export async function updateProductStock(id, stock) {
  return prisma.product.update({
    where: { id: Number(id) },
    data: { stock },
  });
}

export async function deleteProduct(id) {
  // Suppression douce (soft delete) en désactivant le produit pour préserver l'historique des commandes
  return prisma.product.update({
    where: { id: Number(id) },
    data: { isActive: false },
  });
}
