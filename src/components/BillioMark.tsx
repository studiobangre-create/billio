interface Props {
  size?: number;
}

export default function BillioMark({ size = 20 }: Props) {
  return (
    <img
      src="/assets/ICONE LOGO BILIO.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}
