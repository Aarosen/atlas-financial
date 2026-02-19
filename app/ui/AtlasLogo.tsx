type AtlasLogoProps = {
  size?: number;
  title?: string;
};

export default function AtlasLogo({ size = 22, title = 'Atlas' }: AtlasLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="g" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="currentColor" opacity="0.08" />
      <path
        d="M20 44c3.2-7.8 9-12 12-12s8.8 4.2 12 12"
        stroke="currentColor"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.98"
      />
      <circle cx="32" cy="28" r="8" stroke="currentColor" strokeWidth="4.6" opacity="0.98" />
      <path
        d="M18.5 29.5c4.2-6.7 10.3-10.8 13.5-10.8s9.3 4.1 13.5 10.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.72"
      />
      <circle cx="32" cy="28" r="2.2" fill="currentColor" opacity="0.98" />
    </svg>
  );
}
