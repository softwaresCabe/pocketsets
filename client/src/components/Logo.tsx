export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PocketSets"
      role="img"
    >
      {/* Outer ring — stage */}
      <circle
        cx="20"
        cy="20"
        r="16"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        opacity="0.25"
      />
      {/* Upper arc — speaker bloom */}
      <path
        d="M 6 20 A 14 14 0 0 1 34 20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Core dot — the pocket */}
      <circle cx="20" cy="20" r="4" fill="currentColor" />
      {/* Time tick */}
      <line
        x1="20"
        y1="20"
        x2="27"
        y2="13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoMark({ size = 20 }: { size?: number }) {
  return <Logo size={size} />;
}
