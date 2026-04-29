import { db } from "../../../lib/db";
import type {
  CreateAddressInput,
  UpdateAddressInput,
} from "../schemas/address.schemas";

const ADDRESS_SELECT = {
  id: true,
  userId: true,
  label: true,
  fullName: true,
  phone: true,
  line1: true,
  line2: true,
  city: true,
  state: true,
  pincode: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const addressRepository = {
  async findAllByUserId(userId: string) {
    return db.address.findMany({
      where: { userId },
      select: ADDRESS_SELECT,
      // Default address first, then newest first
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  },

  async findById(id: string, userId: string) {
    return db.address.findFirst({
      where: { id, userId }, // userId check prevents accessing other users' addresses
      select: ADDRESS_SELECT,
    });
  },

  async findDefaultByUserId(userId: string) {
    return db.address.findFirst({
      where: { userId, isDefault: true },
      select: ADDRESS_SELECT,
    });
  },

  async countByUserId(userId: string): Promise<number> {
    return db.address.count({ where: { userId } });
  },

  async create(userId: string, data: CreateAddressInput) {
    return db.$transaction(
      async (tx: {
        address: {
          updateMany: (arg0: {
            where: { userId: string; isDefault: boolean };
            data: { isDefault: boolean };
          }) => any;
          count: (arg0: { where: { userId: string } }) => any;
          create: (arg0: {
            data: {
              userId: string;
              label: string;
              fullName: string;
              phone: string;
              line1: string;
              line2: string | undefined;
              city: string;
              state: string;
              pincode: string;
              isDefault: boolean;
            };
            select: {
              readonly id: true;
              readonly userId: true;
              readonly label: true;
              readonly fullName: true;
              readonly phone: true;
              readonly line1: true;
              readonly line2: true;
              readonly city: true;
              readonly state: true;
              readonly pincode: true;
              readonly isDefault: true;
              readonly createdAt: true;
              readonly updatedAt: true;
            };
          }) => any;
        };
      }) => {
        // If this is being set as default, clear any existing default first
        if (data.isDefault) {
          await tx.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
          });
        }

        // If this is the user's very first address, make it default automatically
        const count = await tx.address.count({ where: { userId } });
        const makeDefault = data.isDefault || count === 0;

        return tx.address.create({
          data: {
            userId,
            label: data.label,
            fullName: data.fullName,
            phone: data.phone,
            line1: data.line1,
            line2: data.line2,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            isDefault: makeDefault,
          },
          select: ADDRESS_SELECT,
        });
      }
    );
  },

  async update(id: string, userId: string, data: UpdateAddressInput) {
    return db.$transaction(async (tx: any) => {
      // If setting as new default, clear existing default first
      if (data.isDefault === true) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data,
        select: ADDRESS_SELECT,
      });
    });
  },

  async delete(id: string, userId: string) {
    return db.$transaction(async (tx: any) => {
      const address = await tx.address.findFirst({
        where: { id, userId },
        select: { isDefault: true },
      });

      await tx.address.delete({ where: { id } });

      // If we deleted the default address, promote the most recent one
      if (address?.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });

        if (next) {
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });
  },

  async setDefault(id: string, userId: string) {
    return db.$transaction(async (tx: any) => {
      // Clear current default
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      // Set the new default
      return tx.address.update({
        where: { id },
        data: { isDefault: true },
        select: ADDRESS_SELECT,
      });
    });
  },
};
