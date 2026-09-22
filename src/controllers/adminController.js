import * as adminService from "../services/adminService.js";

export async function getDashboardStats(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}
