const newLockSound = new Audio('/sounds/lock-sound.mp3');
const trashSound = new Audio('/sounds/trash.mp3');

export const SoundService = {
  playLockSound : () => newLockSound.play().catch(() => {}),
  playTrash: () => trashSound.play().catch(() => {})
};
