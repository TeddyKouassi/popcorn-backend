import * as orderService from "../services/orderService.js";

export async function createOrder(req, res, next) {
  try {
    const { name, phone, email, city, address, note, paymentMethod, items } = req.body;
    const userId = req.user ? req.user.id : null;

    const order = await orderService.createOrder({
      name,
      phone,
      email,
      city,
      address,
      note,
      paymentMethod,
      items,
      userId,
    });

    res.status(201).json({
      success: true,
      message: "Commande enregistrée avec succès.",
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(req, res, next) {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function trackOrder(req, res, next) {
  try {
    const order = await orderService.getOrderByNumber(req.params.orderNumber);
    res.status(200).json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        city: order.city,
        address: order.address,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        total: order.total,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        createdAt: order.createdAt,
        items: order.items,
        invoiceNumber: order.invoice?.invoiceNumber || null,
        hasInvoice: Boolean(order.invoice),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const orders = await orderService.getUserOrders(req.user.id);
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllOrders(req, res, next) {
  try {
    const { status, page, limit } = req.query;
    const result = await orderService.getAllOrders({ status, page, limit });
    res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { status, paymentStatus } = req.body;
    const updated = await orderService.updateOrderStatus(req.params.id, status, paymentStatus);
    res.status(200).json({
      success: true,
      message: "Statut de la commande mis à jour.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
