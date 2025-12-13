import React from 'react'
import { Loader2, Lock, FileArchive, CheckCircle } from 'lucide-react'
import { BackupProgress as BackupProgressType } from '../services/backupService'

interface BackupProgressProps {
  progress: BackupProgressType
  isRestoring?: boolean
}

const BackupProgress: React.FC<BackupProgressProps> = ({ progress, isRestoring }) => {
  const getStageIcon = () => {
    switch (progress.stage) {
      case 'preparing':
        return <FileArchive className="animate-pulse" size={48} />
      case 'encrypting':
        return <Lock className="animate-[wiggle_0.8s_ease-in-out_infinite]" size={48} />
      case 'compressing':
        return <FileArchive className="animate-bounce" size={48} />
      case 'finalizing':
        return <CheckCircle className="animate-pulse" size={48} />
      default:
        return <Loader2 className="animate-spin" size={48} />
    }
  }

  const getStageText = () => {
    if (isRestoring) {
      switch (progress.stage) {
        case 'preparing':
          return 'Validating backup file...'
        case 'encrypting':
          return 'Decrypting data...'
        case 'finalizing':
          return 'Restoring items...'
        default:
          return 'Processing...'
      }
    }

    switch (progress.stage) {
      case 'preparing':
        return 'Preparing backup...'
      case 'encrypting':
        return 'Encrypting data...'
      case 'compressing':
        return 'Compressing files...'
      case 'finalizing':
        return 'Finalizing backup...'
      default:
        return 'Processing...'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex flex-col items-center space-y-6">
          <div className="text-primary-500">
            {getStageIcon()}
          </div>

          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{getStageText()}</span>
              <span className="text-primary-500 font-semibold">{Math.round(progress.progress)}%</span>
            </div>

            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>

          {progress.currentItem && (
            <div className="text-center">
              <p className="text-sm text-gray-400">Processing:</p>
              <p className="text-white font-medium">{progress.currentItem}</p>
            </div>
          )}

          {progress.total && progress.current && (
            <div className="text-center">
              <p className="text-sm text-gray-400">
                {progress.current} of {progress.total} items
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BackupProgress
