const lockSound = new Audio('/sounds/lock.mp3');
const unlockSound = new Audio('/sounds/unlock.mp3');

export const SoundService = {
  playLock: () => lockSound.play().catch(() => {}),
  playUnlock: () => unlockSound.play().catch(() => {})
};
