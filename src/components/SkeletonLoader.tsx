type PageVariant = 'default' | 'dashboard' | 'table-only' | 'accounting';

interface PageSkeletonProps {
  title: string;
  subtitle?: string;
  variant?: PageVariant;
  /** number of metric cards (0 to hide metrics row) */
  metrics?: number;
  /** number of table rows */
  rows?: number;
}

function S({ w, h = 12, r }: { w: number | string; h?: number; r?: number }) {
  return (
    <div
      className="skel"
      style={{ width: w, height: h, borderRadius: r ?? 6 }}
    />
  );
}

function SkeletonMetrics({ count = 4 }: { count?: number }) {
  return (
    <div className="skel-metrics" style={{ gridTemplateColumns: `repeat(${count},1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skel-metric-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <S w={28} h={28} r={7} />
            <S w={90} h={11} />
          </div>
          <S w="70%" h={24} />
          <S w="50%" h={10} />
        </div>
      ))}
    </div>
  );
}

function SkeletonTableRows({ rows = 5, cols = [180, 140, 120, 80, 60] }: { rows?: number; cols?: number[] }) {
  return (
    <div className="skel-table">
      <div className="skel-table-head">
        {cols.map((w, i) => <S key={i} w={w * 0.7} h={10} />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skel-row">
          {cols.map((_w, j) => (
            <div key={j} style={{ flex: j === 0 ? 2 : 1 }}>
              <S w="80%" h={j === 0 ? 13 : 12} />
              {j === 0 && <S w="55%" h={10} r={4} />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="content">
      <SkeletonMetrics />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
        <S w={120} h={14} />
        <S w={60} h={12} />
      </div>
      <SkeletonTableRows rows={4} />
      <div className="skel-bottom-grid">
        {[0, 1].map(i => (
          <div key={i} className="skel-panel">
            <div className="skel-panel-head">
              <S w={140} h={14} />
              <S w={60} h={12} />
            </div>
            <div className="skel-panel-rows">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <S w={32} h={32} r={50} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <S w="70%" h={12} />
                    <S w="45%" h={10} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonAccounting({ rows = 6 }: { rows?: number }) {
  return (
    <div className="content">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 13, marginBottom: 24 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="skel-metric-card">
            <S w="60%" h={11} />
            <S w="80%" h={22} />
            <S w="40%" h={10} />
          </div>
        ))}
      </div>
      <SkeletonTableRows rows={rows} cols={[200, 120, 100, 80]} />
    </div>
  );
}

export function PageSkeleton({ title, subtitle, variant = 'default', metrics = 4, rows = 6 }: PageSkeletonProps) {
  return (
    <div className="main">
      <div className="skel-topbar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div className="page-title">{title}</div>
          {subtitle && <div className="page-sub">{subtitle}</div>}
        </div>
        <div className="skel-actions">
          <S w={96} h={34} r={8} />
          <S w={120} h={34} r={8} />
        </div>
      </div>

      {variant === 'dashboard' && <SkeletonDashboard />}
      {variant === 'accounting' && <SkeletonAccounting rows={rows} />}
      {(variant === 'default' || variant === 'table-only') && (
        <div className="content">
          {variant === 'default' && metrics > 0 && <SkeletonMetrics count={metrics} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
            <S w={130} h={14} />
            <div style={{ display: 'flex', gap: 6 }}>
              {[60, 80, 70, 90].slice(0, 4).map((w, i) => <S key={i} w={w} h={30} r={20} />)}
            </div>
          </div>
          <SkeletonTableRows rows={rows} />
        </div>
      )}
    </div>
  );
}
