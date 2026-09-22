import * as categoryService from "../services/categoryService.js";

export async function getCategories(req, res, next) {
  try {
    const categories = await categoryService.getCategories();
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({
      success: true,
      message: "Catégorie créée avec succès.",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}
