const trashSound = new Audio('/sounds/trash.mp3');
const vaultUnlockSound = new Audio('/sounds/vault-unlock.mp3');
const vaultLockSound = new Audio('/sounds/vault-lock.mp3');
const vaultErrorSound = new Audio('/sounds/vault-error.mp3');

export const SoundService = {
  playTrash: () => trashSound.play().catch(() => {}),
  playVaultUnlock: () => vaultUnlockSound.play().catch(() => {}),
  playVaultLock: () => vaultLockSound.play().catch(() => {}),
  playVaultError: () => vaultErrorSound.play().catch(() => {})
};
