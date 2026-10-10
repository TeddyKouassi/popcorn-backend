import * as authService from "../services/authService.js";

export async function register(req, res, next) {
  try {
    const { name, email, phone, password } = req.body;
    const result = await authService.registerUser({ name, email, phone, password });

    res.status(201).json({
      success: true,
      message: "Compte créé avec succès.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });

    res.status(200).json({
      success: true,
      message: "Connexion réussie.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await authService.getUserProfile(req.user.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { name, phone } = req.body;
    const updatedUser = await authService.updateUserProfile(req.user.id, { name, phone });

    res.status(200).json({
      success: true,
      message: "Profil mis à jour avec succès.",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}
