import type { Request, Response } from "express";
import { addressService } from "../service/address.service";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/response";

// GET /api/v1/addresses
export const listAddresses = asyncHandler(
  async (req: Request, res: Response) => {
    const addresses = await addressService.listAddresses(req.user!.id);
    sendSuccess(res, { addresses });
  }
);

// GET /api/v1/addresses/:id
export const getAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = await addressService.getAddress(
    req.params["id"]!,
    req.user!.id
  );
  sendSuccess(res, { address });
});

// POST /api/v1/addresses
export const createAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const address = await addressService.createAddress(req.user!.id, req.body);
    sendSuccess(res, { address }, "Address saved successfully.", 201);
  }
);

// PATCH /api/v1/addresses/:id
export const updateAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const address = await addressService.updateAddress(
      req.params["id"]!,
      req.user!.id,
      req.body
    );
    sendSuccess(res, { address }, "Address updated successfully.");
  }
);

// DELETE /api/v1/addresses/:id
export const deleteAddress = asyncHandler(
  async (req: Request, res: Response) => {
    await addressService.deleteAddress(req.params["id"]!, req.user!.id);
    sendSuccess(res, null, "Address deleted successfully.");
  }
);

// PATCH /api/v1/addresses/:id/default
export const setDefaultAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const address = await addressService.setDefaultAddress(
      req.params["id"]!,
      req.user!.id
    );
    sendSuccess(res, { address }, "Default address updated.");
  }
);
