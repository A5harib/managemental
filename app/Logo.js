// Brand mark: lamp casting light onto a sticky note. Single source: public/logo.svg
// (also used as the favicon via app/icon.svg).
export default function Logo({ size = 44 }) {
  return (
    <img
      src="/logo.svg"
      alt="Managemental"
      width={size}
      height={size}
      className="glow"
    />
  );
}
