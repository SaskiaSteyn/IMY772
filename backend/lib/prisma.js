import { PrismaClient } from '@prisma/client';

// Singleton pattern so we don't create multiple connections in dev with hot-reload
let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    if (!global._prisma) {
        global._prisma = new PrismaClient();
    }
    prisma = global._prisma;
}

export default prisma;
