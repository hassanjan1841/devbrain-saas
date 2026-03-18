import { prisma } from './prisma.js';

export async function createUser(params: { email: string; passwordHash: string }) {
  return prisma.user.create({
    data: params
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}
