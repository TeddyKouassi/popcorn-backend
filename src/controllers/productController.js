import * as productService from "../services/productService.js";

export async function getProducts(req, res, next) {
  try {
    const { category, search, sort } = req.query;
    const products = await productService.getProducts({ category, search, sort });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({
      success: true,
      message: "Produit créé avec succès.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Produit mis à jour.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStock(req, res, next) {
  try {
    const { stock } = req.body;
    const product = await productService.updateProductStock(req.params.id, stock);
    res.status(200).json({
      success: true,
      message: "Stock mis à jour.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id);
    res.status(200).json({
      success: true,
      message: "Produit désactivé avec succès.",
    });
  } catch (error) {
    next(error);
  }
}
