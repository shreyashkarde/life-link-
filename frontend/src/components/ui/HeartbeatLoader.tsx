import React from 'react';

interface HeartbeatLoaderProps {
  size?: 'small' | 'medium' | 'large';
  strokeColor?: string;
  className?: string;
  text?: string;
}

export const HeartbeatLoader: React.FC<HeartbeatLoaderProps> = ({
  size = 'medium',
  strokeColor,
  className = '',
  text,
}) => {
  const sizeMap = {
    small: { width: 32, height: 24, strokeWidth: 2 },
    medium: { width: 64, height: 48, strokeWidth: 3 },
    large: { width: 128, height: 96, strokeWidth: 4.5 },
  };

  const { width, height, strokeWidth } = sizeMap[size];

  // If a custom stroke color is provided, override default CSS color
  const backStyle = strokeColor
    ? { stroke: `${strokeColor}33`, strokeWidth }
    : strokeWidth !== 3
    ? { strokeWidth }
    : undefined;

  const frontStyle = strokeColor
    ? { stroke: strokeColor, strokeWidth }
    : strokeWidth !== 3
    ? { strokeWidth }
    : undefined;

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      {/* From Uiverse.io by milley69 */}
      <div className="loading inline-flex items-center justify-center">
        <svg
          width={`${width}px`}
          height={`${height}px`}
          viewBox="0 0 64 48"
          className="overflow-visible"
        >
          <polyline
            points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24"
            id="back"
            style={backStyle}
          />
          <polyline
            points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24"
            id="front"
            style={frontStyle}
          />
        </svg>
      </div>
      {text && (
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
};

export default HeartbeatLoader;
