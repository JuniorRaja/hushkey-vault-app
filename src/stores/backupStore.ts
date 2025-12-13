import { create } from 'zustand'
import BackupService, { BackupOptions, BackupProgress, BackupHealth, RestoreResult } from '../services/backupService'

interface BackupState {
  isBackingUp: boolean
  isRestoring: boolean
  progress: BackupProgress | null
  lastBackupDate: Date | null
  backupHealth: BackupHealth | null
  isLoading: boolean
}

interface BackupActions {
  createBackup: (options: BackupOptions) => Promise<Blob>
  restoreBackup: (file: File, pin?: string, password?: string) => Promise<RestoreResult>
  loadBackupHealth: () => Promise<void>
  loadLastBackupDate: () => Promise<void>
  updateProgress: (progress: BackupProgress) => void
  reset: () => void
}

const initialState: BackupState = {
  isBackingUp: false,
  isRestoring: false,
  progress: null,
  lastBackupDate: null,
  backupHealth: null,
  isLoading: false
}

export const useBackupStore = create<BackupState & BackupActions>((set, get) => ({
  ...initialState,

  createBackup: async (options: BackupOptions) => {
    set({ isBackingUp: true, progress: null })

    try {
      const blob = await BackupService.createBackup(options, (progress) => {
        set({ progress })
      })

      await get().loadLastBackupDate()
      await get().loadBackupHealth()

      set({ isBackingUp: false, progress: null })
      return blob
    } catch (error) {
      set({ isBackingUp: false, progress: null })
      throw error
    }
  },

  restoreBackup: async (file: File, pin?: string, password?: string) => {
    set({ isRestoring: true, progress: null })

    try {
      let result: RestoreResult

      if (file.name.endsWith('.hkb')) {
        if (!pin) throw new Error('PIN required for HKB restore')
        const authStore = await import('./authStore')
        const masterKey = authStore.useAuthStore.getState().masterKey
        if (!masterKey) throw new Error('Master key not available')

        result = await BackupService.restoreFromHKB(file, pin, masterKey, (progress) => {
          set({ progress })
        })
      } else {
        throw new Error('Unsupported file format')
      }

      set({ isRestoring: false, progress: null })
      return result
    } catch (error) {
      set({ isRestoring: false, progress: null })
      throw error
    }
  },

  loadBackupHealth: async () => {
    set({ isLoading: true })
    try {
      const health = await BackupService.getBackupHealth()
      set({ backupHealth: health, isLoading: false })
    } catch (error) {
      console.error('Failed to load backup health:', error)
      set({ isLoading: false })
    }
  },

  loadLastBackupDate: async () => {
    try {
      const date = await BackupService.getLastBackupDate()
      set({ lastBackupDate: date })
    } catch (error) {
      console.error('Failed to load last backup date:', error)
    }
  },

  updateProgress: (progress: BackupProgress) => {
    set({ progress })
  },

  reset: () => {
    set(initialState)
  }
}))
