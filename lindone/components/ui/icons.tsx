import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

function SolidIcon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlayIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M8.2 4.6a1 1 0 0 1 1.5-.86l11 6.4a1 1 0 0 1 0 1.72l-11 6.4a1 1 0 0 1-1.5-.86V4.6Z" transform="translate(-1.6 1)" />
  </SolidIcon>
);

export const PauseIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <rect x="5.5" y="4.5" width="4.6" height="15" rx="1.4" />
    <rect x="13.9" y="4.5" width="4.6" height="15" rx="1.4" />
  </SolidIcon>
);

export const NextIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M4.5 6.2a1 1 0 0 1 1.55-.83l8.4 5.8a1 1 0 0 1 0 1.66l-8.4 5.8a1 1 0 0 1-1.55-.83V6.2Z" />
    <rect x="16.4" y="5" width="3.1" height="14" rx="1.2" />
  </SolidIcon>
);

export const PrevIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M19.5 6.2a1 1 0 0 0-1.55-.83l-8.4 5.8a1 1 0 0 0 0 1.66l8.4 5.8a1 1 0 0 0 1.55-.83V6.2Z" />
    <rect x="4.5" y="5" width="3.1" height="14" rx="1.2" />
  </SolidIcon>
);

export const ShuffleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 7h3.2c1.6 0 3 .8 3.9 2.1l3.8 5.8c.9 1.3 2.3 2.1 3.9 2.1H21" />
    <path d="M3 17h3.2c1.6 0 3-.8 3.9-2.1l.5-.8M13.4 9.9l.5-.8C14.8 7.8 16.2 7 17.8 7H21" />
    <path d="m18 4 3 3-3 3M18 14l3 3-3 3" />
  </Icon>
);

export const RepeatIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </Icon>
);

export const RepeatOneIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    <path d="M11 10.5 12.5 9.5V15" />
  </Icon>
);

export const VolumeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M11 5 6.5 8.5H3.5a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5h3L11 19V5Z" fill="currentColor" stroke="none" />
    <path d="M15 9.2a4 4 0 0 1 0 5.6M17.8 6.4a8 8 0 0 1 0 11.2" />
  </Icon>
);

export const MuteIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M11 5 6.5 8.5H3.5a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5h3L11 19V5Z" fill="currentColor" stroke="none" />
    <path d="m16 9.5 5 5M21 9.5l-5 5" />
  </Icon>
);

export const QueueIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 6h12M3.5 11h12M3.5 16h7" />
    <path d="M17.5 13.5v6l4-3-4-3Z" fill="currentColor" />
  </Icon>
);

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
);

export const DiscIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M12 5.8a6.2 6.2 0 0 1 6.2 6.2" />
  </Icon>
);

export const ArchiveIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
  </Icon>
);

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const MenuIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" />
  </Icon>
);

export const TrashIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16M9.5 7V4.8a.8.8 0 0 1 .8-.8h3.4a.8.8 0 0 1 .8.8V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
  </Icon>
);

export const GripIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 9h14M5 15h14" />
  </Icon>
);

export const ChevronDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const ChevronUpIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 15 6-6 6 6" />
  </Icon>
);

export const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

export const ExternalIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 5h5v5M19 5l-8 8M11 6H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4" />
  </Icon>
);

export const UploadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 16V4M7 8.5 12 4l5 4.5M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16" />
  </Icon>
);

export const EditIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3ZM14.5 7.5l3 3" />
  </Icon>
);

export const DownloadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 4v12M7 11.5 12 16l5-4.5M5 20h14" />
  </Icon>
);

export const LogoutIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10M15 8l4 4-4 4M19 12H9" />
  </Icon>
);

export const VideoIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="6" width="13" height="12" rx="2.5" />
    <path d="m16 10.5 5-3v9l-5-3" />
  </Icon>
);

export const ListAddIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 6h12M3.5 11h9M3.5 16h6M17 12v8M13 16h8" />
  </Icon>
);

export const GridIcon = ArchiveIcon;

export const FeedIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="3.5" width="16" height="7" rx="2" />
    <rect x="4" y="13.5" width="16" height="7" rx="2" />
  </Icon>
);
