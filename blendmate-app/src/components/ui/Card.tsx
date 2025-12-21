interface CardProps {
  label: string;
  value: string | number;
  colorClass: string;
}

export default function Card({ label, value, colorClass }: CardProps) {
  return (
    <div className="bg-blendmate-gray/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-wider opacity-40 mb-1">{label}</p>
      <p className={`text-3xl font-mono font-black italic ${colorClass}`}>{value}</p>
    </div>
  );
}
