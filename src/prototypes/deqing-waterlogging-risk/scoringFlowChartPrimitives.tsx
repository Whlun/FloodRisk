import React from 'react';

export const FlowArrow: React.FC<{ label?: string }> = ({ label }) => (
  <div className="dq-flowchart__arrow" aria-hidden>
    <span className="dq-flowchart__arrow-line" />
    {label ? <span className="dq-flowchart__arrow-label">{label}</span> : null}
    <span className="dq-flowchart__arrow-head" />
  </div>
);

export const FlowNode: React.FC<{
  kind: 'start' | 'process' | 'end' | 'branch';
  title: string;
  subtitle?: string;
}> = ({ kind, title, subtitle }) => (
  <div className={`dq-flowchart__node dq-flowchart__node--${kind}`}>
    <div className="dq-flowchart__node-title">{title}</div>
    {subtitle ? <div className="dq-flowchart__node-sub">{subtitle}</div> : null}
  </div>
);

export const FlowDiamond: React.FC<{ text: string }> = ({ text }) => (
  <div className="dq-flowchart__diamond-wrap">
    <div className="dq-flowchart__diamond">
      <span className="dq-flowchart__diamond-text">{text}</span>
    </div>
  </div>
);

export const FlowOutcome: React.FC<{
  label: string;
  tierLabel: string;
  score: number;
  tone: 'yes' | 'no' | 'opt';
}> = ({ label, tierLabel, score, tone }) => (
  <div className={`dq-flowchart__outcome dq-flowchart__outcome--${tone}`}>
    <div className="dq-flowchart__outcome-tag">{label}</div>
    <div className="dq-flowchart__outcome-tier">{tierLabel}</div>
    <div className="dq-flowchart__outcome-score">{score.toFixed(2)}</div>
  </div>
);
