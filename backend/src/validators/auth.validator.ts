
import Joi from "joi";

export const signUpSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email()
    .max(254)
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Enter a valid email address",
      "string.max": "Email cannot exceed 254 characters",
      "any.required": "Email is required",
    }),

  password: Joi.string()
    .min(8)
    .max(72)
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters",
      "string.max": "Password cannot exceed 72 characters",
      "any.required": "Password is required",
    }),
});

export const signInSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email()
    .required(),

  password: Joi.string()
    .required(),
});
