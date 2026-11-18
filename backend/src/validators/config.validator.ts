import Joi from "joi"

const filenameValidator = Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9_-]+\.msgpack$/i)
    .required()
    .messages({
        "string.empty": "Filename is required",
        "string.pattern.base": "Invalid filename. Only .msgpack files are allowed",
        "any.required": "Filename is required"
    });

const updateConfigValidator = Joi.object({
  updates: Joi.array()
    .items(
      Joi.object({
        path: Joi.array()
          .items(
            Joi.alternatives().try(
              Joi.string().min(1),
              Joi.number().integer().min(0)
            )
          )
          .required(),

        value: Joi.any().required(),
      }).required()
    )
    .required(),
});

const createSlotValidator = Joi.object({
  slot: Joi.object({
    position: Joi.object({
      x: Joi.number().min(0).required(),
      y: Joi.number().min(0).required(),
      width: Joi.number().greater(0).required(),
      height: Joi.number().greater(0).required(),
    })
      .required()
      .unknown(false),

    interaction: Joi.string().allow(null).required(),

    tags: Joi.array()
      .items(Joi.string())
      .min(1)
      .required(),
  })
    .required()
    .unknown(false),
}).unknown(false);

export {filenameValidator,  updateConfigValidator, createSlotValidator};