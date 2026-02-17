type AtlasLogoProps = {
  size?: number;
  title?: string;
};

export default function AtlasLogo({ size = 22, title = 'Atlas' }: AtlasLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <path
        d="M20 44c3.2-7.8 9-12 12-12s8.8 4.2 12 12"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
      <circle cx="12" cy="10.5" r="3.4" stroke="currentColor" strokeWidth="1.9" opacity="0.92" />
      <path
        d="M7 11c1.8-2.8 4.4-4.6 5.8-4.6s4 1.8 5.8 4.6"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.66"
      />
      <circle cx="12" cy="10.5" r="0.95" fill="currentColor" opacity="0.92" />
    </svg>
  );
}
