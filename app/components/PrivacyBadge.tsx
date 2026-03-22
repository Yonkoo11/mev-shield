export function PrivacyBadge() {
  return (
    <div className="bg-shield-card border border-shield-border rounded-xl p-4 glow-pulse">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-shield-accent animate-pulse" />
        <div>
          <p className="text-sm font-medium text-shield-accent">
            TEE-Protected Trading
          </p>
          <p className="text-xs text-shield-muted mt-1">
            Orders encrypted inside Trusted Execution Environment. Invisible to
            validators, searchers, and other traders until batch settlement.
          </p>
        </div>
      </div>
    </div>
  );
}
