import { useState, type ReactNode } from 'react';
import Icon from '@/components/Icon';
import UpgradeModal from '@/components/UpgradeModal';
import { useApp } from '@/context/AppContext';
import { PLAN_LABELS, minPlanForFeature, type Feature } from '@/lib/plans';

interface Props {
  feature:  Feature;
  children: ReactNode;
  /**
   * "gate"    — replaces children with a locked placeholder (default)
   * "overlay" — renders children dimmed with a lock overlay on top
   */
  mode?: 'gate' | 'overlay';
}

export default function FeatureGuard({ feature, children, mode = 'gate' }: Props) {
  const { hasFeature } = useApp();
  const [showModal, setShowModal] = useState(false);

  if (hasFeature(feature)) return <>{children}</>;

  const requiredPlan = minPlanForFeature(feature);
  const planName     = PLAN_LABELS[requiredPlan];

  return (
    <>
      {showModal && (
        <UpgradeModal feature={feature} onClose={() => setShowModal(false)} />
      )}

      {mode === 'overlay' ? (
        <div className="fg-overlay-wrap">
          <div className="fg-overlay-dim" aria-hidden>{children}</div>
          <div className="fg-overlay-lock" onClick={() => setShowModal(true)}>
            <Icon name="lock" size={18} />
            <div className="fg-lock-label">Plan {planName} requis</div>
            <button className="btn btn-primary btn-sm fg-lock-btn">Mettre à niveau</button>
          </div>
        </div>
      ) : (
        <div className="fg-gate" onClick={() => setShowModal(true)} role="button" tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowModal(true); }}>
          <div className="fg-gate-icon">
            <Icon name="lock" size={20} />
          </div>
          <div className="fg-gate-title">Fonctionnalité Plan {planName}</div>
          <div className="fg-gate-desc">
            Passez au plan {planName} pour débloquer cette fonctionnalité.
          </div>
          <button className="btn btn-primary btn-sm" tabIndex={-1}>
            <Icon name="sparkles" size={13} /> Voir les offres
          </button>
        </div>
      )}
    </>
  );
}
