import { Sprout } from 'lucide-react';
export function Brand({ small = false, imageUrl }: { small?: boolean; imageUrl?: string }) {
  return (
    <span className={`brand ${small ? 'brand-small' : ''}`}>
      <span className="brand-icon">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Logo Tempe Segar"
            width="48"
            height="48"
            style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
          />
        ) : (
          <Sprout aria-hidden="true" size={small ? 23 : 28} />
        )}
      </span>
      <span>
        tempe<span className="brand-light">segar</span>
        <span className="brand-dot">.</span>
        <small>RASA RUMAH, DI MEJA ANDA</small>
      </span>
    </span>
  );
}
