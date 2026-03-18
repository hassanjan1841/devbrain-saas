import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@devbrain.ai' },
    update: {},
    create: {
      email: 'demo@devbrain.ai',
      passwordHash
    }
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'travel-saas' },
    update: {
      description: 'Seeded demo workspace for DevBrain v1.'
    },
    create: {
      userId: user.id,
      name: 'Travel SaaS',
      slug: 'travel-saas',
      description: 'Seeded demo workspace for DevBrain v1.'
    }
  });

  await prisma.session.createMany({
    data: [
      {
        userId: user.id,
        workspaceId: workspace.id,
        input: 'Create an Express middleware for JWT auth.',
        output: 'Generated JWT middleware with bearer token parsing and route protection.'
      },
      {
        userId: user.id,
        workspaceId: workspace.id,
        input: 'Refactor a Prisma repository into reusable services.',
        output: 'Split database access into modular service functions with typed inputs.'
      }
    ],
    skipDuplicates: true
  });

  console.log('Seed completed for demo@devbrain.ai / password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
