import { z } from "zod";

const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

const pincodeSchema = z
  .string()
  .regex(/^\d{6}$/, "Pincode must be exactly 6 digits");

// ── Create address ─────────────────────────────────────────────────────────
export const createAddressSchema = z.object({
  label: z
    .string({ required_error: "Label is required" })
    .min(2, "Label must be at least 2 characters")
    .max(50, "Label must be under 50 characters")
    .trim(),

  fullName: z
    .string({ required_error: "Full name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),

  phone: phoneSchema,

  line1: z
    .string({ required_error: "Address line 1 is required" })
    .min(5, "Address line 1 must be at least 5 characters")
    .max(200, "Address line 1 must be under 200 characters")
    .trim(),

  line2: z
    .string()
    .max(200, "Address line 2 must be under 200 characters")
    .trim()
    .optional(),

  city: z
    .string({ required_error: "City is required" })
    .min(2, "City must be at least 2 characters")
    .max(100, "City must be under 100 characters")
    .trim(),

  state: z
    .string({ required_error: "State is required" })
    .min(2, "State must be at least 2 characters")
    .max(100, "State must be under 100 characters")
    .trim(),

  pincode: pincodeSchema,

  isDefault: z.boolean().optional().default(false),
});

// ── Update address ─────────────────────────────────────────────────────────
export const updateAddressSchema = z
  .object({
    label: z.string().min(2).max(50).trim().optional(),
    fullName: z.string().min(2).max(100).trim().optional(),
    phone: phoneSchema.optional(),
    line1: z.string().min(5).max(200).trim().optional(),
    line2: z.string().max(200).trim().nullable().optional(),
    city: z.string().min(2).max(100).trim().optional(),
    state: z.string().min(2).max(100).trim().optional(),
    pincode: pincodeSchema.optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });

// ── Params ─────────────────────────────────────────────────────────────────
export const addressIdParamSchema = z.object({
  id: z.string().uuid("Address ID must be a valid UUID"),
});

// ── Inferred types ─────────────────────────────────────────────────────────
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
