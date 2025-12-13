import React from "react";

interface BackupOptionProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: (id: string) => void;
  recommended?: boolean;
  warning?: boolean;
}

const BackupOptionCard: React.FC<BackupOptionProps> = ({
  id,
  title,
  description,
  icon,
  selected,
  onSelect,
  recommended,
  warning,
}) => {
  return (
    <div
      onClick={() => onSelect(id)}
      className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 group
        ${
          selected
            ? "bg-primary-500/10 border-primary-500 shadow-lg shadow-primary-500/10"
            : "bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-800/80"
        }
      `}
    >
      {recommended && (
        <span className="absolute -top-3 left-4 px-3 py-1 bg-gradient-to-r from-primary-500 to-indigo-600 text-white text-xs font-bold rounded-full shadow-md z-10">
          RECOMMENDED
        </span>
      )}

      {warning && (
        <span className="absolute -top-3 left-4 px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full shadow-md z-10 flex items-center gap-1">
          ⚠️ UNSECURE
        </span>
      )}

      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-lg ${
            selected
              ? "bg-primary-500 text-white"
              : "bg-gray-700 text-gray-400 group-hover:text-gray-200"
          }`}
        >
          {icon}
        </div>
        <div>
          <h3
            className={`font-bold mb-1 ${
              selected ? "text-white" : "text-gray-200"
            }`}
          >
            {title}
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
        </div>
      </div>

      <div
        className={`absolute top-6 right-6 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
        ${selected ? "border-primary-500 bg-primary-500" : "border-gray-600"}
      `}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </div>
  );
};

export default BackupOptionCard;
