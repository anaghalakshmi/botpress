import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import {
  listAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../address/controller/address.controller";
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from "../address/schemas/address.schemas";

const router = Router();

// All address routes require authentication
router.use(authenticate);

// GET  /api/v1/addresses
router.get("/", listAddresses);

// GET  /api/v1/addresses/:id
router.get("/:id", validate({ params: addressIdParamSchema }), getAddress);

// POST /api/v1/addresses
router.post("/", validate({ body: createAddressSchema }), createAddress);

// PATCH /api/v1/addresses/:id
router.patch(
  "/:id",
  validate({ params: addressIdParamSchema, body: updateAddressSchema }),
  updateAddress
);

// DELETE /api/v1/addresses/:id
router.delete(
  "/:id",
  validate({ params: addressIdParamSchema }),
  deleteAddress
);

// PATCH /api/v1/addresses/:id/default — set as default address
router.patch(
  "/:id/default",
  validate({ params: addressIdParamSchema }),
  setDefaultAddress
);

export default router;
