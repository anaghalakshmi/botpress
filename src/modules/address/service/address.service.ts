import { addressRepository } from "../repository/address.repository";
import { AppError } from "../../../types";
import type { AddressDto } from "../address.types";
import type {
  CreateAddressInput,
  UpdateAddressInput,
} from "../schemas/address.schemas";

// Maximum saved addresses per user — prevents abuse
const MAX_ADDRESSES = 5;

export const addressService = {
  // ── List all addresses for current user ──────────────────────────────────
  async listAddresses(userId: string): Promise<AddressDto[]> {
    const addresses = await addressRepository.findAllByUserId(userId);
    return addresses as AddressDto[];
  },

  // ── Get single address ────────────────────────────────────────────────────
  async getAddress(id: string, userId: string): Promise<AddressDto> {
    const address = await addressRepository.findById(id, userId);

    if (!address) {
      throw AppError.notFound("Address");
    }

    return address as AddressDto;
  },

  // ── Create new address ────────────────────────────────────────────────────
  async createAddress(
    userId: string,
    dto: CreateAddressInput
  ): Promise<AddressDto> {
    const count = await addressRepository.countByUserId(userId);

    if (count >= MAX_ADDRESSES) {
      throw AppError.conflict(
        `You can save a maximum of ${MAX_ADDRESSES} addresses. Please delete one before adding a new one.`,
        "ADDRESS_LIMIT_REACHED"
      );
    }

    const address = await addressRepository.create(userId, dto);
    return address as AddressDto;
  },

  // ── Update existing address ───────────────────────────────────────────────
  async updateAddress(
    id: string,
    userId: string,
    dto: UpdateAddressInput
  ): Promise<AddressDto> {
    // Verify ownership before updating
    const existing = await addressRepository.findById(id, userId);
    if (!existing) {
      throw AppError.notFound("Address");
    }

    const updated = await addressRepository.update(id, userId, dto);
    return updated as AddressDto;
  },

  // ── Delete address ────────────────────────────────────────────────────────
  async deleteAddress(id: string, userId: string): Promise<void> {
    const existing = await addressRepository.findById(id, userId);
    if (!existing) {
      throw AppError.notFound("Address");
    }

    await addressRepository.delete(id, userId);
  },

  // ── Set default address ───────────────────────────────────────────────────
  async setDefaultAddress(id: string, userId: string): Promise<AddressDto> {
    const existing = await addressRepository.findById(id, userId);
    if (!existing) {
      throw AppError.notFound("Address");
    }

    if (existing.isDefault) {
      // Already default — return as-is, no need to write to DB
      return existing as AddressDto;
    }

    const updated = await addressRepository.setDefault(id, userId);
    return updated as AddressDto;
  },
};
