import React from 'react';

type ButtonItem = {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
};

type ButtonPanelProps = {
  title: string;
  items: ButtonItem[];
  color?: 'blue' | 'green' | 'purple' | 'orange';
};

const colorMap = {
  blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', border: 'border-blue-100', title: 'text-blue-600' },
  green: { bg: 'bg-green-600', hover: 'hover:bg-green-700', border: 'border-green-100', title: 'text-green-600' },
  purple: { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', border: 'border-purple-100', title: 'text-purple-600' },
  orange: { bg: 'bg-orange-600', hover: 'hover:bg-orange-700', border: 'border-orange-100', title: 'text-orange-600' },
};

const ButtonPanel: React.FC<ButtonPanelProps> = ({ title, items, color = 'blue' }) => {
  const colors = colorMap[color];
  
  return (
    <div className={`bg-white rounded-3xl p-6 shadow-lg border ${colors.border} hover:shadow-xl transition-all duration-300`}>
      <h3 className={`font-black text-lg mb-4 ${colors.title} flex items-center gap-2`}>
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((it, idx) => (
          <button
            key={idx}
            onClick={it.onClick}
            className={`
              ${it.variant === 'secondary' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : `${colors.bg} text-white`}
              ${it.variant === 'success' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
              ${it.variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
              py-3 px-4 rounded-2xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-md
            `}
          >
            {it.icon && <span className="flex-shrink-0">{it.icon}</span>}
            <span className="truncate">{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ButtonPanel;