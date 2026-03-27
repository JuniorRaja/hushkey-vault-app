/**
 * Sample Data Loader - Inserts demo vault items for new users during onboarding.
 */

import DatabaseService from "./database";

const SAMPLE_VAULT_NAME = "Personal";
const SAMPLE_VAULT_ICON = "🔐";

export async function loadSampleData(userId: string, masterKey: Uint8Array): Promise<void> {
  // Create a sample vault
  const vault = await DatabaseService.createVault(
    userId,
    SAMPLE_VAULT_NAME,
    SAMPLE_VAULT_ICON,
    masterKey,
    "Your personal passwords and credentials"
  );

  const now = new Date().toISOString();

  // Sample login
  await DatabaseService.createItem(vault.id, {
    type: "login",
    name: "GitHub",
    data: {
      username: "your-username",
      password: "sample-password-123",
      url: "https://github.com",
      notes: "Sample login — replace with your real credentials",
    },
    isFavorite: true,
    lastUpdated: now,
  }, masterKey);

  // Sample secure note
  await DatabaseService.createItem(vault.id, {
    type: "note",
    name: "Welcome to HushKey",
    data: {
      content: "This is a sample secure note. Your notes are encrypted end-to-end and only you can read them.",
    },
    isFavorite: false,
    lastUpdated: now,
  }, masterKey);

  // Sample card
  await DatabaseService.createItem(vault.id, {
    type: "card",
    name: "Sample Credit Card",
    data: {
      cardholderName: "Your Name",
      number: "4111111111111111",
      expiry: "12/28",
      cvv: "123",
      notes: "Sample card — replace with your real card details",
    },
    isFavorite: false,
    lastUpdated: now,
  }, masterKey);
}
