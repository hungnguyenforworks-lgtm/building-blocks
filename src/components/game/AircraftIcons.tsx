import { AircraftType } from "@/types/game";
import React from "react";

interface AircraftIconProps {
  type: AircraftType;
  className?: string;
  color?: string;
  size?: number | string;
  opacity?: number;
}

/**
 * Custom vector silhouettes for different aircraft types in the project.
 * These are designed to be high-signal, technical, and accurate.
 */
export const AircraftIcon: React.FC<AircraftIconProps> = ({
  type,
  className = "",
  color = "currentColor",
  size = 24,
  opacity = 1,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      opacity={opacity}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <AircraftIconContent type={type} color={color} />
    </svg>
  );
};

interface AircraftShapeProps {
  type: AircraftType;
  cx: number;
  cy: number;
  color: string;
  opacity?: number;
  scale?: number;
}

/**
 * Specifically for use within SVG groups (like BaseMap).
 * Does not wrap in its own <svg> tag.
 */
export const AircraftShape: React.FC<AircraftShapeProps> = ({
  type,
  cx,
  cy,
  color,
  opacity = 1,
  scale = 1.2, // Slightly larger for map visibility
}) => {
  return (
    <g transform={`translate(${cx - (12 * scale)}, ${cy - (12 * scale)}) scale(${scale})`} opacity={opacity}>
      <AircraftIconContent type={type} color={color} />
    </g>
  );
};

// Internal component to avoid duplication
const AircraftIconContent: React.FC<{ type: AircraftType; color: string }> = ({ type, color }) => {
  switch (type) {
    case "GripenE":
    case "GripenF_EA":
      return (
        <g>
          {/* Drop shadow for depth */}
          <path d="M12 2.5L10.5 6.5V14.5L11 18.5L12 22.5L13 18.5L13.5 14.5V6.5L12 2.5Z" fill="black" fillOpacity="0.1" />
          {/* Fuselage */}
          <path d="M12 2L10.5 6V14L11 18L12 22L13 18L13.5 14V6L12 2Z" fill={color} />
          {/* Wings */}
          <path d="M10.5 10L3 19H8L10.5 17V10Z" fill={color} />
          <path d="M13.5 10L21 19H16L13.5 17V10Z" fill={color} />
          {/* Canards */}
          <path d="M10.5 6L7 8L8 9L10.5 8.5V6Z" fill={color} />
          <path d="M13.5 6L17 8L16 9L13.5 8.5V6Z" fill={color} />
          {/* Wingtip rails */}
          <path d="M3 18.5V19.5M21 18.5V19.5" stroke={color} strokeWidth="0.5" />
          {/* Cockpit - more detailed */}
          <path d="M11.5 5.5C11.5 5 12 4.5 12 4.5C12 4.5 12.5 5 12.5 5.5V8L12 8.5L11.5 8V5.5Z" fill="white" fillOpacity="0.4" />
          <path d="M11.8 5.5L12.2 5.5V7.5L11.8 7.5Z" fill="black" fillOpacity="0.1" />
          {/* Detail lines / Panel lines */}
          <path d="M11 14H13M11.2 16H12.8M10.5 11H13.5" stroke="black" strokeOpacity="0.2" strokeWidth="0.3" fill="none" />
          {/* Engine nozzle with inner glow */}
          <path d="M11.5 21H12.5V22H11.5V21Z" fill="black" fillOpacity="0.5" />
          <path d="M11.7 21.2H12.3V21.8H11.7V21.2Z" fill="orange" fillOpacity="0.2" />
        </g>
      );
    case "GlobalEye":
      return (
        <g>
          {/* Drop shadow */}
          <path d="M12 2.5C11 2.5 10.5 3.5 10.5 5.5V18.5C10.5 20.5 11 21.5 12 21.5C13 21.5 13.5 20.5 13.5 18.5V5.5C13.5 3.5 13 2.5 12 2.5Z" fill="black" fillOpacity="0.1" />
          {/* Fuselage */}
          <path d="M12 2C11 2 10.5 3 10.5 5V18C10.5 20 11 21 12 21C13 21 13.5 20 13.5 18V5C13.5 3 13 2 12 2Z" fill={color} />
          {/* Wings */}
          <path d="M10.5 9L2 13V15L10.5 12V9Z" fill={color} />
          <path d="M13.5 9L22 13V15L13.5 12V9Z" fill={color} />
          {/* Tail */}
          <path d="M10.5 18L7 20V21L10.5 20V18Z" fill={color} />
          <path d="M13.5 18L17 20V21L13.5 20V18Z" fill={color} />
          {/* Engines (Rear mounted) */}
          <path d="M9.3 16H10.5V18.5H9.3V16ZM13.5 16H14.7V18.5H13.5V16Z" fill={color} fillOpacity="0.9" />
          <path d="M9.3 16.5H10.5M13.5 16.5H14.7" stroke="black" strokeOpacity="0.2" strokeWidth="0.3" />
          {/* ERIEYE Radar - detailed */}
          <rect x="11" y="6" width="2" height="10" rx="0.5" fill={color} stroke="white" strokeWidth="0.2" />
          <path d="M11 6.5H13M11 8.5H13M11 10.5H13M11 12.5H13M11 14.5H13" stroke="white" strokeOpacity="0.3" strokeWidth="0.2" />
          {/* Cockpit windows */}
          <path d="M11.2 4H12.8L12.8 5L11.2 5Z" fill="white" fillOpacity="0.4" />
        </g>
      );
    case "VLO_UCAV":
      return (
        <g>
          {/* Flying Wing Shape */}
          <path d="M12 4L2 18L10 16L12 18L14 16L22 18L12 4Z" fill={color} />
          {/* Stealth Facets / Panel lines */}
          <path d="M12 5L18 15L12 14L6 15L12 5Z" fill="black" fillOpacity="0.2" />
          <path d="M12 14L14 16L12 15L10 16L12 14Z" fill="black" fillOpacity="0.3" />
          <path d="M12 4L12 14" stroke="black" strokeOpacity="0.2" strokeWidth="0.3" />
          {/* Intake - stealthy jagged edge */}
          <path d="M10.5 6L12 7L13.5 6L13 6.5H11L10.5 6Z" fill="black" fillOpacity="0.6" />
        </g>
      );
    case "LOTUS":
      return (
        <g>
          {/* Fuselage */}
          <path d="M12 3L11 5V20L12 22L13 20V5L12 3Z" fill={color} />
          {/* High Aspect Ratio Wings */}
          <path d="M11 8L1 9V10L11 10.5V8Z" fill={color} />
          <path d="M13 8L23 9V10L13 10.5V8Z" fill={color} />
          {/* V-Tail */}
          <path d="M12 18L8 21L9 22L12 20Z" fill={color} />
          <path d="M12 18L16 21L15 22L12 20Z" fill={color} />
          {/* Sensors/Details - high tech look */}
          <circle cx="12" cy="5" r="0.6" fill="white" fillOpacity="0.5" />
          <path d="M11.5 12H12.5M11.5 15H12.5" stroke="black" strokeOpacity="0.2" strokeWidth="0.3" />
          {/* Wing detail */}
          <path d="M2 9.2H10M14 9.2H22" stroke="white" strokeOpacity="0.2" strokeWidth="0.2" />
        </g>
      );
    default:
      return (
        <path
          d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z"
          fill={color}
        />
      );
  }
};
