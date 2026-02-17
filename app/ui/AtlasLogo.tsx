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
      <circle cx="12" cy="5.9" r="3.1" fill="currentColor" opacity="0.92" />
      <path
        d="M7.1 20.8 11.25 8.6a.85.85 0 0 1 1.6 0L16.9 20.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
      <path
        d="M8.95 16h6.1"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        opacity="0.92"
      />
    </svg>
  );
}
