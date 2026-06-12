import Icon from '../Icon';

interface KPIItem {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
}

export default function KPIStrip({ items }: { items: KPIItem[] }) {
  return (
    <div className="kpi-strip">
      {items.map((item, i) => (
        <div key={i} className="kpi">
          <div className="kpi-top">
            <div className="kpi-ico" style={{ background: item.iconBg, color: item.iconColor }}>
              <Icon name={item.icon} size={15} />
            </div>
            <div className="kpi-label">{item.label}</div>
          </div>
          <div className="kpi-value mono">
            {item.value}
            {item.unit && <span className="unit">{item.unit}</span>}
          </div>
          {item.sub && <div className="kpi-sub">{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}
