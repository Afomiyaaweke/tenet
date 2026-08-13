import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '20%',
          background: '#F97316',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 110,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          T
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
