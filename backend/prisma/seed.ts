import {prisma} from "../src/lib/prisma";
import { hashPassword } from "../src/utils/password";

const users = [
  { username: "user1", email: "user1@example.com", password: "password1" },
  { username: "user2", email: "user2@example.com", password: "password2" },
];

async function main() {
  for (const user of users) {
    const passwordHash = await hashPassword(user.password);

    await prisma.user.upsert({
      where: { username: user.username },
      update: { password: passwordHash },
      create: {
        username: user.username,
        email: user.email,
        password: passwordHash,
      },
    });

    console.log(`seeded ${user.username}`);
  }
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });