import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
            fontSize: 20,
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
