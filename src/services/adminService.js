import { prisma } from "../config/db.js";

export async function getDashboardStats() {
  const [
    totalOrders,
    ordersToday,
    revenueResult,
    lowStockProducts,
    recentOrders,
    unreadMessages,
    totalCustomers,
  ] = await prisma.$transaction([
    prisma.order.count(),
    prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.order.aggregate({
      where: {
        status: { not: "CANCELLED" },
      },
      _sum: {
        total: true,
      },
    }),
    prisma.product.findMany({
      where: {
        stock: { lte: 10 },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        stock: true,
        price: true,
      },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
      },
    }),
    prisma.contactMessage.count({
      where: { isRead: false },
    }),
    prisma.user.count({
      where: { role: "CUSTOMER" },
    }),
  ]);

  return {
    totalRevenue: revenueResult._sum.total || 0,
    totalOrders,
    ordersToday,
    totalCustomers,
    unreadMessages,
    lowStockProducts,
    recentOrders,
  };
}
