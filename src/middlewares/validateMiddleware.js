export function validate(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error.errors) {
        return res.status(400).json({
          success: false,
          message: "Données du formulaire invalides.",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }
      return res.status(400).json({
        success: false,
        message: "Validation échouée.",
      });
    }
  };
}
