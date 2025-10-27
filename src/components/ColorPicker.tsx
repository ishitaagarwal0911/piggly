import { DEFAULT_COLORS } from '@/types/settings';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  return (
    <div className="grid grid-cols-6 gap-2">
      {DEFAULT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`w-10 h-10 rounded-lg transition-all ${
            value === color ? 'ring-2 ring-primary ring-offset-2' : 'hover:scale-110'
          }`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          aria-label={color}
        />
      ))}
    </div>
  );
};
