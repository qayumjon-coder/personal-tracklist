interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

export function VolumeControl({ volume, isMuted, onVolumeChange, onToggleMute }: VolumeControlProps) {
  return (
    <div className="flex items-center gap-3 w-full group">
      {/* Mute button */}
      <button
        onClick={onToggleMute}
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-none hover:bg-[var(--text-secondary)]/10"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted || volume === 0 ? (
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M5.88891 3.05999L20.9492 18.1203L19.535 19.5345L15.356 15.3556C14.6534 15.767 13.8587 15.9999 13.0001 15.9999V13.9999C13.2987 13.9999 13.5852 13.9377 13.8488 13.8484L11.9568 11.9564L8.99998 8.99994H5.98669L2.57683 12.4098C1.86877 13.1179 1.86877 14.1522 2.57683 14.8603C2.89886 15.1823 3.33618 15.3582 3.79373 15.3563L3.92982 15.3564H8.99998L13.0001 19.3564V15.9999C13.4116 15.9999 13.8115 15.9407 14.1953 15.8285L16.2737 17.9069C15.3341 18.2392 14.2483 18.5298 13.2676 18.7302L13.0001 18.7831V21.8447C15.1508 21.6192 17.0722 20.9169 18.6657 19.897L20.08 21.3113L21.4942 19.8971L7.30312 5.70599C7.30312 5.70599 7.30314 5.70599 5.88891 3.05999ZM13.0001 4.21666L10.3807 6.83606L11.7949 8.25027L13.0001 7.04509V4.21666ZM18.508 14.5078L17.0229 13.0227C17.6521 11.9213 17.9999 10.6358 17.9999 9.27814C17.9999 6.27641 16.0375 3.72591 13.3768 2.76672L13.0001 2.62888V5.69049L12.7235 5.63467C14.1611 6.25752 15.228 7.4988 15.5895 9.09842L15.6596 9.27814C15.6596 9.77128 15.5888 10.2476 15.4566 10.7003L15.1189 11.8569L18.508 15.2461C18.5779 15.0049 18.6465 14.7578 18.7135 14.5078L18.508 14.5078Z" /> </svg>
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current"> <path d="M5.88889 3.06001L2.57681 12.4098C1.86875 13.1179 1.86875 14.1522 2.57681 14.8603C2.89885 15.1823 3.33616 15.3582 3.79371 15.3563L3.9298 15.3564H8.99996L12.9999 19.3564V4.99996L8.99996 8.99996H5.98667L5.88889 3.06001ZM14.6548 9.27816C14.6548 7.218 13.4336 5.43265 11.6917 4.67384L11.3939 4.54412V13.9281C12.8315 13.237 14.0747 11.8841 14.512 9.98679L14.5771 9.69931L14.6465 9.40024L14.6548 9.27816ZM18.0001 9.27816C18.0001 12.2799 16.0375 14.8304 13.3768 15.7896L13 15.9275V18.1203C16.8906 17.1528 19.8647 13.6826 19.9959 9.53974L20.0001 9.27816C20.0001 5.37894 17.3402 2.10099 13.7388 0.942718L13.3768 0.826355V3.97864C16.0375 4.93783 18.0001 7.48833 18.0001 10.4901V9.27816Z" /> </svg>
        )}
      </button>

      {/* Slider */}
      <div className="flex-1 h-2 bg-[var(--text-secondary)]/10 rounded-none border border-[var(--text-secondary)]/30 relative group/slider">
        <div 
            className="absolute top-0 left-0 h-full bg-[var(--accent)] rounded-none group-hover/slider:bg-[var(--accent)] transition-colors opacity-80"
            style={{ width: `${volume}%` }}
        />
        <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Volume % */}
      <span className="text-xs text-[var(--text-secondary)] w-8 text-right font-mono">{volume}</span>
    </div>
  );
}