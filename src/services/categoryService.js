import { prisma } from "../config/db.js";

export async function getCategories() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    productCount: c._count.products,
  }));
}

export async function createCategory(data) {
  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return prisma.category.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
    },
  });
}
