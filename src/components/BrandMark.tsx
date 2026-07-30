export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark" aria-label="Ethiopia Football Universe">
      <span className="brand-crest" aria-hidden="true">
        <span className="brand-ball">●</span>
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>ETHIOPIA</strong>
          <span>FOOTBALL UNIVERSE</span>
        </span>
      )}
    </div>
  )
}
