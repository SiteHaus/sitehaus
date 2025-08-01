import { db, otpsTable } from "@site-haus/db"; // adjust path
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function generateOTP(userId: string) {
  const otp = generateRandomOTP(); // e.g., "938473"
  const hashed = await bcrypt.hash(otp, 10);

  // Remove any old OTPs for this user if needed
  await db.delete(otpsTable).where(eq(otpsTable.userId, userId));

  // Insert new OTP
  await db.insert(otpsTable).values({
    userId,
    codeHash: hashed,
    type: "login", // or whatever
    // expiresAt will be set automatically via default
  });

  return otp; // Send this via email or SMS
}

function generateRandomOTP(length = 6): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}
